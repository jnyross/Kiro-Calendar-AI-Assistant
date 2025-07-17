import { CalendarEvent, Contact, RecurringPattern } from '../types';

/**
 * Validate a calendar event object
 */
export const validateCalendarEvent = (event: Partial<CalendarEvent>): string[] => {
  const errors: string[] = [];

  // Required fields
  if (!event.title || event.title.trim().length === 0) {
    errors.push('Event title is required');
  }

  if (!event.startTime) {
    errors.push('Start time is required');
  }

  if (!event.endTime) {
    errors.push('End time is required');
  }

  // Validate dates
  if (event.startTime && event.endTime) {
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);

    if (isNaN(start.getTime())) {
      errors.push('Invalid start time');
    }

    if (isNaN(end.getTime())) {
      errors.push('Invalid end time');
    }

    if (start >= end) {
      errors.push('End time must be after start time');
    }

    // Check if event is too long (e.g., more than 24 hours)
    const duration = end.getTime() - start.getTime();
    const maxDuration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    if (duration > maxDuration) {
      errors.push('Event duration cannot exceed 24 hours');
    }
  }

  // Validate recurring pattern
  if (event.isRecurring && event.recurringPattern) {
    const patternErrors = validateRecurringPattern(event.recurringPattern);
    errors.push(...patternErrors);
  }

  return errors;
};

/**
 * Validate a recurring pattern
 */
export const validateRecurringPattern = (pattern: RecurringPattern): string[] => {
  const errors: string[] = [];

  if (!pattern.frequency) {
    errors.push('Recurrence frequency is required');
  }

  if (pattern.interval && pattern.interval < 1) {
    errors.push('Recurrence interval must be at least 1');
  }

  if (pattern.daysOfWeek) {
    for (const day of pattern.daysOfWeek) {
      if (day < 0 || day > 6) {
        errors.push('Days of week must be between 0 (Sunday) and 6 (Saturday)');
        break;
      }
    }
  }

  if (pattern.dayOfMonth) {
    if (pattern.dayOfMonth < 1 || pattern.dayOfMonth > 31) {
      errors.push('Day of month must be between 1 and 31');
    }
  }

  if (pattern.endDate && pattern.occurrences) {
    errors.push('Cannot specify both end date and number of occurrences');
  }

  return errors;
};

/**
 * Validate a contact object
 */
export const validateContact = (contact: Partial<Contact>): string[] => {
  const errors: string[] = [];

  // Required fields
  if (!contact.name || contact.name.trim().length === 0) {
    errors.push('Contact name is required');
  }

  // Validate email
  if (contact.email && !isValidEmail(contact.email)) {
    errors.push('Invalid email address');
  }

  // Validate phone
  if (contact.phone && !isValidPhoneNumber(contact.phone)) {
    errors.push('Invalid phone number');
  }

  return errors;
};

/**
 * Validate email address format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number format
 */
export const isValidPhoneNumber = (phone: string): boolean => {
  // Remove all non-numeric characters for validation
  const cleaned = phone.replace(/\D/g, '');
  
  // Check if it's a valid length (10-15 digits for international numbers)
  return cleaned.length >= 10 && cleaned.length <= 15;
};

/**
 * Validate UUID format
 */
export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Validate timezone string
 */
export const isValidTimezone = (timezone: string): boolean => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Validate date string
 */
export const isValidDateString = (dateString: string): boolean => {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};

/**
 * Validate time format (HH:mm)
 */
export const isValidTimeFormat = (time: string): boolean => {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
};

/**
 * Check if a date is in the past
 */
export const isDateInPast = (date: Date): boolean => {
  return date < new Date();
};

/**
 * Check if a date is in the future
 */
export const isDateInFuture = (date: Date): boolean => {
  return date > new Date();
};

/**
 * Validate working hours format
 */
export const validateWorkingHours = (start: string, end: string): string[] => {
  const errors: string[] = [];

  if (!isValidTimeFormat(start)) {
    errors.push('Invalid start time format (expected HH:mm)');
  }

  if (!isValidTimeFormat(end)) {
    errors.push('Invalid end time format (expected HH:mm)');
  }

  if (errors.length === 0) {
    const [startHour, startMinute] = start.split(':').map(Number);
    const [endHour, endMinute] = end.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    
    if (startMinutes >= endMinutes) {
      errors.push('End time must be after start time');
    }
  }

  return errors;
};

/**
 * Sanitize string input
 */
export const sanitizeString = (input: string): string => {
  return input
    .trim()
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[^\w\s\-.,@]/gi, ''); // Remove special characters except common ones
};

/**
 * Validate password strength
 */
export const validatePassword = (password: string): string[] => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return errors;
};