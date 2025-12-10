import { useEffect, useState } from 'react';
import type { Order, OrderItem, CardColor, ChannelColor, AppearanceConfig } from '../../types';
import { getElapsedTime, getColorForTime } from '../../utils/timeUtils';

interface OrderCardProps {
  order: Order;
  items: OrderItem[];
  index: number;
  partNumber: number;
  totalParts: number;
  isFirstPart: boolean;
  isLastPart: boolean;
  // Appearance config completa (preferido)
  appearance?: Partial<AppearanceConfig>;
  // Props legacy (para compatibilidad)
  cardColors?: CardColor[];
  channelColors?: ChannelColor[];
  showIdentifier?: boolean;
  identifierMessage?: string;
  showName?: boolean;
  // Touch/Click handler
  onFinish?: (orderId: string) => void;
  touchEnabled?: boolean;
}

// Colores por defecto de canales
const defaultChannelColors: Record<string, string> = {
  'local': '#7ed321',
  'kiosko-efectivo': '#0299d0',
  'kiosko-tarjeta': '#d0021b',
  'pedidosya': '#d0021b',
  'rappi': '#ff5a00',
  'drive': '#9b59b6',
  'app': '#bd10e0',
};

const getFontSize = (size?: string, type: 'header' | 'product' | 'modifier' | 'timer' | 'client' | 'quantity' | 'subitem' | 'notes' | 'channel' = 'product'): string => {
  const sizes: Record<string, Record<string, string>> = {
    header: { xsmall: '10px', small: '12px', medium: '14px', large: '16px', xlarge: '20px', xxlarge: '24px' },
    timer: { xsmall: '10px', small: '12px', medium: '14px', large: '16px', xlarge: '20px', xxlarge: '24px' },
    client: { xsmall: '10px', small: '11px', medium: '12px', large: '14px', xlarge: '16px', xxlarge: '18px' },
    quantity: { xsmall: '10px', small: '12px', medium: '14px', large: '16px', xlarge: '20px', xxlarge: '24px' },
    product: { xsmall: '10px', small: '12px', medium: '14px', large: '16px', xlarge: '20px', xxlarge: '24px' },
    subitem: { xsmall: '9px', small: '10px', medium: '11px', large: '12px', xlarge: '14px', xxlarge: '16px' },
    modifier: { xsmall: '9px', small: '10px', medium: '11px', large: '12px', xlarge: '14px', xxlarge: '16px' },
    notes: { xsmall: '9px', small: '10px', medium: '11px', large: '12px', xlarge: '14px', xxlarge: '16px' },
    channel: { xsmall: '9px', small: '10px', medium: '11px', large: '12px', xlarge: '14px', xxlarge: '16px' },
  };
  return sizes[type]?.[size || 'medium'] || sizes[type]?.medium || '14px';
};

const getFontWeight = (weight?: string): number => {
  const weights: Record<string, number> = { normal: 400, medium: 500, semibold: 600, bold: 700 };
  return weights[weight || 'bold'] || 700;
};

const getFontStyle = (style?: string): React.CSSProperties['fontStyle'] => {
  if (style === 'italic') return 'italic';
  return 'normal';
};

// Clip-path para efecto de papel rasgado en el borde inferior (primera parte)
const getClipPathBottom = () =>
  'polygon(0% 0%, 100% 0%, 100% calc(100% - 10px), 97% calc(100% - 6px), 94% calc(100% - 9px), 91% calc(100% - 4px), 88% calc(100% - 8px), 85% calc(100% - 5px), 82% calc(100% - 10px), 79% calc(100% - 6px), 76% calc(100% - 8px), 73% calc(100% - 3px), 70% calc(100% - 7px), 67% calc(100% - 5px), 64% calc(100% - 9px), 61% calc(100% - 6px), 58% calc(100% - 8px), 55% calc(100% - 4px), 52% calc(100% - 9px), 49% calc(100% - 5px), 46% calc(100% - 10px), 43% calc(100% - 6px), 40% calc(100% - 8px), 37% calc(100% - 3px), 34% calc(100% - 7px), 31% calc(100% - 5px), 28% calc(100% - 9px), 25% calc(100% - 6px), 22% calc(100% - 8px), 19% calc(100% - 4px), 16% calc(100% - 8px), 13% calc(100% - 5px), 10% calc(100% - 10px), 7% calc(100% - 6px), 4% calc(100% - 8px), 0% calc(100% - 5px))';

