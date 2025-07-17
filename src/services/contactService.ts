import { google, people_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { Contact } from '../types';
import { logger } from '../utils/logger';
import { config } from '../config';
import databaseService from './databaseService';
import { v4 as uuidv4 } from 'uuid';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';
import * as vCard from 'vcard-parser';

export class ContactService {
  private oauth2Client: OAuth2Client;
  private people: people_v1.People;

  constructor() {
    this.oauth2Client = new OAuth2Client(
      config.google.clientId,
      config.google.clientSecret,
      config.google.redirectUri
    );

    this.people = google.people({ version: 'v1' });
  }

  /**
   * Set OAuth2 credentials for Google Contacts API
   * @param tokens OAuth2 tokens
   */
  setCredentials(tokens: any) {
    this.oauth2Client.setCredentials(tokens);
  }

  /**
   * Create a new contact
   * @param contact Contact data
   * @returns Created contact
   */
  async createContact(contact: Partial<Contact>): Promise<Contact> {
    try {
      logger.info('Creating new contact');
      
      // Validate required fields
      if (!contact.userId) {
        throw new Error('User ID is required');
      }

      if (!contact.name && !contact.email && !contact.phone) {
        throw new Error('At least one of name, email, or phone is required');
      }

      // Check for duplicates
      if (contact.email) {
        const existingContact = await this.findContactByEmail(contact.userId, contact.email);
        if (existingContact) {
          throw new Error('Contact with this email already exists');
        }
      }

      // Validate and format phone number
      if (contact.phone) {
        try {
          if (isValidPhoneNumber(contact.phone)) {
            const phoneNumber = parsePhoneNumber(contact.phone);
            contact.phone = phoneNumber.formatInternational();
          }
        } catch (error) {
          logger.warn('Invalid phone number format, storing as-is');
        }
      }

      // Generate unique ID
      const contactId = contact.id || uuidv4();

      // Create contact object
      const newContact: Contact = {
        id: contactId,
        userId: contact.userId,
        name: contact.name || '',
        email: contact.email || '',
        phone: contact.phone || '',
        company: contact.company,
        jobTitle: contact.jobTitle,
        notes: contact.notes,
        tags: contact.tags || [],
        customFields: contact.customFields || {},
        lastContactedAt: contact.lastContactedAt,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save to database
      await databaseService.db?.run(
        `INSERT INTO contacts (
          id, user_id, name, email, phone, company, job_title,
          notes, tags, custom_fields, last_contacted_at,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newContact.id,
          newContact.userId,
          newContact.name,
          newContact.email,
          newContact.phone,
          newContact.company,
          newContact.jobTitle,
          newContact.notes,
          JSON.stringify(newContact.tags),
          JSON.stringify(newContact.customFields),
          newContact.lastContactedAt?.toISOString(),
          newContact.createdAt.toISOString(),
          newContact.updatedAt.toISOString()
        ]
      );

      logger.info(`Contact created successfully: ${newContact.id}`);
      return newContact;
    } catch (error) {
      logger.error('Error creating contact:', error);
      throw error;
    }
  }

  /**
   * Update an existing contact
   * @param contactId Contact ID
   * @param updates Contact updates
   * @returns Updated contact
   */
  async updateContact(contactId: string, updates: Partial<Contact>): Promise<Contact> {
    try {
      logger.info(`Updating contact: ${contactId}`);
      
      // Get existing contact
      const existingContact = await this.getContact(contactId);
      if (!existingContact) {
        throw new Error('Contact not found');
      }

      // Check for email duplicates if email is being updated
      if (updates.email && updates.email !== existingContact.email) {
        const duplicateContact = await this.findContactByEmail(existingContact.userId, updates.email);
        if (duplicateContact) {
          throw new Error('Another contact with this email already exists');
        }
      }

      // Validate and format phone number if being updated
      if (updates.phone) {
        try {
          if (isValidPhoneNumber(updates.phone)) {
            const phoneNumber = parsePhoneNumber(updates.phone);
            updates.phone = phoneNumber.formatInternational();
          }
        } catch (error) {
          logger.warn('Invalid phone number format, storing as-is');
        }
      }

      // Update contact
      const updatedContact = {
        ...existingContact,
        ...updates,
        updatedAt: new Date()
      };

      await databaseService.db?.run(
        `UPDATE contacts SET
          name = ?, email = ?, phone = ?, company = ?, job_title = ?,
          notes = ?, tags = ?, custom_fields = ?, last_contacted_at = ?,
          updated_at = ?
        WHERE id = ?`,
        [
          updatedContact.name,
          updatedContact.email,
          updatedContact.phone,
          updatedContact.company,
          updatedContact.jobTitle,
          updatedContact.notes,
          JSON.stringify(updatedContact.tags),
          JSON.stringify(updatedContact.customFields),
          updatedContact.lastContactedAt?.toISOString(),
          updatedContact.updatedAt.toISOString(),
          contactId
        ]
      );

      logger.info(`Contact updated successfully: ${contactId}`);
      return updatedContact;
    } catch (error) {
      logger.error('Error updating contact:', error);
      throw error;
    }
  }

  /**
   * Delete a contact
   * @param contactId Contact ID
   * @returns Success status
   */
  async deleteContact(contactId: string): Promise<boolean> {
    try {
      logger.info(`Deleting contact: ${contactId}`);
      
      // Check if contact exists
      const contact = await this.getContact(contactId);
      if (!contact) {
        throw new Error('Contact not found');
      }

      // Delete from database
      await databaseService.db?.run('DELETE FROM contacts WHERE id = ?', [contactId]);

      logger.info(`Contact deleted successfully: ${contactId}`);
      return true;
    } catch (error) {
      logger.error('Error deleting contact:', error);
      throw error;
    }
  }

  /**
   * Get a contact by ID
   * @param contactId Contact ID
   * @returns Contact or null
   */
  async getContact(contactId: string): Promise<Contact | null> {
    try {
      const contact = await databaseService.db?.get<Contact>(
        'SELECT * FROM contacts WHERE id = ?',
        [contactId]
      );

      if (contact) {
        // Parse JSON fields
        contact.tags = JSON.parse(contact.tags as any || '[]');
        contact.customFields = JSON.parse(contact.customFields as any || '{}');
        
        // Convert date strings back to Date objects
        if (contact.lastContactedAt) {
          contact.lastContactedAt = new Date(contact.lastContactedAt);
        }
        contact.createdAt = new Date(contact.createdAt);
        contact.updatedAt = new Date(contact.updatedAt);
      }

      return contact || null;
    } catch (error) {
      logger.error('Error getting contact:', error);
      throw error;
    }
  }

  /**
   * Search contacts by name or email
   * @param userId User ID
   * @param query Search query
   * @param limit Maximum number of results
   * @returns Array of matching contacts
   */
  async searchContacts(userId: string, query: string, limit: number = 20): Promise<Contact[]> {
    try {
      logger.info(`Searching contacts for user ${userId} with query: ${query}`);
      
      const searchQuery = `%${query}%`;
      const contacts = await databaseService.db?.all<Contact[]>(
        `SELECT * FROM contacts
         WHERE user_id = ? AND (
           name LIKE ? OR
           email LIKE ? OR
           phone LIKE ? OR
           company LIKE ? OR
           notes LIKE ?
         )
         ORDER BY name ASC
         LIMIT ?`,
        [userId, searchQuery, searchQuery, searchQuery, searchQuery, searchQuery, limit]
      );

      // Parse JSON fields for each contact
      if (contacts) {
        for (const contact of contacts) {
          contact.tags = JSON.parse(contact.tags as any || '[]');
          contact.customFields = JSON.parse(contact.customFields as any || '{}');
          
          if (contact.lastContactedAt) {
            contact.lastContactedAt = new Date(contact.lastContactedAt);
          }
          contact.createdAt = new Date(contact.createdAt);
          contact.updatedAt = new Date(contact.updatedAt);
        }
      }

      return contacts || [];
    } catch (error) {
      logger.error('Error searching contacts:', error);
      throw error;
    }
  }

  /**
   * Get all contacts for a user
   * @param userId User ID
   * @param options Query options
   * @returns Array of contacts
   */
  async getAllContacts(
    userId: string,
    options?: {
      sortBy?: 'name' | 'email' | 'createdAt' | 'updatedAt';
      sortOrder?: 'ASC' | 'DESC';
      limit?: number;
      offset?: number;
      tags?: string[];
    }
  ): Promise<Contact[]> {
    try {
      logger.info(`Getting all contacts for user: ${userId}`);
      
      let query = 'SELECT * FROM contacts WHERE user_id = ?';
      const params: any[] = [userId];

      // Filter by tags if provided
      if (options?.tags && options.tags.length > 0) {
        query += ' AND (';
        options.tags.forEach((tag, index) => {
          if (index > 0) query += ' OR ';
          query += ' tags LIKE ?';
          params.push(`%"${tag}"%`);
        });
        query += ')';
      }

      // Add sorting
      const sortBy = options?.sortBy || 'name';
      const sortOrder = options?.sortOrder || 'ASC';
      query += ` ORDER BY ${sortBy} ${sortOrder}`;

      // Add pagination
      if (options?.limit) {
        query += ' LIMIT ?';
        params.push(options.limit);
        
        if (options.offset) {
          query += ' OFFSET ?';
          params.push(options.offset);
        }
      }

      const contacts = await databaseService.db?.all<Contact[]>(query, params);

      // Parse JSON fields for each contact
      if (contacts) {
        for (const contact of contacts) {
          contact.tags = JSON.parse(contact.tags as any || '[]');
          contact.customFields = JSON.parse(contact.customFields as any || '{}');
          
          if (contact.lastContactedAt) {
            contact.lastContactedAt = new Date(contact.lastContactedAt);
          }
          contact.createdAt = new Date(contact.createdAt);
          contact.updatedAt = new Date(contact.updatedAt);
        }
      }

      return contacts || [];
    } catch (error) {
      logger.error('Error getting all contacts:', error);
      throw error;
    }
  }

  /**
   * Import contacts from Google Contacts
   * @param userId User ID
   * @returns Number of imported contacts
   */
  async importFromGoogle(userId: string): Promise<number> {
    try {
      logger.info(`Importing contacts from Google for user ${userId}`);
      
      if (!this.oauth2Client.credentials.access_token) {
        throw new Error('User not authenticated with Google');
      }

      const response = await this.people.people.connections.list({
        resourceName: 'people/me',
        pageSize: 100,
        personFields: 'names,emailAddresses,phoneNumbers,organizations,biographies',
        auth: this.oauth2Client
      });

      const connections = response.data.connections || [];
      let importedCount = 0;

      for (const person of connections) {
        const primaryName = person.names?.[0];
        const primaryEmail = person.emailAddresses?.[0];
        const primaryPhone = person.phoneNumbers?.[0];
        const primaryOrg = person.organizations?.[0];
        const primaryBio = person.biographies?.[0];

        if (!primaryName && !primaryEmail && !primaryPhone) {
          continue; // Skip contacts without basic information
        }

        // Check if contact already exists
        if (primaryEmail?.value) {
          const existingContact = await this.findContactByEmail(userId, primaryEmail.value);
          if (existingContact) {
            continue; // Skip duplicates
          }
        }

        // Create contact
        await this.createContact({
          userId,
          name: primaryName ? `${primaryName.givenName || ''} ${primaryName.familyName || ''}`.trim() : '',
          email: primaryEmail?.value || '',
          phone: primaryPhone?.value || '',
          company: primaryOrg?.name,
          jobTitle: primaryOrg?.title,
          notes: primaryBio?.value,
          tags: ['imported-from-google']
        });

        importedCount++;
      }

      logger.info(`Imported ${importedCount} contacts from Google`);
      return importedCount;
    } catch (error) {
      logger.error('Error importing from Google Contacts:', error);
      throw error;
    }
  }

  /**
   * Import contacts from vCard data
   * @param userId User ID
   * @param vCardData vCard string data
   * @returns Number of imported contacts
   */
  async importFromVCard(userId: string, vCardData: string): Promise<number> {
    try {
      logger.info(`Importing contacts from vCard for user ${userId}`);
      
      const vcards = vCard.parse(vCardData);
      let importedCount = 0;

      for (const vcard of vcards) {
        const name = vcard.fn?.[0]?.value || '';
        const email = vcard.email?.[0]?.value || '';
        const phone = vcard.tel?.[0]?.value || '';
        const org = vcard.org?.[0]?.value || '';
        const title = vcard.title?.[0]?.value || '';
        const note = vcard.note?.[0]?.value || '';

        if (!name && !email && !phone) {
          continue; // Skip contacts without basic information
        }

        // Check if contact already exists
        if (email) {
          const existingContact = await this.findContactByEmail(userId, email);
          if (existingContact) {
            continue; // Skip duplicates
          }
        }

        // Create contact
        await this.createContact({
          userId,
          name,
          email,
          phone,
          company: org,
          jobTitle: title,
          notes: note,
          tags: ['imported-from-vcard']
        });

        importedCount++;
      }

      logger.info(`Imported ${importedCount} contacts from vCard`);
      return importedCount;
    } catch (error) {
      logger.error('Error importing from vCard:', error);
      throw error;
    }
  }

  /**
   * Import contacts from CSV data
   * @param userId User ID
   * @param csvData CSV data array
   * @param mapping Field mapping
   * @returns Number of imported contacts
   */
  async importFromCSV(
    userId: string,
    csvData: any[],
    mapping: {
      name?: string;
      email?: string;
      phone?: string;
      company?: string;
      jobTitle?: string;
      notes?: string;
    }
  ): Promise<number> {
    try {
      logger.info(`Importing contacts from CSV for user ${userId}`);
      
      let importedCount = 0;

      for (const row of csvData) {
        const contact: Partial<Contact> = {
          userId,
          tags: ['imported-from-csv']
        };

        // Map CSV fields to contact fields
        if (mapping.name && row[mapping.name]) {
          contact.name = row[mapping.name].trim();
        }
        if (mapping.email && row[mapping.email]) {
          contact.email = row[mapping.email].trim().toLowerCase();
        }
        if (mapping.phone && row[mapping.phone]) {
          contact.phone = row[mapping.phone].trim();
        }
        if (mapping.company && row[mapping.company]) {
          contact.company = row[mapping.company].trim();
        }
        if (mapping.jobTitle && row[mapping.jobTitle]) {
          contact.jobTitle = row[mapping.jobTitle].trim();
        }
        if (mapping.notes && row[mapping.notes]) {
          contact.notes = row[mapping.notes].trim();
        }

        // Skip if no basic information
        if (!contact.name && !contact.email && !contact.phone) {
          continue;
        }

        // Check for duplicates
        if (contact.email) {
          const existingContact = await this.findContactByEmail(userId, contact.email);
          if (existingContact) {
            continue;
          }
        }

        // Create contact
        await this.createContact(contact);
        importedCount++;
      }

      logger.info(`Imported ${importedCount} contacts from CSV`);
      return importedCount;
    } catch (error) {
      logger.error('Error importing from CSV:', error);
      throw error;
    }
  }

  /**
   * Get contacts associated with a calendar event
   * @param eventId Event ID
   * @returns Array of contacts
   */
  async getEventContacts(eventId: string): Promise<Contact[]> {
    try {
      // Get event details
      const event = await databaseService.db?.get(
        'SELECT attendees FROM calendar_events WHERE id = ?',
        [eventId]
      );

      if (!event || !event.attendees) {
        return [];
      }

      const attendeeEmails = JSON.parse(event.attendees);
      const contacts: Contact[] = [];

      // Find contacts for each attendee email
      for (const email of attendeeEmails) {
        const contact = await this.findContactByEmail(null, email);
        if (contact) {
          contacts.push(contact);
        }
      }

      return contacts;
    } catch (error) {
      logger.error('Error getting event contacts:', error);
      throw error;
    }
  }

  /**
   * Update last contacted date for a contact
   * @param contactId Contact ID
   * @param date Contact date
   */
  async updateLastContacted(contactId: string, date: Date = new Date()): Promise<void> {
    try {
      await databaseService.db?.run(
        'UPDATE contacts SET last_contacted_at = ?, updated_at = ? WHERE id = ?',
        [date.toISOString(), new Date().toISOString(), contactId]
      );
    } catch (error) {
      logger.error('Error updating last contacted date:', error);
      throw error;
    }
  }

  /**
   * Find contact by email
   * @param userId Optional user ID to scope the search
   * @param email Email address
   * @returns Contact or null
   */
  private async findContactByEmail(userId: string | null, email: string): Promise<Contact | null> {
    try {
      let query = 'SELECT * FROM contacts WHERE email = ?';
      const params: any[] = [email.toLowerCase()];

      if (userId) {
        query += ' AND user_id = ?';
        params.push(userId);
      }

      const contact = await databaseService.db?.get<Contact>(query, params);

      if (contact) {
        contact.tags = JSON.parse(contact.tags as any || '[]');
        contact.customFields = JSON.parse(contact.customFields as any || '{}');
        
        if (contact.lastContactedAt) {
          contact.lastContactedAt = new Date(contact.lastContactedAt);
        }
        contact.createdAt = new Date(contact.createdAt);
        contact.updatedAt = new Date(contact.updatedAt);
      }

      return contact || null;
    } catch (error) {
      logger.error('Error finding contact by email:', error);
      throw error;
    }
  }
}

export default new ContactService();