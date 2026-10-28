import { buildPairs, describeCorrelation, pearson } from "../correlation";

describe("pearson", () => {
  it("correlación perfecta positiva y negativa", () => {
    expect(pearson([1, 2, 3, 4, 5], [2, 4, 6, 8, 10])).toBeCloseTo(1);
    expect(pearson([1, 2, 3, 4, 5], [10, 8, 6, 4, 2])).toBeCloseTo(-1);
  });
  it("devuelve null con pocos datos o sin variación", () => {
    expect(pearson([1, 2], [1, 2])).toBeNull();
    expect(pearson([3, 3, 3, 3, 3], [1, 2, 3, 4, 5])).toBeNull();
  });
});

describe("buildPairs", () => {
  it("promedia la energía del día y suma minutos de estudio local", () => {
    const pairs = buildPairs(
      [
        { logged_date: "2026-10-26", overall_rating: 2 },
        { logged_date: "2026-10-26", overall_rating: 4 },
        { logged_date: "2026-10-27", overall_rating: 5 },
      ],
      [
        { completed_at: new Date(2026, 9, 26, 10).toISOString(), duration_seconds: 1800 },
        { completed_at: new Date(2026, 9, 26, 20).toISOString(), duration_seconds: 1800 },
      ],
    );
    expect(pairs).toEqual([
      { day: "2026-10-26", energy: 3, studyMinutes: 60 },
      { day: "2026-10-27", energy: 5, studyMinutes: 0 },
    ]);
  });
});

describe("describeCorrelation", () => {
  it("explica la relación sin hablar de salud", () => {
    expect(describeCorrelation(0.8, 10)).toMatch(/fuerte/);
    expect(describeCorrelation(-0.4, 10)).toMatch(/moderada/);
    expect(describeCorrelation(0.05, 10)).toMatch(/No se nota/);
    expect(describeCorrelation(null, 3)).toMatch(/al menos 5 días/);
    expect(describeCorrelation(0.7, 10)).not.toMatch(/ciclo|fase|menstru/i);
  });
});
