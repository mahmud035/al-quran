import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { bookmarksService } from './bookmarks.service';

/** GET /api/bookmarks — list the authenticated user's bookmarks. */
const list = catchAsync(async (req: Request, res: Response) => {
  const data = await bookmarksService.list(req.user!.userId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Bookmarks fetched',
    data,
  });
});

/** POST /api/bookmarks — create a bookmark for the authenticated user. */
const create = catchAsync(async (req: Request, res: Response) => {
  const data = await bookmarksService.create(req.user!.userId, req.body);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Bookmark created',
    data,
  });
});

/** DELETE /api/bookmarks/:id — remove one of the user's bookmarks. */
const remove = catchAsync(async (req: Request, res: Response) => {
  await bookmarksService.remove(req.user!.userId, req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Bookmark removed',
    data: null,
  });
});

/** GET /api/bookmarks/check?surah=&ayah= — toggle state for the reader. */
const check = catchAsync(async (req: Request, res: Response) => {
  const surah = Number(req.query.surah);
  const ayah = Number(req.query.ayah);
  const data = await bookmarksService.check(req.user!.userId, surah, ayah);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Bookmark status',
    data,
  });
});

export const bookmarksController = {
  list,
  create,
  remove,
  check,
};
