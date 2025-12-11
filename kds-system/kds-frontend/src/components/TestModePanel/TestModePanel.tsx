import { useState } from 'react';
import { useTestModeStore, useIsTestMode, useIsPanelOpen, useTestLogs } from '../../store/testModeStore';
import { useOrderStore } from '../../store/orderStore';
import type { Order } from '../../types';

// Generar orden de prueba
function generateTestOrder(): Order {
  const channels = ['SALON', 'LLEVAR', 'DELIVERY', 'KIOSKO'];
  const items = [
    { name: 'COMBO MEGA', quantity: 1 },
    { name: 'PAPAS GRANDES', quantity: 2 },
    { name: 'GASEOSA 500ML', quantity: 1 },
    { name: 'HAMBURGUESA DOBLE', quantity: 1 },
    { name: 'NUGGETS X10', quantity: 1 },
    { name: 'HELADO CONO', quantity: 3 },
  ];

  const selectedItems = items
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.floor(Math.random() * 4) + 2)
    .map((item, idx) => ({
      id: `test-item-${Date.now()}-${idx}`,
      name: item.name,
      quantity: Math.floor(Math.random() * 3) + 1,
      notes: Math.random() > 0.7 ? 'SIN CEBOLLA' : undefined,
      modifier: Math.random() > 0.8 ? '*EXTRA QUESO' : undefined,
    }));

  return {
    id: `test-${Date.now()}`,
    externalId: `EXT-${Math.floor(Math.random() * 9999)}`,
    channel: channels[Math.floor(Math.random() * channels.length)],
    channelType: Math.random() > 0.5 ? 'SALON' : 'LLEVAR',
    customerName: `Cliente Test ${Math.floor(Math.random() * 100)}`,
    identifier: `${Math.floor(Math.random() * 999)}`,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    items: selectedItems,
  };
}

