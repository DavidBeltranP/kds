/**
 * Mirror Controller
 * Endpoints para visualización en espejo de órdenes del local
 * SOLO LECTURA - No modifica ningún dato en el sistema original
 *
 * Comportamiento:
 * - Si hay conexión configurada al Mirror (SQL Server): Lee datos del local REAL
 * - Si NO hay conexión configurada: Lee de PostgreSQL local (datos de prueba)
 *
 * Esto permite probar configuraciones visuales con datos reales del local
 * sin afectar el sistema de producción.
 */

import { Request, Response } from 'express';
import { mirrorKDSService } from '../services/mirror-kds.service';
import { asyncHandler } from '../middlewares/error.middleware';
import { AuthenticatedRequest } from '../types';
import { prisma } from '../config/database';

/**
 * Helper: Determina si debemos usar el mirror SQL Server o PostgreSQL local
 * Usa SQL Server si está configurado (la conexión se restablece automáticamente)
 */
const useSqlServerMirror = (): boolean => {
  return mirrorKDSService.isConfigured();
};

/**
 * POST /api/mirror/configure
 * Configurar conexión al KDS2 remoto
 */
export const configureMirror = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { host, port, user, password, database } = req.body;

    if (!host || !user || !password || !database) {
      res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: host, user, password, database',
      });
      return;
    }

    mirrorKDSService.configure({
      host,
      port: port || 1433,
      user,
      password,
      database,
    });

    // Probar conexión
    const testResult = await mirrorKDSService.testConnection();

    if (testResult.success) {
      res.json({
        success: true,
        message: 'Mirror configurado y conectado correctamente',
      });
    } else {
      res.status(400).json({
        success: false,
        message: testResult.message,
      });
    }
  }
);

/**
 * GET /api/mirror/test
 * Probar conexión al mirror
 */
export const testMirrorConnection = asyncHandler(
  async (_req: Request, res: Response) => {
    const result = await mirrorKDSService.testConnection();
    res.json(result);
  }
);

/**
 * GET /api/mirror/stats
 * Obtener estadísticas del mirror
 */
export const getMirrorStats = asyncHandler(
  async (_req: Request, res: Response) => {
    // Si hay conexión al SQL Server del local, usar esos datos reales
    if (useSqlServerMirror()) {
      const stats = await mirrorKDSService.getStats();
      res.json({ ...stats, mode: 'mirror-sqlserver' });
      return;
    }

    // Sin conexión al mirror, leer de PostgreSQL local (datos de prueba)
    const ordersCount = await prisma.order.count({
      where: { status: 'PENDING' },
    });

    const screens = await prisma.screen.findMany({
      select: { name: true },
    });

    const queues = await prisma.queue.findMany({
      where: { active: true },
      select: { name: true },
    });

    res.json({
      connected: false,
      ordersOnScreen: ordersCount,
      screens: screens.map((s) => s.name),
      queues: queues.map((q) => q.name),
      mode: 'local-postgresql',
    });
  }
);

/**
 * GET /api/mirror/orders
 * Obtener órdenes en pantalla (espejo)
 * Si hay conexión al SQL Server, lee datos reales del local
 * Si no hay conexión, lee de PostgreSQL local (datos de prueba)
 */
