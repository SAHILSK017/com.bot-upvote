/**
 * Phase 6 admin smoke tests — run against a live server.
 * Usage: node scripts/smoke-phase6.js
 */
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Post } from '../models/Post.js';
import { POST_CATEGORIES, POST_STATUSES, USER_ROLES } from '../utils/constants.js';

const BASE = process.env.API_URL || 'http://localhost:5000';
const stamp = Date.now();
const userEmail = `phase6_user_${stamp}@example.com`;
const adminEmail = `phase6_admin_${stamp}@example.com`;
const password = 'Password123!';

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
 * @param {Response} res
 */
function storeCookies(res) {
  const raw = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  for (const line of raw) {
    const [pair] = line.split(';');
    const eq = pair.indexOf('=');
    if (eq === -1) continue;
    cookieJar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
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

/**
 * @param {string} email
 * @param {string} [role]
 */
async function signupLogin(email, role = USER_ROLES.USER) {
  await api('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name: 'Phase Six', email, password }),
  });
  const user = await User.findOne({ email });
  user.isVerified = true;
  if (role !== USER_ROLES.USER) user.role = role;
  await user.save();
  cookieJar.clear();
  const { json } = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return json.data.accessToken;
}

async function main() {
  console.log(`\nPhase 6 admin smoke @ ${BASE}\n`);
  await connectDB();

  const userToken = await signupLogin(userEmail);
  const adminToken = await signupLogin(adminEmail, USER_ROLES.ADMIN);

  const { json: created } = await api('/api/posts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` },
    body: JSON.stringify({
      title: 'Admin status workflow',
      description: 'Post used to verify admin list and status transitions.',
      category: POST_CATEGORIES.GENERAL,
    }),
  });
  const postId = created.data.post.id;
  assert('Seed post created', Boolean(postId));
  assert('Default status under_review', created.data.post.status === POST_STATUSES.UNDER_REVIEW);

  // non-admin blocked
  {
    const { res, json } = await api('/api/admin/posts', {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert('Non-admin list → 403', res.status === 403 && json?.success === false);
  }

  {
    const { res, json } = await api(`/api/admin/posts/${postId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({ status: POST_STATUSES.PLANNED }),
    });
    assert('Non-admin status → 403', res.status === 403 && json?.success === false);
  }

  // admin list
  {
    const { res, json } = await api('/api/admin/posts?status=under_review', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert('Admin list → 200', res.status === 200 && json?.success === true);
    assert(
      'Admin list includes seed post',
      json.data.posts.some((p) => p.id === postId)
    );
  }

  // sequential: under_review → planned
  {
    const { res, json } = await api(`/api/admin/posts/${postId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: POST_STATUSES.PLANNED }),
    });
    assert('Sequential planned → 200', res.status === 200);
    assert('outOfSequence false', json?.data?.outOfSequence === false);
    assert('Status planned', json?.data?.post?.status === POST_STATUSES.PLANNED);
  }

  // sequential: planned → in_progress
  {
    const { res, json } = await api(`/api/admin/posts/${postId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: POST_STATUSES.IN_PROGRESS }),
    });
    assert('Sequential in_progress', res.status === 200 && json?.data?.outOfSequence === false);
  }

  // sequential: in_progress → completed
  {
    const { res, json } = await api(`/api/admin/posts/${postId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: POST_STATUSES.COMPLETED }),
    });
    assert('Sequential completed', res.status === 200 && json?.data?.outOfSequence === false);
  }

  // out-of-sequence override: completed → under_review
  {
    const { res, json } = await api(`/api/admin/posts/${postId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: POST_STATUSES.UNDER_REVIEW }),
    });
    assert('Out-of-sequence allowed → 200', res.status === 200);
    assert('outOfSequence true', json?.data?.outOfSequence === true);
    assert('Status back to under_review', json?.data?.post?.status === POST_STATUSES.UNDER_REVIEW);
  }

  // jump forward out of sequence: under_review → completed
  {
    const { res, json } = await api(`/api/admin/posts/${postId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: POST_STATUSES.COMPLETED }),
    });
    assert('Jump to completed flagged', res.status === 200 && json?.data?.outOfSequence === true);
  }

  // demoted admin: JWT may still say admin, but DB role must win
  {
    await User.updateOne({ email: adminEmail }, { $set: { role: USER_ROLES.USER } });
    const { res, json } = await api('/api/admin/posts', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      'Demoted admin JWT → 403 (DB role)',
      res.status === 403 && json?.success === false
    );
    await User.updateOne({ email: adminEmail }, { $set: { role: USER_ROLES.ADMIN } });
  }

  // invalid status body
  {
    const { res, json } = await api(`/api/admin/posts/${postId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'shipped' }),
    });
    assert('Invalid status → 400', res.status === 400 && json?.success === false);
  }

  // missing post
  {
    const fake = new mongoose.Types.ObjectId().toString();
    const { res, json } = await api(`/api/admin/posts/${fake}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: POST_STATUSES.PLANNED }),
    });
    assert('Missing post → 404', res.status === 404 && json?.success === false);
  }

  await Post.deleteOne({ _id: postId });
  await User.deleteMany({ email: { $in: [userEmail, adminEmail] } });
  await mongoose.disconnect();

  if (process.exitCode) {
    console.log('\nPhase 6 smoke FAILED\n');
    process.exit(1);
  }
  console.log('\nPhase 6 smoke PASSED\n');
}

main().catch(async (err) => {
  console.error('Smoke runner error:', err.message || err);
  try {
    await User.deleteMany({ email: { $in: [userEmail, adminEmail] } });
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
