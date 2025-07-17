import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export interface Config {
  // Server configuration
  port: number;
  env: string;
  isDevelopment: boolean;
  isProduction: boolean;
  
  // API configuration
  apiPrefix: string;
  apiVersion: string;
  
  // Database
  database: {
    path: string;
    name: string;
  };
  
  // Authentication
  jwt: {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };
  session: {
    secret: string;
  };
  
  // External services
  openrouter: {
    apiKey: string;
    baseUrl: string;
    model: string;
  };
  
  // Google Calendar API
  google: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    scopes: string[];
  };
  
  // Email configuration
  email: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  
  // Logging
  logging: {
    level: string;
    format: string;
    dir: string;
  };
  
  // CORS
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  
  // Rate limiting
  rateLimit: {
    windowMs: number;
    max: number;
  };
  
  // File upload
  upload: {
    maxSize: number;
    allowedMimeTypes: string[];
  };
  
  // Cache
  cache: {
    ttl: number;
  };
}

export const config: Config = {
  // Server configuration
  port: parseInt(process.env.PORT || '3000', 10),
  env: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  // API configuration
  apiPrefix: '/api',
  apiVersion: 'v1',
  
  // Database
  database: {
    path: process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'kiro.db'),
    name: process.env.DATABASE_NAME || 'kiro.db'
  },
  
  // Authentication
  jwt: {
    secret: process.env.JWT_SECRET || 'your-jwt-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  session: {
    secret: process.env.SESSION_SECRET || 'your-session-secret-change-in-production',
  },
  
  // External services - Using OpenRouter instead of OpenAI
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY || '',
    baseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    model: process.env.OPENROUTER_MODEL || 'openai/gpt-3.5-turbo',
  },
  
  // Google Calendar API
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback',
    scopes: [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ]
  },
  
  // Email configuration
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER || '',
      pass: process.env.EMAIL_PASS || '',
    },
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    dir: process.env.LOG_DIR || path.join(process.cwd(), 'logs'),
  },
  
  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
  
  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10), // limit each IP to 100 requests per windowMs
  },
  
  // File upload
  upload: {
    maxSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'text/csv', 'text/vcard', 'text/x-vcard'],
  },
  
  // Cache
  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '3600', 10), // 1 hour
  },
};

// Validate required configuration in production
if (config.isProduction) {
  const requiredEnvVars = [
    'JWT_SECRET',
    'SESSION_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'OPENROUTER_API_KEY'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables in production: ${missingVars.join(', ')}`);
  }
}

export default config;