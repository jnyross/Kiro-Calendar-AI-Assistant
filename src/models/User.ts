import { Database } from 'better-sqlite3';

export interface IUser {
  id: string;
  email: string;
  name: string;
  googleId?: string;
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class UserModel {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
    this.createTable();
  }

  private createTable(): void {
    const sql = `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        googleId TEXT UNIQUE,
        refreshToken TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `;
    this.db.prepare(sql).run();
  }

  async create(user: Omit<IUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<IUser> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const sql = `
      INSERT INTO users (id, email, name, googleId, refreshToken, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    this.db.prepare(sql).run(
      id,
      user.email,
      user.name,
      user.googleId || null,
      user.refreshToken || null,
      now,
      now
    );

    return this.findById(id)!;
  }

  findById(id: string): IUser | null {
    const sql = 'SELECT * FROM users WHERE id = ?';
    const row = this.db.prepare(sql).get(id) as any;
    
    if (!row) return null;
    
    return {
      ...row,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    };
  }

  findByEmail(email: string): IUser | null {
    const sql = 'SELECT * FROM users WHERE email = ?';
    const row = this.db.prepare(sql).get(email) as any;
    
    if (!row) return null;
    
    return {
      ...row,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    };
  }

  findByGoogleId(googleId: string): IUser | null {
    const sql = 'SELECT * FROM users WHERE googleId = ?';
    const row = this.db.prepare(sql).get(googleId) as any;
    
    if (!row) return null;
    
    return {
      ...row,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    };
  }

  async update(id: string, updates: Partial<Omit<IUser, 'id' | 'createdAt'>>): Promise<IUser | null> {
    const user = this.findById(id);
    if (!user) return null;

    const fields = Object.keys(updates).filter(key => key !== 'id' && key !== 'createdAt');
    const values = fields.map(field => (updates as any)[field]);
    values.push(new Date().toISOString());
    values.push(id);

    const sql = `
      UPDATE users 
      SET ${fields.map(field => `${field} = ?`).join(', ')}, updatedAt = ?
      WHERE id = ?
    `;

    this.db.prepare(sql).run(...values);
    return this.findById(id);
  }

  async updateRefreshToken(id: string, refreshToken: string | null): Promise<void> {
    const sql = 'UPDATE users SET refreshToken = ?, updatedAt = ? WHERE id = ?';
    this.db.prepare(sql).run(refreshToken, new Date().toISOString(), id);
  }

  async delete(id: string): Promise<boolean> {
    const sql = 'DELETE FROM users WHERE id = ?';
    const result = this.db.prepare(sql).run(id);
    return result.changes > 0;
  }
}