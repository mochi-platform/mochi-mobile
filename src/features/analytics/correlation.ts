export type Pair = { day: string; energy: number; studyMinutes: number };

/** Coeficiente de Pearson entre dos series de igual largo; null si no hay datos suficientes. */
export function pearson(x: number[], y: number[]): number | null {
  const n = x.length;
  if (n < 5 || n !== y.length) return null;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i += 1) {
    num += (x[i] - mx) * (y[i] - my);
    dx += (x[i] - mx) ** 2;
    dy += (y[i] - my) ** 2;
  }
  if (dx === 0 || dy === 0) return null;
  return num / Math.sqrt(dx * dy);
}

/** Une energía diaria (promedio) con minutos de estudio del mismo día (solo días con ambos datos). */
export function buildPairs(
  energy: { logged_date: string; overall_rating: number }[],
  sessions: { completed_at: string; duration_seconds: number }[],
): Pair[] {
  const energyByDay = new Map<string, number[]>();
  for (const row of energy) {
    const list = energyByDay.get(row.logged_date) ?? [];
    list.push(row.overall_rating);
    energyByDay.set(row.logged_date, list);
  }
  const studyByDay = new Map<string, number>();
  for (const s of sessions) {
    const d = new Date(s.completed_at);
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    studyByDay.set(day, (studyByDay.get(day) ?? 0) + s.duration_seconds / 60);
  }
  const pairs: Pair[] = [];
  for (const [day, ratings] of energyByDay) {
    pairs.push({
      day,
      energy: ratings.reduce((a, b) => a + b, 0) / ratings.length,
      studyMinutes: studyByDay.get(day) ?? 0,
    });
  }
  return pairs.sort((a, b) => (a.day < b.day ? -1 : 1));
}

export function describeCorrelation(r: number | null, days: number): string {
  if (r === null) {
    return days < 5
      ? "Registra tu energía al menos 5 días para ver cómo se relaciona con tu estudio."
      : "Aún no hay variación suficiente para calcular la relación.";
  }
  const strength = Math.abs(r) >= 0.6 ? "fuerte" : Math.abs(r) >= 0.3 ? "moderada" : "débil";
  if (Math.abs(r) < 0.15)
    return "No se nota una relación clara entre tu energía y tus minutos de estudio.";
  return r > 0
    ? `Relación ${strength}: los días que te sientes con más energía estudias más.`
    : `Relación ${strength}: estudias más los días que registras menos energía. Cuida tus descansos.`;
}
