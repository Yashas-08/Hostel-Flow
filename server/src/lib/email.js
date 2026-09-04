// Production-ready email provider abstraction for Hostel Flow
// Supports Resend API out of the box with zero additional dependencies (native fetch).

const RESEND_API_URL = 'https://api.resend.com/emails';

/**
 * Checks whether a production email provider is configured.
 */
export function isEmailConfigured() {
  const apiKey = process.env.RESEND_API_KEY || process.env.EMAIL_PROVIDER_API_KEY;
  return Boolean(apiKey && apiKey.trim());
}

/**
 * Sends a password reset email to the recipient with a secure reset link.
 * 
 * IMPORTANT SECURITY RULES:
 * - Never log the raw token or the full reset URL containing the token.
 * - Never hard-code credentials.
 * 
 * @param {Object} params
 * @param {string} params.to Recipient email address
 * @param {string} params.resetUrl Reset URL containing the raw token (only sent to recipient)
 * @returns {Promise<{ success: boolean, id?: string, error?: string }>}
 */
export async function sendPasswordResetEmail({ to, resetUrl }) {
  const apiKey = process.env.RESEND_API_KEY || process.env.EMAIL_PROVIDER_API_KEY;
  const from = process.env.EMAIL_FROM || 'Hostel Flow <onboarding@resend.dev>';

  if (!apiKey || !apiKey.trim()) {
    // In local development or environments where an email provider is not yet set up,
    // log a sanitized message WITHOUT revealing the raw reset token.
    console.log(`[EMAIL SERVICE] Password reset link requested for ${to}. Email delivery skipped (RESEND_API_KEY not configured).`);
    return {
      success: true,
      delivered: false,
      reason: 'email_provider_not_configured',
    };
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; }
          .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 32px; }
          .logo { font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 24px; }
          .title { font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
          .text { font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
          .button { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; }
          .footer { font-size: 13px; color: #94a3b8; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">Hostel Flow</div>
          <h1 class="title">Reset your password</h1>
          <p class="text">We received a request to reset the password for your Hostel Flow account. Click the button below to choose a new password:</p>
          <p style="margin: 28px 0;"><a href="${resetUrl}" class="button">Reset Password</a></p>
          <p class="text">This password reset link will expire in <strong>15 minutes</strong>. If you did not request a password reset, you can safely ignore this email.</p>
          <div class="footer">Hostel Flow Residency Management System</div>
        </div>
      </body>
    </html>
  `;

  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: 'Reset your Hostel Flow password',
        html,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('[EMAIL SERVICE] Failed to send email via Resend:', res.status, errorText);
      return { success: false, error: `Email provider error: ${res.status}` };
    }

    const data = await res.json();
    return { success: true, delivered: true, id: data.id };
  } catch (err) {
    console.error('[EMAIL SERVICE] Network exception sending email:', err.message);
    return { success: false, error: err.message };
  }
}
