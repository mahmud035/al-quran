import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { progressService } from './progress.service';

/** GET /api/progress — coverage, khatmah percentage, display streak, and last-read. */
const get = catchAsync(async (req: Request, res: Response) => {
  const timezone = typeof req.query.timezone === 'string' ? req.query.timezone : undefined;
  const data = await progressService.getProgress(req.user!.userId, timezone);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Progress fetched',
    data,
  });
});

/** POST /api/progress/ayahs — record a batch of ayahs as read. */
const recordAyahs = catchAsync(async (req: Request, res: Response) => {
  const data = await progressService.recordAyahs(req.user!.userId, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Reading recorded',
    data,
  });
});

/** PUT /api/progress/last-read — set where the user resumes reading. */
const setLastRead = catchAsync(async (req: Request, res: Response) => {
  const data = await progressService.setLastRead(req.user!.userId, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Last read updated',
    data,
  });
});

export const progressController = {
  get,
  recordAyahs,
  setLastRead,
};
