import axios from 'axios';
import { prisma } from '../config/database';
import { Order, PrinterConfig } from '../types';
import { printerLogger } from '../utils/logger';

/**
 * Interface para el payload de impresión centralizada
 * Compatible con el servicio .NET anterior
 */
export interface CentralizedPrintPayload {
  comanda: {
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
    customer: {
      name: string;
    };
    products: CentralizedProduct[];
    otrosDatos: {
      turno: number | string;
      nroCheque: string;
      llamarPor: string;
      Fecha: string;
      Direccion: string;
    };
  };
  configuracion: {
    columnas: number;
    impresora: string;
    impresoraIP: string;
    impresoraPuerto: number;
  };
}

interface CentralizedProduct {
  productId: string;
  name: string;
  amount: number;
  category?: string;
  content: string[];
  products: CentralizedSubProduct[];
}

interface CentralizedSubProduct {
  productId: string;
  name: string;
  amount: number;
  content: string[];
}

/**
 * Servicio de impresión centralizada
 * Envía las órdenes a un servicio HTTP externo para impresión
 */
export class CentralizedPrinterService {
  private retries: number = 3;
  private timeout: number = 10000; // 10 segundos

  /**
   * Verifica si el modo centralizado está habilitado
   */
  async isCentralizedModeEnabled(): Promise<boolean> {
    const config = await prisma.generalConfig.findUnique({
      where: { id: 'general' },
    });
    return config?.printMode === 'CENTRALIZED';
  }

  /**
   * Obtiene la configuración del servicio centralizado
   */
  async getCentralizedConfig(): Promise<{ url: string; port: number } | null> {
    const config = await prisma.generalConfig.findUnique({
      where: { id: 'general' },
    });

    if (!config?.centralizedPrintUrl) {
      return null;
    }

    return {
      url: config.centralizedPrintUrl,
      port: config.centralizedPrintPort || 5000,
    };
  }

  /**
   * Imprime una orden usando el servicio centralizado
   */
  async printOrder(
    order: Order,
    printerConfig: PrinterConfig
  ): Promise<boolean> {
    if (!printerConfig.enabled) {
      printerLogger.debug(`Printer ${printerConfig.name} is disabled`);
      return false;
    }

    const centralConfig = await this.getCentralizedConfig();
    if (!centralConfig) {
      printerLogger.error('Centralized print service not configured');
      return false;
    }

    const payload = this.formatOrderForCentralizedPrint(order, printerConfig);

    for (let attempt = 1; attempt <= this.retries; attempt++) {
      try {
        await this.sendToCentralizedService(centralConfig.url, payload);

        // Registrar impresión exitosa
        await prisma.order.update({
          where: { id: order.id },
          data: { printedAt: new Date() },
        });

        printerLogger.info(
          `Order ${order.identifier} sent to centralized print service for ${printerConfig.name}`
        );
        return true;
      } catch (error) {
        printerLogger.warn(
          `Centralized print attempt ${attempt}/${this.retries} failed for order ${order.identifier}`,
          { error }
        );

        if (attempt === this.retries) {
          printerLogger.error(
            `Failed to print order ${order.identifier} via centralized service after ${this.retries} attempts`
          );
          return false;
        }

        // Esperar antes de reintentar (delay progresivo)
        await this.delay(1000 * attempt);
      }
    }

    return false;
  }

  /**
   * Envía la orden al servicio centralizado via HTTP POST
   */
  private async sendToCentralizedService(
    url: string,
    payload: CentralizedPrintPayload
  ): Promise<void> {
    try {
      const response = await axios.post(url, payload, {
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status >= 400) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      printerLogger.debug('Centralized print response:', { data: response.data });
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Centralized print service error: ${error.message} - ${error.response?.data || ''}`
        );
      }
      throw error;
    }
  }

  /**
   * Formatea una orden para el servicio centralizado
   * Compatible con el formato del sistema .NET anterior
   */
  private formatOrderForCentralizedPrint(
    order: Order,
    printerConfig: PrinterConfig
  ): CentralizedPrintPayload {
    const [channelName, channelType] = (order.channel || '-').split('-');

    // Convertir items a formato de productos
    const products: CentralizedProduct[] = [];
    let currentProduct: CentralizedProduct | null = null;

    for (const item of order.items) {
      // Si el nombre empieza con espacios, es un subproducto
      if (item.name.startsWith('  ')) {
        if (currentProduct) {
          currentProduct.products.push({
            productId: item.id || '',
            name: item.name.trim(),
            amount: item.quantity,
            content: item.notes ? [item.notes] : [],
          });
        }
      } else {
        // Es un producto principal
        currentProduct = {
          productId: item.id || '',
          name: item.name,
          amount: item.quantity,
          category: '',
          content: item.notes ? [item.notes] : [],
          products: [],
        };
        products.push(currentProduct);
      }
    }

    return {
      comanda: {
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
        products,
        otrosDatos: {
          turno: -1,
          nroCheque: order.identifier,
          llamarPor: order.customerName || '',
          Fecha: order.createdAt.toLocaleString('es-EC'),
          Direccion: '',
        },
      },
      configuracion: {
        columnas: 42, // Se obtendrá de la configuración general
        impresora: printerConfig.name,
        impresoraIP: printerConfig.ip,
        impresoraPuerto: printerConfig.port,
      },
    };
  }

  /**
   * Prueba la conexión con el servicio centralizado
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    const config = await this.getCentralizedConfig();
    if (!config) {
      return { success: false, message: 'Servicio centralizado no configurado' };
    }

    try {
      // Intentar conectar al servicio (puede ser un health check o simplemente verificar la URL)
      const response = await axios.get(config.url.replace('/Impresion', ''), {
        timeout: 5000,
      });

      return {
        success: true,
        message: `Conexión exitosa. Estado: ${response.status}`,
      };
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? `Error de conexión: ${error.message}`
        : 'Error desconocido';

      return { success: false, message };
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Singleton
export const centralizedPrinterService = new CentralizedPrinterService();
