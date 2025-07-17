import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { validateRequest } from '../middleware/validation';
import databaseService from '../services/databaseService';
import calendarService from '../services/calendarService';
import contactService from '../services/contactService';
import { logger } from '../utils/logger';

const router = Router();

// User registration
router.post('/register',
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('name').isString().notEmpty().withMessage('Name is required'),
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, name } = req.body;

      // Check if user already exists
      const existingUser = await databaseService.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'User already exists',
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // TODO: Store hashed password in database
      // For now, we'll store it in a separate auth table

      // Create user
      const user = await databaseService.saveUser({
        id: uuidv4(),
        email,
        name,
        preferences: {
          timezone: 'UTC',
          workingHours: { start: '09:00', end: '17:00' },
          defaultReminderMinutes: 15,
          language: 'en',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Generate JWT
      const token = jwt.sign(
        { id: user.id, email: user.email },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
      );

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// User login
router.post('/login',
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await databaseService.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
        });
      }

      // Verify password
      // TODO: Implement password verification once we have password storage
      // const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      // if (!isValidPassword) {
      //   return res.status(401).json({
      //     success: false,
      //     error: 'Invalid credentials',
      //   });
      // }
      
      // For now, just check if password is not empty (temporary)
      if (!password) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
        });
      }

      // Generate JWT
      const token = jwt.sign(
        { id: user.id, email: user.email },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
      );

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Refresh token
router.post('/refresh',
  body('token').notEmpty().withMessage('Token is required'),
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.body;

      // Verify existing token
      const decoded = jwt.verify(token, config.jwt.secret) as any;

      // Generate new token
      const newToken = jwt.sign(
        { id: decoded.id, email: decoded.email },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
      );

      res.json({
        success: true,
        data: {
          token: newToken,
        },
      });
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({
          success: false,
          error: 'Invalid token',
        });
      }
      next(error);
    }
  }
);

// Logout (optional - mainly for token blacklisting if implemented)
router.post('/logout',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // TODO: Implement token blacklisting if needed
      
      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// Password reset request
router.post('/password-reset',
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;

      // TODO: Implement password reset logic
      // - Generate reset token
      // - Send email with reset link
      
      res.json({
        success: true,
        message: 'Password reset instructions sent to your email',
      });
    } catch (error) {
      next(error);
    }
  }
);

// Confirm password reset
router.post('/password-reset/confirm',
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, password } = req.body;

      // TODO: Implement password reset confirmation
      // - Verify reset token
      // - Update user password
      
      res.json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// Google OAuth2 - Get authorization URL
router.get('/google',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUrl = calendarService.getAuthUrl();
      
      res.json({
        success: true,
        data: {
          authUrl,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Google OAuth2 - Handle callback
router.get('/google/callback',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code, error: authError } = req.query;

      if (authError) {
        return res.status(401).json({
          success: false,
          error: 'Authorization denied',
        });
      }

      if (!code || typeof code !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Authorization code is required',
        });
      }

      // Exchange code for tokens
      const tokens = await calendarService.getTokens(code);

      // Store tokens in session or database
      if (req.session) {
        req.session.googleTokens = tokens;
      }

      // Get user info from Google
      calendarService.setCredentials(tokens);
      
      // TODO: Fetch user profile from Google and create/update user in database
      // For now, we'll assume the user is authenticated
      
      // Redirect to frontend with success
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/success`);
    } catch (error) {
      logger.error('Google OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/error`);
    }
  }
);

// Google OAuth2 - Exchange tokens (for mobile/desktop apps)
router.post('/google/token',
  body('code').notEmpty().withMessage('Authorization code is required'),
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = req.body;

      // Exchange code for tokens
      const tokens = await calendarService.getTokens(code);

      // TODO: Create or update user in database
      // For now, return tokens directly
      
      res.json({
        success: true,
        data: {
          tokens,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Sync Google Calendar
router.post('/google/sync-calendar',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get user ID from JWT token
      const userId = (req as any).userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      // Get Google tokens from session or database
      const tokens = req.session?.googleTokens;
      
      if (!tokens) {
        return res.status(401).json({
          success: false,
          error: 'Google account not connected',
        });
      }

      // Set credentials and sync
      calendarService.setCredentials(tokens);
      const syncedCount = await calendarService.syncFromGoogle(userId);

      res.json({
        success: true,
        data: {
          syncedEvents: syncedCount,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Sync Google Contacts
router.post('/google/sync-contacts',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get user ID from JWT token
      const userId = (req as any).userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      // Get Google tokens from session or database
      const tokens = req.session?.googleTokens;
      
      if (!tokens) {
        return res.status(401).json({
          success: false,
          error: 'Google account not connected',
        });
      }

      // Set credentials and sync
      contactService.setCredentials(tokens);
      const importedCount = await contactService.importFromGoogle(userId);

      res.json({
        success: true,
        data: {
          importedContacts: importedCount,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;