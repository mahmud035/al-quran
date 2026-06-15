import { Response } from 'express';

interface ResponsePayload<T> {
  statusCode: number;
  success: boolean;
  message: string;
  data: T;
}

/** Standard response envelope used by every endpoint: { statusCode, success, message, data }. */
export const sendResponse = <T>(res: Response, payload: ResponsePayload<T>): void => {
  res.status(payload.statusCode).json({
    statusCode: payload.statusCode,
    success: payload.success,
    message: payload.message,
    data: payload.data,
  });
};
