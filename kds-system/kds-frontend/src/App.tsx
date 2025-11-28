import { Header } from './components/Header';
import { OrderGrid } from './components/OrderGrid';
import { Footer } from './components/Footer';
import { StandbyScreen } from './components/StandbyScreen';
import { useWebSocket } from './hooks/useWebSocket';
import { useKeyboardController } from './hooks/useKeyboard';
import { useConfigStore, useAppearance } from './store/configStore';
import { useIsStandby } from './store/screenStore';

// Obtener configuración desde URL params o variables de entorno
function getScreenConfig() {
  const params = new URLSearchParams(window.location.search);
  return {
    screenId: params.get('screenId') || import.meta.env.VITE_SCREEN_ID || '',
    apiKey: params.get('apiKey') || import.meta.env.VITE_API_KEY || '',
  };
}

function App() {
  const { screenId, apiKey } = getScreenConfig();
  const { isLoading, error } = useConfigStore();
  const isStandby = useIsStandby();
  const appearance = useAppearance();

  // Inicializar WebSocket
  useWebSocket(screenId, apiKey);

  // Inicializar controlador de teclado/botonera
  useKeyboardController();

  // Si no hay configuración de pantalla
  if (!screenId || !apiKey) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">
            Configuracion requerida
          </h1>
          <p className="text-gray-400 mb-4">
            Proporcione screenId y apiKey como parametros URL:
          </p>
          <code className="bg-gray-800 text-green-400 px-4 py-2 rounded block">
            ?screenId=xxx&apiKey=yyy
          </code>
          <p className="text-gray-500 mt-4 text-sm">
            O configure las variables de entorno VITE_SCREEN_ID y VITE_API_KEY
          </p>
        </div>
      </div>
    );
  }

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Conectando...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Error</h1>
          <p className="text-gray-400">{error}</p>
          <button
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            onClick={() => window.location.reload()}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Standby mode
  if (isStandby) {
    return <StandbyScreen />;
  }

  // Main view
  const backgroundColor = appearance?.backgroundColor || '#f0f2f5';
  const textColor = appearance?.textColor || '#1a1a2e';

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{
        backgroundColor,
        color: textColor,
        fontFamily: appearance?.fontFamily || 'Inter, sans-serif',
      }}
    >
      <Header />
      <OrderGrid />
      <Footer />
    </div>
  );
}

export default App;
