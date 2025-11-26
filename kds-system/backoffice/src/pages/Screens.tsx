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
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  DesktopOutlined,
  PoweroffOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import { screensApi, queuesApi } from '../services/api';

interface Queue {
  id: string;
  name: string;
}

interface Screen {
  id: string;
  name: string;
  ip: string;
  queueId: string;
  queueName: string;
  status: 'ONLINE' | 'OFFLINE' | 'STANDBY';
  apiKey: string;
  lastHeartbeat: string | null;
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
  const [editingScreen, setEditingScreen] = useState<Screen | null>(null);
  const [selectedScreen, setSelectedScreen] = useState<Screen | null>(null);
  const [form] = Form.useForm();
  const [appearanceForm] = Form.useForm();
  const [keyboardForm] = Form.useForm();

  useEffect(() => {
    loadData();
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
      ip: screen.ip,
      queueId: screen.queueId,
    });
    setModalOpen(true);
  };

  const handleConfigure = async (screen: Screen) => {
    try {
      const { data } = await screensApi.getConfig(screen.id);
      setSelectedScreen(data);
      appearanceForm.setFieldsValue(data.appearance);
      keyboardForm.setFieldsValue(data.keyboardConfig);
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
      await screensApi.updateKeyboard(selectedScreen.id, values);
      message.success('Configuracion de teclado guardada');
    } catch (error) {
      message.error('Error guardando configuracion');
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
    { title: 'IP', dataIndex: 'ip', key: 'ip' },
    { title: 'Cola', dataIndex: 'queueName', key: 'queueName' },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
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
      render: (_: any, record: Screen) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEdit(record)}
          />
          <Button
            icon={<DesktopOutlined />}
            size="small"
            onClick={() => handleConfigure(record)}
          >
            Configurar
          </Button>
          <Button
            icon={<PoweroffOutlined />}
            size="small"
            onClick={() => handleToggleStandby(record)}
            danger={record.status !== 'STANDBY'}
          >
            {record.status === 'STANDBY' ? 'Activar' : 'Standby'}
          </Button>
          <Popconfirm
            title="Eliminar pantalla?"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button icon={<DeleteOutlined />} size="small" danger />
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
            name="ip"
            label="Direccion IP"
            rules={[
              { required: true, message: 'Ingrese la IP' },
              {
                pattern: /^(\d{1,3}\.){3}\d{1,3}$/,
                message: 'IP invalida',
              },
            ]}
          >
            <Input placeholder="192.168.1.100" />
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
              label: 'Teclado/Botonera',
              children: (
                <Form form={keyboardForm} layout="vertical">
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
                  <Descriptions column={1} style={{ marginBottom: 16 }}>
                    <Descriptions.Item label="Botonera Fisica">
                      El combo standby (por defecto i+g) activa/desactiva el modo standby
                      cuando se mantiene presionado por el tiempo configurado.
                    </Descriptions.Item>
                  </Descriptions>
                  <Button type="primary" onClick={handleSaveKeyboard}>
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
                  <Descriptions.Item label="IP">{selectedScreen.ip}</Descriptions.Item>
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
    </div>
  );
}
