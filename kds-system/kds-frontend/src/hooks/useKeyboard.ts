import { useEffect, useRef, useCallback } from 'react';
import { ButtonController } from '../utils/buttonController';
import { useConfigStore, useKeyboard } from '../store/configStore';
import { useOrderStore, useCurrentPageOrders } from '../store/orderStore';
import { useScreenStore } from '../store/screenStore';
import { useTestModeStore } from '../store/testModeStore';
import { socketService } from '../services/socket';
import type { Order } from '../types';

// Generar PDF de prueba para ticket (formato idéntico al real)
function generateTestPDF(order: Order): Promise<string> {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('es-EC', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Formato idéntico al de printer.service.ts
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

  const blob = new Blob([ticketContent], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ticket-${order.identifier}-${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return Promise.resolve(`ticket-${order.identifier}.txt`);
}

export function useKeyboardController() {
  const controllerRef = useRef<ButtonController | null>(null);

  const keyboard = useKeyboard();
  const config = useConfigStore((state) => state.config);
  const ordersPerPage = config?.appearance?.columnsPerScreen || 4;
  const currentOrders = useCurrentPageOrders(ordersPerPage);

  const { setPage, removeOrder } = useOrderStore();
  const { isStandby, toggleStandby, setComboProgress, showCombo } =
    useScreenStore();

  // Modo prueba - acciones locales sin afectar BD
  const isTestMode = useTestModeStore((state) => state.isTestMode);
  const addLog = useTestModeStore((state) => state.addLog);
  const saveOriginalOrders = useTestModeStore((state) => state.saveOriginalOrders);
  const getOriginalOrders = useTestModeStore((state) => state.getOriginalOrders);
  const orders = useOrderStore((state) => state.orders);

  const handleFinishOrder = useCallback(
    (index: number) => {
      if (isStandby) return;

      const order = currentOrders[index];
      if (order) {
        // MODO PRUEBA: Solo remover localmente, NO enviar al backend + generar PDF
        if (isTestMode) {
          // Guardar órdenes originales la primera vez
          if (!getOriginalOrders()) {
            saveOriginalOrders([...orders]);
            addLog('Órdenes originales guardadas (botonera)');
          }

          console.log(`[Keyboard-TEST] Finishing order at index ${index}:`, order.id);

          // Generar PDF de prueba automáticamente
          generateTestPDF(order).then((filename) => {
            addLog(`[BOTONERA] PDF generado: ${filename}`);
          });

          removeOrder(order.id);
          addLog(`[BOTONERA] Orden #${order.identifier} finalizada (SIMULADO)`);
        } else {
          // MODO PRODUCCIÓN: Enviar al backend normalmente
          console.log(`[Keyboard] Finishing order at index ${index}:`, order.id);
          socketService.finishOrder(order.id);
        }
      }
    },
    [currentOrders, isStandby, isTestMode, orders, removeOrder, addLog, saveOriginalOrders, getOriginalOrders]
  );

  const handleNavigation = useCallback(
    (direction: 'next' | 'prev' | 'first' | 'last') => {
      if (isStandby) return;
      setPage(direction);

      // Log en modo prueba
      if (isTestMode) {
        const directionNames: Record<string, string> = {
          next: 'siguiente',
          prev: 'anterior',
          first: 'primera',
          last: 'última',
        };
        addLog(`[BOTONERA] Navegación: página ${directionNames[direction]}`);
      }
    },
    [isStandby, setPage, isTestMode, addLog]
  );

  const handleTogglePower = useCallback(() => {
    // Leer el estado ANTES de hacer toggle
    const wasStandby = useScreenStore.getState().isStandby;
    toggleStandby();
    // Si estaba en standby, ahora está online. Si estaba online, ahora está en standby.
    const newStatus = wasStandby ? 'ONLINE' : 'STANDBY';

    // MODO PRUEBA: Solo cambio visual, no notificar al backend
    if (isTestMode) {
      console.log('[Keyboard-TEST] Power toggled:', newStatus);
      addLog(`[BOTONERA] Power toggle: ${newStatus} (SIMULADO)`);
    } else {
      socketService.updateStatus(newStatus);
      console.log('[Keyboard] Power toggled:', newStatus);
    }
  }, [toggleStandby, isTestMode, addLog]);

  const handleComboProgress = useCallback(
    (progress: number) => {
      setComboProgress(progress);
      showCombo(progress > 0);
    },
    [setComboProgress, showCombo]
  );

  useEffect(() => {
    if (!keyboard) return;

    // Destruir controller anterior
    if (controllerRef.current) {
      controllerRef.current.destroy();
    }

    // Crear acciones basadas en la configuración
    const actions = [
      {
        key: keyboard.finishFirstOrder,
        action: 'finishFirstOrder',
        handler: () => handleFinishOrder(0),
      },
      {
        key: keyboard.finishSecondOrder,
        action: 'finishSecondOrder',
        handler: () => handleFinishOrder(1),
      },
      {
        key: keyboard.finishThirdOrder,
        action: 'finishThirdOrder',
        handler: () => handleFinishOrder(2),
      },
      {
        key: keyboard.finishFourthOrder,
        action: 'finishFourthOrder',
        handler: () => handleFinishOrder(3),
      },
      {
        key: keyboard.finishFifthOrder,
        action: 'finishFifthOrder',
        handler: () => handleFinishOrder(4),
      },
      {
        key: keyboard.nextPage,
        action: 'nextPage',
        handler: () => handleNavigation('next'),
      },
      {
        key: keyboard.previousPage,
        action: 'previousPage',
        handler: () => handleNavigation('prev'),
      },
      {
        key: keyboard.firstPage,
        action: 'firstPage',
        handler: () => handleNavigation('first'),
      },
      {
        key: keyboard.lastPage,
        action: 'lastPage',
        handler: () => handleNavigation('last'),
      },
    ].filter((a) => a.key);

    // Crear combos - presionar g + i (← + →) casi simultáneamente
    // La botonera envía las teclas en secuencia con delay, aumentamos la ventana
    const combos = [
      {
        keys: ['g', 'i'], // ← + →
        timeWindow: 1500, // Las dos teclas deben llegar en 1.5 segundos
        action: 'togglePower',
        handler: handleTogglePower,
        onProgress: handleComboProgress,
      },
    ];

    // Crear controller
    controllerRef.current = new ButtonController(
      actions,
      combos,
      console.log,
      keyboard.debounceTime || 200
    );

    return () => {
      if (controllerRef.current) {
        controllerRef.current.destroy();
      }
    };
  }, [
    keyboard,
    handleFinishOrder,
    handleNavigation,
    handleTogglePower,
    handleComboProgress,
  ]);

  return controllerRef.current;
}
