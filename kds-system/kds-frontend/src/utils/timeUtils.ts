/**
 * Calcula el tiempo transcurrido desde una fecha
 */
export function getElapsedTime(createdAt: string | Date): {
  minutes: number;
  seconds: number;
  formatted: string;
} {
  const created = new Date(createdAt);
  const now = new Date();
  const diff = now.getTime() - created.getTime();

  const totalSeconds = Math.floor(diff / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const formatted = `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;

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
