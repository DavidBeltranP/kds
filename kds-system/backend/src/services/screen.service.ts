import { prisma } from '../config/database';
import { redis, REDIS_KEYS, redisPub } from '../config/redis';
import { ScreenStatus, ScreenWithConfig } from '../types';
import { screenLogger } from '../utils/logger';
import { env } from '../config/env';

/**
 * Servicio para gestión de pantallas
 */
export class ScreenService {
  /**
   * Registra un heartbeat de pantalla
   */
  async registerHeartbeat(screenId: string): Promise<void> {
    const ttl = Math.ceil(env.HEARTBEAT_TIMEOUT / 1000);

    // Guardar en Redis con TTL
    await redis.setex(REDIS_KEYS.screenAlive(screenId), ttl, 'true');

    // Obtener estado actual de BD (no de Redis, para tener el valor real)
    const screen = await prisma.screen.findUnique({
      where: { id: screenId },
      select: { status: true },
    });

    // Solo actualizar a ONLINE si estaba OFFLINE (respetar STANDBY)
    if (screen?.status === 'OFFLINE') {
      await this.updateScreenStatus(screenId, 'ONLINE');
      screenLogger.info(`Screen ${screenId} came online from OFFLINE`);
    }

    // Registrar heartbeat en BD (para histórico)
    await prisma.heartbeat.create({
      data: { screenId },
    });

    screenLogger.debug(`Heartbeat: ${screenId}`);
  }

  /**
   * Obtiene el estado actual de una pantalla
   */
  async getScreenStatus(screenId: string): Promise<ScreenStatus> {
    // Primero verificar en Redis
    const isAlive = await redis.get(REDIS_KEYS.screenAlive(screenId));

    if (!isAlive) {
      return 'OFFLINE';
    }

    // Obtener estado real de BD
    const screen = await prisma.screen.findUnique({
      where: { id: screenId },
      select: { status: true },
    });

    return (screen?.status as ScreenStatus) || 'OFFLINE';
  }

  /**
   * Actualiza el estado de una pantalla
   */
  async updateScreenStatus(
    screenId: string,
    status: ScreenStatus
  ): Promise<void> {
    await prisma.screen.update({
      where: { id: screenId },
      data: { status },
    });

    // Guardar en Redis
    await redis.set(REDIS_KEYS.screenStatus(screenId), status);

    // Invalidar caché de config para que al recargar obtenga el status nuevo
    await redis.del(REDIS_KEYS.configCache(screenId));

    // Publicar cambio
    await redisPub.publish(
      REDIS_KEYS.screenStatusChanged(),
      JSON.stringify({ screenId, status })
    );

    screenLogger.info(`Screen ${screenId} status changed to ${status}`);
  }

  /**
   * Obtiene pantallas activas de una cola
   */
  async getActiveScreensForQueue(queueId: string): Promise<string[]> {
    const screens = await prisma.screen.findMany({
      where: { queueId },
      select: { id: true, number: true },
    });

    const activeScreens: string[] = [];

    for (const screen of screens) {
      const isAlive = await redis.get(REDIS_KEYS.screenAlive(screen.id));
      const status = await redis.get(REDIS_KEYS.screenStatus(screen.id));

      // Solo incluir si está vivo y no en standby
      if (isAlive && status !== 'STANDBY') {
        activeScreens.push(screen.id);
        screenLogger.debug(`Pantalla activa: KDS${screen.number}`);
      }
    }

    return activeScreens;
  }

