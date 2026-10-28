/**
 * SM-2 (mismo cálculo que review_flashcard en el servidor). Sirve para mostrar
 * "volverás a verla en N días" antes de calificar; el servidor es quien decide.
 */
export type CardSchedule = { easeFactor: number; intervalDays: number; repetitions: number };

export type Rating = "again" | "hard" | "good" | "easy";

/** Calidad SM-2 (0 a 5) de cada botón. */
export const QUALITY: Record<Rating, number> = { again: 1, hard: 3, good: 4, easy: 5 };

export const DEFAULT_SCHEDULE: CardSchedule = { easeFactor: 2.5, intervalDays: 0, repetitions: 0 };

export function nextSchedule(card: CardSchedule, quality: number): CardSchedule {
  if (quality < 3) {
    return { easeFactor: card.easeFactor, intervalDays: 1, repetitions: 0 };
  }
  const easeFactor = Math.max(
    1.3,
    card.easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02),
  );
  const repetitions = card.repetitions + 1;
  const intervalDays =
    repetitions === 1
      ? 1
      : repetitions === 2
        ? 6
        : Math.round(Math.max(card.intervalDays, 1) * easeFactor);
  return { easeFactor: Math.round(easeFactor * 100) / 100, intervalDays, repetitions };
}

export function intervalLabel(days: number): string {
  if (days <= 1) return "mañana";
  if (days < 30) return `en ${days} días`;
  const months = Math.round(days / 30);
  return months === 1 ? "en 1 mes" : `en ${months} meses`;
}
