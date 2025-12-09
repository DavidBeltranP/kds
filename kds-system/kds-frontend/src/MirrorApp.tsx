import { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { OrderGrid } from './components/OrderGrid';
import { Footer } from './components/Footer';
import { StandbyScreen } from './components/StandbyScreen';
import { useMirrorMode } from './hooks/useMirrorMode';
import { useConfigStore } from './store/configStore';
import { useOrderStore, useCurrentPageOrders } from './store/orderStore';
import { MirrorConfigPanel } from './components/MirrorConfigPanel';
import { generateTicketPdf } from './utils/ticketPdfGenerator';
import type { ScreenConfig, AppearanceConfig, PreferenceConfig, KeyboardConfig, Order } from './types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface MirrorAppProps {
  token: string;
  screenId: string;
  screenFilter?: string;
  queueFilter?: string;
}

// Configuracion por defecto para modo mirror (igual que backoffice)
const defaultAppearance: AppearanceConfig = {
  fontSize: '18px',
  fontFamily: 'Inter, sans-serif',
  columnsPerScreen: 4,
  columnSize: '280px',
  footerHeight: '72px',
  ordersDisplay: 'COLUMNS',
  theme: 'LIGHT',
  screenName: 'MIRROR KDS',
  screenSplit: true,
  showCounters: false,
  // Colores - tema claro (igual que backoffice)
  backgroundColor: '#f0f2f5',
  headerColor: '#1a1a2e',
  headerTextColor: '#ffffff',
  cardColor: '#ffffff',
  textColor: '#1a1a2e',
  accentColor: '#e94560',
  // Tipografia productos
  productFontFamily: 'Inter, sans-serif',
  productFontSize: 'medium',
  productFontWeight: 'bold',
  // Tipografia modificadores
  modifierFontFamily: 'Inter, sans-serif',
  modifierFontSize: 'small',
  modifierFontColor: '#666666',
  modifierFontStyle: 'italic',
  // Cabecera de orden
  headerFontFamily: 'Inter, sans-serif',
  headerFontSize: 'medium',
  headerShowChannel: true,
  headerShowTime: true,
  // Otras opciones
  rows: 2,
  maxItemsPerColumn: 10,
  showTimer: true,
  showOrderNumber: true,
  animationEnabled: true,
  cardColors: [
    { id: '1', color: '#4CAF50', minutes: '01:00', order: 1, isFullBackground: false },
    { id: '2', color: '#FFC107', minutes: '02:00', order: 2, isFullBackground: false },
    { id: '3', color: '#FF5722', minutes: '03:00', order: 3, isFullBackground: false },
    { id: '4', color: '#f44336', minutes: '04:00', order: 4, isFullBackground: true },
  ],
  channelColors: [],
};

const defaultPreference: PreferenceConfig = {
  finishOrderActive: false, // No se puede finalizar en mirror
  finishOrderTime: '00:00',
  showClientData: true,
  showName: true,
  showIdentifier: true,
  identifierMessage: 'Orden',
  showNumerator: false,
  showPagination: true,
  sourceBoxActive: true,
  sourceBoxMessage: 'ESPEJO',
  touchEnabled: false,
};

const defaultKeyboard: KeyboardConfig = {
  finishFirstOrder: '',
  finishSecondOrder: '',
  finishThirdOrder: '',
  finishFourthOrder: '',
  finishFifthOrder: '',
  nextPage: 'ArrowRight',
  previousPage: 'ArrowLeft',
  undo: '',
  resetTime: '',
  firstPage: '',
  secondPage: '',
  middlePage: '',
  penultimatePage: '',
  lastPage: '',
  confirmModal: '',
  cancelModal: '',
  power: '',
  exit: '',
  combos: [],
  debounceTime: 200,
};