  /**
   * Obtiene la configuración completa de una pantalla
   */
  async getScreenConfig(screenId: string): Promise<ScreenWithConfig | null> {
    // Intentar obtener de cache
    const cached = await redis.get(REDIS_KEYS.configCache(screenId));
    if (cached) {
      return JSON.parse(cached);
    }

    // Obtener de BD
    const screen = await prisma.screen.findUnique({
      where: { id: screenId },
      include: {
        queue: {
          select: {
            id: true,
            name: true,
            distribution: true,
          },
        },
        appearance: {
          include: {
            cardColors: {
              orderBy: { order: 'asc' },
            },
            channelColors: true,
          },
        },
        preference: true,
        keyboard: true,
        printer: true,
      },
    });

    if (!screen) {
      return null;
    }

    // Transformar a formato esperado
    const config: ScreenWithConfig = {
      id: screen.id,
      number: screen.number,
      name: screen.name,
      queueId: screen.queueId,
      status: screen.status as ScreenStatus,
      queue: {
        id: screen.queue.id,
        name: screen.queue.name,
        distribution: screen.queue.distribution,
      },
      appearance: screen.appearance
        ? {
            fontSize: screen.appearance.fontSize,
            fontFamily: screen.appearance.fontFamily,
            columnsPerScreen: screen.appearance.columnsPerScreen,
            columnSize: screen.appearance.columnSize,
            footerHeight: screen.appearance.footerHeight,
            ordersDisplay: screen.appearance.ordersDisplay,
            theme: screen.appearance.theme,
            screenName: screen.appearance.screenName,
            screenSplit: screen.appearance.screenSplit,
            showCounters: screen.appearance.showCounters,
            // Nuevos campos
            backgroundColor: screen.appearance.backgroundColor,
            headerColor: screen.appearance.headerColor,
            headerTextColor: screen.appearance.headerTextColor,
            cardColor: screen.appearance.cardColor,
            textColor: screen.appearance.textColor,
            accentColor: screen.appearance.accentColor,
            productFontFamily: screen.appearance.productFontFamily,
            productFontSize: screen.appearance.productFontSize,
            productFontWeight: screen.appearance.productFontWeight,
            modifierFontFamily: screen.appearance.modifierFontFamily,
            modifierFontSize: screen.appearance.modifierFontSize,
            modifierFontColor: screen.appearance.modifierFontColor,
            modifierFontStyle: screen.appearance.modifierFontStyle,
            headerFontFamily: screen.appearance.headerFontFamily,
            headerFontSize: screen.appearance.headerFontSize,
            headerShowChannel: screen.appearance.headerShowChannel,
            headerShowTime: screen.appearance.headerShowTime,
            rows: screen.appearance.rows,
            maxItemsPerColumn: screen.appearance.maxItemsPerColumn,
            showTimer: screen.appearance.showTimer,
            showOrderNumber: screen.appearance.showOrderNumber,
            animationEnabled: screen.appearance.animationEnabled,
            cardColors: screen.appearance.cardColors.map((c) => ({
              id: c.id,
              color: c.color,
              minutes: c.minutes,
              order: c.order,
              isFullBackground: c.isFullBackground,
            })),
            channelColors: screen.appearance.channelColors.map((c) => ({
              channel: c.channel,
              color: c.color,
            })),
          }
        : null,
      preference: screen.preference
        ? {
            finishOrderActive: screen.preference.finishOrderActive,
            finishOrderTime: screen.preference.finishOrderTime,
            showClientData: screen.preference.showClientData,
            showName: screen.preference.showName,
            showIdentifier: screen.preference.showIdentifier,
            identifierMessage: screen.preference.identifierMessage,
            showNumerator: screen.preference.showNumerator,
            showPagination: screen.preference.showPagination,
            sourceBoxActive: screen.preference.sourceBoxActive,
            sourceBoxMessage: screen.preference.sourceBoxMessage,
            touchEnabled: screen.preference.touchEnabled,
            botoneraEnabled: screen.preference.botoneraEnabled,
          }
        : null,
      keyboard: screen.keyboard
        ? {
            ...screen.keyboard,
            combos: JSON.parse(screen.keyboard.combos || '[]'),
          }
        : null,
      printer: screen.printer
        ? {
            name: screen.printer.name,
            ip: screen.printer.ip,
            port: screen.printer.port,
            enabled: screen.printer.enabled,
          }
        : null,
    };

    // Guardar en cache (5 minutos)
    await redis.setex(
      REDIS_KEYS.configCache(screenId),
      300,
      JSON.stringify(config)
    );

    return config;
  }

  /**
   * Invalida el cache de configuración de una pantalla
   */
  async invalidateConfigCache(screenId: string): Promise<void> {
    await redis.del(REDIS_KEYS.configCache(screenId));

    // Notificar cambio
    await redisPub.publish(
      REDIS_KEYS.configUpdated(),
      JSON.stringify({ screenId })
    );

    screenLogger.info(`Config cache invalidated for screen ${screenId}`);
  }

  /**
   * Valida API key de pantalla
   */
  async validateApiKey(screenId: string, apiKey: string): Promise<boolean> {
    const screen = await prisma.screen.findUnique({
      where: { id: screenId },
      select: { apiKey: true },
    });

    return screen?.apiKey === apiKey;
  }

  /**
   * Obtiene todas las pantallas con su estado actual
   */
  async getAllScreensWithStatus(): Promise<
    Array<{
      id: string;
      number: number;
      name: string;
      queueName: string;
      status: ScreenStatus;
      lastHeartbeat: Date | null;
      printer: {
        name: string;
        ip: string;
        port: number;
        enabled: boolean;
      } | null;
    }>
  > {
    const screens = await prisma.screen.findMany({
      include: {
        queue: { select: { name: true } },
        heartbeats: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
        printer: true,
      },
    });

    const result = [];

    for (const screen of screens) {
      const isAlive = await redis.get(REDIS_KEYS.screenAlive(screen.id));
      const redisStatus = await redis.get(REDIS_KEYS.screenStatus(screen.id));

      let status: ScreenStatus = 'OFFLINE';
      if (isAlive) {
        status = (redisStatus as ScreenStatus) || 'ONLINE';
      }

      result.push({
        id: screen.id,
        number: screen.number,
        name: screen.name,
        queueName: screen.queue.name,
        status,
        lastHeartbeat: screen.heartbeats[0]?.timestamp || null,
        printer: screen.printer ? {
          name: screen.printer.name,
          ip: screen.printer.ip,
          port: screen.printer.port,
          enabled: screen.printer.enabled,
        } : null,
      });
    }

    return result;
  }

  /**
   * Limpia heartbeats antiguos
   */
  async cleanupOldHeartbeats(daysToKeep: number = 1): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysToKeep);

    const result = await prisma.heartbeat.deleteMany({
      where: {
        timestamp: { lt: cutoff },
      },
    });

    if (result.count > 0) {
      screenLogger.info(`Cleaned up ${result.count} old heartbeats`);
    }

    return result.count;
  }
}

// Singleton
export const screenService = new ScreenService();
