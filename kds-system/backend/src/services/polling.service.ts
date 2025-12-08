import { prisma } from '../config/database';
import { env } from '../config/env';
import { mxpService } from './mxp.service';
import { orderService } from './order.service';
import { balancerService } from './balancer.service';
import { websocketService } from './websocket.service';
import { logger } from '../utils/logger';

/**
 * Servicio de polling para lectura periódica de comandas
 */
export class PollingService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  /**
   * Verifica si el modo Polling está habilitado (vs modo API)
   */
  async isPollingModeEnabled(): Promise<boolean> {
    const config = await prisma.generalConfig.findUnique({
      where: { id: 'general' },
    });
    return config?.ticketMode !== 'API'; // Si no es API, es POLLING
  }

  /**
   * Obtiene el modo de tickets actual
   */
  async getTicketMode(): Promise<string> {
    const config = await prisma.generalConfig.findUnique({
      where: { id: 'general' },
    });
    return config?.ticketMode || 'POLLING';
  }

  /**
   * Inicia el polling de comandas
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('[POLLING] Already running');
      return;
    }

    // Verificar si el modo polling está habilitado
    const isPollingEnabled = await this.isPollingModeEnabled();
    if (!isPollingEnabled) {
      logger.info('[POLLING] Modo API habilitado - Polling no iniciado');
      return;
    }

    this.isRunning = true;
    logger.info(`[POLLING] Started with interval ${env.POLLING_INTERVAL}ms`);

    // Ejecutar inmediatamente
    this.poll();

    // Configurar intervalo
    this.intervalId = setInterval(() => {
      this.poll();
    }, env.POLLING_INTERVAL);
  }

  /**
   * Detiene el polling
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info('[POLLING] Stopped');
  }

  /**
   * Ejecuta un ciclo de polling
   */
  private async poll(): Promise<void> {
    try {
      // 1. Leer órdenes de MAXPOINT
      const mxpOrders = await mxpService.fetchPendingOrders(
        env.ORDER_LIFETIME_HOURS
      );

      if (mxpOrders.length === 0) {
        logger.info('INFO: Se encontraron 0 COMANDAS');
        logger.info('INFO: Revisando comandas para limpiar');
        await this.cleanup();
        return;
      }

      logger.info(`INFO: Se encontraron ${mxpOrders.length} COMANDAS`);

      // 2. Guardar en BD
      const savedOrders = await orderService.upsertOrders(mxpOrders);

      if (savedOrders.length === 0) {
        return;
      }

      // 3. Obtener colas activas
      const queues = await prisma.queue.findMany({
        where: { active: true },
      });

      // 4. Distribuir por cola
      for (const queue of queues) {
        const distributions = await balancerService.distributeOrders(
          savedOrders,
          queue.id
        );

        // 5. Enviar a pantallas
        if (distributions.length > 0) {
          await websocketService.distributeOrdersToScreens(distributions);
        }
      }

      // 6. Limpieza
      await this.cleanup();
    } catch (error) {
      logger.error('[POLLING] Error in poll cycle', { error });
    }
  }

  /**
   * Ejecuta tareas de limpieza
   */
  private async cleanup(): Promise<void> {
    try {
      // Limpiar órdenes antiguas
      await orderService.cleanupOldOrders(env.ORDER_LIFETIME_HOURS * 6);

      // Limpiar cache de MXP
      mxpService.cleanupProcessedOrders(env.ORDER_LIFETIME_HOURS * 2);
    } catch (error) {
      logger.error('[POLLING] Cleanup error', { error });
    }
  }

  /**
   * Fuerza un ciclo de polling
   */
  async forcePoll(): Promise<void> {
    await this.poll();
  }

  /**
   * Estado del servicio
   */
  async getStatus(): Promise<{ running: boolean; interval: number; ticketMode: string }> {
    const ticketMode = await this.getTicketMode();
    return {
      running: this.isRunning,
      interval: env.POLLING_INTERVAL,
      ticketMode,
    };
  }
}

// Singleton
export const pollingService = new PollingService();