export const getMirrorOrders = asyncHandler(
  async (req: Request, res: Response) => {
    const { screen, queue } = req.query;

    // Si hay conexión al SQL Server del local, usar esos datos reales
    if (useSqlServerMirror()) {
      let orders = await mirrorKDSService.getOrdersOnScreen(
        screen as string | undefined
      );

      // Filtrar por cola si se especifica
      if (queue) {
        orders = orders.filter((o) => o.queue === queue);
      }

      res.json({
        success: true,
        orders,
        total: orders.length,
        timestamp: new Date().toISOString(),
        mode: 'mirror-sqlserver',
      });
      return;
    }

    // Sin conexión al mirror, leer de PostgreSQL local (datos de prueba)
    const whereClause: {
      status: 'PENDING';
      screen?: { name: string };
    } = {
      status: 'PENDING',
    };

    if (screen) {
      whereClause.screen = { name: screen as string };
    }

    const dbOrders = await prisma.order.findMany({
      where: whereClause,
      include: {
        items: true,
        screen: {
          include: {
            queue: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Filtrar por cola si se especifica
    let orders = dbOrders.map((order) => ({
      id: order.id,
      externalId: order.externalId,
      identifier: order.identifier,
      channel: order.channel,
      customerName: order.customerName || undefined,
      status: order.status as 'PENDING' | 'FINISHED',
      createdAt: order.createdAt.toISOString(),
      queue: order.screen?.queue?.name || 'DEFAULT',
      screen: order.screen?.name || 'SIN PANTALLA',
      items: order.items.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        notes: item.notes || undefined,
        subitems: item.modifier
          ? item.modifier.split(',').map((m) => ({ name: m.trim(), quantity: 1 }))
          : [],
      })),
    }));

    if (queue) {
      orders = orders.filter((o) => o.queue === queue);
    }

    res.json({
      success: true,
      orders,
      total: orders.length,
      timestamp: new Date().toISOString(),
      mode: 'local-postgresql',
    });
  }
);

/**
 * GET /api/mirror/screens
 * Obtener pantallas disponibles en el mirror
 * IMPORTANTE: La apariencia (cardColors, channelColors) SIEMPRE viene de PostgreSQL local
 * porque es la configuración visual que queremos probar
 */
export const getMirrorScreens = asyncHandler(
  async (_req: Request, res: Response) => {
    // Siempre leer la configuración de apariencia desde PostgreSQL local
    const localScreens = await prisma.screen.findMany({
      include: {
        appearance: {
          include: {
            cardColors: true,
            channelColors: true,
          },
        },
      },
    });

    // Si hay conexión al SQL Server, combinar nombres de pantallas remotas con apariencia local
    if (useSqlServerMirror()) {
      const remoteScreenNames = await mirrorKDSService.getAvailableScreens();

      // Mapear pantallas remotas con apariencia local si existe
      const screens = remoteScreenNames.map((remoteName) => {
        // Buscar si existe configuración local para esta pantalla
        const localScreen = localScreens.find(
          (ls) => ls.name.toLowerCase() === remoteName.toLowerCase()
        );

        return {
          name: remoteName,
          status: 'ONLINE',
          appearance: localScreen?.appearance
            ? {
                ...localScreen.appearance,
                cardColors: localScreen.appearance.cardColors,
                channelColors: localScreen.appearance.channelColors,
              }
            : null,
        };
      });

      // También incluir pantallas locales que no están en el remoto (para configuración)
      const allScreens = [...screens];
      for (const ls of localScreens) {
        if (!remoteScreenNames.some((rn) => rn.toLowerCase() === ls.name.toLowerCase())) {
          allScreens.push({
            name: ls.name,
            status: ls.status,
            appearance: ls.appearance
              ? {
                  ...ls.appearance,
                  cardColors: ls.appearance.cardColors,
                  channelColors: ls.appearance.channelColors,
                }
              : null,
          });
        }
      }

      res.json({ success: true, screens: allScreens, mode: 'mirror-sqlserver' });
      return;
    }

    // Sin conexión al mirror, usar solo datos locales
    res.json({
      success: true,
      screens: localScreens.map((s) => ({
        name: s.name,
        status: s.status,
        appearance: s.appearance
          ? {
              ...s.appearance,
              cardColors: s.appearance.cardColors,
              channelColors: s.appearance.channelColors,
            }
          : null,
      })),
      mode: 'local-postgresql',
    });
  }
);

/**
 * GET /api/mirror/queues
 * Obtener colas disponibles en el mirror
 */
export const getMirrorQueues = asyncHandler(
  async (_req: Request, res: Response) => {
    // Si hay conexión al SQL Server del local, usar esos datos reales
    if (useSqlServerMirror()) {
      const queues = await mirrorKDSService.getAvailableQueues();
      res.json({ success: true, queues, mode: 'mirror-sqlserver' });
      return;
    }

    // Sin conexión al mirror, leer de PostgreSQL local
    const queues = await prisma.queue.findMany({
      where: { active: true },
    });
    res.json({
      success: true,
      queues: queues.map((q) => q.name),
      mode: 'local-postgresql',
    });
  }
);

/**
 * POST /api/mirror/disconnect
 * Desconectar del mirror
 */
export const disconnectMirror = asyncHandler(
  async (_req: Request, res: Response) => {
    await mirrorKDSService.disconnect();
    res.json({ success: true, message: 'Desconectado del mirror' });
  }
);
