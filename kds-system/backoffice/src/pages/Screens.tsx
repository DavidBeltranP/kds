import { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  Space,
  message,
  Popconfirm,
  Tabs,
  InputNumber,
  ColorPicker,
  Switch,
  Descriptions,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  DesktopOutlined,
  PoweroffOutlined,
  KeyOutlined,
  PrinterOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { screensApi, queuesApi } from '../services/api';
import { io } from 'socket.io-client';

interface Queue {
  id: string;
  name: string;
}

interface Screen {
  id: string;
  number: number;
  name: string;
  queueId: string;
  queueName: string;
  status: 'ONLINE' | 'OFFLINE' | 'STANDBY';
  apiKey: string;
  lastHeartbeat: string | null;
  printer: {
    name: string;
    ip: string;
    port: number;
    enabled: boolean;
  } | null;
  appearance: {
    backgroundColor: string;
    headerColor: string;
    cardColor: string;
    textColor: string;
    accentColor: string;
    fontSize: string;
    columns: number;
    rows: number;
    showTimer: boolean;
    showOrderNumber: boolean;
    animationEnabled: boolean;
  };
  keyboardConfig: {
    enabled: boolean;
    finishKey: string;
    nextPageKey: string;
    prevPageKey: string;
    standbyCombo: string[];
    standbyHoldTime: number;
  };
}

export function Screens() {
  const [screens, setScreens] = useState<Screen[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [printerModalOpen, setPrinterModalOpen] = useState(false);
  const [editingScreen, setEditingScreen] = useState<Screen | null>(null);
  const [selectedScreen, setSelectedScreen] = useState<Screen | null>(null);
  const [selectedPrinterScreen, setSelectedPrinterScreen] = useState<Screen | null>(null);
  const [testingPrinter, setTestingPrinter] = useState(false);
  const [form] = Form.useForm();
  const [appearanceForm] = Form.useForm();
  const [keyboardForm] = Form.useForm();
  const [printerForm] = Form.useForm();

  useEffect(() => {
    loadData();

    // Conectar WebSocket para recibir cambios de estado en tiempo real
    const socketUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';
    const socket = io(socketUrl, {
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('[Backoffice] WebSocket conectado');
      socket.emit('backoffice:join');
    });

    // Escuchar cambios de estado de pantallas
    socket.on('screen:statusChanged', (data: { screenId: string; status: string }) => {
      console.log('[Backoffice] Screen status changed:', data);
      setScreens(prev => prev.map(screen =>
        screen.id === data.screenId
          ? { ...screen, status: data.status as Screen['status'] }
          : screen
      ));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [screensRes, queuesRes] = await Promise.all([
        screensApi.getAll(),
        queuesApi.getAll(),
      ]);
      setScreens(screensRes.data);
      setQueues(queuesRes.data);
    } catch (error) {
      message.error('Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingScreen(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleEdit = (screen: Screen) => {
    setEditingScreen(screen);
    form.setFieldsValue({
      name: screen.name,
      queueId: screen.queueId,
    });
    setModalOpen(true);
  };

  const handleConfigure = async (screen: Screen) => {
    try {
      const { data } = await screensApi.getConfig(screen.id);
      setSelectedScreen(data);
      appearanceForm.setFieldsValue(data.appearance);
      // Cargar keyboardConfig y agregar touchEnabled/botoneraEnabled desde preference
      keyboardForm.setFieldsValue({
        ...data.keyboardConfig,
        touchEnabled: data.preference?.touchEnabled ?? false,
        enabled: data.preference?.botoneraEnabled ?? true, // Botonera habilitada por defecto
      });
      setConfigModalOpen(true);
    } catch (error) {
      message.error('Error cargando configuracion');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (editingScreen) {
        await screensApi.update(editingScreen.id, values);
        message.success('Pantalla actualizada');
      } else {
        await screensApi.create(values);
        message.success('Pantalla creada');
      }

      setModalOpen(false);
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Error guardando pantalla');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await screensApi.delete(id);
      message.success('Pantalla eliminada');
      loadData();
    } catch (error) {
      message.error('Error eliminando pantalla');
    }
  };

  const handleToggleStandby = async (screen: Screen) => {
    try {
      if (screen.status === 'STANDBY') {
        await screensApi.activate(screen.id);
        message.success('Pantalla activada');
      } else {
        await screensApi.setStandby(screen.id);
        message.success('Pantalla en standby');
      }
      loadData();
    } catch (error) {
      message.error('Error cambiando estado');
    }
  };

  const handleRegenerateKey = async (id: string) => {
    try {
      const { data } = await screensApi.regenerateKey(id);
      message.success(`Nueva API Key: ${data.apiKey}`);
      loadData();
    } catch (error) {
      message.error('Error regenerando API key');
    }
  };

  const handleSaveAppearance = async () => {
    if (!selectedScreen) return;
    try {
      const values = await appearanceForm.validateFields();
      await screensApi.updateAppearance(selectedScreen.id, values);
      message.success('Apariencia guardada');
    } catch (error) {
      message.error('Error guardando apariencia');
    }
  };

  const handleSaveKeyboard = async () => {
    if (!selectedScreen) return;
    try {
      const values = await keyboardForm.validateFields();
      const { touchEnabled, enabled, ...keyboardValues } = values;

      // Guardar configuración de teclado
      await screensApi.updateKeyboard(selectedScreen.id, keyboardValues);

      // Guardar touchEnabled y botoneraEnabled en preferencias
      await screensApi.updatePreference(selectedScreen.id, {
        touchEnabled,
        botoneraEnabled: enabled
      });

      message.success('Configuracion guardada');
    } catch (error) {
      message.error('Error guardando configuracion');
    }
  };

  const handleOpenPrinterModal = (screen: Screen) => {
    setSelectedPrinterScreen(screen);
    if (screen.printer) {
      printerForm.setFieldsValue({
        name: screen.printer.name,
        ip: screen.printer.ip,
        port: screen.printer.port,
        enabled: screen.printer.enabled,
      });
    } else {
      printerForm.resetFields();
      printerForm.setFieldsValue({ enabled: true, port: 9100 });
    }
    setPrinterModalOpen(true);
  };

  const handleSavePrinter = async () => {
    if (!selectedPrinterScreen) return;
    try {
      const values = await printerForm.validateFields();
      await screensApi.updatePrinter(selectedPrinterScreen.id, values);
      message.success('Impresora configurada correctamente');
      setPrinterModalOpen(false);
      loadData();
    } catch (error) {
      message.error('Error configurando impresora');
    }
  };

  const handleDeletePrinter = async () => {
    if (!selectedPrinterScreen) return;
    try {
      await screensApi.deletePrinter(selectedPrinterScreen.id);
      message.success('Impresora eliminada');
      setPrinterModalOpen(false);
      loadData();
    } catch (error) {
      message.error('Error eliminando impresora');
    }
  };

  const handleTestPrinter = async () => {
    if (!selectedPrinterScreen) return;
    setTestingPrinter(true);
    try {
      await screensApi.testPrinter(selectedPrinterScreen.id);
      message.success('Conexión exitosa con la impresora');
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error probando conexión');
    } finally {
      setTestingPrinter(false);
    }
  };

  const getStatusTag = (status: string) => {
    const colors: Record<string, string> = {
      ONLINE: 'green',
      OFFLINE: 'red',
      STANDBY: 'orange',
    };
    return <Tag color={colors[status] || 'default'}>{status}</Tag>;
  };

  const columns = [
    {
      title: 'Nombre',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Screen) => (
        <Space>
          <DesktopOutlined />
          {name}
          {record.status === 'STANDBY' && <Tag color="orange">STANDBY</Tag>}
        </Space>
      ),
    },
    {
      title: 'URL',
      dataIndex: 'number',
      key: 'number',
      width: 100,
      render: (number: number) => (
        <Tag color="blue">/kds/{number}</Tag>
      ),
    },
    { title: 'Cola', dataIndex: 'queueName', key: 'queueName' },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'Impresora',
      dataIndex: 'printer',
      key: 'printer',
      render: (printer: Screen['printer']) => {
        if (!printer) {
          return <Tag color="default">Sin impresora</Tag>;
        }
        return (
          <Space direction="vertical" size={0}>
            <Space>
              <PrinterOutlined />
              <span>{printer.name}</span>
              {printer.enabled ? (
                <Tag color="green">Activa</Tag>
              ) : (
                <Tag color="red">Deshabilitada</Tag>
              )}
            </Space>
            <span style={{ fontSize: '12px', color: '#888' }}>
              {printer.ip}:{printer.port}
            </span>
          </Space>
        );
      },
    },
    {
      title: 'Ultimo Heartbeat',
      dataIndex: 'lastHeartbeat',
      key: 'lastHeartbeat',
      render: (date: string | null) =>
        date ? new Date(date).toLocaleString() : '-',
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 200,
      render: (_: any, record: Screen) => (
        <Space size="small">
          <Tooltip title="Editar">
            <Button
              icon={<EditOutlined />}
              size="small"
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="Configurar">
            <Button
              icon={<SettingOutlined />}
              size="small"
              onClick={() => handleConfigure(record)}
            />
          </Tooltip>
          <Tooltip title="Impresora">
            <Button
              icon={<PrinterOutlined />}
              size="small"
              onClick={() => handleOpenPrinterModal(record)}
            />
          </Tooltip>
          <Tooltip title={record.status === 'STANDBY' ? 'Activar' : 'Standby'}>
            <Button
              icon={<PoweroffOutlined />}
              size="small"
              onClick={() => handleToggleStandby(record)}
              danger={record.status !== 'STANDBY'}
              type={record.status === 'STANDBY' ? 'primary' : 'default'}
            />
          </Tooltip>
          <Popconfirm
            title="Eliminar pantalla?"
            onConfirm={() => handleDelete(record.id)}
          >
            <Tooltip title="Eliminar">
              <Button icon={<DeleteOutlined />} size="small" danger />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="Gestion de Pantallas"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadData}>
              Actualizar
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              Nueva Pantalla
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={screens}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      </Card>

      {/* Modal Crear/Editar Pantalla */}
      <Modal
        title={editingScreen ? 'Editar Pantalla' : 'Nueva Pantalla'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        okText="Guardar"
        cancelText="Cancelar"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Nombre"
            rules={[{ required: true, message: 'Ingrese el nombre' }]}
          >
            <Input placeholder="Pantalla 1" />
          </Form.Item>
          <Form.Item
            name="queueId"
            label="Cola"
            rules={[{ required: true, message: 'Seleccione la cola' }]}
          >
            <Select placeholder="Seleccione cola">
              {queues.map((q) => (
                <Select.Option key={q.id} value={q.id}>
                  {q.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          {editingScreen && (
            <Form.Item label="API Key">
              <Space>
                <Input value={editingScreen.apiKey} disabled style={{ width: 300 }} />
                <Popconfirm
                  title="Regenerar API Key? La anterior dejara de funcionar."
                  onConfirm={() => handleRegenerateKey(editingScreen.id)}
                >
                  <Button icon={<KeyOutlined />}>Regenerar</Button>
                </Popconfirm>
              </Space>
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* Modal Configuracion Pantalla */}
      <Modal
        title={`Configuracion: ${selectedScreen?.name}`}
        open={configModalOpen}
        onCancel={() => setConfigModalOpen(false)}
        width={800}
        footer={null}
      >
        <Tabs
          items={[
            {
              key: 'appearance',
              label: 'Apariencia',
              children: (
                <Form form={appearanceForm} layout="vertical">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <Form.Item name="backgroundColor" label="Color de Fondo">
                      <ColorPicker format="hex" showText />
                    </Form.Item>
                    <Form.Item name="headerColor" label="Color de Cabecera">
                      <ColorPicker format="hex" showText />
                    </Form.Item>
                    <Form.Item name="cardColor" label="Color de Tarjeta">
                      <ColorPicker format="hex" showText />
                    </Form.Item>
                    <Form.Item name="textColor" label="Color de Texto">
                      <ColorPicker format="hex" showText />
                    </Form.Item>
                    <Form.Item name="accentColor" label="Color de Acento">
                      <ColorPicker format="hex" showText />
                    </Form.Item>
                    <Form.Item name="fontSize" label="Tamano de Fuente">
                      <Select>
                        <Select.Option value="small">Pequeno</Select.Option>
                        <Select.Option value="medium">Mediano</Select.Option>
                        <Select.Option value="large">Grande</Select.Option>
                      </Select>
                    </Form.Item>
                    <Form.Item name="columns" label="Columnas">
                      <InputNumber min={1} max={6} />
                    </Form.Item>
                    <Form.Item name="rows" label="Filas">
                      <InputNumber min={1} max={6} />
                    </Form.Item>
                    <Form.Item name="showTimer" label="Mostrar Timer" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                    <Form.Item name="showOrderNumber" label="Mostrar # Orden" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                    <Form.Item name="animationEnabled" label="Animaciones" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                  </div>
                  <Button type="primary" onClick={handleSaveAppearance}>
                    Guardar Apariencia
                  </Button>
                </Form>
              ),
            },
            {
              key: 'keyboard',
              label: 'Entrada',
              children: (
                <Form form={keyboardForm} layout="vertical">
                  <Descriptions column={1} style={{ marginBottom: 16 }}>
                    <Descriptions.Item label="Metodos de Entrada">
                      Configure como los operadores interactuan con la pantalla:
                      via botonera fisica o pantalla tactil.
                    </Descriptions.Item>
                  </Descriptions>

                  <Card size="small" title="Pantalla Tactil" style={{ marginBottom: 16 }}>
                    <Form.Item
                      name="touchEnabled"
                      label="Habilitar Touch"
                      valuePropName="checked"
                      tooltip="Permite finalizar ordenes tocando la tarjeta en pantalla"
                    >
                      <Switch />
                    </Form.Item>
                  </Card>

                  <Card size="small" title="Botonera Fisica">
                    <Form.Item name="enabled" label="Habilitado" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <Form.Item name="finishKey" label="Tecla Finalizar">
                        <Input placeholder="1" maxLength={1} />
                      </Form.Item>
                      <Form.Item name="nextPageKey" label="Tecla Pagina Siguiente">
                        <Input placeholder="3" maxLength={1} />
                      </Form.Item>
                      <Form.Item name="prevPageKey" label="Tecla Pagina Anterior">
                        <Input placeholder="h" maxLength={1} />
                      </Form.Item>
                      <Form.Item name="standbyHoldTime" label="Tiempo Standby (ms)">
                        <InputNumber min={1000} max={10000} step={500} />
                      </Form.Item>
                    </div>
                    <Form.Item name="standbyCombo" label="Combo Standby (teclas separadas por coma)">
                      <Input placeholder="i,g" />
                    </Form.Item>
                    <Descriptions column={1} size="small">
                      <Descriptions.Item label="Nota">
                        El combo standby (por defecto i+g) activa/desactiva el modo standby.
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>

                  <Button type="primary" onClick={handleSaveKeyboard} style={{ marginTop: 16 }}>
                    Guardar Configuracion
                  </Button>
                </Form>
              ),
            },
            {
              key: 'info',
              label: 'Informacion',
              children: selectedScreen && (
                <Descriptions column={1} bordered>
                  <Descriptions.Item label="ID">{selectedScreen.id}</Descriptions.Item>
                  <Descriptions.Item label="Nombre">{selectedScreen.name}</Descriptions.Item>
                  <Descriptions.Item label="URL">/kds/{selectedScreen.number}</Descriptions.Item>
                  <Descriptions.Item label="Cola">{selectedScreen.queueName}</Descriptions.Item>
                  <Descriptions.Item label="Estado">
                    {getStatusTag(selectedScreen.status)}
                  </Descriptions.Item>
                  <Descriptions.Item label="API Key">
                    <code>{selectedScreen.apiKey}</code>
                  </Descriptions.Item>
                  <Descriptions.Item label="Ultimo Heartbeat">
                    {selectedScreen.lastHeartbeat
                      ? new Date(selectedScreen.lastHeartbeat).toLocaleString()
                      : '-'}
                  </Descriptions.Item>
                </Descriptions>
              ),
            },
          ]}
        />
      </Modal>

      {/* Modal de configuración de impresora */}
      <Modal
        title={
          <Space>
            <PrinterOutlined />
            {selectedPrinterScreen?.printer ? 'Editar Impresora' : 'Configurar Impresora'}
          </Space>
        }
        open={printerModalOpen}
        onCancel={() => setPrinterModalOpen(false)}
        width={600}
        footer={[
          <Button key="cancel" onClick={() => setPrinterModalOpen(false)}>
            Cancelar
          </Button>,
          selectedPrinterScreen?.printer && (
            <Popconfirm
              key="delete"
              title="¿Eliminar configuración de impresora?"
              onConfirm={handleDeletePrinter}
            >
              <Button danger>Eliminar</Button>
            </Popconfirm>
          ),
          <Button
            key="test"
            onClick={handleTestPrinter}
            loading={testingPrinter}
            disabled={!selectedPrinterScreen?.printer}
          >
            Probar Conexión
          </Button>,
          <Button key="save" type="primary" onClick={handleSavePrinter}>
            Guardar
          </Button>,
        ]}
      >
        <Form form={printerForm} layout="vertical">
          <Form.Item
            name="name"
            label="Nombre de la Impresora"
            rules={[{ required: true, message: 'Ingrese el nombre de la impresora' }]}
          >
            <Input placeholder="Ej: Impresora Cocina 1" />
          </Form.Item>

          <Form.Item
            name="ip"
            label="Dirección IP"
            rules={[
              { required: true, message: 'Ingrese la dirección IP' },
              {
                pattern: /^(\d{1,3}\.){3}\d{1,3}$/,
                message: 'Ingrese una IP válida',
              },
            ]}
          >
            <Input placeholder="192.168.1.100" />
          </Form.Item>

          <Form.Item
            name="port"
            label="Puerto"
            rules={[{ required: true, message: 'Ingrese el puerto' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="9100"
              min={1}
              max={65535}
            />
          </Form.Item>

          <Form.Item name="enabled" label="Estado" valuePropName="checked">
            <Switch checkedChildren="Activa" unCheckedChildren="Deshabilitada" />
          </Form.Item>

          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Pantalla">
              {selectedPrinterScreen?.name}
            </Descriptions.Item>
            <Descriptions.Item label="Cola">
              {selectedPrinterScreen?.queueName}
            </Descriptions.Item>
          </Descriptions>
        </Form>
      </Modal>
    </div>
  );
}
