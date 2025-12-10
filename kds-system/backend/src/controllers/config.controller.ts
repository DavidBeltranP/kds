import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { redis, REDIS_KEYS } from '../config/redis';
import { testMxpConnectionWithParams } from '../config/mxp';
import { pollingService } from '../services/polling.service';
import { printerService } from '../services/printer.service';
import { centralizedPrinterService } from '../services/centralized-printer.service';
import { apiTicketService, ApiComanda } from '../services/api-ticket.service';
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
        mxpPort: true,
        mxpUser: true,
        mxpDatabase: true,
        pollingInterval: true,
        lastPollTime: true,
        lastOrderId: true,
      },
    });

    res.json({
      mxpHost: config?.mxpHost || '',
      mxpPort: config?.mxpPort || null,
      mxpUser: config?.mxpUser || '',
      mxpPassword: '', // Never return actual password, just show field exists
      mxpDatabase: config?.mxpDatabase || '',
      pollingInterval: config?.pollingInterval || 2000,
      lastPollTime: config?.lastPollTime || null,
      lastOrderId: config?.lastOrderId || null,
    });
  }
);

/**
 * PUT /api/config/mxp
 * Actualizar configuración de MAXPOINT
 */
export const updateMxpConfig = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { mxpHost, mxpPort, mxpUser, mxpPassword, mxpDatabase, pollingInterval } = req.body;

    const data: any = {};
    if (mxpHost !== undefined) data.mxpHost = mxpHost;
    if (mxpPort !== undefined) data.mxpPort = mxpPort;
    if (mxpUser !== undefined) data.mxpUser = mxpUser;
    // Only update password if a non-empty value is provided
    if (mxpPassword !== undefined && mxpPassword !== '') data.mxpPassword = mxpPassword;
    if (mxpDatabase !== undefined) data.mxpDatabase = mxpDatabase;
    if (pollingInterval !== undefined) data.pollingInterval = pollingInterval;

    await prisma.generalConfig.upsert({
      where: { id: 'general' },
      create: { id: 'general', ...data },
      update: data,
    });

    // Restart polling if it was running to apply new config
    const pollingStatus = await pollingService.getStatus();
    if (pollingStatus.running) {
      pollingService.stop();
      await pollingService.start();
    }

    res.json({ message: 'MXP configuration updated' });
  }
);

/**
 * POST /api/config/mxp/test
 * Probar conexión con MAXPOINT usando parámetros proporcionados
 */
export const testMxpConnection = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { mxpHost, mxpPort, mxpUser, mxpPassword, mxpDatabase } = req.body;

    // Validar campos requeridos
    if (!mxpHost || !mxpUser || !mxpDatabase) {
      res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: host, usuario y base de datos son obligatorios',
      });
      return;
    }

    // Si no se proporciona password, intentar usar el guardado
    let password = mxpPassword;
    if (!password) {
      const config = await prisma.generalConfig.findUnique({
        where: { id: 'general' },
        select: { mxpPassword: true },
      });
      password = config?.mxpPassword || '';
    }

    if (!password) {
      res.status(400).json({
        success: false,
        message: 'Se requiere la contrasena para probar la conexion',
      });
      return;
    }

    const result = await testMxpConnectionWithParams({
      host: mxpHost,
      port: mxpPort || undefined,
      user: mxpUser,
      password,
      database: mxpDatabase,
    });

    res.json(result);
  }
);

/**
 * GET /api/config/polling
 * Obtener estado del servicio de polling
 */
export const getPollingStatus = asyncHandler(
  async (_req: Request, res: Response) => {
    const status = await pollingService.getStatus();
    res.json(status);
  }
);

/**
 * POST /api/config/polling/start
 * Iniciar servicio de polling
 */
