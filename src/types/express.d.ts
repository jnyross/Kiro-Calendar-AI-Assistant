import 'express-session';

declare module 'express-session' {
  interface SessionData {
    googleTokens?: any;
    userId?: string;
  }
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: {
        id: string;
        email: string;
        name: string;
      };
    }
  }
}

export {};