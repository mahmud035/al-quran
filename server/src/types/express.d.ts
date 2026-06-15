import 'express';

declare global {
  namespace Express {
    interface Request {
      /** Populated by the auth middleware after a valid JWT cookie is verified. */
      user?: {
        userId: string;
      };
    }
  }
}

export {};
