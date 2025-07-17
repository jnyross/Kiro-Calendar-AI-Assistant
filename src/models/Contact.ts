import { Database } from 'better-sqlite3';
import { AttendancePriority } from '../types/attendance';

export interface IContact {
  id: string;
  userId: string;
  name: string;
  email?: string;
  phone?: string;
  relationship?: string;
  defaultAttendance: AttendancePriority;
  createdAt: Date;
  updatedAt: Date;
}

export class ContactModel {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
    this.createTable();
  }

  private createTable(): void {
    const sql = `
      CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        relationship TEXT,
        defaultAttendance TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `;
    this.db.prepare(sql).run();

    // Create index for better performance
    this.db.prepare('CREATE INDEX IF NOT EXISTS idx_contacts_userId ON contacts(userId)').run();
    this.db.prepare('CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email)').run();
  }

  async create(contact: Omit<IContact, 'id' | 'createdAt' | 'updatedAt'>): Promise<IContact> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const sql = `
      INSERT INTO contacts (id, userId, name, email, phone, relationship, defaultAttendance, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    this.db.prepare(sql).run(
      id,
      contact.userId,
      contact.name,
      contact.email || null,
      contact.phone || null,
      contact.relationship || null,
      contact.defaultAttendance,
      now,
      now
    );

    return this.findById(id)!;
  }

  findById(id: string): IContact | null {
    const sql = 'SELECT * FROM contacts WHERE id = ?';
    const row = this.db.prepare(sql).get(id) as any;
    
    if (!row) return null;
    
    return {
      ...row,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    };
  }

  findByUserId(userId: string): IContact[] {
    const sql = 'SELECT * FROM contacts WHERE userId = ? ORDER BY name';
    const rows = this.db.prepare(sql).all(userId) as any[];
    
    return rows.map(row => ({
      ...row,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    }));
  }

  searchByName(userId: string, query: string): IContact[] {
    const sql = 'SELECT * FROM contacts WHERE userId = ? AND name LIKE ? ORDER BY name';
    const rows = this.db.prepare(sql).all(userId, `%${query}%`) as any[];
    
    return rows.map(row => ({
      ...row,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    }));
  }

  findByEmail(userId: string, email: string): IContact | null {
    const sql = 'SELECT * FROM contacts WHERE userId = ? AND email = ?';
    const row = this.db.prepare(sql).get(userId, email) as any;
    
    if (!row) return null;
    
    return {
      ...row,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    };
  }

  async update(id: string, updates: Partial<Omit<IContact, 'id' | 'userId' | 'createdAt'>>): Promise<IContact | null> {
    const contact = this.findById(id);
    if (!contact) return null;

    const fields = Object.keys(updates).filter(key => key !== 'id' && key !== 'userId' && key !== 'createdAt');
    const values = fields.map(field => (updates as any)[field]);
    values.push(new Date().toISOString());
    values.push(id);

    const sql = `
      UPDATE contacts 
      SET ${fields.map(field => `${field} = ?`).join(', ')}, updatedAt = ?
      WHERE id = ?
    `;

    this.db.prepare(sql).run(...values);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const sql = 'DELETE FROM contacts WHERE id = ?';
    const result = this.db.prepare(sql).run(id);
    return result.changes > 0;
  }

  async deleteByUserId(userId: string): Promise<number> {
    const sql = 'DELETE FROM contacts WHERE userId = ?';
    const result = this.db.prepare(sql).run(userId);
    return result.changes;
  }

  async importContacts(userId: string, contacts: Omit<IContact, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[]): Promise<IContact[]> {
    const imported: IContact[] = [];
    
    const transaction = this.db.transaction(() => {
      for (const contact of contacts) {
        // Check if contact with same email already exists
        if (contact.email) {
          const existing = this.findByEmail(userId, contact.email);
          if (existing) {
            // Update existing contact
            const updated = this.update(existing.id, contact);
            if (updated) imported.push(updated);
            continue;
          }
        }
        
        // Create new contact
        const created = this.create({ ...contact, userId });
        imported.push(created);
      }
    });
    
    transaction();
    return imported;
  }
}