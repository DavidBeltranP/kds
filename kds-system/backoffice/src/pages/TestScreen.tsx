import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Spin, message } from 'antd';
import { mirrorApi, screensApi } from '../services/api';

interface OrderItem {
  name: string;
  quantity: number;
  modifier?: string;
  notes?: string;
  subitems?: Array<{ name: string; quantity: number }>;
}

interface MirrorOrder {
  id: string;
  externalId: string;
  identifier: string;
  channel: string;
  customerName?: string;
  status: 'PENDING' | 'FINISHED';
  createdAt: string;
  queue: string;
  screen: string;
  items: {
    id: string;
    name: string;
    quantity: number;
    notes?: string;
    subitems?: { name: string; quantity: number }[];
  }[];
}

interface CardColorConfig {
  id?: string;
  color: string;
  minutes: string;
  order: number;
  isFullBackground: boolean;
}

interface ScreenConfig {
  appearance: {
    backgroundColor?: string;
    cardColor?: string;
    textColor?: string;
    accentColor?: string;
    headerColor?: string;
    headerTextColor?: string;
    headerFontFamily?: string;
    headerFontSize?: string;
    headerFontWeight?: string;
    headerFontStyle?: string;
    showTimer?: boolean;
    showOrderNumber?: boolean;
    headerShowChannel?: boolean;
    timerFontFamily?: string;
    timerFontSize?: string;
    timerFontWeight?: string;
    timerTextColor?: string;
    productFontFamily?: string;
    productFontSize?: string;
    productFontWeight?: string;
    productFontStyle?: string;
    modifierFontFamily?: string;
    modifierFontSize?: string;
    modifierFontStyle?: string;
    modifierFontColor?: string;
    columnsPerScreen?: number;
    screenName?: string;
    screenSplit?: boolean;
    cardColors?: CardColorConfig[];
  };
  preference: {
    showClientData?: boolean;
    showName?: boolean;
    showIdentifier?: boolean;
    identifierMessage?: string;
    sourceBoxActive?: boolean;
    sourceBoxMessage?: string;
  };
}

const defaultChannelColors: Record<string, string> = {
  'Local': '#7ed321',
  'Kiosko-Efectivo': '#0299d0',
  'Kiosko-Tarjeta': '#d0021b',
  'PedidosYa': '#d0021b',
  'RAPPI': '#ff5a00',
  'Drive': '#9b59b6',
  'APP': '#bd10e0',
  'DELIVERY': '#9b59b6',
  'DRIVETHRU': '#ff9800',
  'SALON': '#4CAF50',
};

