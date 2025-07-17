const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const fs = require('fs');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database setup for Vercel (use SQLite with persistent storage)
let db;
try {
  // In production, use /tmp directory for SQLite
  const dbPath = process.env.NODE_ENV === 'production' ? '/tmp/kiro.db' : path.join(__dirname, '..', 'data', 'kiro.db');
  
  // Ensure parent directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  db = new Database(dbPath);
  console.log('Database connected successfully');
} catch (error) {
  console.error('Database connection error:', error);
  // Fallback to in-memory database
  db = new Database(':memory:');
}

// Create tables
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

// Helper function to generate JWT
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET || 'prod-jwt-secret-change-me',
    { expiresIn: '7d' }
  );
}

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'prod-jwt-secret-change-me');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Kiro Calendar Assistant is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Sign up
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

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
    const user = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(userId);

    // Generate token
    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// Sign in
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to sign in' });
  }
});

// Get user profile (protected route)
app.get('/api/auth/me', authenticateToken, (req, res) => {
  try {
    const user = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// NLP endpoint with simple parsing
app.post('/api/calendar/parse', async (req, res) => {
  try {
    const { command } = req.body;
    
    // Simple keyword-based parsing
    const lowerCommand = (command || '').toLowerCase();
    let parsedCommand;
    
    if (lowerCommand.includes('delete') || lowerCommand.includes('cancel') || lowerCommand.includes('remove')) {
      parsedCommand = {
        intent: 'DELETE_EVENT',
        confidence: 0.7,
        entities: {
          title: command
        }
      };
    } else if (lowerCommand.includes('list') || lowerCommand.includes('show') || lowerCommand.includes('schedule')) {
      parsedCommand = {
        intent: 'LIST_EVENTS',
        confidence: 0.9,
        entities: {}
      };
    } else if (lowerCommand.includes('meeting') || lowerCommand.includes('appointment') || lowerCommand.includes('call')) {
      parsedCommand = {
        intent: 'CREATE_EVENT',
        confidence: 0.8,
        entities: {
          title: command.includes('meeting') ? 'Meeting' : 'Event',
          dateTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
          duration: 60
        }
      };
    } else {
      // Default to creating an event
      parsedCommand = {
        intent: 'CREATE_EVENT',
        confidence: 0.5,
        entities: {
          title: command,
          dateTime: new Date(Date.now() + 86400000).toISOString(),
          duration: 60
        }
      };
    }

    res.json({
      ...parsedCommand,
      originalText: command
    });
  } catch (error) {
    console.error('Parse error:', error);
    res.status(500).json({ error: 'Failed to parse command' });
  }
});

// Calendar events endpoints
app.get('/api/calendar/events', authenticateToken, (req, res) => {
  try {
    const events = db.prepare('SELECT * FROM events WHERE userId = ? ORDER BY startTime').all(req.user.id) || [];
    res.json({ events });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to get events' });
  }
});

// Create event endpoint
app.post('/api/calendar/events', authenticateToken, (req, res) => {
  try {
    const { title, description, startTime, endTime, location } = req.body;
    
    if (!title || !startTime || !endTime) {
      return res.status(400).json({ error: 'Title, start time, and end time are required' });
    }
    
    // Create event
    const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    db.prepare(`
      INSERT INTO events (id, userId, title, description, startTime, endTime, location, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(eventId, req.user.id, title, description || null, startTime, endTime, location || null, now);
    
    // Get created event
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    
    res.json({ event });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Google OAuth endpoints (simplified for demo)
app.get('/api/auth/google', (req, res) => {
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback')}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent('openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/contacts.readonly')}&` +
    `access_type=offline&` +
    `prompt=consent`;
  
  res.json({ authUrl });
});

app.get('/api/auth/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    
    // In production, you'd exchange the code for tokens here
    // For now, just return a success response
    res.send(`
      <script>
        window.opener.postMessage({
          type: 'GOOGLE_AUTH_SUCCESS',
          tokens: { access_token: 'demo_token' }
        }, window.location.origin);
        window.close();
      </script>
    `);
  } catch (error) {
    res.send(`
      <script>
        window.opener.postMessage({
          type: 'GOOGLE_AUTH_ERROR',
          error: 'Authentication failed'
        }, window.location.origin);
        window.close();
      </script>
    `);
  }
});

app.post('/api/auth/google/disconnect', (req, res) => {
  res.json({ success: true });
});

app.post('/api/auth/google/sync-calendar', (req, res) => {
  res.json({ eventCount: 5, message: 'Calendar synced successfully' });
});

app.post('/api/auth/google/sync-contacts', (req, res) => {
  res.json({ contactCount: 12, message: 'Contacts imported successfully' });
});

// Mock contacts endpoint
app.get('/api/contacts', (req, res) => {
  res.json({ contacts: [] });
});

// Static file serving for Vercel
app.use('/css', express.static(path.join(__dirname, '..', 'src', 'public', 'css')));
app.use('/js', express.static(path.join(__dirname, '..', 'src', 'public', 'js')));
app.use('/images', express.static(path.join(__dirname, '..', 'src', 'public', 'images')));

// Serve manifest and service worker
app.get('/manifest.json', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'src', 'public', 'manifest.json'));
});

app.get('/service-worker.js', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'src', 'public', 'service-worker.js'));
});

// Serve the main app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'src', 'public', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`✅ Kiro Calendar Assistant is running at http://localhost:${PORT}`);
    console.log(`📱 Open http://localhost:${PORT} in your browser`);
  });
}

// Export for Vercel
module.exports = app;