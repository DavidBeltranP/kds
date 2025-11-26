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
} from 'antd';
import { SaveOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons';
import { screensApi } from '../services/api';
import { ScreenPreview } from '../components/ScreenPreview';
import type { Color } from 'antd/es/color-picker';

interface Screen {
  id: string;
  name: string;
}

interface AppearanceConfig {
  // Colores generales
  backgroundColor: string;
  headerColor: string;
  headerTextColor: string;
  cardColor: string;
  textColor: string;
  accentColor: string;
  // Tipografia de productos
  productFontFamily: string;
  productFontSize: string;
  productFontWeight: string;
  // Tipografia de modificadores
  modifierFontFamily: string;
  modifierFontSize: string;
  modifierFontColor: string;
  modifierFontStyle: string;
  // Cabecera de orden
  headerFontFamily: string;
  headerFontSize: string;
  headerShowChannel: boolean;
  headerShowTime: boolean;
  // Disposicion
  columns: number;
  rows: number;
  // Opciones
  showTimer: boolean;
  showOrderNumber: boolean;
  animationEnabled: boolean;
  screenSplit: boolean;
  maxItemsPerColumn: number;
}

const fontFamilies = [
  { value: 'Inter, sans-serif', label: 'Inter' },
  { value: 'Roboto, sans-serif', label: 'Roboto' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Helvetica, sans-serif', label: 'Helvetica' },
  { value: '"Roboto Mono", monospace', label: 'Roboto Mono' },
  { value: '"Source Code Pro", monospace', label: 'Source Code Pro' },
  { value: '"Open Sans", sans-serif', label: 'Open Sans' },
  { value: 'Montserrat, sans-serif', label: 'Montserrat' },
  { value: '"Segoe UI", sans-serif', label: 'Segoe UI' },
];

const defaultConfig: AppearanceConfig = {
  // Colores - tema claro
  backgroundColor: '#f0f2f5',
  headerColor: '#1a1a2e',
  headerTextColor: '#ffffff',
  cardColor: '#ffffff',
  textColor: '#1a1a2e',
  accentColor: '#e94560',
  // Tipografia productos
  productFontFamily: 'Inter, sans-serif',
  productFontSize: 'medium',
  productFontWeight: 'bold',
  // Tipografia modificadores
  modifierFontFamily: 'Inter, sans-serif',
  modifierFontSize: 'small',
  modifierFontColor: '#666666',
  modifierFontStyle: 'italic',
  // Cabecera de orden
  headerFontFamily: 'Inter, sans-serif',
  headerFontSize: 'medium',
  headerShowChannel: true,
  headerShowTime: true,
  // Disposicion
  columns: 4,
  rows: 3,
  // Opciones
  showTimer: true,
  showOrderNumber: true,
  animationEnabled: true,
  screenSplit: true,
  maxItemsPerColumn: 6,
};

export function Appearance() {
  const [screens, setScreens] = useState<Screen[]>([]);
  const [selectedScreenId, setSelectedScreenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<AppearanceConfig>(defaultConfig);
  const [form] = Form.useForm();

  useEffect(() => {
    loadScreens();
  }, []);

  useEffect(() => {
    if (selectedScreenId) {
      loadScreenConfig(selectedScreenId);
    }
  }, [selectedScreenId]);

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
      const appearance = data.appearance || defaultConfig;
      setConfig(appearance);
      form.setFieldsValue(appearance);
    } catch (error) {
      message.error('Error cargando configuracion');
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
      Object.keys(processedValues).forEach(key => {
        if (processedValues[key] && typeof processedValues[key] === 'object' && 'toHexString' in processedValues[key]) {
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

  const handlePreview = () => {
    const screenName = screens.find(s => s.id === selectedScreenId)?.name;
    message.info(`Vista previa disponible en la pantalla: ${screenName}`);
  };

  const handleFormChange = (_: any, allValues: AppearanceConfig) => {
    // Convert Color objects for preview
    const processedValues = { ...allValues };
    Object.keys(processedValues).forEach(key => {
      const value = processedValues[key as keyof AppearanceConfig];
      if (value && typeof value === 'object' && 'toHexString' in (value as any)) {
        (processedValues as any)[key] = (value as Color).toHexString();
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
              <Button icon={<ReloadOutlined />} onClick={() => selectedScreenId && loadScreenConfig(selectedScreenId)}>
                Recargar
              </Button>
              <Button icon={<EyeOutlined />} onClick={handlePreview}>
                Preview
              </Button>
              <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
                Guardar
              </Button>
            </Space>
          }
          loading={loading}
        >
          <Form
            form={form}
            layout="vertical"
            onValuesChange={handleFormChange}
            initialValues={config}
          >
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
                <Form.Item name="textColor" label="Texto Productos">
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

            <Divider orientation="left">Cabecera de Orden</Divider>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="headerColor" label="Color Fondo Cabecera">
                  <ColorPicker format="hex" showText />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="headerTextColor" label="Color Texto Cabecera">
                  <ColorPicker format="hex" showText />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="headerFontFamily" label="Fuente Cabecera">
                  <Select>
                    {fontFamilies.map((f) => (
                      <Select.Option key={f.value} value={f.value}>
                        {f.label}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="headerFontSize" label="Tamano Cabecera">
                  <Select>
                    <Select.Option value="small">Pequeno (12px)</Select.Option>
                    <Select.Option value="medium">Mediano (14px)</Select.Option>
                    <Select.Option value="large">Grande (16px)</Select.Option>
                    <Select.Option value="xlarge">Extra Grande (20px)</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="headerShowChannel"
                  label="Mostrar Canal"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="headerShowTime"
                  label="Mostrar Hora"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">Tipografia de Productos</Divider>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="productFontFamily" label="Fuente Productos">
                  <Select>
                    {fontFamilies.map((f) => (
                      <Select.Option key={f.value} value={f.value}>
                        {f.label}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="productFontSize" label="Tamano Productos">
                  <Select>
                    <Select.Option value="small">Pequeno (12px)</Select.Option>
                    <Select.Option value="medium">Mediano (14px)</Select.Option>
                    <Select.Option value="large">Grande (16px)</Select.Option>
                    <Select.Option value="xlarge">Extra Grande (20px)</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="productFontWeight" label="Peso Fuente">
                  <Select>
                    <Select.Option value="normal">Normal (400)</Select.Option>
                    <Select.Option value="medium">Medio (500)</Select.Option>
                    <Select.Option value="semibold">Semi-Bold (600)</Select.Option>
                    <Select.Option value="bold">Bold (700)</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">Tipografia de Modificadores</Divider>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="modifierFontFamily" label="Fuente Modificadores">
                  <Select>
                    {fontFamilies.map((f) => (
                      <Select.Option key={f.value} value={f.value}>
                        {f.label}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="modifierFontSize" label="Tamano Modificadores">
                  <Select>
                    <Select.Option value="xsmall">Extra Pequeno (10px)</Select.Option>
                    <Select.Option value="small">Pequeno (11px)</Select.Option>
                    <Select.Option value="medium">Mediano (12px)</Select.Option>
                    <Select.Option value="large">Grande (14px)</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="modifierFontColor" label="Color Modificadores">
                  <ColorPicker format="hex" showText />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="modifierFontStyle" label="Estilo Modificadores">
                  <Select>
                    <Select.Option value="normal">Normal</Select.Option>
                    <Select.Option value="italic">Italica / Cursiva</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">Disposicion</Divider>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="columns" label="Columnas">
                  <InputNumber min={1} max={8} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="rows" label="Filas">
                  <InputNumber min={1} max={6} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Alert
                  type="info"
                  message={`Grid: ${config.columns}x${config.rows} = ${config.columns * config.rows} ordenes visibles`}
                  style={{ height: '100%' }}
                />
              </Col>
            </Row>

            <Divider orientation="left">Opciones de Visualizacion</Divider>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="showTimer"
                  label="Mostrar Timer"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="showOrderNumber"
                  label="Mostrar # de Orden"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="animationEnabled"
                  label="Animaciones"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="screenSplit"
                  label="Dividir Ordenes Largas"
                  valuePropName="checked"
                  tooltip="Cuando una orden tiene mas items de los que caben en una columna, se divide en columnas adyacentes"
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="maxItemsPerColumn"
                  label="Max Items por Columna"
                  tooltip="Numero maximo de items que caben en una columna antes de dividir la orden"
                >
                  <InputNumber min={3} max={12} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Alert
                  type="info"
                  message={config.screenSplit ? `Ordenes con mas de ${config.maxItemsPerColumn} items se dividen` : 'Division desactivada'}
                  style={{ height: '100%' }}
                />
              </Col>
            </Row>

          </Form>
        </Card>
      </Col>

      {/* Preview */}
      <Col span={10}>
        <Card title="Vista Previa en Tiempo Real" style={{ height: '100%' }} bodyStyle={{ padding: '12px' }}>
          <ScreenPreview
            appearance={{
              backgroundColor: config.backgroundColor,
              cardColor: config.cardColor,
              textColor: config.textColor,
              accentColor: config.accentColor,
              headerColor: config.headerColor,
              headerTextColor: config.headerTextColor,
              headerFontFamily: config.headerFontFamily,
              headerFontSize: config.headerFontSize,
              headerShowChannel: config.headerShowChannel,
              headerShowTime: config.headerShowTime,
              productFontFamily: config.productFontFamily,
              productFontSize: config.productFontSize,
              productFontWeight: config.productFontWeight,
              modifierFontFamily: config.modifierFontFamily,
              modifierFontSize: config.modifierFontSize,
              modifierFontColor: config.modifierFontColor,
              modifierFontStyle: config.modifierFontStyle,
              columnsPerScreen: config.columns,
              screenName: screens.find(s => s.id === selectedScreenId)?.name || 'PREVIEW',
              screenSplit: config.screenSplit,
              maxItemsPerColumn: config.maxItemsPerColumn,
              cardColors: [
                { color: '#4CAF50', minutes: '01:00', order: 1, isFullBackground: false },
                { color: '#FFC107', minutes: '02:00', order: 2, isFullBackground: false },
                { color: '#FF5722', minutes: '03:00', order: 3, isFullBackground: false },
                { color: '#f44336', minutes: '04:00', order: 4, isFullBackground: true },
              ],
            }}
            preference={{
              showClientData: true,
              showName: true,
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
