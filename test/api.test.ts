import request from 'supertest';
import express from 'express';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Simple test for the API endpoints
describe('API Endpoints', () => {
  let app: express.Application;
  let db: Database.Database;

  beforeAll(() => {
    // Create express app
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Setup in-memory database
    db = new Database(':memory:');

    // Create users table
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password TEXT NOT NULL,
        googleId TEXT UNIQUE,
        refreshToken TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);

    // Create events table
    db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        startTime TEXT NOT NULL,
        endTime TEXT NOT NULL,
        location TEXT,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id)
      )
    `);

    // Health check endpoint
    app.get('/api/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        message: 'Kiro Calendar Assistant is running',
        timestamp: new Date().toISOString()
      });
    });

    // NLP parse endpoint
    app.post('/api/calendar/parse', (req, res) => {
      const { command } = req.body;
      const lowerCommand = (command || '').toLowerCase();
      
      let parsedCommand;
      if (lowerCommand.includes('meeting')) {
        parsedCommand = {
          intent: 'CREATE_EVENT',
          confidence: 0.8,
          entities: { title: 'Meeting' }
        };
      } else if (lowerCommand.includes('list')) {
        parsedCommand = {
          intent: 'LIST_EVENTS',
          confidence: 0.9,
          entities: {}
        };
      } else {
        parsedCommand = {
          intent: 'UNKNOWN',
          confidence: 0.3,
          entities: {}
        };
      }

      res.json({
        ...parsedCommand,
        originalText: command
      });
    });

    // Register endpoint
    app.post('/api/auth/register', async (req, res) => {
      const { name, email, password } = req.body;

      // Check if user exists
      const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create user
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      
      db.prepare(`
        INSERT INTO users (id, email, name, password, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(userId, email, name, hashedPassword, now, now);

      // Get created user
      const user = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(userId) as any;

      // Generate token
      const token = jwt.sign(
        { id: user.id, email: user.email },
        'test-secret',
        { expiresIn: '7d' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      });
    });
  });

  afterAll(() => {
    if (db) {
      db.close();
    }
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.message).toBe('Kiro Calendar Assistant is running');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('NLP Command Parsing', () => {
    it('should parse meeting creation command', async () => {
      const command = 'Schedule a meeting with John';

      const response = await request(app)
        .post('/api/calendar/parse')
        .send({ command })
        .expect(200);

      expect(response.body.intent).toBe('CREATE_EVENT');
      expect(response.body.originalText).toBe(command);
      expect(response.body.entities.title).toBe('Meeting');
      expect(response.body.confidence).toBe(0.8);
    });

    it('should parse list events command', async () => {
      const command = 'List my events';

      const response = await request(app)
        .post('/api/calendar/parse')
        .send({ command })
        .expect(200);

      expect(response.body.intent).toBe('LIST_EVENTS');
      expect(response.body.originalText).toBe(command);
      expect(response.body.confidence).toBe(0.9);
    });

    it('should handle unknown commands', async () => {
      const command = 'Random text';

      const response = await request(app)
        .post('/api/calendar/parse')
        .send({ command })
        .expect(200);

      expect(response.body.intent).toBe('UNKNOWN');
      expect(response.body.confidence).toBe(0.3);
    });
  });

  describe('User Registration', () => {
    it('should register a new user', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(200);

      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.name).toBe(userData.name);
      expect(response.body.user.id).toBeDefined();
    });

    it('should not register user with existing email', async () => {
      const userData = {
        name: 'Test User 2',
        email: 'test@example.com',
        password: 'password123'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);
    });
  });
});

// Simple database operations test
describe('Database Operations', () => {
  let db: Database.Database;

  beforeAll(() => {
    db = new Database(':memory:');
    
    // Create users table
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);
  });

  afterAll(() => {
    if (db) {
      db.close();
    }
  });

  it('should create and retrieve a user', () => {
    const userId = 'test-user-1';
    const userData = {
      id: userId,
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashed-password',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Insert user
    const insertStmt = db.prepare(`
      INSERT INTO users (id, email, name, password, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = insertStmt.run(
      userData.id,
      userData.email,
      userData.name,
      userData.password,
      userData.createdAt,
      userData.updatedAt
    );

    expect(result.changes).toBe(1);

    // Retrieve user
    const selectStmt = db.prepare('SELECT * FROM users WHERE id = ?');
    const user = selectStmt.get(userId) as any;

    expect(user.email).toBe(userData.email);
    expect(user.name).toBe(userData.name);
  });

  it('should enforce unique email constraint', () => {
    const userData1 = {
      id: 'user-1',
      email: 'unique@example.com',
      name: 'User 1',
      password: 'password1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const userData2 = {
      id: 'user-2',
      email: 'unique@example.com', // Same email
      name: 'User 2',
      password: 'password2',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const insertStmt = db.prepare(`
      INSERT INTO users (id, email, name, password, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    // First insert should succeed
    insertStmt.run(
      userData1.id,
      userData1.email,
      userData1.name,
      userData1.password,
      userData1.createdAt,
      userData1.updatedAt
    );

    // Second insert should fail due to unique constraint
    expect(() => {
      insertStmt.run(
        userData2.id,
        userData2.email,
        userData2.name,
        userData2.password,
        userData2.createdAt,
        userData2.updatedAt
      );
    }).toThrow();
  });
});

// Simple utility functions test
describe('Utility Functions', () => {
  it('should hash and verify passwords', async () => {
    const password = 'testPassword123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    expect(hashedPassword).toBeDefined();
    expect(hashedPassword).not.toBe(password);
    
    const isValid = await bcrypt.compare(password, hashedPassword);
    expect(isValid).toBe(true);
    
    const isInvalid = await bcrypt.compare('wrongPassword', hashedPassword);
    expect(isInvalid).toBe(false);
  });

  it('should generate and verify JWT tokens', () => {
    const payload = { id: 'user123', email: 'test@example.com' };
    const secret = 'test-secret';
    
    const token = jwt.sign(payload, secret, { expiresIn: '1h' });
    expect(token).toBeDefined();
    
    const decoded = jwt.verify(token, secret) as any;
    expect(decoded.id).toBe(payload.id);
    expect(decoded.email).toBe(payload.email);
  });
});