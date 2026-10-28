export const pad2 = (n: number): string => String(n).padStart(2, "0");

export const buildRange = (count: number, step = 1): number[] => {
  const safe = Math.max(1, Math.floor(step) || 1);
  return Array.from({ length: Math.ceil(count / safe) }, (_, i) => i * safe);
};

/** Minutos de la rueda: múltiplos del paso, más el minuto original si no lo es (14:07 no se altera). */
export function minuteOptions(step: number, original: number): number[] {
  const base = buildRange(60, step);
  return base.includes(original) ? base : [...base, original].sort((a, b) => a - b);
}

/** Separa "HH:MM"; valores inválidos caen a 00:00 y se acotan a 0–23 / 0–59. */
export function parseTime(time: string): { hours: number; minutes: number } {
  const [h, m] = time.split(":");
  const hours = Math.min(23, Math.max(0, Math.trunc(Number(h)) || 0));
  const minutes = Math.min(59, Math.max(0, Math.trunc(Number(m)) || 0));
  return { hours, minutes };
}

/** Lleva los minutos al múltiplo de `step` más cercano sin pasarse de 59 (07:03 → 07:05, 07:58 → 07:55). */
export function snapMinutes(minutes: number, step: number): number {
  if (step <= 1) return minutes;
  const snapped = Math.round(minutes / step) * step;
  return Math.min(snapped, Math.floor(59 / step) * step);
}

export const formatTime = (hours: number, minutes: number): string =>
  `${pad2(hours)}:${pad2(minutes)}`;

/** Índice de la fila centrada según el desplazamiento, acotado al rango. */
export function indexFromOffset(offsetY: number, itemHeight: number, count: number): number {
  return Math.min(count - 1, Math.max(0, Math.round(offsetY / itemHeight)));
}

export function periodOfDay(hours: number): string {
  if (hours < 6) return "Madrugada";
  if (hours < 12) return "Mañana";
  if (hours < 19) return "Tarde";
  return "Noche";
}
