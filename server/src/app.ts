import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Request, Response } from 'express';
import { config } from './config';
import { globalErrorHandler } from './middlewares/globalErrorHandler';
import { authRoutes } from './modules/auth/auth.route';
import { bookmarksRoutes } from './modules/bookmarks/bookmarks.route';
import { progressRoutes } from './modules/progress/progress.route';
import { settingsRoutes } from './modules/settings/settings.route';

const app = express();

// Behind cloudflared → Traefik in production. Trust one proxy hop so req.ip / req.protocol
// reflect the real client via X-Forwarded-*. NOT required for the Secure cookie (that's an
// explicit boolean) — but correct behind a reverse proxy, and load-bearing the moment you
// add rate-limiting (express-rate-limit would otherwise see Traefik's IP and throttle
// everyone as one client) or real client-IP logging.
if (config.isProduction) {
  app.set('trust proxy', 1);
}

app.use(
  cors({
    origin: config.clientOrigin,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

// Health check (the AlQuran.cloud root is intentionally not probed here).
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    statusCode: 200,
    success: true,
    message: 'OK',
    data: { uptime: process.uptime() },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/bookmarks', bookmarksRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/settings', settingsRoutes);

// 404 for unmatched API routes.
app.use((_req: Request, res: Response) => {
  res
    .status(404)
    .json({
      statusCode: 404,
      success: false,
      message: 'Route not found',
      data: null,
    });
});

app.use(globalErrorHandler);

export default app;
