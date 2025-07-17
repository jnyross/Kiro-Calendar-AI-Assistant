// Main type definitions for Kiro Calendar Assistant

export interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  description: string;
  startTime: string | Date;
  endTime: string | Date;
  location?: string;
  attendees: string[];
  reminders: EventReminder[];
  recurring?: RecurringPattern;
  googleEventId?: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface Contact {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  jobTitle?: string;
  notes?: string;
  tags: string[];
  customFields: Record<string, any>;
  lastContactedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ParsedCommand {
  intent: CommandIntent;
  entities: {
    dateTime?: Date;
    duration?: number;
    title?: string;
    attendees?: string[];
    location?: string;
    description?: string;
    contactName?: string;
    timeRange?: {
      start: Date;
      end: Date;
    };
    recurringPattern?: RecurringPattern;
    eventId?: string;
    reminderTime?: Date;
    reminderType?: ReminderType;
  };
  confidence: number;
  originalText: string;
}

export enum CommandIntent {
  CREATE_EVENT = 'CREATE_EVENT',
  UPDATE_EVENT = 'UPDATE_EVENT',
  DELETE_EVENT = 'DELETE_EVENT',
  LIST_EVENTS = 'LIST_EVENTS',
  QUERY_SCHEDULE = 'QUERY_SCHEDULE',
  ADD_CONTACT = 'ADD_CONTACT',
  QUERY_CONTACT = 'QUERY_CONTACT',
  SET_REMINDER = 'SET_REMINDER',
  FIND_TIME = 'FIND_TIME',
  FIND_FREE_TIME = 'FIND_FREE_TIME',
  ADD_ATTENDEE = 'ADD_ATTENDEE',
  CHECK_CONFLICTS = 'CHECK_CONFLICTS',
  UNKNOWN = 'UNKNOWN'
}

export interface Reminder {
  id: string;
  eventId: string;
  time: Date;
  type: ReminderType;
  sent: boolean;
}

export interface EventReminder {
  type: 'email' | 'popup';
  minutesBefore: number;
}

export enum ReminderType {
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
  SMS = 'SMS'
}

export interface RecurringPattern {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval?: number;
  daysOfWeek?: string[];
  dayOfMonth?: number;
  endDate?: Date;
  occurrences?: number;
}

export enum RecurrenceFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY'
}

export interface User {
  id: string;
  email: string;
  name: string;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  timezone: string;
  workingHours: {
    start: string;
    end: string;
  };
  defaultReminderMinutes: number;
  language: string;
}