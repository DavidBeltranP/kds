import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface OrderItem {
  name: string;
  quantity: number;
  modifier?: string;
}

interface OrderHighlight {
  id: string;
  identifier: string;
  channel: string;
  finishTime: number;
  items: OrderItem[];
}

interface DashboardStats {
  summary: {
    pending: number;
    inProgress: number;
    finishedToday: number;
    cancelledToday: number;
    onTime: number;
    outOfTime: number;
    avgFinishTime: number;
    minFinishTime: number;
    maxFinishTime: number;
  };
  fastestOrder: OrderHighlight | null;
  slowestOrder: OrderHighlight | null;
  byScreen: Array<{
    screenId: string;
    screenName: string;
    queueName: string;
    pending: number;
    finishedToday: number;
    onTime: number;
    outOfTime: number;
    avgFinishTime: number;
  }>;
  byChannel: Array<{
    channel: string;
    total: number;
    onTime: number;
    outOfTime: number;
    avgFinishTime: number;
  }>;
  hourlyStats: Array<{
    hour: number;
    total: number;
    onTime: number;
    outOfTime: number;
  }>;
}

interface Screen {
  id: string;
  number: number;
  name: string;
  queueName: string;
  status: string;
  lastHeartbeat: string | null;
}

const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
};

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('es-EC', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatDateTime = (date: Date): string => {
  return date.toLocaleString('es-EC', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const generateDashboardPDF = (
  stats: DashboardStats,
  screens: Screen[],
  timeLimit: number,
  companyName: string = 'KFC Ecuador'
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  // Colores corporativos
  const primaryColor: [number, number, number] = [185, 28, 28]; // Rojo KFC
  const secondaryColor: [number, number, number] = [31, 41, 55]; // Gris oscuro
  const successColor: [number, number, number] = [34, 197, 94]; // Verde
  const warningColor: [number, number, number] = [234, 179, 8]; // Amarillo
  const dangerColor: [number, number, number] = [239, 68, 68]; // Rojo

  // ========================================
  // HEADER
  // ========================================
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 35, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('REPORTE DE OPERACIONES KDS', pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(companyName, pageWidth / 2, 23, { align: 'center' });

  doc.setFontSize(10);
  doc.text(formatDate(new Date()), pageWidth / 2, 30, { align: 'center' });

  yPos = 45;

  // ========================================
  // RESUMEN EJECUTIVO
  // ========================================
  doc.setTextColor(...secondaryColor);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMEN EJECUTIVO', margin, yPos);
  yPos += 8;

  // Línea decorativa
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // KPIs principales en cajas
  const kpiWidth = (pageWidth - margin * 2 - 20) / 4;
  const kpiHeight = 25;
  const kpis = [
    { label: 'Completadas Hoy', value: stats.summary.finishedToday.toString(), color: successColor },
    { label: 'Pendientes', value: stats.summary.pending.toString(), color: warningColor },
    { label: 'A Tiempo', value: `${stats.summary.onTime} (${Math.round((stats.summary.onTime / (stats.summary.onTime + stats.summary.outOfTime || 1)) * 100)}%)`, color: successColor },
    { label: 'Tiempo Promedio', value: formatTime(stats.summary.avgFinishTime), color: secondaryColor },
  ];

  kpis.forEach((kpi, index) => {
    const xPos = margin + index * (kpiWidth + 5);

    // Caja de fondo
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(xPos, yPos, kpiWidth, kpiHeight, 3, 3, 'F');

    // Borde superior de color
    doc.setFillColor(...kpi.color);
    doc.rect(xPos, yPos, kpiWidth, 3, 'F');

    // Valor
    doc.setTextColor(...kpi.color);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(kpi.value, xPos + kpiWidth / 2, yPos + 13, { align: 'center' });

    // Label
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(kpi.label, xPos + kpiWidth / 2, yPos + 20, { align: 'center' });
  });

  yPos += kpiHeight + 15;

  // ========================================
  // INDICADORES DE RENDIMIENTO
  // ========================================
  doc.setTextColor(...secondaryColor);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('INDICADORES DE RENDIMIENTO', margin, yPos);
  yPos += 8;

  doc.setDrawColor(...primaryColor);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // Tabla de indicadores
  const totalFinished = stats.summary.onTime + stats.summary.outOfTime;
  const onTimePercent = totalFinished > 0 ? Math.round((stats.summary.onTime / totalFinished) * 100) : 0;
  const outTimePercent = totalFinished > 0 ? Math.round((stats.summary.outOfTime / totalFinished) * 100) : 0;

  const indicatorData = [
    ['Tiempo Límite Configurado', `${timeLimit} minutos`],
    ['Total Órdenes Procesadas', totalFinished.toString()],
    ['Órdenes A Tiempo', `${stats.summary.onTime} (${onTimePercent}%)`],
    ['Órdenes Fuera de Tiempo', `${stats.summary.outOfTime} (${outTimePercent}%)`],
    ['Tiempo Promedio de Atención', formatTime(stats.summary.avgFinishTime)],
    ['Tiempo Mínimo', formatTime(stats.summary.minFinishTime)],
    ['Tiempo Máximo', formatTime(stats.summary.maxFinishTime)],
    ['Órdenes Canceladas', stats.summary.cancelledToday.toString()],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [['Indicador', 'Valor']],
    body: indicatorData,
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 80 },
      1: { halign: 'right' },
    },
    margin: { left: margin, right: margin },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // ========================================
  // ÓRDENES DESTACADAS (MÁS RÁPIDA Y MÁS LENTA)
  // ========================================
  if (stats.fastestOrder || stats.slowestOrder) {
    if (yPos > pageHeight - 100) {
      doc.addPage();
      yPos = margin;
    }

    doc.setTextColor(...secondaryColor);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('ÓRDENES DESTACADAS DEL DÍA', margin, yPos);
    yPos += 8;

    doc.setDrawColor(...primaryColor);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;

    const boxWidth = (pageWidth - margin * 2 - 10) / 2;
    const boxHeight = 70;

    // Orden más rápida
    if (stats.fastestOrder) {
      const fastX = margin;

      // Caja de fondo verde
      doc.setFillColor(240, 253, 244);
      doc.roundedRect(fastX, yPos, boxWidth, boxHeight, 3, 3, 'F');

      // Borde superior verde
      doc.setFillColor(...successColor);
      doc.rect(fastX, yPos, boxWidth, 4, 'F');

      // Icono/Título
      doc.setTextColor(...successColor);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('ORDEN MÁS RÁPIDA', fastX + boxWidth / 2, yPos + 12, { align: 'center' });

      // Tiempo
      doc.setFontSize(18);
      doc.text(formatTime(stats.fastestOrder.finishTime), fastX + boxWidth / 2, yPos + 24, { align: 'center' });

      // Identificador y canal
      doc.setTextColor(...secondaryColor);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Orden: ${stats.fastestOrder.identifier} | Canal: ${stats.fastestOrder.channel}`, fastX + boxWidth / 2, yPos + 34, { align: 'center' });

      // Productos
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Productos:', fastX + 5, yPos + 44);

      doc.setFont('helvetica', 'normal');
      let productY = yPos + 50;
      stats.fastestOrder.items.slice(0, 3).forEach(item => {
        const itemText = `• ${item.quantity}x ${item.name}${item.modifier ? ` (${item.modifier})` : ''}`;
        const truncatedText = itemText.length > 45 ? itemText.substring(0, 42) + '...' : itemText;
        doc.text(truncatedText, fastX + 5, productY);
        productY += 5;
      });
      if (stats.fastestOrder.items.length > 3) {
        doc.text(`... y ${stats.fastestOrder.items.length - 3} producto(s) más`, fastX + 5, productY);
      }
    }

    // Orden más lenta
    if (stats.slowestOrder) {
      const slowX = margin + boxWidth + 10;

      // Caja de fondo roja
      doc.setFillColor(254, 242, 242);
      doc.roundedRect(slowX, yPos, boxWidth, boxHeight, 3, 3, 'F');

      // Borde superior rojo
      doc.setFillColor(...dangerColor);
      doc.rect(slowX, yPos, boxWidth, 4, 'F');

      // Icono/Título
      doc.setTextColor(...dangerColor);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('ORDEN MÁS LENTA', slowX + boxWidth / 2, yPos + 12, { align: 'center' });

      // Tiempo
      doc.setFontSize(18);
      doc.text(formatTime(stats.slowestOrder.finishTime), slowX + boxWidth / 2, yPos + 24, { align: 'center' });

      // Identificador y canal
      doc.setTextColor(...secondaryColor);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Orden: ${stats.slowestOrder.identifier} | Canal: ${stats.slowestOrder.channel}`, slowX + boxWidth / 2, yPos + 34, { align: 'center' });

      // Productos
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Productos:', slowX + 5, yPos + 44);

      doc.setFont('helvetica', 'normal');
      let productY = yPos + 50;
      stats.slowestOrder.items.slice(0, 3).forEach(item => {
        const itemText = `• ${item.quantity}x ${item.name}${item.modifier ? ` (${item.modifier})` : ''}`;
        const truncatedText = itemText.length > 45 ? itemText.substring(0, 42) + '...' : itemText;
        doc.text(truncatedText, slowX + 5, productY);
        productY += 5;
      });
      if (stats.slowestOrder.items.length > 3) {
        doc.text(`... y ${stats.slowestOrder.items.length - 3} producto(s) más`, slowX + 5, productY);
      }
    }

    yPos += boxHeight + 15;
  }

  // ========================================
  // RENDIMIENTO POR PANTALLA
  // ========================================
  if (yPos > pageHeight - 80) {
    doc.addPage();
    yPos = margin;
  }

  doc.setTextColor(...secondaryColor);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('RENDIMIENTO POR PANTALLA', margin, yPos);
  yPos += 8;

  doc.setDrawColor(...primaryColor);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  const screenData = stats.byScreen.map(s => {
    const total = s.onTime + s.outOfTime;
    const percent = total > 0 ? Math.round((s.onTime / total) * 100) : 0;
    return [
      s.screenName,
      s.queueName,
      s.pending.toString(),
      s.finishedToday.toString(),
      `${s.onTime} (${percent}%)`,
      s.outOfTime.toString(),
      formatTime(s.avgFinishTime),
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [['Pantalla', 'Cola', 'Pend.', 'Complet.', 'A Tiempo', 'F. Tiempo', 'T. Prom.']],
    body: screenData,
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    columnStyles: {
      0: { fontStyle: 'bold' },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center' },
      5: { halign: 'center' },
      6: { halign: 'center' },
    },
    margin: { left: margin, right: margin },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // ========================================
  // RENDIMIENTO POR CANAL
  // ========================================
  if (yPos > pageHeight - 80) {
    doc.addPage();
    yPos = margin;
  }

  doc.setTextColor(...secondaryColor);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('RENDIMIENTO POR CANAL DE VENTA', margin, yPos);
  yPos += 8;

  doc.setDrawColor(...primaryColor);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  const channelData = stats.byChannel.map(c => {
    const percent = c.total > 0 ? Math.round((c.onTime / c.total) * 100) : 0;
    return [
      c.channel,
      c.total.toString(),
      `${c.onTime} (${percent}%)`,
      c.outOfTime.toString(),
      formatTime(c.avgFinishTime),
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [['Canal', 'Total', 'A Tiempo', 'Fuera de Tiempo', 'Tiempo Promedio']],
    body: channelData,
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center' },
    },
    margin: { left: margin, right: margin },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // ========================================
  // DISTRIBUCIÓN HORARIA
  // ========================================
  if (yPos > pageHeight - 80) {
    doc.addPage();
    yPos = margin;
  }

  doc.setTextColor(...secondaryColor);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('DISTRIBUCIÓN HORARIA', margin, yPos);
  yPos += 8;

  doc.setDrawColor(...primaryColor);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  const hourlyData = stats.hourlyStats
    .filter(h => h.total > 0)
    .map(h => {
      const percent = h.total > 0 ? Math.round((h.onTime / h.total) * 100) : 0;
      return [
        `${h.hour.toString().padStart(2, '0')}:00 - ${h.hour.toString().padStart(2, '0')}:59`,
        h.total.toString(),
        h.onTime.toString(),
        h.outOfTime.toString(),
        `${percent}%`,
      ];
    });

  if (hourlyData.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [['Hora', 'Total', 'A Tiempo', 'Fuera de Tiempo', '% Cumplimiento']],
      body: hourlyData,
      theme: 'striped',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'center' },
      },
      margin: { left: margin, right: margin },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // ========================================
  // ESTADO DE PANTALLAS
  // ========================================
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = margin;
  }

  doc.setTextColor(...secondaryColor);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('ESTADO DE PANTALLAS', margin, yPos);
  yPos += 8;

  doc.setDrawColor(...primaryColor);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  const screenStatusData = screens.map(s => [
    s.name,
    `/kds${s.number}`,
    s.queueName,
    s.status,
    s.lastHeartbeat ? new Date(s.lastHeartbeat).toLocaleTimeString() : '-',
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Pantalla', 'URL', 'Cola', 'Estado', 'Último Heartbeat']],
    body: screenStatusData,
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    bodyStyles: {
      fontSize: 9,
    },
    didParseCell: (data) => {
      if (data.column.index === 3 && data.section === 'body') {
        const status = data.cell.raw as string;
        if (status === 'ONLINE') {
          data.cell.styles.textColor = successColor;
          data.cell.styles.fontStyle = 'bold';
        } else if (status === 'OFFLINE') {
          data.cell.styles.textColor = dangerColor;
          data.cell.styles.fontStyle = 'bold';
        } else if (status === 'STANDBY') {
          data.cell.styles.textColor = warningColor;
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    margin: { left: margin, right: margin },
  });

  // ========================================
  // FOOTER
  // ========================================
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Línea de footer
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

    // Texto de footer
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    doc.text(
      `Generado el ${formatDateTime(new Date())} - Sistema KDS`,
      margin,
      pageHeight - 8
    );

    doc.text(
      `Página ${i} de ${totalPages}`,
      pageWidth - margin,
      pageHeight - 8,
      { align: 'right' }
    );
  }

  // Guardar PDF
  const filename = `Reporte_KDS_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};
