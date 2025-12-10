import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { mirrorApi } from '../services/api';

interface MirrorConnection {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

interface TestModeState {
  // Estado del modo prueba
  isTestMode: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  connectionMode: 'mirror-sqlserver' | 'local-postgresql' | null;

  // Configuración de conexión (persistida)
  savedConnection: MirrorConnection | null;

  // Stats del mirror
  stats: {
    ordersOnScreen: number;
    screens: string[];
    queues: string[];
  } | null;

  // Acciones
  enableTestMode: () => Promise<boolean>;
  disableTestMode: () => Promise<void>;
  connect: (config: MirrorConnection) => Promise<boolean>;
  disconnect: () => Promise<void>;
  refreshStats: () => Promise<void>;
  saveConnection: (config: MirrorConnection) => void;
  clearConnection: () => void;
}

export const useTestModeStore = create<TestModeState>()(
  persist(
    (set, get) => ({
      isTestMode: false,
      isConnected: false,
      isConnecting: false,
      connectionError: null,
      connectionMode: null,
      savedConnection: null,
      stats: null,

      enableTestMode: async () => {
        const { savedConnection } = get();

        if (!savedConnection) {
          set({ connectionError: 'No hay conexión guardada. Configure la conexión primero.' });
          return false;
        }

        set({ isConnecting: true, connectionError: null });

        try {
          // Intentar conectar al mirror
          const { data } = await mirrorApi.configure(savedConnection);

          if (data.success) {
            // Obtener stats
            const statsResponse = await mirrorApi.stats();

            set({
              isTestMode: true,
              isConnected: true,
              isConnecting: false,
              connectionMode: statsResponse.data.mode,
              stats: {
                ordersOnScreen: statsResponse.data.ordersOnScreen || 0,
                screens: statsResponse.data.screens || [],
                queues: statsResponse.data.queues || [],
              },
            });
            return true;
          } else {
            set({
              isConnecting: false,
              connectionError: data.message || 'Error de conexión',
            });
            return false;
          }
        } catch (error: any) {
          set({
            isConnecting: false,
            connectionError: error.response?.data?.message || 'Error al conectar con SQL Server',
          });
          return false;
        }
      },

      disableTestMode: async () => {
        try {
          await mirrorApi.disconnect();
        } catch {
          // Ignorar errores al desconectar
        }
        set({
          isTestMode: false,
          isConnected: false,
          connectionMode: null,
          stats: null,
        });
      },

      connect: async (config: MirrorConnection) => {
        set({ isConnecting: true, connectionError: null });

        try {
          const { data } = await mirrorApi.configure(config);

          if (data.success) {
            // Guardar la conexión exitosa
            set({ savedConnection: config });

            // Obtener stats
            const statsResponse = await mirrorApi.stats();

            set({
              isTestMode: true,
              isConnected: true,
              isConnecting: false,
              connectionMode: statsResponse.data.mode,
              stats: {
                ordersOnScreen: statsResponse.data.ordersOnScreen || 0,
                screens: statsResponse.data.screens || [],
                queues: statsResponse.data.queues || [],
              },
            });
            return true;
          } else {
            set({
              isConnecting: false,
              connectionError: data.message || 'Error de conexión',
            });
            return false;
          }
        } catch (error: any) {
          set({
            isConnecting: false,
            connectionError: error.response?.data?.message || 'Error al conectar con SQL Server',
          });
          return false;
        }
      },

      disconnect: async () => {
        try {
          await mirrorApi.disconnect();
        } catch {
          // Ignorar errores
        }
        set({
          isTestMode: false,
          isConnected: false,
          connectionMode: null,
          stats: null,
        });
      },

      refreshStats: async () => {
        try {
          const { data } = await mirrorApi.stats();
          set({
            connectionMode: data.mode,
            stats: {
              ordersOnScreen: data.ordersOnScreen || 0,
              screens: data.screens || [],
              queues: data.queues || [],
            },
          });
        } catch {
          // Ignorar errores
        }
      },

      saveConnection: (config: MirrorConnection) => {
        set({ savedConnection: config });
      },

      clearConnection: () => {
        set({ savedConnection: null });
      },
    }),
    {
      name: 'kds-test-mode',
      partialize: (state) => ({
        savedConnection: state.savedConnection,
      }),
    }
  )
);

// Hook helper para saber si usar datos de mirror
export const useIsTestMode = () => useTestModeStore((state) => state.isTestMode && state.isConnected);
