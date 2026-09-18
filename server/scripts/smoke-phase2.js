/**
 * Phase 2 auth smoke tests — run against a live server.
 * Usage: node scripts/smoke-phase2.js
 */
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { USER_ROLES } from '../utils/constants.js';
import { COOKIE_NAMES } from '../utils/constants.js';
import mongoose from 'mongoose';

const BASE = process.env.API_URL || 'http://localhost:5000';
const stamp = Date.now();
const email = `phase2_${stamp}@example.com`;
const password = 'Password123!';
const newPassword = 'NewPassword123!';

/** @type {Map<string, string>} */
const cookieJar = new Map();

/**
 * @param {string} name
 * @param {boolean} ok
 * @param {string} [detail]
 */
function assert(name, ok, detail = '') {
  if (!ok) {
    console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
    process.exitCode = 1;
    return;
  }
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}

/**
 * Stores Set-Cookie values from a fetch Response.
 * @param {Response} res
 */
function storeCookies(res) {
  const raw = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  for (const line of raw) {
    const [pair] = line.split(';');
    const eq = pair.indexOf('=');
    if (eq === -1) continue;
    const key = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    cookieJar.set(key, value);
  }
}

/**
 * @param {string} path
 * @param {RequestInit} [init]
 */
async function api(path, init = {}) {
  const headers = new Headers(init.headers || {});
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (cookieJar.size > 0) {
    headers.set(
      'Cookie',
      [...cookieJar.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
    );
  }
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  storeCookies(res);
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { res, json };
}

async function main() {
  console.log(`\nPhase 2 auth smoke @ ${BASE}\n`);
  await connectDB();

  // --- invalid signup ---
  {
    const { res, json } = await api('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name: '', email: 'bad', password: 'short' }),
    });
    assert('Invalid signup → 400', res.status === 400, `status=${res.status}`);
    assert('Invalid signup error shape', json?.success === false && Array.isArray(json?.errors));
  }

  // --- signup ---
  let verifyToken = '';
  {
    const { res, json } = await api('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name: 'Phase Two', email, password }),
    });
    assert('Signup → 201', res.status === 201, `status=${res.status}`);
    assert('Signup success shape', json?.success === true && json?.data?.user?.email === email);

    // Pull verify token from DB user id via JWT we can't see — re-sign by hitting forgot? 
    // Instead read last console isn't available; generate via API: use User id + token util.
    const { signEmailVerifyToken } = await import('../utils/token.utils.js');
    const user = await User.findOne({ email });
    verifyToken = signEmailVerifyToken({ sub: user._id.toString() });
  }

  // --- duplicate signup ---
  {
    const { res, json } = await api('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name: 'Phase Two', email, password }),
    });
    assert('Duplicate signup → 409', res.status === 409 && json?.success === false);
  }

  // --- verify email ---
  {
    const { res, json } = await api(`/api/auth/verify-email/${verifyToken}`);
    assert('Verify email → 200', res.status === 200 && json?.data?.user?.isVerified === true);
  }

  // --- login ---
  let accessToken = '';
  {
    cookieJar.clear();
    const { res, json } = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    assert('Login → 200', res.status === 200, `status=${res.status}`);
    assert('Login returns accessToken', typeof json?.data?.accessToken === 'string');
    assert(
      'Login sets refresh cookie',
      cookieJar.has(COOKIE_NAMES.REFRESH_TOKEN),
      `cookies=${[...cookieJar.keys()].join(',')}`
    );
    accessToken = json.data.accessToken;
  }

  // --- me with access token ---
  {
    const { res, json } = await api('/api/auth/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    assert('GET /me with access → 200', res.status === 200 && json?.data?.user?.email === email);
  }

  // --- invalid access token ---
  {
    const { res, json } = await api('/api/auth/me', {
      headers: { Authorization: 'Bearer not.a.valid.token' },
    });
    assert('Invalid access token → 401', res.status === 401 && json?.success === false);
  }

  // --- refresh rotation ---
  const oldRefresh = cookieJar.get(COOKIE_NAMES.REFRESH_TOKEN);
  {
    const { res, json } = await api('/api/auth/refresh', { method: 'POST', body: '{}' });
    assert('Refresh → 200', res.status === 200, `status=${res.status}`);
    assert('Refresh returns new accessToken', typeof json?.data?.accessToken === 'string');
    assert(
      'Refresh rotates cookie',
      cookieJar.get(COOKIE_NAMES.REFRESH_TOKEN) &&
        cookieJar.get(COOKIE_NAMES.REFRESH_TOKEN) !== oldRefresh
    );
  }

  // --- refresh token reuse after rotation ---
  {
    const headers = new Headers({ 'Content-Type': 'application/json' });
    headers.set('Cookie', `${COOKIE_NAMES.REFRESH_TOKEN}=${oldRefresh}`);
    const res = await fetch(`${BASE}/api/auth/refresh`, {
      method: 'POST',
      headers,
      body: '{}',
    });
    const json = await res.json();
    assert(
      'Reuse old refresh after rotation → 401',
      res.status === 401 && json?.success === false,
      json?.message
    );
  }

  // Restore a valid session (reuse detection bumped version + cleared cookie)
  {
    cookieJar.clear();
    const { res, json } = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    assert('Re-login after reuse detection', res.status === 200);
    accessToken = json.data.accessToken;
  }

  // --- non-admin hitting admin route ---
  {
    const { res, json } = await api('/api/admin/ping', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    assert('Non-admin admin route → 403', res.status === 403 && json?.success === false);
  }

  // --- admin access ---
  {
    await User.updateOne({ email }, { role: USER_ROLES.ADMIN });
    cookieJar.clear();
    const { json: loginJson } = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    const adminAccess = loginJson.data.accessToken;
    const { res, json } = await api('/api/admin/ping', {
      headers: { Authorization: `Bearer ${adminAccess}` },
    });
    assert('Admin ping → 200', res.status === 200 && json?.data?.admin === true);
    accessToken = adminAccess;
  }

  // --- forgot + reset password ---
  let resetToken = '';
  {
    const { res, json } = await api('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    assert('Forgot password → 200', res.status === 200 && json?.success === true);
    const { signPasswordResetToken } = await import('../utils/token.utils.js');
    const user = await User.findOne({ email });
    resetToken = signPasswordResetToken({ sub: user._id.toString() });
  }

  {
    const { res, json } = await api('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: resetToken, password: newPassword }),
    });
    assert('Reset password → 200', res.status === 200 && json?.success === true);
  }

  {
    const { res } = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    assert('Old password rejected after reset', res.status === 401);
  }

  {
    cookieJar.clear();
    const { res, json } = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: newPassword }),
    });
    assert('New password login → 200', res.status === 200 && typeof json?.data?.accessToken === 'string');
    accessToken = json.data.accessToken;
  }

  // --- logout ---
  {
    const { res, json } = await api('/api/auth/logout', { method: 'POST', body: '{}' });
    assert('Logout → 200', res.status === 200 && json?.success === true);
  }

  {
    const { res, json } = await api('/api/auth/refresh', { method: 'POST', body: '{}' });
    assert('Refresh after logout → 401', res.status === 401 && json?.success === false);
  }

  // cleanup
  await User.deleteOne({ email });
  await mongoose.disconnect();

  if (process.exitCode) {
    console.log('\nPhase 2 smoke FAILED\n');
    process.exit(1);
  }
  console.log('\nPhase 2 smoke PASSED\n');
}

main().catch(async (err) => {
  console.error('Smoke runner error:', err.message || err);
  try {
    await User.deleteOne({ email });
    await mongoose.disconnect();
  } catch {
    // ignore cleanup errors
  }
  process.exit(1);
});
