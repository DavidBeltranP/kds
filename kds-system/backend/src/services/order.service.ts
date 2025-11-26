import { prisma } from '../config/database';
import { redis, REDIS_KEYS, redisPub } from '../config/redis';
import { Order, OrderItem } from '../types';
import { orderLogger } from '../utils/logger';
import { balancerService } from './balancer.service';

/**
 * Servicio para gestión de órdenes
 */
export class OrderService {
  /**
   * Crea o actualiza órdenes desde MAXPOINT
   */
  async upsertOrders(orders: Order[]): Promise<Order[]> {
    const results: Order[] = [];

    for (const order of orders) {
      try {
        // Verificar si ya existe
        const existing = await prisma.order.findUnique({
          where: { externalId: order.externalId },
        });

        if (existing) {
          // Ya existe, no hacer nada
          continue;
        }

        // Crear nueva orden
        const created = await prisma.order.create({
          data: {
            externalId: order.externalId,
            channel: order.channel,
            customerName: order.customerName,
            identifier: order.identifier,
            status: 'PENDING',
            items: {
              create: order.items.map((item) => ({
                name: item.name,
                quantity: item.quantity,
                notes: item.notes,
                modifier: item.modifier,
              })),
            },
          },
          include: {
            items: true,
          },
        });

        results.push({
          id: created.id,
          externalId: created.externalId,
          channel: created.channel,
          customerName: created.customerName || undefined,
          identifier: created.identifier,
          status: created.status as Order['status'],
          createdAt: created.createdAt,
          items: created.items.map((item) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            notes: item.notes || undefined,
            modifier: item.modifier || undefined,
          })),
        });

        orderLogger.debug(`Order created: ${created.identifier}`);
      } catch (error) {
        orderLogger.error(`Error creating order ${order.externalId}`, { error });
      }
    }

    return results;
  }

  /**
   * Finaliza una orden
   */
  async finishOrder(orderId: string, screenId: string): Promise<Order | null> {
    try {
      const order = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'FINISHED',
          finishedAt: new Date(),
        },
        include: {
          items: true,
        },
      });

      // Remover de Redis
      await redis.srem(REDIS_KEYS.screenOrders(screenId), orderId);
      await redis.del(REDIS_KEYS.orderData(orderId));

      // Publicar actualización
      await redisPub.publish(
        REDIS_KEYS.ordersUpdated(),
        JSON.stringify({ screenId, orderId, action: 'finished' })
      );

      orderLogger.info(`Order finished: ${order.identifier} on screen ${screenId}`);

      return {
        id: order.id,
        externalId: order.externalId,
        screenId: order.screenId || undefined,
        channel: order.channel,
        customerName: order.customerName || undefined,
        identifier: order.identifier,
        status: order.status as Order['status'],
        createdAt: order.createdAt,
        finishedAt: order.finishedAt || undefined,
        items: order.items.map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          notes: item.notes || undefined,
          modifier: item.modifier || undefined,
        })),
      };
    } catch (error) {
      orderLogger.error(`Error finishing order ${orderId}`, { error });
      return null;
    }
  }

  /**
   * Deshace la finalización de una orden (undo)
   */
  async undoFinishOrder(orderId: string): Promise<Order | null> {
    try {
      const order = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'PENDING',
          finishedAt: null,
        },
        include: {
          items: true,
        },
      });

      // Volver a agregar a Redis si tiene pantalla asignada
      if (order.screenId) {
        await redis.sadd(REDIS_KEYS.screenOrders(order.screenId), orderId);

        await redisPub.publish(
          REDIS_KEYS.ordersUpdated(),
          JSON.stringify({
            screenId: order.screenId,
            orderId,
            action: 'restored',
          })
        );
      }

      orderLogger.info(`Order restored: ${order.identifier}`);

      return {
        id: order.id,
        externalId: order.externalId,
        screenId: order.screenId || undefined,
        channel: order.channel,
        customerName: order.customerName || undefined,
        identifier: order.identifier,
        status: order.status as Order['status'],
        createdAt: order.createdAt,
        finishedAt: order.finishedAt || undefined,
        items: order.items.map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          notes: item.notes || undefined,
          modifier: item.modifier || undefined,
        })),
      };
    } catch (error) {
      orderLogger.error(`Error restoring order ${orderId}`, { error });
      return null;
    }
  }

  /**
   * Obtiene órdenes pendientes por pantalla
   */
  async getOrdersByScreen(screenId: string): Promise<Order[]> {
    return balancerService.getOrdersForScreen(screenId);
  }

  /**
   * Obtiene órdenes recién finalizadas (para undo)
   */
  async getRecentlyFinishedOrders(
    screenId: string,
    minutesBack: number = 5
  ): Promise<Order[]> {
    const cutoff = new Date();
    cutoff.setMinutes(cutoff.getMinutes() - minutesBack);

    const orders = await prisma.order.findMany({
      where: {
        screenId,
        status: 'FINISHED',
        finishedAt: { gte: cutoff },
      },
      include: {
        items: true,
      },
      orderBy: {
        finishedAt: 'desc',
      },
      take: 10,
    });

    return orders.map((order) => ({
      id: order.id,
      externalId: order.externalId,
      screenId: order.screenId || undefined,
      channel: order.channel,
      customerName: order.customerName || undefined,
      identifier: order.identifier,
      status: order.status as Order['status'],
      createdAt: order.createdAt,
      finishedAt: order.finishedAt || undefined,
      items: order.items.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        notes: item.notes || undefined,
        modifier: item.modifier || undefined,
      })),
    }));
  }

  /**
   * Limpia órdenes antiguas
   */
  async cleanupOldOrders(hoursToKeep: number = 24): Promise<number> {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hoursToKeep);

    const result = await prisma.order.deleteMany({
      where: {
        OR: [
          { status: 'FINISHED', finishedAt: { lt: cutoff } },
          { status: 'CANCELLED', createdAt: { lt: cutoff } },
        ],
      },
    });

    if (result.count > 0) {
      orderLogger.info(`Cleaned up ${result.count} old orders`);
    }

    return result.count;
  }

  /**
   * Obtiene estadísticas de órdenes
   */
  async getOrderStats(): Promise<{
    pending: number;
    inProgress: number;
    finishedToday: number;
    avgFinishTime: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [pending, inProgress, finishedToday] = await Promise.all([
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.order.count({
        where: {
          status: 'FINISHED',
          finishedAt: { gte: today },
        },
      }),
    ]);

    // Calcular tiempo promedio de finalización
    const finishedOrders = await prisma.order.findMany({
      where: {
        status: 'FINISHED',
        finishedAt: { gte: today },
      },
      select: {
        createdAt: true,
        finishedAt: true,
      },
    });

    let avgFinishTime = 0;
    if (finishedOrders.length > 0) {
      const totalTime = finishedOrders.reduce((sum, order) => {
        if (order.finishedAt) {
          return sum + (order.finishedAt.getTime() - order.createdAt.getTime());
        }
        return sum;
      }, 0);
      avgFinishTime = Math.round(totalTime / finishedOrders.length / 1000); // segundos
    }

    return {
      pending,
      inProgress,
      finishedToday,
      avgFinishTime,
    };
  }

  /**
   * Obtiene estadísticas detalladas para el dashboard
   */
  async getDashboardStats(timeLimitMinutes: number = 5): Promise<{
    summary: {
      pending: number;
      inProgress: number;
      finishedToday: number;
      cancelledToday: number;
      onTime: number;
      outOfTime: number;
      avgFinishTime: number;
      minFinishTime: number;
      maxFinishTime: number;
    };
    fastestOrder: {
      id: string;
      identifier: string;
      channel: string;
      finishTime: number;
      items: Array<{ name: string; quantity: number; modifier?: string }>;
    } | null;
    slowestOrder: {
      id: string;
      identifier: string;
      channel: string;
      finishTime: number;
      items: Array<{ name: string; quantity: number; modifier?: string }>;
    } | null;
    byScreen: Array<{
      screenId: string;
      screenName: string;
      queueName: string;
      pending: number;
      finishedToday: number;
      onTime: number;
      outOfTime: number;
      avgFinishTime: number;
    }>;
    byChannel: Array<{
      channel: string;
      total: number;
      onTime: number;
      outOfTime: number;
      avgFinishTime: number;
    }>;
    hourlyStats: Array<{
      hour: number;
      total: number;
      onTime: number;
      outOfTime: number;
    }>;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const timeLimitMs = timeLimitMinutes * 60 * 1000;

    // Obtener todas las órdenes de hoy
    const [pendingOrders, inProgressOrders, finishedOrders, cancelledOrders, screens] = await Promise.all([
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.order.findMany({
        where: {
          status: 'FINISHED',
          finishedAt: { gte: today },
        },
        select: {
          id: true,
          identifier: true,
          screenId: true,
          channel: true,
          createdAt: true,
          finishedAt: true,
          items: {
            select: {
              name: true,
              quantity: true,
              modifier: true,
            },
          },
        },
      }),
      prisma.order.count({
        where: {
          status: 'CANCELLED',
          createdAt: { gte: today },
        },
      }),
      prisma.screen.findMany({
        select: {
          id: true,
          name: true,
          queue: { select: { name: true } },
        },
      }),
    ]);

    // Calcular tiempos de finalización
    const finishTimes = finishedOrders
      .filter(o => o.finishedAt)
      .map(o => o.finishedAt!.getTime() - o.createdAt.getTime());

    const onTimeOrders = finishedOrders.filter(o => {
      if (!o.finishedAt) return false;
      const finishTime = o.finishedAt.getTime() - o.createdAt.getTime();
      return finishTime <= timeLimitMs;
    });

    const outOfTimeOrders = finishedOrders.filter(o => {
      if (!o.finishedAt) return false;
      const finishTime = o.finishedAt.getTime() - o.createdAt.getTime();
      return finishTime > timeLimitMs;
    });

    // Estadísticas por pantalla
    const screenMap = new Map(screens.map(s => [s.id, s]));
    const byScreenMap = new Map<string, {
      pending: number;
      finishedToday: number;
      onTime: number;
      outOfTime: number;
      totalTime: number;
    }>();

    // Inicializar todas las pantallas
    screens.forEach(s => {
      byScreenMap.set(s.id, {
        pending: 0,
        finishedToday: 0,
        onTime: 0,
        outOfTime: 0,
        totalTime: 0,
      });
    });

    // Contar órdenes pendientes por pantalla
    const pendingByScreen = await prisma.order.groupBy({
      by: ['screenId'],
      where: { status: 'PENDING', screenId: { not: null } },
      _count: true,
    });
    pendingByScreen.forEach(p => {
      if (p.screenId) {
        const stats = byScreenMap.get(p.screenId);
        if (stats) stats.pending = p._count;
      }
    });

    // Procesar órdenes finalizadas por pantalla
    finishedOrders.forEach(order => {
      if (!order.screenId || !order.finishedAt) return;
      const stats = byScreenMap.get(order.screenId);
      if (!stats) return;

      const finishTime = order.finishedAt.getTime() - order.createdAt.getTime();
      stats.finishedToday++;
      stats.totalTime += finishTime;
      if (finishTime <= timeLimitMs) {
        stats.onTime++;
      } else {
        stats.outOfTime++;
      }
    });

    const byScreen = Array.from(byScreenMap.entries()).map(([screenId, stats]) => {
      const screen = screenMap.get(screenId);
      return {
        screenId,
        screenName: screen?.name || 'Desconocida',
        queueName: screen?.queue?.name || 'Sin cola',
        pending: stats.pending,
        finishedToday: stats.finishedToday,
        onTime: stats.onTime,
        outOfTime: stats.outOfTime,
        avgFinishTime: stats.finishedToday > 0
          ? Math.round(stats.totalTime / stats.finishedToday / 1000)
          : 0,
      };
    });

    // Estadísticas por canal
    const byChannelMap = new Map<string, {
      total: number;
      onTime: number;
      outOfTime: number;
      totalTime: number;
    }>();

    finishedOrders.forEach(order => {
      if (!order.finishedAt) return;
      const channel = order.channel;
      if (!byChannelMap.has(channel)) {
        byChannelMap.set(channel, { total: 0, onTime: 0, outOfTime: 0, totalTime: 0 });
      }
      const stats = byChannelMap.get(channel)!;
      const finishTime = order.finishedAt.getTime() - order.createdAt.getTime();
      stats.total++;
      stats.totalTime += finishTime;
      if (finishTime <= timeLimitMs) {
        stats.onTime++;
      } else {
        stats.outOfTime++;
      }
    });

    const byChannel = Array.from(byChannelMap.entries()).map(([channel, stats]) => ({
      channel,
      total: stats.total,
      onTime: stats.onTime,
      outOfTime: stats.outOfTime,
      avgFinishTime: stats.total > 0 ? Math.round(stats.totalTime / stats.total / 1000) : 0,
    }));

    // Estadísticas por hora
    const hourlyMap = new Map<number, { total: number; onTime: number; outOfTime: number }>();
    for (let i = 0; i < 24; i++) {
      hourlyMap.set(i, { total: 0, onTime: 0, outOfTime: 0 });
    }

    finishedOrders.forEach(order => {
      if (!order.finishedAt) return;
      const hour = order.finishedAt.getHours();
      const stats = hourlyMap.get(hour)!;
      const finishTime = order.finishedAt.getTime() - order.createdAt.getTime();
      stats.total++;
      if (finishTime <= timeLimitMs) {
        stats.onTime++;
      } else {
        stats.outOfTime++;
      }
    });

    const hourlyStats = Array.from(hourlyMap.entries()).map(([hour, stats]) => ({
      hour,
      ...stats,
    }));

    // Encontrar la orden más rápida y más lenta
    let fastestOrder: {
      id: string;
      identifier: string;
      channel: string;
      finishTime: number;
      items: Array<{ name: string; quantity: number; modifier?: string }>;
    } | null = null;
    let slowestOrder: {
      id: string;
      identifier: string;
      channel: string;
      finishTime: number;
      items: Array<{ name: string; quantity: number; modifier?: string }>;
    } | null = null;

    if (finishedOrders.length > 0) {
      let minTime = Infinity;
      let maxTime = -Infinity;

      finishedOrders.forEach(order => {
        if (!order.finishedAt) return;
        const finishTime = order.finishedAt.getTime() - order.createdAt.getTime();

        if (finishTime < minTime) {
          minTime = finishTime;
          fastestOrder = {
            id: order.id,
            identifier: order.identifier,
            channel: order.channel,
            finishTime: Math.round(finishTime / 1000),
            items: order.items.map(item => ({
              name: item.name,
              quantity: item.quantity,
              modifier: item.modifier || undefined,
            })),
          };
        }

        if (finishTime > maxTime) {
          maxTime = finishTime;
          slowestOrder = {
            id: order.id,
            identifier: order.identifier,
            channel: order.channel,
            finishTime: Math.round(finishTime / 1000),
            items: order.items.map(item => ({
              name: item.name,
              quantity: item.quantity,
              modifier: item.modifier || undefined,
            })),
          };
        }
      });
    }

    return {
      summary: {
        pending: pendingOrders,
        inProgress: inProgressOrders,
        finishedToday: finishedOrders.length,
        cancelledToday: cancelledOrders,
        onTime: onTimeOrders.length,
        outOfTime: outOfTimeOrders.length,
        avgFinishTime: finishTimes.length > 0
          ? Math.round(finishTimes.reduce((a, b) => a + b, 0) / finishTimes.length / 1000)
          : 0,
        minFinishTime: finishTimes.length > 0 ? Math.round(Math.min(...finishTimes) / 1000) : 0,
        maxFinishTime: finishTimes.length > 0 ? Math.round(Math.max(...finishTimes) / 1000) : 0,
      },
      fastestOrder,
      slowestOrder,
      byScreen,
      byChannel,
      hourlyStats,
    };
  }

  /**
   * Cancela una orden
   */
  async cancelOrder(orderId: string, reason?: string): Promise<void> {
    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
    });

    if (order.screenId) {
      await redis.srem(REDIS_KEYS.screenOrders(order.screenId), orderId);

      await redisPub.publish(
        REDIS_KEYS.ordersUpdated(),
        JSON.stringify({
          screenId: order.screenId,
          orderId,
          action: 'cancelled',
        })
      );
    }

    orderLogger.info(`Order cancelled: ${order.identifier}`, { reason });
  }
}

// Singleton
export const orderService = new OrderService();
