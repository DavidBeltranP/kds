import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useConfigStore, useScreenName } from '../../store/configStore';
import { useScreenStore, useIsConnected } from '../../store/screenStore';
import { useTotalOrders, usePagination } from '../../store/orderStore';

export function Header() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const screenName = useScreenName();
  const config = useConfigStore((state) => state.config);
  const isConnected = useIsConnected();
  const totalOrders = useTotalOrders();
  const { currentPage, totalPages } = usePagination();
  const { comboProgress, showComboIndicator } = useScreenStore();

  // Actualizar hora cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const timeString = currentTime.toLocaleTimeString('es-EC', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const dateString = currentTime.toLocaleDateString('es-EC', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <header className="bg-gray-900 border-b border-gray-800 px-4 py-2">
      <div className="flex items-center justify-between">
        {/* Left - Screen Name & Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className={clsx(
                'w-3 h-3 rounded-full',
                isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              )}
            />
            <span className="text-white font-bold text-lg">{screenName}</span>
          </div>

          {config?.queue && (
            <span className="text-gray-400 text-sm">
              Cola: {config.queue.name}
            </span>
          )}
        </div>

        {/* Center - Combo Progress Indicator */}
        {showComboIndicator && (
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <div className="bg-gray-800 rounded-full px-4 py-2 flex items-center gap-3">
              <span className="text-yellow-400 text-sm font-medium">
                STANDBY
              </span>
              <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-400 transition-all duration-100"
                  style={{ width: `${comboProgress}%` }}
                />
              </div>
              <span className="text-white text-sm">
                {Math.round(comboProgress)}%
              </span>
            </div>
          </div>
        )}

        {/* Right - Time & Stats */}
        <div className="flex items-center gap-6">
          {/* Orders Count */}
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{totalOrders}</div>
            <div className="text-xs text-gray-400">PENDIENTES</div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="text-center">
              <div className="text-lg font-medium text-white">
                {currentPage}/{totalPages}
              </div>
              <div className="text-xs text-gray-400">PAGINA</div>
            </div>
          )}

          {/* Time */}
          <div className="text-right">
            <div className="text-xl font-mono font-bold text-white">
              {timeString}
            </div>
            <div className="text-xs text-gray-400">{dateString}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
