import { NextFunction, Request, RequestHandler, Response } from 'express';

/** Wrap an async controller so rejected promises flow to the global error handler. */
export const catchAsync = (fn: RequestHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
