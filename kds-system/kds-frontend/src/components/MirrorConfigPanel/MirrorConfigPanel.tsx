import { useState, useEffect } from 'react';
import { useConfigStore } from '../../store/configStore';
import type { AppearanceConfig, PreferenceConfig } from '../../types';

const STORAGE_KEY = 'mirror-local-config';

// Opciones para los selectores (igual que backoffice)
const fontFamilies = [
  { value: 'Inter, sans-serif', label: 'Inter' },
  { value: 'Roboto, sans-serif', label: 'Roboto' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Helvetica, sans-serif', label: 'Helvetica' },
  { value: '"Roboto Mono", monospace', label: 'Roboto Mono' },
  { value: '"Source Code Pro", monospace', label: 'Source Code Pro' },
  { value: '"Open Sans", sans-serif', label: 'Open Sans' },
  { value: 'Montserrat, sans-serif', label: 'Montserrat' },
  { value: '"Segoe UI", sans-serif', label: 'Segoe UI' },
];

const fontSizesProduct = [
  { value: 'small', label: 'Pequeno (12px)' },
  { value: 'medium', label: 'Mediano (14px)' },
  { value: 'large', label: 'Grande (16px)' },
  { value: 'xlarge', label: 'Extra Grande (20px)' },
  { value: 'xxlarge', label: 'Muy Grande (24px)' },
];

const fontSizesModifier = [
  { value: 'xsmall', label: 'Extra Pequeno (10px)' },
  { value: 'small', label: 'Pequeno (11px)' },
  { value: 'medium', label: 'Mediano (12px)' },
  { value: 'large', label: 'Grande (14px)' },
  { value: 'xlarge', label: 'Extra Grande (16px)' },
  { value: 'xxlarge', label: 'Muy Grande (18px)' },
];

const fontWeights = [
  { value: 'normal', label: 'Normal (400)' },
  { value: 'medium', label: 'Medio (500)' },
  { value: 'semibold', label: 'Semi-Bold (600)' },
  { value: 'bold', label: 'Bold (700)' },
];

const fontStyles = [
  { value: 'normal', label: 'Normal' },
  { value: 'italic', label: 'Italica / Cursiva' },
];

interface MirrorConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MirrorConfigPanel({ isOpen, onClose }: MirrorConfigPanelProps) {
  const { config, setConfig } = useConfigStore();
  const [localAppearance, setLocalAppearance] = useState<Partial<AppearanceConfig>>({});
  const [localPreference, setLocalPreference] = useState<Partial<PreferenceConfig>>({});
  const [activeTab, setActiveTab] = useState<'colors' | 'header' | 'products' | 'modifiers' | 'layout' | 'options'>('colors');

  // Cargar configuracion desde localStorage al montar
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.appearance) setLocalAppearance(parsed.appearance);
        if (parsed.preference) setLocalPreference(parsed.preference);
      } catch (e) {
        console.error('[MirrorConfig] Error loading saved config:', e);
      }
    }
  }, []);

  // Aplicar configuracion local al store cuando cambia
  useEffect(() => {
    if (!config) return;

    const mergedAppearance = {
      ...config.appearance,
      ...localAppearance,
    };

    const mergedPreference = {
      ...config.preference,
      ...localPreference,
    };

    // Solo actualizar si hay cambios reales
    if (
      JSON.stringify(config.appearance) !== JSON.stringify(mergedAppearance) ||
      JSON.stringify(config.preference) !== JSON.stringify(mergedPreference)
    ) {
      setConfig({
        ...config,
        appearance: mergedAppearance as AppearanceConfig,
        preference: mergedPreference as PreferenceConfig,
      });
    }
  }, [localAppearance, localPreference]);

  // Guardar en localStorage
  const saveToStorage = () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        appearance: localAppearance,
        preference: localPreference,
      })
    );
  };

  // Actualizar apariencia
  const updateAppearance = (key: keyof AppearanceConfig, value: unknown) => {
    setLocalAppearance((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Actualizar preferencias
  const updatePreference = (key: keyof PreferenceConfig, value: unknown) => {
    setLocalPreference((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Resetear configuracion
  const resetConfig = () => {
    setLocalAppearance({});
    setLocalPreference({});
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  };

  if (!isOpen) return null;

  const currentAppearance: Partial<AppearanceConfig> = {
    ...config?.appearance,
    ...localAppearance,
  };
  const currentPreference: Partial<PreferenceConfig> = {
    ...config?.preference,
    ...localPreference,
  };

  const tabs = [
    { key: 'colors', label: 'Colores' },
    { key: 'header', label: 'Cabecera' },
    { key: 'products', label: 'Productos' },
    { key: 'modifiers', label: 'Modificadores' },
    { key: 'layout', label: 'Disposicion' },
    { key: 'options', label: 'Opciones' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Panel */}
      <div className="relative ml-auto w-[480px] h-full bg-gray-900 border-l border-gray-700 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-white">Configuracion de Apariencia</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nota importante */}
        <div className="mx-4 mt-4 p-3 bg-purple-900/50 border border-purple-500 rounded-lg">
          <p className="text-purple-200 text-sm">
            Estos cambios son SOLO para tu pantalla local y no afectan la tienda.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap border-b border-gray-700 mt-4 px-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`px-3 py-2 text-xs font-medium ${
                activeTab === tab.key
                  ? 'text-purple-400 border-b-2 border-purple-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Colores Generales */}
          {activeTab === 'colors' && (
            <>
              <h3 className="text-sm font-semibold text-purple-400 mb-3">Colores Generales</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Fondo Pantalla</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={currentAppearance.backgroundColor || '#f0f2f5'}
                      onChange={(e) => updateAppearance('backgroundColor', e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border-0"
                    />
                    <input
                      type="text"
                      value={currentAppearance.backgroundColor || '#f0f2f5'}
                      onChange={(e) => updateAppearance('backgroundColor', e.target.value)}
                      className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Fondo Tarjetas</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={currentAppearance.cardColor || '#ffffff'}
                      onChange={(e) => updateAppearance('cardColor', e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border-0"
                    />
                    <input
                      type="text"
                      value={currentAppearance.cardColor || '#ffffff'}
                      onChange={(e) => updateAppearance('cardColor', e.target.value)}
                      className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Texto Productos</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={currentAppearance.textColor || '#1a1a2e'}
                      onChange={(e) => updateAppearance('textColor', e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border-0"
                    />
                    <input
                      type="text"
                      value={currentAppearance.textColor || '#1a1a2e'}
                      onChange={(e) => updateAppearance('textColor', e.target.value)}
                      className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Color Acento</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={currentAppearance.accentColor || '#e94560'}
                      onChange={(e) => updateAppearance('accentColor', e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border-0"
                    />
                    <input
                      type="text"
                      value={currentAppearance.accentColor || '#e94560'}
                      onChange={(e) => updateAppearance('accentColor', e.target.value)}
                      className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Cabecera de Orden */}
          {activeTab === 'header' && (
            <>
              <h3 className="text-sm font-semibold text-purple-400 mb-3">Cabecera de Orden</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Color Fondo Cabecera</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={currentAppearance.headerColor || '#1a1a2e'}
                      onChange={(e) => updateAppearance('headerColor', e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border-0"
                    />
                    <input
                      type="text"
                      value={currentAppearance.headerColor || '#1a1a2e'}
                      onChange={(e) => updateAppearance('headerColor', e.target.value)}
                      className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Color Texto Cabecera</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={currentAppearance.headerTextColor || '#ffffff'}
                      onChange={(e) => updateAppearance('headerTextColor', e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border-0"
                    />
                    <input
                      type="text"
                      value={currentAppearance.headerTextColor || '#ffffff'}
                      onChange={(e) => updateAppearance('headerTextColor', e.target.value)}
                      className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Fuente Cabecera</label>
                  <select
                    value={currentAppearance.headerFontFamily || 'Inter, sans-serif'}
                    onChange={(e) => updateAppearance('headerFontFamily', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                  >
                    {fontFamilies.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Tamano Cabecera</label>
                  <select
                    value={currentAppearance.headerFontSize || 'medium'}
                    onChange={(e) => updateAppearance('headerFontSize', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                  >
                    {fontSizesProduct.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={currentAppearance.headerShowChannel ?? true}
                    onChange={(e) => updateAppearance('headerShowChannel', e.target.checked)}
                    className="rounded bg-gray-700 border-gray-600 w-4 h-4"
                  />
                  Mostrar Canal
                </label>

                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={currentAppearance.headerShowTime ?? true}
                    onChange={(e) => updateAppearance('headerShowTime', e.target.checked)}
                    className="rounded bg-gray-700 border-gray-600 w-4 h-4"
                  />
                  Mostrar Hora
                </label>
              </div>
            </>
          )}

          {/* Tipografia de Productos */}
          {activeTab === 'products' && (
            <>
              <h3 className="text-sm font-semibold text-purple-400 mb-3">Tipografia de Productos</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Fuente Productos</label>
                  <select
                    value={currentAppearance.productFontFamily || 'Inter, sans-serif'}
                    onChange={(e) => updateAppearance('productFontFamily', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                  >
                    {fontFamilies.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Tamano Productos</label>
                    <select
                      value={currentAppearance.productFontSize || 'medium'}
                      onChange={(e) => updateAppearance('productFontSize', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                    >
                      {fontSizesProduct.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Peso Fuente</label>
                    <select
                      value={currentAppearance.productFontWeight || 'bold'}
                      onChange={(e) => updateAppearance('productFontWeight', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                    >
                      {fontWeights.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Tipografia de Modificadores */}
          {activeTab === 'modifiers' && (
            <>
              <h3 className="text-sm font-semibold text-purple-400 mb-3">Tipografia de Modificadores</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Fuente Modificadores</label>
                  <select
                    value={currentAppearance.modifierFontFamily || 'Inter, sans-serif'}
                    onChange={(e) => updateAppearance('modifierFontFamily', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                  >
                    {fontFamilies.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Tamano Modificadores</label>
                    <select
                      value={currentAppearance.modifierFontSize || 'small'}
                      onChange={(e) => updateAppearance('modifierFontSize', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                    >
                      {fontSizesModifier.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Estilo Modificadores</label>
                    <select
                      value={currentAppearance.modifierFontStyle || 'italic'}
                      onChange={(e) => updateAppearance('modifierFontStyle', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                    >
                      {fontStyles.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Color Modificadores</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={currentAppearance.modifierFontColor || '#666666'}
                      onChange={(e) => updateAppearance('modifierFontColor', e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border-0"
                    />
                    <input
                      type="text"
                      value={currentAppearance.modifierFontColor || '#666666'}
                      onChange={(e) => updateAppearance('modifierFontColor', e.target.value)}
                      className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Disposicion */}
          {activeTab === 'layout' && (
            <>
              <h3 className="text-sm font-semibold text-purple-400 mb-3">Disposicion</h3>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Columnas por pantalla</label>
                <select
                  value={currentAppearance.columnsPerScreen || 4}
                  onChange={(e) => updateAppearance('columnsPerScreen', parseInt(e.target.value))}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <option key={n} value={n}>{n} columnas</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Se mostraran {currentAppearance.columnsPerScreen || 4} ordenes por fila
                </p>
              </div>
            </>
          )}

          {/* Opciones de Visualizacion */}
          {activeTab === 'options' && (
            <>
              <h3 className="text-sm font-semibold text-purple-400 mb-3">Opciones de Visualizacion</h3>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={currentAppearance.showTimer ?? true}
                      onChange={(e) => updateAppearance('showTimer', e.target.checked)}
                      className="rounded bg-gray-700 border-gray-600 w-4 h-4"
                    />
                    Mostrar Timer
                  </label>

                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={currentAppearance.showOrderNumber ?? true}
                      onChange={(e) => updateAppearance('showOrderNumber', e.target.checked)}
                      className="rounded bg-gray-700 border-gray-600 w-4 h-4"
                    />
                    Mostrar # de Orden
                  </label>

                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={currentAppearance.animationEnabled ?? true}
                      onChange={(e) => updateAppearance('animationEnabled', e.target.checked)}
                      className="rounded bg-gray-700 border-gray-600 w-4 h-4"
                    />
                    Animaciones
                  </label>

                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={currentAppearance.screenSplit ?? true}
                      onChange={(e) => updateAppearance('screenSplit', e.target.checked)}
                      className="rounded bg-gray-700 border-gray-600 w-4 h-4"
                    />
                    Dividir Ordenes Largas
                  </label>
                </div>

                <div className="p-3 bg-blue-900/30 border border-blue-600/50 rounded-lg">
                  <p className="text-blue-200 text-xs">
                    {currentAppearance.screenSplit
                      ? 'Las ordenes largas se dividiran automaticamente en columnas adyacentes'
                      : 'Division desactivada - las ordenes largas se mostraran con scroll'}
                  </p>
                </div>

                <div className="border-t border-gray-700 pt-4">
                  <h4 className="text-sm font-semibold text-purple-400 mb-3">Preferencias de Orden</h4>

                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={currentPreference.showName ?? true}
                        onChange={(e) => updatePreference('showName', e.target.checked)}
                        className="rounded bg-gray-700 border-gray-600 w-4 h-4"
                      />
                      Mostrar nombre del cliente
                    </label>

                    <label className="flex items-center gap-2 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={currentPreference.showIdentifier ?? true}
                        onChange={(e) => updatePreference('showIdentifier', e.target.checked)}
                        className="rounded bg-gray-700 border-gray-600 w-4 h-4"
                      />
                      Mostrar identificador
                    </label>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Mensaje de identificador</label>
                      <input
                        type="text"
                        value={currentPreference.identifierMessage || 'Orden'}
                        onChange={(e) => updatePreference('identifierMessage', e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                      />
                    </div>

                    <label className="flex items-center gap-2 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={currentPreference.showPagination ?? true}
                        onChange={(e) => updatePreference('showPagination', e.target.checked)}
                        className="rounded bg-gray-700 border-gray-600 w-4 h-4"
                      />
                      Mostrar paginacion
                    </label>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer con botones */}
        <div className="sticky bottom-0 bg-gray-900 border-t border-gray-700 p-4 space-y-2">
          <button
            onClick={() => {
              saveToStorage();
              onClose();
            }}
            className="w-full bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700 font-medium"
          >
            Guardar y Cerrar
          </button>
          <button
            onClick={resetConfig}
            className="w-full bg-gray-700 text-white py-2 px-4 rounded hover:bg-gray-600 text-sm"
          >
            Resetear a valores por defecto
          </button>
        </div>
      </div>
    </div>
  );
}
