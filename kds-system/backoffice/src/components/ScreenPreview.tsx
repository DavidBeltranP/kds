import { useMemo, useState, useEffect } from 'react';
import { Badge, Space } from 'antd';

interface OrderItem {
  name: string;
  quantity: number;
  modifier?: string;
  notes?: string;
  subitems?: Array<{ name: string; quantity: number }>;
}

interface PreviewOrder {
  id: string;
  identifier: string;
  channel: string;
  customerName?: string;
  items: OrderItem[];
  createdAt: Date;
  status: 'PENDING' | 'IN_PROGRESS';
}

interface ScreenAppearance {
  backgroundColor?: string;
  cardColor?: string;
  textColor?: string;
  accentColor?: string;
  headerColor?: string;
  headerTextColor?: string;
  // Header
  headerFontFamily?: string;
  headerFontSize?: string;
  headerFontWeight?: string;
  headerFontStyle?: string;
  headerTextColorCustom?: string;
  showHeader?: boolean;
  showOrderNumber?: boolean;
  headerShowChannel?: boolean;
  headerShowTime?: boolean;
  // Timer
  timerFontFamily?: string;
  timerFontSize?: string;
  timerFontWeight?: string;
  timerFontStyle?: string;
  timerTextColor?: string;
  showTimer?: boolean;
  // Client
  clientFontFamily?: string;
  clientFontSize?: string;
  clientFontWeight?: string;
  clientFontStyle?: string;
  clientTextColor?: string;
  showClient?: boolean;
  // Quantity
  quantityFontFamily?: string;
  quantityFontSize?: string;
  quantityFontWeight?: string;
  quantityFontStyle?: string;
  quantityTextColor?: string;
  showQuantity?: boolean;
  // Product
  productFontFamily?: string;
  productFontSize?: string;
  productFontWeight?: string;
  productFontStyle?: string;
  productTextColor?: string;
  productUppercase?: boolean;
  // Subitem
  subitemFontFamily?: string;
  subitemFontSize?: string;
  subitemFontWeight?: string;
  subitemFontStyle?: string;
  subitemTextColor?: string;
  subitemIndent?: number;
  showSubitems?: boolean;
  // Modifier
  modifierFontFamily?: string;
  modifierFontSize?: string;
  modifierFontWeight?: string;
  modifierFontStyle?: string;
  modifierFontColor?: string;
  modifierIndent?: number;
  showModifiers?: boolean;
  // Notes
  notesFontFamily?: string;
  notesFontSize?: string;
  notesFontWeight?: string;
  notesFontStyle?: string;
  notesTextColor?: string;
  notesIndent?: number;
  showNotes?: boolean;
  // Channel
  channelFontFamily?: string;
  channelFontSize?: string;
  channelFontWeight?: string;
  channelFontStyle?: string;
  channelTextColor?: string;
  channelUppercase?: boolean;
  showChannel?: boolean;
  // Layout
  columnsPerScreen?: number;
  screenName?: string;
  screenSplit?: boolean;
  cardColors?: Array<{
    color: string;
    minutes: string;
    order: number;
    isFullBackground: boolean;
  }>;
}

interface ScreenPreference {
  showClientData?: boolean;
  showName?: boolean;
  showIdentifier?: boolean;
  identifierMessage?: string;
  sourceBoxActive?: boolean;
  sourceBoxMessage?: string;
}

interface ScreenPreviewProps {
  appearance?: ScreenAppearance;
  preference?: ScreenPreference;
  orders?: PreviewOrder[];
}

