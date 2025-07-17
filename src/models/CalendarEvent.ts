import { Database } from 'better-sqlite3';
import { RecurrenceFrequency } from '../types';

export interface ICalendarEvent {
  id: string;
  userId: string;
  googleEventId?: string;
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  recurrenceRule?: IRecurrenceRule;
  reminders: IReminder[];
  attendees: IAttendee[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IRecurrenceRule {
  frequency: RecurrenceFrequency;
  interval?: number;
  until?: Date;
  count?: number;
  byDay?: string[];
  byMonth?: number[];
  byMonthDay?: number[];
}

export interface IReminder {
  type: 'email' | 'popup';
  minutes: number;
}

export interface IAttendee {
  contactId?: string;
  email: string;
  name?: string;
  responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  attendancePriority?: string;
}

export class CalendarEventModel {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
    this.createTables();
  }

  private createTables(): void {
    // Main events table
    const eventsTable = `
      CREATE TABLE IF NOT EXISTS calendar_events (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        googleEventId TEXT,
        title TEXT NOT NULL,
        description TEXT,
        location TEXT,
        startTime TEXT NOT NULL,
        endTime TEXT NOT NULL,
        isAllDay INTEGER NOT NULL DEFAULT 0,
        recurrenceRule TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `;
    this.db.prepare(eventsTable).run();

    // Reminders table
    const remindersTable = `
      CREATE TABLE IF NOT EXISTS event_reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        eventId TEXT NOT NULL,
        type TEXT NOT NULL,
        minutes INTEGER NOT NULL,
        FOREIGN KEY (eventId) REFERENCES calendar_events(id) ON DELETE CASCADE
      )
    `;
    this.db.prepare(remindersTable).run();

    // Attendees table
    const attendeesTable = `
      CREATE TABLE IF NOT EXISTS event_attendees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        eventId TEXT NOT NULL,
        contactId TEXT,
        email TEXT NOT NULL,
        name TEXT,
        responseStatus TEXT,
        attendancePriority TEXT,
        FOREIGN KEY (eventId) REFERENCES calendar_events(id) ON DELETE CASCADE,
        FOREIGN KEY (contactId) REFERENCES contacts(id) ON DELETE SET NULL
      )
    `;
    this.db.prepare(attendeesTable).run();

    // Create indexes
    this.db.prepare('CREATE INDEX IF NOT EXISTS idx_events_userId ON calendar_events(userId)').run();
    this.db.prepare('CREATE INDEX IF NOT EXISTS idx_events_startTime ON calendar_events(startTime)').run();
    this.db.prepare('CREATE INDEX IF NOT EXISTS idx_events_googleEventId ON calendar_events(googleEventId)').run();
    this.db.prepare('CREATE INDEX IF NOT EXISTS idx_reminders_eventId ON event_reminders(eventId)').run();
    this.db.prepare('CREATE INDEX IF NOT EXISTS idx_attendees_eventId ON event_attendees(eventId)').run();
  }

  async create(event: Omit<ICalendarEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<ICalendarEvent> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const transaction = this.db.transaction(() => {
      // Insert main event
      const eventSql = `
        INSERT INTO calendar_events (
          id, userId, googleEventId, title, description, location,
          startTime, endTime, isAllDay, recurrenceRule, createdAt, updatedAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      this.db.prepare(eventSql).run(
        id,
        event.userId,
        event.googleEventId || null,
        event.title,
        event.description || null,
        event.location || null,
        event.startTime.toISOString(),
        event.endTime.toISOString(),
        event.isAllDay ? 1 : 0,
        event.recurrenceRule ? JSON.stringify(event.recurrenceRule) : null,
        now,
        now
      );

      // Insert reminders
      for (const reminder of event.reminders) {
        const reminderSql = 'INSERT INTO event_reminders (eventId, type, minutes) VALUES (?, ?, ?)';
        this.db.prepare(reminderSql).run(id, reminder.type, reminder.minutes);
      }

      // Insert attendees
      for (const attendee of event.attendees) {
        const attendeeSql = `
          INSERT INTO event_attendees (eventId, contactId, email, name, responseStatus, attendancePriority)
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        this.db.prepare(attendeeSql).run(
          id,
          attendee.contactId || null,
          attendee.email,
          attendee.name || null,
          attendee.responseStatus || 'needsAction',
          attendee.attendancePriority || null
        );
      }
    });

    transaction();
    return this.findById(id)!;
  }

