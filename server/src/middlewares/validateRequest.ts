import { NextFunction, Request, Response } from 'express';
import { AnyZodObject } from 'zod';
import { catchAsync } from '../utils/catchAsync';

/**
 * Validate request body and query against a Zod schema before the controller runs.
 * The schema is shaped as z.object({ body: ..., query: ... }); parsed values
 * replace the originals so controllers receive coerced, typed input.
 */
export const validateRequest = (schema: AnyZodObject) =>
  catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
    const parsed = await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (parsed.body !== undefined) req.body = parsed.body;
    if (parsed.query !== undefined) {
      Object.assign(req.query, parsed.query);
    }
    next();
  });
