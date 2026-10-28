import { DEFAULT_SCHEDULE, QUALITY, intervalLabel, nextSchedule } from "../sm2";

describe("SM-2", () => {
  it("sigue la secuencia 1 → 6 → n × facilidad (igual que el servidor)", () => {
    const first = nextSchedule(DEFAULT_SCHEDULE, QUALITY.good);
    expect(first.intervalDays).toBe(1);
    const second = nextSchedule(first, QUALITY.good);
    expect(second.intervalDays).toBe(6);
    const third = nextSchedule(second, QUALITY.easy);
    expect(third.intervalDays).toBe(16); // 6 × 2.6 redondeado, como en pgTAP
  });

  it("olvidar reinicia repeticiones y conserva la facilidad", () => {
    const learned = nextSchedule(nextSchedule(DEFAULT_SCHEDULE, 4), 4);
    const forgot = nextSchedule(learned, QUALITY.again);
    expect(forgot).toEqual({ easeFactor: learned.easeFactor, intervalDays: 1, repetitions: 0 });
  });

  it("la facilidad nunca baja de 1.3", () => {
    let card = DEFAULT_SCHEDULE;
    for (let i = 0; i < 30; i += 1) card = nextSchedule(card, QUALITY.hard);
    expect(card.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  it("etiquetas legibles", () => {
    expect(intervalLabel(1)).toBe("mañana");
    expect(intervalLabel(6)).toBe("en 6 días");
    expect(intervalLabel(65)).toBe("en 2 meses");
  });
});
