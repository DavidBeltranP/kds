import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { redis, REDIS_KEYS } from '../config/redis';
import { pollingService } from '../services/polling.service';
import { AuthenticatedRequest } from '../types';
import { asyncHandler, AppError } from '../middlewares/error.middleware';

/**
 * GET /api/config/general
 * Obtener configuración general
 */
export const getGeneralConfig = asyncHandler(
  async (_req: Request, res: Response) => {
    let config = await prisma.generalConfig.findUnique({
      where: { id: 'general' },
    });

    // Crear configuración por defecto si no existe
    if (!config) {
      config = await prisma.generalConfig.create({
        data: { id: 'general' },
      });
    }

    res.json(config);
  }
);

/**
 * PUT /api/config/general
 * Actualizar configuración general
 */
export const updateGeneralConfig = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const data = req.body;

    // Eliminar campos que no deben actualizarse directamente
    delete data.id;
    delete data.updatedAt;

    const config = await prisma.generalConfig.upsert({
      where: { id: 'general' },
      create: { id: 'general', ...data },
      update: data,
    });

    // Invalidar cache
    await redis.del(REDIS_KEYS.generalConfig());

    // Reiniciar polling si cambió el intervalo
    if (data.pollingInterval) {
      pollingService.stop();
      pollingService.start();
    }

    res.json(config);
  }
);

/**
 * GET /api/config/mxp
 * Obtener configuración de MAXPOINT (sin contraseña)
 */
export const getMxpConfig = asyncHandler(
  async (_req: Request, res: Response) => {
    const config = await prisma.generalConfig.findUnique({
      where: { id: 'general' },
      select: {
        mxpHost: true,
        mxpUser: true,
        mxpDatabase: true,
      },
    });

    res.json(config || {});
  }
);

/**
 * PUT /api/config/mxp
 * Actualizar configuración de MAXPOINT
 */
export const updateMxpConfig = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { mxpHost, mxpUser, mxpPassword, mxpDatabase } = req.body;

    const data: any = {};
    if (mxpHost !== undefined) data.mxpHost = mxpHost;
    if (mxpUser !== undefined) data.mxpUser = mxpUser;
    if (mxpPassword !== undefined) data.mxpPassword = mxpPassword;
    if (mxpDatabase !== undefined) data.mxpDatabase = mxpDatabase;

    await prisma.generalConfig.upsert({
      where: { id: 'general' },
      create: { id: 'general', ...data },
      update: data,
    });

    res.json({ message: 'MXP configuration updated' });
  }
);

/**
 * GET /api/config/polling
 * Obtener estado del servicio de polling
 */
export const getPollingStatus = asyncHandler(
  async (_req: Request, res: Response) => {
    const status = pollingService.getStatus();
    res.json(status);
  }
);

/**
 * POST /api/config/polling/start
 * Iniciar servicio de polling
 */
export const startPolling = asyncHandler(
  async (_req: AuthenticatedRequest, res: Response) => {
    pollingService.start();
    res.json({ message: 'Polling started' });
  }
);

/**
 * POST /api/config/polling/stop
 * Detener servicio de polling
 */
export const stopPolling = asyncHandler(
  async (_req: AuthenticatedRequest, res: Response) => {
    pollingService.stop();
    res.json({ message: 'Polling stopped' });
  }
);

/**
 * POST /api/config/polling/force
 * Forzar un ciclo de polling
 */
export const forcePoll = asyncHandler(
  async (_req: AuthenticatedRequest, res: Response) => {
    await pollingService.forcePoll();
    res.json({ message: 'Poll cycle completed' });
  }
);

/**
 * GET /api/config/health
 * Health check del sistema
 */
export const healthCheck = asyncHandler(
  async (_req: Request, res: Response) => {
    const checks = {
      database: false,
      redis: false,
      polling: pollingService.getStatus().running,
    };

    // Check database
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch {
      checks.database = false;
    }

    // Check Redis
    try {
      const pong = await redis.ping();
      checks.redis = pong === 'PONG';
    } catch {
      checks.redis = false;
    }

    const healthy = checks.database && checks.redis;

    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'healthy' : 'unhealthy',
      checks,
      timestamp: new Date().toISOString(),
    });
  }
);

/**
 * GET /api/config/stats
 * Estadísticas generales del sistema
 */
export const getSystemStats = asyncHandler(
  async (_req: Request, res: Response) => {
    const [screensTotal, screensOnline, queuesTotal, ordersToday] =
      await Promise.all([
        prisma.screen.count(),
        prisma.screen.count({ where: { status: 'ONLINE' } }),
        prisma.queue.count({ where: { active: true } }),
        prisma.order.count({
          where: {
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        }),
      ]);

    res.json({
      screens: {
        total: screensTotal,
        online: screensOnline,
      },
      queues: queuesTotal,
      ordersToday,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  }
);
