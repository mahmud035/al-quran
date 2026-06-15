import { ErrorRequestHandler } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { config } from '../config';
import { AppError } from '../utils/AppError';

/**
 * Centralised error handler. Normalises Zod, Mongoose, and known duplicate-key
 * errors into the standard envelope: { statusCode, success, message, data }.
 */
export const globalErrorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let statusCode = 500;
  let message = 'Internal server error';
  let data: unknown = null;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation failed';
    data = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
  } else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = err.message;
  } else if (typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000) {
    statusCode = 409;
    message = 'Duplicate resource';
  } else if (err instanceof Error) {
    message = err.message;
  }

  if (!config.isProduction && statusCode === 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    statusCode,
    success: false,
    message,
    data,
  });
};
