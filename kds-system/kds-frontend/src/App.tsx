import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { OrderGrid } from './components/OrderGrid';
import { Footer } from './components/Footer';
import { StandbyScreen } from './components/StandbyScreen';
import { useWebSocket } from './hooks/useWebSocket';
import { useKeyboardController } from './hooks/useKeyboard';
import { useConfigStore, useAppearance } from './store/configStore';
import { useIsStandby } from './store/screenStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface ScreenConfig {
  screenId: string;
  apiKey: string;
  screenNumber: number;
  screenName: string;
}

// Componente que muestra la pantalla KDS
function KDSScreen({ screenId, apiKey }: { screenId: string; apiKey: string }) {
  const { isLoading, error } = useConfigStore();
  const isStandby = useIsStandby();
  const appearance = useAppearance();

  // Inicializar WebSocket
  useWebSocket(screenId, apiKey);

  // Inicializar controlador de teclado/botonera
  useKeyboardController();

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

// Componente que carga la configuración por número de pantalla
function KDSLoader() {
  const { number } = useParams<{ number: string }>();
  const [config, setConfig] = useState<ScreenConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadScreenConfig() {
      if (!number) {
        setError('Numero de pantalla no especificado');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/screens/by-number/${number}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError(`Pantalla ${number} no encontrada`);
          } else {
            setError('Error al cargar configuracion de pantalla');
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        setConfig({
          screenId: data.screenId,
          apiKey: data.apiKey,
          screenNumber: data.screenNumber,
          screenName: data.screenName,
        });
        setLoading(false);
      } catch (err) {
        console.error('Error loading screen config:', err);
        setError('Error de conexion con el servidor');
        setLoading(false);
      }
    }

    loadScreenConfig();
  }, [number]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Cargando KDS {number}...</p>
        </div>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Error</h1>
          <p className="text-gray-400 mb-4">{error || 'Configuracion no disponible'}</p>
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

  return <KDSScreen screenId={config.screenId} apiKey={config.apiKey} />;
}

// Pantalla de selección cuando no se especifica número
function ScreenSelector() {
  const [screens, setScreens] = useState<Array<{ number: number; name: string; status: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadScreens() {
      try {
        // Intentar cargar pantallas del 1 al 10
        const screenPromises = [];
        for (let i = 1; i <= 10; i++) {
          screenPromises.push(
            fetch(`${API_URL}/api/screens/by-number/${i}`)
              .then(res => res.ok ? res.json() : null)
              .catch(() => null)
          );
        }

        const results = await Promise.all(screenPromises);
        const validScreens = results
          .filter(s => s !== null)
          .map(s => ({
            number: s.screenNumber,
            name: s.screenName,
            status: s.status,
          }));

        setScreens(validScreens);
      } catch (err) {
        console.error('Error loading screens:', err);
      }
      setLoading(false);
    }

    loadScreens();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Cargando pantallas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-8">
      <div className="text-center max-w-4xl">
        <h1 className="text-4xl font-bold text-white mb-8">KDS - Kitchen Display System</h1>

        {screens.length > 0 ? (
          <>
            <p className="text-gray-400 mb-8">Seleccione una pantalla:</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {screens.map((screen) => (
                <a
                  key={screen.number}
                  href={`/kds${screen.number}`}
                  className={`
                    p-6 rounded-lg border-2 transition-all
                    ${screen.status === 'ONLINE'
                      ? 'border-green-500 bg-green-500/10 hover:bg-green-500/20'
                      : 'border-gray-600 bg-gray-800 hover:bg-gray-700'}
                  `}
                >
                  <div className="text-2xl font-bold text-white mb-2">
                    KDS {screen.number}
                  </div>
                  <div className="text-sm text-gray-400">{screen.name}</div>
                  <div className={`text-xs mt-2 ${screen.status === 'ONLINE' ? 'text-green-400' : 'text-gray-500'}`}>
                    {screen.status}
                  </div>
                </a>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="text-gray-400 mb-4">No hay pantallas configuradas.</p>
            <p className="text-gray-500 text-sm">
              Configure las pantallas en el backoffice o use una URL directa:
            </p>
            <code className="bg-gray-800 text-green-400 px-4 py-2 rounded block mt-4">
              /kds1, /kds2, /kds3...
            </code>
          </>
        )}

        <div className="mt-12 text-gray-600 text-sm">
          <p>URLs disponibles:</p>
          <code className="text-gray-500">/kds1 /kds2 /kds3 ...</code>
        </div>
      </div>
    </div>
  );
}

// Componente App con Router
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta principal - selector de pantallas */}
        <Route path="/" element={<ScreenSelector />} />

        {/* Rutas para cada pantalla: /kds1, /kds2, etc. */}
        <Route path="/kds:number" element={<KDSLoader />} />

        {/* Fallback para rutas no encontradas */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