// Generar PDF de prueba (formato idéntico al real de printer.service.ts)
async function generateTestPDF(order: Order) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('es-EC', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const lines: string[] = [];

  // Encabezado
  lines.push('');
  lines.push(`        ORDEN ${order.identifier}`);
  lines.push('');

  // Canal y cliente
  lines.push(`Canal: ${order.channel}`);
  if (order.customerName) {
    lines.push(`Cliente: ${order.customerName}`);
  }
  lines.push('');

  // Separador
  lines.push('-'.repeat(32));

  // Items (formato idéntico al real)
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
  lines.push(`Hora: ${timeStr}`);
  lines.push('');

  // Indicador pequeño de prueba
  lines.push('        [MODO PRUEBA]');
  lines.push('');

  const ticketContent = lines.join('\n');

  // Crear blob y descargar
  const blob = new Blob([ticketContent], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ticket-${order.identifier}-${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return `ticket-${order.identifier}.txt`;
}

export function TestModePanel() {
  const isTestMode = useIsTestMode();
  const isPanelOpen = useIsPanelOpen();
  const testLogs = useTestLogs();
  const { toggleTestMode, togglePanel, addLog, clearLogs, saveOriginalOrders, getOriginalOrders } = useTestModeStore();
  const { orders, setOrders, addOrders, removeOrder } = useOrderStore();
  const [showLogs, setShowLogs] = useState(false);

  // Agregar orden de prueba
  const handleAddTestOrder = () => {
    if (!isTestMode) {
      addLog('Activa el modo prueba primero');
      return;
    }

    // Guardar órdenes originales la primera vez
    if (!getOriginalOrders()) {
      saveOriginalOrders([...orders]);
      addLog('Órdenes originales guardadas');
    }

    const testOrder = generateTestOrder();
    addOrders([testOrder]);
    addLog(`Orden de prueba agregada: #${testOrder.identifier}`);
  };

  // Simular finalizar primera orden
  const handleFinishFirstOrder = () => {
    if (!isTestMode) {
      addLog('Activa el modo prueba primero');
      return;
    }

    if (orders.length > 0) {
      const firstOrder = orders[0];
      removeOrder(firstOrder.id);
      addLog(`Orden #${firstOrder.identifier} finalizada (simulado)`);
    } else {
      addLog('No hay órdenes para finalizar');
    }
  };

  // Generar PDF de prueba
  const handleGeneratePDF = async () => {
    if (orders.length > 0) {
      const firstOrder = orders[0];
      const filename = await generateTestPDF(firstOrder);
      addLog(`PDF generado: ${filename}`);
    } else {
      // Generar con orden ficticia
      const testOrder = generateTestOrder();
      const filename = await generateTestPDF(testOrder);
      addLog(`PDF de prueba generado: ${filename}`);
    }
  };

  // Restaurar órdenes originales
  const handleRestoreOrders = () => {
    const original = getOriginalOrders();
    if (original) {
      setOrders(original);
      addLog('Órdenes originales restauradas');
    } else {
      addLog('No hay órdenes originales guardadas');
    }
  };

  // Limpiar todas las órdenes (modo prueba)
  const handleClearOrders = () => {
    if (!isTestMode) {
      addLog('Activa el modo prueba primero');
      return;
    }

    if (!getOriginalOrders()) {
      saveOriginalOrders([...orders]);
    }

    setOrders([]);
    addLog('Todas las órdenes limpiadas (simulado)');
  };

  // Botón flotante para abrir/cerrar panel
  if (!isPanelOpen) {
    return (
      <button
        onClick={togglePanel}
        className={`
          fixed bottom-4 right-4 z-50
          w-14 h-14 rounded-full shadow-lg
          flex items-center justify-center
          transition-all duration-300
          ${isTestMode
            ? 'bg-orange-500 hover:bg-orange-600 animate-pulse'
            : 'bg-gray-700 hover:bg-gray-600'}
        `}
        title="Panel de Pruebas"
      >
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    );
  }

  return (
    <>
      {/* Indicador MODO PRUEBA en la parte superior */}
      {isTestMode && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-orange-500 text-white text-center py-1 font-bold text-sm animate-pulse">
          MODO PRUEBA ACTIVO - Las acciones NO afectan la base de datos
        </div>
      )}

      {/* Panel lateral */}
      <div className="fixed right-0 top-0 h-full w-80 bg-gray-900 shadow-2xl z-40 flex flex-col">
        {/* Header del panel */}
        <div className="p-4 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-white font-bold text-lg">Panel de Pruebas</h2>
          <button
            onClick={togglePanel}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Toggle modo prueba */}
        <div className="p-4 border-b border-gray-700">
          <button
            onClick={toggleTestMode}
            className={`
              w-full py-3 rounded-lg font-bold transition-all
              ${isTestMode
                ? 'bg-orange-500 hover:bg-orange-600 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}
            `}
          >
            {isTestMode ? 'DESACTIVAR Modo Prueba' : 'ACTIVAR Modo Prueba'}
          </button>
          <p className="text-gray-500 text-xs mt-2 text-center">
            {isTestMode
              ? 'Las acciones son simuladas'
              : 'Activa para probar sin afectar la BD'}
          </p>
        </div>

        {/* Botones de acciones */}
        <div className="p-4 space-y-2 flex-1 overflow-y-auto">
          <p className="text-gray-400 text-xs uppercase mb-3">Acciones de Prueba</p>

          {/* Agregar orden de prueba */}
          <button
            onClick={handleAddTestOrder}
            disabled={!isTestMode}
            className={`
              w-full py-2 px-4 rounded-lg text-left flex items-center gap-3
              ${isTestMode
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'}
            `}
          >
            <span className="text-xl">+</span>
            <span>Agregar Orden de Prueba</span>
          </button>

          {/* Finalizar primera orden */}
          <button
            onClick={handleFinishFirstOrder}
            disabled={!isTestMode}
            className={`
              w-full py-2 px-4 rounded-lg text-left flex items-center gap-3
              ${isTestMode
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'}
            `}
          >
            <span className="text-xl">&#10003;</span>
            <span>Finalizar Primera Orden</span>
          </button>

          {/* Generar PDF */}
          <button
            onClick={handleGeneratePDF}
            className="w-full py-2 px-4 rounded-lg text-left flex items-center gap-3 bg-purple-600 hover:bg-purple-700 text-white"
          >
            <span className="text-xl">&#128196;</span>
            <span>Generar PDF de Prueba</span>
          </button>

          {/* Limpiar órdenes */}
          <button
            onClick={handleClearOrders}
            disabled={!isTestMode}
            className={`
              w-full py-2 px-4 rounded-lg text-left flex items-center gap-3
              ${isTestMode
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'}
            `}
          >
            <span className="text-xl">&#128465;</span>
            <span>Limpiar Órdenes</span>
          </button>

          {/* Restaurar órdenes */}
          <button
            onClick={handleRestoreOrders}
            className="w-full py-2 px-4 rounded-lg text-left flex items-center gap-3 bg-yellow-600 hover:bg-yellow-700 text-white"
          >
            <span className="text-xl">&#8634;</span>
            <span>Restaurar Órdenes Originales</span>
          </button>

          {/* Separador */}
          <hr className="border-gray-700 my-4" />

          {/* Info de estado */}
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-gray-400 text-xs uppercase mb-2">Estado Actual</p>
            <p className="text-white text-sm">
              Órdenes en pantalla: <span className="font-bold text-blue-400">{orders.length}</span>
            </p>
            <p className="text-white text-sm">
              Modo: <span className={`font-bold ${isTestMode ? 'text-orange-400' : 'text-green-400'}`}>
                {isTestMode ? 'PRUEBA' : 'PRODUCCIÓN'}
              </span>
            </p>
          </div>
        </div>

        {/* Logs de prueba */}
        <div className="border-t border-gray-700">
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="w-full p-3 text-gray-400 text-sm flex items-center justify-between hover:bg-gray-800"
          >
            <span>Logs de Prueba ({testLogs.length})</span>
            <span>{showLogs ? '▼' : '▲'}</span>
          </button>

          {showLogs && (
            <div className="max-h-40 overflow-y-auto bg-black p-2">
              {testLogs.length === 0 ? (
                <p className="text-gray-600 text-xs">Sin logs</p>
              ) : (
                <>
                  <button
                    onClick={clearLogs}
                    className="text-xs text-red-400 hover:text-red-300 mb-2"
                  >
                    Limpiar logs
                  </button>
                  {testLogs.map((log, idx) => (
                    <p key={idx} className="text-green-400 text-xs font-mono">
                      {log}
                    </p>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
