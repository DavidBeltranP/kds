import { useEffect, useState } from 'react';
import clsx from 'clsx';
import type { Order, CardColor, ChannelColor } from '../../types';
import { getElapsedTime, getColorForTime } from '../../utils/timeUtils';

interface OrderCardProps {
  order: Order;
  index: number;
  cardColors: CardColor[];
  channelColors: ChannelColor[];
  showIdentifier: boolean;
  identifierMessage: string;
  showName: boolean;
  fontSize: string;
  columnSize: string;
}

export function OrderCard({
  order,
  index,
  cardColors,
  channelColors,
  showIdentifier,
  identifierMessage,
  showName,
  fontSize,
  columnSize,
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
  const channelColor =
    channelColors.find(
      (c) => c.channel.toLowerCase() === order.channel.toLowerCase()
    )?.color || '#4a90e2';

  // Tecla para finalizar (1-5)
  const finishKey = ['H', '3', '1', 'F', 'J'][index] || '';

  return (
    <div
      className={clsx(
        'flex flex-col bg-gray-900 rounded-lg overflow-hidden',
        'border-l-4 animate-fade-in'
      )}
      style={{
        width: columnSize,
        borderLeftColor: timeColor.color,
        fontSize,
      }}
    >
      {/* Header */}
      <div
        className="px-3 py-2 flex items-center justify-between"
        style={{ backgroundColor: channelColor }}
      >
        <span className="font-bold text-white text-sm uppercase truncate">
          {order.channel}
        </span>
        <span className="text-white text-xs opacity-80">
          {finishKey && `[${finishKey}]`}
        </span>
      </div>

      {/* Identifier */}
      {showIdentifier && (
        <div className="px-3 py-2 bg-gray-800 border-b border-gray-700">
          <span className="text-gray-400 text-xs">{identifierMessage}</span>
          <span className="ml-2 font-bold text-white text-lg">
            {order.identifier}
          </span>
        </div>
      )}

      {/* Customer Name */}
      {showName && order.customerName && (
        <div className="px-3 py-1 bg-gray-800 border-b border-gray-700">
          <span className="text-white font-medium truncate">
            {order.customerName}
          </span>
        </div>
      )}

      {/* Items */}
      <div className="flex-1 px-3 py-2 overflow-y-auto max-h-64">
        {order.items.map((item, itemIndex) => (
          <div
            key={item.id || itemIndex}
            className="py-1 border-b border-gray-800 last:border-0"
          >
            <div className="flex items-start gap-2">
              {item.quantity > 1 && (
                <span className="bg-gray-700 text-white px-1.5 py-0.5 rounded text-xs font-bold">
                  {item.quantity}
                </span>
              )}
              <span className="text-white flex-1">{item.name}</span>
            </div>
            {item.modifier && (
              <div className="text-yellow-400 text-sm ml-4 mt-0.5">
                + {item.modifier}
              </div>
            )}
            {item.notes && (
              <div className="text-orange-400 text-sm ml-4 mt-0.5 italic">
                * {item.notes}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer - Timer */}
      <div
        className="px-3 py-2 flex items-center justify-between"
        style={{ backgroundColor: timeColor.color }}
      >
        <span className="text-white font-mono font-bold text-xl">
          {elapsedTime.formatted}
        </span>
        <span className="text-white text-xs opacity-80">
          {order.items.length} items
        </span>
      </div>
    </div>
  );
}
