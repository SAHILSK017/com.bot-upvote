/**
 * Seeded demo accounts for local evaluation (see `npm run seed`).
 * Passwords meet the 8-character minimum required by the API.
 */
export const DEMO_ACCOUNTS = [
  {
    role: 'Admin',
    name: 'Admin',
    email: 'admin@gmail.com',
    password: 'Admin@1234',
    description: 'Admin panel + status changes',
  },
  {
    role: 'User',
    name: 'Sahil',
    email: 'sahil@gmail.com',
    password: 'Demo@1234',
    description: 'Submit, vote, and comment',
  },
] as const;

// Backward-compatible default password export
export const DEMO_PASSWORD = 'Demo@1234';