  findById(id: string): ICalendarEvent | null {
    const eventRow = this.db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(id) as any;
    if (!eventRow) return null;

    const reminders = this.db.prepare('SELECT * FROM event_reminders WHERE eventId = ?').all(id) as IReminder[];
    const attendees = this.db.prepare('SELECT * FROM event_attendees WHERE eventId = ?').all(id) as IAttendee[];

    return {
      ...eventRow,
      isAllDay: eventRow.isAllDay === 1,
      startTime: new Date(eventRow.startTime),
      endTime: new Date(eventRow.endTime),
      recurrenceRule: eventRow.recurrenceRule ? JSON.parse(eventRow.recurrenceRule) : undefined,
      reminders,
      attendees,
      createdAt: new Date(eventRow.createdAt),
      updatedAt: new Date(eventRow.updatedAt)
    };
  }

  findByUserId(userId: string, startDate?: Date, endDate?: Date): ICalendarEvent[] {
    let sql = 'SELECT * FROM calendar_events WHERE userId = ?';
    const params: any[] = [userId];

    if (startDate) {
      sql += ' AND endTime >= ?';
      params.push(startDate.toISOString());
    }

    if (endDate) {
      sql += ' AND startTime <= ?';
      params.push(endDate.toISOString());
    }

    sql += ' ORDER BY startTime';

    const eventRows = this.db.prepare(sql).all(...params) as any[];
    
    return eventRows.map(eventRow => {
      const reminders = this.db.prepare('SELECT * FROM event_reminders WHERE eventId = ?').all(eventRow.id) as IReminder[];
      const attendees = this.db.prepare('SELECT * FROM event_attendees WHERE eventId = ?').all(eventRow.id) as IAttendee[];

      return {
        ...eventRow,
        isAllDay: eventRow.isAllDay === 1,
        startTime: new Date(eventRow.startTime),
        endTime: new Date(eventRow.endTime),
        recurrenceRule: eventRow.recurrenceRule ? JSON.parse(eventRow.recurrenceRule) : undefined,
        reminders,
        attendees,
        createdAt: new Date(eventRow.createdAt),
        updatedAt: new Date(eventRow.updatedAt)
      };
    });
  }

  findByGoogleEventId(googleEventId: string): ICalendarEvent | null {
    const eventRow = this.db.prepare('SELECT * FROM calendar_events WHERE googleEventId = ?').get(googleEventId) as any;
    if (!eventRow) return null;

    const reminders = this.db.prepare('SELECT * FROM event_reminders WHERE eventId = ?').all(eventRow.id) as IReminder[];
    const attendees = this.db.prepare('SELECT * FROM event_attendees WHERE eventId = ?').all(eventRow.id) as IAttendee[];

    return {
      ...eventRow,
      isAllDay: eventRow.isAllDay === 1,
      startTime: new Date(eventRow.startTime),
      endTime: new Date(eventRow.endTime),
      recurrenceRule: eventRow.recurrenceRule ? JSON.parse(eventRow.recurrenceRule) : undefined,
      reminders,
      attendees,
      createdAt: new Date(eventRow.createdAt),
      updatedAt: new Date(eventRow.updatedAt)
    };
  }

