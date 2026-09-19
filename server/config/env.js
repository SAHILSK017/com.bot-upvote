import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load root .env (monorepo), then optional server/.env overrides.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const REQUIRED_ENV = ['MONGO_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'CLIENT_URL'];

/**
 * Validates required environment variables and returns a typed env object.
 * Fails fast at startup if anything required is missing.
 * @returns {{
 *   port: number,
 *   mongoUri: string,
 *   jwtAccessSecret: string,
 *   jwtRefreshSecret: string,
 *   clientUrl: string,
 *   nodeEnv: string,
 *   isProd: boolean
 * }}
 */
export function loadEnv() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `Missing required env vars: ${missing.join(', ')}. Copy .env.example to .env and fill values.`
    );
  }

  const clientUrl = process.env.CLIENT_URL.trim().replace(/\/$/, '');
  const isCloudHost = Boolean(
    process.env.RENDER ||
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.VERCEL ||
    process.env.HEROKU ||
    process.env.NODE_ENV === 'production' ||
    clientUrl.includes('https://')
  );

  const nodeEnv = process.env.NODE_ENV || (isCloudHost ? 'production' : 'development');

  return {
    port: Number(process.env.PORT) || 5000,
    mongoUri: process.env.MONGO_URI.trim(),
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET.trim(),
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET.trim(),
    clientUrl,
    nodeEnv,
    isProd: isCloudHost || nodeEnv === 'production',
  };
}

export const env = loadEnv();
