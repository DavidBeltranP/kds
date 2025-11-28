import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { redisSub, REDIS_KEYS } from '../config/redis';
import { wsLogger } from '../utils/logger';
import { screenService } from './screen.service';
import { orderService } from './order.service';
import { balancerService } from './balancer.service';
import { printerService } from './printer.service';
import {
  WsScreenRegister,
  WsHeartbeat,
  WsOrderFinish,
  WsScreenStatus,
} from '../types';
import { env } from '../config/env';

/**
 * Servicio de WebSocket para comunicación en tiempo real
 */
export class WebSocketService {
  private io: Server | null = null;
  private screenSockets: Map<string, string> = new Map(); // screenId -> socketId

  /**
   * Inicializa el servidor WebSocket
   */
  initialize(httpServer: HttpServer): void {
    this.io = new Server(httpServer, {
      cors: {
        origin: env.CORS_ORIGINS.split(','),
        methods: ['GET', 'POST'],
      },
      pingTimeout: env.HEARTBEAT_TIMEOUT,
      pingInterval: env.HEARTBEAT_INTERVAL,
    });

    this.setupEventHandlers();
    this.setupRedisSubscriptions();

    wsLogger.info('WebSocket server initialized');
  }

  /**
   * Configura manejadores de eventos
   */
  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: Socket) => {
      wsLogger.info(`Client connected: ${socket.id}`);

      // Registro de pantalla
      socket.on('screen:register', async (data: WsScreenRegister) => {
        await this.handleScreenRegister(socket, data);
      });

      // Heartbeat
      socket.on('screen:heartbeat', async (data: WsHeartbeat) => {
        await this.handleHeartbeat(socket, data);
      });

      // Cambio de estado de pantalla
      socket.on('screen:status', async (data: WsScreenStatus) => {
        await this.handleScreenStatus(socket, data);
      });

      // Solicitud de órdenes
      socket.on('screen:requestOrders', async (data: { screenId: string }) => {
        await this.handleRequestOrders(socket, data.screenId);
      });

      // Finalizar orden
      socket.on('order:finish', async (data: WsOrderFinish) => {
        await this.handleOrderFinish(socket, data);
      });

      // Deshacer finalización
      socket.on('order:undo', async (data: { orderId: string; screenId: string }) => {
        await this.handleOrderUndo(socket, data);
      });

      // Desconexión
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  /**
   * Configura suscripciones a Redis Pub/Sub
   */
  private setupRedisSubscriptions(): void {
    // Suscribirse a actualizaciones de configuración
    redisSub.subscribe(REDIS_KEYS.configUpdated());
    redisSub.subscribe(REDIS_KEYS.ordersUpdated());
    redisSub.subscribe(REDIS_KEYS.screenStatusChanged());

    redisSub.on('message', async (channel, message) => {
      wsLogger.info(`[REDIS] Received message on channel: ${channel}`);
      const data = JSON.parse(message);
      wsLogger.info(`[REDIS] Message data: ${JSON.stringify(data)}`);

      switch (channel) {
        case REDIS_KEYS.configUpdated():
          await this.broadcastConfigUpdate(data.screenId);
          break;

        case REDIS_KEYS.ordersUpdated():
          await this.broadcastOrdersUpdate(data.screenId);
          break;

        case REDIS_KEYS.screenStatusChanged():
          this.broadcastScreenStatus(data.screenId, data.status);
          break;
      }
    });
  }

  /**
   * Maneja registro de pantalla
   */
  private async handleScreenRegister(
    socket: Socket,
    data: WsScreenRegister
  ): Promise<void> {
    try {
      // Validar API key
      const isValid = await screenService.validateApiKey(
        data.screenId,
        data.apiKey
      );

      if (!isValid) {
        socket.emit('error', { message: 'Invalid API key' });
        socket.disconnect();
        return;
      }

      // Registrar socket
      this.screenSockets.set(data.screenId, socket.id);
      socket.join(`screen:${data.screenId}`);

      // Registrar heartbeat inicial
      await screenService.registerHeartbeat(data.screenId);

      // Enviar configuración
      const config = await screenService.getScreenConfig(data.screenId);
      socket.emit('config:update', config);

      // Enviar órdenes actuales
      const orders = await balancerService.getOrdersForScreen(data.screenId);
      socket.emit('orders:update', { orders });

      wsLogger.info(`Screen registered: ${data.screenId}`);
    } catch (error) {
      wsLogger.error('Error registering screen', { error, data });
      socket.emit('error', { message: 'Registration failed' });
    }
  }

  /**
   * Maneja heartbeat
   */
  private async handleHeartbeat(
    socket: Socket,
    data: WsHeartbeat
  ): Promise<void> {
    try {
      await screenService.registerHeartbeat(data.screenId);
    } catch (error) {
      wsLogger.error('Error processing heartbeat', { error, data });
    }
  }

  /**
   * Maneja cambio de estado de pantalla
   */
  private async handleScreenStatus(
    socket: Socket,
    data: WsScreenStatus
  ): Promise<void> {
    try {
      await screenService.updateScreenStatus(data.screenId, data.status);

      if (data.status === 'STANDBY') {
        // Redistribuir órdenes a pantallas activas
        const affectedScreenIds = await balancerService.handleScreenStandby(data.screenId);

        // Notificar a las pantallas que recibieron órdenes redistribuidas
        for (const screenId of affectedScreenIds) {
          await this.broadcastOrdersUpdate(screenId);
        }

        wsLogger.info(`Orders redistributed to ${affectedScreenIds.length} screens after ${data.screenId} went to standby`);
      } else if (data.status === 'ONLINE') {
        await balancerService.handleScreenReactivation(data.screenId);
      }

      socket.emit('screen:statusConfirmed', { status: data.status });
    } catch (error) {
      wsLogger.error('Error updating screen status', { error, data });
    }
  }

  /**
   * Maneja solicitud de órdenes
   */
  private async handleRequestOrders(
    socket: Socket,
    screenId: string
  ): Promise<void> {
    try {
      const orders = await balancerService.getOrdersForScreen(screenId);
      socket.emit('orders:update', { orders });
    } catch (error) {
      wsLogger.error('Error fetching orders', { error, screenId });
    }
  }

  /**
   * Maneja finalización de orden
   */
  private async handleOrderFinish(
    socket: Socket,
    data: WsOrderFinish
  ): Promise<void> {
    try {
      const order = await orderService.finishOrder(data.orderId, data.screenId);

      if (order) {
        socket.emit('order:finished', { orderId: data.orderId });

        // Imprimir la orden en la impresora asignada a la pantalla
        const printerConfig = await printerService.getPrinterForScreen(data.screenId);
        if (printerConfig && printerConfig.enabled) {
          const printed = await printerService.printOrder(order, printerConfig);
          if (printed) {
            wsLogger.info(`Order ${order.identifier} printed successfully`);
          } else {
            wsLogger.warn(`Failed to print order ${order.identifier}`);
          }
        }

        // Actualizar órdenes de la pantalla
        const orders = await balancerService.getOrdersForScreen(data.screenId);
        socket.emit('orders:update', { orders });
      } else {
        socket.emit('error', { message: 'Failed to finish order' });
      }
    } catch (error) {
      wsLogger.error('Error finishing order', { error, data });
      socket.emit('error', { message: 'Failed to finish order' });
    }
  }

  /**
   * Maneja undo de orden
   */
  private async handleOrderUndo(
    socket: Socket,
    data: { orderId: string; screenId: string }
  ): Promise<void> {
    try {
      const order = await orderService.undoFinishOrder(data.orderId);

      if (order) {
        socket.emit('order:restored', { orderId: data.orderId });

        // Actualizar órdenes
        const orders = await balancerService.getOrdersForScreen(data.screenId);
        socket.emit('orders:update', { orders });
      }
    } catch (error) {
      wsLogger.error('Error restoring order', { error, data });
    }
  }

  /**
   * Maneja desconexión
   */
  private async handleDisconnect(socket: Socket): Promise<void> {
    // Encontrar y limpiar screenId asociado
    for (const [screenId, socketId] of this.screenSockets.entries()) {
      if (socketId === socket.id) {
        this.screenSockets.delete(screenId);
        wsLogger.info(`Screen disconnected: ${screenId}`);

        // Esperar un poco para ver si es reconexión rápida
        setTimeout(async () => {
          // Verificar si la pantalla sigue desconectada
          const isAlive = await screenService.getScreenStatus(screenId);

          if (isAlive === 'OFFLINE') {
            wsLogger.info(`Screen ${screenId} confirmed offline, redistributing orders...`);

            // Redistribuir órdenes
            const affectedScreenIds = await balancerService.handleScreenStandby(screenId);

            // Notificar a las pantallas que recibieron órdenes redistribuidas
            for (const affectedScreenId of affectedScreenIds) {
              await this.broadcastOrdersUpdate(affectedScreenId);
            }
          }
        }, 5000); // Esperar 5 segundos antes de redistribuir

        break;
      }
    }
  }

  /**
   * Envía actualización de configuración a una pantalla
   */
  async broadcastConfigUpdate(screenId: string): Promise<void> {
    if (!this.io) return;

    wsLogger.info(`[WEBSOCKET] Broadcasting config update to screen ${screenId}`);
    const config = await screenService.getScreenConfig(screenId);
    this.io.to(`screen:${screenId}`).emit('config:update', config);

    wsLogger.debug(`Config update sent to screen ${screenId}`);
  }

  /**
   * Envía actualización de órdenes a una pantalla
   */
  async broadcastOrdersUpdate(screenId: string): Promise<void> {
    if (!this.io) return;

    const orders = await balancerService.getOrdersForScreen(screenId);
    this.io.to(`screen:${screenId}`).emit('orders:update', { orders });

    wsLogger.debug(`Orders update sent to screen ${screenId}`);
  }

  /**
   * Envía cambio de estado de pantalla
   */
  broadcastScreenStatus(screenId: string, status: string): void {
    if (!this.io) return;

    this.io.emit('screen:statusChanged', { screenId, status });
  }

  /**
   * Envía órdenes a múltiples pantallas (después de balanceo)
   */
  async distributeOrdersToScreens(
    distributions: Array<{ screenId: string; orders: any[] }>
  ): Promise<void> {
    if (!this.io) return;

    for (const { screenId, orders } of distributions) {
      // Guardar en BD
      for (const order of orders) {
        if (order.id) {
          await balancerService.assignOrderToScreen(order.id, screenId);
        }
      }

      // Obtener todas las órdenes actuales de la pantalla
      const allOrders = await balancerService.getOrdersForScreen(screenId);

      // Emitir a la pantalla
      this.io.to(`screen:${screenId}`).emit('orders:update', {
        orders: allOrders,
        newOrders: orders.length,
      });

      wsLogger.info(
        `Devolviendo comandas a la IP ${screenId} - Cantidad: ${allOrders.length}`
      );
    }
  }

  /**
   * Obtiene el servidor Socket.IO
   */
  getIO(): Server | null {
    return this.io;
  }
}

// Singleton
export const websocketService = new WebSocketService();
