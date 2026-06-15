import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Request, Response } from 'express';
import { config } from './config';
import { globalErrorHandler } from './middlewares/globalErrorHandler';
import { authRoutes } from './modules/auth/auth.route';
import { bookmarksRoutes } from './modules/bookmarks/bookmarks.route';
import { settingsRoutes } from './modules/settings/settings.route';

const app = express();

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
  res.json({ statusCode: 200, success: true, message: 'OK', data: { uptime: process.uptime() } });
});

app.use('/api/auth', authRoutes);
app.use('/api/bookmarks', bookmarksRoutes);
app.use('/api/settings', settingsRoutes);

// 404 for unmatched API routes.
app.use((_req: Request, res: Response) => {
  res.status(404).json({ statusCode: 404, success: false, message: 'Route not found', data: null });
});

app.use(globalErrorHandler);

export default app;
