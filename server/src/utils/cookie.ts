import { CookieOptions, Response } from 'express';
import { config } from '../config';

export const AUTH_COOKIE = 'token';

const baseOptions: CookieOptions = {
  httpOnly: true,
  secure: config.isProduction,
  sameSite: config.isProduction ? 'none' : 'lax',
  path: '/',
};

/** Set the HTTP-only auth cookie holding the JWT (7-day lifetime). */
export const setAuthCookie = (res: Response, token: string): void => {
  res.cookie(AUTH_COOKIE, token, {
    ...baseOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

/** Clear the auth cookie on logout (options must match those used to set it). */
export const clearAuthCookie = (res: Response): void => {
  res.clearCookie(AUTH_COOKIE, baseOptions);
};
