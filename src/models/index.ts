import Database from 'better-sqlite3';
import { UserModel } from './User';
import { ContactModel } from './Contact';
import { CalendarEventModel } from './CalendarEvent';
import config from '../config';
import { logger } from '../utils/logger';

// Export models
export { UserModel, IUser } from './User';
export { ContactModel, IContact } from './Contact';
export { CalendarEventModel, ICalendarEvent, IRecurrenceRule, IReminder, IAttendee } from './CalendarEvent';

// Database instance
let db: Database.Database;
let userModel: UserModel;
let contactModel: ContactModel;
let calendarEventModel: CalendarEventModel;

/**
 * Initialize the database and models
 */
export function initializeDatabase(): void {
  try {
    // Create database instance
    db = new Database(config.database.path, {
      verbose: config.isDevelopment ? logger.debug : undefined
    });

    // Enable foreign keys
    db.pragma('foreign_keys = ON');

    // Enable WAL mode for better concurrency
    db.pragma('journal_mode = WAL');

    // Initialize models
    userModel = new UserModel(db);
    contactModel = new ContactModel(db);
    calendarEventModel = new CalendarEventModel(db);

    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Get the database instance
 */
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

/**
 * Get model instances
 */
export function getModels() {
  if (!userModel || !contactModel || !calendarEventModel) {
    throw new Error('Models not initialized. Call initializeDatabase() first.');
  }
  
  return {
    users: userModel,
    contacts: contactModel,
    events: calendarEventModel
  };
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    logger.info('Database connection closed');
  }
}

/**
 * Run database migrations
 */
export function runMigrations(): void {
  try {
    // Future migrations would go here
    // For now, table creation is handled in model constructors
    logger.info('Database migrations completed');
  } catch (error) {
    logger.error('Failed to run migrations:', error);
    throw error;
  }
}

/**
 * Seed the database with initial data (for development)
 */
export async function seedDatabase(): Promise<void> {
  if (!config.isDevelopment) {
    logger.warn('Database seeding is only available in development mode');
    return;
  }

  try {
    const models = getModels();
    
    // Check if data already exists
    const existingUsers = models.users.findByEmail('test@example.com');
    if (existingUsers) {
      logger.info('Database already seeded');
      return;
    }

    // Create test user
    const testUser = await models.users.create({
      email: 'test@example.com',
      name: 'Test User',
      googleId: 'test-google-id'
    });

    // Create test contacts
    const contacts = [
      {
        userId: testUser.id,
        name: 'John Doe',
        email: 'john@example.com',
        relationship: 'Friend',
        defaultAttendance: 'SHOULD' as const
      },
      {
        userId: testUser.id,
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+1234567890',
        relationship: 'Family',
        defaultAttendance: 'MUST' as const
      }
    ];

    for (const contact of contacts) {
      await models.contacts.create(contact);
    }

    // Create test events
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);

    const event = await models.events.create({
      userId: testUser.id,
      title: 'Team Meeting',
      description: 'Weekly team sync',
      location: 'Conference Room A',
      startTime: tomorrow,
      endTime: new Date(tomorrow.getTime() + 60 * 60 * 1000), // 1 hour later
      isAllDay: false,
      reminders: [
        { type: 'popup', minutes: 15 },
        { type: 'email', minutes: 60 }
      ],
      attendees: [
        {
          email: 'john@example.com',
          name: 'John Doe',
          responseStatus: 'accepted'
        }
      ]
    });

    logger.info('Database seeded successfully');
  } catch (error) {
    logger.error('Failed to seed database:', error);
    throw error;
  }
}

// Export database utilities
export default {
  initializeDatabase,
  getDatabase,
  getModels,
  closeDatabase,
  runMigrations,
  seedDatabase
};