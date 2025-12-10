import { prisma } from '../config/database';
import { orderService } from './order.service';
import { balancerService } from './balancer.service';
import { websocketService } from './websocket.service';
import { logger } from '../utils/logger';

/**
 * Interface para la estructura de comanda recibida via API
 * Compatible con el formato del sistema anterior (.NET)
 */
export interface ApiComanda {
  id: string;
  orderId: string;
  createdAt: string;
  channel: {
    id: number;
    name: string;
    type: string;
  };
  cashRegister: {
    cashier: string;
    name: string;
  };
  customer?: {
    name: string;
  };
  products: ApiProduct[];
  otrosDatos?: {
    turno?: number | string;
    nroCheque?: string;
    llamarPor?: string;
    Fecha?: string;
    Direccion?: string;
  };
  impresion?: string;
}

export interface ApiProduct {
  productId?: string;
  name: string;
  amount?: number;
  category?: string;
  content?: string[];
  products?: ApiSubProduct[];
}

export interface ApiSubProduct {
  productId?: string;
  name: string;
  amount?: number;
  category?: string;
  content?: string[];
}

/**
 * Interface para acciones del usuario (compatible con sistema anterior)
 */
export interface ApiUserActions {
  userActions: string[];
}

/**
 * Servicio para recibir tickets via API REST
 * Alternativa al polling de MAXPOINT
 */
export class ApiTicketService {
  /**
   * Verifica si el modo API está habilitado
   */
  async isApiModeEnabled(): Promise<boolean> {
    const config = await prisma.generalConfig.findUnique({
      where: { id: 'general' },
    });
    return config?.ticketMode === 'API';
  }

