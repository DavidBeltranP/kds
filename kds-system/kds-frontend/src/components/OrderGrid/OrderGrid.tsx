import { useEffect } from 'react';
import { OrderCard } from '../OrderCard';
import { useOrderStore, useCurrentPageOrders } from '../../store/orderStore';
import { useConfigStore, useAppearance, usePreference } from '../../store/configStore';

export function OrderGrid() {
  const appearance = useAppearance();
  const preference = usePreference();
  const columnsPerScreen = appearance?.columnsPerScreen || 4;

  const currentOrders = useCurrentPageOrders(columnsPerScreen);
  const { calculatePages } = useOrderStore();

  // Recalcular páginas cuando cambian las órdenes o columnas
  useEffect(() => {
    calculatePages(columnsPerScreen);
  }, [columnsPerScreen, calculatePages, useOrderStore.getState().orders.length]);

  if (currentOrders.length === 0) {
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
        gridTemplateColumns: `repeat(${columnsPerScreen}, ${appearance?.columnSize || '260px'})`,
        gap: '1rem',
        justifyContent: 'center',
        alignContent: 'start',
      }}
    >
      {currentOrders.map((order, index) => (
        <OrderCard
          key={order.id}
          order={order}
          index={index}
          cardColors={appearance?.cardColors || []}
          channelColors={appearance?.channelColors || []}
          showIdentifier={preference?.showIdentifier ?? true}
          identifierMessage={preference?.identifierMessage || 'Orden'}
          showName={preference?.showName ?? true}
          fontSize={appearance?.fontSize || '16px'}
          columnSize={appearance?.columnSize || '260px'}
        />
      ))}
    </div>
  );
}
