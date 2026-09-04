import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { supabase } from '../db/index.js';
import { authenticate, JWT_SECRET } from '../middleware/auth.js';
import { sendPasswordResetEmail } from '../lib/email.js';
import { createResetToken, resetPasswordWithToken } from '../lib/resetTokens.js';

const router = Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ----------------------------------------------------------------------------
// Rate Limiters
// ----------------------------------------------------------------------------
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts. Please try again later.',
  standardHeaders: false,
  legacyHeaders: false,
  skip: () => false,
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || '',
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many signup attempts. Please try again later.',
  standardHeaders: false,
  legacyHeaders: false,
  skip: () => false,
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || '',
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many password reset requests. Please try again later.',
  standardHeaders: false,
  legacyHeaders: false,
  skip: () => false,
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || '',
});

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many reset attempts. Please try again later.',
  standardHeaders: false,
  legacyHeaders: false,
  skip: () => false,
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || '',
});

// ----------------------------------------------------------------------------
// POST /api/auth/login (Existing functionality preserved)
// ----------------------------------------------------------------------------
router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (error) throw error;
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.full_name,
        phone: user.phone,
        avatarUrl: user.avatar_url,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// POST /api/auth/signup (Student Sign Up)
// ----------------------------------------------------------------------------
router.post('/signup', signupLimiter, async (req, res, next) => {
  try {
    const { name, email, password, confirmPassword } = req.body || {};
    const errors = {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      errors.name = 'Full name is required';
    } else if (name.trim().length < 2 || name.trim().length > 100) {
      errors.name = 'Name must be between 2 and 100 characters';
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      errors.email = 'Email address is required';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password || typeof password !== 'string') {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: 'Validation failed', fields: errors });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check for existing duplicate email
    const { data: existingUser, error: findErr } = await supabase
      .from('users')
      .select('id')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (findErr) throw findErr;
    if (existingUser) {
      return res.status(409).json({
        error: 'Validation failed',
        fields: { email: 'An account with this email already exists' },
      });
    }

    // Hash password with bcrypt
    const passwordHash = bcrypt.hashSync(password, 10);

    // CRITICAL SECURITY ENFORCEMENT:
    // Public signup is strictly restricted to 'student'.
    // Any role field provided in the request body is intentionally ignored.
    const assignedRole = 'student';

    const { data: newUser, error: insertUserErr } = await supabase
      .from('users')
      .insert({
        email: normalizedEmail,
        password_hash: passwordHash,
        role: assignedRole,
        full_name: name.trim(),
      })
      .select()
      .single();

    if (insertUserErr) throw insertUserErr;

    // Create corresponding students profile record so student dashboard/profile function immediately
    const generatedStudentCode = `HF-STU-${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;
    const { error: insertStudentErr } = await supabase
      .from('students')
      .insert({
        user_id: newUser.id,
        student_code: generatedStudentCode,
      });

    if (insertStudentErr) {
      console.warn('Notice: Student profile creation warning:', insertStudentErr.message);
    }

    // Issue JWT session token matching the existing login mechanism
    const token = jwt.sign(
      { id: newUser.id, role: assignedRole, email: newUser.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Safe response: never expose password, password hash, JWT secret, or sensitive fields
    res.status(201).json({
      message: 'Student account created successfully',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: assignedRole,
        fullName: newUser.full_name,
        phone: newUser.phone || null,
        avatarUrl: newUser.avatar_url || null,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// POST /api/auth/admin/signup (Admin Registration)
// ----------------------------------------------------------------------------
router.post('/admin/signup', signupLimiter, async (req, res, next) => {
  try {
    const { name, email, password, confirmPassword, inviteCode } = req.body || {};

    // 1. Strict Admin Invite Code Verification
    const configuredInviteCode = process.env.ADMIN_INVITE_CODE ? process.env.ADMIN_INVITE_CODE.trim() : null;
    const providedInviteCode = typeof inviteCode === 'string' ? inviteCode.trim() : '';

    let isCodeValid = false;
    if (configuredInviteCode && providedInviteCode) {
      const bufA = Buffer.from(providedInviteCode);
      const bufB = Buffer.from(configuredInviteCode);
      if (bufA.length === bufB.length) {
        isCodeValid = crypto.timingSafeEqual(bufA, bufB);
      }
    }

    if (!isCodeValid) {
      return res.status(403).json({
        error: 'Invalid or missing admin invite code',
        fields: { inviteCode: 'Valid admin invite code is required' },
      });
    }

    const errors = {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      errors.name = 'Full name is required';
    } else if (name.trim().length < 2 || name.trim().length > 100) {
      errors.name = 'Name must be between 2 and 100 characters';
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      errors.email = 'Email address is required';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password || typeof password !== 'string') {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: 'Validation failed', fields: errors });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check for existing duplicate email
    const { data: existingUser, error: findErr } = await supabase
      .from('users')
      .select('id')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (findErr) throw findErr;
    if (existingUser) {
      return res.status(409).json({
        error: 'Validation failed',
        fields: { email: 'An account with this email already exists' },
      });
    }

    // Hash password with bcrypt
    const passwordHash = bcrypt.hashSync(password, 10);

    // STRICT ADMIN ROLE ENFORCEMENT
    const assignedRole = 'admin';

    const { data: newUser, error: insertUserErr } = await supabase
      .from('users')
      .insert({
        email: normalizedEmail,
        password_hash: passwordHash,
        role: assignedRole,
        full_name: name.trim(),
      })
      .select()
      .single();

    if (insertUserErr) throw insertUserErr;

    // Issue JWT session token matching the existing login mechanism
    const token = jwt.sign(
      { id: newUser.id, role: assignedRole, email: newUser.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Admin account created successfully',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: assignedRole,
        fullName: newUser.full_name,
        phone: newUser.phone || null,
        avatarUrl: newUser.avatar_url || null,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// POST /api/auth/forgot-password (Password reset request)
// ----------------------------------------------------------------------------
router.post('/forgot-password', forgotPasswordLimiter, async (req, res, next) => {
  try {
    const { email } = req.body || {};

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({
        error: 'Validation failed',
        fields: { email: 'Please enter a valid email address' },
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user exists
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, full_name')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (error) throw error;

    if (user) {
      // Generate secure reset token & store SHA-256 hash in database
      const rawToken = await createResetToken(user.id);

      // Construct reset URL using production APP_URL / FRONTEND_URL
      const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
      const cleanAppUrl = appUrl.replace(/\/$/, '');
      const resetUrl = `${cleanAppUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;

      // Dispatch reset email through provider abstraction
      await sendPasswordResetEmail({
        to: user.email,
        resetUrl,
      });
    }

    // CRITICAL SECURITY REQUIREMENT:
    // Generic response regardless of whether the account exists to prevent email enumeration.
    // Never expose whether account exists, user ID, reset token, or password hash.
    res.status(200).json({
      message: 'If an account exists for this email, a password reset link has been sent.',
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// POST /api/auth/reset-password (Password reset fulfillment)
// ----------------------------------------------------------------------------
router.post('/reset-password', resetPasswordLimiter, async (req, res, next) => {
  try {
    const { token, password, confirmPassword } = req.body || {};
    const errors = {};

    if (!token || typeof token !== 'string' || !token.trim()) {
      errors.token = 'Reset token is required';
    }

    if (!password || typeof password !== 'string') {
      errors.password = 'New password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: 'Validation failed', fields: errors });
    }

    // Verify token hash, expiration, single-use, update password, and mark used
    const result = await resetPasswordWithToken(token, password);

    if (!result.success) {
      return res.status(result.status || 400).json({
        error: result.error || 'Invalid or expired reset token',
      });
    }

    res.status(200).json({
      message: 'Password reset successfully. You can now sign in.',
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// GET /api/auth/me (Existing functionality preserved)
// ----------------------------------------------------------------------------
router.get('/me', async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    const token = header.slice('Bearer '.length);
    const payload = jwt.verify(token, JWT_SECRET);

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, role, full_name, phone, avatar_url')
      .eq('id', payload.id)
      .maybeSingle();

    if (error) throw error;
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.status(200).json({
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
      phone: user.phone,
      avatarUrl: user.avatar_url,
    });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    next(err);
  }
});

// ----------------------------------------------------------------------------
// POST /api/auth/change-password (Existing functionality preserved)
// ----------------------------------------------------------------------------
router.post('/change-password', authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    const errors = {};

    if (!currentPassword) errors.currentPassword = 'Current password is required';
    if (!newPassword || newPassword.length < 8) {
      errors.newPassword = 'New password must be at least 8 characters';
    }
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: 'Validation failed', fields: errors });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .maybeSingle();

    if (error) throw error;
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = bcrypt.compareSync(currentPassword, user.password_hash);
    if (!valid) {
      return res.status(400).json({
        error: 'Validation failed',
        fields: { currentPassword: 'Current password is incorrect' },
      });
    }

    if (bcrypt.compareSync(newPassword, user.password_hash)) {
      return res.status(400).json({
        error: 'Validation failed',
        fields: { newPassword: 'New password must be different from your current password' },
      });
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    const { error: updateErr } = await supabase
      .from('users')
      .update({ password_hash: newHash })
      .eq('id', user.id);

    if (updateErr) throw updateErr;

    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
