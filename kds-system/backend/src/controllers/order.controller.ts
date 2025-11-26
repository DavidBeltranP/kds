import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { orderService } from '../services/order.service';
import { balancerService } from '../services/balancer.service';
import { AuthenticatedRequest } from '../types';
import { asyncHandler, AppError } from '../middlewares/error.middleware';
import { env } from '../config/env';

/**
 * GET /api/orders
 * Obtener todas las órdenes con filtros
 */
export const getAllOrders = asyncHandler(
  async (req: Request, res: Response) => {
    const { status, screenId, queueId, search, limit = '50', offset = '0' } = req.query;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (screenId) {
      where.screenId = screenId;
    }

    if (queueId) {
      where.screen = { queueId };
    }

    if (search) {
      where.identifier = { contains: search as string, mode: 'insensitive' };
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: true,
        screen: {
          select: {
            name: true,
            queue: {
              select: { name: true }
            }
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    const total = await prisma.order.count({ where });

    // Mapear para el frontend
    const mappedOrders = orders.map(order => ({
      id: order.id,
      externalId: order.externalId,
      orderNumber: order.identifier,
      status: order.status,
      queueName: order.screen?.queue?.name || 'Sin asignar',
      screenName: order.screen?.name || null,
      items: order.items.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        modifiers: item.modifier ? [item.modifier] : [],
      })),
      createdAt: order.createdAt,
      finishedAt: order.finishedAt,
      finishTime: order.finishedAt
        ? Math.round((order.finishedAt.getTime() - order.createdAt.getTime()) / 1000)
        : null,
      metadata: {
        channel: order.channel,
        customerName: order.customerName,
      },
    }));

    res.json({ orders: mappedOrders, total });
  }
);

/**
 * GET /api/orders/:id
 * Obtener una orden por ID
 */
export const getOrder = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      screen: {
        select: { name: true, ip: true },
      },
    },
  });

  if (!order) {
    throw new AppError(404, 'Order not found');
  }

  res.json(order);
});

/**
 * GET /api/orders/screen/:screenId
 * Obtener órdenes de una pantalla específica
 */
export const getOrdersByScreen = asyncHandler(
  async (req: Request, res: Response) => {
    const { screenId } = req.params;

    const orders = await balancerService.getOrdersForScreen(screenId);

    res.json(orders);
  }
);

/**
 * POST /api/orders/:id/finish
 * Finalizar una orden
 */
export const finishOrder = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { screenId } = req.body;

    if (!screenId) {
      throw new AppError(400, 'screenId is required');
    }

    const order = await orderService.finishOrder(id, screenId);

    if (!order) {
      throw new AppError(400, 'Failed to finish order');
    }

    res.json(order);
  }
);

/**
 * POST /api/orders/:id/undo
 * Deshacer finalización de orden
 */
export const undoFinishOrder = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const order = await orderService.undoFinishOrder(id);

    if (!order) {
      throw new AppError(400, 'Failed to restore order');
    }

    res.json(order);
  }
);

/**
 * POST /api/orders/:id/cancel
 * Cancelar una orden
 */
export const cancelOrder = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;

    await orderService.cancelOrder(id, reason);

    res.json({ message: 'Order cancelled' });
  }
);

/**
 * GET /api/orders/stats
 * Obtener estadísticas de órdenes
 */
export const getOrderStats = asyncHandler(
  async (_req: Request, res: Response) => {
    const stats = await orderService.getOrderStats();
    res.json(stats);
  }
);

/**
 * GET /api/orders/recently-finished/:screenId
 * Obtener órdenes recientemente finalizadas (para undo)
 */
export const getRecentlyFinished = asyncHandler(
  async (req: Request, res: Response) => {
    const { screenId } = req.params;
    const { minutes = '5' } = req.query;

    const orders = await orderService.getRecentlyFinishedOrders(
      screenId,
      parseInt(minutes as string)
    );

    res.json(orders);
  }
);

/**
 * DELETE /api/orders/cleanup
 * Limpiar órdenes antiguas
 */
