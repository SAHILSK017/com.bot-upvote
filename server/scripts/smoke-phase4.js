/**
 * Phase 4 voting smoke tests — run against a live server.
 * Usage: node scripts/smoke-phase4.js
 */
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Post } from '../models/Post.js';
import { POST_CATEGORIES } from '../utils/constants.js';

const BASE = process.env.API_URL || 'http://localhost:5000';
const stamp = Date.now();
const email = `phase4_${stamp}@example.com`;
const email2 = `phase4b_${stamp}@example.com`;
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
 * @param {string} userEmail
 */
async function signupLogin(userEmail) {
  await api('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name: 'Phase Four', email: userEmail, password }),
  });
  const user = await User.findOne({ email: userEmail });
  user.isVerified = true;
  await user.save();
  cookieJar.clear();
  const { json } = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: userEmail, password }),
  });
  return json.data.accessToken;
}

async function main() {
  console.log(`\nPhase 4 voting smoke @ ${BASE}\n`);
  await connectDB();

  const accessA = await signupLogin(email);

  const { json: created } = await api('/api/posts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessA}` },
    body: JSON.stringify({
      title: 'Atomic upvote test',
      description: 'Post used to verify atomic vote and unvote operations.',
      category: POST_CATEGORIES.GENERAL,
    }),
  });
  const postId = created.data.post.id;
  assert('Post created', Boolean(postId));
  assert('Initial voteCount 0', created.data.post.voteCount === 0);

  // guest cannot vote
  {
    const { res, json } = await api(`/api/posts/${postId}/vote`, {
      method: 'POST',
      body: '{}',
    });
    assert('Guest vote → 401', res.status === 401 && json?.success === false);
  }

  // vote
  {
    const { res, json } = await api(`/api/posts/${postId}/vote`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessA}` },
      body: '{}',
    });
    assert('Vote → 200', res.status === 200, `status=${res.status}`);
    assert('Vote count 1', json?.data?.post?.voteCount === 1);
    assert('hasVoted true', json?.data?.post?.hasVoted === true);
  }

  // duplicate vote
  {
    const { res, json } = await api(`/api/posts/${postId}/vote`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessA}` },
      body: '{}',
    });
    assert('Duplicate vote → 409', res.status === 409 && json?.success === false);
    const fresh = await Post.findById(postId);
    assert('Duplicate did not bump count', fresh.voteCount === 1);
  }

  // concurrent duplicate attempts (race)
  {
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        api(`/api/posts/${postId}/vote`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessA}` },
          body: '{}',
        })
      )
    );
    const fresh = await Post.findById(postId);
    assert(
      'Concurrent duplicates keep voteCount=1',
      fresh.voteCount === 1,
      `count=${fresh.voteCount}`
    );
    assert(
      'Concurrent duplicates all rejected',
      results.every((r) => r.res.status === 409),
      `statuses=${results.map((r) => r.res.status).join(',')}`
    );
  }

  // second user can vote
  const accessB = await signupLogin(email2);
  {
    const { res, json } = await api(`/api/posts/${postId}/vote`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessB}` },
      body: '{}',
    });
    assert('Second user vote → 200', res.status === 200 && json?.data?.post?.voteCount === 2);
  }

  // unvote as user A
  {
    const { res, json } = await api(`/api/posts/${postId}/vote`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessA}` },
      body: '{}',
    });
    assert('Unvote → 200', res.status === 200, `status=${res.status}`);
    assert('Vote count after unvote', json?.data?.post?.voteCount === 1);
    assert('hasVoted false after unvote', json?.data?.post?.hasVoted === false);
  }

  // unvote when not voted
  {
    const { res, json } = await api(`/api/posts/${postId}/vote`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessA}` },
      body: '{}',
    });
    assert('Unvote without vote → 409', res.status === 409 && json?.success === false);
  }

  // missing post
  {
    const fake = new mongoose.Types.ObjectId().toString();
    const { res, json } = await api(`/api/posts/${fake}/vote`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessA}` },
      body: '{}',
    });
    assert('Vote missing post → 404', res.status === 404 && json?.success === false);
  }

  await Post.deleteOne({ _id: postId });
  await User.deleteMany({ email: { $in: [email, email2] } });
  await mongoose.disconnect();

  if (process.exitCode) {
    console.log('\nPhase 4 smoke FAILED\n');
    process.exit(1);
  }
  console.log('\nPhase 4 smoke PASSED\n');
}

main().catch(async (err) => {
  console.error('Smoke runner error:', err.message || err);
  try {
    await User.deleteMany({ email: { $in: [email, email2] } });
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
