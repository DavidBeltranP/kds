import { useEffect, useMemo, useCallback, useRef, useState } from 'react';
import { OrderCard } from '../OrderCard';
import { useOrderStore, useCurrentPageOrders } from '../../store/orderStore';
import { useAppearance, usePreference } from '../../store/configStore';
import { socketService } from '../../services/socket';
import type { Order, OrderItem } from '../../types';
import { useScreenSize } from '../../hooks/useScreenSize';

interface ColumnCard {
  order: Order;
  items: OrderItem[];
  partNumber: number;
  totalParts: number;
  isFirstPart: boolean;
  isLastPart: boolean;
}

export function OrderGrid() {
  const appearance = useAppearance();
  const preference = usePreference();
  const columnsPerScreen = appearance?.columnsPerScreen || 4;
  const screenSplit = appearance?.screenSplit ?? true;
  const maxItemsPerColumn = appearance?.maxItemsPerColumn || 6;
  const touchEnabled = preference?.touchEnabled ?? false;

  // Obtener la altura del footer desde appearance o usar default
  const footerHeight = parseInt(appearance?.footerHeight || '72', 10);

  // Usar hook para detectar tamaño de pantalla y calcular altura disponible
  // Header tiene padding de 8px*2 + contenido ~40px = ~56px, pero mediremos dinámicamente
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);

  // Detectar dimensiones de pantalla
  const screenDimensions = useScreenSize(56, footerHeight);

  // Medir la altura real disponible del contenedor
  useEffect(() => {
    const measureHeight = () => {
      // Buscar header y footer en todo el documento
      const headerEl = document.querySelector('header');
      const footerEl = document.querySelector('footer');

      const headerHeight = headerEl ? headerEl.getBoundingClientRect().height : 56;
      const footerHeightActual = footerEl ? footerEl.getBoundingClientRect().height : footerHeight;

      const available = window.innerHeight - headerHeight - footerHeightActual;
      console.log('[OrderGrid] Measured heights:', {
        windowHeight: window.innerHeight,
        headerHeight,
        footerHeightActual,
        available,
      });
      setMeasuredHeight(available);
    };

    measureHeight();
    window.addEventListener('resize', measureHeight);

    // También medir después de un pequeño delay para asegurar que el DOM está listo
    const timeoutId = setTimeout(measureHeight, 100);

    return () => {
      window.removeEventListener('resize', measureHeight);
      clearTimeout(timeoutId);
    };
  }, [footerHeight]);

  // Altura final a usar (medida real o calculada por el hook)
  const availableHeight = measuredHeight || screenDimensions.availableHeight;

  // Mapeo de tamaños de fuente a alturas de item estimadas
  const fontSizeToItemHeight: Record<string, number> = {
    small: 45,    // 12px font
    medium: 55,   // 14px font
    large: 65,    // 16px font
    xlarge: 80,   // 20px font
    xxlarge: 95,  // 24px font
  };

  // Obtener tamaño de fuente configurado
  const productFontSize = appearance?.productFontSize || 'medium';

  // Calcular dinámicamente cuántos items caben basándose en la altura disponible REAL
  // Y el tamaño de fuente configurado
  const orderHeaderHeight = 120;
  const avgItemHeight = fontSizeToItemHeight[productFontSize] || 55;
  const gridPadding = 32;
  const splitFooterHeight = 45;
  const safetyMargin = 25;

  // Altura efectiva para items en primera parte (tiene header)
  const firstPartItemsHeight = availableHeight - gridPadding - orderHeaderHeight - safetyMargin;
  // Altura efectiva para items en otras partes (sin header, con footer opcional)
  const otherPartsItemsHeight = availableHeight - gridPadding - splitFooterHeight - safetyMargin;

  // Calcular peso máximo basado en altura real disponible
  // Ser conservador para evitar cortes
  const dynamicFirstPartMaxWeight = Math.max(3, Math.floor(firstPartItemsHeight / avgItemHeight));
  const dynamicOtherPartsMaxWeight = Math.max(4, Math.floor(otherPartsItemsHeight / avgItemHeight));

  console.log('[OrderGrid] Dynamic weights:', {
    availableHeight,
    firstPartItemsHeight,
    otherPartsItemsHeight,
    dynamicFirstPartMaxWeight,
    dynamicOtherPartsMaxWeight,
    configMaxItems: maxItemsPerColumn,
  });

  // Usar la misma cantidad para paginación y obtención de órdenes
  const currentOrders = useCurrentPageOrders(columnsPerScreen);
  const { calculatePages, setLastFinished } = useOrderStore();

  // Recalcular páginas cuando cambian las órdenes o columnas
  useEffect(() => {
    calculatePages(columnsPerScreen);
  }, [columnsPerScreen, calculatePages, useOrderStore.getState().orders.length]);

  // Handler para finalizar orden via touch/click
  const handleFinishOrder = useCallback((orderId: string) => {
    console.log('[Touch] Finishing order:', orderId);
    socketService.finishOrder(orderId);
    setLastFinished(orderId);
  }, [setLastFinished]);

  // Calcular el "peso" de un item (considerando modificadores)
  const calculateItemWeight = (item: OrderItem): number => {
    // Cada item base cuenta como 1
    // Items con modificadores ocupan más espacio vertical
    let weight = 1;
    if (item.modifier) {
      const modifierLines = item.modifier.split(',').length;
      // Cada línea de modificador suma 0.5 para contabilizar el espacio extra
      weight += modifierLines * 0.5;
    }
    if (item.notes) {
      weight += 0.4;
    }
    return weight;
  };

  // Calcular cuántos items caben dado un peso máximo
  const getItemsForWeight = (items: OrderItem[], maxWeight: number, startIndex: number = 0): OrderItem[] => {
    const result: OrderItem[] = [];
    let currentWeight = 0;

    for (let i = startIndex; i < items.length; i++) {
      const itemWeight = calculateItemWeight(items[i]);
      if (currentWeight + itemWeight > maxWeight && result.length > 0) {
        break;
      }
      result.push(items[i]);
      currentWeight += itemWeight;
    }

    return result;
  };

  // Calcular columnas con split de órdenes largas
  const displayColumns = useMemo((): ColumnCard[] => {
    const columns: ColumnCard[] = [];

    for (const order of currentOrders) {
      if (columns.length >= columnsPerScreen) break;

      // Calcular peso total de la orden
      const totalWeight = order.items.reduce((sum, item) => sum + calculateItemWeight(item), 0);

      // Usar pesos dinámicos calculados basándose en la altura disponible real
      // Sin límites artificiales - usar todo el espacio disponible
      const firstPartMaxWeight = dynamicFirstPartMaxWeight;
      const otherPartsMaxWeight = dynamicOtherPartsMaxWeight;

      const needsSplit = screenSplit && totalWeight > firstPartMaxWeight;

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
        // Dividir la orden en partes basándose en peso
        const parts: OrderItem[][] = [];
        let remainingItems = [...order.items];
        let isFirst = true;

        while (remainingItems.length > 0) {
          const maxWeight = isFirst ? firstPartMaxWeight : otherPartsMaxWeight;
          const partItems = getItemsForWeight(remainingItems, maxWeight);
          parts.push(partItems);
          remainingItems = remainingItems.slice(partItems.length);
          isFirst = false;
        }

        // Agregar las partes como columnas
        for (let i = 0; i < parts.length && columns.length < columnsPerScreen; i++) {
          columns.push({
            order,
            items: parts[i],
            partNumber: i + 1,
            totalParts: parts.length,
            isFirstPart: i === 0,
            isLastPart: i === parts.length - 1,
          });
        }
      }
    }
    return columns;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrders, screenSplit, columnsPerScreen, maxItemsPerColumn, dynamicFirstPartMaxWeight, dynamicOtherPartsMaxWeight, productFontSize]);

  // Log de debugging para ver las dimensiones
  useEffect(() => {
    console.log('[OrderGrid] Screen dimensions:', {
      viewportHeight: screenDimensions.viewportHeight,
      availableHeight,
      diagonalInches: screenDimensions.diagonalInches.toFixed(1),
      screenCategory: screenDimensions.screenCategory,
    });
  }, [screenDimensions, availableHeight]);

  if (displayColumns.length === 0) {
    return (
      <div
        ref={gridContainerRef}
        className="flex-1 flex items-center justify-center"
        style={{
          minHeight: 0,
        }}
      >
        <div className="text-center">
          <div className="text-6xl mb-4 opacity-30">
            <svg
              className="w-24 h-24 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <p className="text-gray-500 text-xl">Sin comandas pendientes</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={gridContainerRef}
      className="flex-1 p-4 overflow-hidden"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columnsPerScreen}, 1fr)`,
        gridTemplateRows: '1fr',
        gap: '1rem',
        maxWidth: '100%',
        minHeight: 0, // Importante para que flex-1 funcione correctamente con grid
        height: '100%', // Forzar altura completa
        alignItems: 'stretch', // Estirar items para llenar toda la altura
      }}
    >
      {displayColumns.map((column, index) => (
        <OrderCard
          key={`${column.order.id}-${column.partNumber}`}
          order={column.order}
          items={column.items}
          index={index}
          partNumber={column.partNumber}
          totalParts={column.totalParts}
          isFirstPart={column.isFirstPart}
          isLastPart={column.isLastPart}
          cardColors={appearance?.cardColors || []}
          channelColors={appearance?.channelColors || []}
          showIdentifier={preference?.showIdentifier ?? true}
          identifierMessage={preference?.identifierMessage || 'Orden'}
          showName={preference?.showName ?? true}
          fontSize={appearance?.fontSize || '16px'}
          // Props de apariencia
          cardColor={appearance?.cardColor}
          textColor={appearance?.textColor}
          headerTextColor={appearance?.headerTextColor}
          accentColor={appearance?.accentColor}
          productFontFamily={appearance?.productFontFamily}
          productFontSize={appearance?.productFontSize}
          productFontWeight={appearance?.productFontWeight}
          modifierFontFamily={appearance?.modifierFontFamily}
          modifierFontSize={appearance?.modifierFontSize}
          modifierFontColor={appearance?.modifierFontColor}
          modifierFontStyle={appearance?.modifierFontStyle}
          showTimer={appearance?.showTimer}
          showOrderNumber={appearance?.showOrderNumber}
          headerFontSize={appearance?.headerFontSize}
          onFinish={handleFinishOrder}
          touchEnabled={touchEnabled}
        />
      ))}

      {/* Columnas vacías */}
      {Array.from({ length: columnsPerScreen - displayColumns.length }).map((_, i) => (
        <div
          key={`empty-${i}`}
          style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '8px',
            border: '2px dashed rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255,255,255,0.2)',
            fontSize: '14px',
          }}
        >
          Sin orden
        </div>
      ))}
    </div>
  );
}
