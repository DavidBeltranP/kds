import { useAppearance, usePreference, useKeyboard } from '../../store/configStore';
import { usePagination } from '../../store/orderStore';

export function Footer() {
  const appearance = useAppearance();
  const preference = usePreference();
  const keyboard = useKeyboard();
  const { currentPage, totalPages } = usePagination();

  const showPagination = preference?.showPagination ?? true;

  // Colores dinámicos
  const headerColor = appearance?.headerColor || '#1a1a2e';
  const headerTextColor = appearance?.headerTextColor || '#ffffff';
  const accentColor = appearance?.accentColor || '#e94560';

  // Teclas de navegación
  const prevKey = keyboard?.previousPage || 'G';
  const nextKey = keyboard?.nextPage || 'I';

  const buttonStyle = {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: '4px 8px',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '0.75rem',
    marginRight: '4px',
    color: headerTextColor,
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
      {/* Left - Source Box */}
      {preference?.sourceBoxActive && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              backgroundColor: accentColor,
              color: '#ffffff',
              padding: '4px 12px',
              borderRadius: '4px',
              fontWeight: 'bold',
              fontSize: '0.875rem',
            }}
          >
            {preference.sourceBoxMessage || 'KDS'}
          </span>
        </div>
      )}

      {/* Center - Pagination */}
      {showPagination && totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: `${headerTextColor}99`,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <span style={buttonStyle}>{prevKey.toUpperCase()}</span>
            <span style={{ fontSize: '0.875rem', color: headerTextColor }}>Anterior</span>
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
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: `${headerTextColor}99`,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '0.875rem', color: headerTextColor }}>Siguiente</span>
            <span style={buttonStyle}>{nextKey.toUpperCase()}</span>
          </button>
        </div>
      )}

      {/* Right - Keyboard hints */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={hintStyle}>
          <span style={buttonStyle}>H</span>
          1ra
        </span>
        <span style={hintStyle}>
          <span style={buttonStyle}>3</span>
          2da
        </span>
        <span style={hintStyle}>
          <span style={buttonStyle}>1</span>
          3ra
        </span>
        <span style={hintStyle}>
          <span style={buttonStyle}>F</span>
          4ta
        </span>
        <span style={{ ...hintStyle, color: '#facc15' }}>
          <span style={{ ...buttonStyle, color: '#facc15' }}>I+G</span>
          Power
        </span>
      </div>
    </footer>
  );
}
