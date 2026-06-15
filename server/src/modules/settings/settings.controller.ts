import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { settingsService } from './settings.service';

/** GET /api/settings — return the user's settings (auto-created with defaults). */
const get = catchAsync(async (req: Request, res: Response) => {
  const data = await settingsService.get(req.user!.userId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Settings fetched',
    data,
  });
});

/** PUT /api/settings — update the user's settings. */
const update = catchAsync(async (req: Request, res: Response) => {
  const data = await settingsService.update(req.user!.userId, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Settings updated',
    data,
  });
});

export const settingsController = {
  get,
  update,
};
