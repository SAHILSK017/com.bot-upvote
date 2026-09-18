/**
 * Phase 3 posts smoke tests — run against a live server.
 * Usage: node scripts/smoke-phase3.js
 */
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Post } from '../models/Post.js';
import { POST_CATEGORIES, POST_STATUSES } from '../utils/constants.js';

const BASE = process.env.API_URL || 'http://localhost:5000';
const stamp = Date.now();
const email = `phase3_${stamp}@example.com`;
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

async function main() {
  console.log(`\nPhase 3 posts smoke @ ${BASE}\n`);
  await connectDB();

  // signup + login
  await api('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name: 'Phase Three', email, password }),
  });
  const user = await User.findOne({ email });
  user.isVerified = true;
  await user.save();

  cookieJar.clear();
  const { json: loginJson } = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const accessToken = loginJson.data.accessToken;
  assert('Auth ready', typeof accessToken === 'string');

  // guest cannot create
  {
    const { res, json } = await api('/api/posts', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Guest post',
        description: 'Should not be allowed to create',
        category: POST_CATEGORIES.GENERAL,
      }),
    });
    assert('Guest create → 401', res.status === 401 && json?.success === false);
  }

  // invalid create body
  {
    const { res, json } = await api('/api/posts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ title: 'ab', description: 'short', category: 'Nope' }),
    });
    assert('Invalid create → 400', res.status === 400 && json?.success === false);
  }

  // create posts
  /** @type {string[]} */
  const ids = [];
  const payloads = [
    {
      title: 'Dark mode for dashboard',
      description: 'Add a dark theme toggle across the roadmap portal UI.',
      category: POST_CATEGORIES.UI_UX,
    },
    {
      title: 'Slack integration',
      description: 'Notify a Slack channel when a feature request is marked planned.',
      category: POST_CATEGORIES.INTEGRATIONS,
    },
    {
      title: 'Faster feed queries',
      description: 'Optimize Mongo indexes for sorting by votes and discussion.',
      category: POST_CATEGORIES.PERFORMANCE,
    },
  ];

  for (const body of payloads) {
    const { res, json } = await api('/api/posts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    });
    assert(`Create "${body.title}" → 201`, res.status === 201, `status=${res.status}`);
    assert(`Create shape ${body.title}`, json?.success === true && json?.data?.post?.id);
    ids.push(json.data.post.id);
  }

  // seed denormalized counts for sort tests
  await Post.findByIdAndUpdate(ids[0], { voteCount: 5, commentCount: 1 });
  await Post.findByIdAndUpdate(ids[1], { voteCount: 2, commentCount: 9 });
  await Post.findByIdAndUpdate(ids[2], {
    voteCount: 8,
    commentCount: 3,
    status: POST_STATUSES.PLANNED,
  });

  // list newest
  {
    const { res, json } = await api('/api/posts?sort=newest&limit=10');
    assert('List newest → 200', res.status === 200 && json?.success === true);
    assert('List pagination present', typeof json?.data?.pagination?.total === 'number');
    const mine = json.data.posts.filter((p) => ids.includes(p.id));
    assert('List includes created posts', mine.length === 3, `found=${mine.length}`);
  }

  // sort upvoted
  {
    const { json } = await api(`/api/posts?sort=upvoted&search=feed%20queries`);
    // broader: filter to our ids via category performance + upvoted
    const { json: up } = await api(
      `/api/posts?sort=upvoted&category=${encodeURIComponent(POST_CATEGORIES.PERFORMANCE)}`
    );
    assert(
      'Sort upvoted (performance)',
      up?.data?.posts?.[0]?.id === ids[2],
      `first=${up?.data?.posts?.[0]?.id}`
    );
    assert('Search endpoint responds', json?.success === true);
  }

  // sort discussed
  {
    const { json } = await api(
      `/api/posts?sort=discussed&category=${encodeURIComponent(POST_CATEGORIES.INTEGRATIONS)}`
    );
    assert(
      'Sort discussed (integrations)',
      json?.data?.posts?.[0]?.id === ids[1] && json.data.posts[0].commentCount === 9
    );
  }

  // filter status
  {
    const { json } = await api(`/api/posts?status=${POST_STATUSES.PLANNED}`);
    const hit = json.data.posts.find((p) => p.id === ids[2]);
    assert('Filter status=planned', Boolean(hit));
  }

  // text search
  {
    const { res, json } = await api('/api/posts?search=Slack%20integration');
    assert('Text search → 200', res.status === 200 && json?.success === true);
    assert(
      'Text search finds Slack post',
      json.data.posts.some((p) => p.id === ids[1]),
      `count=${json.data.posts.length}`
    );
  }

  // pagination
  {
    const { json } = await api('/api/posts?page=1&limit=1&sort=newest');
    assert('Pagination limit=1', json?.data?.posts?.length === 1);
    assert('Pagination meta', json.data.pagination.limit === 1 && json.data.pagination.page === 1);
  }

  // get by id
  {
    const { res, json } = await api(`/api/posts/${ids[0]}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    assert('Get by id → 200', res.status === 200 && json?.data?.post?.id === ids[0]);
    assert('Get by id has author', json.data.post.author?.email === email);
  }

  // invalid id
  {
    const { res, json } = await api('/api/posts/not-an-objectid');
    assert('Invalid id → 400', res.status === 400 && json?.success === false);
  }

  // missing id
  {
    const fake = new mongoose.Types.ObjectId().toString();
    const { res, json } = await api(`/api/posts/${fake}`);
    assert('Missing post → 404', res.status === 404 && json?.success === false);
  }

  // cleanup
  await Post.deleteMany({ _id: { $in: ids } });
  await User.deleteOne({ email });
  await mongoose.disconnect();

  if (process.exitCode) {
    console.log('\nPhase 3 smoke FAILED\n');
    process.exit(1);
  }
  console.log('\nPhase 3 smoke PASSED\n');
}

main().catch(async (err) => {
  console.error('Smoke runner error:', err.message || err);
  try {
    await User.deleteOne({ email });
    await Post.deleteMany({ 'author': (await User.findOne({ email }))?._id });
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
