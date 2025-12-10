/**
 * Calcula el tiempo transcurrido desde una fecha
 */
export function getElapsedTime(createdAt: string | Date): {
  minutes: number;
  seconds: number;
  formatted: string;
} {
  // Asegurar que createdAt sea válido
  let created: Date;
  try {
    created = new Date(createdAt);
    // Verificar que la fecha sea válida
    if (isNaN(created.getTime())) {
      console.warn('[timeUtils] Invalid date:', createdAt);
      return { minutes: 0, seconds: 0, formatted: '00:00' };
    }
  } catch (e) {
    console.warn('[timeUtils] Error parsing date:', createdAt, e);
    return { minutes: 0, seconds: 0, formatted: '00:00' };
  }

  const now = new Date();
  const diff = now.getTime() - created.getTime();

  // Si la diferencia es negativa (fecha futura) o muy grande (más de 24 horas),
  // probablemente hay un problema de zona horaria o datos inválidos
  const totalSeconds = Math.max(0, Math.floor(diff / 1000));

  // Limitar a un máximo razonable (99:59) para evitar valores absurdos
  const cappedSeconds = Math.min(totalSeconds, 5999);
  const minutes = Math.floor(cappedSeconds / 60);
  const seconds = cappedSeconds % 60;

  // Forzar exactamente 2 dígitos para minutos (nunca más de 99)
  const minutesStr = String(Math.min(99, minutes)).padStart(2, '0');
  const secondsStr = String(seconds).padStart(2, '0');
  const formatted = `${minutesStr}:${secondsStr}`;

  return { minutes, seconds, formatted };
}

/**
 * Parsea un tiempo en formato MM:SS a minutos
 */
export function parseMinutes(timeStr: string): number {
  const [mins, secs] = timeStr.split(':').map(Number);
  return mins + (secs || 0) / 60;
}

/**
 * Determina el color basado en el tiempo transcurrido
 */
export function getColorForTime(
  createdAt: string | Date,
  cardColors: Array<{ color: string; minutes: string; order: number; isFullBackground?: boolean }>
): { color: string; isFullBackground: boolean } {
  const { minutes } = getElapsedTime(createdAt);

  // Ordenar por minutos (ascendente)
  const sortedColors = [...cardColors].sort(
    (a, b) => parseMinutes(a.minutes) - parseMinutes(b.minutes)
  );

  // Encontrar el color correspondiente (de mayor a menor)
  for (const cardColor of [...sortedColors].reverse()) {
    const threshold = parseMinutes(cardColor.minutes);
    if (minutes >= threshold) {
      return {
        color: cardColor.color,
        isFullBackground: cardColor.isFullBackground ?? false,
      };
    }
  }

  // Por defecto, el primer color (verde)
  return {
    color: sortedColors[0]?.color || '#98c530',
    isFullBackground: sortedColors[0]?.isFullBackground ?? false,
  };
}

/**
 * Formatea una hora
 */
export function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString('es-EC', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formatea fecha y hora
 */
export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleString('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
