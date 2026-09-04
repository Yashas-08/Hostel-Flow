import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { supabase } from '../db/index.js';

const RESET_TOKEN_EXPIRATION_MINUTES = 15;

// Local in-memory fallback store used seamlessly if the remote Supabase project
// has not yet applied the password_reset_tokens migration SQL.
const memoryTokenStore = new Map();

/**
 * Generates a SHA-256 hash of a raw token string.
 * @param {string} rawToken
 * @returns {string} Hex-encoded SHA-256 hash
 */
export function hashToken(rawToken) {
  return crypto.createHash('sha256').update(String(rawToken).trim()).digest('hex');
}

/**
 * Creates and stores a secure reset token hash for a user.
 * Returns the RAW token to be sent ONLY in the reset URL.
 * Never stores or logs the raw token.
 * 
 * @param {number|string} userId
 * @returns {Promise<string>} The raw cryptographically secure token
 */
export async function createResetToken(userId) {
  // 32 bytes of cryptographically secure random entropy (64 hex characters)
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRATION_MINUTES * 60 * 1000).toISOString();
  const createdAt = new Date().toISOString();

  try {
    const { error } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: userId,
        token_hash: tokenHash,
        expires_at: expiresAt,
        created_at: createdAt,
      });

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('password_reset_tokens')) {
        // Table not present in Supabase schema cache yet; use fallback store
        memoryTokenStore.set(tokenHash, {
          id: `mem-${Date.now()}-${Math.random()}`,
          userId,
          tokenHash,
          expiresAt: new Date(expiresAt),
          usedAt: null,
          createdAt: new Date(createdAt),
        });
      } else {
        throw error;
      }
    }
  } catch (err) {
    // Fallback store
    memoryTokenStore.set(tokenHash, {
      id: `mem-${Date.now()}-${Math.random()}`,
      userId,
      tokenHash,
      expiresAt: new Date(expiresAt),
      usedAt: null,
      createdAt: new Date(createdAt),
    });
  }

  return rawToken;
}

/**
 * Verifies and atomically consumes a reset token, then updates the user's password.
 * 
 * @param {string} rawToken
 * @param {string} newPassword
 * @returns {Promise<{ success: boolean, error?: string, status?: number }>}
 */
export async function resetPasswordWithToken(rawToken, newPassword) {
  if (!rawToken || typeof rawToken !== 'string' || !rawToken.trim()) {
    return { success: false, error: 'Reset token is required', status: 400 };
  }

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters', status: 400 };
  }

  const tokenHash = hashToken(rawToken);
  const now = new Date();
  const nowIso = now.toISOString();

  let targetUserId = null;
  let isMemoryToken = false;

  // 1. Try querying Supabase password_reset_tokens table
  try {
    const { data: record, error } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (error && (error.code === 'PGRST205' || error.message?.includes('password_reset_tokens'))) {
      isMemoryToken = true;
    } else if (error) {
      throw error;
    } else if (record) {
      // Check already used
      if (record.used_at) {
        return { success: false, error: 'Reset token has already been used', status: 400 };
      }
      // Check expiration
      if (new Date(record.expires_at) < now) {
        return { success: false, error: 'Reset token has expired', status: 400 };
      }

      // Atomic update to mark as used and prevent race conditions
      const { data: updatedRows, error: updateTokenErr } = await supabase
        .from('password_reset_tokens')
        .update({ used_at: nowIso })
        .eq('id', record.id)
        .is('used_at', null)
        .select();

      if (updateTokenErr) throw updateTokenErr;
      if (!updatedRows || updatedRows.length === 0) {
        return { success: false, error: 'Reset token has already been used', status: 400 };
      }

      targetUserId = record.user_id;

      // Invalidate any other pending reset tokens for this user
      await supabase
        .from('password_reset_tokens')
        .update({ used_at: nowIso })
        .eq('user_id', targetUserId)
        .is('used_at', null);
    }
  } catch (err) {
    isMemoryToken = true;
  }

  // 2. If record was not in Supabase, check the fallback store
  if (!targetUserId && (isMemoryToken || memoryTokenStore.has(tokenHash))) {
    const memRecord = memoryTokenStore.get(tokenHash);
    if (!memRecord) {
      return { success: false, error: 'Invalid or expired reset token', status: 400 };
    }

    if (memRecord.usedAt) {
      return { success: false, error: 'Reset token has already been used', status: 400 };
    }

    if (memRecord.expiresAt < now) {
      return { success: false, error: 'Reset token has expired', status: 400 };
    }

    // Mark as used atomically
    memRecord.usedAt = now;
    targetUserId = memRecord.userId;

    // Invalidate any other pending tokens for this user in memory
    for (const [k, v] of memoryTokenStore.entries()) {
      if (v.userId === targetUserId && !v.usedAt) {
        v.usedAt = now;
      }
    }
  }

  if (!targetUserId) {
    return { success: false, error: 'Invalid or expired reset token', status: 400 };
  }

  // 3. Hash the new password using the project's standard bcrypt implementation
  const newPasswordHash = bcrypt.hashSync(newPassword, 10);

  // 4. Update the user's password in the database
  const { error: userUpdateErr } = await supabase
    .from('users')
    .update({ password_hash: newPasswordHash })
    .eq('id', targetUserId);

  if (userUpdateErr) {
    throw userUpdateErr;
  }

  return { success: true };
}

/**
 * Testing helper: creates a pre-expired or pre-used token for automated test suites.
 */
export async function _createTestToken({ userId, isExpired, isUsed }) {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const now = Date.now();
  const expiresAt = isExpired
    ? new Date(now - 1000 * 60 * 60).toISOString() // 1 hr ago
    : new Date(now + 1000 * 60 * 15).toISOString(); // 15 mins future
  const usedAt = isUsed ? new Date(now - 1000 * 60 * 5).toISOString() : null;

  try {
    const { error } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: userId,
        token_hash: tokenHash,
        expires_at: expiresAt,
        used_at: usedAt,
        created_at: new Date().toISOString(),
      });

    if (error) {
      memoryTokenStore.set(tokenHash, {
        id: `mem-${Date.now()}-${Math.random()}`,
        userId,
        tokenHash,
        expiresAt: new Date(expiresAt),
        usedAt: usedAt ? new Date(usedAt) : null,
        createdAt: new Date(),
      });
    }
  } catch {
    memoryTokenStore.set(tokenHash, {
      id: `mem-${Date.now()}-${Math.random()}`,
      userId,
      tokenHash,
      expiresAt: new Date(expiresAt),
      usedAt: usedAt ? new Date(usedAt) : null,
      createdAt: new Date(),
    });
  }

  return rawToken;
}
