import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import express from 'express';
import cors from 'cors';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
if (!process.env.JWT_SECRET || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.ADMIN_INVITE_CODE) {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}

import authRoutes from '../routes/auth.js';
import { supabase } from './index.js';
import { createResetToken, _createTestToken } from '../lib/resetTokens.js';

console.log('================================================================');
console.log('HOSTEL FLOW: AUTHENTICATION ENHANCEMENT VERIFICATION SUITE');
console.log('================================================================\n');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);

const server = http.createServer(app);
const TEST_PORT = 4056;

async function request(path, options = {}) {
  const url = `http://localhost:${TEST_PORT}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  let body = null;
  const text = await res.text();
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

const testResults = [];
function report(name, pass, details = '') {
  testResults.push({ name, pass, details });
  const badge = pass ? '✓ PASS' : '❌ FAIL';
  console.log(`[${badge}] ${name}${details ? ` -> ${details}` : ''}`);
}

async function runAuthTests() {
  await new Promise((resolve) => server.listen(TEST_PORT, resolve));
  console.log(`Test Auth API server listening on port ${TEST_PORT}\n`);

  const timestamp = Date.now();
  const testStudentEmail = `test.student.${timestamp}@hostelflow.app`;
  let testUserId = null;
  let validResetToken = null;

  try {
    // ------------------------------------------------------------------------
    // Baseline: Student & Admin Login verification
    // ------------------------------------------------------------------------
    const adminLogin = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@hostelflow.app', password: 'password123' }),
    });
    const adminPass = adminLogin.status === 200 && adminLogin.body.user?.role === 'admin';
    report('Baseline: Admin Login (admin@hostelflow.app)', adminPass, `Status: ${adminLogin.status}`);

    const studentLogin = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'asha.rao@hostelflow.app', password: 'password123' }),
    });
    const studentPass = studentLogin.status === 200 && studentLogin.body.user?.role === 'student';
    report('Baseline: Student Login (asha.rao@hostelflow.app)', studentPass, `Status: ${studentLogin.status}`);

    // ------------------------------------------------------------------------
    // 1. Valid Signup
    // ------------------------------------------------------------------------
    const signupRes = await request('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Student User',
        email: testStudentEmail,
        password: 'initialPassword123',
        confirmPassword: 'initialPassword123',
      }),
    });
    const signupPass = signupRes.status === 201 &&
                       signupRes.body.token &&
                       signupRes.body.user?.email === testStudentEmail &&
                       signupRes.body.user?.role === 'student' &&
                       !signupRes.body.password &&
                       !signupRes.body.password_hash;
    testUserId = signupRes.body.user?.id;
    report('1. Valid Student Signup', signupPass,
      `Status: ${signupRes.status}, User ID: ${testUserId}, Role: ${signupRes.body?.user?.role}`);

    // ------------------------------------------------------------------------
    // 2. Duplicate Email Signup
    // ------------------------------------------------------------------------
    const dupSignupRes = await request('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Another User',
        email: testStudentEmail,
        password: 'initialPassword123',
        confirmPassword: 'initialPassword123',
      }),
    });
    const dupPass = dupSignupRes.status === 409;
    report('2. Duplicate Email Signup Rejection', dupPass, `Status: ${dupSignupRes.status} (Rejected)`);

    // ------------------------------------------------------------------------
    // 3. Invalid Email
    // ------------------------------------------------------------------------
    const invalidEmailRes = await request('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Invalid Email User',
        email: 'invalid-email-address',
        password: 'initialPassword123',
        confirmPassword: 'initialPassword123',
      }),
    });
    const invalidEmailPass = invalidEmailRes.status === 400;
    report('3. Invalid Email Format Rejection', invalidEmailPass, `Status: ${invalidEmailRes.status}`);

    // ------------------------------------------------------------------------
    // 4. Weak Password (< 8 chars)
    // ------------------------------------------------------------------------
    const weakPassRes = await request('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Weak Password User',
        email: `weak.${timestamp}@hostelflow.app`,
        password: 'short',
        confirmPassword: 'short',
      }),
    });
    const weakPass = weakPassRes.status === 400;
    report('4. Weak Password (< 8 characters) Rejection', weakPass, `Status: ${weakPassRes.status}`);

    // ------------------------------------------------------------------------
    // 5. Password Mismatch
    // ------------------------------------------------------------------------
    const mismatchRes = await request('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Mismatch User',
        email: `mismatch.${timestamp}@hostelflow.app`,
        password: 'initialPassword123',
        confirmPassword: 'differentPassword123',
      }),
    });
    const mismatchPass = mismatchRes.status === 400;
    report('5. Password Confirmation Mismatch Rejection', mismatchPass, `Status: ${mismatchRes.status}`);

    // ------------------------------------------------------------------------
    // 6. Public Signup Cannot Create Admin
    // ------------------------------------------------------------------------
    const adminAttemptEmail = `hacker.${timestamp}@hostelflow.app`;
    const adminAttemptRes = await request('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Malicious Actor',
        email: adminAttemptEmail,
        password: 'initialPassword123',
        confirmPassword: 'initialPassword123',
        role: 'admin', // ILLEGAL privilege escalation attempt
      }),
    });
    // Server must strictly force role to 'student'
    const adminEscalationBlocked = adminAttemptRes.status === 201 && adminAttemptRes.body.user?.role === 'student';
    report('6. Public Signup Cannot Create Admin (Role Strictly Student)', adminEscalationBlocked,
      `Assigned Role: ${adminAttemptRes.body?.user?.role || 'N/A'}`);

    // Clean up malicious user test record
    if (adminAttemptRes.body?.user?.id) {
      await supabase.from('users').delete().eq('id', adminAttemptRes.body.user.id);
    }

    // ------------------------------------------------------------------------
    // 7. Valid Login After Signup
    // ------------------------------------------------------------------------
    const newLoginRes = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testStudentEmail,
        password: 'initialPassword123',
      }),
    });
    const newLoginPass = newLoginRes.status === 200 && newLoginRes.body.token && newLoginRes.body.user?.email === testStudentEmail;
    report('7. Valid Login After Signup', newLoginPass, `Status: ${newLoginRes.status}`);

    // ------------------------------------------------------------------------
    // 8. Forgot Password for Existing Email
    // ------------------------------------------------------------------------
    const forgotExistingRes = await request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: testStudentEmail }),
    });
    const genericMsg = 'If an account exists for this email, a password reset link has been sent.';
    const forgotExistingPass = forgotExistingRes.status === 200 && forgotExistingRes.body.message === genericMsg;
    report('8. Forgot Password for Existing Email', forgotExistingPass,
      `Message: "${forgotExistingRes.body?.message}"`);

    // ------------------------------------------------------------------------
    // 9. Forgot Password for Non-Existing Email Returns Identical Response
    // ------------------------------------------------------------------------
    const forgotNonExistingRes = await request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'nonexistent.user.999@hostelflow.app' }),
    });
    const forgotNonExistingPass = forgotNonExistingRes.status === 200 && forgotNonExistingRes.body.message === genericMsg;
    report('9. Forgot Password Non-Existing Email Returns Identical Generic Message', forgotNonExistingPass,
      `Message: "${forgotNonExistingRes.body?.message}"`);

    // ------------------------------------------------------------------------
    // 10. Valid Reset Token
    // ------------------------------------------------------------------------
    validResetToken = await createResetToken(testUserId);
    const validResetRes = await request('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: validResetToken,
        password: 'brandNewPassword456',
        confirmPassword: 'brandNewPassword456',
      }),
    });
    const validResetPass = validResetRes.status === 200;
    report('10. Valid Password Reset Using Cryptographic Token', validResetPass,
      `Status: ${validResetRes.status}`);

    // ------------------------------------------------------------------------
    // 11. Invalid Reset Token
    // ------------------------------------------------------------------------
    const invalidTokenRes = await request('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: 'this-is-a-completely-bogus-token-12345',
        password: 'brandNewPassword456',
        confirmPassword: 'brandNewPassword456',
      }),
    });
    const invalidTokenPass = invalidTokenRes.status === 400;
    report('11. Invalid Reset Token Rejection', invalidTokenPass, `Status: ${invalidTokenRes.status}`);

    // ------------------------------------------------------------------------
    // 12. Expired Reset Token
    // ------------------------------------------------------------------------
    const expiredToken = await _createTestToken({ userId: testUserId, isExpired: true });
    const expiredTokenRes = await request('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: expiredToken,
        password: 'brandNewPassword456',
        confirmPassword: 'brandNewPassword456',
      }),
    });
    const expiredTokenPass = expiredTokenRes.status === 400;
    report('12. Expired Reset Token Rejection', expiredTokenPass, `Status: ${expiredTokenRes.status}`);

    // ------------------------------------------------------------------------
    // 13. Already-Used Reset Token
    // ------------------------------------------------------------------------
    // Attempt to reuse validResetToken which was already consumed in Test 10
    const reuseTokenRes = await request('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: validResetToken,
        password: 'brandNewPassword456',
        confirmPassword: 'brandNewPassword456',
      }),
    });
    const reuseTokenPass = reuseTokenRes.status === 400;
    report('13. Already-Used Reset Token Rejection (Single-Use Guarantee)', reuseTokenPass,
      `Status: ${reuseTokenRes.status}`);

    // ------------------------------------------------------------------------
    // 14. Password Mismatch During Reset
    // ------------------------------------------------------------------------
    const anotherToken = await createResetToken(testUserId);
    const resetMismatchRes = await request('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: anotherToken,
        password: 'newPassword789',
        confirmPassword: 'differentPassword789',
      }),
    });
    const resetMismatchPass = resetMismatchRes.status === 400;
    report('14. Password Confirmation Mismatch During Reset Rejection', resetMismatchPass,
      `Status: ${resetMismatchRes.status}`);

    // ------------------------------------------------------------------------
    // 15. New Password Works After Reset
    // ------------------------------------------------------------------------
    const newPassLoginRes = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testStudentEmail,
        password: 'brandNewPassword456',
      }),
    });
    const newPassLoginPass = newPassLoginRes.status === 200 && newPassLoginRes.body.token;
    report('15. New Password Works Successfully After Reset', newPassLoginPass,
      `Status: ${newPassLoginRes.status}`);

    // ------------------------------------------------------------------------
    // 16. Old Password No Longer Works After Reset
    // ------------------------------------------------------------------------
    const oldPassLoginRes = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testStudentEmail,
        password: 'initialPassword123',
      }),
    });
    const oldPassLoginPass = oldPassLoginRes.status === 401;
    report('16. Old Password No Longer Works After Reset', oldPassLoginPass,
      `Status: ${oldPassLoginRes.status} (401 Unauthorized as expected)`);

    // ------------------------------------------------------------------------
    // 17. Forgot-Password Rate Limiting
    // ------------------------------------------------------------------------
    // Send repeated requests until rate limit (5 attempts) is hit
    let forgotRateLimitHit = false;
    for (let i = 0; i < 6; i++) {
      const res = await request('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: `rate.limit.${i}@hostelflow.app` }),
      });
      if (res.status === 429) {
        forgotRateLimitHit = true;
        break;
      }
    }
    report('17. Forgot-Password Rate Limiting Enforced', forgotRateLimitHit,
      `Rate limit triggered 429 Too Many Requests`);

    // ------------------------------------------------------------------------
    // 18. Login Rate Limiting Remains Functional
    // ------------------------------------------------------------------------
    let loginRateLimitHit = false;
    for (let i = 0; i < 6; i++) {
      const res = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'bad.login@hostelflow.app', password: 'wrongPassword' }),
      });
      if (res.status === 429) {
        loginRateLimitHit = true;
        break;
      }
    }
    report('18. Login Rate Limiting Remains Functional', loginRateLimitHit,
      `Rate limit triggered 429 Too Many Requests`);

    // ------------------------------------------------------------------------
    // 19. Admin Signup - Missing Invite Code Rejection (403 & No User Created)
    // ------------------------------------------------------------------------
    const missingCodeEmail = `admin.missing.${timestamp}@hostelflow.app`;
    const missingCodeRes = await request('/api/auth/admin/signup', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Missing Code Admin',
        email: missingCodeEmail,
        password: 'adminPassword123',
        confirmPassword: 'adminPassword123',
      }),
    });
    const { data: missingUserInDb } = await supabase
      .from('users')
      .select('id')
      .eq('email', missingCodeEmail)
      .maybeSingle();
    const missingCodePass = missingCodeRes.status === 403 && !missingUserInDb;
    report('19. Admin Signup - Missing Invite Code Rejection (403 & No User)', missingCodePass,
      `Status: ${missingCodeRes.status}, User in DB: ${!!missingUserInDb}`);

    // ------------------------------------------------------------------------
    // 20. Admin Signup - Invalid Invite Code Rejection (403 & No User Created)
    // ------------------------------------------------------------------------
    const invalidCodeEmail = `admin.invalid.${timestamp}@hostelflow.app`;
    const invalidCodeRes = await request('/api/auth/admin/signup', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Invalid Code Admin',
        email: invalidCodeEmail,
        password: 'adminPassword123',
        confirmPassword: 'adminPassword123',
        inviteCode: 'completely_wrong_invite_code_xyz',
      }),
    });
    const { data: invalidUserInDb } = await supabase
      .from('users')
      .select('id')
      .eq('email', invalidCodeEmail)
      .maybeSingle();
    const invalidCodePass = invalidCodeRes.status === 403 && !invalidUserInDb;
    report('20. Admin Signup - Invalid Invite Code Rejection (403 & No User)', invalidCodePass,
      `Status: ${invalidCodeRes.status}, User in DB: ${!!invalidUserInDb}`);

    // ------------------------------------------------------------------------
    // 21. Admin Signup - Valid Invite Code Creation (201 & role=admin)
    // ------------------------------------------------------------------------
    let testAdminId = null;
    const validAdminEmail = `admin.valid.${timestamp}@hostelflow.app`;
    const validAdminRes = await request('/api/auth/admin/signup', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Valid Admin User',
        email: validAdminEmail,
        password: 'adminPassword123',
        confirmPassword: 'adminPassword123',
        inviteCode: process.env.ADMIN_INVITE_CODE,
      }),
    });
    const { data: validUserInDb } = await supabase
      .from('users')
      .select('id, role')
      .eq('email', validAdminEmail)
      .maybeSingle();
    testAdminId = validAdminRes.body?.user?.id;
    const validAdminPass = validAdminRes.status === 201 &&
                           validAdminRes.body?.token &&
                           validAdminRes.body?.user?.role === 'admin' &&
                           validUserInDb?.role === 'admin';
    report('21. Admin Signup - Valid Invite Code Creation (201 & role=admin)', validAdminPass,
      `Status: ${validAdminRes.status}, Role: ${validAdminRes.body?.user?.role}, DB Role: ${validUserInDb?.role}`);

    // ------------------------------------------------------------------------
    // 22. Admin Signup - Duplicate Email Rejection (409)
    // ------------------------------------------------------------------------
    const dupAdminRes = await request('/api/auth/admin/signup', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Duplicate Admin User',
        email: validAdminEmail,
        password: 'adminPassword123',
        confirmPassword: 'adminPassword123',
        inviteCode: process.env.ADMIN_INVITE_CODE,
      }),
    });
    const dupAdminPass = dupAdminRes.status === 409;
    report('22. Admin Signup - Duplicate Email Rejection (409)', dupAdminPass,
      `Status: ${dupAdminRes.status} (Rejected)`);

    // Clean up created student test record
    if (testUserId) {
      await supabase.from('users').delete().eq('id', testUserId);
      console.log(`\nCleaned up test student user ${testUserId}`);
    }

    // Clean up created admin test record
    if (testAdminId) {
      await supabase.from('users').delete().eq('id', testAdminId);
      console.log(`Cleaned up test admin user ${testAdminId}`);
    }

  } catch (err) {
    console.error('Authentication test execution error:', err);
  } finally {
    server.close();
  }

  console.log('\n================================================================');
  console.log('AUTHENTICATION VERIFICATION RESULTS');
  console.log('================================================================');
  const allTestsPass = testResults.every((r) => r.pass);
  testResults.forEach((r) => console.log(`${r.pass ? '✓ PASS' : '❌ FAIL'}: ${r.name}`));
  console.log('================================================================');
  if (allTestsPass) {
    console.log('🎉 All authentication enhancement tests passed successfully.');
  } else {
    console.log('⚠️ Some authentication tests failed.');
  }
}

runAuthTests();
