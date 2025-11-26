import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuthStore } from '../store/authStore';

export function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, error, isAuthenticated } = useAuthStore();

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    const success = await login(values.email, values.password);
    setLoading(false);

    if (success) {
      message.success('Bienvenido');
      navigate('/');
    } else {
      message.error(error || 'Credenciales invalidas');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      }}
    >
      <Card
        style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
        title={
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ margin: 0, fontSize: 24 }}>KDS Backoffice</h1>
            <p style={{ margin: '8px 0 0', color: '#888', fontSize: 14 }}>
              Panel de Administracion
            </p>
          </div>
        }
      >
        <Form
          name="login"
          onFinish={onFinish}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Ingrese su email' },
              { type: 'email', message: 'Email invalido' },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Email"
              autoComplete="email"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Ingrese su contraseña' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Contraseña"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{ height: 45 }}
            >
              Iniciar Sesion
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', color: '#888', fontSize: 12 }}>
          KDS v2.0.0
        </div>
      </Card>
    </div>
  );
}
