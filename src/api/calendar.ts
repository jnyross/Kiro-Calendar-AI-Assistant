import { Router, Request, Response, NextFunction } from 'express';
import { body, query, param } from 'express-validator';
import calendarService from '../services/calendarService';
import nlpService from '../services/nlpService';
import { validateRequest } from '../middleware/validation';
import { logger } from '../utils/logger';

const router = Router();

// Parse natural language calendar command
router.post('/parse',
  body('command').isString().notEmpty().withMessage('Command is required'),
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { command } = req.body;
      const userId = (req as any).user.id;

      const parsedCommand = await nlpService.parseCommand(command);
      
      res.json({
        success: true,
        data: parsedCommand,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Create a new event
router.post('/events',
  body('title').isString().notEmpty().withMessage('Title is required'),
  body('startTime').isISO8601().withMessage('Valid start time is required'),
  body('endTime').isISO8601().withMessage('Valid end time is required'),
  body('location').optional().isString(),
  body('description').optional().isString(),
  body('attendees').optional().isArray(),
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const eventData = { ...req.body, userId };

      const event = await calendarService.createEvent(eventData);
      
      res.status(201).json({
        success: true,
        data: event,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get events for a date range
router.get('/events',
  query('startDate').isISO8601().withMessage('Valid start date is required'),
  query('endDate').isISO8601().withMessage('Valid end date is required'),
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const { startDate, endDate } = req.query;

      const events = await calendarService.getEvents(
        userId,
        new Date(startDate as string),
        new Date(endDate as string)
      );
      
      res.json({
        success: true,
        data: events,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update an event
router.put('/events/:eventId',
  param('eventId').isUUID().withMessage('Valid event ID is required'),
  body('title').optional().isString(),
  body('startTime').optional().isISO8601(),
  body('endTime').optional().isISO8601(),
  body('location').optional().isString(),
  body('description').optional().isString(),
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventId } = req.params;
      const updates = req.body;

      const event = await calendarService.updateEvent(eventId, updates);
      
      res.json({
        success: true,
        data: event,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete an event
router.delete('/events/:eventId',
  param('eventId').isUUID().withMessage('Valid event ID is required'),
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventId } = req.params;

      await calendarService.deleteEvent(eventId);
      
      res.json({
        success: true,
        message: 'Event deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// Check for conflicts
router.post('/conflicts',
  body('startTime').isISO8601().withMessage('Valid start time is required'),
  body('endTime').isISO8601().withMessage('Valid end time is required'),
  body('excludeEventId').optional().isUUID(),
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const { startTime, endTime, excludeEventId } = req.body;

      const conflicts = await calendarService.checkConflicts(
        userId,
        new Date(startTime),
        new Date(endTime),
        excludeEventId
      );
      
      res.json({
        success: true,
        data: conflicts,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Find available time slots
router.post('/availability',
  body('duration').isInt({ min: 15 }).withMessage('Duration must be at least 15 minutes'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required'),
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const { duration, startDate, endDate } = req.body;

      const slots = await calendarService.findAvailableSlots(
        userId,
        duration,
        new Date(startDate),
        new Date(endDate)
      );
      
      res.json({
        success: true,
        data: slots,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;