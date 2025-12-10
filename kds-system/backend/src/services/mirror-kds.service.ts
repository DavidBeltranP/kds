/**
 * Mirror KDS Service
 * Lee comandas de la BD KDS2 del local en modo SOLO LECTURA
 * No modifica ningún dato, solo observa las órdenes en pantalla
 */

import sql from 'mssql';

// Estructura de comanda del sistema .NET
interface KDS2Comanda {
  id: string;
  createdAt: string;
  orderId: string;
  channel: {
    id: number;
    name: string;
    type: string;
  };
  cashRegister?: {
    cashier: string;
    name: string;
  };
  customer?: {
    name: string;
  };
  products: Array<{
    productId?: string;
    name?: string;
    amount?: number;
    category?: string;
    content?: string[];
    products?: Array<{
      productId?: string;
      name?: string;
      amount?: number;
      category?: string;
      content?: string[];
    }>;
  }>;
  otrosDatos?: {
    turno: number;
    nroCheque: string;
    llamarPor: string;
    Fecha: string;
    Direccion: string;
  };
  impresion?: string;
}

// Configuración de conexión a KDS2
interface MirrorConfig {
  host: string;
  port?: number;
  user: string;
  password: string;
  database: string;
}

// Orden mapeada para nuestro frontend
export interface MirrorOrder {
  id: string;
  externalId: string;
  identifier: string;
  channel: string;
  customerName?: string;
  status: 'PENDING' | 'FINISHED';
  createdAt: Date;
  queue: string;
  screen: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    notes?: string;
    subitems?: Array<{
      name: string;
      quantity: number;
    }>;
  }>;
}

class MirrorKDSService {
  private pool: sql.ConnectionPool | null = null;
  private config: MirrorConfig | null = null;
  private isConnected = false;
  // Cache de timestamps de primera vista - para timer "desde ahora"
  private orderFirstSeen: Map<string, Date> = new Map();

  /**
   * Verificar si el mirror está configurado
   */
  isConfigured(): boolean {
    return this.config !== null;
  }

  /**
   * Verificar si está conectado
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Configurar conexión al KDS2 remoto
   */
  configure(config: MirrorConfig): void {
    this.config = config;
    this.isConnected = false;
    if (this.pool) {
      this.pool.close().catch(() => {});
      this.pool = null;
    }
  }

  /**
   * Obtener pool de conexión
   */
  private async getPool(): Promise<sql.ConnectionPool> {
    if (!this.config) {
      throw new Error('Mirror KDS no configurado. Use configure() primero.');
    }

    if (!this.pool || !this.isConnected) {
      const sqlConfig: sql.config = {
        server: this.config.host,
        port: this.config.port || 1433,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
        options: {
          encrypt: false,
          trustServerCertificate: true,
          enableArithAbort: true,
        },
        pool: {
          max: 5,
          min: 0,
          idleTimeoutMillis: 30000,
        },
        connectionTimeout: 10000,
        requestTimeout: 10000,
      };

      this.pool = await new sql.ConnectionPool(sqlConfig).connect();
      this.isConnected = true;
      console.log('[Mirror KDS] Conectado a KDS2');
    }

    return this.pool;
  }