// Ordenes de ejemplo con subitems y notas
const sampleOrders: PreviewOrder[] = [
  {
    id: '1',
    identifier: '3005',
    channel: 'Local',
    customerName: 'Juan Perez',
    items: [
      {
        name: 'Super Combo Familiar',
        quantity: 1,
        subitems: [
          { name: 'Pollo Original 8pcs', quantity: 1 },
          { name: 'Papas Grandes', quantity: 2 },
          { name: 'Coca-Cola 1.5L', quantity: 1 },
        ]
      },
      { name: 'Alitas BBQ x12', quantity: 1, modifier: 'Extra picante, Sin cebolla' },
      { name: 'Ensalada Coleslaw', quantity: 2 },
      { name: 'Sundae Chocolate', quantity: 2, notes: 'Sin crema batida' },
    ],
    createdAt: new Date(Date.now() - 45000), // 45 segundos
    status: 'PENDING',
  },
  {
    id: '2',
    identifier: '3006',
    channel: 'PedidosYa',
    customerName: 'Maria Lopez',
    items: [
      { name: 'Big Box Familiar', quantity: 1, modifier: 'Sin ensalada' },
      { name: 'Twister Clasico', quantity: 2, modifier: 'Sin cebolla, extra salsa' },
      { name: 'Papas Medianas', quantity: 2 },
    ],
    createdAt: new Date(Date.now() - 180000), // 3 min
    status: 'PENDING',
  },
  {
    id: '3',
    identifier: '3007',
    channel: 'RAPPI',
    customerName: 'Carlos Ruiz',
    items: [
      { name: 'Combo Mega Box', quantity: 1 },
      { name: 'Nuggets x20', quantity: 1, modifier: 'Con salsa BBQ' },
      { name: 'Helado Vainilla', quantity: 2, notes: 'Llevar servilletas extra' },
    ],
    createdAt: new Date(Date.now() - 360000), // 6 min
    status: 'PENDING',
  },
  {
    id: '4',
    identifier: '3008',
    channel: 'Kiosko-Efectivo',
    customerName: 'Ana Torres',
    items: [
      { name: 'Twister Supreme', quantity: 2 },
      { name: 'Papas Medianas', quantity: 2 },
    ],
    createdAt: new Date(Date.now() - 480000), // 8 min
    status: 'PENDING',
  },
];

const defaultChannelColors: Record<string, string> = {
  'Local': '#7ed321',
  'Kiosko-Efectivo': '#0299d0',
  'Kiosko-Tarjeta': '#d0021b',
  'PedidosYa': '#d0021b',
  'RAPPI': '#ff5a00',
  'Drive': '#9b59b6',
  'APP': '#bd10e0',
};

// Mapeo de tamaños de fuente a píxeles (escala reducida para preview)
const getFontSize = (size?: string, type: string = 'product'): string => {
  const sizes: Record<string, Record<string, string>> = {
    header: { xsmall: '9px', small: '10px', medium: '11px', large: '12px', xlarge: '14px', xxlarge: '16px' },
    timer: { xsmall: '9px', small: '10px', medium: '11px', large: '12px', xlarge: '14px', xxlarge: '16px' },
    client: { xsmall: '8px', small: '9px', medium: '10px', large: '11px', xlarge: '12px', xxlarge: '14px' },
    quantity: { xsmall: '9px', small: '10px', medium: '11px', large: '12px', xlarge: '14px', xxlarge: '16px' },
    product: { xsmall: '9px', small: '10px', medium: '11px', large: '12px', xlarge: '14px', xxlarge: '16px' },
    subitem: { xsmall: '7px', small: '8px', medium: '9px', large: '10px', xlarge: '11px', xxlarge: '12px' },
    modifier: { xsmall: '7px', small: '8px', medium: '9px', large: '10px', xlarge: '11px', xxlarge: '12px' },
    notes: { xsmall: '7px', small: '8px', medium: '9px', large: '10px', xlarge: '11px', xxlarge: '12px' },
    channel: { xsmall: '7px', small: '8px', medium: '9px', large: '10px', xlarge: '11px', xxlarge: '12px' },
  };
  return sizes[type]?.[size || 'medium'] || sizes[type]?.medium || '11px';
};

