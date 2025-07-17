import { initializeDatabase, getModels, getDatabase, closeDatabase, runMigrations, seedDatabase } from '../models';
import { IUser, IContact, ICalendarEvent } from '../models';
import { logger } from '../utils/logger';
import config from '../config';
import { User } from '../types';
import Database from 'better-sqlite3';

export class DatabaseService {
  private initialized = false;
  public db?: Database.Database;

  constructor() {
    // Initialization will be done explicitly
  }

  /**
   * Initialize database connection
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('Database service already initialized');
      return;
    }

    try {
      logger.info('Initializing database service');
      
      // Initialize database and models
      initializeDatabase();
      
      // Get database instance directly
      this.db = getDatabase();
      
      // Run migrations
      runMigrations();
      
      // Seed database in development
      if (config.isDevelopment) {
        await seedDatabase();
      }
      
      this.initialized = true;
      logger.info('Database service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database service:', error);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    logger.info('Closing database connection');
    closeDatabase();
    this.initialized = false;
  }

  // User operations
  /**
   * Create a new user
   * @param userData User data
   * @returns Created user
   */
  async createUser(userData: Omit<IUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<IUser> {
    const models = getModels();
    return models.users.create(userData);
  }

  /**
   * Find a user by ID
   * @param id User ID
   * @returns User or null
   */
  async getUserById(id: string): Promise<IUser | null> {
    const models = getModels();
    return models.users.findById(id);
  }

  /**
   * Find a user by email
   * @param email User email
   * @returns User or null
   */
  async getUserByEmail(email: string): Promise<IUser | null> {
    const models = getModels();
    return models.users.findByEmail(email);
  }

  /**
   * Find a user by Google ID
   * @param googleId Google ID
   * @returns User or null
   */
  async getUserByGoogleId(googleId: string): Promise<IUser | null> {
    const models = getModels();
    return models.users.findByGoogleId(googleId);
  }

  /**
   * Update a user
   * @param id User ID
   * @param updates Update data
   * @returns Updated user or null
   */
  async updateUser(id: string, updates: Partial<Omit<IUser, 'id' | 'createdAt'>>): Promise<IUser | null> {
    const models = getModels();
    return models.users.update(id, updates);
  }

  /**
   * Update user refresh token
   * @param id User ID
   * @param refreshToken New refresh token
   */
  async updateUserRefreshToken(id: string, refreshToken: string | null): Promise<void> {
    const models = getModels();
    return models.users.updateRefreshToken(id, refreshToken);
  }

  // Contact operations
  /**
   * Create a new contact
   * @param contactData Contact data
   * @returns Created contact
   */
  async createContact(contactData: Omit<IContact, 'id' | 'createdAt' | 'updatedAt'>): Promise<IContact> {
    const models = getModels();
    return models.contacts.create(contactData);
  }

  /**
   * Find a contact by ID
   * @param id Contact ID
   * @returns Contact or null
   */
  async getContactById(id: string): Promise<IContact | null> {
    const models = getModels();
    return models.contacts.findById(id);
  }

  /**
   * Find contacts by user ID
   * @param userId User ID
   * @returns Array of contacts
   */
  async getContactsByUserId(userId: string): Promise<IContact[]> {
    const models = getModels();
    return models.contacts.findByUserId(userId);
  }

  /**
   * Search contacts by name
   * @param userId User ID
   * @param query Search query
   * @returns Array of matching contacts
   */
  async searchContacts(userId: string, query: string): Promise<IContact[]> {
    const models = getModels();
    return models.contacts.searchByName(userId, query);
  }

  /**
   * Update a contact
   * @param id Contact ID
   * @param updates Update data
   * @returns Updated contact or null
   */
  async updateContact(id: string, updates: Partial<Omit<IContact, 'id' | 'userId' | 'createdAt'>>): Promise<IContact | null> {
    const models = getModels();
    return models.contacts.update(id, updates);
  }

  /**
   * Delete a contact
   * @param id Contact ID
   * @returns True if deleted
   */
  async deleteContact(id: string): Promise<boolean> {
    const models = getModels();
    return models.contacts.delete(id);
  }

  /**
   * Import multiple contacts
   * @param userId User ID
   * @param contacts Array of contacts to import
   * @returns Array of imported contacts
   */
  async importContacts(userId: string, contacts: Omit<IContact, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[]): Promise<IContact[]> {
    const models = getModels();
    return models.contacts.importContacts(userId, contacts);
  }

  // Calendar event operations
  /**
   * Create a new event
   * @param eventData Event data
   * @returns Created event
   */
  async createEvent(eventData: Omit<ICalendarEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<ICalendarEvent> {
    const models = getModels();
    return models.events.create(eventData);
  }

  /**
   * Find an event by ID
   * @param id Event ID
   * @returns Event or null
   */
  async getEventById(id: string): Promise<ICalendarEvent | null> {
    const models = getModels();
    return models.events.findById(id);
  }

  /**
   * Find events by user ID
   * @param userId User ID
   * @param startDate Optional start date filter
   * @param endDate Optional end date filter
   * @returns Array of events
   */
  async getEventsByUserId(userId: string, startDate?: Date, endDate?: Date): Promise<ICalendarEvent[]> {
    const models = getModels();
    return models.events.findByUserId(userId, startDate, endDate);
  }

  /**
   * Find an event by Google Event ID
   * @param googleEventId Google Event ID
   * @returns Event or null
   */
  async getEventByGoogleId(googleEventId: string): Promise<ICalendarEvent | null> {
    const models = getModels();
    return models.events.findByGoogleEventId(googleEventId);
  }

  /**
   * Update an event
   * @param id Event ID
   * @param updates Update data
   * @returns Updated event or null
   */
  async updateEvent(id: string, updates: Partial<Omit<ICalendarEvent, 'id' | 'userId' | 'createdAt'>>): Promise<ICalendarEvent | null> {
    const models = getModels();
    return models.events.update(id, updates);
  }

  /**
   * Delete an event
   * @param id Event ID
   * @returns True if deleted
   */
  async deleteEvent(id: string): Promise<boolean> {
    const models = getModels();
    return models.events.delete(id);
  }

  /**
   * Check for conflicting events
   * @param userId User ID
   * @param startTime Event start time
   * @param endTime Event end time
   * @param excludeEventId Optional event ID to exclude from conflict check
   * @returns Array of conflicting events
   */
  async checkEventConflicts(userId: string, startTime: Date, endTime: Date, excludeEventId?: string): Promise<ICalendarEvent[]> {
    const models = getModels();
    return models.events.checkConflicts(userId, startTime, endTime, excludeEventId);
  }

  /**
   * Find a user by ID (alias for getUserById)
   * @param id User ID
   * @returns User or null
   */
  async findUserById(id: string): Promise<IUser | null> {
    return this.getUserById(id);
  }

  /**
   * Save a user (create or update)
   * @param userData User data
   * @returns Saved user
   */
  async saveUser(userData: User): Promise<User> {
    if (userData.id) {
      // Update existing user
      const updated = await this.updateUser(userData.id, userData);
      if (!updated) {
        throw new Error('Failed to update user');
      }
      return updated as User;
    } else {
      // Create new user
      const created = await this.createUser(userData as any);
      return created as User;
    }
  }
}

// Re-export initializeDatabase for backward compatibility
export { initializeDatabase };

export default new DatabaseService();