export function MirrorApp({ token, screenId, screenFilter, queueFilter }: MirrorAppProps) {
  const { setConfig, isLoading, error, config } = useConfigStore();
  const { setPage, orders, setOrders } = useOrderStore();
  const [initialized, setInitialized] = useState(false);
  const [configPanelOpen, setConfigPanelOpen] = useState(false);
  const [loadingAppearance, setLoadingAppearance] = useState(false);
  const [keyLog, setKeyLog] = useState<string[]>([]);
  const [showKeyLog, setShowKeyLog] = useState(false);

  // Estado para modo simulación
  const [simulationMode, setSimulationMode] = useState(true); // Por defecto activado
  const [isStandby, setIsStandby] = useState(false);
  const [finishedOrders, setFinishedOrders] = useState<Order[]>([]);
  const [lastAction, setLastAction] = useState<string>('');
  const comboKeysRef = useRef<{ key: string; time: number }[]>([]);

  // Obtener órdenes de la página actual
  const columnsPerScreen = config?.appearance?.columnsPerScreen || 4;
  const currentOrders = useCurrentPageOrders(columnsPerScreen);

  // Cargar apariencia desde el backend (de la pantalla especificada)
  const loadAppearanceFromBackend = useCallback(async () => {
    if (!screenFilter || !token) return null;

    try {
      setLoadingAppearance(true);
      console.log('[Mirror] Cargando apariencia desde backend para:', screenFilter);

      // Obtener lista de pantallas para encontrar la configuración
      const response = await fetch(`${API_URL}/mirror/screens`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        console.warn('[Mirror] No se pudo cargar la configuración del backend');
        return null;
      }

      const data = await response.json();
      console.log('[Mirror] Pantallas disponibles:', data);

      if (data.success && data.screens) {
        // Buscar la pantalla por nombre
        const screen = data.screens.find(
          (s: { name: string }) => s.name.toLowerCase() === screenFilter.toLowerCase()
        );

        if (screen?.appearance) {
          console.log('[Mirror] Apariencia encontrada:', screen.appearance);
          return screen.appearance as AppearanceConfig;
        }
      }

      return null;
    } catch (err) {
      console.error('[Mirror] Error cargando apariencia:', err);
      return null;
    } finally {
      setLoadingAppearance(false);
    }
  }, [screenFilter, token]);

  // Función para finalizar orden localmente (simulación)
  const handleFinishOrderLocal = useCallback((index: number) => {
    if (isStandby || !simulationMode) return;

    const order = currentOrders[index];
    if (!order) {
      console.log(`[Mirror] No hay orden en posición ${index + 1}`);
      setLastAction(`Sin orden en posición ${index + 1}`);
      return;
    }

    console.log(`[Mirror] Finalizando orden local: ${order.identifier}`);
    setLastAction(`Finalizada: #${order.identifier}`);

    // Generar PDF del ticket
    generateTicketPdf({
      order,
      screenName: screenFilter || 'MIRROR',
      queueName: queueFilter || 'TODAS',
      finishedAt: new Date(),
    });

    // Mover a finalizadas y remover de activas
    setFinishedOrders((prev) => [order, ...prev.slice(0, 9)]);
    setOrders(orders.filter((o) => o.id !== order.id));
  }, [currentOrders, orders, setOrders, isStandby, simulationMode, screenFilter, queueFilter]);

  // Función para toggle standby (simulación)
  const handleToggleStandby = useCallback(() => {
    setIsStandby((prev) => {
      const newState = !prev;
      setLastAction(newState ? 'Pantalla APAGADA' : 'Pantalla ENCENDIDA');
      console.log(`[Mirror] Standby: ${newState ? 'ON' : 'OFF'}`);
      return newState;
    });
  }, []);

  // Handler para navegacion de teclado - modo mirror con simulación
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si estamos en un input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const keyPressed = e.key.toLowerCase();
      const now = Date.now();
      console.log('[Mirror] Key pressed:', keyPressed);

      // Log de teclas para debug de botonera
      setKeyLog((prev) => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${e.key}`]);

      // Detectar combo g + i para toggle standby (como la botonera real)
      comboKeysRef.current.push({ key: keyPressed, time: now });
      comboKeysRef.current = comboKeysRef.current.filter((k) => now - k.time < 1500);

      const recentKeys = comboKeysRef.current.map((k) => k.key);
      if (recentKeys.includes('g') && recentKeys.includes('i')) {
        e.preventDefault();
        handleToggleStandby();
        comboKeysRef.current = [];
        return;
      }

      // Si está en standby, solo permitir combo para encender
      if (isStandby) {
        return;
      }

      switch (keyPressed) {
        // Navegación
        case 'arrowright':
        case 'pagedown':
        case 'i': // Tecla botonera derecha
          e.preventDefault();
          setPage('next');
          setLastAction('Página siguiente');
          break;
        case 'arrowleft':
        case 'pageup':
        case 'g': // Tecla botonera izquierda (solo si no es combo)
          e.preventDefault();
          // No navegar si puede ser parte de un combo
          setTimeout(() => {
            if (comboKeysRef.current.length <= 1) {
              setPage('prev');
              setLastAction('Página anterior');
            }
          }, 200);
          break;
        case 'home':
          e.preventDefault();
          setPage('first');
          setLastAction('Primera página');
          break;
        case 'end':
          e.preventDefault();
          setPage('last');
          setLastAction('Última página');
          break;

        // Teclas de botonera para finalizar órdenes (1-5)
        case '1':
          e.preventDefault();
          if (simulationMode) handleFinishOrderLocal(0);
          break;
        case '2':
          e.preventDefault();
          if (simulationMode) handleFinishOrderLocal(1);
          break;
        case '3':
          e.preventDefault();
          if (simulationMode) handleFinishOrderLocal(2);
          break;
        case '4':
          e.preventDefault();
          if (simulationMode) handleFinishOrderLocal(3);
          break;
        case '5':
          e.preventDefault();
          if (simulationMode) handleFinishOrderLocal(4);
          break;

        // Toggle del log de teclas con F1
        case 'f1':
          e.preventDefault();
          setShowKeyLog((prev) => !prev);
          break;

        // Toggle modo simulación con F2
        case 'f2':
          e.preventDefault();
          setSimulationMode((prev) => {
            const newMode = !prev;
            setLastAction(newMode ? 'Modo simulación ON' : 'Modo solo lectura');
            return newMode;
          });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setPage, handleFinishOrderLocal, handleToggleStandby, isStandby, simulationMode]);

  // Configurar el store con valores por defecto o desde backend para mirror
  useEffect(() => {
    const initializeConfig = async () => {
      if (initialized) return;

      const screenName = screenFilter
        ? `MIRROR - ${screenFilter}`
        : queueFilter
          ? `MIRROR - ${queueFilter}`
          : 'MIRROR KDS';

      // Intentar cargar apariencia desde backend
      const backendAppearance = await loadAppearanceFromBackend();

      const mirrorConfig: ScreenConfig = {
        id: screenId || 'mirror',
        name: screenName,
        ip: '0.0.0.0',
        queueId: 'mirror',
        status: 'ONLINE',
        queue: {
          id: 'mirror',
          name: queueFilter || 'TODAS',
          distribution: 'MIRROR',
        },
        appearance: {
          ...defaultAppearance,
          ...(backendAppearance || {}),
          screenName,
        },
        preference: defaultPreference,
        keyboard: defaultKeyboard,
      };

      setConfig(mirrorConfig);
      setInitialized(true);
    };

    initializeConfig();
  }, [initialized, screenId, screenFilter, queueFilter, setConfig, loadAppearanceFromBackend]);

  // Iniciar modo mirror
  useMirrorMode(
    initialized
      ? {
          token,
          screenFilter,
          queueFilter,
          refreshInterval: 2000,
        }
      : null
  );

  // Loading
  if (isLoading || !initialized || loadingAppearance) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">
            {loadingAppearance ? 'Cargando apariencia...' : 'Conectando al mirror...'}
          </p>
          <p className="text-gray-600 text-sm mt-2">
            {screenFilter && `Pantalla: ${screenFilter}`}
            {queueFilter && `Cola: ${queueFilter}`}
          </p>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Error de Mirror</h1>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            className="mt-4 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
            onClick={() => window.location.reload()}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const appearance = config?.appearance || defaultAppearance;

  // Mostrar pantalla de standby si está apagada
  if (isStandby) {
    return (
      <div className="h-screen flex flex-col">
        {/* Barra superior incluso en standby para poder encender */}
        <div className="bg-gray-800 text-gray-400 text-center py-1 text-sm font-medium">
          MIRROR - STANDBY | Presiona G+I para encender
        </div>
        <StandbyScreen />
      </div>
    );
  }

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{
        backgroundColor: appearance.backgroundColor,
        color: appearance.textColor,
        fontFamily: appearance.fontFamily,
      }}
    >
      {/* Indicador de modo mirror con controles */}
      <div className={`${simulationMode ? 'bg-green-600' : 'bg-purple-600'} text-white text-center py-1 text-sm font-medium flex items-center justify-center relative`}>
        <span>
          {simulationMode ? '🎮 MODO SIMULACIÓN' : '👁️ SOLO LECTURA'}
          {screenFilter && ` | Pantalla: ${screenFilter}`}
          {queueFilter && ` | Cola: ${queueFilter}`}
          {lastAction && ` | ${lastAction}`}
        </span>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2">
          <button
            onClick={() => setSimulationMode(!simulationMode)}
            className={`${simulationMode ? 'bg-green-700 hover:bg-green-800' : 'bg-purple-700 hover:bg-purple-800'} px-3 py-0.5 rounded text-xs font-medium`}
            title="F2 para alternar"
          >
            {simulationMode ? '✓ Simulación' : '○ Solo lectura'}
          </button>
          <button
            onClick={() => setConfigPanelOpen(true)}
            className="bg-gray-700 hover:bg-gray-800 px-3 py-0.5 rounded text-xs font-medium flex items-center gap-1"
            title="Configuracion local"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Config
          </button>
        </div>
      </div>

      <Header />
      <OrderGrid />
      <Footer />

      {/* Panel de configuracion local */}
      <MirrorConfigPanel
        isOpen={configPanelOpen}
        onClose={() => setConfigPanelOpen(false)}
      />

      {/* Panel de debug de botonera - Toggle con F1 */}
      {showKeyLog && (
        <div className="fixed bottom-4 left-4 bg-black/90 text-white p-4 rounded-lg shadow-xl z-50 min-w-64">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-bold text-purple-400">Debug Botonera (F1 para cerrar)</h3>
            <button
              onClick={() => setShowKeyLog(false)}
              className="text-gray-400 hover:text-white"
            >
              ×
            </button>
          </div>
          <div className="text-xs font-mono space-y-1 max-h-48 overflow-y-auto">
            {keyLog.length === 0 ? (
              <p className="text-gray-500">Presiona teclas para ver el log...</p>
            ) : (
              keyLog.map((log, i) => (
                <div key={i} className="text-green-400">{log}</div>
              ))
            )}
          </div>
          <div className="mt-2 pt-2 border-t border-gray-700 text-xs text-gray-400">
            <p>Teclas activas: ← → Home End 1-5</p>
            <p className="text-yellow-400">Solo lectura - No afecta producción</p>
          </div>
        </div>
      )}

      {/* Indicador sutil de debug disponible */}
      {!showKeyLog && (
        <div className="fixed bottom-2 left-2 text-xs text-gray-600 opacity-50">
          F1 = Debug botonera
        </div>
      )}
    </div>
  );
}
