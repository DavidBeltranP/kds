import { useEffect, useState } from 'react';
import {
  Card,
  Form,
  Select,
  InputNumber,
  Button,
  Switch,
  message,
  Row,
  Col,
  ColorPicker,
  Divider,
  Space,
  Alert,
  Collapse,
  Typography,
} from 'antd';
import { SaveOutlined, ReloadOutlined, UndoOutlined, FontColorsOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { screensApi, mirrorApi } from '../services/api';
import { ScreenPreview } from '../components/ScreenPreview';
import type { Color } from 'antd/es/color-picker';

const { Panel } = Collapse;
const { Text } = Typography;

interface Screen {
  id: string;
  name: string;
  number?: number;
}

interface PreviewOrder {
  id: string;
  identifier: string;
  channel: string;
  customerName?: string;
  items: Array<{
    name: string;
    quantity: number;
    modifier?: string;
    notes?: string;
    subitems?: Array<{ name: string; quantity: number }>;
  }>;
  createdAt: Date;
  status: 'PENDING' | 'IN_PROGRESS';
}

interface AppearanceConfig {
  // Colores generales
  backgroundColor: string;
  headerColor: string;
  headerTextColor: string;
  cardColor: string;
  textColor: string;
  accentColor: string;

  // ============================================
  // TIPOGRAFÍA HEADER (Orden #xxx)
  // ============================================
  headerFontFamily: string;
  headerFontSize: string;
  headerFontWeight: string;
  headerFontStyle: string;
  headerBgColor: string;
  headerTextColorCustom: string;
  showHeader: boolean;
  showOrderNumber: boolean;
  headerShowChannel: boolean;
  headerShowTime: boolean;

  // ============================================
  // TIPOGRAFÍA TIMER (00:00)
  // ============================================
  timerFontFamily: string;
  timerFontSize: string;
  timerFontWeight: string;
  timerFontStyle: string;
  timerTextColor: string;
  showTimer: boolean;

  // ============================================
  // TIPOGRAFÍA CLIENTE (nombre)
  // ============================================
  clientFontFamily: string;
  clientFontSize: string;
  clientFontWeight: string;
  clientFontStyle: string;
  clientTextColor: string;
  clientBgColor: string;
  showClient: boolean;

  // ============================================
  // TIPOGRAFÍA CANTIDAD (5x)
  // ============================================
  quantityFontFamily: string;
  quantityFontSize: string;
  quantityFontWeight: string;
  quantityFontStyle: string;
  quantityTextColor: string;
  showQuantity: boolean;

  // ============================================
  // TIPOGRAFÍA PRODUCTOS (nombre del producto)
  // ============================================
  productFontFamily: string;
  productFontSize: string;
  productFontWeight: string;
  productFontStyle: string;
  productTextColor: string;
  productBgColor: string;
  productUppercase: boolean;

  // ============================================
  // TIPOGRAFÍA SUBPRODUCTOS/SUBITEMS
  // ============================================
  subitemFontFamily: string;
  subitemFontSize: string;
  subitemFontWeight: string;
  subitemFontStyle: string;
  subitemTextColor: string;
  subitemBgColor: string;
  subitemIndent: number;
  showSubitems: boolean;

  // ============================================
  // TIPOGRAFÍA MODIFICADORES
  // ============================================
  modifierFontFamily: string;
  modifierFontSize: string;
  modifierFontWeight: string;
  modifierFontStyle: string;
  modifierFontColor: string;
  modifierBgColor: string;
  modifierIndent: number;
  showModifiers: boolean;

  // ============================================
  // TIPOGRAFÍA NOTAS ESPECIALES
  // ============================================
  notesFontFamily: string;
  notesFontSize: string;
  notesFontWeight: string;
  notesFontStyle: string;
  notesTextColor: string;
  notesBgColor: string;
  notesIndent: number;
  showNotes: boolean;

  // ============================================
  // TIPOGRAFÍA CANAL/FOOTER
  // ============================================
  channelFontFamily: string;
  channelFontSize: string;
  channelFontWeight: string;
  channelFontStyle: string;
  channelTextColor: string;
  channelUppercase: boolean;
  showChannel: boolean;

  // Disposicion
  columns: number;

  // Opciones generales
  animationEnabled: boolean;
  screenSplit: boolean;
}

const fontFamilies = [
  { value: 'Inter, sans-serif', label: 'Inter' },
  { value: 'Roboto, sans-serif', label: 'Roboto' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Helvetica, sans-serif', label: 'Helvetica' },
  { value: '"Roboto Mono", monospace', label: 'Roboto Mono' },
  { value: 'monospace', label: 'Monospace' },
  { value: '"Source Code Pro", monospace', label: 'Source Code Pro' },
  { value: '"Open Sans", sans-serif', label: 'Open Sans' },
  { value: 'Montserrat, sans-serif', label: 'Montserrat' },
  { value: '"Segoe UI", sans-serif', label: 'Segoe UI' },
];

const fontSizes = [
  { value: 'xsmall', label: 'Extra Pequeño' },
  { value: 'small', label: 'Pequeño' },
  { value: 'medium', label: 'Mediano' },
  { value: 'large', label: 'Grande' },
  { value: 'xlarge', label: 'Extra Grande' },
  { value: 'xxlarge', label: 'Muy Grande' },
];

const fontWeights = [
  { value: 'normal', label: 'Normal (400)' },
  { value: 'medium', label: 'Medio (500)' },
  { value: 'semibold', label: 'Semi-Bold (600)' },
  { value: 'bold', label: 'Bold (700)' },
];

const fontStyles = [
  { value: 'normal', label: 'Normal' },
  { value: 'italic', label: 'Cursiva' },
];

const defaultConfig: AppearanceConfig = {
  // Colores - tema claro
  backgroundColor: '#f0f2f5',
  headerColor: '#1a1a2e',
  headerTextColor: '#ffffff',
  cardColor: '#ffffff',
  textColor: '#1a1a2e',
  accentColor: '#e94560',

  // Header
  headerFontFamily: 'Inter, sans-serif',
  headerFontSize: 'medium',
  headerFontWeight: 'bold',
  headerFontStyle: 'normal',
  headerBgColor: '',
  headerTextColorCustom: '#ffffff',
  showHeader: true,
  showOrderNumber: true,
  headerShowChannel: true,
  headerShowTime: true,

  // Timer
  timerFontFamily: 'monospace',
  timerFontSize: 'medium',
  timerFontWeight: 'bold',
  timerFontStyle: 'normal',
  timerTextColor: '#ffffff',
  showTimer: true,

  // Cliente
  clientFontFamily: 'Inter, sans-serif',
  clientFontSize: 'small',
  clientFontWeight: 'normal',
  clientFontStyle: 'normal',
  clientTextColor: '#ffffff',
  clientBgColor: '',
  showClient: true,

  // Cantidad
  quantityFontFamily: 'Inter, sans-serif',
  quantityFontSize: 'medium',
  quantityFontWeight: 'bold',
  quantityFontStyle: 'normal',
  quantityTextColor: '',
  showQuantity: true,

  // Producto
  productFontFamily: 'Inter, sans-serif',
  productFontSize: 'medium',
  productFontWeight: 'bold',
  productFontStyle: 'normal',
  productTextColor: '',
  productBgColor: '',
  productUppercase: true,

  // Subitem
  subitemFontFamily: 'Inter, sans-serif',
  subitemFontSize: 'small',
  subitemFontWeight: 'normal',
  subitemFontStyle: 'normal',
  subitemTextColor: '#333333',
  subitemBgColor: '',
  subitemIndent: 24,
  showSubitems: true,

  // Modifier
  modifierFontFamily: 'Inter, sans-serif',
  modifierFontSize: 'small',
  modifierFontWeight: 'normal',
  modifierFontStyle: 'italic',
  modifierFontColor: '#666666',
  modifierBgColor: '',
  modifierIndent: 24,
  showModifiers: true,

  // Notes
  notesFontFamily: 'Inter, sans-serif',
  notesFontSize: 'small',
  notesFontWeight: 'normal',
  notesFontStyle: 'italic',
  notesTextColor: '#ff9800',
  notesBgColor: '',
  notesIndent: 24,
  showNotes: true,

  // Channel
  channelFontFamily: 'Inter, sans-serif',
  channelFontSize: 'small',
  channelFontWeight: 'bold',
  channelFontStyle: 'normal',
  channelTextColor: '#ffffff',
  channelUppercase: true,
  showChannel: true,

  // Disposicion
  columns: 4,

  // Opciones
  animationEnabled: true,
  screenSplit: true,
};

// Componente reutilizable para sección de tipografía
interface TypographySectionProps {
  prefix: string;
  showVisibilityToggle?: boolean;
  showIndent?: boolean;
  showUppercase?: boolean;
  showBgColor?: boolean;
  form: ReturnType<typeof Form.useForm>[0];
}

function TypographySection({
  prefix,
  showVisibilityToggle = true,
  showIndent = false,
  showUppercase = false,
  showBgColor = false,
}: TypographySectionProps) {
  return (
    <div style={{ padding: '12px 0' }}>
      <Row gutter={16}>
        <Col span={6}>
          <Form.Item name={`${prefix}FontFamily`} label="Fuente" style={{ marginBottom: 8 }}>
            <Select size="small">
              {fontFamilies.map((f) => (
                <Select.Option key={f.value} value={f.value}>
                  {f.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={5}>
          <Form.Item name={`${prefix}FontSize`} label="Tamaño" style={{ marginBottom: 8 }}>
            <Select size="small">
              {fontSizes.map((s) => (
                <Select.Option key={s.value} value={s.value}>
                  {s.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={5}>
          <Form.Item name={`${prefix}FontWeight`} label="Peso" style={{ marginBottom: 8 }}>
            <Select size="small">
              {fontWeights.map((w) => (
                <Select.Option key={w.value} value={w.value}>
                  {w.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item name={`${prefix}FontStyle`} label="Estilo" style={{ marginBottom: 8 }}>
            <Select size="small">
              {fontStyles.map((s) => (
                <Select.Option key={s.value} value={s.value}>
                  {s.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item
            name={prefix === 'modifier' ? 'modifierFontColor' : `${prefix}TextColor`}
            label="Color"
            style={{ marginBottom: 8 }}
          >
            <ColorPicker size="small" format="hex" showText />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        {showBgColor && (
          <Col span={6}>
            <Form.Item name={`${prefix}BgColor`} label="Fondo" style={{ marginBottom: 8 }}>
              <ColorPicker size="small" format="hex" showText allowClear />
            </Form.Item>
          </Col>
        )}
        {showIndent && (
          <Col span={6}>
            <Form.Item name={`${prefix}Indent`} label="Indentación (px)" style={{ marginBottom: 8 }}>
              <InputNumber size="small" min={0} max={100} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        )}
        {showUppercase && (
          <Col span={6}>
            <Form.Item
              name={`${prefix}Uppercase`}
              label="Mayúsculas"
              valuePropName="checked"
              style={{ marginBottom: 8 }}
            >
              <Switch size="small" />
            </Form.Item>
          </Col>
        )}
        {showVisibilityToggle && (
          <Col span={6}>
            <Form.Item
              name={prefix === 'header' ? 'showHeader' : `show${prefix.charAt(0).toUpperCase() + prefix.slice(1)}`}
              label="Visible"
              valuePropName="checked"
              style={{ marginBottom: 8 }}
            >
              <Switch
                size="small"
                checkedChildren={<EyeOutlined />}
                unCheckedChildren={<EyeInvisibleOutlined />}
              />
            </Form.Item>
          </Col>
        )}
      </Row>
    </div>
  );
}

export function Appearance() {
  const [screens, setScreens] = useState<Screen[]>([]);
  const [selectedScreenId, setSelectedScreenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<AppearanceConfig>(defaultConfig);
  const [form] = Form.useForm();
  const [mirrorOrders, setMirrorOrders] = useState<PreviewOrder[]>([]);
  const [mirrorConnected, setMirrorConnected] = useState(false);

  useEffect(() => {
    loadScreens();
    checkMirrorStatus();
  }, []);

  useEffect(() => {
    if (selectedScreenId) {
      loadScreenConfig(selectedScreenId);
    }
  }, [selectedScreenId]);

  // Polling de órdenes del Mirror cada 3 segundos
  useEffect(() => {
    if (!mirrorConnected) return;

    const selectedScreen = screens.find(s => s.id === selectedScreenId);
    const screenNumber = selectedScreen?.number;

    const fetchMirrorOrders = async () => {
      try {
        const screenName = screenNumber ? `Pantalla${screenNumber}` : undefined;
        const { data } = await mirrorApi.getOrders({ screen: screenName });
        if (data.success && Array.isArray(data.orders)) {
          const mapped: PreviewOrder[] = data.orders.map((o: { id?: string; externalId?: string; identifier: string; channel: string; customerName?: string; items: Array<{ name: string; quantity: number; modifier?: string; notes?: string; subitems?: Array<{ name: string; quantity: number }> }>; createdAt?: string; status?: string }) => ({
            id: o.id || o.externalId || o.identifier,
            identifier: o.identifier,
            channel: o.channel,
            customerName: o.customerName,
            items: o.items || [],
            createdAt: o.createdAt ? new Date(o.createdAt) : new Date(),
            status: (o.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'PENDING') as 'PENDING' | 'IN_PROGRESS',
          }));
          setMirrorOrders(mapped);
        }
      } catch {
        // Silently fail - mirror might be disconnected
      }
    };

    fetchMirrorOrders();
    const interval = setInterval(fetchMirrorOrders, 3000);
    return () => clearInterval(interval);
  }, [mirrorConnected, selectedScreenId, screens]);

  const checkMirrorStatus = async () => {
    try {
      const { data } = await mirrorApi.stats();
      setMirrorConnected(data.connected === true);
    } catch {
      setMirrorConnected(false);
    }
  };

  const loadScreens = async () => {
    try {
      const { data } = await screensApi.getAll();
      setScreens(data);
      if (data.length > 0) {
        setSelectedScreenId(data[0].id);
      }
    } catch (error) {
      message.error('Error cargando pantallas');
    }
  };

  const loadScreenConfig = async (screenId: string) => {
    try {
      setLoading(true);
      const { data } = await screensApi.getConfig(screenId);
      const appearance = data.appearance;

      if (appearance) {
        const mappedConfig: AppearanceConfig = {
          // Colores generales
          backgroundColor: appearance.backgroundColor || defaultConfig.backgroundColor,
          headerColor: appearance.headerColor || defaultConfig.headerColor,
          headerTextColor: appearance.headerTextColor || defaultConfig.headerTextColor,
          cardColor: appearance.cardColor || defaultConfig.cardColor,
          textColor: appearance.textColor || defaultConfig.textColor,
          accentColor: appearance.accentColor || defaultConfig.accentColor,

          // Header
          headerFontFamily: appearance.headerFontFamily || defaultConfig.headerFontFamily,
          headerFontSize: appearance.headerFontSize || defaultConfig.headerFontSize,
          headerFontWeight: appearance.headerFontWeight || defaultConfig.headerFontWeight,
          headerFontStyle: appearance.headerFontStyle || defaultConfig.headerFontStyle,
          headerBgColor: appearance.headerBgColor || defaultConfig.headerBgColor,
          headerTextColorCustom: appearance.headerTextColorCustom || defaultConfig.headerTextColorCustom,
          showHeader: appearance.showHeader ?? defaultConfig.showHeader,
          showOrderNumber: appearance.showOrderNumber ?? defaultConfig.showOrderNumber,
          headerShowChannel: appearance.headerShowChannel ?? defaultConfig.headerShowChannel,
          headerShowTime: appearance.headerShowTime ?? defaultConfig.headerShowTime,

          // Timer
          timerFontFamily: appearance.timerFontFamily || defaultConfig.timerFontFamily,
          timerFontSize: appearance.timerFontSize || defaultConfig.timerFontSize,
          timerFontWeight: appearance.timerFontWeight || defaultConfig.timerFontWeight,
          timerFontStyle: appearance.timerFontStyle || defaultConfig.timerFontStyle,
          timerTextColor: appearance.timerTextColor || defaultConfig.timerTextColor,
          showTimer: appearance.showTimer ?? defaultConfig.showTimer,

          // Cliente
          clientFontFamily: appearance.clientFontFamily || defaultConfig.clientFontFamily,
          clientFontSize: appearance.clientFontSize || defaultConfig.clientFontSize,
          clientFontWeight: appearance.clientFontWeight || defaultConfig.clientFontWeight,
          clientFontStyle: appearance.clientFontStyle || defaultConfig.clientFontStyle,
          clientTextColor: appearance.clientTextColor || defaultConfig.clientTextColor,
          clientBgColor: appearance.clientBgColor || defaultConfig.clientBgColor,
          showClient: appearance.showClient ?? defaultConfig.showClient,

          // Cantidad
          quantityFontFamily: appearance.quantityFontFamily || defaultConfig.quantityFontFamily,
          quantityFontSize: appearance.quantityFontSize || defaultConfig.quantityFontSize,
          quantityFontWeight: appearance.quantityFontWeight || defaultConfig.quantityFontWeight,
          quantityFontStyle: appearance.quantityFontStyle || defaultConfig.quantityFontStyle,
          quantityTextColor: appearance.quantityTextColor || defaultConfig.quantityTextColor,
          showQuantity: appearance.showQuantity ?? defaultConfig.showQuantity,

          // Producto
          productFontFamily: appearance.productFontFamily || defaultConfig.productFontFamily,
          productFontSize: appearance.productFontSize || defaultConfig.productFontSize,
          productFontWeight: appearance.productFontWeight || defaultConfig.productFontWeight,
          productFontStyle: appearance.productFontStyle || defaultConfig.productFontStyle,
          productTextColor: appearance.productTextColor || defaultConfig.productTextColor,
          productBgColor: appearance.productBgColor || defaultConfig.productBgColor,
          productUppercase: appearance.productUppercase ?? defaultConfig.productUppercase,

          // Subitem
          subitemFontFamily: appearance.subitemFontFamily || defaultConfig.subitemFontFamily,
          subitemFontSize: appearance.subitemFontSize || defaultConfig.subitemFontSize,
          subitemFontWeight: appearance.subitemFontWeight || defaultConfig.subitemFontWeight,
          subitemFontStyle: appearance.subitemFontStyle || defaultConfig.subitemFontStyle,
          subitemTextColor: appearance.subitemTextColor || defaultConfig.subitemTextColor,
          subitemBgColor: appearance.subitemBgColor || defaultConfig.subitemBgColor,
          subitemIndent: appearance.subitemIndent ?? defaultConfig.subitemIndent,
          showSubitems: appearance.showSubitems ?? defaultConfig.showSubitems,

          // Modifier
          modifierFontFamily: appearance.modifierFontFamily || defaultConfig.modifierFontFamily,
          modifierFontSize: appearance.modifierFontSize || defaultConfig.modifierFontSize,
          modifierFontWeight: appearance.modifierFontWeight || defaultConfig.modifierFontWeight,
          modifierFontStyle: appearance.modifierFontStyle || defaultConfig.modifierFontStyle,
          modifierFontColor: appearance.modifierFontColor || defaultConfig.modifierFontColor,
          modifierBgColor: appearance.modifierBgColor || defaultConfig.modifierBgColor,
          modifierIndent: appearance.modifierIndent ?? defaultConfig.modifierIndent,
          showModifiers: appearance.showModifiers ?? defaultConfig.showModifiers,

          // Notes
          notesFontFamily: appearance.notesFontFamily || defaultConfig.notesFontFamily,
          notesFontSize: appearance.notesFontSize || defaultConfig.notesFontSize,
          notesFontWeight: appearance.notesFontWeight || defaultConfig.notesFontWeight,
          notesFontStyle: appearance.notesFontStyle || defaultConfig.notesFontStyle,
          notesTextColor: appearance.notesTextColor || defaultConfig.notesTextColor,
          notesBgColor: appearance.notesBgColor || defaultConfig.notesBgColor,
          notesIndent: appearance.notesIndent ?? defaultConfig.notesIndent,
          showNotes: appearance.showNotes ?? defaultConfig.showNotes,

          // Channel
          channelFontFamily: appearance.channelFontFamily || defaultConfig.channelFontFamily,
          channelFontSize: appearance.channelFontSize || defaultConfig.channelFontSize,
          channelFontWeight: appearance.channelFontWeight || defaultConfig.channelFontWeight,
          channelFontStyle: appearance.channelFontStyle || defaultConfig.channelFontStyle,
          channelTextColor: appearance.channelTextColor || defaultConfig.channelTextColor,
          channelUppercase: appearance.channelUppercase ?? defaultConfig.channelUppercase,
          showChannel: appearance.showChannel ?? defaultConfig.showChannel,

          // Disposicion
          columns: appearance.columnsPerScreen || defaultConfig.columns,

          // Opciones
          animationEnabled: appearance.animationEnabled ?? defaultConfig.animationEnabled,
          screenSplit: appearance.screenSplit ?? defaultConfig.screenSplit,
        };

        setConfig(mappedConfig);
        form.setFieldsValue(mappedConfig);
      } else {
        setConfig(defaultConfig);
        form.setFieldsValue(defaultConfig);
      }
    } catch (error) {
      message.error('Error cargando configuracion');
      setConfig(defaultConfig);
      form.setFieldsValue(defaultConfig);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedScreenId) return;

    try {
      const values = await form.validateFields();

      // Convert Color objects to hex strings
      const processedValues = { ...values };
      Object.keys(processedValues).forEach((key) => {
        if (
          processedValues[key] &&
          typeof processedValues[key] === 'object' &&
          'toHexString' in processedValues[key]
        ) {
          processedValues[key] = (processedValues[key] as Color).toHexString();
        }
      });

      await screensApi.updateAppearance(selectedScreenId, processedValues);
      message.success('Configuracion guardada');
      setConfig(processedValues);
    } catch (error) {
      message.error('Error guardando configuracion');
    }
  };

  const handleResetDefaults = () => {
    form.setFieldsValue(defaultConfig);
    setConfig(defaultConfig);
    message.info('Valores restaurados a configuración por defecto');
  };

  const handleFormChange = (_: unknown, allValues: AppearanceConfig) => {
    // Convert Color objects for preview
    const processedValues = { ...allValues };
    Object.keys(processedValues).forEach((key) => {
      const value = processedValues[key as keyof AppearanceConfig];
      if (value && typeof value === 'object' && 'toHexString' in (value as Record<string, unknown>)) {
        (processedValues as Record<string, unknown>)[key] = (value as Color).toHexString();
      }
    });
    setConfig(processedValues);
  };

  return (
    <Row gutter={24}>
      <Col span={14}>
        <Card
          title="Configuracion de Apariencia"
          extra={
            <Space>
              <Select
                style={{ width: 200 }}
                value={selectedScreenId}
                onChange={setSelectedScreenId}
                placeholder="Seleccionar pantalla"
              >
                {screens.map((s) => (
                  <Select.Option key={s.id} value={s.id}>
                    {s.name}
                  </Select.Option>
                ))}
              </Select>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => selectedScreenId && loadScreenConfig(selectedScreenId)}
              >
                Recargar
              </Button>
              <Button icon={<UndoOutlined />} onClick={handleResetDefaults}>
                Por defecto
              </Button>
              <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
                Guardar
              </Button>
            </Space>
          }
          loading={loading}
          style={{ maxHeight: 'calc(100vh - 120px)', overflow: 'auto' }}
        >
          <Form form={form} layout="vertical" onValuesChange={handleFormChange} initialValues={config}>
            {/* Colores Generales */}
            <Divider orientation="left">Colores Generales</Divider>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="backgroundColor" label="Fondo Pantalla">
                  <ColorPicker format="hex" showText />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="cardColor" label="Fondo Tarjetas">
                  <ColorPicker format="hex" showText />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="textColor" label="Texto General">
                  <ColorPicker format="hex" showText />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="accentColor" label="Color Acento">
                  <ColorPicker format="hex" showText />
                </Form.Item>
              </Col>
            </Row>

            {/* Tipografías */}
            <Divider orientation="left">
              <Space>
                <FontColorsOutlined />
                Configuración de Tipografías
              </Space>
            </Divider>

            <Alert
              type="info"
              message="Configura la fuente, tamaño, peso, estilo y color de cada elemento de las tarjetas de orden."
              style={{ marginBottom: 16 }}
            />

            <Collapse defaultActiveKey={['header', 'product']} ghost>
              {/* Header */}
              <Panel
                header={
                  <Text strong>
                    Cabecera de Orden <Text type="secondary">(Orden #xxx)</Text>
                  </Text>
                }
                key="header"
              >
                <TypographySection
                  prefix="header"
                  showVisibilityToggle={true}
                  showBgColor={true}
                  form={form}
                />
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item
                      name="showOrderNumber"
                      label="Mostrar # de Orden"
                      valuePropName="checked"
                    >
                      <Switch size="small" />
                    </Form.Item>
                  </Col>
                </Row>
              </Panel>

              {/* Timer */}
              <Panel
                header={
                  <Text strong>
                    Timer <Text type="secondary">(00:00)</Text>
                  </Text>
                }
                key="timer"
              >
                <TypographySection
                  prefix="timer"
                  showVisibilityToggle={true}
                  form={form}
                />
              </Panel>

              {/* Cliente */}
              <Panel
                header={
                  <Text strong>
                    Nombre del Cliente <Text type="secondary">(CONSUMIDOR FINAL)</Text>
                  </Text>
                }
                key="client"
              >
                <TypographySection
                  prefix="client"
                  showVisibilityToggle={true}
                  showBgColor={true}
                  form={form}
                />
              </Panel>

              {/* Cantidad */}
              <Panel
                header={
                  <Text strong>
                    Cantidad <Text type="secondary">(5x)</Text>
                  </Text>
                }
                key="quantity"
              >
                <TypographySection
                  prefix="quantity"
                  showVisibilityToggle={true}
                  form={form}
                />
                <Alert
                  type="info"
                  message="Si el color está vacío, se usará el color del SLA (tiempo de espera)"
                  style={{ marginTop: 8 }}
                />
              </Panel>

              {/* Producto */}
              <Panel
                header={
                  <Text strong>
                    Productos <Text type="secondary">(SUPER COMBO 2)</Text>
                  </Text>
                }
                key="product"
              >
                <TypographySection
                  prefix="product"
                  showVisibilityToggle={false}
                  showUppercase={true}
                  showBgColor={true}
                  form={form}
                />
              </Panel>

              {/* Subitems */}
              <Panel
                header={
                  <Text strong>
                    Subproductos <Text type="secondary">(1x Pepsi, 1x Crispy)</Text>
                  </Text>
                }
                key="subitem"
              >
                <TypographySection
                  prefix="subitem"
                  showVisibilityToggle={true}
                  showIndent={true}
                  showBgColor={true}
                  form={form}
                />
              </Panel>

              {/* Modificadores */}
              <Panel
                header={
                  <Text strong>
                    Modificadores <Text type="secondary">(* 10x PRESAS, 5x ARROZ)</Text>
                  </Text>
                }
                key="modifier"
              >
                <TypographySection
                  prefix="modifier"
                  showVisibilityToggle={true}
                  showIndent={true}
                  showBgColor={true}
                  form={form}
                />
              </Panel>

              {/* Notas */}
              <Panel
                header={
                  <Text strong>
                    Notas Especiales <Text type="secondary">(* nota del cliente)</Text>
                  </Text>
                }
                key="notes"
              >
                <TypographySection
                  prefix="notes"
                  showVisibilityToggle={true}
                  showIndent={true}
                  showBgColor={true}
                  form={form}
                />
              </Panel>

              {/* Canal */}
              <Panel
                header={
                  <Text strong>
                    Canal / Footer <Text type="secondary">(KIOSKO-EFECTIVO)</Text>
                  </Text>
                }
                key="channel"
              >
                <TypographySection
                  prefix="channel"
                  showVisibilityToggle={true}
                  showUppercase={true}
                  form={form}
                />
              </Panel>
            </Collapse>

            {/* Disposición */}
            <Divider orientation="left">Disposición</Divider>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="columns" label="Columnas">
                  <InputNumber min={1} max={8} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={16}>
                <Alert
                  type="info"
                  message={`Se mostrarán ${config.columns} órdenes por fila`}
                  style={{ height: '100%' }}
                />
              </Col>
            </Row>

            {/* Opciones */}
            <Divider orientation="left">Opciones Generales</Divider>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="animationEnabled" label="Animaciones" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="screenSplit"
                  label="Dividir Órdenes Largas"
                  valuePropName="checked"
                  tooltip="Cuando una orden tiene más items de los que caben en una columna, se divide automáticamente"
                >
                  <Switch />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Card>
      </Col>

      {/* Preview */}
      <Col span={10}>
        <Card
          title={`Vista Previa en Tiempo Real${mirrorConnected ? ` (${mirrorOrders.length} órdenes del Mirror)` : ''}`}
          style={{ height: 'calc(100vh - 120px)', position: 'sticky', top: 16 }}
          bodyStyle={{ padding: '12px', height: 'calc(100% - 57px)', overflow: 'auto' }}
        >
          <ScreenPreview
            orders={mirrorConnected && mirrorOrders.length > 0 ? mirrorOrders : undefined}
            appearance={{
              backgroundColor: config.backgroundColor,
              cardColor: config.cardColor,
              textColor: config.textColor,
              accentColor: config.accentColor,
              headerColor: config.headerColor,
              headerTextColor: config.headerTextColor,
              // Cabecera
              headerFontFamily: config.headerFontFamily,
              headerFontSize: config.headerFontSize,
              headerFontWeight: config.headerFontWeight,
              headerFontStyle: config.headerFontStyle,
              headerTextColorCustom: config.headerTextColorCustom,
              showHeader: config.showHeader,
              showOrderNumber: config.showOrderNumber,
              headerShowChannel: config.headerShowChannel,
              headerShowTime: config.headerShowTime,
              // Timer
              timerFontFamily: config.timerFontFamily,
              timerFontSize: config.timerFontSize,
              timerFontWeight: config.timerFontWeight,
              timerFontStyle: config.timerFontStyle,
              timerTextColor: config.timerTextColor,
              showTimer: config.showTimer,
              // Cliente
              clientFontFamily: config.clientFontFamily,
              clientFontSize: config.clientFontSize,
              clientFontWeight: config.clientFontWeight,
              clientFontStyle: config.clientFontStyle,
              clientTextColor: config.clientTextColor,
              showClient: config.showClient,
              // Cantidad
              quantityFontFamily: config.quantityFontFamily,
              quantityFontSize: config.quantityFontSize,
              quantityFontWeight: config.quantityFontWeight,
              quantityFontStyle: config.quantityFontStyle,
              quantityTextColor: config.quantityTextColor,
              showQuantity: config.showQuantity,
              // Producto
              productFontFamily: config.productFontFamily,
              productFontSize: config.productFontSize,
              productFontWeight: config.productFontWeight,
              productFontStyle: config.productFontStyle,
              productTextColor: config.productTextColor,
              productUppercase: config.productUppercase,
              // Subitem
              subitemFontFamily: config.subitemFontFamily,
              subitemFontSize: config.subitemFontSize,
              subitemFontWeight: config.subitemFontWeight,
              subitemFontStyle: config.subitemFontStyle,
              subitemTextColor: config.subitemTextColor,
              subitemIndent: config.subitemIndent,
              showSubitems: config.showSubitems,
              // Modifier
              modifierFontFamily: config.modifierFontFamily,
              modifierFontSize: config.modifierFontSize,
              modifierFontWeight: config.modifierFontWeight,
              modifierFontStyle: config.modifierFontStyle,
              modifierFontColor: config.modifierFontColor,
              modifierIndent: config.modifierIndent,
              showModifiers: config.showModifiers,
              // Notes
              notesFontFamily: config.notesFontFamily,
              notesFontSize: config.notesFontSize,
              notesFontWeight: config.notesFontWeight,
              notesFontStyle: config.notesFontStyle,
              notesTextColor: config.notesTextColor,
              notesIndent: config.notesIndent,
              showNotes: config.showNotes,
              // Channel
              channelFontFamily: config.channelFontFamily,
              channelFontSize: config.channelFontSize,
              channelFontWeight: config.channelFontWeight,
              channelFontStyle: config.channelFontStyle,
              channelTextColor: config.channelTextColor,
              channelUppercase: config.channelUppercase,
              showChannel: config.showChannel,
              // Layout
              columnsPerScreen: config.columns,
              screenName: screens.find((s) => s.id === selectedScreenId)?.name || 'PREVIEW',
              screenSplit: config.screenSplit,
              cardColors: [
                { color: '#4CAF50', minutes: '01:00', order: 1, isFullBackground: false },
                { color: '#FFC107', minutes: '02:00', order: 2, isFullBackground: false },
                { color: '#FF5722', minutes: '03:00', order: 3, isFullBackground: false },
                { color: '#f44336', minutes: '04:00', order: 4, isFullBackground: true },
              ],
            }}
            preference={{
              showClientData: true,
              showName: config.showClient,
              showIdentifier: config.showOrderNumber,
              identifierMessage: 'Orden',
              sourceBoxActive: true,
              sourceBoxMessage: 'KDS',
            }}
          />
        </Card>
      </Col>
    </Row>
  );
}