export const startPolling = asyncHandler(
  async (_req: AuthenticatedRequest, res: Response) => {
    await pollingService.start();
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
    const pollingStatus = await pollingService.getStatus();
    const checks = {
      database: false,
      redis: false,
      polling: pollingStatus.running,
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

// ============================================
// ENDPOINTS DE MODO DE CONFIGURACIÓN
// ============================================

/**
 * GET /api/config/modes
 * Obtener modos de configuración actuales (tickets e impresión)
 */
export const getConfigModes = asyncHandler(
  async (_req: Request, res: Response) => {
    const config = await prisma.generalConfig.findUnique({
      where: { id: 'general' },
      select: {
        ticketMode: true,
        printMode: true,
        centralizedPrintUrl: true,
        centralizedPrintPort: true,
      },
    });

    res.json({
      ticketMode: config?.ticketMode || 'POLLING',
      printMode: config?.printMode || 'LOCAL',
      centralizedPrintUrl: config?.centralizedPrintUrl || '',
      centralizedPrintPort: config?.centralizedPrintPort || 5000,
    });
  }
);

/**
 * PUT /api/config/modes
 * Actualizar modos de configuración
 */
export const updateConfigModes = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { ticketMode, printMode, centralizedPrintUrl, centralizedPrintPort } = req.body;

    const data: any = {};
    if (ticketMode !== undefined) data.ticketMode = ticketMode;
    if (printMode !== undefined) data.printMode = printMode;
    if (centralizedPrintUrl !== undefined) data.centralizedPrintUrl = centralizedPrintUrl;
    if (centralizedPrintPort !== undefined) data.centralizedPrintPort = centralizedPrintPort;

    const config = await prisma.generalConfig.upsert({
      where: { id: 'general' },
      create: { id: 'general', ...data },
      update: data,
    });

    // Si se cambió el modo de tickets, reiniciar/detener polling
    if (ticketMode) {
      if (ticketMode === 'API') {
        pollingService.stop();
      } else {
        await pollingService.start();
      }
    }

    // Invalidar cache
    await redis.del(REDIS_KEYS.generalConfig());

    res.json({
      message: 'Modos de configuración actualizados',
      config: {
        ticketMode: config.ticketMode,
        printMode: config.printMode,
        centralizedPrintUrl: config.centralizedPrintUrl,
        centralizedPrintPort: config.centralizedPrintPort,
      },
    });
  }
);

/**
 * POST /api/config/print/test-centralized
 * Probar conexión con servicio de impresión centralizado
 */
export const testCentralizedPrint = asyncHandler(
  async (_req: AuthenticatedRequest, res: Response) => {
    const result = await centralizedPrinterService.testConnection();
    res.json(result);
  }
);

// ============================================
// ENDPOINTS DE API TICKETS (Modo API)
// ============================================

/**
 * POST /api/comandas
 * Endpoint para recibir comandas via API (compatible con sistema anterior)
 * También procesa acciones de usuario y devuelve comandas para pantalla por IP
 */
export const receiveComandas = asyncHandler(
  async (req: Request, res: Response) => {
    const { userActions } = req.body;

    // Obtener IP del cliente
    const clientIp = req.ip || req.socket.remoteAddress || '';
    const ip = clientIp.replace('::ffff:', ''); // Normalizar IPv6 a IPv4

    // Obtener comandas para esta pantalla (procesando acciones si las hay)
    const result = await apiTicketService.getCommandsForScreen(ip, userActions);

    res.type('application/json').send(result);
  }
);

/**
 * POST /api/tickets/receive
 * Endpoint para recibir una comanda individual via API
 */
export const receiveTicket = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    // Verificar que el modo API esté habilitado
    const isApiMode = await apiTicketService.isApiModeEnabled();
    if (!isApiMode) {
      throw new AppError(400, 'Modo API no habilitado. Active el modo API en configuración.');
    }

    const comanda: ApiComanda = req.body;
    const result = await apiTicketService.receiveComanda(comanda);

    if (result.success) {
      res.json({ success: true, orderId: result.orderId });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  }
);

/**
 * POST /api/tickets/receive-batch
 * Endpoint para recibir múltiples comandas via API
 */
export const receiveTicketsBatch = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    // Verificar que el modo API esté habilitado
    const isApiMode = await apiTicketService.isApiModeEnabled();
    if (!isApiMode) {
      throw new AppError(400, 'Modo API no habilitado. Active el modo API en configuración.');
    }

    const comandas: ApiComanda[] = req.body.comandas || req.body;
    const result = await apiTicketService.receiveComandas(comandas);

    res.json(result);
  }
);

/**
 * GET /api/config
 * Endpoint deprecado - Las pantallas ahora se identifican por número, no por IP
 * Usar /api/screens/by-number/:number en su lugar
 */
export const getScreenConfigByIp = asyncHandler(
  async (_req: Request, res: Response) => {
    res.status(410).json({
      error: 'Endpoint deprecado',
      message: 'Las pantallas ahora se identifican por número. Usar /api/screens/by-number/:number',
      example: '/api/screens/by-number/1',
    });
  }
);
