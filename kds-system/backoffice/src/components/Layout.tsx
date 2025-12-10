import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout as AntLayout, Menu, Button, Avatar, Dropdown, theme, Switch, Tooltip, Space, Badge, Modal, Form, Input, InputNumber, message } from 'antd';
import type { MenuProps } from 'antd';
import {
  DashboardOutlined,
  DesktopOutlined,
  UnorderedListOutlined,
  BgColorsOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  OrderedListOutlined,
  TeamOutlined,
  ApiOutlined,
  DisconnectOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../store/authStore';
import { useTestModeStore } from '../store/testModeStore';

const { Header, Sider, Content } = AntLayout;

export function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { token } = theme.useToken();

  const {
    isTestMode,
    isConnected,
    isConnecting,
    savedConnection,
    connectionError,
    enableTestMode,
    disableTestMode,
    connect,
  } = useTestModeStore();

  const isAdmin = user?.role === 'ADMIN';
  const isOperator = user?.role === 'OPERATOR';
  const isViewer = user?.role === 'VIEWER';

  // Manejar toggle de modo prueba
  const handleTestModeToggle = async (checked: boolean) => {
    if (checked) {
      if (savedConnection) {
        const success = await enableTestMode();
        if (success) {
          message.success('Modo prueba activado - Conectado a SQL Server del local');
        } else {
          message.error(connectionError || 'Error al conectar');
          setConfigModalOpen(true);
        }
      } else {
        setConfigModalOpen(true);
      }
    } else {
      await disableTestMode();
      message.info('Modo prueba desactivado');
    }
  };

  // Guardar configuración y conectar
  const handleConfigSave = async () => {
    try {
      const values = await form.validateFields();
      const success = await connect({
        host: values.host,
        port: values.port || 1433,
        user: values.user,
        password: values.password,
        database: values.database,
      });

      if (success) {
        message.success('Conectado exitosamente');
        setConfigModalOpen(false);
      } else {
        message.error(connectionError || 'Error al conectar');
      }
    } catch {
      // Validación falló
    }
  };

  // Menu items filtrados por rol
  const menuItems: MenuProps['items'] = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    // Solo ADMIN y OPERATOR pueden ver Pantallas
    ...(isAdmin || isOperator
      ? [
          {
            key: '/screens',
            icon: <DesktopOutlined />,
            label: 'Pantallas',
          },
        ]
      : []),
    // Solo ADMIN puede ver Colas
    ...(isAdmin
      ? [
          {
            key: '/queues',
            icon: <UnorderedListOutlined />,
            label: 'Colas',
          },
        ]
      : []),
    // Solo ADMIN y OPERATOR pueden ver Ordenes
    ...(isAdmin || isOperator
      ? [
          {
            key: '/orders',
            icon: <OrderedListOutlined />,
            label: 'Ordenes',
          },
        ]
      : []),
    // Divider solo si no es VIEWER
    ...(!isViewer ? [{ type: 'divider' as const }] : []),
    // Solo ADMIN y OPERATOR pueden ver Apariencia
    ...(isAdmin || isOperator
      ? [
          {
            key: '/appearance',
            icon: <BgColorsOutlined />,
            label: 'Apariencia',
          },
        ]
      : []),
    // Solo ADMIN y OPERATOR pueden ver SLA
    ...(isAdmin || isOperator
      ? [
          {
            key: '/sla',
            icon: <ClockCircleOutlined />,
            label: 'SLA',
          },
        ]
      : []),
    // Solo ADMIN puede ver Configuracion
    ...(isAdmin
      ? [
          {
            key: '/settings',
            icon: <SettingOutlined />,
            label: 'Configuracion',
          },
        ]
      : []),
    // Solo ADMIN puede ver Usuarios
    ...(isAdmin
      ? [
          {
            key: '/users',
            icon: <TeamOutlined />,
            label: 'Usuarios',
          },
        ]
      : []),
  ];

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: user?.email,
      disabled: true,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Cerrar Sesion',
      danger: true,
      onClick: () => {
        logout();
        navigate('/login');
      },
    },
  ];

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        style={{
          background: token.colorBgContainer,
          borderRight: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: collapsed ? 16 : 20,
              fontWeight: 'bold',
              color: token.colorPrimary,
            }}
          >
            {collapsed ? 'KDS' : 'KDS Backoffice'}
          </h1>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <AntLayout>
        <Header
          style={{
            padding: '0 24px',
            background: isTestMode && isConnected ? '#fff7e6' : token.colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${isTestMode && isConnected ? '#ffd591' : token.colorBorderSecondary}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
            />

            {/* Indicador de Modo Prueba */}
            {isTestMode && isConnected && (
              <Badge
                status="processing"
                text={
                  <span style={{ color: '#d48806', fontWeight: 'bold' }}>
                    MODO PRUEBA ACTIVO
                  </span>
                }
              />
            )}
          </div>

          <Space size="middle">
            {/* Toggle de Modo Prueba - Solo para ADMIN */}
            {isAdmin && (
              <Tooltip
                title={
                  isTestMode && isConnected
                    ? 'Desactivar modo prueba'
                    : savedConnection
                    ? 'Activar modo prueba (datos reales del local)'
                    : 'Configurar conexión primero'
                }
              >
                <Space>
                  <span style={{ fontSize: 12, color: token.colorTextSecondary }}>
                    Modo Prueba
                  </span>
                  <Switch
                    checked={isTestMode && isConnected}
                    loading={isConnecting}
                    onChange={handleTestModeToggle}
                    checkedChildren={<ApiOutlined />}
                    unCheckedChildren={<DisconnectOutlined />}
                  />
                  {!savedConnection && (
                    <Button
                      size="small"
                      type="link"
                      onClick={() => setConfigModalOpen(true)}
                    >
                      Configurar
                    </Button>
                  )}
                </Space>
              </Tooltip>
            )}

            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Button type="text" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar size="small" icon={<UserOutlined />} />
                {!collapsed && <span>{user?.email}</span>}
              </Button>
            </Dropdown>
          </Space>
        </Header>
        <Content
          style={{
            margin: 24,
            padding: 24,
            background: token.colorBgContainer,
            borderRadius: token.borderRadiusLG,
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Content>
      </AntLayout>

      {/* Modal de configuración de conexión */}
      <Modal
        title="Configurar Conexión SQL Server"
        open={configModalOpen}
        onCancel={() => setConfigModalOpen(false)}
        onOk={handleConfigSave}
        okText="Conectar"
        cancelText="Cancelar"
        confirmLoading={isConnecting}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            host: savedConnection?.host || '',
            port: savedConnection?.port || 1433,
            user: savedConnection?.user || '',
            password: savedConnection?.password || '',
            database: savedConnection?.database || 'KDS2',
          }}
        >
          <Form.Item
            name="host"
            label="Host / IP"
            rules={[{ required: true, message: 'Ingrese el host' }]}
          >
            <Input placeholder="192.168.1.100" />
          </Form.Item>
          <Form.Item name="port" label="Puerto">
            <InputNumber style={{ width: '100%' }} min={1} max={65535} />
          </Form.Item>
          <Form.Item
            name="user"
            label="Usuario"
            rules={[{ required: true, message: 'Ingrese el usuario' }]}
          >
            <Input placeholder="sa" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Contraseña"
            rules={[{ required: true, message: 'Ingrese la contraseña' }]}
          >
            <Input.Password placeholder="********" />
          </Form.Item>
          <Form.Item
            name="database"
            label="Base de datos"
            rules={[{ required: true, message: 'Ingrese la base de datos' }]}
          >
            <Input placeholder="KDS2" />
          </Form.Item>
        </Form>
        {connectionError && (
          <div style={{ color: '#ff4d4f', marginTop: 8 }}>
            Error: {connectionError}
          </div>
        )}
      </Modal>
    </AntLayout>
  );
}
