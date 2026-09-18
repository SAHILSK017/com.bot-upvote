/**
 * Feature Request & Public Roadmap Portal - Database Seed Script
 *
 * Seeds:
 *  - 1 Admin: admin@gmail.com (admin@123)
 *  - 5 Users: sahil@gmail.com, pratik@gmail.com, vicky@gmail.com, kuldeep@gmail.com, rahul@gmail.com (12345)
 *  - 5 Feature Requests across UI/UX, Integrations, Performance
 *  - Realistic votes (voteCount strictly synced to votedBy)
 *  - Realistic top-level comments & threaded replies (commentCount strictly synced)
 *
 * Idempotent:
 *   Safe to run multiple times. Removes prior seed accounts & their posts/comments
 *   before recreating them freshly. Does not affect unrelated application data.
 *
 * Usage:
 *   node scripts/seed.js
 *   node scripts/seed.js --reset
 *   npm run seed
 */
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Post } from '../models/Post.js';
import { Comment } from '../models/Comment.js';
import {
  POST_CATEGORIES,
  POST_STATUSES,
  USER_ROLES,
} from '../utils/constants.js';

const BCRYPT_ROUNDS = 12;

// All deterministic seed emails (including legacy seed emails for clean migration)
const SEED_EMAILS = [
  'admin@gmail.com',
  'sahil@gmail.com',
  'pratik@gmail.com',
  'vicky@gmail.com',
  'kuldeep@gmail.com',
  'rahul@gmail.com',
  // legacy demo emails
  'admin@seed.local',
  'alex@seed.local',
  'jordan@seed.local',
  'sam@seed.local',
];

const SEED_POST_TITLES = [
  'Dark Mode Support',
  'Google Authentication',
  'Faster Feature Search',
  'Email Notifications',
  'Mobile Friendly Dashboard',
];

const usersSpec = [
  {
    name: 'Admin',
    email: 'admin@gmail.com',
    password: 'Admin@1234',
    role: USER_ROLES.ADMIN,
  },
  {
    name: 'Sahil',
    email: 'sahil@gmail.com',
    password: 'Demo@1234',
    role: USER_ROLES.USER,
  },
  {
    name: 'Pratik',
    email: 'pratik@gmail.com',
    password: 'Demo@1234',
    role: USER_ROLES.USER,
  },
  {
    name: 'Vicky',
    email: 'vicky@gmail.com',
    password: 'Demo@1234',
    role: USER_ROLES.USER,
  },
  {
    name: 'Kuldeep',
    email: 'kuldeep@gmail.com',
    password: 'Demo@1234',
    role: USER_ROLES.USER,
  },
  {
    name: 'Rahul',
    email: 'rahul@gmail.com',
    password: 'Demo@1234',
    role: USER_ROLES.USER,
  },
];

/**
 * Idempotently cleans up prior seed data without touching unrelated records.
 */
async function cleanupSeedData() {
  console.log('Cleaning up previous seed records (idempotent run)...');

  // 1. Locate existing seed users by email
  const existingUsers = await User.find({
    email: { $in: SEED_EMAILS },
  }).select('_id');
  const userIds = existingUsers.map((u) => u._id);

  // 2. Locate existing seed posts either authored by seed users or matching titles
  const existingPosts = await Post.find({
    $or: [{ author: { $in: userIds } }, { title: { $in: SEED_POST_TITLES } }],
  }).select('_id');
  const postIds = existingPosts.map((p) => p._id);

  // 3. Remove comments on seed posts or written by seed users
  const deleteCommentsResult = await Comment.deleteMany({
    $or: [{ author: { $in: userIds } }, { post: { $in: postIds } }],
  });

  // 4. Remove seed posts
  const deletePostsResult = await Post.deleteMany({
    $or: [{ _id: { $in: postIds } }, { author: { $in: userIds } }],
  });

  // 5. Remove seed users from votes on any remaining unrelated posts
  if (userIds.length > 0) {
    await Post.updateMany({}, { $pull: { votedBy: { $in: userIds } } });
    const remainingPosts = await Post.find({}).select('votedBy');
    await Promise.all(
      remainingPosts.map((p) =>
        Post.updateOne({ _id: p._id }, { $set: { voteCount: p.votedBy.length } })
      )
    );
  }

  // 6. Delete the seed users
  const deleteUsersResult = await User.deleteMany({
    $or: [{ _id: { $in: userIds } }, { email: { $in: SEED_EMAILS } }],
  });

  console.log(
    `Cleaned up: ${deleteUsersResult.deletedCount} users, ${deletePostsResult.deletedCount} posts, ${deleteCommentsResult.deletedCount} comments.\n`
  );
}

