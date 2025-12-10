import { prisma } from '../config/database';
import { redis, REDIS_KEYS } from '../config/redis';
import { Order, Queue } from '../types';
import { balancerLogger } from '../utils/logger';
import { screenService } from './screen.service';
import { mirrorKDSService, MirrorOrder } from './mirror-kds.service';

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
      // Si solo hay 1 pantalla activa, no tiene sentido balancear
      // Todas las órdenes van a esa única pantalla
      if (activeScreenIds.length === 1) {
        balancerLogger.info(
          `Queue ${queue.name}: Solo 1 pantalla activa, balanceo desactivado temporalmente`
        );
        return [
          {
            screenId: activeScreenIds[0],
            orders: filteredOrders,
          },
        ];
      }
      // Con 2+ pantallas activas, balancear con Round-Robin
      balancerLogger.info(
        `Queue ${queue.name}: ${activeScreenIds.length} pantallas activas, balanceo activado`
      );
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
   * Si el Mirror está conectado, obtiene órdenes del KDS2 remoto
   */
  async getOrdersForScreen(screenId: string): Promise<Order[]> {
    // Si el Mirror está conectado, obtener órdenes del KDS2 remoto
    if (mirrorKDSService.getConnectionStatus()) {
      return this.getOrdersFromMirror(screenId);
    }

    // Si no hay Mirror, obtener de la BD local
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
   * Obtiene órdenes del Mirror (KDS2 remoto) para una pantalla local
   */
  private async getOrdersFromMirror(screenId: string): Promise<Order[]> {
    try {
      // Obtener info de la pantalla local para mapear con el Mirror
      const screen = await prisma.screen.findUnique({
        where: { id: screenId },
        select: { name: true, number: true },
      });

      if (!screen) return [];

      // Mapeo: KDS1 → Pantalla1, KDS2 → Pantalla2, etc.
      // O usar el número directamente
      const mirrorScreenName = `Pantalla${screen.number}`;

      // Obtener órdenes del Mirror filtrando por la pantalla remota
      const mirrorOrders = await mirrorKDSService.getOrdersOnScreen(mirrorScreenName);

      // Convertir MirrorOrder a Order
      return mirrorOrders.map((mo: MirrorOrder) => ({
        id: mo.id,
        externalId: mo.externalId,
        screenId: screenId,
        channel: mo.channel,
        channelType: mo.channelType,
        customerName: mo.customerName,
        identifier: mo.identifier,
        status: mo.status as Order['status'],
        createdAt: mo.createdAt,
        finishedAt: undefined,
        items: mo.items.map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          notes: item.notes,
          modifier: item.subitems?.map(s => `${s.quantity}x ${s.name}`).join(', '),
        })),
      }));
    } catch (error) {
      balancerLogger.error('Error getting orders from Mirror:', { error });
      return [];
    }
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
   * Redistribuye las órdenes pendientes a pantallas activas
   */
  async handleScreenStandby(screenId: string): Promise<string[]> {
    const screen = await prisma.screen.findUnique({
      where: { id: screenId },
      select: { queueId: true, name: true },
    });

    if (!screen) return [];

    balancerLogger.info(
      `Screen ${screen.name} entered standby - redistributing orders`
    );

    // Obtener pantallas activas de la misma cola (excluyendo la que se apaga)
    const activeScreenIds = await screenService.getActiveScreensForQueue(screen.queueId);
    const remainingScreens = activeScreenIds.filter(id => id !== screenId);

    if (remainingScreens.length === 0) {
      balancerLogger.warn(
        `No active screens to redistribute orders from ${screen.name}`
      );
      return [];
    }

    // Obtener órdenes pendientes de la pantalla que se apaga
    const pendingOrders = await prisma.order.findMany({
      where: {
        screenId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
      select: { id: true },
    });

    if (pendingOrders.length === 0) {
      balancerLogger.info(`No pending orders to redistribute from ${screen.name}`);
      return [];
    }

    balancerLogger.info(
      `Redistributing ${pendingOrders.length} orders from ${screen.name} to ${remainingScreens.length} active screens`
    );

    // Redistribuir órdenes usando round-robin entre pantallas activas
    const affectedScreenIds: Set<string> = new Set();
    let index = 0;

    for (const order of pendingOrders) {
      const targetScreenId = remainingScreens[index % remainingScreens.length];

      await prisma.order.update({
        where: { id: order.id },
        data: { screenId: targetScreenId },
      });

      // Actualizar Redis
      await redis.srem(REDIS_KEYS.screenOrders(screenId), order.id);
      await redis.sadd(REDIS_KEYS.screenOrders(targetScreenId), order.id);

      affectedScreenIds.add(targetScreenId);
      index++;
    }

    balancerLogger.info(
      `Redistributed ${pendingOrders.length} orders to screens: ${Array.from(affectedScreenIds).map(id => id.slice(-4)).join(', ')}`
    );

    return Array.from(affectedScreenIds);
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
