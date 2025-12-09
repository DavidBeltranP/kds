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
  Radio,
  Typography,
  Slider,
  Tooltip,
  Steps,
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
  DatabaseOutlined,
  LinkOutlined,
  UserOutlined,
  LockOutlined,
  FieldTimeOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined,
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
  mxpHost: string;
  mxpPort?: number;
  mxpUser: string;
  mxpPassword?: string;
  mxpDatabase: string;
  pollingInterval: number;
  lastPollTime?: string | null;
  lastOrderId?: string | null;
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
  const [testingMxpConnection, setTestingMxpConnection] = useState(false);
  const [mxpConnectionResult, setMxpConnectionResult] = useState<{ success: boolean; message: string } | null>(null);
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

  const handleTestMxpConnection = async () => {
    try {
      const values = await mxpForm.validateFields();
      setTestingMxpConnection(true);
      setMxpConnectionResult(null);

      const { data } = await configApi.testMxpConnection({
        mxpHost: values.mxpHost,
        mxpPort: values.mxpPort,
        mxpUser: values.mxpUser,
        mxpPassword: values.mxpPassword,
        mxpDatabase: values.mxpDatabase,
      });

      setMxpConnectionResult(data);

      if (data.success) {
        message.success('Conexion exitosa con MAXPOINT');
      } else {
        message.error(data.message);
      }
    } catch (error) {
      setMxpConnectionResult({
        success: false,
        message: 'Error al probar conexion',
      });
      message.error('Error probando conexion');
    } finally {
      setTestingMxpConnection(false);
    }
  };

  // Convertir milisegundos a segundos para el slider
  const pollingIntervalToSeconds = (ms: number) => Math.round(ms / 1000);
  const secondsToPollingInterval = (seconds: number) => seconds * 1000;

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
                {/* Polling Status - Compacto arriba */}
                <Card
                  size="small"
                  style={{ marginBottom: 16 }}
                >
                  <Row gutter={16} align="middle">
                    <Col flex="auto">
                      <Space size="large">
                        <Space>
                          <span style={{
                            display: 'inline-block',
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            backgroundColor: pollingStatus?.isRunning ? '#52c41a' : '#ff4d4f',
                            animation: pollingStatus?.isRunning ? 'pulse 2s infinite' : 'none',
                          }} />
                          <Text strong>
                            Polling: {pollingStatus?.isRunning ? 'Activo' : 'Detenido'}
                          </Text>
                        </Space>
                        <Divider type="vertical" />
                        <Text type="secondary">
                          Consultas: {pollingStatus?.pollCount || 0}
                        </Text>
                        <Divider type="vertical" />
                        <Text type={pollingStatus?.errorCount ? 'danger' : 'secondary'}>
                          Errores: {pollingStatus?.errorCount || 0}
                        </Text>
                        <Divider type="vertical" />
                        <Text type="secondary">
                          Ultima: {pollingStatus?.lastPoll
                            ? new Date(pollingStatus.lastPoll).toLocaleTimeString()
                            : '-'}
                        </Text>
                      </Space>
                    </Col>
                    <Col>
                      <Space>
                        {pollingStatus?.isRunning ? (
                          <Button
                            icon={<PauseCircleOutlined />}
                            onClick={handleStopPolling}
                            danger
                            size="small"
                          >
                            Detener
                          </Button>
                        ) : (
                          <Button
                            icon={<PlayCircleOutlined />}
                            onClick={handleStartPolling}
                            type="primary"
                            size="small"
                          >
                            Iniciar
                          </Button>
                        )}
                        <Tooltip title="Forzar consulta inmediata">
                          <Button
                            icon={<SyncOutlined />}
                            onClick={handleForcePoll}
                            disabled={!pollingStatus?.isRunning}
                            size="small"
                          />
                        </Tooltip>
                      </Space>
                    </Col>
                  </Row>
                  {pollingStatus?.lastError && (
                    <Alert
                      type="error"
                      message={pollingStatus.lastError}
                      style={{ marginTop: 12 }}
                      showIcon
                      banner
                    />
                  )}
                </Card>

                {/* MXP Config - Mejorado */}
                <Card
                  title={
                    <Space>
                      <DatabaseOutlined />
                      <span>Configuracion de Base de Datos MAXPOINT</span>
                    </Space>
                  }
                  extra={
                    <Space>
                      <Button
                        icon={testingMxpConnection ? <LoadingOutlined /> : <LinkOutlined />}
                        onClick={handleTestMxpConnection}
                        loading={testingMxpConnection}
                      >
                        Probar Conexion
                      </Button>
                      <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        onClick={handleSaveMxp}
                      >
                        Guardar
                      </Button>
                    </Space>
                  }
                  loading={loading}
                >
                  <Form form={mxpForm} layout="vertical">
                    {/* Resultado de prueba de conexión */}
                    {mxpConnectionResult && (
                      <Alert
                        type={mxpConnectionResult.success ? 'success' : 'error'}
                        message={mxpConnectionResult.success ? 'Conexion Exitosa' : 'Error de Conexion'}
                        description={mxpConnectionResult.message}
                        style={{ marginBottom: 24 }}
                        showIcon
                        closable
                        onClose={() => setMxpConnectionResult(null)}
                      />
                    )}

                    {/* Guía visual con Steps */}
                    <Steps
                      size="small"
                      style={{ marginBottom: 24 }}
                      items={[
                        {
                          title: 'Servidor',
                          status: mxpForm.getFieldValue('mxpHost') ? 'finish' : 'wait',
                          icon: <CloudServerOutlined />,
                        },
                        {
                          title: 'Credenciales',
                          status: mxpForm.getFieldValue('mxpUser') ? 'finish' : 'wait',
                          icon: <UserOutlined />,
                        },
                        {
                          title: 'Base de Datos',
                          status: mxpForm.getFieldValue('mxpDatabase') ? 'finish' : 'wait',
                          icon: <DatabaseOutlined />,
                        },
                        {
                          title: 'Verificar',
                          status: mxpConnectionResult?.success ? 'finish' : 'wait',
                          icon: mxpConnectionResult?.success ? <CheckCircleOutlined /> : <LinkOutlined />,
                        },
                      ]}
                    />

                    <Row gutter={24}>
                      {/* Columna izquierda - Conexión */}
                      <Col xs={24} lg={14}>
                        <Card
                          size="small"
                          title={<><CloudServerOutlined /> Servidor SQL Server</>}
                          style={{ marginBottom: 16 }}
                        >
                          <Row gutter={12}>
                            <Col span={16}>
                              <Form.Item
                                name="mxpHost"
                                label="Direccion IP o Hostname"
                                rules={[
                                  { required: true, message: 'Requerido' },
                                ]}
                                extra={
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    Ej: 192.168.1.100 o servidor.local
                                  </Text>
                                }
                              >
                                <Input
                                  placeholder="192.168.1.100"
                                  prefix={<CloudServerOutlined style={{ color: '#1890ff' }} />}
                                />
                              </Form.Item>
                            </Col>
                            <Col span={8}>
                              <Form.Item
                                name="mxpPort"
                                label="Puerto"
                                extra={
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    Vacio = 1433
                                  </Text>
                                }
                              >
                                <InputNumber
                                  placeholder="1433"
                                  min={1}
                                  max={65535}
                                  style={{ width: '100%' }}
                                />
                              </Form.Item>
                            </Col>
                          </Row>
                        </Card>

                        <Card
                          size="small"
                          title={<><UserOutlined /> Credenciales</>}
                          style={{ marginBottom: 16 }}
                        >
                          <Row gutter={12}>
                            <Col span={12}>
                              <Form.Item
                                name="mxpUser"
                                label="Usuario"
                                rules={[{ required: true, message: 'Requerido' }]}
                              >
                                <Input
                                  placeholder="sa"
                                  prefix={<UserOutlined style={{ color: '#1890ff' }} />}
                                />
                              </Form.Item>
                            </Col>
                            <Col span={12}>
                              <Form.Item
                                name="mxpPassword"
                                label="Contrasena"
                                extra={
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    Dejar vacio para mantener la actual
                                  </Text>
                                }
                              >
                                <Input.Password
                                  placeholder="••••••••"
                                  prefix={<LockOutlined style={{ color: '#1890ff' }} />}
                                />
                              </Form.Item>
                            </Col>
                          </Row>
                        </Card>

                        <Card
                          size="small"
                          title={<><DatabaseOutlined /> Base de Datos</>}
                        >
                          <Form.Item
                            name="mxpDatabase"
                            label="Nombre de la Base de Datos"
                            rules={[{ required: true, message: 'Requerido' }]}
                            extra={
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                Normalmente es "MAXPOINT" o similar
                              </Text>
                            }
                          >
                            <Input
                              placeholder="MAXPOINT"
                              prefix={<DatabaseOutlined style={{ color: '#1890ff' }} />}
                            />
                          </Form.Item>
                        </Card>
                      </Col>

                      {/* Columna derecha - Opciones y Estado */}
                      <Col xs={24} lg={10}>
                        <Card
                          size="small"
                          title={<><FieldTimeOutlined /> Frecuencia de Consulta</>}
                          style={{ marginBottom: 16 }}
                        >
                          <Form.Item
                            name="pollingInterval"
                            label={
                              <Space>
                                <span>Consultar cada</span>
                                <Tag color="blue">
                                  {pollingIntervalToSeconds(mxpForm.getFieldValue('pollingInterval') || 2000)} seg
                                </Tag>
                              </Space>
                            }
                            extra={
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                Valores bajos = mas rapido pero mas carga en el servidor
                              </Text>
                            }
                            getValueProps={(value) => ({ value: pollingIntervalToSeconds(value || 2000) })}
                            normalize={(value) => secondsToPollingInterval(value)}
                          >
                            <Slider
                              min={1}
                              max={30}
                              marks={{
                                1: '1s',
                                5: '5s',
                                10: '10s',
                                20: '20s',
                                30: '30s',
                              }}
                              tooltip={{
                                formatter: (value) => `${value} segundos`,
                              }}
                            />
                          </Form.Item>
                        </Card>

                        <Card
                          size="small"
                          title="Estado de Conexion"
                          style={{ marginBottom: 16 }}
                        >
                          <Descriptions column={1} size="small">
                            <Descriptions.Item label="Estado">
                              <Tag
                                color={healthStatus?.mxp ? 'success' : 'error'}
                                icon={healthStatus?.mxp ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                              >
                                {healthStatus?.mxp ? 'Conectado' : 'Sin conexion'}
                              </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Ultimo poll exitoso">
                              {mxpConfig?.lastPollTime
                                ? new Date(mxpConfig.lastPollTime).toLocaleString()
                                : 'Nunca'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Ultima orden">
                              {mxpConfig?.lastOrderId || 'N/A'}
                            </Descriptions.Item>
                          </Descriptions>
                        </Card>

                        <Alert
                          type="info"
                          message="Requisitos de Conexion"
                          description={
                            <ul style={{ margin: '8px 0 0 0', paddingLeft: 16, fontSize: 12 }}>
                              <li>SQL Server debe permitir conexiones remotas</li>
                              <li>Puerto 1433 (o configurado) abierto en firewall</li>
                              <li>Usuario con permisos de lectura</li>
                            </ul>
                          }
                          showIcon
                          icon={<ExclamationCircleOutlined />}
                        />
                      </Col>
                    </Row>
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
