import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout as AntLayout, Menu, Button, Avatar, Dropdown, theme } from 'antd';
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
  EyeOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../store/authStore';

const { Header, Sider, Content } = AntLayout;

export function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { token } = theme.useToken();

  const isAdmin = user?.role === 'ADMIN';
  const isOperator = user?.role === 'OPERATOR';
  const isViewer = user?.role === 'VIEWER';

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
    // Solo ADMIN puede ver Mirror
    ...(isAdmin
      ? [
          { type: 'divider' as const },
          {
            key: '/mirror',
            icon: <EyeOutlined />,
            label: 'Mirror KDS',
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
            background: token.colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Button type="text" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar size="small" icon={<UserOutlined />} />
              {!collapsed && <span>{user?.email}</span>}
            </Button>
          </Dropdown>
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
    </AntLayout>
  );
}
