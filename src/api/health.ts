import { Router, Request, Response } from 'express';
import { version } from '../../package.json';
import databaseService from '../services/databaseService';
import { logger } from '../utils/logger';

const router = Router();

// Basic health check
router.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'Kiro Calendar Assistant',
    version: version || '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Detailed health check with dependencies
router.get('/detailed', async (req: Request, res: Response) => {
  const health = {
    status: 'healthy',
    service: 'Kiro Calendar Assistant',
    version: version || '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    dependencies: {
      database: { status: 'unknown' as 'healthy' | 'unhealthy' | 'unknown' },
      redis: { status: 'unknown' as 'healthy' | 'unhealthy' | 'unknown' },
    },
  };

  try {
    // Check database connection
    // TODO: Implement actual database health check
    // await databaseService.healthCheck();
    health.dependencies.database.status = 'healthy';
  } catch (error) {
    logger.error('Database health check failed:', error);
    health.dependencies.database.status = 'unhealthy';
    health.status = 'unhealthy';
  }

  try {
    // Check Redis connection (if implemented)
    // TODO: Implement Redis health check
    health.dependencies.redis.status = 'healthy';
  } catch (error) {
    logger.error('Redis health check failed:', error);
    health.dependencies.redis.status = 'unhealthy';
    // Redis being down shouldn't make the entire service unhealthy
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Readiness check (for Kubernetes/container orchestration)
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check if all services are ready to handle requests
    // TODO: Implement actual readiness checks
    
    res.json({
      ready: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({
      ready: false,
      timestamp: new Date().toISOString(),
      error: 'Service not ready',
    });
  }
});

// Liveness check (for Kubernetes/container orchestration)
router.get('/live', (req: Request, res: Response) => {
  // Simple check to see if the service is alive
  res.json({
    alive: true,
    timestamp: new Date().toISOString(),
  });
});

export default router;