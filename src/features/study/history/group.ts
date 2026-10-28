export type SessionRow = {
  id: string;
  subject: string;
  duration_seconds: number;
  completed_at: string;
};

export type DayGroup = { day: string; totalSeconds: number; sessions: SessionRow[] };

/** Agrupa sesiones por día local (YYYY-MM-DD), de más reciente a más antiguo. */
export function groupByDay(rows: SessionRow[]): DayGroup[] {
  const map = new Map<string, DayGroup>();
  for (const row of rows) {
    const d = new Date(row.completed_at);
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const group = map.get(day) ?? { day, totalSeconds: 0, sessions: [] };
    group.totalSeconds += row.duration_seconds;
    group.sessions.push(row);
    map.set(day, group);
  }
  return [...map.values()].sort((a, b) => (a.day < b.day ? 1 : -1));
}

export function formatHours(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function formatDayLabel(day: string, today: string): string {
  if (day === today) return "Hoy";
  const date = new Date(`${day}T00:00:00`);
  return new Intl.DateTimeFormat("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "short",
  }).format(date);
}