  /**
   * Verificar conexión
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const pool = await this.getPool();
      const result = await pool.request().query<{ test: number }>('SELECT 1 as test');

      if (result.recordset[0]?.test === 1) {
        return { success: true, message: 'Conexion exitosa a KDS2' };
      }
      return { success: false, message: 'No se pudo verificar la conexion' };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      return { success: false, message: msg };
    }
  }

  /**
   * Obtener órdenes en pantalla (SOLO LECTURA)
   * Lee las comandas que están actualmente visibles en las pantallas del local
   */
  async getOrdersOnScreen(screenFilter?: string): Promise<MirrorOrder[]> {
    try {
      const pool = await this.getPool();

      // Query para obtener comandas en pantalla con su distribución
      // Solo lee, NO modifica nada
      let query = `
        SELECT
          c.IdOrden,
          c.datosComanda,
          c.fechaIngreso,
          d.Cola,
          d.Pantalla,
          d.IdEstadoDistribucion,
          d.fechaModificacion
        FROM Comandas c
        INNER JOIN Distribucion d ON c.IdOrden = d.idOrden
        WHERE d.IdEstadoDistribucion = 'EN_PANTALLA'
      `;

      if (screenFilter) {
        query += ` AND d.Pantalla = @screenFilter`;
      }

      query += ` ORDER BY c.fechaIngreso ASC`;

      const request = pool.request();
      if (screenFilter) {
        request.input('screenFilter', screenFilter);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await request.query<any>(query);

      // IDs de órdenes actuales en pantalla
      const currentOrderIds = new Set(result.recordset.map((row: { IdOrden: string }) => row.IdOrden));

      // Limpiar caché de órdenes que ya no están en pantalla
      for (const orderId of this.orderFirstSeen.keys()) {
        if (!currentOrderIds.has(orderId)) {
          this.orderFirstSeen.delete(orderId);
        }
      }

      // Mapear a formato de nuestro frontend
      return result.recordset.map((row) => {
        let comanda: KDS2Comanda;
        try {
          comanda = JSON.parse(row.datosComanda);
        } catch {
          comanda = {
            id: row.IdOrden,
            createdAt: row.fechaCreacion,
            orderId: row.IdOrden,
            channel: { id: 0, name: 'Desconocido', type: '' },
            products: [],
          };
        }

        return this.mapToMirrorOrder(comanda, row);
      });
    } catch (error) {
      console.error('[Mirror KDS] Error obteniendo ordenes:', error);
      throw error;
    }
  }

  /**
   * Obtener lista de pantallas disponibles
   */
  async getAvailableScreens(): Promise<string[]> {
    try {
      const pool = await this.getPool();
      const result = await pool.request().query<{ Pantalla: string }>(
        `SELECT DISTINCT Pantalla FROM Distribucion WHERE IdEstadoDistribucion = 'EN_PANTALLA'`
      );
      return result.recordset.map((r) => r.Pantalla);
    } catch (error) {
      console.error('[Mirror KDS] Error obteniendo pantallas:', error);
      return [];
    }
  }

  /**
   * Obtener lista de colas disponibles
   */
  async getAvailableQueues(): Promise<string[]> {
    try {
      const pool = await this.getPool();
      const result = await pool.request().query<{ Cola: string }>(
        `SELECT DISTINCT Cola FROM Distribucion WHERE IdEstadoDistribucion = 'EN_PANTALLA'`
      );
      return result.recordset.map((r) => r.Cola);
    } catch (error) {
      console.error('[Mirror KDS] Error obteniendo colas:', error);
      return [];
    }
  }

  /**
   * Mapear comanda del sistema .NET a nuestro formato
   */
  private mapToMirrorOrder(
    comanda: KDS2Comanda,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    row: any
  ): MirrorOrder {
    // Extraer items de productos
    const items: MirrorOrder['items'] = [];
    let itemIndex = 0;

    for (const product of comanda.products || []) {
      if (product.name) {
        const item: MirrorOrder['items'][0] = {
          id: `${row.IdOrden}-${itemIndex++}`,
          name: product.name,
          quantity: product.amount || 1,
          notes: product.content?.filter(c => c).join(', ') || undefined,
          subitems: [],
        };

        // Agregar subproductos
        if (product.products && product.products.length > 0) {
          item.subitems = product.products
            .filter((sp) => sp.name)
            .map((sp) => ({
              name: sp.name || '',
              quantity: sp.amount || 1,
            }));
        }

        items.push(item);
      }
    }

    // Extraer identifier de forma más robusta:
    // 1. Primero intenta nroCheque (número de ticket/cheque)
    // 2. Si comanda.orderId existe y tiene longitud útil, usarlo
    // 3. Si comanda.id parece un número de orden válido (más de 3 dígitos), usarlo
    // 4. Fallback a los últimos 6 caracteres del IdOrden
    // NOTA: NO usar turno porque puede ser "1", "2", etc. y confundirse con la pantalla
    let identifier = comanda.otrosDatos?.nroCheque;
    if (!identifier) {
      // Intentar orderId primero
      if (comanda.orderId && comanda.orderId.length > 3) {
        identifier = comanda.orderId;
      } else {
        // Verificar si comanda.id es un valor útil (no solo un número pequeño como pantalla)
        const comandaId = comanda.id;
        if (comandaId && comandaId.length > 3) {
          identifier = comandaId;
        } else {
          // Usar últimos caracteres del IdOrden como identificador visual
          identifier = row.IdOrden.slice(-6);
        }
      }
    }

    // Timer "desde ahora": usar el momento en que vimos la orden por primera vez
    // Esto evita el problema de fechas viejas en la BD
    let createdAt: Date;
    const orderId = row.IdOrden;

    if (this.orderFirstSeen.has(orderId)) {
      // Ya vimos esta orden antes, usar el timestamp guardado
      createdAt = this.orderFirstSeen.get(orderId)!;
    } else {
      // Primera vez que vemos esta orden, guardar timestamp actual
      createdAt = new Date();
      this.orderFirstSeen.set(orderId, createdAt);
    }

    return {
      id: row.IdOrden,
      externalId: comanda.orderId || row.IdOrden,
      identifier,
      channel: comanda.channel?.name || 'Local',
      customerName: comanda.customer?.name || comanda.otrosDatos?.llamarPor,
      status: 'PENDING',
      createdAt,
      queue: row.Cola,
      screen: row.Pantalla,
      items,
    };
  }

  /**
   * Obtener estadísticas del mirror
   */
  async getStats(): Promise<{
    connected: boolean;
    ordersOnScreen: number;
    screens: string[];
    queues: string[];
  }> {
    try {
      const pool = await this.getPool();

      const countResult = await pool.request().query<{ total: number }>(
        `SELECT COUNT(*) as total FROM Distribucion WHERE IdEstadoDistribucion = 'EN_PANTALLA'`
      );

      const screens = await this.getAvailableScreens();
      const queues = await this.getAvailableQueues();

      return {
        connected: true,
        ordersOnScreen: countResult.recordset[0]?.total || 0,
        screens,
        queues,
      };
    } catch {
      return {
        connected: false,
        ordersOnScreen: 0,
        screens: [],
        queues: [],
      };
    }
  }

  /**
   * Desconectar
   */
  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
      this.isConnected = false;
      console.log('[Mirror KDS] Desconectado');
    }
  }
}

// Singleton
export const mirrorKDSService = new MirrorKDSService();
