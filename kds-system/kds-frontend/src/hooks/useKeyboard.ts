import { useEffect, useRef, useCallback } from 'react';
import { ButtonController } from '../utils/buttonController';
import { useConfigStore, useKeyboard } from '../store/configStore';
import { useOrderStore, useCurrentPageOrders } from '../store/orderStore';
import { useScreenStore } from '../store/screenStore';
import { socketService } from '../services/socket';

export function useKeyboardController() {
  const controllerRef = useRef<ButtonController | null>(null);

  const keyboard = useKeyboard();
  const config = useConfigStore((state) => state.config);
  const ordersPerPage = config?.appearance?.columnsPerScreen || 4;
  const currentOrders = useCurrentPageOrders(ordersPerPage);

  const { setPage, setLastFinished } = useOrderStore();
  const { isStandby, toggleStandby, setComboProgress, showCombo } =
    useScreenStore();

  const handleFinishOrder = useCallback(
    (index: number) => {
      if (isStandby) return;

      const order = currentOrders[index];
      if (order) {
        console.log(`[Keyboard] Finishing order at index ${index}:`, order.id);
        socketService.finishOrder(order.id);
        setLastFinished(order.id);
      }
    },
    [currentOrders, isStandby, setLastFinished]
  );

  const handleUndo = useCallback(() => {
    if (isStandby) return;

    const lastFinished = useOrderStore.getState().lastFinishedOrderId;
    if (lastFinished) {
      console.log('[Keyboard] Undo order:', lastFinished);
      socketService.undoOrder(lastFinished);
      setLastFinished(null);
    }
  }, [isStandby, setLastFinished]);

  const handleNavigation = useCallback(
    (direction: 'next' | 'prev' | 'first' | 'last') => {
      if (isStandby) return;
      setPage(direction);
    },
    [isStandby, setPage]
  );

  const handleTogglePower = useCallback(() => {
    toggleStandby();
    const newStatus = useScreenStore.getState().isStandby ? 'ONLINE' : 'STANDBY';
    socketService.updateStatus(newStatus);
    console.log('[Keyboard] Power toggled:', newStatus);
  }, [toggleStandby]);

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
      {
        key: keyboard.undo,
        action: 'undo',
        handler: handleUndo,
      },
    ].filter((a) => a.key);

    // Crear combos
    const combos = (keyboard.combos || [])
      .filter((c) => c.enabled)
      .map((combo) => ({
        keys: combo.keys,
        holdTime: combo.holdTime,
        action: combo.action,
        handler: () => {
          if (combo.action === 'togglePower') {
            handleTogglePower();
          }
        },
        onProgress: handleComboProgress,
      }));

    // Agregar combo por defecto para power si no existe
    if (!combos.find((c) => c.action === 'togglePower')) {
      combos.push({
        keys: ['i', 'g'],
        holdTime: 3000,
        action: 'togglePower',
        handler: handleTogglePower,
        onProgress: handleComboProgress,
      });
    }

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
    handleUndo,
    handleTogglePower,
    handleComboProgress,
  ]);

  return controllerRef.current;
}
