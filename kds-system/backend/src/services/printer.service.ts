import net from 'net';
import { prisma } from '../config/database';
import { Order, PrinterConfig } from '../types';
import { printerLogger } from '../utils/logger';
import { centralizedPrinterService } from './centralized-printer.service';

/**
 * Servicio de impresión TCP (Local) y Centralizado
 */
export class PrinterService {
  private retries: number = 3;
  private timeout: number = 5000;

  /**
   * Obtiene el modo de impresión actual
   */
  async getPrintMode(): Promise<'LOCAL' | 'CENTRALIZED'> {
    const config = await prisma.generalConfig.findUnique({
      where: { id: 'general' },
    });
    return (config?.printMode as 'LOCAL' | 'CENTRALIZED') || 'LOCAL';
  }

  /**
   * Imprime una orden usando el modo configurado (Local o Centralizado)
   */
  async printOrder(
    order: Order,
    printerConfig: PrinterConfig
  ): Promise<boolean> {
    if (!printerConfig.enabled) {
      printerLogger.debug(`Printer ${printerConfig.name} is disabled`);
      return false;
    }

    const printMode = await this.getPrintMode();

    if (printMode === 'CENTRALIZED') {
      printerLogger.info(`[PRINT-MODE] Using CENTRALIZED print service for order ${order.identifier}`);
      return centralizedPrinterService.printOrder(order, printerConfig);
    }

    // Modo LOCAL (TCP directo)
    printerLogger.info(`[PRINT-MODE] Using LOCAL (TCP) print for order ${order.identifier}`);
    return this.printOrderLocal(order, printerConfig);
  }

  /**
   * Imprime una orden usando TCP directo (modo Local)
   */
  async printOrderLocal(
    order: Order,
    printerConfig: PrinterConfig
  ): Promise<boolean> {
    const content = this.formatOrderForPrint(order);

    for (let attempt = 1; attempt <= this.retries; attempt++) {
      try {
        await this.sendToPrinter(
          printerConfig.ip,
          printerConfig.port,
          content
        );

        // Registrar impresión exitosa
        await prisma.order.update({
          where: { id: order.id },
          data: { printedAt: new Date() },
        });

        printerLogger.info(
          `Order ${order.identifier} printed on ${printerConfig.name}`
        );
        return true;
      } catch (error) {
        printerLogger.warn(
          `Print attempt ${attempt}/${this.retries} failed for order ${order.identifier}`,
          { error }
        );

        if (attempt === this.retries) {
          printerLogger.error(
            `Failed to print order ${order.identifier} after ${this.retries} attempts`
          );
          return false;
        }

        // Esperar antes de reintentar
        await this.delay(1000 * attempt);
      }
    }

    return false;
  }

  /**
   * Envía datos a la impresora via TCP
   */
  private sendToPrinter(
    ip: string,
    port: number,
    content: Buffer
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();

      socket.setTimeout(this.timeout);

      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('Connection timeout'));
      });

      socket.on('error', (error) => {
        socket.destroy();
        reject(error);
      });

      socket.connect(port, ip, () => {
        socket.write(content, (error) => {
          socket.end();
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
    });
  }

  /**
   * Formatea una orden para impresión
   */
  private formatOrderForPrint(order: Order): Buffer {
    const ESC = '\x1B';
    const GS = '\x1D';
    const lines: string[] = [];

    // Inicializar impresora
    lines.push(ESC + '@'); // Reset
    lines.push(ESC + 'a' + '\x01'); // Centrar

    // Encabezado
    lines.push(GS + '!' + '\x11'); // Doble alto y ancho
    lines.push(`ORDEN ${order.identifier}`);
    lines.push(GS + '!' + '\x00'); // Normal
    lines.push('');

    // Canal
    lines.push(ESC + 'a' + '\x00'); // Alinear izquierda
    lines.push(`Canal: ${order.channel}`);
    if (order.customerName) {
      lines.push(`Cliente: ${order.customerName}`);
    }
    lines.push('');

    // Separador
    lines.push('-'.repeat(32));

    // Items
    for (const item of order.items) {
      const qty = item.quantity > 1 ? `${item.quantity}x ` : '';
      lines.push(`${qty}${item.name}`);

      if (item.modifier) {
        lines.push(`  + ${item.modifier}`);
      }
      if (item.notes) {
        lines.push(`  * ${item.notes}`);
      }
    }

    // Separador
    lines.push('-'.repeat(32));

    // Hora
    const now = new Date();
    const timeStr = now.toLocaleTimeString('es-EC', {
      hour: '2-digit',
      minute: '2-digit',
    });
    lines.push(`Hora: ${timeStr}`);
    lines.push('');

    // Cortar papel
    lines.push(GS + 'V' + '\x41' + '\x03'); // Corte parcial

    return Buffer.from(lines.join('\n'), 'latin1');
  }

  /**
   * Prueba conexión con impresora
   */
  async testPrinter(ip: string, port: number): Promise<boolean> {
    try {
      const testContent = Buffer.from('\x1B@Test\n\x1DVA\x03', 'latin1');
      await this.sendToPrinter(ip, port, testContent);
      printerLogger.info(`Printer test successful: ${ip}:${port}`);
      return true;
    } catch (error) {
      printerLogger.error(`Printer test failed: ${ip}:${port}`, { error });
      return false;
    }
  }

  /**
   * Obtiene configuración de impresora para una pantalla
   */
  async getPrinterForScreen(screenId: string): Promise<PrinterConfig | null> {
    const printer = await prisma.printer.findUnique({
      where: { screenId },
    });

    if (!printer) {
      return null;
    }

    return {
      name: printer.name,
      ip: printer.ip,
      port: printer.port,
      enabled: printer.enabled,
    };
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Singleton
export const printerService = new PrinterService();
