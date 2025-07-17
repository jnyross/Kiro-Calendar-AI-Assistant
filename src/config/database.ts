import path from 'path';
import config from './index';

export interface DatabaseConfig {
  type: 'sqlite' | 'postgres';
  sqlite: {
    filename: string;
    verbose: boolean;
    wal: boolean;
    foreignKeys: boolean;
  };
  postgres: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    ssl: boolean;
    connectionPool: {
      min: number;
      max: number;
    };
  };
}

export const databaseConfig: DatabaseConfig = {
  type: (process.env.DB_TYPE as 'sqlite' | 'postgres') || 'sqlite',
  
  // SQLite configuration (for development and local deployment)
  sqlite: {
    filename: config.database.path,
    verbose: config.isDevelopment,
    wal: true, // Write-Ahead Logging for better concurrency
    foreignKeys: true // Enable foreign key constraints
  },
  
  // PostgreSQL configuration (for production with Vercel)
  postgres: {
    host: process.env.POSTGRES_HOST || process.env.POSTGRES_URL_NON_POOLING?.split('@')[1]?.split(':')[0] || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || process.env.POSTGRES_URL_NON_POOLING?.split(':')[3]?.split('/')[0] || '5432', 10),
    username: process.env.POSTGRES_USER || process.env.POSTGRES_URL_NON_POOLING?.split('://')[1]?.split(':')[0] || 'postgres',
    password: process.env.POSTGRES_PASSWORD || process.env.POSTGRES_URL_NON_POOLING?.split('://')[1]?.split(':')[1]?.split('@')[0] || '',
    database: process.env.POSTGRES_DATABASE || process.env.POSTGRES_URL_NON_POOLING?.split('/').pop()?.split('?')[0] || 'kiro',
    ssl: process.env.POSTGRES_SSL === 'true' || config.isProduction,
    connectionPool: {
      min: parseInt(process.env.DB_POOL_MIN || '2', 10),
      max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    }
  }
};

// Helper function to get database connection string
export function getDatabaseUrl(): string {
  // Check for Vercel Postgres URL first
  if (process.env.POSTGRES_URL) {
    return process.env.POSTGRES_URL;
  }
  
  if (databaseConfig.type === 'postgres') {
    const { host, port, username, password, database, ssl } = databaseConfig.postgres;
    const sslParam = ssl ? '?sslmode=require' : '';
    return `postgresql://${username}:${password}@${host}:${port}/${database}${sslParam}`;
  }
  
  // For SQLite, return the file path
  return `sqlite://${databaseConfig.sqlite.filename}`;
}

// Ensure data directory exists for SQLite
if (databaseConfig.type === 'sqlite') {
  const dataDir = path.dirname(databaseConfig.sqlite.filename);
  const fs = require('fs');
  
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Database migrations configuration
export const migrationConfig = {
  migrationsPath: path.join(__dirname, '..', '..', 'migrations'),
  migrationsTableName: 'migrations',
};

export default databaseConfig;