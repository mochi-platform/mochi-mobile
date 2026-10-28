import { currentWeek, daysUntil, hhmm, minutesBetween } from "../api";

describe("utilidades de estudio", () => {
  it("cuenta días con la fecha local", () => {
    const now = new Date(2026, 9, 28, 22, 30);
    expect(daysUntil("2026-10-30", now)).toBe(2);
    expect(daysUntil("2026-10-28", now)).toBe(0);
  });

  it("formatea horas y duración", () => {
    expect(hhmm("09:00:00")).toBe("09:00");
    expect(minutesBetween("09:00:00", "09:45:00")).toBe(45);
  });

  it("la semana va de lunes a domingo y marca hoy", () => {
    const week = currentWeek(new Date(2026, 9, 28));
    expect(week.map((d) => d.letter)).toEqual(["L", "M", "X", "J", "V", "S", "D"]);
    expect(week.find((d) => d.isToday)?.day).toBe(28);
  });
});
