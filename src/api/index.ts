import { Router } from 'express';
import calendarRouter from './calendar';
import contactsRouter from './contacts';
import authRouter from './auth';
import healthRouter from './health';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Health check endpoints (no auth required)
router.use('/health', healthRouter);

// Authentication endpoints
router.use('/auth', authRouter);

// Protected routes (require authentication)
router.use('/calendar', authMiddleware, calendarRouter);
router.use('/contacts', authMiddleware, contactsRouter);

// Catch-all for undefined routes
router.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
  });
});

export default router;