import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { pathToFileURL } from 'url';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import postRoutes from './routes/post.routes.js';
import commentRoutes from './routes/comment.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware.js';

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.clientUrl,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.use('/api', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/posts', postRoutes);
  app.use('/api/comments', commentRoutes);
  app.use('/api/admin', adminRoutes);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}

export async function startServer() {
  await connectDB();
  const app = createApp();
  return app.listen(env.port, () => {
    console.log(`Server listening on http://localhost:${env.port} [${env.nodeEnv}]`);
    console.log(`CORS origin: ${env.clientUrl}`);
  });
}

const isDirectRun =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectRun) {
  startServer()
    .then((httpServer) => {
      function shutdown(signal) {
        console.log(`\n[server] ${signal} received — shutting down`);
        httpServer.close(() => {
          console.log('[server] HTTP server closed');
          process.exit(0);
        });
        // Force exit after 10 seconds if connections linger
        setTimeout(() => {
          console.error('[server] Graceful shutdown timed out — forcing exit');
          process.exit(1);
        }, 10_000).unref();
      }
      process.on('SIGTERM', () => shutdown('SIGTERM'));
      process.on('SIGINT', () => shutdown('SIGINT'));
    })
    .catch((err) => {
      console.error('Failed to start server:', err.message || err);
      process.exit(1);
    });
}
