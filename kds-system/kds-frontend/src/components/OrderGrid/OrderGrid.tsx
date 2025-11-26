import { useEffect, useMemo } from 'react';
import { OrderCard } from '../OrderCard';
import { useOrderStore, useCurrentPageOrders } from '../../store/orderStore';
import { useAppearance, usePreference } from '../../store/configStore';
import type { Order, OrderItem } from '../../types';

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

  // Usar la misma cantidad para paginación y obtención de órdenes
  const currentOrders = useCurrentPageOrders(columnsPerScreen);
  const { calculatePages } = useOrderStore();

  // Recalcular páginas cuando cambian las órdenes o columnas
  useEffect(() => {
    calculatePages(columnsPerScreen);
  }, [columnsPerScreen, calculatePages, useOrderStore.getState().orders.length]);

  // Calcular columnas con split de órdenes largas
  const displayColumns = useMemo((): ColumnCard[] => {
    const columns: ColumnCard[] = [];

    for (const order of currentOrders) {
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
  }, [currentOrders, screenSplit, columnsPerScreen, maxItemsPerColumn]);

  if (displayColumns.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
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
      className="flex-1 p-4 overflow-hidden"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columnsPerScreen}, 1fr)`,
        gridTemplateRows: '1fr',
        gap: '1rem',
        maxWidth: '100%',
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
