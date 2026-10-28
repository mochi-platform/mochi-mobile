import { energyTip, suggestForToday, type ExerciseItem } from "../suggestions";

const ex = (id: string, sets: number, reps: number, duration = 0): ExerciseItem => ({
  id,
  name: id,
  sets,
  reps,
  duration_seconds: duration,
  notes: null,
});
const items = [ex("fuerte", 5, 12), ex("suave", 1, 5), ex("medio", 3, 8)];

describe("suggestForToday", () => {
  it("energía baja prefiere lo suave", () => {
    expect(suggestForToday(items, "baja", 1)[0].id).toBe("suave");
  });
  it("energía alta prefiere lo intenso", () => {
    expect(suggestForToday(items, "alta", 1)[0].id).toBe("fuerte");
  });
  it("sin dato o media respeta el orden original", () => {
    expect(suggestForToday(items, undefined, 2).map((i) => i.id)).toEqual(["fuerte", "suave"]);
  });
  it("no modifica el arreglo original", () => {
    suggestForToday(items, "alta");
    expect(items.map((i) => i.id)).toEqual(["fuerte", "suave", "medio"]);
  });
});

describe("energyTip", () => {
  it("devuelve un texto para cada perfil y sin dato", () => {
    for (const e of ["baja", "media", "alta", undefined] as const)
      expect(energyTip(e).length).toBeGreaterThan(10);
  });
  it("no menciona el ciclo ni la fase", () => {
    for (const e of ["baja", "media", "alta"] as const)
      expect(energyTip(e)).not.toMatch(/ciclo|fase|menstru/i);
  });
});
