import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { clearAuthCookie, setAuthCookie } from '../../utils/cookie';
import { sendResponse } from '../../utils/sendResponse';
import { authService } from './auth.service';

/** POST /api/auth/register — create an account, set the auth cookie, return the user. */
const register = catchAsync(async (req: Request, res: Response) => {
  const { user, token } = await authService.register(req.body);
  setAuthCookie(res, token);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Registration successful',
    data: user,
  });
});

/** POST /api/auth/login — verify credentials, set the auth cookie, return the user. */
const login = catchAsync(async (req: Request, res: Response) => {
  const { user, token } = await authService.login(req.body);
  setAuthCookie(res, token);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Login successful',
    data: user,
  });
});

/** POST /api/auth/logout — clear the auth cookie. */
const logout = catchAsync(async (_req: Request, res: Response) => {
  clearAuthCookie(res);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Logged out',
    data: null,
  });
});

/** GET /api/auth/me — return the authenticated user. */
const me = catchAsync(async (req: Request, res: Response) => {
  const user = await authService.getCurrentUser(req.user!.userId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Current user',
    data: user,
  });
});

export const authController = {
  register,
  login,
  logout,
  me,
};
