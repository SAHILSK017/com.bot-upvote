/**
 * Phase 5 comments smoke tests — run against a live server.
 * Usage: node scripts/smoke-phase5.js
 */
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Post } from '../models/Post.js';
import { Comment } from '../models/Comment.js';
import { POST_CATEGORIES, USER_ROLES } from '../utils/constants.js';

const BASE = process.env.API_URL || 'http://localhost:5000';
const stamp = Date.now();
const emailA = `phase5a_${stamp}@example.com`;
const emailB = `phase5b_${stamp}@example.com`;
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
 */
async function signupLogin(email) {
  await api('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name: 'Phase Five', email, password }),
  });
  const user = await User.findOne({ email });
  user.isVerified = true;
  await user.save();
  cookieJar.clear();
  const { json } = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return { token: json.data.accessToken, user };
}

async function main() {
  console.log(`\nPhase 5 comments smoke @ ${BASE}\n`);
  await connectDB();

  const { token: tokenA, user: userA } = await signupLogin(emailA);
  const { token: tokenB } = await signupLogin(emailB);

  const { json: created } = await api('/api/posts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      title: 'Comments thread test',
      description: 'Post used to verify threaded comments and moderation.',
      category: POST_CATEGORIES.GENERAL,
    }),
  });
  const postId = created.data.post.id;
  assert('Post created', Boolean(postId));

  // guest cannot comment
  {
    const { res, json } = await api(`/api/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content: 'Nope' }),
    });
    assert('Guest comment → 401', res.status === 401 && json?.success === false);
  }

  // create top-level
  let parentId = '';
  {
    const { res, json } = await api(`/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ content: 'Top-level comment about the idea.' }),
    });
    assert('Create comment → 201', res.status === 201, `status=${res.status}`);
    parentId = json.data.comment.id;
    const post = await Post.findById(postId);
    assert('commentCount after create = 1', post.commentCount === 1);
  }

  // reply
  let replyId = '';
  {
    const { res, json } = await api(`/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({
        content: 'I agree with this suggestion.',
        parentComment: parentId,
      }),
    });
    assert('Create reply → 201', res.status === 201);
    replyId = json.data.comment.id;
    const post = await Post.findById(postId);
    assert('commentCount after reply = 2', post.commentCount === 2);
  }

  // reply-to-reply rejected
  {
    const { res, json } = await api(`/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        content: 'Nested too deep',
        parentComment: replyId,
      }),
    });
    assert('Reply-to-reply → 400', res.status === 400 && json?.success === false);
  }

  // list threaded
  {
    const { res, json } = await api(`/api/posts/${postId}/comments`);
    assert('List comments → 200', res.status === 200 && json?.data?.comments?.length === 1);
    assert('List has nested reply', json.data.comments[0].replies?.length === 1);
  }

  // other user cannot edit
  {
    const { res, json } = await api(`/api/comments/${parentId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({ content: 'Hijack' }),
    });
    assert('Non-author edit → 403', res.status === 403 && json?.success === false);
  }

  // author edit
  {
    const { res, json } = await api(`/api/comments/${parentId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ content: 'Updated top-level comment.' }),
    });
    assert('Author edit → 200', res.status === 200 && json?.data?.comment?.editedAt);
  }

  // other user cannot delete
  {
    const { res, json } = await api(`/api/comments/${parentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert('Non-author delete → 403', res.status === 403 && json?.success === false);
  }

  // admin can delete (cascade)
  {
    await User.updateOne({ _id: userA._id }, { role: USER_ROLES.ADMIN });
    cookieJar.clear();
    const { json: loginJson } = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: emailA, password }),
    });
    const adminToken = loginJson.data.accessToken;

    const { res, json } = await api(`/api/comments/${parentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert('Admin delete cascade → 200', res.status === 200 && json?.data?.deleted === 2);
    const post = await Post.findById(postId);
    assert('commentCount after cascade = 0', post.commentCount === 0);
    const left = await Comment.countDocuments({ post: postId });
    assert('No comments left', left === 0);
  }

  await Post.deleteOne({ _id: postId });
  await User.deleteMany({ email: { $in: [emailA, emailB] } });
  await mongoose.disconnect();

  if (process.exitCode) {
    console.log('\nPhase 5 smoke FAILED\n');
    process.exit(1);
  }
  console.log('\nPhase 5 smoke PASSED\n');
}

main().catch(async (err) => {
  console.error('Smoke runner error:', err.message || err);
  try {
    await User.deleteMany({ email: { $in: [emailA, emailB] } });
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
