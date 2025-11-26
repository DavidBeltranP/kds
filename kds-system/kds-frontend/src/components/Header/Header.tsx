import { useEffect, useState } from 'react';
import { useConfigStore, useScreenName, useAppearance } from '../../store/configStore';
import { useScreenStore, useIsConnected } from '../../store/screenStore';
import { useTotalOrders, usePagination } from '../../store/orderStore';

export function Header() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const screenName = useScreenName();
  const config = useConfigStore((state) => state.config);
  const appearance = useAppearance();
  const isConnected = useIsConnected();
  const totalOrders = useTotalOrders();
  const { currentPage, totalPages } = usePagination();
  const { comboProgress, showComboIndicator } = useScreenStore();

  // Colores dinámicos
  const headerColor = appearance?.headerColor || '#1a1a2e';
  const headerTextColor = appearance?.headerTextColor || '#ffffff';
  const accentColor = appearance?.accentColor || '#e94560';

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
    <header
      style={{
        backgroundColor: headerColor,
        borderBottom: `1px solid rgba(255,255,255,0.1)`,
        padding: '8px 16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Left - Screen Name & Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: isConnected ? '#22c55e' : '#ef4444',
                animation: isConnected ? 'pulse 2s infinite' : 'none',
              }}
            />
            <span
              style={{
                color: headerTextColor,
                fontWeight: 'bold',
                fontSize: '1.125rem',
              }}
            >
              {screenName}
            </span>
          </div>

          {config?.queue && (
            <span
              style={{
                color: `${headerTextColor}99`,
                fontSize: '0.875rem',
              }}
            >
              Cola: {config.queue.name}
            </span>
          )}
        </div>

        {/* Center - Combo Progress Indicator */}
        {showComboIndicator && (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          >
            <div
              style={{
                backgroundColor: 'rgba(0,0,0,0.5)',
                borderRadius: '9999px',
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <span
                style={{
                  color: '#facc15',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                }}
              >
                STANDBY
              </span>
              <div
                style={{
                  width: '128px',
                  height: '8px',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  borderRadius: '9999px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    backgroundColor: '#facc15',
                    width: `${comboProgress}%`,
                    transition: 'width 100ms',
                  }}
                />
              </div>
              <span style={{ color: '#fff', fontSize: '0.875rem' }}>
                {Math.round(comboProgress)}%
              </span>
            </div>
          </div>
        )}

        {/* Right - Time & Stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {/* Orders Count */}
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: accentColor,
              }}
            >
              {totalOrders}
            </div>
            <div
              style={{
                fontSize: '0.75rem',
                color: `${headerTextColor}99`,
              }}
            >
              PENDIENTES
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: '1.125rem',
                  fontWeight: '500',
                  color: headerTextColor,
                }}
              >
                {currentPage}/{totalPages}
              </div>
              <div
                style={{
                  fontSize: '0.75rem',
                  color: `${headerTextColor}99`,
                }}
              >
                PAGINA
              </div>
            </div>
          )}

          {/* Time */}
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontSize: '1.25rem',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                color: headerTextColor,
              }}
            >
              {timeString}
            </div>
            <div
              style={{
                fontSize: '0.75rem',
                color: `${headerTextColor}99`,
              }}
            >
              {dateString}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
