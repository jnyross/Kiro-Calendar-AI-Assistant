import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationError as ExpressValidationError } from 'express-validator';
import { logger } from '../utils/logger';

/**
 * Middleware to handle validation errors from express-validator
 */
export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const extractedErrors: Record<string, string[]> = {};

    errors.array().forEach((err: ExpressValidationError) => {
      if (err.type === 'field') {
        const field = err.path;
        if (!extractedErrors[field]) {
          extractedErrors[field] = [];
        }
        extractedErrors[field].push(err.msg);
      }
    });

    logger.warn('Validation error:', {
      url: req.url,
      method: req.method,
      errors: extractedErrors,
    });

    res.status(400).json({
      success: false,
      error: 'Validation failed',
      errors: extractedErrors,
    });
    return;
  }

  next();
};

/**
 * Custom validation middleware for common patterns
 */
export const customValidators = {
  /**
   * Validate UUID format
   */
  isUUID: (value: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  },

  /**
   * Validate phone number format
   */
  isPhoneNumber: (value: string): boolean => {
    // Basic phone number validation (can be customized based on requirements)
    const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{4,6}$/;
    return phoneRegex.test(value);
  },

  /**
   * Validate time format (HH:mm)
   */
  isTimeFormat: (value: string): boolean => {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(value);
  },

  /**
   * Validate date is in the future
   */
  isFutureDate: (value: string): boolean => {
    const date = new Date(value);
    return date > new Date();
  },

  /**
   * Validate date range
   */
  isValidDateRange: (startDate: string, endDate: string): boolean => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return start < end;
  },

  /**
   * Validate timezone format
   */
  isTimezone: (value: string): boolean => {
    // Basic timezone validation (can be enhanced with moment-timezone)
    const timezones = [
      'UTC', 'GMT', 'EST', 'CST', 'MST', 'PST',
      'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
      'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'Australia/Sydney'
    ];
    return timezones.includes(value) || value.match(/^[A-Z]{3,4}$/) !== null;
  },
};

/**
 * Sanitize user input to prevent XSS attacks
 */
export const sanitizeInput = (input: any): any => {
  if (typeof input === 'string') {
    // Remove potentially harmful characters/patterns
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .trim();
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const key in input) {
      if (input.hasOwnProperty(key)) {
        sanitized[key] = sanitizeInput(input[key]);
      }
    }
    return sanitized;
  }
  
  return input;
};

/**
 * Middleware to sanitize request body
 */
export const sanitizeRequestBody = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.body) {
    req.body = sanitizeInput(req.body);
  }
  next();
};

/**
 * Validate pagination parameters
 */
export const validatePagination = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  if (page < 1) {
    res.status(400).json({
      success: false,
      error: 'Page must be greater than 0',
    });
    return;
  }

  if (limit < 1 || limit > 100) {
    res.status(400).json({
      success: false,
      error: 'Limit must be between 1 and 100',
    });
    return;
  }

  // Attach pagination to request
  (req as any).pagination = {
    page,
    limit,
    offset: (page - 1) * limit,
  };

  next();
};