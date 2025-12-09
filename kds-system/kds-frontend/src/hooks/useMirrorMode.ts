import { useEffect, useRef, useCallback } from 'react';
import { useOrderStore } from '../store/orderStore';
import { useConfigStore } from '../store/configStore';
import type { Order } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface MirrorConfig {
  token: string;
  screenFilter?: string;
  queueFilter?: string;
  refreshInterval?: number;
}

interface MirrorOrder {
  id: string;
  externalId: string;
  identifier: string;
  channel: string;
  customerName?: string;
  status: 'PENDING' | 'FINISHED';
  createdAt: string;
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

// Convertir orden del mirror al formato del KDS
function convertMirrorOrder(mirrorOrder: MirrorOrder): Order {
  return {
    id: mirrorOrder.id,
    externalId: mirrorOrder.externalId,
    identifier: mirrorOrder.identifier,
    channel: mirrorOrder.channel,
    customerName: mirrorOrder.customerName,
    status: mirrorOrder.status === 'PENDING' ? 'PENDING' : 'FINISHED',
    createdAt: mirrorOrder.createdAt,
    items: mirrorOrder.items.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      notes: item.notes,
      // Agregar subitems como modificador si existen
      modifier: item.subitems?.map((sub) => `${sub.quantity}x ${sub.name}`).join(', '),
    })),
  };
}

export function useMirrorMode(config: MirrorConfig | null) {
  const { setOrders } = useOrderStore();
  const { setError } = useConfigStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFetchingRef = useRef(false);

  // Usar refs para evitar recrear el callback y causar loops infinitos
  const configRef = useRef(config);
  configRef.current = config;

  const fetchMirrorOrders = useCallback(async () => {
    const currentConfig = configRef.current;
    if (!currentConfig?.token) return;

    // Evitar solicitudes concurrentes
    if (isFetchingRef.current) {
      console.log('[Mirror] Skipping fetch - already in progress');
      return;
    }

    isFetchingRef.current = true;

    try {
      const params = new URLSearchParams();
      if (currentConfig.screenFilter) params.set('screen', currentConfig.screenFilter);
      if (currentConfig.queueFilter) params.set('queue', currentConfig.queueFilter);

      const url = `${API_URL}/mirror/orders${params.toString() ? `?${params}` : ''}`;
      console.log('[Mirror] Fetching orders from:', url);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${currentConfig.token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[Mirror] Received data:', data);

      if (data.success && data.orders) {
        const orders = data.orders.map(convertMirrorOrder);
        console.log('[Mirror] Converted orders:', orders.length);
        setOrders(orders);
      }
    } catch (err) {
      console.error('[Mirror] Error fetching orders:', err);
      setError(err instanceof Error ? err.message : 'Error fetching mirror orders');
    } finally {
      isFetchingRef.current = false;
    }
  }, [setOrders, setError]);

  useEffect(() => {
    if (!config?.token) return;

    console.log('[Mirror] Starting mirror mode with config:', config);

    // Limpiar intervalo anterior si existe
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Fetch inicial
    fetchMirrorOrders();

    // Configurar polling con intervalo mínimo de 2 segundos
    const interval = Math.max(config.refreshInterval || 5000, 2000);
    console.log('[Mirror] Setting polling interval:', interval, 'ms');
    intervalRef.current = setInterval(fetchMirrorOrders, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [config?.token, config?.screenFilter, config?.queueFilter, config?.refreshInterval, fetchMirrorOrders]);

  return { refetch: fetchMirrorOrders };
}