// Clip-path para efecto de papel rasgado en el borde superior (última parte)
const getClipPathTop = () =>
  'polygon(0% 10px, 3% 6px, 6% 9px, 9% 4px, 12% 8px, 15% 5px, 18% 10px, 21% 6px, 24% 8px, 27% 3px, 30% 7px, 33% 5px, 36% 9px, 39% 6px, 42% 4px, 45% 8px, 48% 5px, 51% 9px, 54% 6px, 57% 10px, 60% 4px, 63% 7px, 66% 5px, 69% 8px, 72% 3px, 75% 6px, 78% 9px, 81% 5px, 84% 8px, 87% 4px, 90% 7px, 93% 6px, 96% 9px, 100% 5px, 100% 100%, 0% 100%)';

// Clip-path para efecto de papel rasgado en ambos bordes (partes intermedias)
const getClipPathBoth = () =>
  'polygon(0% 10px, 3% 6px, 6% 9px, 9% 4px, 12% 8px, 15% 5px, 18% 10px, 21% 6px, 24% 8px, 27% 3px, 30% 7px, 33% 5px, 36% 9px, 39% 6px, 42% 4px, 45% 8px, 48% 5px, 51% 9px, 54% 6px, 57% 10px, 60% 4px, 63% 7px, 66% 5px, 69% 8px, 72% 3px, 75% 6px, 78% 9px, 81% 5px, 84% 8px, 87% 4px, 90% 7px, 93% 6px, 96% 9px, 100% 5px, 100% calc(100% - 10px), 97% calc(100% - 6px), 94% calc(100% - 9px), 91% calc(100% - 4px), 88% calc(100% - 8px), 85% calc(100% - 5px), 82% calc(100% - 10px), 79% calc(100% - 6px), 76% calc(100% - 8px), 73% calc(100% - 3px), 70% calc(100% - 7px), 67% calc(100% - 5px), 64% calc(100% - 9px), 61% calc(100% - 6px), 58% calc(100% - 8px), 55% calc(100% - 4px), 52% calc(100% - 9px), 49% calc(100% - 5px), 46% calc(100% - 10px), 43% calc(100% - 6px), 40% calc(100% - 8px), 37% calc(100% - 3px), 34% calc(100% - 7px), 31% calc(100% - 5px), 28% calc(100% - 9px), 25% calc(100% - 6px), 22% calc(100% - 8px), 19% calc(100% - 4px), 16% calc(100% - 8px), 13% calc(100% - 5px), 10% calc(100% - 10px), 7% calc(100% - 6px), 4% calc(100% - 8px), 0% calc(100% - 5px))';

