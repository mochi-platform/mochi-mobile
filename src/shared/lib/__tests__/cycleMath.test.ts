import { addDaysISO, computeCycleState, daysBetweenISO } from "../cycleMath";
import { toLocalISODate } from "../dates";

describe("cycleMath", () => {
  const base = { lastPeriodStart: "2026-10-01", periodLength: 5, cycleLength: 28 };

  it("día 1 es menstrual", () => {
    const s = computeCycleState({ ...base, todayISO: "2026-10-01" });
    expect(s.phase).toBe("menstrual");
    expect(s.dayOfCycle).toBe(1);
  });

  it("la ovulación sale de la duración real (ciclo 28 → día 14)", () => {
    const s = computeCycleState({ ...base, todayISO: "2026-10-14" });
    expect(s.ovulationDay).toBe(14);
    expect(s.phase).toBe("ovulatoria");
  });

  it("un ciclo largo (35) ovula más tarde (día 21)", () => {
    const long = { ...base, cycleLength: 35 };
    expect(computeCycleState({ ...long, todayISO: "2026-10-14" }).phase).toBe("folicular");
    expect(computeCycleState({ ...long, todayISO: "2026-10-21" }).phase).toBe("ovulatoria");
  });

  it("después de la ovulación es lútea", () => {
    expect(computeCycleState({ ...base, todayISO: "2026-10-22" }).phase).toBe("lutea");
  });

  it("calcula la próxima menstruación", () => {
    const s = computeCycleState({ ...base, todayISO: "2026-10-20" });
    expect(s.nextPeriodDate).toBe("2026-10-29");
    expect(s.daysUntilNextPeriod).toBe(9);
  });

  it("al pasar de ciclo vuelve a menstrual", () => {
    expect(computeCycleState({ ...base, todayISO: "2026-10-29" }).phase).toBe("menstrual");
  });

  it("helpers de fechas", () => {
    expect(addDaysISO("2026-10-30", 3)).toBe("2026-11-02");
    expect(daysBetweenISO("2026-10-01", "2026-10-11")).toBe(10);
  });
});

describe("dates", () => {
  it("usa la fecha local, no UTC", () => {
    // 22:00 hora local: en UTC-5 ya sería el día siguiente en UTC.
    const d = new Date(2026, 9, 27, 22, 0, 0);
    expect(toLocalISODate(d)).toBe("2026-10-27");
  });
});
