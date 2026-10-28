import { ageGroupFromBirth, firstPlanFor, modulesForGoals } from "../modules";

const now = new Date(2026, 9, 28); // 28 oct 2026

describe("ageGroupFromBirth", () => {
  it("menor de 16 queda bloqueada", () => {
    expect(ageGroupFromBirth(2011, 1, now)).toBe("under_16");
    expect(ageGroupFromBirth(2010, 12, now)).toBe("under_16"); // aún no cumple 16 (dic)
  });
  it("16 y 17 son menores con consentimiento de tutor", () => {
    expect(ageGroupFromBirth(2010, 10, now)).toBe("16_17");
    expect(ageGroupFromBirth(2009, 11, now)).toBe("16_17"); // 16 años todavía
    expect(ageGroupFromBirth(2009, 10, now)).toBe("16_17");
  });
  it("18 o más", () => {
    expect(ageGroupFromBirth(2008, 10, now)).toBe("18_plus");
    expect(ageGroupFromBirth(1990, 5, now)).toBe("18_plus");
  });
  it("rechaza datos inválidos", () => {
    expect(ageGroupFromBirth(2030, 1, now)).toBeNull();
    expect(ageGroupFromBirth(2000, 13, now)).toBeNull();
    expect(ageGroupFromBirth(Number.NaN, 1, now)).toBeNull();
  });
});

describe("modulesForGoals", () => {
  it("traduce objetivos a módulos", () => {
    const m = modulesForGoals(["study", "wellness"]);
    expect(m.has("study_enabled") && m.has("goals_enabled") && m.has("mood_enabled")).toBe(true);
    expect(m.has("cooking_enabled")).toBe(false);
  });
  it("sin objetivos hay un punto de partida", () => {
    expect([...modulesForGoals([])]).toEqual(["study_enabled"]);
  });
});

describe("firstPlanFor", () => {
  it("prioriza estudio, luego hábitos y cocina", () => {
    expect(firstPlanFor(new Set(["study_enabled"])).route).toBe("/study-create");
    expect(firstPlanFor(new Set(["habits_enabled"])).route).toBe("/habits");
    expect(firstPlanFor(new Set(["cooking_enabled"])).route).toBe("/cooking");
    expect(firstPlanFor(new Set()).route).toBe("/");
  });
});