const getFontWeight = (weight?: string): number => {
  const weights: Record<string, number> = { normal: 400, medium: 500, semibold: 600, bold: 700 };
  return weights[weight || 'bold'] || 700;
};

const getFontStyle = (style?: string): React.CSSProperties['fontStyle'] => {
  if (style === 'italic') return 'italic';
  return 'normal';
};

// Clip-path para efecto de papel rasgado
const getClipPathBottom = () =>
  'polygon(0% 0%, 100% 0%, 100% calc(100% - 8px), 97% calc(100% - 5px), 94% calc(100% - 7px), 91% calc(100% - 3px), 88% calc(100% - 6px), 85% calc(100% - 4px), 82% calc(100% - 8px), 79% calc(100% - 5px), 76% calc(100% - 6px), 73% calc(100% - 2px), 70% calc(100% - 5px), 67% calc(100% - 4px), 64% calc(100% - 7px), 61% calc(100% - 5px), 58% calc(100% - 6px), 55% calc(100% - 3px), 52% calc(100% - 7px), 49% calc(100% - 4px), 46% calc(100% - 8px), 43% calc(100% - 5px), 40% calc(100% - 6px), 37% calc(100% - 2px), 34% calc(100% - 5px), 31% calc(100% - 4px), 28% calc(100% - 7px), 25% calc(100% - 5px), 22% calc(100% - 6px), 19% calc(100% - 3px), 16% calc(100% - 6px), 13% calc(100% - 4px), 10% calc(100% - 8px), 7% calc(100% - 5px), 4% calc(100% - 6px), 0% calc(100% - 4px))';

const getClipPathTop = () =>
  'polygon(0% 4px, 3% 6px, 6% 3px, 9% 7px, 12% 5px, 15% 2px, 18% 5px, 21% 4px, 24% 8px, 27% 5px, 30% 6px, 33% 2px, 36% 5px, 39% 4px, 42% 7px, 45% 5px, 48% 3px, 51% 6px, 54% 4px, 57% 7px, 60% 5px, 63% 8px, 66% 3px, 69% 5px, 72% 4px, 75% 6px, 78% 2px, 81% 5px, 84% 7px, 87% 4px, 90% 6px, 93% 3px, 96% 5px, 100% 4px, 100% 100%, 0% 100%)';

interface ColumnCard {
  order: PreviewOrder;
  items: OrderItem[];
  partNumber: number;
  totalParts: number;
  isFirstPart: boolean;
  isLastPart: boolean;
}

