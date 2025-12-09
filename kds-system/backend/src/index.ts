import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';

import { env } from './config/env';
import { checkDatabaseConnection, disconnectDatabase } from './config/database';
import { checkRedisConnection, disconnectRedis } from './config/redis';
import { checkMxpConnection, disconnectMxp } from './config/mxp';
import { websocketService } from './services/websocket.service';
import { pollingService } from './services/polling.service';
import { authService } from './services/auth.service';
import { screenService } from './services/screen.service';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { logger } from './utils/logger';

// Crear aplicación Express
const app = express();
const httpServer = createServer(app);

// ============================================
// MIDDLEWARES
// ============================================

// Seguridad
app.use(helmet());

// CORS
app.use(
  cors({
    origin: env.CORS_ORIGINS.split(','),
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // máximo 1000 requests por ventana
  message: { error: 'Too many requests, please try again later' },
  skip: (req) => {
    // Excluir rutas de mirror, config y auth del rate limiting
    // Nota: req.path ya viene sin /api/ porque el limiter está montado en /api/
    return req.path.startsWith('/mirror/') ||
           req.path === '/config/health' ||
           req.path.startsWith('/auth/');
  },
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging de requests
app.use((req, _res, next) => {
  if (req.path !== '/api/config/health') {
    logger.debug(`${req.method} ${req.path}`);
  }
  next();
});

// ============================================
// ROUTES
// ============================================

app.use('/api', routes);

// Health check simple
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// ERROR HANDLING
// ============================================

app.use(notFoundHandler);
app.use(errorHandler);

// ============================================
// STARTUP
// ============================================

async function start(): Promise<void> {
  logger.info('Starting KDS Backend...');

  // Verificar conexiones
  logger.info('Checking database connection...');
  const dbOk = await checkDatabaseConnection();
  if (!dbOk) {
    logger.error('Database connection failed');
    process.exit(1);
  }
  logger.info('Database connected');

  logger.info('Checking Redis connection...');
  const redisOk = await checkRedisConnection();
  if (!redisOk) {
    logger.error('Redis connection failed');
    process.exit(1);
  }
  logger.info('Redis connected');

  // MXP es opcional - puede no estar disponible en desarrollo
  logger.info('Checking MXP connection...');
  const mxpOk = await checkMxpConnection();
  if (mxpOk) {
    logger.info('MXP connected');
  } else {
    logger.warn('MXP connection failed - polling will be disabled');
  }

  // Crear usuario admin por defecto
  await authService.ensureAdminExists();

  // Inicializar WebSocket
  websocketService.initialize(httpServer);

  // Iniciar polling (si MXP está disponible)
  if (mxpOk) {
    pollingService.start();
  }

  // Iniciar limpieza periódica de heartbeats
  setInterval(async () => {
    await screenService.cleanupOldHeartbeats(1);
  }, 60 * 60 * 1000); // Cada hora

  // Iniciar servidor HTTP
  httpServer.listen(env.PORT, () => {
    logger.info(`Server running on port ${env.PORT}`);
    logger.info(`Environment: ${env.NODE_ENV}`);
  });
}

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

async function shutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  // Detener polling
  pollingService.stop();

  // Cerrar servidor HTTP
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });

  // Cerrar conexiones
  await disconnectDatabase();
  logger.info('Database disconnected');

  await disconnectRedis();
  logger.info('Redis disconnected');

  await disconnectMxp();
  logger.info('MXP disconnected');

  logger.info('Graceful shutdown complete');
  process.exit(0);
}

// Manejar señales de terminación
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Manejar errores no capturados
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
});

// Iniciar aplicación
start().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});
