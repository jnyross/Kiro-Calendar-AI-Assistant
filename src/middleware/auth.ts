import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';
import databaseService from '../services/databaseService';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

/**
 * Authentication middleware to verify JWT tokens
 */
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(401).json({
        success: false,
        error: 'No authorization header provided',
      });
      return;
    }

    // Check if header follows Bearer token format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({
        success: false,
        error: 'Invalid authorization header format',
      });
      return;
    }

    const token = parts[1];

    try {
      // Verify token
      const decoded = jwt.verify(token, config.jwt.secret) as {
        id: string;
        email: string;
        exp: number;
        iat: number;
      };

      // Check if user still exists
      const user = await databaseService.findUserById(decoded.id);
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      // Attach user to request
      req.user = {
        id: decoded.id,
        email: decoded.email,
      };

      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          success: false,
          error: 'Token expired',
        });
        return;
      }
      
      if (error instanceof jwt.JsonWebTokenError) {
        res.status(401).json({
          success: false,
          error: 'Invalid token',
        });
        return;
      }

      throw error;
    }
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token provided
 */
export const optionalAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      // No token provided, continue without user
      next();
      return;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      // Invalid format, continue without user
      next();
      return;
    }

    const token = parts[1];

    try {
      const decoded = jwt.verify(token, config.jwt.secret) as {
        id: string;
        email: string;
      };

      // Attach user to request if token is valid
      req.user = {
        id: decoded.id,
        email: decoded.email,
      };
    } catch (error) {
      // Token invalid, continue without user
      logger.debug('Optional auth: Invalid token provided');
    }

    next();
  } catch (error) {
    logger.error('Optional authentication error:', error);
    next();
  }
};

/**
 * Role-based access control middleware
 */
export const requireRole = (roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      // TODO: Implement role checking logic
      // const user = await databaseService.findUserById(req.user.id);
      // if (!user || !roles.includes(user.role)) {
      //   res.status(403).json({
      //     success: false,
      //     error: 'Insufficient permissions',
      //   });
      //   return;
      // }

      next();
    } catch (error) {
      logger.error('Role authorization error:', error);
      res.status(500).json({
        success: false,
        error: 'Authorization failed',
      });
    }
  };
};