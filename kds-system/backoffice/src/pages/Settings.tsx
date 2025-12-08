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
  Radio,
  Typography,
} from 'antd';
import {
  SaveOutlined,
  ReloadOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ApiOutlined,
  PrinterOutlined,
  CloudServerOutlined,
  DesktopOutlined,
} from '@ant-design/icons';
import { configApi } from '../services/api';

const { Text } = Typography;

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
  ticketMode?: string;
}

interface HealthStatus {
  database: boolean;
  redis: boolean;
  mxp: boolean;
  websocket: boolean;
}

interface ConfigModes {
  ticketMode: 'POLLING' | 'API';
  printMode: 'LOCAL' | 'CENTRALIZED';
  centralizedPrintUrl: string;
  centralizedPrintPort: number;
}

export function Settings() {
  const [loading, setLoading] = useState(true);
  const [_generalConfig, setGeneralConfig] = useState<GeneralConfig | null>(null);
  const [mxpConfig, setMxpConfig] = useState<MxpConfig | null>(null);
  const [pollingStatus, setPollingStatus] = useState<PollingStatus | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [configModes, setConfigModes] = useState<ConfigModes | null>(null);
  const [testingCentralized, setTestingCentralized] = useState(false);
  const [generalForm] = Form.useForm();
  const [mxpForm] = Form.useForm();
  const [modesForm] = Form.useForm();

  useEffect(() => {
    loadConfig();
    const interval = setInterval(loadPollingStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const [generalRes, mxpRes, pollingRes, healthRes, modesRes] = await Promise.all([
        configApi.getGeneral(),
        configApi.getMxp(),
        configApi.getPollingStatus(),
        configApi.health(),
        configApi.getModes(),
      ]);

      setGeneralConfig(generalRes.data);
      setMxpConfig(mxpRes.data);
      setPollingStatus(pollingRes.data);
      setHealthStatus(healthRes.data);
      setConfigModes(modesRes.data);

      generalForm.setFieldsValue(generalRes.data);
      mxpForm.setFieldsValue(mxpRes.data);
      modesForm.setFieldsValue(modesRes.data);
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

  const handleSaveModes = async () => {
    try {
      const values = await modesForm.validateFields();
      await configApi.updateModes(values);
      message.success('Modos de configuracion guardados');
      loadConfig();
    } catch (error) {
      message.error('Error guardando modos de configuracion');
    }
  };

  const handleTestCentralizedPrint = async () => {
    try {
      setTestingCentralized(true);
      const { data } = await configApi.testCentralizedPrint();
      if (data.success) {
        message.success(`Conexion exitosa: ${data.message}`);
      } else {
        message.error(`Error de conexion: ${data.message}`);
      }
    } catch (error) {
      message.error('Error probando conexion');
    } finally {
      setTestingCentralized(false);
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
            key: 'modes',
            label: 'Modos',
            children: (
              <Card
                title="Modos de Configuracion"
                extra={
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={handleSaveModes}
                  >
                    Guardar
                  </Button>
                }
                loading={loading}
              >
                <Form form={modesForm} layout="vertical" style={{ maxWidth: 800 }}>
                  <Alert
                    type="info"
                    message="Configuracion de Modos"
                    description="Seleccione como el sistema obtendra los tickets y como realizara la impresion."
                    style={{ marginBottom: 24 }}
                  />

                  <Divider orientation="left">
                    <ApiOutlined /> Modo de Tickets
                  </Divider>

                  <Form.Item
                    name="ticketMode"
                    label="Origen de Tickets"
                    extra="Define como el sistema obtiene las comandas/ordenes."
                  >
                    <Radio.Group>
                      <Space direction="vertical">
                        <Radio value="POLLING">
                          <Space>
                            <DesktopOutlined />
                            <Text strong>POLLING (MAXPOINT)</Text>
                          </Space>
                          <br />
                          <Text type="secondary" style={{ marginLeft: 24 }}>
                            El sistema consulta periodicamente la base de datos MAXPOINT para obtener nuevas ordenes.
                          </Text>
                        </Radio>
                        <Radio value="API">
                          <Space>
                            <ApiOutlined />
                            <Text strong>API (Recepcion via HTTP)</Text>
                          </Space>
                          <br />
                          <Text type="secondary" style={{ marginLeft: 24 }}>
                            Las ordenes son enviadas al sistema via API REST. Compatible con integraciones externas.
                          </Text>
                        </Radio>
                      </Space>
                    </Radio.Group>
                  </Form.Item>

                  {configModes?.ticketMode === 'API' && (
                    <Alert
                      type="warning"
                      message="Modo API Activo"
                      description={
                        <div>
                          <p>El polling desde MAXPOINT esta deshabilitado. Las ordenes deben enviarse via:</p>
                          <ul>
                            <li><code>POST /api/tickets/receive</code> - Una orden individual</li>
                            <li><code>POST /api/tickets/receive-batch</code> - Multiples ordenes</li>
                            <li><code>POST /api/comandas</code> - Compatible con sistema anterior</li>
                          </ul>
                        </div>
                      }
                      style={{ marginBottom: 16 }}
                    />
                  )}

                  <Divider orientation="left">
                    <PrinterOutlined /> Modo de Impresion
                  </Divider>

                  <Form.Item
                    name="printMode"
                    label="Metodo de Impresion"
                    extra="Define como el sistema enviara los tickets a las impresoras."
                  >
                    <Radio.Group>
                      <Space direction="vertical">
                        <Radio value="LOCAL">
                          <Space>
                            <PrinterOutlined />
                            <Text strong>LOCAL (TCP Directo)</Text>
                          </Space>
                          <br />
                          <Text type="secondary" style={{ marginLeft: 24 }}>
                            El backend envia directamente a la impresora via TCP/IP (ESC/POS).
                          </Text>
                        </Radio>
                        <Radio value="CENTRALIZED">
                          <Space>
                            <CloudServerOutlined />
                            <Text strong>CENTRALIZADO (Servicio HTTP)</Text>
                          </Space>
                          <br />
                          <Text type="secondary" style={{ marginLeft: 24 }}>
                            Las ordenes se envian a un servicio centralizado de impresion via HTTP.
                          </Text>
                        </Radio>
                      </Space>
                    </Radio.Group>
                  </Form.Item>

                  <Form.Item noStyle shouldUpdate={(prev, curr) => prev.printMode !== curr.printMode}>
                    {({ getFieldValue }) =>
                      getFieldValue('printMode') === 'CENTRALIZED' && (
                        <Card size="small" style={{ marginBottom: 16, backgroundColor: '#fafafa' }}>
                          <Row gutter={16}>
                            <Col span={16}>
                              <Form.Item
                                name="centralizedPrintUrl"
                                label="URL del Servicio de Impresion"
                                rules={[{ required: true, message: 'Ingrese la URL del servicio' }]}
                              >
                                <Input
                                  placeholder="http://192.168.1.100:5000/api/ImpresionTickets/Impresion"
                                  addonBefore={<CloudServerOutlined />}
                                />
                              </Form.Item>
                            </Col>
                            <Col span={8}>
                              <Form.Item
                                name="centralizedPrintPort"
                                label="Puerto"
                              >
                                <InputNumber
                                  min={1}
                                  max={65535}
                                  style={{ width: '100%' }}
                                  placeholder="5000"
                                />
                              </Form.Item>
                            </Col>
                          </Row>
                          <Button
                            onClick={handleTestCentralizedPrint}
                            loading={testingCentralized}
                            icon={<SyncOutlined />}
                          >
                            Probar Conexion
                          </Button>
                        </Card>
                      )
                    }
                  </Form.Item>

                  <Divider />

                  <Alert
                    type="success"
                    message="Estado Actual"
                    description={
                      <Descriptions column={2} size="small">
                        <Descriptions.Item label="Modo de Tickets">
                          <Tag color={configModes?.ticketMode === 'POLLING' ? 'blue' : 'green'}>
                            {configModes?.ticketMode || 'POLLING'}
                          </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Modo de Impresion">
                          <Tag color={configModes?.printMode === 'LOCAL' ? 'blue' : 'purple'}>
                            {configModes?.printMode || 'LOCAL'}
                          </Tag>
                        </Descriptions.Item>
                      </Descriptions>
                    }
                  />
                </Form>
              </Card>
            ),
          },
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