  /**
   * Recibe y procesa una comanda via API
   * @param comanda Datos de la comanda en formato API
   */
  async receiveComanda(comanda: ApiComanda): Promise<{ success: boolean; orderId?: string; error?: string }> {
    try {
      logger.info(`[API-TICKET] Recibiendo comanda: ${comanda.orderId}`);

      // Convertir formato API al formato interno
      const orderData = this.convertToInternalFormat(comanda);

      // Guardar en BD usando el servicio de órdenes existente
      const savedOrders = await orderService.upsertOrders([orderData]);

      if (savedOrders.length === 0) {
        logger.info(`[API-TICKET] Comanda ${comanda.orderId} ya existe o fue rechazada`);
        return { success: true, orderId: comanda.orderId };
      }

      // Obtener colas activas y distribuir
      const queues = await prisma.queue.findMany({
        where: { active: true },
      });

      for (const queue of queues) {
        const distributions = await balancerService.distributeOrders(
          savedOrders,
          queue.id
        );

        // Enviar a pantallas via WebSocket
        if (distributions.length > 0) {
          await websocketService.distributeOrdersToScreens(distributions);
        }
      }

      logger.info(`[API-TICKET] Comanda ${comanda.orderId} procesada exitosamente`);
      return { success: true, orderId: savedOrders[0].id };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      logger.error(`[API-TICKET] Error procesando comanda: ${errorMessage}`, { error });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Recibe múltiples comandas en batch
   */
  async receiveComandas(comandas: ApiComanda[]): Promise<{
    success: boolean;
    processed: number;
    errors: string[]
  }> {
    const errors: string[] = [];
    let processed = 0;

    for (const comanda of comandas) {
      const result = await this.receiveComanda(comanda);
      if (result.success) {
        processed++;
      } else {
        errors.push(`${comanda.orderId}: ${result.error}`);
      }
    }

    return { success: errors.length === 0, processed, errors };
  }

  /**
   * Obtiene comandas para una pantalla por número o ID
   * (compatible con endpoint POST /comandas del sistema anterior)
   */
  async getCommandsForScreen(screenIdentifier: string, userActions?: string[]): Promise<string> {
    try {
      // Intentar buscar por número de pantalla (si es numérico) o por ID
      const screenNumber = parseInt(screenIdentifier, 10);
      const screen = await prisma.screen.findFirst({
        where: isNaN(screenNumber)
          ? { id: screenIdentifier }
          : { number: screenNumber },
        include: {
          queue: true,
          appearance: true,
          preference: true,
        },
      });

      if (!screen) {
        logger.warn(`[API-TICKET] Pantalla no encontrada: ${screenIdentifier}`);
        return JSON.stringify({ comandas: [], counters: [] });
      }

      // Procesar acciones del usuario si las hay
      if (userActions && userActions.length > 0) {
        await this.processUserActions(userActions, screen.id);
      }

      // Actualizar estado de pantalla (heartbeat)
      await prisma.screen.update({
        where: { id: screen.id },
        data: { status: 'ONLINE', updatedAt: new Date() },
      });

      // Obtener órdenes asignadas a esta pantalla
      const orders = await prisma.order.findMany({
        where: {
          screenId: screen.id,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
        include: { items: true },
        orderBy: { createdAt: 'asc' },
      });

      // Convertir al formato del sistema anterior
      const comandas = orders.map((order) => this.convertToApiFormat(order));

      return JSON.stringify({
        comandas,
        counters: [], // TODO: Implementar contadores si se requiere
      });

    } catch (error) {
      logger.error(`[API-TICKET] Error obteniendo comandas para pantalla ${screenIdentifier}:`, { error });
      return JSON.stringify({ comandas: [], counters: [] });
    }
  }

  /**
   * Procesa acciones del usuario (IMPRIMIR, UNDO, OFF, ON)
   */
  private async processUserActions(actions: string[], screenId: string): Promise<void> {
    for (const action of actions) {
      try {
        switch (action.toUpperCase()) {
          case 'UNDO':
            // Buscar la última orden finalizada de esta pantalla y deshacerla
            const lastFinished = await prisma.order.findFirst({
              where: { screenId, status: 'FINISHED' },
              orderBy: { finishedAt: 'desc' },
            });
            if (lastFinished) {
              await orderService.undoFinishOrder(lastFinished.id);
            }
            break;
          case 'OFF':
            await prisma.screen.update({
              where: { id: screenId },
              data: { status: 'STANDBY' },
            });
            break;
          case 'ON':
            await prisma.screen.update({
              where: { id: screenId },
              data: { status: 'ONLINE' },
            });
            break;
          default:
            // Si es un ID de orden largo, es una acción de finalizar/imprimir
            if (action.length > 20) {
              await orderService.finishOrder(action, screenId);
            }
            break;
        }
      } catch (error) {
        logger.error(`[API-TICKET] Error procesando acción ${action}:`, { error });
      }
    }
  }

  /**
   * Convierte formato API al formato interno del sistema
   */
  private convertToInternalFormat(comanda: ApiComanda): any {
    const items = this.flattenProducts(comanda.products);

    return {
      externalId: comanda.orderId || comanda.id,
      channel: `${comanda.channel.name}-${comanda.channel.type}`,
      customerName: comanda.customer?.name || comanda.otrosDatos?.llamarPor || '',
      identifier: comanda.otrosDatos?.nroCheque || comanda.orderId,
      items,
      createdAt: comanda.createdAt ? new Date(comanda.createdAt) : new Date(),
    };
  }

  /**
   * Aplana la estructura de productos para el formato interno
   */
  private flattenProducts(products: ApiProduct[]): any[] {
    const items: any[] = [];

    for (const product of products) {
      // Agregar producto principal
      items.push({
        name: product.name,
        quantity: product.amount || 1,
        notes: product.content?.join(', ') || null,
        modifier: null,
      });

      // Agregar subproductos si existen
      if (product.products) {
        for (const subProduct of product.products) {
          items.push({
            name: `  ${subProduct.name}`,
            quantity: subProduct.amount || 1,
            notes: subProduct.content?.join(', ') || null,
            modifier: null,
          });
        }
      }
    }

    return items;
  }

  /**
   * Convierte formato interno al formato API (para respuestas)
   */
  private convertToApiFormat(order: any): ApiComanda {
    const [channelName, channelType] = (order.channel || '-').split('-');

    return {
      id: order.id,
      orderId: order.externalId,
      createdAt: order.createdAt.toISOString(),
      channel: {
        id: 1,
        name: channelName || order.channel,
        type: channelType || '',
      },
      cashRegister: {
        cashier: '',
        name: '',
      },
      customer: {
        name: order.customerName || '',
      },
      products: order.items.map((item: any) => ({
        productId: item.id,
        name: item.name,
        amount: item.quantity,
        content: item.notes ? [item.notes] : [],
        products: [],
      })),
      otrosDatos: {
        turno: -1,
        nroCheque: order.identifier,
        llamarPor: order.customerName || '',
        Fecha: order.createdAt.toLocaleString(),
        Direccion: '',
      },
    };
  }
}

// Singleton
export const apiTicketService = new ApiTicketService();
