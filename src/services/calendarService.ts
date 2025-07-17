import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { CalendarEvent, Contact, RecurringPattern } from '../types';
import { logger } from '../utils/logger';
import { config } from '../config';
import databaseService from './databaseService';
import { v4 as uuidv4 } from 'uuid';
import { addDays, addWeeks, addMonths, addYears, isAfter, isBefore, isWithinInterval } from 'date-fns';

export class CalendarService {
  private oauth2Client: OAuth2Client;
  private calendar: calendar_v3.Calendar;

  constructor() {
    this.oauth2Client = new OAuth2Client(
      config.google.clientId,
      config.google.clientSecret,
      config.google.redirectUri
    );

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Get Google OAuth2 authorization URL
   * @returns Authorization URL
   */
  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: config.google.scopes,
      prompt: 'consent'
    });
  }

  /**
   * Exchange authorization code for tokens
   * @param code Authorization code
   * @returns Tokens
   */
  async getTokens(code: string) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      return tokens;
    } catch (error) {
      logger.error('Error getting tokens:', error);
      throw error;
    }
  }

  /**
   * Set OAuth2 credentials for a user
   * @param tokens OAuth2 tokens
   */
  setCredentials(tokens: any) {
    this.oauth2Client.setCredentials(tokens);
  }

  /**
   * Create a new calendar event
   * @param event Event data
   * @param syncToGoogle Whether to sync to Google Calendar
   * @returns Created event
   */
  async createEvent(event: Partial<CalendarEvent>, syncToGoogle: boolean = true): Promise<CalendarEvent> {
    try {
      logger.info('Creating new calendar event');
      
      // Generate unique ID if not provided
      const eventId = event.id || uuidv4();
      
      // Check for conflicts
      if (event.userId && event.startTime && event.endTime) {
        const conflicts = await this.checkConflicts(
          event.userId,
          new Date(event.startTime),
          new Date(event.endTime)
        );
        
        if (conflicts.length > 0) {
          throw new Error(`Event conflicts with ${conflicts.length} existing event(s)`);
        }
      }

      // Create event in database
      const newEvent: CalendarEvent = {
        id: eventId,
        userId: event.userId!,
        title: event.title || 'Untitled Event',
        description: event.description || '',
        startTime: event.startTime!,
        endTime: event.endTime!,
        location: event.location,
        attendees: event.attendees || [],
        reminders: event.reminders || [],
        recurring: event.recurring,
        googleEventId: undefined,
        status: 'confirmed',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save to database
      await databaseService.db?.run(
        `INSERT INTO calendar_events (
          id, user_id, title, description, start_time, end_time,
          location, attendees, reminders, recurring, google_event_id,
          status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newEvent.id,
          newEvent.userId,
          newEvent.title,
          newEvent.description,
          newEvent.startTime,
          newEvent.endTime,
          newEvent.location,
          JSON.stringify(newEvent.attendees),
          JSON.stringify(newEvent.reminders),
          newEvent.recurring ? JSON.stringify(newEvent.recurring) : null,
          newEvent.googleEventId,
          newEvent.status,
          newEvent.createdAt.toISOString(),
          newEvent.updatedAt.toISOString()
        ]
      );

      // Sync to Google Calendar if enabled
      if (syncToGoogle && this.oauth2Client.credentials.access_token) {
        try {
          const googleEvent = await this.syncEventToGoogle(newEvent);
          newEvent.googleEventId = googleEvent.id!;
          
          // Update database with Google event ID
          await databaseService.db?.run(
            'UPDATE calendar_events SET google_event_id = ? WHERE id = ?',
            [newEvent.googleEventId, newEvent.id]
          );
        } catch (error) {
          logger.error('Error syncing to Google Calendar:', error);
          // Continue even if Google sync fails
        }
      }

      // Handle recurring events
      if (newEvent.recurring) {
        await this.createRecurringInstances(newEvent);
      }

      logger.info(`Event created successfully: ${newEvent.id}`);
      return newEvent;
    } catch (error) {
      logger.error('Error creating event:', error);
      throw error;
    }
  }

  /**
   * Update an existing calendar event
   * @param eventId Event ID
   * @param updates Event updates
   * @param syncToGoogle Whether to sync to Google Calendar
   * @returns Updated event
   */
  async updateEvent(eventId: string, updates: Partial<CalendarEvent>, syncToGoogle: boolean = true): Promise<CalendarEvent> {
    try {
      logger.info(`Updating event: ${eventId}`);
      
      // Get existing event
      const existingEvent = await this.getEventById(eventId);
      if (!existingEvent) {
        throw new Error('Event not found');
      }

      // Check for conflicts if time is being updated
      if (updates.startTime || updates.endTime) {
        const conflicts = await this.checkConflicts(
          existingEvent.userId,
          new Date(updates.startTime || existingEvent.startTime),
          new Date(updates.endTime || existingEvent.endTime),
          eventId
        );
        
        if (conflicts.length > 0) {
          throw new Error(`Event conflicts with ${conflicts.length} existing event(s)`);
        }
      }

      // Update event in database
      const updatedEvent = {
        ...existingEvent,
        ...updates,
        updatedAt: new Date()
      };

      await databaseService.db?.run(
        `UPDATE calendar_events SET
          title = ?, description = ?, start_time = ?, end_time = ?,
          location = ?, attendees = ?, reminders = ?, recurring = ?,
          status = ?, updated_at = ?
        WHERE id = ?`,
        [
          updatedEvent.title,
          updatedEvent.description,
          updatedEvent.startTime,
          updatedEvent.endTime,
          updatedEvent.location,
          JSON.stringify(updatedEvent.attendees),
          JSON.stringify(updatedEvent.reminders),
          updatedEvent.recurring ? JSON.stringify(updatedEvent.recurring) : null,
          updatedEvent.status,
          updatedEvent.updatedAt.toISOString(),
          eventId
        ]
      );

      // Sync to Google Calendar if enabled
      if (syncToGoogle && existingEvent.googleEventId && this.oauth2Client.credentials.access_token) {
        try {
          await this.updateGoogleEvent(existingEvent.googleEventId, updatedEvent);
        } catch (error) {
          logger.error('Error syncing update to Google Calendar:', error);
        }
      }

      logger.info(`Event updated successfully: ${eventId}`);
      return updatedEvent;
    } catch (error) {
      logger.error('Error updating event:', error);
      throw error;
    }
  }

  /**
   * Delete a calendar event
   * @param eventId Event ID
   * @param syncToGoogle Whether to sync to Google Calendar
   * @returns Success status
   */
  async deleteEvent(eventId: string, syncToGoogle: boolean = true): Promise<boolean> {
    try {
      logger.info(`Deleting event: ${eventId}`);
      
      // Get event details before deletion
      const event = await this.getEventById(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      // Delete from database
      await databaseService.db?.run('DELETE FROM calendar_events WHERE id = ?', [eventId]);

      // Delete from Google Calendar if synced
      if (syncToGoogle && event.googleEventId && this.oauth2Client.credentials.access_token) {
        try {
          await this.calendar.events.delete({
            calendarId: 'primary',
            eventId: event.googleEventId
          });
        } catch (error) {
          logger.error('Error deleting from Google Calendar:', error);
        }
      }

      logger.info(`Event deleted successfully: ${eventId}`);
      return true;
    } catch (error) {
      logger.error('Error deleting event:', error);
      throw error;
    }
  }

  /**
   * Get events for a specific time range
   * @param userId User ID
   * @param startDate Start date
   * @param endDate End date
   * @returns Array of events
   */
  async getEvents(userId: string, startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    try {
      logger.info(`Getting events for user ${userId} from ${startDate} to ${endDate}`);
      
      const events = await databaseService.db?.all<CalendarEvent[]>(
        `SELECT * FROM calendar_events
         WHERE user_id = ? AND start_time >= ? AND end_time <= ?
         ORDER BY start_time ASC`,
        [userId, startDate.toISOString(), endDate.toISOString()]
      );

      return events || [];
    } catch (error) {
      logger.error('Error getting events:', error);
      throw error;
    }
  }

  /**
   * Get a single event by ID
   * @param eventId Event ID
   * @returns Event or null
   */
  async getEventById(eventId: string): Promise<CalendarEvent | null> {
    try {
      const event = await databaseService.db?.get<CalendarEvent>(
        'SELECT * FROM calendar_events WHERE id = ?',
        [eventId]
      );

      if (event) {
        // Parse JSON fields
        event.attendees = JSON.parse(event.attendees as any || '[]');
        event.reminders = JSON.parse(event.reminders as any || '[]');
        event.recurring = event.recurring ? JSON.parse(event.recurring as any) : undefined;
      }

      return event || null;
    } catch (error) {
      logger.error('Error getting event by ID:', error);
      throw error;
    }
  }

  /**
   * Check for scheduling conflicts
   * @param userId User ID
   * @param startTime Start time
   * @param endTime End time
   * @param excludeEventId Optional event ID to exclude
   * @returns Array of conflicting events
   */
  async checkConflicts(
    userId: string,
    startTime: Date,
    endTime: Date,
    excludeEventId?: string
  ): Promise<CalendarEvent[]> {
    try {
      logger.info('Checking for scheduling conflicts');
      
      let query = `
        SELECT * FROM calendar_events
        WHERE user_id = ? AND status != 'cancelled'
        AND (
          (start_time < ? AND end_time > ?) OR
          (start_time >= ? AND start_time < ?) OR
          (end_time > ? AND end_time <= ?)
        )
      `;
      
      const params: any[] = [
        userId,
        endTime.toISOString(),
        startTime.toISOString(),
        startTime.toISOString(),
        endTime.toISOString(),
        startTime.toISOString(),
        endTime.toISOString()
      ];

      if (excludeEventId) {
        query += ' AND id != ?';
        params.push(excludeEventId);
      }

      const conflicts = await databaseService.db?.all<CalendarEvent[]>(query, params);
      
      return conflicts || [];
    } catch (error) {
      logger.error('Error checking conflicts:', error);
      throw error;
    }
  }

  /**
   * Find available time slots
   * @param userId User ID
   * @param duration Duration in minutes
   * @param startDate Search start date
   * @param endDate Search end date
   * @param workingHours Optional working hours constraints
   * @returns Array of available time slots
   */
  async findAvailableSlots(
    userId: string,
    duration: number,
    startDate: Date,
    endDate: Date,
    workingHours?: { start: number; end: number }
  ): Promise<{ start: Date; end: Date }[]> {
    try {
      logger.info('Finding available time slots');
      
      // Get all events in the time range
      const events = await this.getEvents(userId, startDate, endDate);
      
      // Sort events by start time
      events.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      
      const availableSlots: { start: Date; end: Date }[] = [];
      let currentTime = new Date(startDate);
      
      // Default working hours: 9 AM to 5 PM
      const workStart = workingHours?.start || 9;
      const workEnd = workingHours?.end || 17;
      
      // Iterate through each day
      while (isBefore(currentTime, endDate)) {
        // Set working hours for the current day
        const dayStart = new Date(currentTime);
        dayStart.setHours(workStart, 0, 0, 0);
        
        const dayEnd = new Date(currentTime);
        dayEnd.setHours(workEnd, 0, 0, 0);
        
        // Find events for this day
        const dayEvents = events.filter(event => {
          const eventStart = new Date(event.startTime);
          const eventEnd = new Date(event.endTime);
          return isWithinInterval(eventStart, { start: dayStart, end: dayEnd }) ||
                 isWithinInterval(eventEnd, { start: dayStart, end: dayEnd });
        });
        
        // Find gaps between events
        let slotStart = dayStart;
        
        for (const event of dayEvents) {
          const eventStart = new Date(event.startTime);
          const eventEnd = new Date(event.endTime);
          
          // Check if there's a gap before this event
          const gapMinutes = (eventStart.getTime() - slotStart.getTime()) / (1000 * 60);
          if (gapMinutes >= duration) {
            availableSlots.push({
              start: new Date(slotStart),
              end: new Date(eventStart)
            });
          }
          
          // Update slot start to after this event
          if (isAfter(eventEnd, slotStart)) {
            slotStart = eventEnd;
          }
        }
        
        // Check for gap after last event
        const finalGapMinutes = (dayEnd.getTime() - slotStart.getTime()) / (1000 * 60);
        if (finalGapMinutes >= duration) {
          availableSlots.push({
            start: new Date(slotStart),
            end: new Date(dayEnd)
          });
        }
        
        // Move to next day
        currentTime = addDays(currentTime, 1);
      }
      
      return availableSlots;
    } catch (error) {
      logger.error('Error finding available slots:', error);
      throw error;
    }
  }

  /**
   * Sync event to Google Calendar
   * @param event Calendar event
   * @returns Google Calendar event
   */
  private async syncEventToGoogle(event: CalendarEvent): Promise<calendar_v3.Schema$Event> {
    try {
      const googleEvent: calendar_v3.Schema$Event = {
        summary: event.title,
        description: event.description,
        location: event.location,
        start: {
          dateTime: new Date(event.startTime).toISOString(),
          timeZone: 'UTC'
        },
        end: {
          dateTime: new Date(event.endTime).toISOString(),
          timeZone: 'UTC'
        },
        attendees: event.attendees?.map(email => ({ email })),
        reminders: {
          useDefault: false,
          overrides: event.reminders?.map(reminder => ({
            method: reminder.type === 'email' ? 'email' : 'popup',
            minutes: reminder.minutesBefore
          }))
        }
      };

      // Handle recurring events
      if (event.recurring) {
        googleEvent.recurrence = [this.buildRecurrenceRule(event.recurring)];
      }

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        requestBody: googleEvent
      });

      return response.data;
    } catch (error) {
      logger.error('Error syncing to Google Calendar:', error);
      throw error;
    }
  }

  /**
   * Update event in Google Calendar
   * @param googleEventId Google event ID
   * @param event Updated event data
   */
  private async updateGoogleEvent(googleEventId: string, event: CalendarEvent): Promise<void> {
    try {
      const googleEvent: calendar_v3.Schema$Event = {
        summary: event.title,
        description: event.description,
        location: event.location,
        start: {
          dateTime: new Date(event.startTime).toISOString(),
          timeZone: 'UTC'
        },
        end: {
          dateTime: new Date(event.endTime).toISOString(),
          timeZone: 'UTC'
        },
        attendees: event.attendees?.map(email => ({ email })),
        reminders: {
          useDefault: false,
          overrides: event.reminders?.map(reminder => ({
            method: reminder.type === 'email' ? 'email' : 'popup',
            minutes: reminder.minutesBefore
          }))
        }
      };

      await this.calendar.events.update({
        calendarId: 'primary',
        eventId: googleEventId,
        requestBody: googleEvent
      });
    } catch (error) {
      logger.error('Error updating Google Calendar event:', error);
      throw error;
    }
  }

  /**
   * Build recurrence rule for Google Calendar
   * @param recurring Recurring pattern
   * @returns RRULE string
   */
  private buildRecurrenceRule(recurring: RecurringPattern): string {
    let rrule = 'RRULE:';
    
    switch (recurring.frequency) {
      case 'daily':
        rrule += 'FREQ=DAILY';
        break;
      case 'weekly':
        rrule += 'FREQ=WEEKLY';
        if (recurring.daysOfWeek && recurring.daysOfWeek.length > 0) {
          const days = recurring.daysOfWeek.map(d => d.substr(0, 2).toUpperCase());
          rrule += `;BYDAY=${days.join(',')}`;
        }
        break;
      case 'monthly':
        rrule += 'FREQ=MONTHLY';
        if (recurring.dayOfMonth) {
          rrule += `;BYMONTHDAY=${recurring.dayOfMonth}`;
        }
        break;
      case 'yearly':
        rrule += 'FREQ=YEARLY';
        break;
    }
    
    if (recurring.interval && recurring.interval > 1) {
      rrule += `;INTERVAL=${recurring.interval}`;
    }
    
    if (recurring.endDate) {
      rrule += `;UNTIL=${new Date(recurring.endDate).toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
    } else if (recurring.occurrences) {
      rrule += `;COUNT=${recurring.occurrences}`;
    }
    
    return rrule;
  }

  /**
   * Create recurring event instances
   * @param event Master recurring event
   */
  private async createRecurringInstances(event: CalendarEvent): Promise<void> {
    if (!event.recurring) return;
    
    // Implementation would create individual instances based on the recurrence pattern
    // This is a simplified version - a full implementation would handle all edge cases
    logger.info(`Creating recurring instances for event ${event.id}`);
  }

  /**
   * Sync events from Google Calendar
   * @param userId User ID
   * @param syncFrom Start date for sync
   * @returns Number of events synced
   */
  async syncFromGoogle(userId: string, syncFrom: Date = new Date()): Promise<number> {
    try {
      logger.info(`Syncing events from Google Calendar for user ${userId}`);
      
      if (!this.oauth2Client.credentials.access_token) {
        throw new Error('User not authenticated with Google');
      }

      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: syncFrom.toISOString(),
        maxResults: 100,
        singleEvents: true,
        orderBy: 'startTime'
      });

      const googleEvents = response.data.items || [];
      let syncedCount = 0;

      for (const googleEvent of googleEvents) {
        if (!googleEvent.start?.dateTime || !googleEvent.end?.dateTime) continue;

        // Check if event already exists
        const existingEvent = await databaseService.db?.get(
          'SELECT id FROM calendar_events WHERE google_event_id = ?',
          [googleEvent.id]
        );

        if (!existingEvent) {
          // Create new event
          await this.createEvent({
            userId,
            title: googleEvent.summary || 'Untitled Event',
            description: googleEvent.description || '',
            startTime: googleEvent.start.dateTime,
            endTime: googleEvent.end.dateTime,
            location: googleEvent.location,
            attendees: googleEvent.attendees?.map(a => a.email || '').filter(e => e) || [],
            googleEventId: googleEvent.id
          }, false); // Don't sync back to Google

          syncedCount++;
        }
      }

      logger.info(`Synced ${syncedCount} events from Google Calendar`);
      return syncedCount;
    } catch (error) {
      logger.error('Error syncing from Google Calendar:', error);
      throw error;
    }
  }
}

export default new CalendarService();