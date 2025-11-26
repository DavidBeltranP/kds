import { useEffect, useState } from 'react';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Button,
  Switch,
  message,
  Tabs,
  Space,
  Tag,
  Descriptions,
  Alert,
  Divider,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  SaveOutlined,
  ReloadOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { configApi } from '../services/api';

interface GeneralConfig {
  systemName: string;
  timezone: string;
  language: string;
  heartbeatInterval: number;
  heartbeatTimeout: number;
  orderRetentionHours: number;
  enableNotifications: boolean;
  enableSounds: boolean;
}

interface MxpConfig {
  enabled: boolean;
  connectionString: string;
  database: string;
  pollingInterval: number;
  batchSize: number;
  lastPollTime: string | null;
  lastOrderId: string | null;
}

interface PollingStatus {
  isRunning: boolean;
  lastPoll: string | null;
  pollCount: number;
  errorCount: number;
  lastError: string | null;
}

interface HealthStatus {
  database: boolean;
  redis: boolean;
  mxp: boolean;
  websocket: boolean;
}

export function Settings() {
  const [loading, setLoading] = useState(true);
  const [generalConfig, setGeneralConfig] = useState<GeneralConfig | null>(null);
  const [mxpConfig, setMxpConfig] = useState<MxpConfig | null>(null);
  const [pollingStatus, setPollingStatus] = useState<PollingStatus | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [generalForm] = Form.useForm();
  const [mxpForm] = Form.useForm();

  useEffect(() => {
    loadConfig();
    const interval = setInterval(loadPollingStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const [generalRes, mxpRes, pollingRes, healthRes] = await Promise.all([
        configApi.getGeneral(),
        configApi.getMxp(),
        configApi.getPollingStatus(),
        configApi.health(),
      ]);

      setGeneralConfig(generalRes.data);
      setMxpConfig(mxpRes.data);
      setPollingStatus(pollingRes.data);
      setHealthStatus(healthRes.data);

      generalForm.setFieldsValue(generalRes.data);
      mxpForm.setFieldsValue(mxpRes.data);
    } catch (error) {
      message.error('Error cargando configuracion');
    } finally {
      setLoading(false);
    }
  };

  const loadPollingStatus = async () => {
    try {
      const { data } = await configApi.getPollingStatus();
      setPollingStatus(data);
    } catch (error) {
      console.error('Error loading polling status');
    }
  };

  const handleSaveGeneral = async () => {
    try {
      const values = await generalForm.validateFields();
      await configApi.updateGeneral(values);
      message.success('Configuracion general guardada');
      loadConfig();
    } catch (error) {
      message.error('Error guardando configuracion');
    }
  };

  const handleSaveMxp = async () => {
    try {
      const values = await mxpForm.validateFields();
      await configApi.updateMxp(values);
      message.success('Configuracion MXP guardada');
      loadConfig();
    } catch (error) {
      message.error('Error guardando configuracion');
    }
  };

  const handleStartPolling = async () => {
    try {
      await configApi.startPolling();
      message.success('Polling iniciado');
      loadPollingStatus();
    } catch (error) {
      message.error('Error iniciando polling');
    }
  };

  const handleStopPolling = async () => {
    try {
      await configApi.stopPolling();
      message.success('Polling detenido');
      loadPollingStatus();
    } catch (error) {
      message.error('Error deteniendo polling');
    }
  };

  const handleForcePoll = async () => {
    try {
      await configApi.forcePoll();
      message.success('Poll forzado ejecutado');
      loadPollingStatus();
    } catch (error) {
      message.error('Error ejecutando poll');
    }
  };

  const getHealthIcon = (status: boolean) =>
    status ? (
      <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />
    ) : (
      <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />
    );

  return (
    <div>
      <Tabs
        items={[
          {
            key: 'general',
            label: 'General',
            children: (
              <Card
                title="Configuracion General"
                extra={
                  <Space>
                    <Button icon={<ReloadOutlined />} onClick={loadConfig}>
                      Recargar
                    </Button>
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      onClick={handleSaveGeneral}
                    >
                      Guardar
                    </Button>
                  </Space>
                }
                loading={loading}
              >
                <Form form={generalForm} layout="vertical" style={{ maxWidth: 600 }}>
                  <Form.Item
                    name="systemName"
                    label="Nombre del Sistema"
                    rules={[{ required: true }]}
                  >
                    <Input placeholder="KDS v2" />
                  </Form.Item>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item name="timezone" label="Zona Horaria">
                        <Input placeholder="America/Mexico_City" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="language" label="Idioma">
                        <Input placeholder="es" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Divider>Heartbeat</Divider>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="heartbeatInterval"
                        label="Intervalo Heartbeat (ms)"
                        rules={[{ required: true }]}
                      >
                        <InputNumber min={1000} max={60000} step={1000} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="heartbeatTimeout"
                        label="Timeout Heartbeat (ms)"
                        rules={[{ required: true }]}
                      >
                        <InputNumber min={5000} max={120000} step={1000} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Divider>Retencion de Datos</Divider>

                  <Form.Item
                    name="orderRetentionHours"
                    label="Retencion de Ordenes (horas)"
                  >
                    <InputNumber min={1} max={720} style={{ width: 200 }} />
                  </Form.Item>

                  <Divider>Notificaciones</Divider>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="enableNotifications"
                        label="Habilitar Notificaciones"
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="enableSounds"
                        label="Habilitar Sonidos"
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>
                    </Col>
                  </Row>
                </Form>
              </Card>
            ),
          },
          {
            key: 'maxpoint',
            label: 'MAXPOINT',
            children: (
              <div>
                {/* Polling Status */}
                <Card
                  title="Estado del Polling"
                  style={{ marginBottom: 16 }}
                  extra={
                    <Space>
                      {pollingStatus?.isRunning ? (
                        <Button
                          icon={<PauseCircleOutlined />}
                          onClick={handleStopPolling}
                          danger
                        >
                          Detener
                        </Button>
                      ) : (
                        <Button
                          icon={<PlayCircleOutlined />}
                          onClick={handleStartPolling}
                          type="primary"
                        >
                          Iniciar
                        </Button>
                      )}
                      <Button
                        icon={<SyncOutlined />}
                        onClick={handleForcePoll}
                        disabled={!pollingStatus?.isRunning}
                      >
                        Forzar Poll
                      </Button>
                    </Space>
                  }
                >
                  <Row gutter={16}>
                    <Col span={6}>
                      <Statistic
                        title="Estado"
                        value={pollingStatus?.isRunning ? 'Activo' : 'Detenido'}
                        valueStyle={{
                          color: pollingStatus?.isRunning ? '#52c41a' : '#ff4d4f',
                        }}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title="Polls Realizados"
                        value={pollingStatus?.pollCount || 0}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title="Errores"
                        value={pollingStatus?.errorCount || 0}
                        valueStyle={{
                          color: (pollingStatus?.errorCount || 0) > 0 ? '#ff4d4f' : undefined,
                        }}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title="Ultimo Poll"
                        value={
                          pollingStatus?.lastPoll
                            ? new Date(pollingStatus.lastPoll).toLocaleTimeString()
                            : '-'
                        }
                      />
                    </Col>
                  </Row>
                  {pollingStatus?.lastError && (
                    <Alert
                      type="error"
                      message="Ultimo Error"
                      description={pollingStatus.lastError}
                      style={{ marginTop: 16 }}
                    />
                  )}
                </Card>

                {/* MXP Config */}
                <Card
                  title="Configuracion MAXPOINT"
                  extra={
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      onClick={handleSaveMxp}
                    >
                      Guardar
                    </Button>
                  }
                  loading={loading}
                >
                  <Form form={mxpForm} layout="vertical" style={{ maxWidth: 600 }}>
                    <Form.Item
                      name="enabled"
                      label="Habilitado"
                      valuePropName="checked"
                    >
                      <Switch />
                    </Form.Item>

                    <Form.Item
                      name="connectionString"
                      label="Connection String"
                      rules={[{ required: true }]}
                    >
                      <Input.TextArea
                        rows={3}
                        placeholder="Server=192.168.1.100;Database=MAXPOINT;User Id=sa;Password=***;TrustServerCertificate=true"
                      />
                    </Form.Item>

                    <Form.Item name="database" label="Base de Datos">
                      <Input placeholder="MAXPOINT" />
                    </Form.Item>

                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          name="pollingInterval"
                          label="Intervalo Polling (ms)"
                        >
                          <InputNumber
                            min={1000}
                            max={30000}
                            step={500}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="batchSize" label="Batch Size">
                          <InputNumber min={1} max={100} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Divider>Estado Actual</Divider>

                    <Descriptions column={2} size="small">
                      <Descriptions.Item label="Ultimo Poll">
                        {mxpConfig?.lastPollTime
                          ? new Date(mxpConfig.lastPollTime).toLocaleString()
                          : '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Ultima Orden ID">
                        {mxpConfig?.lastOrderId || '-'}
                      </Descriptions.Item>
                    </Descriptions>
                  </Form>
                </Card>
              </div>
            ),
          },
          {
            key: 'health',
            label: 'Estado del Sistema',
            children: (
              <Card
                title="Estado de Servicios"
                extra={
                  <Button icon={<ReloadOutlined />} onClick={loadConfig}>
                    Actualizar
                  </Button>
                }
              >
                <Row gutter={[16, 16]}>
                  <Col span={6}>
                    <Card>
                      <Space direction="vertical" align="center" style={{ width: '100%' }}>
                        {getHealthIcon(healthStatus?.database || false)}
                        <span>Base de Datos</span>
                        <Tag color={healthStatus?.database ? 'green' : 'red'}>
                          {healthStatus?.database ? 'Conectado' : 'Desconectado'}
                        </Tag>
                      </Space>
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Space direction="vertical" align="center" style={{ width: '100%' }}>
                        {getHealthIcon(healthStatus?.redis || false)}
                        <span>Redis</span>
                        <Tag color={healthStatus?.redis ? 'green' : 'red'}>
                          {healthStatus?.redis ? 'Conectado' : 'Desconectado'}
                        </Tag>
                      </Space>
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Space direction="vertical" align="center" style={{ width: '100%' }}>
                        {getHealthIcon(healthStatus?.mxp || false)}
                        <span>MAXPOINT</span>
                        <Tag color={healthStatus?.mxp ? 'green' : 'red'}>
                          {healthStatus?.mxp ? 'Conectado' : 'Desconectado'}
                        </Tag>
                      </Space>
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Space direction="vertical" align="center" style={{ width: '100%' }}>
                        {getHealthIcon(healthStatus?.websocket || false)}
                        <span>WebSocket</span>
                        <Tag color={healthStatus?.websocket ? 'green' : 'red'}>
                          {healthStatus?.websocket ? 'Activo' : 'Inactivo'}
                        </Tag>
                      </Space>
                    </Card>
                  </Col>
                </Row>

                <Divider />

                <Alert
                  type="info"
                  message="Informacion del Sistema"
                  description={
                    <Descriptions column={2} size="small">
                      <Descriptions.Item label="Version">2.0.0</Descriptions.Item>
                      <Descriptions.Item label="Node.js">v20.x</Descriptions.Item>
                      <Descriptions.Item label="Uptime">
                        {new Date().toLocaleString()}
                      </Descriptions.Item>
                      <Descriptions.Item label="Ambiente">
                        {import.meta.env.MODE}
                      </Descriptions.Item>
                    </Descriptions>
                  }
                />
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
