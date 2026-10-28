export type ExerciseItem = {
  id: string;
  name: string;
  sets: number | null;
  reps: number | null;
  duration_seconds: number | null;
  notes: string | null;
};

export type EnergyProfile = "baja" | "media" | "alta" | undefined;

export function energyTip(energy: EnergyProfile): string {
  switch (energy) {
    case "baja":
      return "Hoy tu energía suele ser baja: elige movimientos suaves y bloques cortos.";
    case "alta":
      return "Hoy tu energía suele ser alta: buen día para algo más intenso.";
    case "media":
      return "Hoy tu energía suele ser media: una rutina moderada te sentará bien.";
    default:
      return "Elige lo que te apetezca hoy. Mochi te sugiere según tu energía cuando registres tu ciclo.";
  }
}

/** Mismo ejercicio, distinto esfuerzo: puntuación aproximada (mayor = más intenso). */
export function effort(e: ExerciseItem): number {
  return (e.sets ?? 1) * (e.reps ?? 1) + (e.duration_seconds ?? 0) / 10;
}

/** Sugeridos para hoy: suaves si la energía es baja, intensos si es alta. */
export function suggestForToday(
  items: ExerciseItem[],
  energy: EnergyProfile,
  limit = 3,
): ExerciseItem[] {
  if (!energy || energy === "media") return items.slice(0, limit);
  const sorted = [...items].sort((a, b) => effort(a) - effort(b));
  return energy === "baja" ? sorted.slice(0, limit) : sorted.reverse().slice(0, limit);
}
