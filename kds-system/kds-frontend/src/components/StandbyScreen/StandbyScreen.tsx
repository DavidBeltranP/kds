import { useEffect, useState } from 'react';
import { useConfigStore, useScreenName, usePreference } from '../../store/configStore';
import { useScreenStore } from '../../store/screenStore';
import { socketService } from '../../services/socket';

export function StandbyScreen() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const screenName = useScreenName();
  const config = useConfigStore((state) => state.config);
  const preference = usePreference();
  const { toggleStandby } = useScreenStore();

  const touchEnabled = preference?.touchEnabled ?? false;

  const handleActivate = () => {
    if (touchEnabled) {
      toggleStandby();
      socketService.updateStatus('ONLINE');
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const timeString = currentTime.toLocaleTimeString('es-EC', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center">
      {/* Animated icon */}
      <div className="relative mb-8">
        <div className="w-32 h-32 rounded-full bg-gray-800 flex items-center justify-center animate-pulse-slow">
          <svg
            className="w-16 h-16 text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
        </div>
        {/* Pulse rings */}
        <div className="absolute inset-0 rounded-full border-2 border-gray-700 animate-ping opacity-20" />
      </div>

      {/* Title */}
      <h1 className="text-4xl font-bold text-gray-400 mb-2">KDS - STANDBY</h1>

      {/* Time */}
      <div className="text-6xl font-mono font-bold text-gray-500 mb-8">
        {timeString}
      </div>

      {/* Info */}
      <div className="text-center space-y-4 text-gray-600">
        <p className="text-lg">Pantalla en modo de espera</p>
        {touchEnabled ? (
          <button
            onClick={handleActivate}
            className="px-8 py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xl rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Tocar para Activar
          </button>
        ) : (
          <p className="text-sm">
            Presione <span className="text-yellow-500 font-bold">← + →</span> para activar
          </p>
        )}
      </div>

      {/* Screen info */}
      <div className="absolute bottom-8 text-center text-gray-700">
        <p className="text-lg font-medium">{screenName}</p>
        {config && (
          <>
            <p className="text-sm">Pantalla: KDS{config.number}</p>
            <p className="text-sm">Cola: {config.queue.name}</p>
          </>
        )}
      </div>
    </div>
  );
}
