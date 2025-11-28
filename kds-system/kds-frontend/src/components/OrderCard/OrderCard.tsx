import { useEffect, useState } from 'react';
import type { Order, OrderItem, CardColor, ChannelColor } from '../../types';
import { getElapsedTime, getColorForTime } from '../../utils/timeUtils';

interface OrderCardProps {
  order: Order;
  items: OrderItem[];
  index: number;
  partNumber: number;
  totalParts: number;
  isFirstPart: boolean;
  isLastPart: boolean;
  cardColors: CardColor[];
  channelColors: ChannelColor[];
  showIdentifier: boolean;
  identifierMessage: string;
  showName: boolean;
  fontSize: string;
  // Props de apariencia
  cardColor?: string;
  textColor?: string;
  headerTextColor?: string;
  accentColor?: string;
  productFontFamily?: string;
  productFontSize?: string;
  productFontWeight?: string;
  modifierFontFamily?: string;
  modifierFontSize?: string;
  modifierFontColor?: string;
  modifierFontStyle?: string;
  showTimer?: boolean;
  showOrderNumber?: boolean;
  headerFontSize?: string;
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

const getFontSize = (size?: string, type: 'header' | 'product' | 'modifier' = 'product'): string => {
  const sizes: Record<string, Record<string, string>> = {
    header: { small: '12px', medium: '14px', large: '16px', xlarge: '20px', xxlarge: '24px' },
    product: { small: '12px', medium: '14px', large: '16px', xlarge: '20px', xxlarge: '24px' },
    modifier: { xsmall: '10px', small: '11px', medium: '12px', large: '14px', xlarge: '16px', xxlarge: '18px' },
  };
  return sizes[type][size || 'medium'] || sizes[type].medium;
};

const getFontWeight = (weight?: string): number => {
  const weights: Record<string, number> = { normal: 400, medium: 500, semibold: 600, bold: 700 };
  return weights[weight || 'bold'] || 700;
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
  index,
  partNumber: _partNumber,
  totalParts,
  isFirstPart,
  isLastPart,
  cardColors,
  channelColors,
  showIdentifier,
  identifierMessage,
  showName,
  cardColor = '#ffffff',
  textColor = '#1a1a2e',
  productFontFamily = 'Inter, sans-serif',
  productFontSize = 'medium',
  productFontWeight = 'bold',
  modifierFontFamily = 'Inter, sans-serif',
  modifierFontSize = 'small',
  modifierFontColor = '#888888',
  modifierFontStyle = 'normal',
  showTimer = true,
  showOrderNumber = true,
  headerFontSize = 'medium',
  onFinish,
  touchEnabled = false,
}: OrderCardProps) {
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

  // Obtener color del canal
  const channelKey = order.channel.toLowerCase();
  const channelColor =
    channelColors.find(
      (c) => c.channel.toLowerCase() === channelKey
    )?.color || defaultChannelColors[channelKey] || '#4a90e2';

  // Tecla para finalizar (solo en primera parte)
  // Mostramos los equivalentes visuales de la botonera (1, 2, 3, 4, 5)
  const finishKey = isFirstPart ? (['1', '2', '3', '4', '5'][index] || '') : '';

  const isSplit = totalParts > 1;

  // Determinar clip-path para efecto de papel rasgado
  const getClipPath = () => {
    if (!isSplit) return undefined;
    if (isFirstPart && !isLastPart) return getClipPathBottom();
    if (isLastPart && !isFirstPart) return getClipPathTop();
    // Partes intermedias (ni primera ni última) - rasgado en ambos bordes
    if (!isFirstPart && !isLastPart) return getClipPathBoth();
    return undefined;
  };

  // Handler para touch/click - solo en la primera parte de la orden
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
        {isFirstPart && (
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
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: getFontSize(headerFontSize, 'header'),
                }}
              >
                {showOrderNumber && showIdentifier && `${identifierMessage} #${order.identifier}`}
              </span>
              {showTimer && (
                <span
                  style={{
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: getFontSize(headerFontSize, 'header'),
                    fontFamily: 'monospace',
                  }}
                >
                  {elapsedTime.formatted}
                </span>
              )}
            </div>

            {/* Cliente */}
            {showName && order.customerName && (
              <div
                style={{
                  background: timeColor.color,
                  padding: '0 12px 6px 12px',
                  flexShrink: 0,
                }}
              >
                <span style={{ color: '#fff', fontSize: '12px' }}>
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
                  padding: '6px 12px',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  textTransform: 'uppercase',
                }}
              >
                {order.channel}
              </div>
              <div
                style={{
                  flex: 1,
                  background: channelColor,
                  padding: '6px 12px',
                  color: '#fff',
                  fontSize: '11px',
                  textAlign: 'right',
                  borderLeft: '1px solid rgba(255,255,255,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '8px',
                }}
              >
                <span>{order.channel}</span>
                {finishKey && (
                  <span
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                    }}
                  >
                    [{finishKey}]
                  </span>
                )}
              </div>
            </div>
          </>
        )}

        {/* Items - sin scroll, se divide la orden si no cabe */}
        <div
          style={{
            flex: 1,
            padding: '10px 12px',
            overflow: 'hidden',
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
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                <span
                  style={{
                    color: timeColor.color,
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
                    lineHeight: 1.3,
                    textTransform: 'uppercase',
                  }}
                >
                  {item.name}
                </span>
              </div>
              {item.modifier && (
                <div
                  style={{
                    paddingLeft: '24px',
                    marginTop: '2px',
                  }}
                >
                  {item.modifier.split(',').map((mod, modIndex) => (
                    <div
                      key={modIndex}
                      style={{
                        fontSize: getFontSize(modifierFontSize, 'modifier'),
                        fontFamily: modifierFontFamily,
                        fontStyle: modifierFontStyle as React.CSSProperties['fontStyle'],
                        color: modifierFontColor,
                        lineHeight: 1.4,
                      }}
                    >
                      {mod.trim()}
                    </div>
                  ))}
                </div>
              )}
              {item.notes && (
                <div
                  style={{
                    fontSize: getFontSize(modifierFontSize, 'modifier'),
                    fontStyle: 'italic',
                    color: '#ff9800',
                    paddingLeft: '24px',
                    marginTop: '2px',
                  }}
                >
                  * {item.notes}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer "Final" - Solo en última parte de split */}
        {isLastPart && isSplit && (
          <div
            style={{
              padding: '8px 12px',
              textAlign: 'center',
              borderTop: '1px solid #e0e0e0',
              flexShrink: 0,
            }}
          >
            <span style={{ color: timeColor.color, fontSize: '12px', fontWeight: 'bold' }}>
              Final
            </span>
          </div>
        )}

        {/* Footer con timer - Solo si NO es split */}
        {isLastPart && !isSplit && showTimer && (
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
                color: '#fff',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                fontSize: '16px',
              }}
            >
              {elapsedTime.formatted}
            </span>
            <span style={{ color: '#fff', fontSize: '12px' }}>
              {order.items.length} items
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
