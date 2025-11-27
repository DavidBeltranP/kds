import { create } from 'zustand';
import type { ScreenStatus } from '../types';

interface ScreenState {
  status: ScreenStatus;
  isStandby: boolean;
  isConnected: boolean;
  lastHeartbeat: Date | null;
  comboProgress: number;
  showComboIndicator: boolean;

  // Actions
  setStatus: (status: ScreenStatus) => void;
  setStandby: (isStandby: boolean) => void;
  toggleStandby: () => void;
  setConnected: (connected: boolean) => void;
  updateHeartbeat: () => void;
  setComboProgress: (progress: number) => void;
  showCombo: (show: boolean) => void;
}

export const useScreenStore = create<ScreenState>((set) => ({
  status: 'OFFLINE',
  isStandby: false,
  isConnected: false,
  lastHeartbeat: null,
  comboProgress: 0,
  showComboIndicator: false,

  setStatus: (status) =>
    set({
      status,
      isStandby: status === 'STANDBY',
    }),

  setStandby: (isStandby) =>
    set({
      isStandby,
      status: isStandby ? 'STANDBY' : 'ONLINE',
    }),

  toggleStandby: () =>
    set((state) => ({
      isStandby: !state.isStandby,
      status: state.isStandby ? 'ONLINE' : 'STANDBY',
    })),

  setConnected: (isConnected) =>
    set((state) => ({
      isConnected,
      // Solo cambiar a OFFLINE cuando se desconecta
      // Cuando se conecta, NO cambiar el status - viene del servidor via config:update
      status: !isConnected ? 'OFFLINE' : state.status,
    })),

  updateHeartbeat: () =>
    set({ lastHeartbeat: new Date() }),

  setComboProgress: (progress) =>
    set({ comboProgress: progress }),

  showCombo: (show) =>
    set({
      showComboIndicator: show,
      comboProgress: show ? 0 : 0,
    }),
}));

// Selectores
export const useIsStandby = () =>
  useScreenStore((state) => state.isStandby);

export const useIsConnected = () =>
  useScreenStore((state) => state.isConnected);

export const useComboIndicator = () =>
  useScreenStore((state) => ({
    show: state.showComboIndicator,
    progress: state.comboProgress,
  }));
