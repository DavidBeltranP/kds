import { useEffect, useRef } from 'react';
import { socketService } from '../services/socket';
import { useConfigStore } from '../store/configStore';
import { useOrderStore } from '../store/orderStore';
import { useScreenStore } from '../store/screenStore';
import type { WsOrdersUpdate, ScreenConfig } from '../types';

const HEARTBEAT_INTERVAL = 5000; // 5 segundos

export function useWebSocket(screenId: string, apiKey: string) {
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { setConfig, setLoading, setError } = useConfigStore();
  const { setOrders, removeOrder } = useOrderStore();
  const { setConnected, updateHeartbeat, setStatus } = useScreenStore();

  useEffect(() => {
    if (!screenId || !apiKey) {
      setError('Screen ID and API Key are required');
      return;
    }

    setLoading(true);

    // Conectar socket
    const socket = socketService.connect(screenId, apiKey);

    // Event handlers
    socket.on('connect', () => {
      console.log('[WS] Connected');
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('[WS] Disconnected');
      setConnected(false);
    });

    socket.on('config:update', (config: ScreenConfig) => {
      console.log('[WS] Config received');
      setConfig(config);
      setStatus(config.status);
    });

    socket.on('orders:update', (data: WsOrdersUpdate) => {
      console.log('[WS] Orders update:', data.orders.length);
      setOrders(data.orders);
    });

    socket.on('order:finished', (data: { orderId: string }) => {
      console.log('[WS] Order finished:', data.orderId);
      removeOrder(data.orderId);
    });

    socket.on('order:restored', (data: { orderId: string }) => {
      console.log('[WS] Order restored:', data.orderId);
      socketService.requestOrders();
    });

    socket.on('screen:statusConfirmed', (data: { status: string }) => {
      console.log('[WS] Status confirmed:', data.status);
    });

    // Escuchar cambios de estado desde backoffice
    socket.on('screen:statusChanged', (data: { screenId: string; status: string }) => {
      console.log('[WS] Screen status changed from backoffice:', data);
      if (data.screenId === screenId) {
        console.log('[WS] Applying status change:', data.status);
        setStatus(data.status as 'ONLINE' | 'OFFLINE' | 'STANDBY');
      }
    });

    socket.on('error', (error: { message: string }) => {
      console.error('[WS] Error:', error.message);
      setError(error.message);
    });

    // Iniciar heartbeat
    heartbeatRef.current = setInterval(() => {
      socketService.sendHeartbeat();
      updateHeartbeat();
    }, HEARTBEAT_INTERVAL);

    // Cleanup
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      socketService.disconnect();
    };
  }, [screenId, apiKey]);

  return {
    finishOrder: (orderId: string) => socketService.finishOrder(orderId),
    undoOrder: (orderId: string) => socketService.undoOrder(orderId),
    updateStatus: (status: 'ONLINE' | 'STANDBY') =>
      socketService.updateStatus(status),
    requestOrders: () => socketService.requestOrders(),
  };
}