export function OrderCard({
  order,
  items,
  index: _index,
  partNumber: _partNumber,
  totalParts,
  isFirstPart,
  isLastPart,
  appearance = {},
  cardColors: legacyCardColors,
  channelColors: legacyChannelColors,
  showIdentifier = true,
  identifierMessage = 'Orden',
  showName = true,
  onFinish,
  touchEnabled = false,
}: OrderCardProps) {
  // Obtener cardColors y channelColors de appearance o legacy props
  const cardColors = appearance.cardColors || legacyCardColors || [];
  const channelColors = appearance.channelColors || legacyChannelColors || [];

  // Valores por defecto para colores de tarjeta
  const cardColor = appearance.cardColor || '#ffffff';
  const textColor = appearance.textColor || '#1a1a2e';

  const [elapsedTime, setElapsedTime] = useState(getElapsedTime(order.createdAt));
  const [timeColor, setTimeColor] = useState(() =>
    getColorForTime(order.createdAt, cardColors)
  );

  // Actualizar tiempo cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(getElapsedTime(order.createdAt));
      setTimeColor(getColorForTime(order.createdAt, cardColors));
    }, 1000);

    return () => clearInterval(interval);
  }, [order.createdAt, cardColors]);

  // Extraer configuraciones de appearance o usar valores default
  const config = {
    // Header
    headerFontFamily: appearance.headerFontFamily || 'Inter, sans-serif',
    headerFontSize: appearance.headerFontSize || 'medium',
    headerFontWeight: appearance.headerFontWeight || 'bold',
    headerFontStyle: appearance.headerFontStyle || 'normal',
    headerTextColor: appearance.headerTextColorCustom || '#ffffff',
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
    quantityTextColor: appearance.quantityTextColor || '', // Vacío = usa SLA color
    showQuantity: appearance.showQuantity !== false,

    // Product
    productFontFamily: appearance.productFontFamily || 'Inter, sans-serif',
    productFontSize: appearance.productFontSize || 'medium',
    productFontWeight: appearance.productFontWeight || 'bold',
    productFontStyle: appearance.productFontStyle || 'normal',
    productTextColor: appearance.productTextColor || textColor,
    productUppercase: appearance.productUppercase !== false,

    // Subitem
    subitemFontFamily: appearance.subitemFontFamily || 'Inter, sans-serif',
    subitemFontSize: appearance.subitemFontSize || 'small',
    subitemFontWeight: appearance.subitemFontWeight || 'normal',
    subitemFontStyle: appearance.subitemFontStyle || 'normal',
    subitemTextColor: appearance.subitemTextColor || '#333333',
    subitemIndent: appearance.subitemIndent || 24,
    showSubitems: appearance.showSubitems !== false,

    // Modifier (notas de contenido)
    modifierFontFamily: appearance.modifierFontFamily || 'Inter, sans-serif',
    modifierFontSize: appearance.modifierFontSize || 'small',
    modifierFontWeight: appearance.modifierFontWeight || 'normal',
    modifierFontStyle: appearance.modifierFontStyle || 'italic',
    modifierTextColor: appearance.modifierFontColor || '#666666',
    modifierIndent: appearance.modifierIndent || 24,
    showModifiers: appearance.showModifiers !== false,

    // Notes
    notesFontFamily: appearance.notesFontFamily || 'Inter, sans-serif',
    notesFontSize: appearance.notesFontSize || 'small',
    notesFontWeight: appearance.notesFontWeight || 'normal',
    notesFontStyle: appearance.notesFontStyle || 'italic',
    notesTextColor: appearance.notesTextColor || '#ff9800',
    notesIndent: appearance.notesIndent || 24,
    showNotes: appearance.showNotes !== false,

    // Channel
    channelFontFamily: appearance.channelFontFamily || 'Inter, sans-serif',
    channelFontSize: appearance.channelFontSize || 'small',
    channelFontWeight: appearance.channelFontWeight || 'bold',
    channelFontStyle: appearance.channelFontStyle || 'normal',
    channelTextColor: appearance.channelTextColor || '#ffffff',
    channelUppercase: appearance.channelUppercase !== false,
    showChannel: appearance.showChannel !== false,
  };

  // Obtener color del canal
  const channelKey = order.channel.toLowerCase();
  const channelColor =
    channelColors.find(
      (c) => c.channel.toLowerCase() === channelKey
    )?.color || defaultChannelColors[channelKey] || '#4a90e2';

  const isSplit = totalParts > 1;

  // Determinar clip-path para efecto de papel rasgado
  const getClipPath = () => {
    if (!isSplit) return undefined;
    if (isFirstPart && !isLastPart) return getClipPathBottom();
    if (isLastPart && !isFirstPart) return getClipPathTop();
    if (!isFirstPart && !isLastPart) return getClipPathBoth();
    return undefined;
  };

  // Handler para touch/click
  const handleClick = () => {
    if (touchEnabled && onFinish && isFirstPart) {
      onFinish(order.id);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        cursor: touchEnabled && isFirstPart ? 'pointer' : 'default',
      }}
      onClick={handleClick}
      onTouchEnd={(e) => {
        if (touchEnabled && isFirstPart) {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: cardColor,
          border: `3px solid ${timeColor.color}`,
          borderTop: !isFirstPart && isSplit ? 'none' : `3px solid ${timeColor.color}`,
          borderBottom: !isLastPart && isSplit ? 'none' : `3px solid ${timeColor.color}`,
          borderRadius: isSplit
            ? isFirstPart ? '8px 8px 0 0' : isLastPart ? '0 0 8px 8px' : '0'
            : '8px',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          minHeight: 0,
          clipPath: getClipPath(),
          paddingBottom: !isLastPart && isSplit ? '10px' : undefined,
          paddingTop: !isFirstPart && isSplit ? '10px' : undefined,
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
                background: timeColor.color,
                padding: '8px 12px',
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  color: config.headerTextColor,
                  fontFamily: config.headerFontFamily,
                  fontWeight: getFontWeight(config.headerFontWeight),
                  fontStyle: getFontStyle(config.headerFontStyle),
                  fontSize: getFontSize(config.headerFontSize, 'header'),
                }}
              >
                {config.showOrderNumber && showIdentifier && `${identifierMessage} #${order.identifier}`}
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
                  {elapsedTime.formatted}
                </span>
              )}
            </div>

            {/* Cliente */}
            {showName && order.customerName && config.showClient && (
              <div
                style={{
                  background: timeColor.color,
                  padding: '0 12px 6px 12px',
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

        {/* Items - con scroll como fallback si el contenido excede */}
        <div
          style={{
            flex: 1,
            padding: '10px 12px',
            overflowY: 'auto',
            overflowX: 'hidden',
            minHeight: 0,
          }}
        >
          {items.map((item, i) => (
            <div
              key={item.id || i}
              style={{
                padding: '4px 0',
              }}
            >
              {/* Cantidad y Producto */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                {/* Cantidad (5x) */}
                {config.showQuantity && (
                  <span
                    style={{
                      color: config.quantityTextColor || timeColor.color,
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
                {/* Nombre del producto */}
                <span
                  style={{
                    color: config.productTextColor || textColor,
                    fontFamily: config.productFontFamily,
                    fontWeight: getFontWeight(config.productFontWeight),
                    fontStyle: getFontStyle(config.productFontStyle),
                    fontSize: getFontSize(config.productFontSize, 'product'),
                    lineHeight: 1.3,
                    textTransform: config.productUppercase ? 'uppercase' : 'none',
                  }}
                >
                  {item.name}
                </span>
              </div>

              {/* Subitems (1x Pepsi, 1x Crispy) - del campo subitems si existe */}
              {config.showSubitems && 'subitems' in item && Array.isArray((item as unknown as { subitems: Array<{ name: string; quantity: number }> }).subitems) && (
                <div style={{ paddingLeft: `${config.subitemIndent}px`, marginTop: '2px' }}>
                  {((item as unknown as { subitems: Array<{ name: string; quantity: number }> }).subitems).map((subitem, subIndex) => (
                    <div
                      key={subIndex}
                      style={{
                        fontFamily: config.subitemFontFamily,
                        fontWeight: getFontWeight(config.subitemFontWeight),
                        fontStyle: getFontStyle(config.subitemFontStyle),
                        fontSize: getFontSize(config.subitemFontSize, 'subitem'),
                        color: config.subitemTextColor,
                        lineHeight: 1.4,
                      }}
                    >
                      {subitem.quantity}x {subitem.name}
                    </div>
                  ))}
                </div>
              )}

              {/* Modificadores/Contenido (notas del producto) */}
              {config.showModifiers && item.modifier && (
                <div
                  style={{
                    paddingLeft: `${config.modifierIndent}px`,
                    marginTop: '2px',
                  }}
                >
                  {item.modifier.split(',').map((mod, modIndex) => (
                    <div
                      key={modIndex}
                      style={{
                        fontFamily: config.modifierFontFamily,
                        fontWeight: getFontWeight(config.modifierFontWeight),
                        fontStyle: getFontStyle(config.modifierFontStyle),
                        fontSize: getFontSize(config.modifierFontSize, 'modifier'),
                        color: config.modifierTextColor,
                        lineHeight: 1.4,
                      }}
                    >
                      {mod.trim()}
                    </div>
                  ))}
                </div>
              )}

              {/* Notas especiales */}
              {config.showNotes && item.notes && (
                <div
                  style={{
                    paddingLeft: `${config.notesIndent}px`,
                    marginTop: '2px',
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

        {/* Footer con canal */}
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
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
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
                {order.channelType && (
                  <span
                    style={{
                      marginLeft: '8px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: order.channelType === 'LLEVAR' ? '#e74c3c' : '#27ae60',
                      color: '#fff',
                      fontSize: '0.85em',
                      fontWeight: 'bold',
                    }}
                  >
                    {order.channelType}
                  </span>
                )}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
