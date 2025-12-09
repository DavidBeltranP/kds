import { useAppearance, usePreference, useKeyboard } from '../../store/configStore';
import { usePagination } from '../../store/orderStore';
import { useScreenStore } from '../../store/screenStore';
import { useOrderStore } from '../../store/orderStore';
import { socketService } from '../../services/socket';

// Mapeo de teclas internas a símbolos visuales de la botonera
const keyToVisual: Record<string, string> = {
  'h': '1',
  'f': '4',
  'j': '5',
  'g': '←',
  'i': '→',
  'arrowleft': '←',
  'arrowright': '→',
};

function getVisualKey(key: string): string {
  return keyToVisual[key.toLowerCase()] || key.toUpperCase();
}

export function Footer() {
  const appearance = useAppearance();
  const preference = usePreference();
  const keyboard = useKeyboard();
  const { currentPage, totalPages } = usePagination();
  const { setPage } = useOrderStore();
  const { isStandby, toggleStandby } = useScreenStore();

  const touchEnabled = preference?.touchEnabled ?? false;
  const showPagination = preference?.showPagination ?? true;

  // Colores dinámicos
  const headerColor = appearance?.headerColor || '#1a1a2e';
  const headerTextColor = appearance?.headerTextColor || '#ffffff';
  const accentColor = appearance?.accentColor || '#e94560';

  // Teclas de navegación (convertidas a visual)
  const prevKey = getVisualKey(keyboard?.previousPage || 'g');
  const nextKey = getVisualKey(keyboard?.nextPage || 'i');

  // Handlers para touch (disabled attr prevents clicks when not touchEnabled)
  const handlePrevPage = () => {
    console.log('[Footer] handlePrevPage called');
    setPage('prev');
  };

  const handleNextPage = () => {
    console.log('[Footer] handleNextPage called');
    setPage('next');
  };

  const handleTogglePower = () => {
    console.log('[Footer] handleTogglePower called');
    const wasStandby = isStandby;
    toggleStandby();
    const newStatus = wasStandby ? 'ONLINE' : 'STANDBY';
    console.log('[Footer] Toggling power to:', newStatus);
    socketService.updateStatus(newStatus);
  };

  const buttonStyle = {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: '4px 8px',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '0.75rem',
    marginRight: '4px',
    color: headerTextColor,
  };

  const touchButtonStyle = {
    ...buttonStyle,
    cursor: touchEnabled ? 'pointer' : 'default',
    padding: touchEnabled ? '8px 16px' : '4px 8px',
    fontSize: touchEnabled ? '1rem' : '0.75rem',
    transition: 'all 0.2s ease',
  };

  const hintStyle = {
    display: 'flex',
    alignItems: 'center',
    color: `${headerTextColor}80`,
    fontSize: '0.75rem',
  };

  return (
    <footer
      style={{
        backgroundColor: headerColor,
        borderTop: '1px solid rgba(255,255,255,0.1)',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: appearance?.footerHeight || '72px',
      }}
    >
      {/* Left - Spacer */}
      <div></div>

      {/* Center - Pagination */}
      {showPagination && totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            type="button"
            onClick={handlePrevPage}
            disabled={!touchEnabled || isStandby}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: `${headerTextColor}99`,
              background: touchEnabled ? 'rgba(255,255,255,0.05)' : 'none',
              border: touchEnabled ? '1px solid rgba(255,255,255,0.2)' : 'none',
              borderRadius: '8px',
              padding: touchEnabled ? '8px 16px' : '4px 8px',
              cursor: touchEnabled && !isStandby ? 'pointer' : 'default',
              transition: 'all 0.2s ease',
              opacity: touchEnabled && !isStandby ? 1 : 0.6,
            }}
          >
            <span style={touchButtonStyle}>{prevKey}</span>
            <span style={{ fontSize: touchEnabled ? '1rem' : '0.875rem', color: headerTextColor }}>Anterior</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <div
                key={page}
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: page === currentPage ? accentColor : `${headerTextColor}40`,
                }}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleNextPage}
            disabled={!touchEnabled || isStandby}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: `${headerTextColor}99`,
              background: touchEnabled ? 'rgba(255,255,255,0.05)' : 'none',
              border: touchEnabled ? '1px solid rgba(255,255,255,0.2)' : 'none',
              borderRadius: '8px',
              padding: touchEnabled ? '8px 16px' : '4px 8px',
              cursor: touchEnabled && !isStandby ? 'pointer' : 'default',
              transition: 'all 0.2s ease',
              opacity: touchEnabled && !isStandby ? 1 : 0.6,
            }}
          >
            <span style={{ fontSize: touchEnabled ? '1rem' : '0.875rem', color: headerTextColor }}>Siguiente</span>
            <span style={touchButtonStyle}>{nextKey}</span>
          </button>
        </div>
      )}

      {/* Right - Touch controls / Keyboard hints */}
      <div style={{ display: 'flex', alignItems: 'center', gap: touchEnabled ? '8px' : '16px' }}>
        {/* Show keyboard hints only when touch is disabled */}
        {!touchEnabled && (
          <>
            <span style={hintStyle}>
              <span style={buttonStyle}>1</span>
              1ra
            </span>
            <span style={hintStyle}>
              <span style={buttonStyle}>2</span>
              2da
            </span>
            <span style={hintStyle}>
              <span style={buttonStyle}>3</span>
              3ra
            </span>
            <span style={hintStyle}>
              <span style={buttonStyle}>4</span>
              4ta
            </span>
          </>
        )}

        {/* Power button - always show but clickable only with touch */}
        <button
          type="button"
          onClick={handleTogglePower}
          disabled={!touchEnabled}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            color: '#facc15',
            background: touchEnabled ? 'rgba(250, 204, 21, 0.1)' : 'transparent',
            border: touchEnabled ? '1px solid rgba(250, 204, 21, 0.3)' : 'none',
            borderRadius: '8px',
            padding: touchEnabled ? '8px 16px' : '4px 8px',
            cursor: touchEnabled ? 'pointer' : 'default',
            fontSize: touchEnabled ? '0.875rem' : '0.75rem',
            fontWeight: 'bold',
            transition: 'all 0.2s ease',
          }}
        >
          <span style={{ ...buttonStyle, color: '#facc15', marginRight: touchEnabled ? '4px' : '4px' }}>
            {touchEnabled ? '⏻' : '← + →'}
          </span>
          {isStandby ? 'Activar' : 'Standby'}
        </button>
      </div>
    </footer>
  );
}
