import { useAppearance, usePreference, useKeyboard } from '../../store/configStore';
import { usePagination } from '../../store/orderStore';

export function Footer() {
  const appearance = useAppearance();
  const preference = usePreference();
  const keyboard = useKeyboard();
  const { currentPage, totalPages } = usePagination();

  const showPagination = preference?.showPagination ?? true;

  // Teclas de navegación
  const prevKey = keyboard?.previousPage || 'G';
  const nextKey = keyboard?.nextPage || 'I';

  return (
    <footer
      className="bg-gray-900 border-t border-gray-800 px-4 flex items-center justify-between"
      style={{ height: appearance?.footerHeight || '72px' }}
    >
      {/* Left - Source Box */}
      {preference?.sourceBoxActive && (
        <div className="flex items-center gap-2">
          <span className="bg-blue-600 text-white px-3 py-1 rounded font-bold text-sm">
            {preference.sourceBoxMessage || 'KDS'}
          </span>
        </div>
      )}

      {/* Center - Pagination */}
      {showPagination && totalPages > 1 && (
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors">
            <span className="bg-gray-800 px-2 py-1 rounded text-xs font-mono">
              {prevKey.toUpperCase()}
            </span>
            <span className="text-sm">Anterior</span>
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <div
                key={page}
                className={`w-3 h-3 rounded-full ${
                  page === currentPage ? 'bg-blue-500' : 'bg-gray-700'
                }`}
              />
            ))}
          </div>

          <button className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors">
            <span className="text-sm">Siguiente</span>
            <span className="bg-gray-800 px-2 py-1 rounded text-xs font-mono">
              {nextKey.toUpperCase()}
            </span>
          </button>
        </div>
      )}

      {/* Right - Keyboard hints */}
      <div className="flex items-center gap-4 text-gray-500 text-xs">
        <span>
          <span className="bg-gray-800 px-1.5 py-0.5 rounded font-mono mr-1">
            H
          </span>
          1ra
        </span>
        <span>
          <span className="bg-gray-800 px-1.5 py-0.5 rounded font-mono mr-1">
            3
          </span>
          2da
        </span>
        <span>
          <span className="bg-gray-800 px-1.5 py-0.5 rounded font-mono mr-1">
            1
          </span>
          3ra
        </span>
        <span>
          <span className="bg-gray-800 px-1.5 py-0.5 rounded font-mono mr-1">
            F
          </span>
          4ta
        </span>
        <span className="text-yellow-500">
          <span className="bg-gray-800 px-1.5 py-0.5 rounded font-mono mr-1">
            I+G
          </span>
          Power
        </span>
      </div>
    </footer>
  );
}
