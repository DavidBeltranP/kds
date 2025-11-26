import { useMemo } from 'react';
import { Badge, Space } from 'antd';

interface OrderItem {
  name: string;
  quantity: number;
  modifier?: string;
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
  headerFontFamily?: string;
  headerFontSize?: string;
  headerShowChannel?: boolean;
  headerShowTime?: boolean;
  productFontFamily?: string;
  productFontSize?: string;
  productFontWeight?: string;
  modifierFontFamily?: string;
  modifierFontSize?: string;
  modifierFontColor?: string;
  modifierFontStyle?: string;
  columnsPerScreen?: number;
  screenName?: string;
  screenSplit?: boolean;
  maxItemsPerColumn?: number;
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

// Ordenes de ejemplo - una orden larga para demostrar el split
const sampleOrders: PreviewOrder[] = [
  {
    id: '1',
    identifier: '3005',
    channel: 'Local',
    customerName: 'Juan Perez',
    items: [
      { name: 'Pollo Original 8pcs', quantity: 2 },
      { name: 'Papas Grandes', quantity: 2, modifier: 'Extra sal' },
      { name: 'Coca-Cola 500ml', quantity: 2, modifier: 'Sin hielo' },
      { name: 'Alitas BBQ x12', quantity: 1, modifier: 'Picante' },
      { name: 'Ensalada Coleslaw', quantity: 1 },
      { name: 'Sundae Chocolate', quantity: 2 },
      { name: 'Limonada Grande', quantity: 1, modifier: 'Sin azucar' },
      { name: 'Pan de Ajo', quantity: 2 },
      { name: 'Nuggets x20', quantity: 1, modifier: 'Con BBQ' },
      { name: 'Twister Supreme', quantity: 2 },
    ],
    createdAt: new Date(Date.now() - 30000),
    status: 'PENDING',
  },
  {
    id: '2',
    identifier: '3006',
    channel: 'PedidosYa',
    customerName: 'Maria Lopez',
    items: [
      { name: 'Big Box Familiar', quantity: 1, modifier: 'Sin ensalada' },
      { name: 'Twister Clasico', quantity: 2, modifier: 'Sin cebolla' },
    ],
    createdAt: new Date(Date.now() - 180000),
    status: 'PENDING',
  },
  {
    id: '3',
    identifier: '3007',
    channel: 'RAPPI',
    customerName: 'Carlos Ruiz',
    items: [
      { name: 'Combo Mega Box', quantity: 1 },
      { name: 'Nuggets x20', quantity: 1, modifier: 'Con BBQ' },
      { name: 'Helado Vainilla', quantity: 2 },
    ],
    createdAt: new Date(Date.now() - 300000),
    status: 'PENDING',
  },
  {
    id: '4',
    identifier: '3008',
    channel: 'Drive',
    customerName: 'Ana Torres',
    items: [
      { name: 'Twister Supreme', quantity: 2 },
      { name: 'Papas Medianas', quantity: 2 },
    ],
    createdAt: new Date(Date.now() - 420000),
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

const getFontSize = (size?: string, type: 'header' | 'product' | 'modifier' = 'product'): string => {
  const sizes: Record<string, Record<string, string>> = {
    header: { small: '10px', medium: '11px', large: '12px', xlarge: '14px' },
    product: { small: '10px', medium: '11px', large: '12px', xlarge: '14px' },
    modifier: { xsmall: '8px', small: '9px', medium: '10px', large: '11px' },
  };
  return sizes[type][size || 'medium'] || sizes[type].medium;
};

const getFontWeight = (weight?: string): number => {
  const weights: Record<string, number> = { normal: 400, medium: 500, semibold: 600, bold: 700 };
  return weights[weight || 'bold'] || 700;
};

// Clip-path para efecto de papel rasgado suave en el borde inferior
const getClipPathBottom = () =>
  'polygon(0% 0%, 100% 0%, 100% calc(100% - 10px), 97% calc(100% - 6px), 94% calc(100% - 9px), 91% calc(100% - 4px), 88% calc(100% - 8px), 85% calc(100% - 5px), 82% calc(100% - 10px), 79% calc(100% - 6px), 76% calc(100% - 8px), 73% calc(100% - 3px), 70% calc(100% - 7px), 67% calc(100% - 5px), 64% calc(100% - 9px), 61% calc(100% - 6px), 58% calc(100% - 8px), 55% calc(100% - 4px), 52% calc(100% - 9px), 49% calc(100% - 5px), 46% calc(100% - 10px), 43% calc(100% - 6px), 40% calc(100% - 8px), 37% calc(100% - 3px), 34% calc(100% - 7px), 31% calc(100% - 5px), 28% calc(100% - 9px), 25% calc(100% - 6px), 22% calc(100% - 8px), 19% calc(100% - 4px), 16% calc(100% - 8px), 13% calc(100% - 5px), 10% calc(100% - 10px), 7% calc(100% - 6px), 4% calc(100% - 8px), 0% calc(100% - 5px))';

// Clip-path para efecto de papel rasgado suave en el borde superior de la tarjeta
const getClipPathTop = () =>
  'polygon(0% 5px, 3% 8px, 6% 4px, 9% 9px, 12% 6px, 15% 3px, 18% 7px, 21% 5px, 24% 10px, 27% 6px, 30% 8px, 33% 3px, 36% 7px, 39% 5px, 42% 9px, 45% 6px, 48% 4px, 51% 8px, 54% 5px, 57% 9px, 60% 6px, 63% 10px, 66% 4px, 69% 7px, 72% 5px, 75% 8px, 78% 3px, 81% 6px, 84% 9px, 87% 5px, 90% 8px, 93% 4px, 96% 7px, 100% 5px, 100% 100%, 0% 100%)';

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
  const {
    backgroundColor = '#f0f2f5',
    cardColor = '#ffffff',
    textColor = '#1a1a2e',
    accentColor = '#e94560',
    headerColor = '#1a1a2e',
    headerTextColor = '#ffffff',
    headerFontFamily = 'Inter, sans-serif',
    headerFontSize = 'medium',
    headerShowTime = true,
    productFontFamily = 'Inter, sans-serif',
    productFontSize = 'medium',
    productFontWeight = 'bold',
    modifierFontFamily = 'Inter, sans-serif',
    modifierFontSize = 'small',
    modifierFontColor = '#666666',
    modifierFontStyle = 'italic',
    columnsPerScreen = 4,
    screenName = 'PREVIEW',
    screenSplit = true,
    maxItemsPerColumn = 6,
    cardColors = [
      { color: '#4CAF50', minutes: '01:00', order: 1, isFullBackground: false },
      { color: '#FFC107', minutes: '02:00', order: 2, isFullBackground: false },
      { color: '#FF5722', minutes: '03:00', order: 3, isFullBackground: false },
      { color: '#f44336', minutes: '04:00', order: 4, isFullBackground: true },
    ],
  } = appearance;

  const {
    showClientData = true,
    showName = true,
    showIdentifier = true,
    identifierMessage = 'Orden',
    sourceBoxActive = true,
    sourceBoxMessage = 'KDS',
  } = preference;

  const isDark = parseInt(backgroundColor?.replace('#', '') || 'ffffff', 16) < 0x808080;

  const getTimeColor = (createdAt: Date): string => {
    const elapsed = (Date.now() - createdAt.getTime()) / 1000 / 60;
    for (const cc of [...cardColors].sort((a, b) => a.order - b.order)) {
      const [mins] = cc.minutes.split(':').map(Number);
      if (elapsed < mins) return cc.color;
    }
    return cardColors[cardColors.length - 1]?.color || '#f44336';
  };

  const formatTime = (date: Date): string => {
    const elapsed = Math.floor((Date.now() - date.getTime()) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calcular columnas - divide ordenes largas si screenSplit está activo
  const displayColumns = useMemo((): ColumnCard[] => {
    const columns: ColumnCard[] = [];

    for (const order of orders) {
      if (columns.length >= columnsPerScreen) break;

      const needsSplit = screenSplit && order.items.length > maxItemsPerColumn;

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
        for (let i = 0; i < totalParts && columns.length < columnsPerScreen; i++) {
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
  }, [orders, screenSplit, columnsPerScreen, maxItemsPerColumn]);

  const renderColumn = (column: ColumnCard, idx: number) => {
    const { order, items, isFirstPart, isLastPart, totalParts } = column;
    const timeColor = getTimeColor(order.createdAt);
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
            background: cardColor,
            border: `2px solid ${timeColor}`,
            borderTop: !isFirstPart && isSplit ? 'none' : `2px solid ${timeColor}`,
            borderBottom: !isLastPart && isSplit ? 'none' : `2px solid ${timeColor}`,
            borderRadius: isSplit
              ? isFirstPart ? '6px 6px 0 0' : isLastPart ? '0 0 6px 6px' : '0'
              : '6px',
            overflow: 'hidden',
            boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
            minHeight: 0,
            // Aplicar clip-path para efecto rasgado
            clipPath: isSplit
              ? isFirstPart
                ? getClipPathBottom()  // Primera parte: rasgado abajo
                : isLastPart
                  ? getClipPathTop()   // Última parte: rasgado arriba
                  : undefined          // Parte media: ambos (no implementado)
              : undefined,
            // Agregar padding inferior para compensar el clip en primera parte
            paddingBottom: !isLastPart && isSplit ? '8px' : undefined,
            // Agregar padding superior para compensar el clip en continuación
            paddingTop: !isFirstPart && isSplit ? '8px' : undefined,
          }}
        >
          {/* Header con canal y orden - SOLO en primera parte */}
          {isFirstPart && (
            <>
              {/* Barra superior roja con ticket y tiempo */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: timeColor,
                  padding: '4px 8px',
                  flexShrink: 0,
                }}
              >
                <span style={{ color: '#fff', fontWeight: 'bold', fontSize: getFontSize(headerFontSize, 'header') }}>
                  {identifierMessage} #{order.identifier}
                </span>
                <span style={{ color: '#fff', fontWeight: 'bold', fontSize: getFontSize(headerFontSize, 'header') }}>
                  {formatTime(order.createdAt)}
                </span>
              </div>

              {/* Cliente si existe */}
              {showClientData && showName && order.customerName && (
                <div
                  style={{
                    background: timeColor,
                    padding: '0 8px 4px 8px',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ color: '#fff', fontSize: '9px' }}>
                    {order.customerName}
                  </span>
                </div>
              )}

              {/* Barra de canal dividida */}
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
                    padding: '3px 8px',
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                  }}
                >
                  {order.channel}
                </div>
                <div
                  style={{
                    flex: 1,
                    background: channelColor,
                    padding: '3px 8px',
                    color: '#fff',
                    fontSize: '9px',
                    textAlign: 'right',
                    borderLeft: '1px solid rgba(255,255,255,0.3)',
                  }}
                >
                  {order.channel}
                </div>
              </div>
            </>
          )}

          {/* Items */}
          <div style={{ flex: 1, padding: '6px 8px', overflow: 'hidden', minHeight: 0 }}>
            {items.map((item, i) => (
              <div
                key={i}
                style={{
                  padding: '2px 0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                  <span
                    style={{
                      color: timeColor,
                      fontSize: getFontSize(productFontSize, 'product'),
                      fontWeight: 'bold',
                      flexShrink: 0,
                    }}
                  >
                    {item.quantity}x
                  </span>
                  <span
                    style={{
                      color: textColor,
                      fontSize: getFontSize(productFontSize, 'product'),
                      fontFamily: productFontFamily,
                      fontWeight: getFontWeight(productFontWeight),
                      lineHeight: 1.2,
                      textTransform: 'uppercase',
                    }}
                  >
                    {item.name}
                  </span>
                </div>
                {item.modifier && (
                  <div
                    style={{
                      fontSize: getFontSize(modifierFontSize, 'modifier'),
                      fontFamily: modifierFontFamily,
                      fontStyle: modifierFontStyle as React.CSSProperties['fontStyle'],
                      color: modifierFontColor,
                      paddingLeft: '20px',
                      marginTop: '1px',
                    }}
                  >
                    {item.modifier}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer "Final" - SOLO en última parte de split */}
          {isLastPart && isSplit && (
            <div
              style={{
                padding: '4px 8px',
                textAlign: 'center',
                borderTop: `1px solid ${isDark ? '#3a3a3a' : '#e0e0e0'}`,
                flexShrink: 0,
              }}
            >
              <span style={{ color: timeColor, fontSize: '11px', fontWeight: 'bold' }}>
                Final
              </span>
            </div>
          )}

          {/* Footer con timer - SOLO en última parte si NO es split */}
          {isLastPart && !isSplit && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: timeColor,
                padding: '4px 8px',
                flexShrink: 0,
              }}
            >
              <span style={{ color: '#fff', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '11px' }}>
                {formatTime(order.createdAt)}
              </span>
              <span style={{ color: '#fff', fontSize: '9px' }}>
                {order.items.length} items
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
        background: backgroundColor,
        padding: '8px',
        borderRadius: '8px',
        height: '480px',
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
          background: headerColor,
          borderRadius: '4px',
          marginBottom: '8px',
          flexShrink: 0,
        }}
      >
        <span style={{ color: headerTextColor, fontWeight: 'bold', fontFamily: headerFontFamily, fontSize: '12px' }}>
          {screenName}
        </span>
        {sourceBoxActive && <Badge count={sourceBoxMessage} style={{ backgroundColor: accentColor }} />}
        {headerShowTime && (
          <span style={{ color: headerTextColor, opacity: 0.8, fontFamily: headerFontFamily, fontSize: '10px' }}>
            {new Date().toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Grid de columnas */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: `repeat(${columnsPerScreen}, 1fr)`,
          gap: '6px',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        {displayColumns.map((col, idx) => renderColumn(col, idx))}

        {/* Columnas vacias */}
        {Array.from({ length: columnsPerScreen - displayColumns.length }).map((_, i) => (
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

      {/* Leyenda */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '12px',
          marginTop: '8px',
          flexShrink: 0,
        }}
      >
        {cardColors.map((cc, i) => (
          <Space key={i} size={2}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: cc.color }} />
            <span style={{ color: isDark ? '#888' : '#666', fontSize: '9px' }}>{cc.minutes}</span>
          </Space>
        ))}
      </div>
    </div>
  );
}