export const cleanupOrders = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { hours = '24' } = req.query;

    const count = await orderService.cleanupOldOrders(
      parseInt(hours as string)
    );

    res.json({ message: `Cleaned up ${count} orders` });
  }
);

/**
 * POST /api/orders/generate-test
 * Generar órdenes de prueba (solo desarrollo)
 */
export const generateTestOrders = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (env.NODE_ENV === 'production') {
      throw new AppError(403, 'Not available in production');
    }

    const { count = 10 } = req.body;

    // Obtener pantallas disponibles
    const screens = await prisma.screen.findMany({
      include: { queue: true }
    });

    if (screens.length === 0) {
      throw new AppError(400, 'No screens available');
    }

    const channels = ['Local', 'Kiosko-Efectivo', 'PedidosYa', 'RAPPI', 'Drive', 'APP'];
    const products = [
      { name: 'Pollo Original 8pcs', base: 'pollo' },
      { name: 'Pollo Crispy 4pcs', base: 'pollo' },
      { name: 'Big Box Familiar', base: 'combo' },
      { name: 'Twister Clasico', base: 'sanduche' },
      { name: 'Sanduche Supreme', base: 'sanduche' },
      { name: 'Ruster Doble', base: 'sanduche' },
      { name: 'Papas Grandes', base: 'acomp' },
      { name: 'Ensalada Coleslaw', base: 'acomp' },
      { name: 'Coca-Cola 500ml', base: 'bebida' },
      { name: 'Limonada', base: 'bebida' },
    ];

    const modifiers = ['Sin sal', 'Extra crispy', 'Con salsa BBQ', 'Sin cebolla', ''];

    const createdOrders = [];

    for (let i = 0; i < count; i++) {
      const screen = screens[Math.floor(Math.random() * screens.length)];
      const channel = channels[Math.floor(Math.random() * channels.length)];
      const numItems = Math.floor(Math.random() * 4) + 1;

      const items = [];
      for (let j = 0; j < numItems; j++) {
        const product = products[Math.floor(Math.random() * products.length)];
        items.push({
          name: product.name,
          quantity: Math.floor(Math.random() * 3) + 1,
          modifier: modifiers[Math.floor(Math.random() * modifiers.length)] || null,
        });
      }

      // Crear orden con tiempo aleatorio en las últimas 2 horas
      const createdAt = new Date(Date.now() - Math.random() * 2 * 60 * 60 * 1000);
      const orderNum = 1000 + i + Math.floor(Math.random() * 9000);

      const order = await prisma.order.create({
        data: {
          externalId: `TEST-${Date.now()}-${i}`,
          screenId: screen.id,
          channel,
          customerName: Math.random() > 0.3 ? `Cliente ${orderNum}` : null,
          identifier: orderNum.toString(),
          status: Math.random() > 0.7 ? 'FINISHED' : 'PENDING',
          createdAt,
          finishedAt: Math.random() > 0.7 ? new Date(createdAt.getTime() + Math.random() * 300000) : null,
          items: {
            create: items
          }
        },
        include: { items: true }
      });

      createdOrders.push(order);
    }

    res.json({
      message: `Created ${createdOrders.length} test orders`,
      orders: createdOrders.length
    });
  }
);

/**
 * DELETE /api/orders/test-orders
 * Eliminar todas las órdenes de prueba (solo desarrollo)
 */
export const deleteTestOrders = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (env.NODE_ENV === 'production') {
      throw new AppError(403, 'Not available in production');
    }

    // Eliminar items de órdenes de prueba primero (por la relación)
    await prisma.orderItem.deleteMany({
      where: {
        order: {
          externalId: { startsWith: 'TEST-' }
        }
      }
    });

    // Eliminar órdenes de prueba
    const result = await prisma.order.deleteMany({
      where: {
        externalId: { startsWith: 'TEST-' }
      }
    });

    res.json({
      message: `Deleted ${result.count} test orders`,
      count: result.count
    });
  }
);
