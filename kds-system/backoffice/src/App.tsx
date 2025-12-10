import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme, Spin } from 'antd';
import esES from 'antd/locale/es_ES';
import { useAuthStore } from './store/authStore';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Screens } from './pages/Screens';
import { Queues } from './pages/Queues';
import { Orders } from './pages/Orders';
import { Appearance } from './pages/Appearance';
import { Settings } from './pages/Settings';
import { Users } from './pages/Users';
import { TestScreen } from './pages/TestScreen';
import { SLA } from './pages/SLA';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

// Componente para proteger rutas por rol
function RoleRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles: string[];
}) {
  const { user } = useAuthStore();

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { checkAuth, isLoading } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: '#f0f2f5',
        }}
      >
        <Spin size="large" tip="Cargando..." />
      </div>
    );
  }

  return (
    <ConfigProvider
      locale={esES}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
        },
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route
              path="screens"
              element={
                <RoleRoute allowedRoles={['ADMIN', 'OPERATOR']}>
                  <Screens />
                </RoleRoute>
              }
            />
            <Route
              path="queues"
              element={
                <RoleRoute allowedRoles={['ADMIN']}>
                  <Queues />
                </RoleRoute>
              }
            />
            <Route
              path="orders"
              element={
                <RoleRoute allowedRoles={['ADMIN', 'OPERATOR']}>
                  <Orders />
                </RoleRoute>
              }
            />
            <Route
              path="appearance"
              element={
                <RoleRoute allowedRoles={['ADMIN', 'OPERATOR']}>
                  <Appearance />
                </RoleRoute>
              }
            />
            <Route
              path="sla"
              element={
                <RoleRoute allowedRoles={['ADMIN', 'OPERATOR']}>
                  <SLA />
                </RoleRoute>
              }
            />
            <Route
              path="settings"
              element={
                <RoleRoute allowedRoles={['ADMIN']}>
                  <Settings />
                </RoleRoute>
              }
            />
            <Route
              path="users"
              element={
                <RoleRoute allowedRoles={['ADMIN']}>
                  <Users />
                </RoleRoute>
              }
            />
          </Route>
          {/* Ruta fullscreen para probar pantalla KDS con datos reales */}
          <Route
            path="/test-screen/:screenId"
            element={
              <PrivateRoute>
                <TestScreen />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
