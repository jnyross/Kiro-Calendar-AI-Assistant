// Test setup file for Jest
// Add any global test setup here

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = ':memory:'; // Use in-memory database for tests

// Add custom matchers or global test utilities if needed
beforeAll(() => {
  // Global setup
});

afterAll(() => {
  // Global cleanup
});

// Increase timeout for integration tests
jest.setTimeout(10000);