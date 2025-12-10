import { useEffect, useMemo, useCallback, useRef, useState } from 'react';
import { OrderCard } from '../OrderCard';
import { useOrderStore } from '../../store/orderStore';
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

  // Mapeo preciso de tamaños de fuente a PÍXELES reales
  const productFontSizes: Record<string, number> = {
    small: 12, medium: 14, large: 16, xlarge: 20, xxlarge: 24,
  };
  const modifierFontSizes: Record<string, number> = {
    xsmall: 10, small: 11, medium: 12, large: 14, xlarge: 16, xxlarge: 18,
  };

  // Obtener tamaños de fuente configurados
  const productFontSize = appearance?.productFontSize || 'medium';
  const modifierFontSize = appearance?.modifierFontSize || 'small';

  // Calcular altura REAL de un item producto base
  // padding: 4px arriba + 4px abajo = 8px
  // lineHeight: 1.3
  // Agregamos un 15% extra para gaps y spacing adicional
  const productLineHeight = 1.3;
  const productPadding = 8; // 4px arriba + 4px abajo
  const itemProductHeight = Math.ceil(
    (productFontSizes[productFontSize] || 14) * productLineHeight + productPadding * 1.15
  );

  // Calcular altura REAL de una línea de modificador
  // marginTop: 2px
  // lineHeight: 1.4
  // Agregamos un 10% extra para gaps
  const modifierLineHeight = 1.4;
  const modifierMarginTop = 2;
  const itemModifierLineHeight = Math.ceil(
    ((modifierFontSizes[modifierFontSize] || 11) * modifierLineHeight + modifierMarginTop) * 1.10
  );

  console.log('[OrderGrid] Calculated item heights:', {
    productFontSize,
    modifierFontSize,
    itemProductHeight,
    itemModifierLineHeight,
  });

  // Constantes de diseño
  const orderHeaderHeight = 120; // Header completo con orden, cliente, canal
  const gridPadding = 32; // Padding del grid container (16px * 2)
  const itemsContainerPadding = 20; // padding: '10px 12px' = 20px vertical
  const splitFooterHeight = 50; // Footer "Final" en splits
  const safetyMargin = 60; // Margen de seguridad optimizado para mejor uso del espacio
  const otherPartsSafetyMargin = 80; // Margen ligeramente mayor para partes no-first (para footer)

  // Altura efectiva para items en primera parte (tiene header)
  const firstPartItemsHeight =
    availableHeight - gridPadding - orderHeaderHeight - itemsContainerPadding - safetyMargin;

  // Altura efectiva para items en otras partes (sin header, con footer opcional)
  // Usamos margen de seguridad mayor para asegurar que el footer no se corte
  const otherPartsItemsHeight =
    availableHeight - gridPadding - splitFooterHeight - itemsContainerPadding - otherPartsSafetyMargin;

  // Calcular cuántos items caben basado en altura REAL en píxeles
  // Usamos altura promedio conservadora (item base + algunas líneas de modificador)
  const avgItemWithModifiers = itemProductHeight + (itemModifierLineHeight * 2); // Item + 2 líneas mod promedio

  const dynamicFirstPartMaxHeight = Math.max(itemProductHeight * 2, firstPartItemsHeight);
  const dynamicOtherPartsMaxHeight = Math.max(itemProductHeight * 3, otherPartsItemsHeight);

  console.log('[OrderGrid] Dynamic heights:', {
    availableHeight,
    firstPartItemsHeight,
    otherPartsItemsHeight,
    dynamicFirstPartMaxHeight,
    dynamicOtherPartsMaxHeight,
    itemProductHeight,
    itemModifierLineHeight,
    avgItemWithModifiers,
  });

  // Obtener TODAS las órdenes pendientes (no paginar aquí)
  const allOrders = useOrderStore((state) => state.orders);
  const currentPage = useOrderStore((state) => state.currentPage);
  const { setLastFinished } = useOrderStore();

  // Debug: Log cuando cambian las órdenes
  useEffect(() => {
    console.log('[OrderGrid] Orders in store:', allOrders.length, allOrders.map(o => o.id));
  }, [allOrders]);

  // Handler para finalizar orden via touch/click
  const handleFinishOrder = useCallback((orderId: string) => {
    console.log('[Touch] Finishing order:', orderId);
    socketService.finishOrder(orderId);
    setLastFinished(orderId);
  }, [setLastFinished]);

  // Calcular la altura REAL en píxeles de un item (considerando modificadores y notas)
  const calculateItemHeight = (item: OrderItem): number => {
    // Altura base del producto
    let height = itemProductHeight;

    // Altura de modificadores (cada línea)
    if (item.modifier) {
      const modifierLines = item.modifier.split(',').length;
      height += modifierLines * itemModifierLineHeight;
    }

    // Altura de notas (una línea adicional)
    if (item.notes) {
      height += itemModifierLineHeight;
    }

    return height;
  };

  // Calcular cuántos items caben dada una altura máxima en píxeles
  const getItemsForHeight = (
    items: OrderItem[],
    maxHeight: number,
    startIndex: number = 0
  ): OrderItem[] => {
    const result: OrderItem[] = [];
    let currentHeight = 0;

    for (let i = startIndex; i < items.length; i++) {
      const itemHeight = calculateItemHeight(items[i]);

      // Si agregar este item excede la altura Y ya tenemos al menos un item, cortar aquí
      if (currentHeight + itemHeight > maxHeight && result.length > 0) {
        break;
      }

      result.push(items[i]);
      currentHeight += itemHeight;
    }

    return result;
  };

  // Calcular TODAS las columnas (con split de órdenes largas)
  const allColumns = useMemo((): ColumnCard[] => {
    const columns: ColumnCard[] = [];

    for (const order of allOrders) {

      // Calcular altura total de la orden en píxeles
      const totalHeight = order.items.reduce((sum, item) => sum + calculateItemHeight(item), 0);

      // Usar alturas dinámicas calculadas basándose en la altura disponible real
      const firstPartMaxHeight = dynamicFirstPartMaxHeight;
      const otherPartsMaxHeight = dynamicOtherPartsMaxHeight;

      const needsSplit = screenSplit && totalHeight > firstPartMaxHeight;

      if (!needsSplit) {
        // La orden completa cabe en una sola tarjeta
        columns.push({
          order,
          items: order.items,
          partNumber: 1,
          totalParts: 1,
          isFirstPart: true,
          isLastPart: true,
        });
      } else {
        // Dividir la orden en partes basándose en altura real en píxeles
        const parts: OrderItem[][] = [];
        let remainingItems = [...order.items];
        let isFirst = true;

        while (remainingItems.length > 0) {
          const maxHeight = isFirst ? firstPartMaxHeight : otherPartsMaxHeight;
          const partItems = getItemsForHeight(remainingItems, maxHeight);

          // Evitar partes vacías
          if (partItems.length === 0 && remainingItems.length > 0) {
            // Si no cabe ni un item, forzar al menos uno
            partItems.push(remainingItems[0]);
          }

          parts.push(partItems);
          remainingItems = remainingItems.slice(partItems.length);
          isFirst = false;
        }

        // Agregar TODAS las partes (la paginación se maneja después)
        for (let i = 0; i < parts.length; i++) {
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
  }, [
    allOrders,
    screenSplit,
    dynamicFirstPartMaxHeight,
    dynamicOtherPartsMaxHeight,
    productFontSize,
    modifierFontSize,
    itemProductHeight,
    itemModifierLineHeight,
  ]);

  // Paginar columnas de manera simple: SIEMPRE llenar todas las columnas por página
  // Las órdenes PUEDEN dividirse entre páginas - la continuidad visual ya existe
  const displayColumns = useMemo((): ColumnCard[] => {
    const startIndex = (currentPage - 1) * columnsPerScreen;
    const endIndex = startIndex + columnsPerScreen;
    return allColumns.slice(startIndex, endIndex);
  }, [allColumns, currentPage, columnsPerScreen]);

  // Calcular total de páginas basándose en columnas totales
  const totalPages = Math.max(1, Math.ceil(allColumns.length / columnsPerScreen));
  const totalPendingOrders = allOrders.length;

  console.log('[OrderGrid] Simple pagination:', {
    totalPages,
    currentPage,
    totalColumns: allColumns.length,
    columnsPerScreen,
    displayingColumns: displayColumns.length,
    startIndex: (currentPage - 1) * columnsPerScreen,
    endIndex: (currentPage - 1) * columnsPerScreen + columnsPerScreen,
  });

  // Actualizar totalPages en el store basándose en columnas
  useEffect(() => {
    const { setTotalPages } = useOrderStore.getState();
    if (setTotalPages) {
      setTotalPages(totalPages);
    }
  }, [totalPages]);

  // Log de debugging para ver las dimensiones
  useEffect(() => {
    console.log('[OrderGrid] Screen dimensions:', {
      viewportHeight: screenDimensions.viewportHeight,
      availableHeight,
      diagonalInches: screenDimensions.diagonalInches.toFixed(1),
      screenCategory: screenDimensions.screenCategory,
    });
    console.log('[OrderGrid] Pagination:', {
      allColumnsCount: allColumns.length,
      displayColumnsCount: displayColumns.length,
      currentPage,
      totalPages,
      totalPendingOrders,
    });
  }, [screenDimensions, availableHeight, allColumns.length, displayColumns.length, currentPage, totalPages, totalPendingOrders]);

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
          appearance={appearance || undefined}
          showIdentifier={preference?.showIdentifier ?? true}
          identifierMessage={preference?.identifierMessage || 'Orden'}
          showName={preference?.showName ?? true}
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
