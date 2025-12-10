import { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Form,
  InputNumber,
  ColorPicker,
  message,
  Space,
  Typography,
  Tag,
  Select,
  Spin,
  Alert,
} from 'antd';
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import { screensApi } from '../services/api';
import type { Color } from 'antd/es/color-picker';

const { Title, Text } = Typography;

interface Screen {
  id: string;
  number: number;
  name: string;
  queue?: { name: string };
  appearance?: {
    id: string;
    cardColors: CardColor[];
  };
}

interface CardColor {
  id: string;
  color: string;
  minutes: string;
  order: number;
  isFullBackground: boolean;
}

interface SLAConfig {
  onTime: { minutes: number; seconds: number; color: string };
  caution: { minutes: number; seconds: number; color: string };
  late: { minutes: number; seconds: number; color: string };
}

const DEFAULT_SLA: SLAConfig = {
  onTime: { minutes: 3, seconds: 0, color: '#98c530' },
  caution: { minutes: 5, seconds: 0, color: '#fddf58' },
  late: { minutes: 6, seconds: 0, color: '#e75646' },
};

export function SLA() {
  const [screens, setScreens] = useState<Screen[]>([]);
  const [selectedScreenId, setSelectedScreenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadScreens();
  }, []);

  const loadScreens = async () => {
    try {
      setLoading(true);
      const { data } = await screensApi.getAll();
      setScreens(data);
      if (data.length > 0 && !selectedScreenId) {
        setSelectedScreenId(data[0].id);
        loadSLAForScreen(data[0]);
      }
    } catch (error) {
      message.error('Error al cargar pantallas');
    } finally {
      setLoading(false);
    }
  };

  const loadSLAForScreen = (screen: Screen) => {
    const cardColors = screen.appearance?.cardColors || [];

    // Ordenar por orden
    const sorted = [...cardColors].sort((a, b) => a.order - b.order);

    // Convertir a formato SLA (3 rangos)
    const sla: SLAConfig = { ...DEFAULT_SLA };

    if (sorted.length >= 1) {
      const [mins, secs] = sorted[0].minutes.split(':').map(Number);
      sla.onTime = { minutes: mins, seconds: secs || 0, color: sorted[0].color };
    }
    if (sorted.length >= 2) {
      const [mins, secs] = sorted[1].minutes.split(':').map(Number);
      sla.caution = { minutes: mins, seconds: secs || 0, color: sorted[1].color };
    }
    if (sorted.length >= 3) {
      const [mins, secs] = sorted[2].minutes.split(':').map(Number);
      sla.late = { minutes: mins, seconds: secs || 0, color: sorted[2].color };
    }

    form.setFieldsValue({
      onTimeMinutes: sla.onTime.minutes,
      onTimeSeconds: sla.onTime.seconds,
      onTimeColor: sla.onTime.color,
      cautionMinutes: sla.caution.minutes,
      cautionSeconds: sla.caution.seconds,
      cautionColor: sla.caution.color,
      lateMinutes: sla.late.minutes,
      lateSeconds: sla.late.seconds,
      lateColor: sla.late.color,
    });
  };

  const handleScreenChange = (screenId: string) => {
    setSelectedScreenId(screenId);
    const screen = screens.find(s => s.id === screenId);
    if (screen) {
      loadSLAForScreen(screen);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const screen = screens.find(s => s.id === selectedScreenId);
      if (!screen) return;

      // Convertir colores si vienen como objeto Color de antd
      const getColorString = (color: string | Color): string => {
        if (typeof color === 'string') return color;
        return color.toHexString();
      };

      // Crear los 3 CardColors
      const cardColors = [
        {
          minutes: `${String(values.onTimeMinutes).padStart(2, '0')}:${String(values.onTimeSeconds || 0).padStart(2, '0')}`,
          color: getColorString(values.onTimeColor),
          order: 1,
          isFullBackground: false,
        },
        {
          minutes: `${String(values.cautionMinutes).padStart(2, '0')}:${String(values.cautionSeconds || 0).padStart(2, '0')}`,
          color: getColorString(values.cautionColor),
          order: 2,
          isFullBackground: false,
        },
        {
          minutes: `${String(values.lateMinutes).padStart(2, '0')}:${String(values.lateSeconds || 0).padStart(2, '0')}`,
          color: getColorString(values.lateColor),
          order: 3,
          isFullBackground: true,
        },
      ];

      // Actualizar appearance de la pantalla
      await screensApi.updateAppearance(screen.id, {
        cardColors,
      });

      message.success('SLA guardado correctamente');
      loadScreens();
    } catch (error) {
      message.error('Error al guardar SLA');
    } finally {
      setSaving(false);
    }
  };

  const selectedScreen = screens.find(s => s.id === selectedScreenId);

  // Datos para la tabla de preview
  const previewData = [
    {
      key: 'onTime',
      name: 'A tiempo',
      description: 'Orden dentro del tiempo esperado',
      field: 'onTime',
    },
    {
      key: 'caution',
      name: 'Precaucion',
      description: 'Orden cerca del limite',
      field: 'caution',
    },
    {
      key: 'late',
      name: 'Fuera de tiempo',
      description: 'Orden retrasada',
      field: 'late',
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>Configuracion de SLA</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadScreens}>
            Actualizar
          </Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
            Guardar
          </Button>
        </Space>
      </div>

      <Alert
        message="Los SLAs definen los colores de las tarjetas segun el tiempo transcurrido"
        description="Configura los umbrales de tiempo y colores para cada estado. El color 'Fuera de tiempo' pintara toda la tarjeta."
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Card title="Seleccionar Pantalla" style={{ marginBottom: 24 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Select
            style={{ width: 300 }}
            value={selectedScreenId}
            onChange={handleScreenChange}
            placeholder="Selecciona una pantalla"
          >
            {screens.map(screen => (
              <Select.Option key={screen.id} value={screen.id}>
                {screen.name} (#{screen.number}) - Cola: {screen.queue?.name || 'Sin cola'}
              </Select.Option>
            ))}
          </Select>
          {selectedScreen && (
            <Text type="secondary">
              Cola asignada: <Tag color="blue">{selectedScreen.queue?.name || 'Ninguna'}</Tag>
            </Text>
          )}
        </Space>
      </Card>

      <Card title="Rangos de Tiempo">
        <Form form={form} layout="vertical">
          <Table
            dataSource={previewData}
            pagination={false}
            columns={[
              {
                title: 'Estado',
                dataIndex: 'name',
                key: 'name',
                width: 150,
                render: (name: string, record) => {
                  const colorField = `${record.field}Color`;
                  const color = form.getFieldValue(colorField) || DEFAULT_SLA[record.field as keyof SLAConfig].color;
                  const colorStr = typeof color === 'string' ? color : color?.toHexString?.() || '#98c530';
                  return (
                    <Tag
                      color={colorStr}
                      style={{
                        color: record.field === 'onTime' ? '#000' : '#fff',
                        fontWeight: 'bold',
                        padding: '4px 12px',
                      }}
                    >
                      {name}
                    </Tag>
                  );
                },
              },
              {
                title: 'Descripcion',
                dataIndex: 'description',
                key: 'description',
                width: 250,
              },
              {
                title: 'Tiempo (desde)',
                key: 'time',
                width: 280,
                render: (_, record) => (
                  <Space size="middle">
                    <Space.Compact>
                      <Form.Item
                        name={`${record.field}Minutes`}
                        noStyle
                        rules={[{ required: true }]}
                      >
                        <InputNumber
                          min={0}
                          max={99}
                          style={{ width: 80, textAlign: 'center' }}
                          placeholder="00"
                          controls={false}
                        />
                      </Form.Item>
                      <Button disabled style={{ pointerEvents: 'none', padding: '0 8px' }}>min</Button>
                    </Space.Compact>
                    <span style={{ fontSize: 18, fontWeight: 'bold' }}>:</span>
                    <Space.Compact>
                      <Form.Item
                        name={`${record.field}Seconds`}
                        noStyle
                      >
                        <InputNumber
                          min={0}
                          max={59}
                          style={{ width: 80, textAlign: 'center' }}
                          placeholder="00"
                          controls={false}
                        />
                      </Form.Item>
                      <Button disabled style={{ pointerEvents: 'none', padding: '0 8px' }}>seg</Button>
                    </Space.Compact>
                  </Space>
                ),
              },
              {
                title: 'Color',
                key: 'color',
                width: 120,
                render: (_, record) => (
                  <Form.Item
                    name={`${record.field}Color`}
                    noStyle
                    rules={[{ required: true }]}
                  >
                    <ColorPicker format="hex" />
                  </Form.Item>
                ),
              },
            ]}
          />
        </Form>

        <div style={{ marginTop: 24, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
          <Title level={5}>Como funciona:</Title>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li><strong>A tiempo:</strong> Se aplica cuando el timer es menor al umbral de "Precaucion"</li>
            <li><strong>Precaucion:</strong> Se aplica cuando el timer supera este umbral pero es menor a "Fuera de tiempo"</li>
            <li><strong>Fuera de tiempo:</strong> Se aplica cuando el timer supera este umbral (pinta toda la tarjeta)</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
