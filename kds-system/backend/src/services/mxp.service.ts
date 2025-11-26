import { queryMxp } from '../config/mxp';
import { MxpOrder, MxpOrderItem, Order, OrderItem } from '../types';
import { mxpLogger } from '../utils/logger';

// Query para obtener órdenes pendientes de MAXPOINT
// NOTA: Esta query debe adaptarse a la estructura real de MAXPOINT
const ORDERS_QUERY = `
  SELECT
    o.IdOrden as OrderId,
    c.Nombre as Channel,
    o.NombreCliente as CustomerName,
    o.NumeroOrden as OrderNumber,
    o.FechaCreacion as CreatedAt
  FROM Ordenes o
  INNER JOIN Canales c ON o.IdCanal = c.IdCanal
  WHERE o.Estado = 'PENDIENTE'
    AND o.FechaCreacion >= DATEADD(hour, -@hoursBack, GETDATE())
  ORDER BY o.FechaCreacion ASC
`;

const ORDER_ITEMS_QUERY = `
  SELECT
    d.IdOrden as OrderId,
    p.Nombre as ProductName,
    d.Cantidad as Quantity,
    d.Notas as Notes,
    d.Modificador as Modifier
  FROM DetalleOrdenes d
  INNER JOIN Productos p ON d.IdProducto = p.IdProducto
  WHERE d.IdOrden IN (@orderIds)
`;

/**
 * Servicio para lectura de comandas desde MAXPOINT
 */
export class MxpService {
  private lastFetchTime: Date = new Date(0);
  private processedOrderIds: Set<string> = new Set();

  /**
   * Obtiene órdenes pendientes de MAXPOINT
   */
  async fetchPendingOrders(hoursBack: number = 4): Promise<Order[]> {
    try {
      mxpLogger.debug(`Fetching orders from last ${hoursBack} hours`);

      // Obtener órdenes
      const mxpOrders = await queryMxp<MxpOrder>(ORDERS_QUERY, { hoursBack });

      if (mxpOrders.length === 0) {
        mxpLogger.info('Se encontraron 0 COMANDAS');
        return [];
      }

      // Filtrar órdenes ya procesadas
      const newOrders = mxpOrders.filter(
        (o) => !this.processedOrderIds.has(o.OrderId)
      );

      if (newOrders.length === 0) {
        return [];
      }

      // Obtener items de las órdenes
      const orderIds = newOrders.map((o) => o.OrderId).join(',');
      const mxpItems = await queryMxp<MxpOrderItem>(ORDER_ITEMS_QUERY, {
        orderIds,
      });

      // Mapear a formato interno
      const orders = this.mapOrders(newOrders, mxpItems);

      // Registrar como procesadas
      newOrders.forEach((o) => this.processedOrderIds.add(o.OrderId));

      mxpLogger.info(`Se encontraron ${orders.length} COMANDAS nuevas`);

      return orders;
    } catch (error) {
      mxpLogger.error('Error fetching orders from MXP', { error });
      throw error;
    }
  }

  /**
   * Mapea órdenes de MXP a formato interno
   */
  private mapOrders(orders: MxpOrder[], items: MxpOrderItem[]): Order[] {
    return orders.map((order) => ({
      id: '', // Se asigna al guardar en BD
      externalId: order.OrderId,
      channel: order.Channel,
      customerName: order.CustomerName,
      identifier: order.OrderNumber,
      status: 'PENDING' as const,
      createdAt: new Date(order.CreatedAt),
      items: items
        .filter((item) => item.OrderId === order.OrderId)
        .map((item) => ({
          id: '', // Se asigna al guardar
          name: item.ProductName,
          quantity: item.Quantity,
          notes: item.Notes || undefined,
          modifier: item.Modifier || undefined,
        })),
    }));
  }

  /**
   * Limpia órdenes antiguas del cache
   */
  cleanupProcessedOrders(maxAgeHours: number = 8): void {
    // Limpiar IDs procesados periódicamente para evitar memory leak
    // En producción esto debería basarse en la fecha de la orden
    if (this.processedOrderIds.size > 10000) {
      mxpLogger.info('Cleaning up processed order IDs cache');
      this.processedOrderIds.clear();
    }
  }

  /**
   * Reinicia el servicio
   */
  reset(): void {
    this.processedOrderIds.clear();
    this.lastFetchTime = new Date(0);
    mxpLogger.info('MXP Service reset');
  }
}

// Singleton
export const mxpService = new MxpService();
