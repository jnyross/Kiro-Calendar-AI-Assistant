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
const PORT = process.env.PORT || 3000;

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
const db = new Database(path.join(dataDir, 'kiro.db'));

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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files with cache-busting headers in development
app.use(express.static(path.join(__dirname, 'public'), {
  etag: false,
  lastModified: false,
  setHeaders: (res, path) => {
    if (process.env.NODE_ENV === 'development') {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
    }
  }
}));

// Helper function to generate JWT
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET || 'dev-jwt-secret',
    { expiresIn: '7d' }
  );
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Kiro Calendar Assistant is running',
    timestamp: new Date().toISOString()
  });
});

// Sign up
app.post('/api/auth/register', async (req, res) => {
  try {
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
app.get('/api/auth/me', (req, res) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-jwt-secret');
    
    // Get user
    const user = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(decoded.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// NLP endpoint with simple parsing (OpenRouter temporarily disabled)
app.post('/api/calendar/parse', async (req, res) => {
  try {
    const { command } = req.body;
    
    // Simple keyword-based parsing for now
    const lowerCommand = (command || '').toLowerCase();
    let parsedCommand;
    
    if (lowerCommand.includes('meeting') || lowerCommand.includes('schedule')) {
      parsedCommand = {
        intent: 'CREATE_EVENT',
        confidence: 0.8,
        entities: {
          title: command.includes('meeting') ? 'Meeting' : 'Event',
          dateTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
          duration: 60
        }
      };
    } else if (lowerCommand.includes('delete') || lowerCommand.includes('cancel')) {
      parsedCommand = {
        intent: 'DELETE_EVENT',
        confidence: 0.7,
        entities: {
          title: command
        }
      };
    } else if (lowerCommand.includes('list') || lowerCommand.includes('show')) {
      parsedCommand = {
        intent: 'LIST_EVENTS',
        confidence: 0.9,
        entities: {}
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

// Calendar events endpoints
app.get('/api/calendar/events', (req, res) => {
  try {
    // Get user from token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-jwt-secret');
    
    // Get user's events
    const events = db.prepare('SELECT * FROM events WHERE userId = ? ORDER BY startTime').all(decoded.id) || [];
    
    res.json({ events });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to get events' });
  }
});

// Create event endpoint
app.post('/api/calendar/events', (req, res) => {
  try {
    // Get user from token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-jwt-secret');
    
    const { title, description, startTime, endTime, location } = req.body;
    
    // Create event
    const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    db.prepare(`
      INSERT INTO events (id, userId, title, description, startTime, endTime, location, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(eventId, decoded.id, title, description || null, startTime, endTime, location || null, now);
    
    // Get created event
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    
    res.json({ event });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Google OAuth endpoints
app.get('/api/auth/google', (req, res) => {
  // Generate Google OAuth URL
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(process.env.GOOGLE_REDIRECT_URI)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent('openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/contacts.readonly')}&` +
    `access_type=offline&` +
    `prompt=consent`;
  
  res.json({ authUrl });
});

app.get('/api/auth/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    
    // Exchange code for tokens (simplified for demo)
    // In production, you'd make a request to Google's token endpoint
    
    // For now, just return success
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
  // In production, you'd revoke the tokens and clear from database
  res.json({ success: true });
});

app.post('/api/auth/google/sync-calendar', (req, res) => {
  // Mock calendar sync
  res.json({ eventCount: 5, message: 'Calendar synced successfully' });
});

app.post('/api/auth/google/sync-contacts', (req, res) => {
  // Mock contacts sync
  res.json({ contactCount: 12, message: 'Contacts imported successfully' });
});

// Mock contacts endpoint
app.get('/api/contacts', (req, res) => {
  // Return empty contacts for now
  res.json({ contacts: [] });
});

// Serve the main app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Kiro Calendar Assistant is running at http://localhost:${PORT}`);
  console.log(`📱 Open http://localhost:${PORT} in your browser`);
  console.log(`\n📝 You can now:`);
  console.log(`   - Sign up for a new account`);
  console.log(`   - Use natural language commands`);
  console.log(`   - Manage your calendar`);
});