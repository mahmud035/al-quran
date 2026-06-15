import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import { AUTH_COOKIE } from '../utils/cookie';
import { verifyToken } from '../utils/jwt';

/**
 * Guard for authenticated routes: verifies the JWT auth cookie and attaches
 * { userId } to req.user. Rejects with 401 when the cookie is missing or invalid.
 */
export const auth = (req: Request, _res: Response, next: NextFunction): void => {
  const token = req.cookies?.[AUTH_COOKIE];
  if (!token) {
    return next(new AppError(401, 'Not authenticated'));
  }

  try {
    const payload = verifyToken(token);
    req.user = { userId: payload.userId };
    next();
  } catch {
    next(new AppError(401, 'Invalid or expired session'));
  }
};