export function ScreenPreview({
  appearance = {},
  preference = {},
  orders = sampleOrders,
}: ScreenPreviewProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Actualizar tiempo cada segundo para el timer
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Extraer configuración con defaults
  const config = {
    backgroundColor: appearance.backgroundColor || '#f0f2f5',
    cardColor: appearance.cardColor || '#ffffff',
    textColor: appearance.textColor || '#1a1a2e',
    accentColor: appearance.accentColor || '#e94560',
    headerColor: appearance.headerColor || '#1a1a2e',
    headerTextColor: appearance.headerTextColor || '#ffffff',

    // Header
    headerFontFamily: appearance.headerFontFamily || 'Inter, sans-serif',
    headerFontSize: appearance.headerFontSize || 'medium',
    headerFontWeight: appearance.headerFontWeight || 'bold',
    headerFontStyle: appearance.headerFontStyle || 'normal',
    headerTextColorCustom: appearance.headerTextColorCustom || '#ffffff',
    showHeader: appearance.showHeader !== false,
    showOrderNumber: appearance.showOrderNumber !== false,

    // Timer
    timerFontFamily: appearance.timerFontFamily || 'monospace',
    timerFontSize: appearance.timerFontSize || 'medium',
    timerFontWeight: appearance.timerFontWeight || 'bold',
    timerFontStyle: appearance.timerFontStyle || 'normal',
    timerTextColor: appearance.timerTextColor || '#ffffff',
    showTimer: appearance.showTimer !== false,

    // Client
    clientFontFamily: appearance.clientFontFamily || 'Inter, sans-serif',
    clientFontSize: appearance.clientFontSize || 'small',
    clientFontWeight: appearance.clientFontWeight || 'normal',
    clientFontStyle: appearance.clientFontStyle || 'normal',
    clientTextColor: appearance.clientTextColor || '#ffffff',
    showClient: appearance.showClient !== false,

    // Quantity
    quantityFontFamily: appearance.quantityFontFamily || 'Inter, sans-serif',
    quantityFontSize: appearance.quantityFontSize || 'medium',
    quantityFontWeight: appearance.quantityFontWeight || 'bold',
    quantityFontStyle: appearance.quantityFontStyle || 'normal',
    quantityTextColor: appearance.quantityTextColor || '',
    showQuantity: appearance.showQuantity !== false,

    // Product
    productFontFamily: appearance.productFontFamily || 'Inter, sans-serif',
    productFontSize: appearance.productFontSize || 'medium',
    productFontWeight: appearance.productFontWeight || 'bold',
    productFontStyle: appearance.productFontStyle || 'normal',
    productTextColor: appearance.productTextColor || '',
    productUppercase: appearance.productUppercase !== false,

    // Subitem
    subitemFontFamily: appearance.subitemFontFamily || 'Inter, sans-serif',
    subitemFontSize: appearance.subitemFontSize || 'small',
    subitemFontWeight: appearance.subitemFontWeight || 'normal',
    subitemFontStyle: appearance.subitemFontStyle || 'normal',
    subitemTextColor: appearance.subitemTextColor || '#333333',
    subitemIndent: appearance.subitemIndent ?? 20,
    showSubitems: appearance.showSubitems !== false,

    // Modifier
    modifierFontFamily: appearance.modifierFontFamily || 'Inter, sans-serif',
    modifierFontSize: appearance.modifierFontSize || 'small',
    modifierFontWeight: appearance.modifierFontWeight || 'normal',
    modifierFontStyle: appearance.modifierFontStyle || 'italic',
    modifierFontColor: appearance.modifierFontColor || '#666666',
    modifierIndent: appearance.modifierIndent ?? 20,
    showModifiers: appearance.showModifiers !== false,

    // Notes
    notesFontFamily: appearance.notesFontFamily || 'Inter, sans-serif',
    notesFontSize: appearance.notesFontSize || 'small',
    notesFontWeight: appearance.notesFontWeight || 'normal',
    notesFontStyle: appearance.notesFontStyle || 'italic',
    notesTextColor: appearance.notesTextColor || '#ff9800',
    notesIndent: appearance.notesIndent ?? 20,
    showNotes: appearance.showNotes !== false,

    // Channel
    channelFontFamily: appearance.channelFontFamily || 'Inter, sans-serif',
    channelFontSize: appearance.channelFontSize || 'small',
    channelFontWeight: appearance.channelFontWeight || 'bold',
    channelFontStyle: appearance.channelFontStyle || 'normal',
    channelTextColor: appearance.channelTextColor || '#ffffff',
    channelUppercase: appearance.channelUppercase !== false,
    showChannel: appearance.showChannel !== false,

    // Layout
    columnsPerScreen: appearance.columnsPerScreen || 4,
    screenName: appearance.screenName || 'PREVIEW',
    screenSplit: appearance.screenSplit !== false,
    cardColors: appearance.cardColors || [
      { color: '#4CAF50', minutes: '03:00', order: 1, isFullBackground: false },
      { color: '#FFC107', minutes: '05:00', order: 2, isFullBackground: false },
      { color: '#FF5722', minutes: '07:00', order: 3, isFullBackground: false },
      { color: '#f44336', minutes: '10:00', order: 4, isFullBackground: true },
    ],
  };

  const pref = {
    showClientData: preference.showClientData !== false,
    showName: preference.showName !== false,
    showIdentifier: preference.showIdentifier !== false,
    identifierMessage: preference.identifierMessage || 'Orden',
    sourceBoxActive: preference.sourceBoxActive !== false,
    sourceBoxMessage: preference.sourceBoxMessage || 'KDS',
  };

  const isDark = parseInt(config.backgroundColor?.replace('#', '') || 'ffffff', 16) < 0x808080;

  // Calcular color basado en tiempo
  const getTimeColor = (createdAt: Date): { color: string; isFullBackground: boolean } => {
    const elapsed = (currentTime.getTime() - createdAt.getTime()) / 1000 / 60; // minutos
    const sortedColors = [...config.cardColors].sort((a, b) => {
      const [aMins] = a.minutes.split(':').map(Number);
      const [bMins] = b.minutes.split(':').map(Number);
      return aMins - bMins;
    });

    for (const cc of [...sortedColors].reverse()) {
      const [mins] = cc.minutes.split(':').map(Number);
      if (elapsed >= mins) {
        return { color: cc.color, isFullBackground: cc.isFullBackground };
      }
    }
    return { color: sortedColors[0]?.color || '#4CAF50', isFullBackground: false };
  };

  // Formatear tiempo transcurrido
  const formatElapsedTime = (createdAt: Date): string => {
    const elapsed = Math.floor((currentTime.getTime() - createdAt.getTime()) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calcular columnas con split
  const displayColumns = useMemo((): ColumnCard[] => {
    const columns: ColumnCard[] = [];
    const maxItemsPerColumn = 5; // Para el preview usamos un límite menor

    for (const order of orders) {
      if (columns.length >= config.columnsPerScreen) break;

      const needsSplit = config.screenSplit && order.items.length > maxItemsPerColumn;

      if (!needsSplit) {
        columns.push({
          order,
          items: order.items,
          partNumber: 1,
          totalParts: 1,
          isFirstPart: true,
          isLastPart: true,
        });
      } else {
        const totalParts = Math.ceil(order.items.length / maxItemsPerColumn);
        for (let i = 0; i < totalParts && columns.length < config.columnsPerScreen; i++) {
          columns.push({
            order,
            items: order.items.slice(i * maxItemsPerColumn, (i + 1) * maxItemsPerColumn),
            partNumber: i + 1,
            totalParts,
            isFirstPart: i === 0,
            isLastPart: i === totalParts - 1,
          });
        }
      }
    }
    return columns;
  }, [orders, config.screenSplit, config.columnsPerScreen]);

  // Renderizar una columna/tarjeta
  const renderColumn = (column: ColumnCard) => {
    const { order, items, isFirstPart, isLastPart, totalParts } = column;
    const timeInfo = getTimeColor(order.createdAt);
    const channelColor = defaultChannelColors[order.channel] || '#4a90e2';
    const isSplit = totalParts > 1;

    return (
      <div
        key={`${order.id}-${column.partNumber}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            background: config.cardColor,
            border: `2px solid ${timeInfo.color}`,
            borderTop: !isFirstPart && isSplit ? 'none' : `2px solid ${timeInfo.color}`,
            borderBottom: !isLastPart && isSplit ? 'none' : `2px solid ${timeInfo.color}`,
            borderRadius: isSplit
              ? isFirstPart ? '6px 6px 0 0' : isLastPart ? '0 0 6px 6px' : '0'
              : '6px',
            overflow: 'hidden',
            boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
            minHeight: 0,
            clipPath: isSplit
              ? isFirstPart
                ? getClipPathBottom()
                : isLastPart
                  ? getClipPathTop()
                  : undefined
              : undefined,
            paddingBottom: !isLastPart && isSplit ? '6px' : undefined,
            paddingTop: !isFirstPart && isSplit ? '6px' : undefined,
          }}
        >
          {/* Header - Solo en primera parte */}
          {isFirstPart && config.showHeader && (
            <>
              {/* Número de orden y tiempo */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: timeInfo.color,
                  padding: '4px 8px',
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    color: config.headerTextColorCustom,
                    fontFamily: config.headerFontFamily,
                    fontWeight: getFontWeight(config.headerFontWeight),
                    fontStyle: getFontStyle(config.headerFontStyle),
                    fontSize: getFontSize(config.headerFontSize, 'header'),
                  }}
                >
                  {config.showOrderNumber && pref.showIdentifier && `${pref.identifierMessage} #${order.identifier}`}
                </span>
                {config.showTimer && (
                  <span
                    style={{
                      color: config.timerTextColor,
                      fontFamily: config.timerFontFamily,
                      fontWeight: getFontWeight(config.timerFontWeight),
                      fontStyle: getFontStyle(config.timerFontStyle),
                      fontSize: getFontSize(config.timerFontSize, 'timer'),
                    }}
                  >
                    {formatElapsedTime(order.createdAt)}
                  </span>
                )}
              </div>

              {/* Cliente */}
              {pref.showName && order.customerName && config.showClient && (
                <div
                  style={{
                    background: timeInfo.color,
                    padding: '0 8px 4px 8px',
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      color: config.clientTextColor,
                      fontFamily: config.clientFontFamily,
                      fontWeight: getFontWeight(config.clientFontWeight),
                      fontStyle: getFontStyle(config.clientFontStyle),
                      fontSize: getFontSize(config.clientFontSize, 'client'),
                    }}
                  >
                    {order.customerName}
                  </span>
                </div>
              )}
            </>
          )}

          {/* Items */}
          <div
            style={{
              flex: 1,
              padding: '6px 8px',
              overflowY: 'auto',
              overflowX: 'hidden',
              minHeight: 0,
            }}
          >
            {items.map((item, i) => (
              <div key={i} style={{ padding: '2px 0' }}>
                {/* Cantidad y Producto */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                  {config.showQuantity && (
                    <span
                      style={{
                        color: config.quantityTextColor || timeInfo.color,
                        fontFamily: config.quantityFontFamily,
                        fontWeight: getFontWeight(config.quantityFontWeight),
                        fontStyle: getFontStyle(config.quantityFontStyle),
                        fontSize: getFontSize(config.quantityFontSize, 'quantity'),
                        flexShrink: 0,
                      }}
                    >
                      {item.quantity}x
                    </span>
                  )}
                  <span
                    style={{
                      color: config.productTextColor || config.textColor,
                      fontFamily: config.productFontFamily,
                      fontWeight: getFontWeight(config.productFontWeight),
                      fontStyle: getFontStyle(config.productFontStyle),
                      fontSize: getFontSize(config.productFontSize, 'product'),
                      lineHeight: 1.2,
                      textTransform: config.productUppercase ? 'uppercase' : 'none',
                    }}
                  >
                    {item.name}
                  </span>
                </div>

                {/* Subitems */}
                {config.showSubitems && item.subitems && item.subitems.length > 0 && (
                  <div style={{ paddingLeft: `${config.subitemIndent}px`, marginTop: '1px' }}>
                    {item.subitems.map((subitem, si) => (
                      <div
                        key={si}
                        style={{
                          fontFamily: config.subitemFontFamily,
                          fontWeight: getFontWeight(config.subitemFontWeight),
                          fontStyle: getFontStyle(config.subitemFontStyle),
                          fontSize: getFontSize(config.subitemFontSize, 'subitem'),
                          color: config.subitemTextColor,
                          lineHeight: 1.3,
                        }}
                      >
                        {subitem.quantity}x {subitem.name}
                      </div>
                    ))}
                  </div>
                )}

                {/* Modificadores */}
                {config.showModifiers && item.modifier && (
                  <div style={{ paddingLeft: `${config.modifierIndent}px`, marginTop: '1px' }}>
                    {item.modifier.split(',').map((mod, mi) => (
                      <div
                        key={mi}
                        style={{
                          fontFamily: config.modifierFontFamily,
                          fontWeight: getFontWeight(config.modifierFontWeight),
                          fontStyle: getFontStyle(config.modifierFontStyle),
                          fontSize: getFontSize(config.modifierFontSize, 'modifier'),
                          color: config.modifierFontColor,
                          lineHeight: 1.3,
                        }}
                      >
                        {mod.trim()}
                      </div>
                    ))}
                  </div>
                )}

                {/* Notas */}
                {config.showNotes && item.notes && (
                  <div
                    style={{
                      paddingLeft: `${config.notesIndent}px`,
                      marginTop: '1px',
                      fontFamily: config.notesFontFamily,
                      fontWeight: getFontWeight(config.notesFontWeight),
                      fontStyle: getFontStyle(config.notesFontStyle),
                      fontSize: getFontSize(config.notesFontSize, 'notes'),
                      color: config.notesTextColor,
                    }}
                  >
                    * {item.notes}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer con canal - Solo en última parte */}
          {isLastPart && config.showChannel && (
            <div
              style={{
                display: 'flex',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  flex: 1,
                  background: channelColor,
                  padding: '4px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span
                  style={{
                    color: config.channelTextColor,
                    fontFamily: config.channelFontFamily,
                    fontWeight: getFontWeight(config.channelFontWeight),
                    fontStyle: getFontStyle(config.channelFontStyle),
                    fontSize: getFontSize(config.channelFontSize, 'channel'),
                    textTransform: config.channelUppercase ? 'uppercase' : 'none',
                  }}
                >
                  {order.channel}
                </span>
              </div>
            </div>
          )}

          {/* Footer "Final" en splits */}
          {isLastPart && isSplit && (
            <div
              style={{
                padding: '3px 8px',
                textAlign: 'center',
                borderTop: `1px solid ${isDark ? '#3a3a3a' : '#e0e0e0'}`,
                flexShrink: 0,
              }}
            >
              <span style={{ color: timeInfo.color, fontSize: '9px', fontWeight: 'bold' }}>
                Final
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        background: config.backgroundColor,
        padding: '8px',
        borderRadius: '8px',
        height: '500px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header pantalla */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '4px 10px',
          background: config.headerColor,
          borderRadius: '4px',
          marginBottom: '8px',
          flexShrink: 0,
        }}
      >
        <span style={{ color: config.headerTextColor, fontWeight: 'bold', fontSize: '11px' }}>
          {config.screenName}
        </span>
        {pref.sourceBoxActive && (
          <Badge count={pref.sourceBoxMessage} style={{ backgroundColor: config.accentColor }} />
        )}
        <span style={{ color: config.headerTextColor, opacity: 0.8, fontSize: '10px' }}>
          {currentTime.toLocaleTimeString()}
        </span>
      </div>

      {/* Grid de columnas */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: `repeat(${config.columnsPerScreen}, 1fr)`,
          gap: '6px',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        {displayColumns.map((col) => renderColumn(col))}

        {/* Columnas vacías */}
        {Array.from({ length: config.columnsPerScreen - displayColumns.length }).map((_, i) => (
          <div
            key={`empty-${i}`}
            style={{
              background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              borderRadius: '6px',
              border: `1px dashed ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
              fontSize: '10px',
            }}
          >
            Sin orden
          </div>
        ))}
      </div>

      {/* Leyenda de colores SLA */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '12px',
          marginTop: '8px',
          flexShrink: 0,
        }}
      >
        {config.cardColors.map((cc, i) => (
          <Space key={i} size={2}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: cc.color }} />
            <span style={{ color: isDark ? '#888' : '#666', fontSize: '9px' }}>{cc.minutes}</span>
          </Space>
        ))}
      </div>
    </div>
  );
}
