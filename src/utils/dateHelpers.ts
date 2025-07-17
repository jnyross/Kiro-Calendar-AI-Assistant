import { RecurrenceFrequency, RecurringPattern } from '../types';

/**
 * Format a date to a readable string
 */
export const formatDate = (date: Date, format: string = 'YYYY-MM-DD'): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
};

/**
 * Parse a date string with common formats
 */
export const parseDate = (dateString: string): Date | null => {
  // Try parsing with Date constructor first
  const date = new Date(dateString);
  if (!isNaN(date.getTime())) {
    return date;
  }

  // Try common formats
  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
    /^(\d{2})\/(\d{2})\/(\d{4})$/, // MM/DD/YYYY
    /^(\d{2})-(\d{2})-(\d{4})$/, // DD-MM-YYYY
  ];

  for (const format of formats) {
    const match = dateString.match(format);
    if (match) {
      // Adjust based on format
      let year, month, day;
      if (format === formats[0]) {
        [, year, month, day] = match;
      } else if (format === formats[1]) {
        [, month, day, year] = match;
      } else {
        [, day, month, year] = match;
      }
      
      const parsed = new Date(Number(year), Number(month) - 1, Number(day));
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  }

  return null;
};

/**
 * Add time to a date
 */
export const addTime = (
  date: Date,
  amount: number,
  unit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years'
): Date => {
  const result = new Date(date);

  switch (unit) {
    case 'minutes':
      result.setMinutes(result.getMinutes() + amount);
      break;
    case 'hours':
      result.setHours(result.getHours() + amount);
      break;
    case 'days':
      result.setDate(result.getDate() + amount);
      break;
    case 'weeks':
      result.setDate(result.getDate() + amount * 7);
      break;
    case 'months':
      result.setMonth(result.getMonth() + amount);
      break;
    case 'years':
      result.setFullYear(result.getFullYear() + amount);
      break;
  }

  return result;
};

/**
 * Get the start of a time period
 */
export const startOf = (
  date: Date,
  unit: 'day' | 'week' | 'month' | 'year'
): Date => {
  const result = new Date(date);

  switch (unit) {
    case 'day':
      result.setHours(0, 0, 0, 0);
      break;
    case 'week':
      const day = result.getDay();
      result.setDate(result.getDate() - day);
      result.setHours(0, 0, 0, 0);
      break;
    case 'month':
      result.setDate(1);
      result.setHours(0, 0, 0, 0);
      break;
    case 'year':
      result.setMonth(0, 1);
      result.setHours(0, 0, 0, 0);
      break;
  }

  return result;
};

/**
 * Get the end of a time period
 */
export const endOf = (
  date: Date,
  unit: 'day' | 'week' | 'month' | 'year'
): Date => {
  const result = new Date(date);

  switch (unit) {
    case 'day':
      result.setHours(23, 59, 59, 999);
      break;
    case 'week':
      const day = result.getDay();
      result.setDate(result.getDate() + (6 - day));
      result.setHours(23, 59, 59, 999);
      break;
    case 'month':
      result.setMonth(result.getMonth() + 1, 0);
      result.setHours(23, 59, 59, 999);
      break;
    case 'year':
      result.setMonth(11, 31);
      result.setHours(23, 59, 59, 999);
      break;
  }

  return result;
};

/**
 * Check if two dates are on the same day
 */
export const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

/**
 * Get the difference between two dates
 */
export const dateDiff = (
  date1: Date,
  date2: Date,
  unit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years'
): number => {
  const diff = date2.getTime() - date1.getTime();

  switch (unit) {
    case 'minutes':
      return Math.floor(diff / (1000 * 60));
    case 'hours':
      return Math.floor(diff / (1000 * 60 * 60));
    case 'days':
      return Math.floor(diff / (1000 * 60 * 60 * 24));
    case 'weeks':
      return Math.floor(diff / (1000 * 60 * 60 * 24 * 7));
    case 'months':
      const months = (date2.getFullYear() - date1.getFullYear()) * 12;
      return months + date2.getMonth() - date1.getMonth();
    case 'years':
      return date2.getFullYear() - date1.getFullYear();
  }
};

/**
 * Calculate next occurrence based on recurring pattern
 */
