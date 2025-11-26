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
 * GET /api/orders/dashboard-stats
 * Obtener estadísticas detalladas para el dashboard
 */
export const getDashboardStats = asyncHandler(
  async (req: Request, res: Response) => {
    const { timeLimit = '5' } = req.query;
    const stats = await orderService.getDashboardStats(parseInt(timeLimit as string));
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

    const { count = 10, includeLong = true } = req.body;

    // Obtener pantallas disponibles
    const screens = await prisma.screen.findMany({
      include: { queue: true }
    });

    if (screens.length === 0) {
      throw new AppError(400, 'No screens available');
    }

    const channels = ['Local', 'Kiosko-Efectivo', 'PedidosYa', 'RAPPI', 'Drive', 'APP'];

    // Productos con modificadores complejos
    const products = [
      { name: 'Pollo Original 8pcs', base: 'pollo' },
      { name: 'Pollo Crispy 4pcs', base: 'pollo' },
      { name: 'Bucket 15 Presas', base: 'bucket' },
      { name: 'Bucket 21 Presas', base: 'bucket' },
      { name: 'Big Box Familiar', base: 'combo' },
      { name: 'Mega Box', base: 'combo' },
      { name: 'Twister Clasico', base: 'sanduche' },
      { name: 'Twister Supreme', base: 'sanduche' },
      { name: 'Sanduche Supreme', base: 'sanduche' },
      { name: 'Ruster Doble', base: 'sanduche' },
      { name: 'Papas Grandes', base: 'acomp' },
      { name: 'Papas Medianas', base: 'acomp' },
      { name: 'Ensalada Coleslaw', base: 'acomp' },
      { name: 'Puré de Papa', base: 'acomp' },
      { name: 'Coca-Cola 500ml', base: 'bebida' },
      { name: 'Limonada Grande', base: 'bebida' },
      { name: 'Helado Vainilla', base: 'postre' },
      { name: 'Sundae Chocolate', base: 'postre' },
      { name: 'Alitas BBQ x12', base: 'alitas' },
      { name: 'Nuggets x20', base: 'nuggets' },
    ];

    // Modificadores más variados y complejos
    const simpleModifiers = ['Sin sal', 'Extra crispy', 'Con salsa BBQ', 'Sin cebolla', 'Sin mayonesa', 'Extra picante'];

    // Modificadores especiales para buckets (múltiples presas)
    const bucketModifiers = [
      '8 en Crispy, 7 en Original',
      '10 en Original, 5 en Crispy',
      '12 en Crispy, 3 en Original',
      '5 en Original, 5 en Crispy, 5 en Picante',
      '7 en Original, 7 en Crispy, 7 en Picante',
      '15 en Crispy',
      '21 en Original',
      '10 en Picante, 11 en Original',
    ];

    const comboModifiers = [
      'Bebida: Coca-Cola, Acomp: Papas Grandes',
      'Bebida: Sprite, Acomp: Ensalada',
      'Sin ensalada, Bebida grande',
      'Acomp: Puré de Papa, Extra salsa',
    ];

    const createdOrders = [];

    // Plantillas de órdenes largas predefinidas
    const longOrderTemplates = [
      {
        items: [
          { name: 'Bucket 15 Presas', quantity: 1, modifier: '8 en Crispy, 7 en Original' },
          { name: 'Papas Grandes', quantity: 3, modifier: 'Extra sal' },
          { name: 'Coca-Cola 500ml', quantity: 3, modifier: 'Sin hielo' },
          { name: 'Ensalada Coleslaw', quantity: 2, modifier: null },
          { name: 'Alitas BBQ x12', quantity: 1, modifier: 'Extra picante' },
          { name: 'Nuggets x20', quantity: 1, modifier: 'Con salsa BBQ' },
          { name: 'Helado Vainilla', quantity: 2, modifier: null },
          { name: 'Limonada Grande', quantity: 2, modifier: 'Sin azucar' },
        ]
      },
      {
        items: [
          { name: 'Bucket 21 Presas', quantity: 1, modifier: '10 en Crispy, 5 en Original, 6 en Picante' },
          { name: 'Big Box Familiar', quantity: 2, modifier: 'Bebida: Coca-Cola, Acomp: Papas Grandes' },
          { name: 'Papas Grandes', quantity: 4, modifier: null },
          { name: 'Puré de Papa', quantity: 2, modifier: null },
          { name: 'Coca-Cola 500ml', quantity: 5, modifier: null },
          { name: 'Sundae Chocolate', quantity: 3, modifier: 'Extra chocolate' },
        ]
      },
      {
        items: [
          { name: 'Pollo Original 8pcs', quantity: 2, modifier: null },
          { name: 'Pollo Crispy 4pcs', quantity: 3, modifier: 'Extra crispy' },
          { name: 'Twister Clasico', quantity: 4, modifier: 'Sin cebolla' },
          { name: 'Ruster Doble', quantity: 2, modifier: 'Extra mayonesa' },
          { name: 'Papas Grandes', quantity: 5, modifier: 'Sin sal' },
          { name: 'Ensalada Coleslaw', quantity: 3, modifier: null },
          { name: 'Limonada Grande', quantity: 4, modifier: null },
          { name: 'Alitas BBQ x12', quantity: 2, modifier: '6 BBQ, 6 Picante' },
          { name: 'Nuggets x20', quantity: 2, modifier: 'Con salsa Ranch' },
        ]
      },
      {
        items: [
          { name: 'Mega Box', quantity: 3, modifier: 'Sin ensalada, Bebida grande' },
          { name: 'Bucket 15 Presas', quantity: 1, modifier: '5 Original, 5 Crispy, 5 Picante' },
          { name: 'Papas Medianas', quantity: 6, modifier: null },
          { name: 'Coca-Cola 500ml', quantity: 6, modifier: '3 sin hielo' },
          { name: 'Helado Vainilla', quantity: 4, modifier: null },
        ]
      },
    ];

    for (let i = 0; i < count; i++) {
      const screen = screens[Math.floor(Math.random() * screens.length)];
      const channel = channels[Math.floor(Math.random() * channels.length)];

      let items: Array<{ name: string; quantity: number; modifier: string | null }> = [];

      // 30% de probabilidad de orden larga si includeLong está activo
      const isLongOrder = includeLong && Math.random() < 0.3;

      if (isLongOrder) {
        // Usar una plantilla de orden larga
        const template = longOrderTemplates[Math.floor(Math.random() * longOrderTemplates.length)];
        items = [...template.items];
      } else {
        // Generar orden normal
        const numItems = Math.floor(Math.random() * 5) + 2; // 2-6 items

        for (let j = 0; j < numItems; j++) {
          const product = products[Math.floor(Math.random() * products.length)];
          let modifier: string | null = null;

          // Asignar modificador según tipo de producto
          if (product.base === 'bucket') {
            modifier = Math.random() > 0.3 ? bucketModifiers[Math.floor(Math.random() * bucketModifiers.length)] : null;
          } else if (product.base === 'combo') {
            modifier = Math.random() > 0.5 ? comboModifiers[Math.floor(Math.random() * comboModifiers.length)] : null;
          } else {
            modifier = Math.random() > 0.5 ? simpleModifiers[Math.floor(Math.random() * simpleModifiers.length)] : null;
          }

          items.push({
            name: product.name,
            quantity: Math.floor(Math.random() * 3) + 1,
            modifier,
          });
        }
      }

      // Crear orden con tiempo aleatorio en los últimos 10 minutos para ver variación de colores
      const minutesAgo = Math.random() * 10; // 0-10 minutos atrás
      const createdAt = new Date(Date.now() - minutesAgo * 60 * 1000);
      const orderNum = 3000 + i + Math.floor(Math.random() * 1000);

      const order = await prisma.order.create({
        data: {
          externalId: `TEST-${Date.now()}-${i}`,
          screenId: screen.id,
          channel,
          customerName: Math.random() > 0.2 ? `Cliente ${orderNum}` : null,
          identifier: orderNum.toString(),
          status: 'PENDING', // Todas pendientes para pruebas
          createdAt,
          items: {
            create: items
          }
        },
        include: { items: true }
      });

      createdOrders.push(order);
    }

    res.json({
      message: `Created ${createdOrders.length} test orders (${includeLong ? 'including long orders' : 'short orders only'})`,
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
