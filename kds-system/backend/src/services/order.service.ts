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