export const getNextOccurrence = (
  startDate: Date,
  pattern: RecurringPattern,
  afterDate: Date = new Date()
): Date | null => {
  let current = new Date(startDate);
  let occurrenceCount = 0;

  // If we have an end date and it's passed, return null
  if (pattern.endDate && afterDate > pattern.endDate) {
    return null;
  }

  while (current <= afterDate || occurrenceCount === 0) {
    // Check if we've reached the maximum occurrences
    if (pattern.occurrences && occurrenceCount >= pattern.occurrences) {
      return null;
    }

    // Move to next occurrence based on frequency
    switch (pattern.frequency) {
      case RecurrenceFrequency.DAILY:
        current = addTime(current, pattern.interval || 1, 'days');
        break;

      case RecurrenceFrequency.WEEKLY:
        if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
          // Find next day of week
          let found = false;
          for (let i = 1; i <= 7; i++) {
            current = addTime(current, 1, 'days');
            if (pattern.daysOfWeek.includes(current.getDay())) {
              found = true;
              break;
            }
          }
          if (!found) {
            return null;
          }
        } else {
          current = addTime(current, (pattern.interval || 1) * 7, 'days');
        }
        break;

      case RecurrenceFrequency.MONTHLY:
        if (pattern.dayOfMonth) {
          current.setMonth(current.getMonth() + (pattern.interval || 1));
          current.setDate(pattern.dayOfMonth);
        } else {
          current = addTime(current, pattern.interval || 1, 'months');
        }
        break;

      case RecurrenceFrequency.YEARLY:
        current = addTime(current, pattern.interval || 1, 'years');
        break;
    }

    occurrenceCount++;

    // Check if the current date is within bounds
    if (pattern.endDate && current > pattern.endDate) {
      return null;
    }

    if (current > afterDate) {
      return current;
    }
  }

  return null;
};

/**
 * Get all occurrences of a recurring event within a date range
 */
export const getOccurrencesInRange = (
  startDate: Date,
  pattern: RecurringPattern,
  rangeStart: Date,
  rangeEnd: Date
): Date[] => {
  const occurrences: Date[] = [];
  let current = new Date(startDate);
  let occurrenceCount = 0;

  // If the start date is after the range, return empty
  if (startDate > rangeEnd) {
    return occurrences;
  }

  // If we have an end date and it's before the range start, return empty
  if (pattern.endDate && pattern.endDate < rangeStart) {
    return occurrences;
  }

  // Start from the beginning of the range if the event starts before it
  if (current < rangeStart) {
    current = getNextOccurrence(startDate, pattern, rangeStart) || current;
  }

  while (current <= rangeEnd) {
    // Check if we've reached the maximum occurrences
    if (pattern.occurrences && occurrenceCount >= pattern.occurrences) {
      break;
    }

    // Check if we've reached the pattern end date
    if (pattern.endDate && current > pattern.endDate) {
      break;
    }

    // Add to occurrences if within range
    if (current >= rangeStart && current <= rangeEnd) {
      occurrences.push(new Date(current));
    }

    // Get next occurrence
    const next = getNextOccurrence(current, pattern, current);
    if (!next || next <= current) {
      break;
    }

    current = next;
    occurrenceCount++;
  }

  return occurrences;
};

/**
 * Convert timezone
 */
export const convertTimezone = (
  date: Date,
  fromTimezone: string,
  toTimezone: string
): Date => {
  // This is a simplified implementation
  // In production, use a library like moment-timezone
  const fromOffset = getTimezoneOffset(fromTimezone);
  const toOffset = getTimezoneOffset(toTimezone);
  const diff = toOffset - fromOffset;
  
  return new Date(date.getTime() + diff * 60 * 60 * 1000);
};

/**
 * Get timezone offset in hours (simplified)
 */
const getTimezoneOffset = (timezone: string): number => {
  // This is a simplified implementation
  // In production, use proper timezone data
  const offsets: Record<string, number> = {
    'UTC': 0,
    'EST': -5,
    'CST': -6,
    'MST': -7,
    'PST': -8,
    'EDT': -4,
    'CDT': -5,
    'MDT': -6,
    'PDT': -7,
  };

  return offsets[timezone] || 0;
};

/**
 * Format duration in human-readable format
 */
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }

  return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
};