import mongoose from 'mongoose';
import { env } from './env.js';

/**
 * Connects Mongoose to MongoDB using MONGO_URI.
 * @returns {Promise<typeof mongoose>}
 */
export async function connectDB() {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('disconnected', () => {
    console.warn('[db] MongoDB disconnected — Mongoose will attempt to reconnect');
  });
  mongoose.connection.on('error', (err) => {
    console.error('[db] MongoDB connection error:', err.message);
  });

  await mongoose.connect(env.mongoUri);
  console.log(`[db] MongoDB connected: ${mongoose.connection.name}`);
  return mongoose;
}