/**
 * Creates seed users with hashed passwords and verified status.
 * @returns {Promise<Record<string, import('mongoose').Document>>}
 */
async function createUsers() {
  /** @type {Record<string, import('mongoose').Document>} */
  const userMap = {};

  for (const spec of usersSpec) {
    const passwordHash = await bcrypt.hash(spec.password, BCRYPT_ROUNDS);
    const user = await User.create({
      name: spec.name,
      email: spec.email,
      passwordHash,
      role: spec.role,
      isVerified: true,
    });
    userMap[spec.name.toLowerCase()] = user;
    console.log(`  [user] ${spec.name.padEnd(8)} <${spec.email}> (${spec.role})`);
  }

  return userMap;
}

/**
 * Creates the 5 feature requests with specified metadata, categories, statuses, and spaced timestamps.
 * @param {Record<string, import('mongoose').Document>} users
 * @returns {Promise<Record<string, import('mongoose').Document>>}
 */
async function createPosts(users) {
  const { sahil, pratik, vicky, kuldeep } = users;
  const now = Date.now();

  const postsSpec = [
    {
      key: 'dark_mode',
      title: 'Dark Mode Support',
      description:
        'Add a system-aware dark mode and allow users to switch between light and dark themes. The selected theme should remain consistent across the application.',
      category: POST_CATEGORIES.UI_UX,
      status: POST_STATUSES.UNDER_REVIEW,
      author: sahil,
      voters: [sahil, pratik, vicky, kuldeep],
      createdAt: new Date(now - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    },
    {
      key: 'google_auth',
      title: 'Google Authentication',
      description:
        'Allow users to sign in and create an account using their Google account for a faster onboarding experience.',
      category: POST_CATEGORIES.INTEGRATIONS,
      status: POST_STATUSES.PLANNED,
      author: pratik,
      voters: [sahil, vicky, kuldeep],
      createdAt: new Date(now - 4 * 24 * 60 * 60 * 1000), // 4 days ago
    },
    {
      key: 'faster_search',
      title: 'Faster Feature Search',
      description:
        'Improve feature request search performance and provide instant suggestions while users search through feature requests.',
      category: POST_CATEGORIES.PERFORMANCE,
      status: POST_STATUSES.IN_PROGRESS,
      author: vicky,
      voters: [sahil, pratik, kuldeep],
      createdAt: new Date(now - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    },
    {
      key: 'email_notifications',
      title: 'Email Notifications',
      description:
        'Notify users when a feature they voted for changes status or receives an important update.',
      category: POST_CATEGORIES.INTEGRATIONS,
      status: POST_STATUSES.PLANNED,
      author: kuldeep,
      voters: [pratik, vicky],
      createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    },
    {
      key: 'mobile_dashboard',
      title: 'Mobile Friendly Dashboard',
      description:
        'Improve the feature request dashboard experience for mobile and tablet users with better navigation, responsive cards, and easier filtering.',
      category: POST_CATEGORIES.UI_UX,
      status: POST_STATUSES.COMPLETED,
      author: sahil,
      voters: [sahil, pratik, vicky, kuldeep],
      createdAt: new Date(now - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    },
  ];

  /** @type {Record<string, import('mongoose').Document>} */
  const postMap = {};

  for (const spec of postsSpec) {
    // Ensure uniqueness of voter IDs
    const uniqueVoterIds = [...new Set(spec.voters.map((u) => u._id.toString()))].map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    const post = await Post.create({
      title: spec.title,
      description: spec.description,
      category: spec.category,
      status: spec.status,
      author: spec.author._id,
      votedBy: uniqueVoterIds,
      voteCount: uniqueVoterIds.length,
      commentCount: 0,
      createdAt: spec.createdAt,
      updatedAt: spec.createdAt,
    });

    postMap[spec.key] = post;
    console.log(
      `  [post] [${spec.status}] "${spec.title}" (Author: ${spec.author.name}, Votes: ${uniqueVoterIds.length})`
    );
  }

  return postMap;
}

/**
 * Creates threaded comments and replies, and updates post commentCount accurately.
 * @param {Record<string, import('mongoose').Document>} users
 * @param {Record<string, import('mongoose').Document>} posts
 */
async function createComments(users, posts) {
  const { sahil, pratik, vicky, kuldeep, rahul } = users;
  let totalComments = 0;
  let totalReplies = 0;

  const threads = [
    {
      post: posts.dark_mode,
      threads: [
        {
          author: sahil,
          content: 'Dark mode would make the dashboard much more comfortable to use at night.',
          replies: [
            {
              author: pratik,
              content: 'Agreed. It would also be useful for people working late.',
            },
            {
              author: vicky,
              content: 'System-based theme detection would make this even better.',
            },
          ],
        },
        {
          author: pratik,
          content: 'It would be great if the theme could automatically follow the system preference.',
          replies: [],
        },
        {
          author: vicky,
          content: "Please also save the user's theme preference so they don't have to change it every time.",
          replies: [],
        },
      ],
    },
    {
      post: posts.google_auth,
      threads: [
        {
          author: sahil,
          content: 'Google login would make onboarding much faster.',
          replies: [
            {
              author: rahul,
              content: 'Yes, quick sign-in reduces registration friction significantly.',
            },
          ],
        },
        {
          author: kuldeep,
          content: "This would be useful for users who don't want to create another password.",
          replies: [],
        },
        {
          author: vicky,
          content: 'Please make sure existing email and password login continues to work.',
          replies: [],
        },
      ],
    },
    {
      post: posts.faster_search,
      threads: [
        {
          author: pratik,
          content: 'Search becomes difficult when there are many feature requests.',
          replies: [
            {
              author: vicky,
              content: 'Debouncing the search input will keep it feeling very snappy.',
            },
          ],
        },
        {
          author: sahil,
          content: 'Instant suggestions would make finding existing requests much easier.',
          replies: [],
        },
        {
          author: kuldeep,
          content: 'Filtering by category together with search would be useful too.',
          replies: [],
        },
      ],
    },
    {
      post: posts.email_notifications,
      threads: [
        {
          author: vicky,
          content: "I'd like to know when a feature I voted for moves to In Progress.",
          replies: [
            {
              author: kuldeep,
              content: 'Agreed, user notification preferences in settings would be ideal.',
            },
          ],
        },
        {
          author: sahil,
          content: 'Status-change notifications would be really useful.',
          replies: [],
        },
        {
          author: pratik,
          content: 'Notifications should be optional so users can disable them.',
          replies: [],
        },
      ],
    },
    {
      post: posts.mobile_dashboard,
      threads: [
        {
          author: kuldeep,
          content: 'The mobile experience should be easier to navigate.',
          replies: [
            {
              author: pratik,
              content: 'A collapsible bottom sheet for filters works really well on phones.',
            },
          ],
        },
        {
          author: vicky,
          content: 'A responsive request card layout would help a lot.',
          replies: [],
        },
        {
          author: sahil,
          content: 'Please also make the filters easier to use on smaller screens.',
          replies: [],
        },
      ],
    },
  ];

  for (const item of threads) {
    let postCommentCount = 0;

    for (const t of item.threads) {
      const parentComment = await Comment.create({
        post: item.post._id,
        author: t.author._id,
        content: t.content,
        parentComment: null,
      });
      postCommentCount += 1;
      totalComments += 1;

      for (const rep of t.replies) {
        await Comment.create({
          post: item.post._id,
          author: rep.author._id,
          content: rep.content,
          parentComment: parentComment._id,
        });
        postCommentCount += 1;
        totalComments += 1;
        totalReplies += 1;
      }
    }

    await Post.findByIdAndUpdate(item.post._id, {
      $set: { commentCount: postCommentCount },
    });
    console.log(
      `  [comments] "${item.post.title}": ${postCommentCount} comments/replies recorded`
    );
  }

  return { totalComments, totalReplies };
}

/**
 * Validates seeded records, authentication, roles, and constraints.
 */
async function verifySeed() {
  console.log('\n--- VERIFYING SEEDED DATABASE ---');

  // Verify Admin
  const admin = await User.findOne({ email: 'admin@gmail.com' }).select('+passwordHash');
  if (!admin) throw new Error('Admin user was not found!');
  const adminAuthPass = await bcrypt.compare('Admin@1234', admin.passwordHash);
  const adminRolePass = admin.role === USER_ROLES.ADMIN;
  console.log(`Admin user: ${admin.email} (Role: ${admin.role}) -> Auth: ${adminAuthPass ? 'PASS' : 'FAIL'}, Role: ${adminRolePass ? 'PASS' : 'FAIL'}`);

  // Verify Users
  let usersAuthPass = true;
  for (const userSpec of usersSpec.filter((u) => u.role === USER_ROLES.USER)) {
    const userDoc = await User.findOne({ email: userSpec.email }).select('+passwordHash');
    if (!userDoc) throw new Error(`User ${userSpec.email} was not found!`);
    const match = await bcrypt.compare(userSpec.password, userDoc.passwordHash);
    if (!match || userDoc.role !== USER_ROLES.USER) {
      usersAuthPass = false;
      console.error(`User auth failed for ${userSpec.email}`);
    }
  }
  console.log(`User accounts auth (Sahil, Pratik, Vicky, Kuldeep, Rahul): ${usersAuthPass ? 'PASS' : 'FAIL'}`);

  // Verify Posts
  const posts = await Post.find({ title: { $in: SEED_POST_TITLES } });
  console.log(`Feature requests count: ${posts.length} / 5`);

  let totalVotes = 0;
  for (const post of posts) {
    totalVotes += post.voteCount;
    if (post.voteCount !== post.votedBy.length) {
      throw new Error(`Mismatch in voteCount for post "${post.title}": ${post.voteCount} != ${post.votedBy.length}`);
    }
    const actualComments = await Comment.countDocuments({ post: post._id });
    if (post.commentCount !== actualComments) {
      throw new Error(`Mismatch in commentCount for post "${post.title}": ${post.commentCount} != ${actualComments}`);
    }
  }
  console.log(`Total votes verified: ${totalVotes}`);

  const totalComments = await Comment.countDocuments({
    post: { $in: posts.map((p) => p._id) },
  });
  const totalReplies = await Comment.countDocuments({
    post: { $in: posts.map((p) => p._id) },
    parentComment: { $ne: null },
  });
  console.log(`Total comments: ${totalComments}, Total replies: ${totalReplies}`);

  return {
    adminLogin: adminAuthPass && adminRolePass ? 'PASS' : 'FAIL',
    userLogin: usersAuthPass ? 'PASS' : 'FAIL',
    totalVotes,
    totalComments,
    totalReplies,
  };
}

async function main() {
  console.log('\n=============================================');
  console.log(' SEEDING FEATURE REQUEST & ROADMAP PORTAL');
  console.log('=============================================\n');

  await connectDB();

  // Always perform idempotent cleanup of existing seed records
  await cleanupSeedData();

  console.log('Creating Seed Users:');
  const users = await createUsers();

  console.log('\nCreating Feature Requests:');
  const posts = await createPosts(users);

  console.log('\nCreating Comments & Threaded Discussions:');
  await createComments(users, posts);

  const verification = await verifySeed();

  console.log('\n=============================================');
  console.log(' SEED COMPLETE & VERIFIED');
  console.log('=============================================');
  console.log(`Admin Account:  admin@gmail.com / Admin@1234 [ADMIN]`);
  console.log(`User Accounts:   Demo@1234 (Sahil, Pratik, Vicky, Kuldeep, Rahul) [USER]`);
  console.log(`Total Votes:    ${verification.totalVotes}`);
  console.log(`Total Comments: ${verification.totalComments}`);
  console.log(`Total Replies:  ${verification.totalReplies}`);
  console.log(`Admin Login:    ${verification.adminLogin}`);
  console.log(`User Login:     ${verification.userLogin}`);
  console.log('=============================================\n');

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('\n[Seed Failed]:', err);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