// Mapeo de tamaños de fuente a píxeles
const getFontSizePx = (size?: string, type: string = 'product'): string => {
  const sizes: Record<string, Record<string, string>> = {
    header: { xsmall: '14px', small: '16px', medium: '18px', large: '22px', xlarge: '26px', xxlarge: '32px' },
    timer: { xsmall: '14px', small: '16px', medium: '18px', large: '22px', xlarge: '26px', xxlarge: '32px' },
    client: { xsmall: '12px', small: '14px', medium: '16px', large: '18px', xlarge: '20px', xxlarge: '24px' },
    quantity: { xsmall: '14px', small: '16px', medium: '18px', large: '22px', xlarge: '26px', xxlarge: '32px' },
    product: { xsmall: '14px', small: '16px', medium: '18px', large: '22px', xlarge: '26px', xxlarge: '32px' },
    subitem: { xsmall: '11px', small: '13px', medium: '15px', large: '17px', xlarge: '19px', xxlarge: '22px' },
    modifier: { xsmall: '11px', small: '13px', medium: '15px', large: '17px', xlarge: '19px', xxlarge: '22px' },
    notes: { xsmall: '11px', small: '13px', medium: '15px', large: '17px', xlarge: '19px', xxlarge: '22px' },
    channel: { xsmall: '12px', small: '14px', medium: '16px', large: '18px', xlarge: '20px', xxlarge: '24px' },
  };
  return sizes[type]?.[size || 'medium'] || sizes[type]?.medium || '18px';
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
  'polygon(0% 0%, 100% 0%, 100% calc(100% - 12px), 97% calc(100% - 8px), 94% calc(100% - 11px), 91% calc(100% - 5px), 88% calc(100% - 9px), 85% calc(100% - 6px), 82% calc(100% - 12px), 79% calc(100% - 8px), 76% calc(100% - 9px), 73% calc(100% - 3px), 70% calc(100% - 8px), 67% calc(100% - 6px), 64% calc(100% - 11px), 61% calc(100% - 8px), 58% calc(100% - 9px), 55% calc(100% - 5px), 52% calc(100% - 11px), 49% calc(100% - 6px), 46% calc(100% - 12px), 43% calc(100% - 8px), 40% calc(100% - 9px), 37% calc(100% - 3px), 34% calc(100% - 8px), 31% calc(100% - 6px), 28% calc(100% - 11px), 25% calc(100% - 8px), 22% calc(100% - 9px), 19% calc(100% - 5px), 16% calc(100% - 9px), 13% calc(100% - 6px), 10% calc(100% - 12px), 7% calc(100% - 8px), 4% calc(100% - 9px), 0% calc(100% - 6px))';

const getClipPathTop = () =>
  'polygon(0% 6px, 3% 9px, 6% 5px, 9% 11px, 12% 8px, 15% 3px, 18% 8px, 21% 6px, 24% 12px, 27% 8px, 30% 9px, 33% 3px, 36% 8px, 39% 6px, 42% 11px, 45% 8px, 48% 5px, 51% 9px, 54% 6px, 57% 11px, 60% 8px, 63% 12px, 66% 5px, 69% 8px, 72% 6px, 75% 9px, 78% 3px, 81% 8px, 84% 11px, 87% 6px, 90% 9px, 93% 5px, 96% 8px, 100% 6px, 100% 100%, 0% 100%)';

interface ColumnCard {
  order: MirrorOrder;
  items: OrderItem[];
  partNumber: number;
  totalParts: number;
  isFirstPart: boolean;
  isLastPart: boolean;
}

export function TestScreen() {
  const { screenId } = useParams<{ screenId: string }>();
  const [searchParams] = useSearchParams();
  const screenFilter = searchParams.get('screen') || '';

  const [config, setConfig] = useState<ScreenConfig | null>(null);
  const [orders, setOrders] = useState<MirrorOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

  // Cargar configuración de la pantalla
  const loadConfig = useCallback(async () => {
    if (!screenId) return;
    try {
      const { data } = await screensApi.getConfig(screenId);
      setConfig({
        appearance: data.appearance || {},
        preference: data.preference || {},
      });
    } catch (err) {
      console.error('Error loading config:', err);
      message.error('Error cargando configuración de pantalla');
    }
  }, [screenId]);

  // Cargar órdenes del mirror
  const loadOrders = useCallback(async () => {
    try {
      const { data } = await mirrorApi.getOrders({ screen: screenFilter || undefined });
      setOrders(data.orders || []);
      setConnectionStatus('connected');
    } catch (err) {
      console.error('Error loading orders:', err);
      setConnectionStatus('error');
    }
  }, [screenFilter]);

  // Cargar datos iniciales
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadConfig();
      await loadOrders();
      setIsLoading(false);
    };
    init();
  }, [loadConfig, loadOrders]);

  // Auto-refresh cada 3 segundos
  useEffect(() => {
    const interval = setInterval(loadOrders, 3000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  // Actualizar reloj cada segundo
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Configuración con defaults
  const appearance = useMemo(() => ({
    backgroundColor: config?.appearance?.backgroundColor || '#1a1a2e',
    cardColor: config?.appearance?.cardColor || '#ffffff',
    textColor: config?.appearance?.textColor || '#1a1a2e',
    accentColor: config?.appearance?.accentColor || '#e94560',
    headerColor: config?.appearance?.headerColor || '#1a1a2e',
    headerTextColor: config?.appearance?.headerTextColor || '#ffffff',
    headerFontFamily: config?.appearance?.headerFontFamily || 'Inter, sans-serif',
    headerFontSize: config?.appearance?.headerFontSize || 'medium',
    headerFontWeight: config?.appearance?.headerFontWeight || 'bold',
    timerFontFamily: config?.appearance?.timerFontFamily || 'monospace',
    timerFontSize: config?.appearance?.timerFontSize || 'medium',
    timerFontWeight: config?.appearance?.timerFontWeight || 'bold',
    timerTextColor: config?.appearance?.timerTextColor || '#ffffff',
    showTimer: config?.appearance?.showTimer !== false,
    showOrderNumber: config?.appearance?.showOrderNumber !== false,
    productFontFamily: config?.appearance?.productFontFamily || 'Inter, sans-serif',
    productFontSize: config?.appearance?.productFontSize || 'medium',
    productFontWeight: config?.appearance?.productFontWeight || 'bold',
    modifierFontFamily: config?.appearance?.modifierFontFamily || 'Inter, sans-serif',
    modifierFontSize: config?.appearance?.modifierFontSize || 'small',
    modifierFontStyle: config?.appearance?.modifierFontStyle || 'italic',
    modifierFontColor: config?.appearance?.modifierFontColor || '#666666',
    columnsPerScreen: config?.appearance?.columnsPerScreen || 6,
    screenName: config?.appearance?.screenName || screenFilter || 'TEST MODE',
    screenSplit: config?.appearance?.screenSplit !== false,
    cardColors: config?.appearance?.cardColors || [
      { color: '#4CAF50', minutes: '03:00', order: 1, isFullBackground: false },
      { color: '#FFC107', minutes: '05:00', order: 2, isFullBackground: false },
      { color: '#FF5722', minutes: '07:00', order: 3, isFullBackground: false },
      { color: '#f44336', minutes: '10:00', order: 4, isFullBackground: true },
    ],
  }), [config, screenFilter]);

  const preference = useMemo(() => ({
    showName: config?.preference?.showName !== false,
    showIdentifier: config?.preference?.showIdentifier !== false,
    identifierMessage: config?.preference?.identifierMessage || 'Orden',
    sourceBoxActive: config?.preference?.sourceBoxActive !== false,
    sourceBoxMessage: config?.preference?.sourceBoxMessage || 'TEST',
  }), [config]);

  // Calcular color basado en tiempo
  const getTimeColor = useCallback((createdAt: string): { color: string; isFullBackground: boolean } => {
    const created = new Date(createdAt);
    const elapsed = (currentTime.getTime() - created.getTime()) / 1000 / 60;
    const sortedColors = [...appearance.cardColors].sort((a, b) => {
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
  }, [currentTime, appearance.cardColors]);

  // Formatear tiempo transcurrido
  const formatElapsedTime = useCallback((createdAt: string): string => {
    const created = new Date(createdAt);
    const elapsed = Math.floor((currentTime.getTime() - created.getTime()) / 1000);
    const cappedElapsed = Math.min(Math.max(0, elapsed), 5999); // max 99:59
    const mins = Math.floor(cappedElapsed / 60);
    const secs = cappedElapsed % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, [currentTime]);

  // Calcular columnas con split
  const displayColumns = useMemo((): ColumnCard[] => {
    const columns: ColumnCard[] = [];
    const maxItemsPerColumn = 8;

    for (const order of orders) {
      if (columns.length >= appearance.columnsPerScreen) break;

      const orderItems: OrderItem[] = order.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        notes: item.notes,
        subitems: item.subitems,
      }));

      const needsSplit = appearance.screenSplit && orderItems.length > maxItemsPerColumn;

      if (!needsSplit) {
        columns.push({
          order,
          items: orderItems,
          partNumber: 1,
          totalParts: 1,
          isFirstPart: true,
          isLastPart: true,
        });
      } else {
        const totalParts = Math.ceil(orderItems.length / maxItemsPerColumn);
        for (let i = 0; i < totalParts && columns.length < appearance.columnsPerScreen; i++) {
          columns.push({
            order,
            items: orderItems.slice(i * maxItemsPerColumn, (i + 1) * maxItemsPerColumn),
            partNumber: i + 1,
            totalParts,
            isFirstPart: i === 0,
            isLastPart: i === totalParts - 1,
          });
        }
      }
    }
    return columns;
  }, [orders, appearance.screenSplit, appearance.columnsPerScreen]);

  if (isLoading) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a1a2e',
        color: '#fff',
      }}>
        <Spin size="large" />
      </div>
    );
  }

  const isDark = parseInt(appearance.backgroundColor?.replace('#', '') || 'ffffff', 16) < 0x808080;

  // Renderizar columna
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
            background: timeInfo.isFullBackground ? timeInfo.color : appearance.cardColor,
            border: `3px solid ${timeInfo.color}`,
            borderTop: !isFirstPart && isSplit ? 'none' : `3px solid ${timeInfo.color}`,
            borderBottom: !isLastPart && isSplit ? 'none' : `3px solid ${timeInfo.color}`,
            borderRadius: isSplit
              ? isFirstPart ? '12px 12px 0 0' : isLastPart ? '0 0 12px 12px' : '0'
              : '12px',
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            minHeight: 0,
            clipPath: isSplit
              ? isFirstPart ? getClipPathBottom() : isLastPart ? getClipPathTop() : undefined
              : undefined,
            paddingBottom: !isLastPart && isSplit ? '10px' : undefined,
            paddingTop: !isFirstPart && isSplit ? '10px' : undefined,
          }}
        >
          {/* Header */}
          {isFirstPart && (
            <>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: timeInfo.color,
                  padding: '12px 16px',
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    color: appearance.headerTextColor,
                    fontFamily: appearance.headerFontFamily,
                    fontWeight: getFontWeight(appearance.headerFontWeight),
                    fontSize: getFontSizePx(appearance.headerFontSize, 'header'),
                  }}
                >
                  {appearance.showOrderNumber && preference.showIdentifier &&
                    `${preference.identifierMessage} #${order.identifier}`}
                </span>
                {appearance.showTimer && (
                  <span
                    style={{
                      color: appearance.timerTextColor,
                      fontFamily: appearance.timerFontFamily,
                      fontWeight: getFontWeight(appearance.timerFontWeight),
                      fontSize: getFontSizePx(appearance.timerFontSize, 'timer'),
                    }}
                  >
                    {formatElapsedTime(order.createdAt)}
                  </span>
                )}
              </div>

              {/* Cliente */}
              {preference.showName && order.customerName && (
                <div
                  style={{
                    background: timeInfo.color,
                    padding: '0 16px 12px 16px',
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      color: appearance.headerTextColor,
                      fontFamily: appearance.headerFontFamily,
                      fontSize: getFontSizePx('small', 'client'),
                      opacity: 0.9,
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
              padding: '12px 16px',
              overflowY: 'auto',
              overflowX: 'hidden',
              minHeight: 0,
            }}
          >
            {items.map((item, i) => (
              <div key={i} style={{ padding: '6px 0', borderBottom: i < items.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <span
                    style={{
                      color: timeInfo.color,
                      fontFamily: appearance.productFontFamily,
                      fontWeight: getFontWeight(appearance.productFontWeight),
                      fontSize: getFontSizePx(appearance.productFontSize, 'quantity'),
                      flexShrink: 0,
                    }}
                  >
                    {item.quantity}x
                  </span>
                  <span
                    style={{
                      color: timeInfo.isFullBackground ? '#fff' : appearance.textColor,
                      fontFamily: appearance.productFontFamily,
                      fontWeight: getFontWeight(appearance.productFontWeight),
                      fontSize: getFontSizePx(appearance.productFontSize, 'product'),
                      lineHeight: 1.3,
                    }}
                  >
                    {item.name}
                  </span>
                </div>

                {/* Subitems */}
                {item.subitems && item.subitems.length > 0 && (
                  <div style={{ paddingLeft: '28px', marginTop: '4px' }}>
                    {item.subitems.map((sub, si) => (
                      <div
                        key={si}
                        style={{
                          fontFamily: appearance.modifierFontFamily,
                          fontSize: getFontSizePx(appearance.modifierFontSize, 'subitem'),
                          color: timeInfo.isFullBackground ? 'rgba(255,255,255,0.8)' : '#555',
                          lineHeight: 1.4,
                        }}
                      >
                        • {sub.quantity}x {sub.name}
                      </div>
                    ))}
                  </div>
                )}

                {/* Notes */}
                {item.notes && (
                  <div
                    style={{
                      paddingLeft: '28px',
                      marginTop: '4px',
                      fontFamily: appearance.modifierFontFamily,
                      fontStyle: getFontStyle(appearance.modifierFontStyle),
                      fontSize: getFontSizePx(appearance.modifierFontSize, 'notes'),
                      color: '#ff9800',
                    }}
                  >
                    📝 {item.notes}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer con canal */}
          {isLastPart && (
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
                  padding: '10px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span
                  style={{
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: getFontSizePx('medium', 'channel'),
                    textTransform: 'uppercase',
                  }}
                >
                  {order.channel}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: appearance.backgroundColor,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 24px',
          background: appearance.headerColor,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: appearance.headerTextColor, fontWeight: 'bold', fontSize: '20px' }}>
            {appearance.screenName}
          </span>
          <span
            style={{
              background: connectionStatus === 'connected' ? '#4CAF50' : connectionStatus === 'error' ? '#f44336' : '#FFC107',
              color: '#fff',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 'bold',
            }}
          >
            {connectionStatus === 'connected' ? 'CONECTADO' : connectionStatus === 'error' ? 'ERROR' : 'CONECTANDO...'}
          </span>
          <span
            style={{
              background: appearance.accentColor,
              color: '#fff',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 'bold',
            }}
          >
            MODO PRUEBA
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <span style={{ color: appearance.headerTextColor, opacity: 0.8 }}>
            Órdenes: {orders.length}
          </span>
          <span style={{ color: appearance.headerTextColor, fontSize: '24px', fontFamily: 'monospace' }}>
            {currentTime.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Grid de columnas */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: `repeat(${appearance.columnsPerScreen}, 1fr)`,
          gap: '12px',
          padding: '12px',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        {displayColumns.map((col) => renderColumn(col))}

        {/* Columnas vacías */}
        {Array.from({ length: appearance.columnsPerScreen - displayColumns.length }).map((_, i) => (
          <div
            key={`empty-${i}`}
            style={{
              background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              borderRadius: '12px',
              border: `2px dashed ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
              fontSize: '16px',
            }}
          >
            Sin orden
          </div>
        ))}
      </div>

      {/* Footer con leyenda SLA */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '32px',
          padding: '12px 24px',
          background: appearance.headerColor,
          flexShrink: 0,
        }}
      >
        {appearance.cardColors.map((cc, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: cc.color }} />
            <span style={{ color: appearance.headerTextColor, opacity: 0.8, fontSize: '14px' }}>
              {cc.minutes}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TestScreen;
