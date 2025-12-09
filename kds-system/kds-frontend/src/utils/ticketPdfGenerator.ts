/**
 * Generador de PDF para tickets de orden
 * Usado en modo simulación/mirror para previsualizar impresiones
 * sin enviar a impresora real
 */

import type { Order } from '../types';

interface TicketPdfOptions {
  order: Order;
  screenName?: string;
  queueName?: string;
  finishedAt?: Date;
}

/**
 * Genera un PDF simulando el ticket de impresión
 * Abre en nueva ventana para visualización/descarga
 */
export function generateTicketPdf(options: TicketPdfOptions): void {
  const { order, screenName, queueName, finishedAt } = options;
  const now = finishedAt || new Date();

  // Crear contenido HTML del ticket
  const ticketHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Ticket - Orden ${order.identifier}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    @page {
      size: 80mm auto;
      margin: 0;
    }

    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      width: 80mm;
      padding: 5mm;
      background: #fff;
    }

    .ticket {
      width: 100%;
    }

    .header {
      text-align: center;
      padding-bottom: 8px;
      border-bottom: 2px dashed #000;
      margin-bottom: 8px;
    }

    .order-number {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 4px;
    }

    .channel {
      font-size: 14px;
      font-weight: bold;
      background: #000;
      color: #fff;
      padding: 4px 8px;
      display: inline-block;
      margin: 4px 0;
    }

    .customer {
      font-size: 11px;
      margin-top: 4px;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      margin-top: 4px;
    }

    .items {
      padding: 8px 0;
      border-bottom: 2px dashed #000;
    }

    .item {
      margin-bottom: 8px;
    }

    .item-main {
      display: flex;
      font-weight: bold;
    }

    .item-qty {
      min-width: 25px;
    }

    .item-name {
      flex: 1;
      text-transform: uppercase;
    }

    .item-modifier {
      padding-left: 25px;
      font-size: 11px;
      font-weight: normal;
      color: #333;
      font-style: italic;
    }

    .item-notes {
      padding-left: 25px;
      font-size: 11px;
      color: #666;
      font-style: italic;
    }

    .footer {
      padding-top: 8px;
      text-align: center;
      font-size: 10px;
    }

    .time-info {
      margin-top: 4px;
    }

    .simulation-notice {
      margin-top: 12px;
      padding: 8px;
      background: #f0f0f0;
      border: 1px dashed #999;
      text-align: center;
      font-size: 10px;
      color: #666;
    }

    .print-btn {
      margin-top: 16px;
      text-align: center;
    }

    .print-btn button {
      padding: 8px 24px;
      font-size: 14px;
      cursor: pointer;
      background: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
    }

    .print-btn button:hover {
      background: #45a049;
    }

    @media print {
      .simulation-notice, .print-btn {
        display: none;
      }
      body {
        width: 80mm;
      }
    }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="header">
      <div class="order-number">ORDEN #${order.identifier}</div>
      <div class="channel">${order.channel.toUpperCase()}</div>
      ${order.customerName ? `<div class="customer">${order.customerName}</div>` : ''}
      <div class="info-row">
        ${screenName ? `<span>Pantalla: ${screenName}</span>` : ''}
        ${queueName ? `<span>Cola: ${queueName}</span>` : ''}
      </div>
    </div>

    <div class="items">
      ${order.items.map(item => `
        <div class="item">
          <div class="item-main">
            <span class="item-qty">${item.quantity}x</span>
            <span class="item-name">${item.name}</span>
          </div>
          ${item.modifier ? `<div class="item-modifier">+ ${item.modifier}</div>` : ''}
          ${item.notes ? `<div class="item-notes">* ${item.notes}</div>` : ''}
        </div>
      `).join('')}
    </div>

    <div class="footer">
      <div class="time-info">
        <div>Ingreso: ${new Date(order.createdAt).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}</div>
        <div>Finalizado: ${now.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
      </div>
      <div style="margin-top: 8px; font-weight: bold;">
        ${now.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' })}
      </div>
    </div>

    <div class="simulation-notice">
      ⚠️ TICKET DE SIMULACIÓN - NO ES IMPRESIÓN REAL<br>
      Generado en modo prueba local
    </div>

    <div class="print-btn">
      <button onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
    </div>
  </div>

  <script>
    // Auto-focus para poder imprimir con Ctrl+P
    window.focus();
  </script>
</body>
</html>
  `.trim();

  // Abrir en nueva ventana
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (printWindow) {
    printWindow.document.write(ticketHtml);
    printWindow.document.close();
  }
}

/**
 * Genera ticket y lo descarga como archivo
 */
export function downloadTicketPdf(options: TicketPdfOptions): void {
  // Por ahora usa el mismo método de ventana
  // En el futuro se puede implementar con jsPDF o similar
  generateTicketPdf(options);
}