  async update(id: string, updates: Partial<Omit<ICalendarEvent, 'id' | 'userId' | 'createdAt'>>): Promise<ICalendarEvent | null> {
    const event = this.findById(id);
    if (!event) return null;

    const transaction = this.db.transaction(() => {
      // Update main event fields
      const eventUpdates: any = {};
      const allowedFields = ['googleEventId', 'title', 'description', 'location', 'startTime', 'endTime', 'isAllDay', 'recurrenceRule'];
      
      for (const field of allowedFields) {
        if (field in updates) {
          let value = (updates as any)[field];
          if (field === 'startTime' || field === 'endTime') {
            value = value.toISOString();
          } else if (field === 'isAllDay') {
            value = value ? 1 : 0;
          } else if (field === 'recurrenceRule') {
            value = value ? JSON.stringify(value) : null;
          }
          eventUpdates[field] = value;
        }
      }

      if (Object.keys(eventUpdates).length > 0) {
        eventUpdates.updatedAt = new Date().toISOString();
        
        const fields = Object.keys(eventUpdates);
        const values = fields.map(field => eventUpdates[field]);
        values.push(id);

        const sql = `
          UPDATE calendar_events 
          SET ${fields.map(field => `${field} = ?`).join(', ')}
          WHERE id = ?
        `;
        this.db.prepare(sql).run(...values);
      }

      // Update reminders if provided
      if (updates.reminders) {
        this.db.prepare('DELETE FROM event_reminders WHERE eventId = ?').run(id);
        for (const reminder of updates.reminders) {
          const reminderSql = 'INSERT INTO event_reminders (eventId, type, minutes) VALUES (?, ?, ?)';
          this.db.prepare(reminderSql).run(id, reminder.type, reminder.minutes);
        }
      }

      // Update attendees if provided
      if (updates.attendees) {
        this.db.prepare('DELETE FROM event_attendees WHERE eventId = ?').run(id);
        for (const attendee of updates.attendees) {
          const attendeeSql = `
            INSERT INTO event_attendees (eventId, contactId, email, name, responseStatus, attendancePriority)
            VALUES (?, ?, ?, ?, ?, ?)
          `;
          this.db.prepare(attendeeSql).run(
            id,
            attendee.contactId || null,
            attendee.email,
            attendee.name || null,
            attendee.responseStatus || 'needsAction',
            attendee.attendancePriority || null
          );
        }
      }
    });

    transaction();
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const sql = 'DELETE FROM calendar_events WHERE id = ?';
    const result = this.db.prepare(sql).run(id);
    return result.changes > 0;
  }

  async deleteByUserId(userId: string): Promise<number> {
    const sql = 'DELETE FROM calendar_events WHERE userId = ?';
    const result = this.db.prepare(sql).run(userId);
    return result.changes;
  }

  checkConflicts(userId: string, startTime: Date, endTime: Date, excludeEventId?: string): ICalendarEvent[] {
    let sql = `
      SELECT * FROM calendar_events 
      WHERE userId = ? 
      AND ((startTime < ? AND endTime > ?) 
           OR (startTime >= ? AND startTime < ?)
           OR (endTime > ? AND endTime <= ?))
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
      sql += ' AND id != ?';
      params.push(excludeEventId);
    }

    const eventRows = this.db.prepare(sql).all(...params) as any[];
    
    return eventRows.map(eventRow => {
      const reminders = this.db.prepare('SELECT * FROM event_reminders WHERE eventId = ?').all(eventRow.id) as IReminder[];
      const attendees = this.db.prepare('SELECT * FROM event_attendees WHERE eventId = ?').all(eventRow.id) as IAttendee[];

      return {
        ...eventRow,
        isAllDay: eventRow.isAllDay === 1,
        startTime: new Date(eventRow.startTime),
        endTime: new Date(eventRow.endTime),
        recurrenceRule: eventRow.recurrenceRule ? JSON.parse(eventRow.recurrenceRule) : undefined,
        reminders,
        attendees,
        createdAt: new Date(eventRow.createdAt),
        updatedAt: new Date(eventRow.updatedAt)
      };
    });
  }
}