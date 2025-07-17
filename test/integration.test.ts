import request from 'supertest';
import { spawn, ChildProcess } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';

// Integration tests for the actual running server
describe('Integration Tests', () => {
  let serverProcess: ChildProcess;
  const baseUrl = 'http://localhost:3001'; // Use different port for tests
  const testPort = 3001;

  beforeAll(async () => {
    // Start the server process
    serverProcess = spawn('node', [
      path.join(__dirname, '..', 'src', 'simple-server.js')
    ], {
      env: { ...process.env, PORT: testPort.toString() },
      stdio: 'pipe'
    });

    // Wait for server to start
    await new Promise((resolve, reject) => {
      let output = '';
      const timeout = setTimeout(() => {
        reject(new Error('Server failed to start within timeout'));
      }, 10000);

      serverProcess.stdout?.on('data', (data) => {
        output += data.toString();
        if (output.includes('Kiro Calendar Assistant is running')) {
          clearTimeout(timeout);
          resolve(true);
        }
      });

      serverProcess.stderr?.on('data', (data) => {
        console.error('Server stderr:', data.toString());
      });

      serverProcess.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }, 15000);

  afterAll(async () => {
    // Kill the server process
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
      
      // Wait for process to end
      await new Promise((resolve) => {
        serverProcess.on('exit', resolve);
        // Force kill if it doesn't exit gracefully
        setTimeout(() => {
          serverProcess.kill('SIGKILL');
          resolve(true);
        }, 5000);
      });
    }
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(baseUrl)
        .get('/api/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.message).toBe('Kiro Calendar Assistant is running');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Static Files', () => {
    it('should serve the main index.html', async () => {
      const response = await request(baseUrl)
        .get('/')
        .expect(200);

      expect(response.text).toContain('Kiro - Personal AI Calendar Assistant');
      expect(response.text).toContain('<!DOCTYPE html>');
    });

    it('should serve CSS files', async () => {
      const response = await request(baseUrl)
        .get('/css/styles.css')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/css');
      expect(response.text).toContain('/* CSS Reset and Base Styles */');
    });

    it('should serve JavaScript files', async () => {
      const response = await request(baseUrl)
        .get('/js/app.js')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/javascript');
      expect(response.text).toContain('Kiro Calendar Assistant');
    });
  });

  describe('Full Authentication Flow', () => {
    const testUser = {
      name: 'Integration Test User',
      email: `integration-test-${Date.now()}@example.com`,
      password: 'testPassword123'
    };

    let authToken: string;

    it('should register a new user', async () => {
      const response = await request(baseUrl)
        .post('/api/auth/register')
        .send(testUser)
        .expect(200);

      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.name).toBe(testUser.name);
      expect(response.body.user.id).toBeDefined();

      authToken = response.body.token;
    });

    it('should login with valid credentials', async () => {
      const response = await request(baseUrl)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe(testUser.email);
    });

    it('should not login with invalid credentials', async () => {
      await request(baseUrl)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        })
        .expect(401);
    });

    it('should get user profile with valid token', async () => {
      const response = await request(baseUrl)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.name).toBe(testUser.name);
    });

    it('should not get user profile without token', async () => {
      await request(baseUrl)
        .get('/api/auth/me')
        .expect(401);
    });
  });

  describe('Calendar Events Flow', () => {
    const testUser = {
      name: 'Calendar Test User',
      email: `calendar-test-${Date.now()}@example.com`,
      password: 'testPassword123'
    };

    let authToken: string;

    beforeAll(async () => {
      // Register user for calendar tests
      const response = await request(baseUrl)
        .post('/api/auth/register')
        .send(testUser)
        .expect(200);

      authToken = response.body.token;
    });

    it('should create a new calendar event', async () => {
      const eventData = {
        title: 'Integration Test Meeting',
        description: 'Test meeting for integration tests',
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T11:00:00Z',
        location: 'Test Conference Room'
      };

      const response = await request(baseUrl)
        .post('/api/calendar/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(eventData)
        .expect(200);

      expect(response.body.event.title).toBe(eventData.title);
      expect(response.body.event.description).toBe(eventData.description);
      expect(response.body.event.startTime).toBe(eventData.startTime);
      expect(response.body.event.endTime).toBe(eventData.endTime);
      expect(response.body.event.location).toBe(eventData.location);
      expect(response.body.event.id).toBeDefined();
    });

    it('should get user calendar events', async () => {
      const response = await request(baseUrl)
        .get('/api/calendar/events')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.events).toBeInstanceOf(Array);
      expect(response.body.events.length).toBeGreaterThan(0);
      expect(response.body.events[0].title).toBe('Integration Test Meeting');
    });

    it('should not access events without authentication', async () => {
      await request(baseUrl)
        .get('/api/calendar/events')
        .expect(401);
    });

    it('should not create events without authentication', async () => {
      const eventData = {
        title: 'Unauthorized Event',
        description: 'Should fail',
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T11:00:00Z'
      };

      await request(baseUrl)
        .post('/api/calendar/events')
        .send(eventData)
        .expect(401);
    });
  });

  describe('NLP Command Parsing', () => {
    it('should parse meeting creation commands', async () => {
      const testCases = [
        {
          command: 'Schedule a meeting with John tomorrow at 2pm',
          expectedIntent: 'CREATE_EVENT',
          expectedTitle: 'Meeting'
        },
        {
          command: 'Create a team standup meeting',
          expectedIntent: 'CREATE_EVENT',
          expectedTitle: 'Meeting'
        },
        {
          command: 'Set up a call with the client',
          expectedIntent: 'CREATE_EVENT',
          expectedTitle: 'Event'
        }
      ];

      for (const testCase of testCases) {
        const response = await request(baseUrl)
          .post('/api/calendar/parse')
          .send({ command: testCase.command })
          .expect(200);

        expect(response.body.intent).toBe(testCase.expectedIntent);
        expect(response.body.originalText).toBe(testCase.command);
        expect(response.body.entities.title).toBe(testCase.expectedTitle);
        expect(response.body.confidence).toBeGreaterThan(0);
      }
    });

    it('should parse list events commands', async () => {
      const testCases = [
        'Show me my calendar',
        'List my events',
        'What\'s on my schedule today'
      ];

      for (const command of testCases) {
        const response = await request(baseUrl)
          .post('/api/calendar/parse')
          .send({ command })
          .expect(200);

        expect(response.body.intent).toBe('LIST_EVENTS');
        expect(response.body.originalText).toBe(command);
        expect(response.body.confidence).toBeGreaterThan(0);
      }
    });

    it('should handle delete commands', async () => {
      const testCases = [
        'Delete my 3pm meeting',
        'Cancel the standup',
        'Remove the appointment'
      ];

      for (const command of testCases) {
        const response = await request(baseUrl)
          .post('/api/calendar/parse')
          .send({ command })
          .expect(200);

        expect(response.body.intent).toBe('DELETE_EVENT');
        expect(response.body.originalText).toBe(command);
        expect(response.body.confidence).toBeGreaterThan(0);
      }
    });

    it('should handle unknown commands gracefully', async () => {
      const command = 'This is not a valid calendar command';

      const response = await request(baseUrl)
        .post('/api/calendar/parse')
        .send({ command })
        .expect(200);

      expect(response.body.intent).toBe('CREATE_EVENT');
      expect(response.body.originalText).toBe(command);
      expect(response.body.confidence).toBe(0.5);
    });
  });

  describe('Google Calendar Integration Endpoints', () => {
    it('should provide Google OAuth URL', async () => {
      const response = await request(baseUrl)
        .get('/api/auth/google')
        .expect(200);

      expect(response.body.authUrl).toBeDefined();
      expect(response.body.authUrl).toContain('accounts.google.com');
      expect(response.body.authUrl).toContain('oauth2');
    });

    it('should handle Google OAuth callback', async () => {
      const response = await request(baseUrl)
        .get('/api/auth/google/callback?code=test-code')
        .expect(200);

      expect(response.text).toContain('GOOGLE_AUTH_SUCCESS');
      expect(response.text).toContain('window.close()');
    });

    it('should handle Google disconnect', async () => {
      const response = await request(baseUrl)
        .post('/api/auth/google/disconnect')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle Google calendar sync', async () => {
      const response = await request(baseUrl)
        .post('/api/auth/google/sync-calendar')
        .expect(200);

      expect(response.body.eventCount).toBeDefined();
      expect(response.body.message).toContain('Calendar synced successfully');
    });

    it('should handle Google contacts sync', async () => {
      const response = await request(baseUrl)
        .post('/api/auth/google/sync-contacts')
        .expect(200);

      expect(response.body.contactCount).toBeDefined();
      expect(response.body.message).toContain('Contacts imported successfully');
    });
  });

  describe('Contacts Endpoint', () => {
    it('should return empty contacts list', async () => {
      const response = await request(baseUrl)
        .get('/api/contacts')
        .expect(200);

      expect(response.body.contacts).toBeInstanceOf(Array);
      expect(response.body.contacts).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON in request body', async () => {
      const response = await request(baseUrl)
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
    });

    it('should handle missing required fields', async () => {
      const response = await request(baseUrl)
        .post('/api/auth/register')
        .send({
          name: 'Test User'
          // Missing email and password
        })
        .expect(500);
    });

    it('should handle invalid routes', async () => {
      const response = await request(baseUrl)
        .get('/api/invalid-endpoint')
        .expect(404);
    });
  });

  describe('Database Persistence', () => {
    it('should persist user data between requests', async () => {
      const userData = {
        name: 'Persistence Test User',
        email: `persistence-${Date.now()}@example.com`,
        password: 'testPassword123'
      };

      // Register user
      const registerResponse = await request(baseUrl)
        .post('/api/auth/register')
        .send(userData)
        .expect(200);

      const userId = registerResponse.body.user.id;
      const token = registerResponse.body.token;

      // Login again
      const loginResponse = await request(baseUrl)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      expect(loginResponse.body.user.id).toBe(userId);
      expect(loginResponse.body.user.email).toBe(userData.email);

      // Get profile
      const profileResponse = await request(baseUrl)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(profileResponse.body.user.id).toBe(userId);
      expect(profileResponse.body.user.email).toBe(userData.email);
    });

    it('should persist calendar events', async () => {
      const userData = {
        name: 'Calendar Persistence User',
        email: `calendar-persist-${Date.now()}@example.com`,
        password: 'testPassword123'
      };

      // Register user
      const registerResponse = await request(baseUrl)
        .post('/api/auth/register')
        .send(userData)
        .expect(200);

      const token = registerResponse.body.token;

      // Create event
      const eventData = {
        title: 'Persistence Test Event',
        description: 'Test event persistence',
        startTime: '2024-01-15T14:00:00Z',
        endTime: '2024-01-15T15:00:00Z',
        location: 'Test Location'
      };

      const createResponse = await request(baseUrl)
        .post('/api/calendar/events')
        .set('Authorization', `Bearer ${token}`)
        .send(eventData)
        .expect(200);

      const eventId = createResponse.body.event.id;

      // Retrieve events
      const getResponse = await request(baseUrl)
        .get('/api/calendar/events')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(getResponse.body.events).toHaveLength(1);
      expect(getResponse.body.events[0].id).toBe(eventId);
      expect(getResponse.body.events[0].title).toBe(eventData.title);
    });
  });
});