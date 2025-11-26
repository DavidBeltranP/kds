import { create } from 'zustand';
import type { ScreenConfig, AppearanceConfig, PreferenceConfig, KeyboardConfig } from '../types';

interface ConfigState {
  config: ScreenConfig | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setConfig: (config: ScreenConfig) => void;
  updateAppearance: (appearance: AppearanceConfig) => void;
  updatePreference: (preference: PreferenceConfig) => void;
  updateKeyboard: (keyboard: KeyboardConfig) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useConfigStore = create<ConfigState>((set) => ({
  config: null,
  isLoading: true,
  error: null,

  setConfig: (config) =>
    set({
      config,
      isLoading: false,
      error: null,
    }),

  updateAppearance: (appearance) =>
    set((state) => ({
      config: state.config
        ? { ...state.config, appearance }
        : null,
    })),

  updatePreference: (preference) =>
    set((state) => ({
      config: state.config
        ? { ...state.config, preference }
        : null,
    })),

  updateKeyboard: (keyboard) =>
    set((state) => ({
      config: state.config
        ? { ...state.config, keyboard }
        : null,
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error, isLoading: false }),
}));

// Selectores
export const useAppearance = () =>
  useConfigStore((state) => state.config?.appearance);

export const usePreference = () =>
  useConfigStore((state) => state.config?.preference);

export const useKeyboard = () =>
  useConfigStore((state) => state.config?.keyboard);

export const useScreenName = () =>
  useConfigStore((state) => state.config?.appearance?.screenName || 'KDS');

export const useTheme = () =>
  useConfigStore((state) => state.config?.appearance?.theme || 'DARK');

export const useColumnsPerScreen = () =>
  useConfigStore((state) => state.config?.appearance?.columnsPerScreen || 4);
