import { prisma } from '../config/database';
import { redis, REDIS_KEYS } from '../config/redis';
import { Order, Queue } from '../types';
import { balancerLogger } from '../utils/logger';
import { screenService } from './screen.service';

interface BalanceResult {
  screenId: string;
  orders: Order[];
}

/**
 * Servicio de balanceo de órdenes entre pantallas
 */
export class BalancerService {
  /**
   * Distribuye órdenes entre pantallas activas de una cola
   */
  async distributeOrders(
    orders: Order[],
    queueId: string
  ): Promise<BalanceResult[]> {
    // Obtener configuración de la cola
    const queue = await prisma.queue.findUnique({
      where: { id: queueId },
      include: {
        filters: { where: { active: true } },
      },
    });

    if (!queue) {
      balancerLogger.error(`Queue not found: ${queueId}`);
      return [];
    }

    // Filtrar órdenes según filtros de la cola
    const filteredOrders = this.filterOrders(orders, queue.filters);

    if (filteredOrders.length === 0) {
      return [];
    }

    // Obtener pantallas activas
    const activeScreenIds = await screenService.getActiveScreensForQueue(queueId);

    balancerLogger.info(
      `Queue ${queue.name}: ${activeScreenIds.length} active screens`
    );

    if (activeScreenIds.length === 0) {
      balancerLogger.warn(`No active screens for queue ${queue.name}`);
      return [];
    }

    // Distribuir según estrategia
    if (queue.distribution === 'DISTRIBUTED') {
      return this.distributeRoundRobin(filteredOrders, activeScreenIds, queueId);
    } else {
      // SINGLE: todas las órdenes a la primera pantalla activa
      return [
        {
          screenId: activeScreenIds[0],
          orders: filteredOrders,
        },
      ];
    }
  }

  /**
   * Distribución Round-Robin entre pantallas
   */
  private async distributeRoundRobin(
    orders: Order[],
    screenIds: string[],
    queueId: string
  ): Promise<BalanceResult[]> {
    const result = new Map<string, Order[]>();

    // Inicializar resultado
    screenIds.forEach((id) => result.set(id, []));

    // Obtener índice actual desde Redis
    const indexKey = REDIS_KEYS.balancerIndex(queueId);
    let currentIndex = parseInt((await redis.get(indexKey)) || '0');

    // Distribuir órdenes
    for (const order of orders) {
      const screenId = screenIds[currentIndex % screenIds.length];
      result.get(screenId)!.push(order);
      currentIndex++;
    }

    // Guardar índice para siguiente ciclo
    await redis.set(indexKey, currentIndex.toString());

    // Log de distribución
    const distribution = screenIds
      .map((id) => `${id.slice(-4)}=${result.get(id)!.length}`)
      .join(', ');
    balancerLogger.info(`Distributed ${orders.length} orders: ${distribution}`);

    return screenIds.map((screenId) => ({
      screenId,
      orders: result.get(screenId)!,
    }));
  }

  /**
   * Filtra órdenes según los filtros de la cola
   */
  private filterOrders(
    orders: Order[],
    filters: Array<{ pattern: string; suppress: boolean }>
  ): Order[] {
    if (filters.length === 0) {
      return orders;
    }

    return orders.filter((order) => {
      // Verificar si algún item coincide con los filtros
      const hasMatchingItem = order.items.some((item) =>
        filters.some((filter) => {
          const matches = item.name
            .toLowerCase()
            .includes(filter.pattern.toLowerCase());
          // Si suppress es true, excluir items que coinciden
          // Si suppress es false, incluir items que coinciden
          return filter.suppress ? !matches : matches;
        })
      );

      return hasMatchingItem;
    });
  }

  /**
   * Asigna una orden a una pantalla específica
   */
  async assignOrderToScreen(orderId: string, screenId: string): Promise<void> {
    await prisma.order.update({
      where: { id: orderId },
      data: { screenId },
    });

    // Guardar en Redis para acceso rápido
    await redis.sadd(REDIS_KEYS.screenOrders(screenId), orderId);

    balancerLogger.debug(`Order ${orderId} assigned to screen ${screenId}`);
  }

  /**
   * Obtiene órdenes asignadas a una pantalla
   */
  async getOrdersForScreen(screenId: string): Promise<Order[]> {
    const orders = await prisma.order.findMany({
      where: {
        screenId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
      include: {
        items: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
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
   * Redistribuye órdenes cuando una pantalla se reactiva
   * NOTA: Por defecto no redistribuye órdenes existentes
   */
  async handleScreenReactivation(screenId: string): Promise<void> {
    const screen = await prisma.screen.findUnique({
      where: { id: screenId },
      select: { queueId: true, name: true },
    });

    if (!screen) return;

    balancerLogger.info(
      `Screen ${screen.name} reactivated in queue ${screen.queueId}`
    );

    // Las nuevas órdenes se distribuirán automáticamente incluyendo esta pantalla
    // Las órdenes existentes permanecen en sus pantallas asignadas
  }

  /**
   * Maneja cuando una pantalla entra en standby
   */
  async handleScreenStandby(screenId: string): Promise<void> {
    const screen = await prisma.screen.findUnique({
      where: { id: screenId },
      select: { queueId: true, name: true },
    });

    if (!screen) return;

    balancerLogger.info(
      `Screen ${screen.name} entered standby - removed from balancing`
    );

    // Las órdenes asignadas permanecen pero no se asignan nuevas
    // Cuando salga de standby, volverá a recibir nuevas órdenes
  }

  /**
   * Obtiene estadísticas de balanceo para una cola
   */
  async getBalanceStats(
    queueId: string
  ): Promise<{
    queueName: string;
    totalOrders: number;
    activeScreens: number;
    ordersPerScreen: Record<string, number>;
  }> {
    const queue = await prisma.queue.findUnique({
      where: { id: queueId },
      include: {
        screens: {
          select: { id: true, name: true },
        },
      },
    });

    if (!queue) {
      throw new Error('Queue not found');
    }

    const activeScreenIds = await screenService.getActiveScreensForQueue(
      queueId
    );

    const ordersPerScreen: Record<string, number> = {};
    let totalOrders = 0;

    for (const screen of queue.screens) {
      const count = await prisma.order.count({
        where: {
          screenId: screen.id,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
      });
      ordersPerScreen[screen.name] = count;
      totalOrders += count;
    }

    return {
      queueName: queue.name,
      totalOrders,
      activeScreens: activeScreenIds.length,
      ordersPerScreen,
    };
  }

  /**
   * Reinicia el índice de balanceo para una cola
   */
  async resetBalanceIndex(queueId: string): Promise<void> {
    await redis.del(REDIS_KEYS.balancerIndex(queueId));
    balancerLogger.info(`Balance index reset for queue ${queueId}`);
  }
}

// Singleton
export const balancerService = new BalancerService();
