import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Button,
  Space,
  Alert,
  Table,
  Tag,
  Spin,
  Empty,
  Divider,
  Row,
  Col,
  Typography,
  Statistic,
  Badge,
  Select,
  Switch,
  Tooltip,
} from 'antd';
import {
  LinkOutlined,
  DisconnectOutlined,
  ReloadOutlined,
  EyeOutlined,
  DatabaseOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DesktopOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { mirrorApi } from '../services/api';

const { Title, Text } = Typography;

interface MirrorOrder {
  id: string;
  externalId: string;
  identifier: string;
  channel: string;
  customerName?: string;
  status: 'PENDING' | 'FINISHED';
  createdAt: string;
  queue: string;
  screen: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    notes?: string;
    subitems?: Array<{
      name: string;
      quantity: number;
    }>;
  }>;
}

interface MirrorStats {
  connected: boolean;
  ordersOnScreen: number;
  screens: string[];
  queues: string[];
}

export default function Mirror() {
  const [form] = Form.useForm();
  const [connecting, setConnecting] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [stats, setStats] = useState<MirrorStats | null>(null);
  const [orders, setOrders] = useState<MirrorOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [filterScreen, setFilterScreen] = useState<string | undefined>();
  const [filterQueue, setFilterQueue] = useState<string | undefined>();

  // Cargar stats iniciales para ver si ya está conectado
  const checkConnection = useCallback(async () => {
    try {
      const { data } = await mirrorApi.stats();
      if (data.connected) {
        setIsConnected(true);
        setStats(data);
      }
    } catch {
      setIsConnected(false);
    }
  }, []);

  // Cargar órdenes
  const loadOrders = useCallback(async () => {
    if (!isConnected) return;

    setLoadingOrders(true);
    try {
      const { data } = await mirrorApi.getOrders({
        screen: filterScreen,
        queue: filterQueue,
      });
      setOrders(data.orders || []);

      // También actualizar stats
      const statsRes = await mirrorApi.stats();
      setStats(statsRes.data);
    } catch (err) {
      console.error('Error loading orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  }, [isConnected, filterScreen, filterQueue]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh && isConnected) {
      const interval = setInterval(loadOrders, 3000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, isConnected, loadOrders]);

  // Check inicial
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Cargar órdenes cuando se conecte o cambien filtros
  useEffect(() => {
    if (isConnected) {
      loadOrders();
    }
  }, [isConnected, filterScreen, filterQueue, loadOrders]);

  const handleConnect = async (values: any) => {
    setConnecting(true);
    setConnectionResult(null);

    try {
      const { data } = await mirrorApi.configure({
        host: values.host,
        port: values.port || 1433,
        user: values.user,
        password: values.password,
        database: values.database,
      });

      setConnectionResult(data);
      if (data.success) {
        setIsConnected(true);
        // Cargar stats
        const statsRes = await mirrorApi.stats();
        setStats(statsRes.data);
      }
    } catch (err: any) {
      setConnectionResult({
        success: false,
        message: err.response?.data?.message || 'Error de conexión',
      });
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await mirrorApi.disconnect();
      setIsConnected(false);
      setStats(null);
      setOrders([]);
      setConnectionResult(null);
    } catch (err) {
      console.error('Error disconnecting:', err);
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'identifier',
      key: 'identifier',
      width: 100,
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: 'Canal',
      dataIndex: 'channel',
      key: 'channel',
      width: 120,
    },
    {
      title: 'Cliente',
      dataIndex: 'customerName',
      key: 'customerName',
      width: 150,
      render: (text: string) => text || '-',
    },
    {
      title: 'Pantalla',
      dataIndex: 'screen',
      key: 'screen',
      width: 120,
      render: (text: string) => (
        <Tag icon={<DesktopOutlined />} color="purple">
          {text}
        </Tag>
      ),
    },
    {
      title: 'Cola',
      dataIndex: 'queue',
      key: 'queue',
      width: 120,
      render: (text: string) => (
        <Tag icon={<UnorderedListOutlined />} color="cyan">
          {text}
        </Tag>
      ),
    },
    {
      title: 'Items',
      dataIndex: 'items',
      key: 'items',
      render: (items: MirrorOrder['items']) => (
        <Space direction="vertical" size={0}>
          {items.slice(0, 3).map((item, idx) => (
            <Text key={idx} style={{ fontSize: 12 }}>
              {item.quantity}x {item.name}
              {item.subitems && item.subitems.length > 0 && (
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {' '}
                  (+{item.subitems.length} sub)
                </Text>
              )}
            </Text>
          ))}
          {items.length > 3 && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              ... y {items.length - 3} más
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Creado',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date: string) => {
        const d = new Date(date);
        return d.toLocaleTimeString('es-EC', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
      },
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>
        <EyeOutlined /> Mirror KDS - Espejo del Local
      </Title>

      <Alert
        type="info"
        message="Modo Solo Lectura"
        description="Esta función permite ver en tiempo real las órdenes del KDS del local. No modifica ningún dato del sistema original."
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Row gutter={24}>
        {/* Panel de Conexión */}
        <Col xs={24} lg={8}>
          <Card
            title={
              <Space>
                <DatabaseOutlined />
                Conexión a KDS2 del Local
              </Space>
            }
            extra={
              isConnected ? (
                <Badge status="success" text="Conectado" />
              ) : (
                <Badge status="default" text="Desconectado" />
              )
            }
          >
            {!isConnected ? (
              <Form
                form={form}
                layout="vertical"
                onFinish={handleConnect}
                initialValues={{
                  host: '10.101.27.20',
                  port: 1433,
                  user: 'sa',
                  password: 'jcjajplae*88',
                  database: 'KDS2',
                }}
              >
                <Form.Item
                  name="host"
                  label="Servidor"
                  rules={[{ required: true, message: 'Requerido' }]}
                >
                  <Input placeholder="IP o hostname" />
                </Form.Item>

                <Form.Item name="port" label="Puerto">
                  <InputNumber
                    min={1}
                    max={65535}
                    style={{ width: '100%' }}
                    placeholder="1433"
                  />
                </Form.Item>

                <Form.Item
                  name="user"
                  label="Usuario"
                  rules={[{ required: true, message: 'Requerido' }]}
                >
                  <Input placeholder="Usuario SQL" />
                </Form.Item>

                <Form.Item
                  name="password"
                  label="Contraseña"
                  rules={[{ required: true, message: 'Requerido' }]}
                >
                  <Input.Password placeholder="Contraseña" />
                </Form.Item>

                <Form.Item
                  name="database"
                  label="Base de Datos"
                  rules={[{ required: true, message: 'Requerido' }]}
                >
                  <Input placeholder="Nombre de la BD" />
                </Form.Item>

                {connectionResult && (
                  <Alert
                    type={connectionResult.success ? 'success' : 'error'}
                    message={connectionResult.message}
                    style={{ marginBottom: 16 }}
                    showIcon
                    icon={
                      connectionResult.success ? (
                        <CheckCircleOutlined />
                      ) : (
                        <CloseCircleOutlined />
                      )
                    }
                  />
                )}

                <Button
                  type="primary"
                  htmlType="submit"
                  loading={connecting}
                  icon={<LinkOutlined />}
                  block
                >
                  Conectar al Mirror
                </Button>
              </Form>
            ) : (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Alert
                  type="success"
                  message="Conectado al KDS del local"
                  showIcon
                />

                {stats && (
                  <>
                    <Divider />
                    <Row gutter={16}>
                      <Col span={12}>
                        <Statistic
                          title="Órdenes en Pantalla"
                          value={stats.ordersOnScreen}
                          valueStyle={{ color: '#1890ff' }}
                        />
                      </Col>
                      <Col span={12}>
                        <Statistic
                          title="Pantallas"
                          value={stats.screens.length}
                        />
                      </Col>
                    </Row>

                    <Divider />
                    <Text strong>Pantallas:</Text>
                    <div>
                      {stats.screens.map((s) => (
                        <Tag key={s} color="purple">
                          {s}
                        </Tag>
                      ))}
                      {stats.screens.length === 0 && (
                        <Text type="secondary">Sin pantallas activas</Text>
                      )}
                    </div>

                    <Text strong style={{ marginTop: 8, display: 'block' }}>
                      Colas:
                    </Text>
                    <div>
                      {stats.queues.map((q) => (
                        <Tag key={q} color="cyan">
                          {q}
                        </Tag>
                      ))}
                      {stats.queues.length === 0 && (
                        <Text type="secondary">Sin colas activas</Text>
                      )}
                    </div>
                  </>
                )}

                <Divider />
                <Button
                  danger
                  icon={<DisconnectOutlined />}
                  onClick={handleDisconnect}
                  block
                >
                  Desconectar
                </Button>
              </Space>
            )}
          </Card>
        </Col>

        {/* Panel de Órdenes */}
        <Col xs={24} lg={16}>
          <Card
            title={
              <Space>
                <UnorderedListOutlined />
                Órdenes en Pantalla del Local
              </Space>
            }
            extra={
              isConnected && (
                <Space>
                  <Tooltip title="Actualización automática cada 3s">
                    <Switch
                      checked={autoRefresh}
                      onChange={setAutoRefresh}
                      checkedChildren="Auto"
                      unCheckedChildren="Manual"
                    />
                  </Tooltip>
                  <Button
                    icon={<ReloadOutlined spin={loadingOrders} />}
                    onClick={loadOrders}
                    disabled={loadingOrders}
                  >
                    Actualizar
                  </Button>
                </Space>
              )
            }
          >
            {!isConnected ? (
              <Empty
                description="Conecta al KDS del local para ver las órdenes"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <>
                {/* Filtros */}
                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col span={12}>
                    <Select
                      placeholder="Filtrar por pantalla"
                      allowClear
                      style={{ width: '100%' }}
                      value={filterScreen}
                      onChange={setFilterScreen}
                    >
                      {stats?.screens.map((s) => (
                        <Select.Option key={s} value={s}>
                          {s}
                        </Select.Option>
                      ))}
                    </Select>
                  </Col>
                  <Col span={12}>
                    <Select
                      placeholder="Filtrar por cola"
                      allowClear
                      style={{ width: '100%' }}
                      value={filterQueue}
                      onChange={setFilterQueue}
                    >
                      {stats?.queues.map((q) => (
                        <Select.Option key={q} value={q}>
                          {q}
                        </Select.Option>
                      ))}
                    </Select>
                  </Col>
                </Row>

                <Spin spinning={loadingOrders}>
                  <Table
                    dataSource={orders}
                    columns={columns}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                    size="small"
                    locale={{
                      emptyText: (
                        <Empty
                          description="No hay órdenes en pantalla"
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                      ),
                    }}
                  />
                </Spin>
              </>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
