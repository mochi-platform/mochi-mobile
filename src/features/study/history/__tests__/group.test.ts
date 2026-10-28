import { formatDayLabel, formatHours, groupByDay, type SessionRow } from "../group";

const row = (id: string, iso: string, seconds: number): SessionRow => ({
  id,
  subject: "Mate",
  duration_seconds: seconds,
  completed_at: iso,
});

describe("groupByDay", () => {
  it("agrupa por día local y ordena del más reciente al más antiguo", () => {
    const groups = groupByDay([
      row("a", new Date(2026, 9, 26, 10, 0).toISOString(), 1800),
      row("b", new Date(2026, 9, 27, 9, 0).toISOString(), 3600),
      row("c", new Date(2026, 9, 27, 22, 30).toISOString(), 600),
    ]);
    expect(groups.map((g) => g.day)).toEqual(["2026-10-27", "2026-10-26"]);
    expect(groups[0].totalSeconds).toBe(4200);
    expect(groups[0].sessions).toHaveLength(2);
  });
});

describe("formatHours", () => {
  it("formatea minutos y horas", () => {
    expect(formatHours(1500)).toBe("25 min");
    expect(formatHours(3600)).toBe("1 h");
    expect(formatHours(5400)).toBe("1 h 30 min");
  });
});

describe("formatDayLabel", () => {
  it("usa 'Hoy' para el día actual", () => {
    expect(formatDayLabel("2026-10-28", "2026-10-28")).toBe("Hoy");
    expect(formatDayLabel("2026-10-27", "2026-10-28")).not.toBe("Hoy");
  });
});
