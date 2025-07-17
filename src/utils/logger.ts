import winston from 'winston';
import { config } from '../config';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston about the colors
winston.addColors(colors);

// Format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format: config.env === 'development' ? consoleFormat : fileFormat,
  }),
];

// Add file transports in production
if (config.env === 'production') {
  transports.push(
    // Error log file
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }) as any,
    // Combined log file
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }) as any
  );
}

// Create the logger
const logger = winston.createLogger({
  level: config.logging.level || 'info',
  levels,
  format: fileFormat,
  transports,
  exitOnError: false,
});

// Create a stream object for Morgan (HTTP request logging)
export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Export logger instance
export { logger };

// Helper functions for structured logging
export const logError = (message: string, error: Error, meta?: any): void => {
  logger.error(message, {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    ...meta,
  });
};

export const logInfo = (message: string, meta?: any): void => {
  logger.info(message, meta);
};

export const logWarn = (message: string, meta?: any): void => {
  logger.warn(message, meta);
};

export const logDebug = (message: string, meta?: any): void => {
  logger.debug(message, meta);
};

// Log unhandled exceptions and rejections
if (config.env === 'production') {
  process.on('uncaughtException', (error: Error) => {
    logError('Uncaught Exception', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logError('Unhandled Rejection', new Error(reason), { promise });
  });
}