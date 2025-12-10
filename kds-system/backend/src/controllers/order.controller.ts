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
        select: { name: true, number: true },
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

    const { count = 10, includeLong = true, includeExtraLong = true } = req.body;

    // Obtener pantallas disponibles
    const screens = await prisma.screen.findMany({
      include: { queue: true }
    });

    if (screens.length === 0) {
      throw new AppError(400, 'No screens available');
    }

    const channels = ['Local', 'Kiosko-Efectivo', 'PedidosYa', 'RAPPI', 'Drive', 'APP', 'UberEats', 'Glovo'];

    // Productos con modificadores complejos - más variedad
    const products = [
      { name: 'Pollo Original 8pcs', base: 'pollo' },
      { name: 'Pollo Crispy 4pcs', base: 'pollo' },
      { name: 'Pollo Picante 6pcs', base: 'pollo' },
      { name: 'Pollo Extra Crispy 12pcs', base: 'pollo' },
      { name: 'Bucket 15 Presas', base: 'bucket' },
      { name: 'Bucket 21 Presas', base: 'bucket' },
      { name: 'Bucket Familiar 30 Presas', base: 'bucket' },
      { name: 'Mega Bucket 45 Presas', base: 'bucket' },
      { name: 'Big Box Familiar', base: 'combo' },
      { name: 'Mega Box', base: 'combo' },
      { name: 'Box Individual', base: 'combo' },
      { name: 'Duo Box', base: 'combo' },
      { name: 'Triple Box', base: 'combo' },
      { name: 'Super Combo Familiar', base: 'combo' },
      { name: 'Twister Clasico', base: 'sanduche' },
      { name: 'Twister Supreme', base: 'sanduche' },
      { name: 'Twister Bacon', base: 'sanduche' },
      { name: 'Sanduche Supreme', base: 'sanduche' },
      { name: 'Sanduche Doble', base: 'sanduche' },
      { name: 'Ruster Doble', base: 'sanduche' },
      { name: 'Ruster Triple', base: 'sanduche' },
      { name: 'Zinger Doble', base: 'sanduche' },
      { name: 'Papas Grandes', base: 'acomp' },
      { name: 'Papas Medianas', base: 'acomp' },
      { name: 'Papas Familiar', base: 'acomp' },
      { name: 'Papas con Queso', base: 'acomp' },
      { name: 'Papas Bacon', base: 'acomp' },
      { name: 'Ensalada Coleslaw', base: 'acomp' },
      { name: 'Ensalada Coleslaw Grande', base: 'acomp' },
      { name: 'Puré de Papa', base: 'acomp' },
      { name: 'Puré de Papa Grande', base: 'acomp' },
      { name: 'Arroz con Pollo', base: 'acomp' },
      { name: 'Mazorca', base: 'acomp' },
      { name: 'Coca-Cola 500ml', base: 'bebida' },
      { name: 'Coca-Cola 1L', base: 'bebida' },
      { name: 'Coca-Cola 2L', base: 'bebida' },
      { name: 'Sprite 500ml', base: 'bebida' },
      { name: 'Fanta 500ml', base: 'bebida' },
      { name: 'Limonada Grande', base: 'bebida' },
      { name: 'Limonada Familiar', base: 'bebida' },
      { name: 'Jugo de Naranja', base: 'bebida' },
      { name: 'Agua Mineral', base: 'bebida' },
      { name: 'Helado Vainilla', base: 'postre' },
      { name: 'Helado Chocolate', base: 'postre' },
      { name: 'Helado Mixto', base: 'postre' },
      { name: 'Sundae Chocolate', base: 'postre' },
      { name: 'Sundae Fresa', base: 'postre' },
      { name: 'Sundae Caramelo', base: 'postre' },
      { name: 'Pie de Manzana', base: 'postre' },
      { name: 'Brownie', base: 'postre' },
      { name: 'Alitas BBQ x6', base: 'alitas' },
      { name: 'Alitas BBQ x12', base: 'alitas' },
      { name: 'Alitas BBQ x24', base: 'alitas' },
      { name: 'Alitas Picantes x12', base: 'alitas' },
      { name: 'Alitas Mix x18', base: 'alitas' },
      { name: 'Nuggets x10', base: 'nuggets' },
      { name: 'Nuggets x20', base: 'nuggets' },
      { name: 'Nuggets x40', base: 'nuggets' },
      { name: 'Strips x6', base: 'strips' },
      { name: 'Strips x12', base: 'strips' },
      { name: 'Strips x24', base: 'strips' },
    ];

    // Modificadores más variados y complejos
    const simpleModifiers = [
      'Sin sal', 'Extra crispy', 'Con salsa BBQ', 'Sin cebolla', 'Sin mayonesa',
      'Extra picante', 'Con salsa ranch', 'Sin lechuga', 'Extra queso',
      'Sin tomate', 'Extra salsa', 'Con jalapeños', 'Sin pepinillos',
      'Doble carne', 'Sin mostaza', 'Extra bacon', 'Con aguacate'
    ];

    // Modificadores especiales para buckets (múltiples presas)
    const bucketModifiers = [
      '8 en Crispy, 7 en Original',
      '10 en Original, 5 en Crispy',
      '12 en Crispy, 3 en Original',
      '5 en Original, 5 en Crispy, 5 en Picante',
      '7 en Original, 7 en Crispy, 7 en Picante',
      '15 en Crispy, 6 en Original, 9 en Picante',
      '20 en Crispy, 10 en Picante',
      '15 en Original, 15 en Crispy',
      '10 en Original, 10 en Crispy, 10 en Picante',
      '21 en Original',
      '10 en Picante, 11 en Original',
      '15 en Extra Crispy',
      '8 Original, 8 Crispy, 8 Picante, 6 BBQ',
      '12 Muslos Original, 12 Pechugas Crispy, 6 Alitas',
    ];

    const comboModifiers = [
      'Bebida: Coca-Cola, Acomp: Papas Grandes',
      'Bebida: Sprite, Acomp: Ensalada',
      'Sin ensalada, Bebida grande',
      'Acomp: Puré de Papa, Extra salsa',
      'Bebida: Limonada, Acomp: Arroz',
      'Con postre: Sundae Chocolate',
      'Cambio acomp: Mazorca por Papas',
      'Bebida: 2 Coca-Cola 500ml, Acomp: Papas Familiar',
      'Extra pollo, Sin acompañamiento',
      'Todo sin sal, Bebida sin hielo',
    ];

    const createdOrders = [];

    // Plantillas de órdenes extra largas (evento, fiesta, catering)
    const extraLongOrderTemplates = [
      {
        // Pedido para fiesta grande
        items: [
          { name: 'Mega Bucket 45 Presas', quantity: 2, modifier: '20 Original, 15 Crispy, 10 Picante por bucket' },
          { name: 'Bucket Familiar 30 Presas', quantity: 3, modifier: '15 Original, 15 Crispy por bucket' },
          { name: 'Alitas BBQ x24', quantity: 4, modifier: '2 con salsa BBQ, 2 con salsa picante' },
          { name: 'Alitas Mix x18', quantity: 3, modifier: '6 BBQ, 6 Picante, 6 Ranch' },
          { name: 'Nuggets x40', quantity: 3, modifier: 'Con 6 salsas variadas' },
          { name: 'Strips x24', quantity: 2, modifier: 'Extra crispy, con salsa miel mostaza' },
          { name: 'Papas Familiar', quantity: 8, modifier: 'Sin sal' },
          { name: 'Papas con Queso', quantity: 4, modifier: 'Extra queso' },
          { name: 'Ensalada Coleslaw Grande', quantity: 6, modifier: null },
          { name: 'Puré de Papa Grande', quantity: 4, modifier: null },
          { name: 'Coca-Cola 2L', quantity: 6, modifier: null },
          { name: 'Limonada Familiar', quantity: 4, modifier: 'Sin azúcar' },
          { name: 'Sundae Chocolate', quantity: 8, modifier: 'Extra chocolate' },
          { name: 'Sundae Fresa', quantity: 6, modifier: null },
          { name: 'Pie de Manzana', quantity: 10, modifier: 'Con helado' },
        ]
      },
      {
        // Pedido corporativo
        items: [
          { name: 'Bucket 21 Presas', quantity: 5, modifier: '10 Crispy, 6 Original, 5 Picante' },
          { name: 'Big Box Familiar', quantity: 8, modifier: 'Bebida: Coca-Cola, Acomp: Papas Grandes' },
          { name: 'Mega Box', quantity: 6, modifier: 'Sin ensalada, Bebida grande, Extra pollo' },
          { name: 'Twister Supreme', quantity: 12, modifier: '4 sin cebolla, 4 extra picante, 4 normal' },
          { name: 'Zinger Doble', quantity: 8, modifier: 'Extra mayonesa' },
          { name: 'Papas Grandes', quantity: 15, modifier: null },
          { name: 'Ensalada Coleslaw', quantity: 10, modifier: null },
          { name: 'Coca-Cola 1L', quantity: 10, modifier: null },
          { name: 'Sprite 500ml', quantity: 8, modifier: null },
          { name: 'Agua Mineral', quantity: 12, modifier: null },
          { name: 'Brownie', quantity: 15, modifier: 'Con helado de vainilla' },
        ]
      },
      {
        // Pedido restaurante/evento
        items: [
          { name: 'Pollo Original 8pcs', quantity: 10, modifier: 'Bien cocido' },
          { name: 'Pollo Crispy 4pcs', quantity: 15, modifier: 'Extra crispy' },
          { name: 'Pollo Picante 6pcs', quantity: 8, modifier: 'Muy picante' },
          { name: 'Bucket 15 Presas', quantity: 4, modifier: '8 Original, 7 Crispy' },
          { name: 'Alitas BBQ x12', quantity: 6, modifier: '3 BBQ, 3 Picante' },
          { name: 'Nuggets x20', quantity: 5, modifier: 'Con salsas variadas' },
          { name: 'Strips x12', quantity: 4, modifier: 'Con salsa ranch' },
          { name: 'Sanduche Doble', quantity: 8, modifier: 'Sin cebolla, extra mayonesa' },
          { name: 'Ruster Triple', quantity: 6, modifier: 'Extra bacon, extra queso' },
          { name: 'Papas Familiar', quantity: 6, modifier: 'Sin sal' },
          { name: 'Papas Bacon', quantity: 4, modifier: 'Extra bacon' },
          { name: 'Arroz con Pollo', quantity: 8, modifier: null },
          { name: 'Mazorca', quantity: 10, modifier: 'Con mantequilla' },
          { name: 'Coca-Cola 2L', quantity: 4, modifier: null },
          { name: 'Limonada Grande', quantity: 8, modifier: null },
          { name: 'Helado Mixto', quantity: 10, modifier: null },
        ]
      },
    ];

    // Plantillas de órdenes largas normales
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
      {
        items: [
          { name: 'Triple Box', quantity: 2, modifier: 'Bebida: Sprite, Extra salsa BBQ' },
          { name: 'Duo Box', quantity: 3, modifier: 'Acomp: Puré de Papa' },
          { name: 'Alitas Picantes x12', quantity: 2, modifier: 'Extra picante, con salsa ranch' },
          { name: 'Strips x12', quantity: 2, modifier: 'Con miel mostaza' },
          { name: 'Papas con Queso', quantity: 3, modifier: 'Extra queso' },
          { name: 'Coca-Cola 1L', quantity: 2, modifier: null },
          { name: 'Sundae Caramelo', quantity: 4, modifier: 'Extra caramelo' },
        ]
      },
      {
        items: [
          { name: 'Super Combo Familiar', quantity: 2, modifier: 'Todo crispy, Bebida: Limonada Familiar' },
          { name: 'Zinger Doble', quantity: 4, modifier: '2 sin cebolla, 2 extra picante' },
          { name: 'Twister Bacon', quantity: 3, modifier: 'Extra bacon' },
          { name: 'Papas Familiar', quantity: 2, modifier: null },
          { name: 'Ensalada Coleslaw Grande', quantity: 2, modifier: null },
          { name: 'Jugo de Naranja', quantity: 4, modifier: null },
          { name: 'Brownie', quantity: 4, modifier: 'Con helado' },
        ]
      },
    ];

    for (let i = 0; i < count; i++) {
      const screen = screens[Math.floor(Math.random() * screens.length)];
      const channel = channels[Math.floor(Math.random() * channels.length)];

      let items: Array<{ name: string; quantity: number; modifier: string | null }> = [];

      // Determinar tipo de orden
      const random = Math.random();
      const isExtraLongOrder = includeExtraLong && random < 0.15; // 15% extra largas
      const isLongOrder = includeLong && !isExtraLongOrder && random < 0.45; // 30% largas

      if (isExtraLongOrder) {
        // Usar plantilla de orden extra larga (fiesta/evento)
        const template = extraLongOrderTemplates[Math.floor(Math.random() * extraLongOrderTemplates.length)];
        items = [...template.items];
      } else if (isLongOrder) {
        // Usar una plantilla de orden larga
        const template = longOrderTemplates[Math.floor(Math.random() * longOrderTemplates.length)];
        items = [...template.items];
      } else {
        // Generar orden normal con más variación
        const numItems = Math.floor(Math.random() * 6) + 2; // 2-7 items

        for (let j = 0; j < numItems; j++) {
          const product = products[Math.floor(Math.random() * products.length)];
          let modifier: string | null = null;

          // Asignar modificador según tipo de producto (70% probabilidad de tener modificador)
          if (product.base === 'bucket') {
            modifier = Math.random() > 0.2 ? bucketModifiers[Math.floor(Math.random() * bucketModifiers.length)] : null;
          } else if (product.base === 'combo') {
            modifier = Math.random() > 0.3 ? comboModifiers[Math.floor(Math.random() * comboModifiers.length)] : null;
          } else {
            modifier = Math.random() > 0.4 ? simpleModifiers[Math.floor(Math.random() * simpleModifiers.length)] : null;
          }

          items.push({
            name: product.name,
            quantity: Math.floor(Math.random() * 4) + 1, // 1-4 cantidad
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

    const extraLongCount = createdOrders.filter(o => o.items.length > 10).length;
    const longCount = createdOrders.filter(o => o.items.length >= 6 && o.items.length <= 10).length;

    res.json({
      message: `Created ${createdOrders.length} test orders`,
      details: {
        total: createdOrders.length,
        extraLong: extraLongCount,
        long: longCount,
        normal: createdOrders.length - extraLongCount - longCount
      }
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
