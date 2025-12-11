import { create } from 'zustand';
import type { Order } from '../types';

interface TestModeState {
  // Estado del modo prueba
  isTestMode: boolean;
  isPanelOpen: boolean;
  testLog: string[];

  // Órdenes simuladas (para restaurar después de pruebas)
  originalOrders: Order[] | null;

  // Acciones
  toggleTestMode: () => void;
  togglePanel: () => void;
  addLog: (message: string) => void;
  clearLogs: () => void;
  saveOriginalOrders: (orders: Order[]) => void;
  getOriginalOrders: () => Order[] | null;
}

export const useTestModeStore = create<TestModeState>((set, get) => ({
  isTestMode: false,
  isPanelOpen: false,
  testLog: [],
  originalOrders: null,

  toggleTestMode: () =>
    set((state) => {
      const newMode = !state.isTestMode;
      const timestamp = new Date().toLocaleTimeString();
      return {
        isTestMode: newMode,
        testLog: [
          ...state.testLog,
          `[${timestamp}] Modo prueba ${newMode ? 'ACTIVADO' : 'DESACTIVADO'}`,
        ],
      };
    }),

  togglePanel: () =>
    set((state) => ({ isPanelOpen: !state.isPanelOpen })),

  addLog: (message) =>
    set((state) => {
      const timestamp = new Date().toLocaleTimeString();
      return {
        testLog: [...state.testLog.slice(-49), `[${timestamp}] ${message}`],
      };
    }),

  clearLogs: () =>
    set({ testLog: [] }),

  saveOriginalOrders: (orders) =>
    set({ originalOrders: orders }),

  getOriginalOrders: () => get().originalOrders,
}));

// Selectores
export const useIsTestMode = () => useTestModeStore((state) => state.isTestMode);
export const useIsPanelOpen = () => useTestModeStore((state) => state.isPanelOpen);
export const useTestLogs = () => useTestModeStore((state) => state.testLog);
