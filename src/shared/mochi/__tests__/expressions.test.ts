import { BLINKING_EYES, buildFace, EXPRESSIONS, type Shape } from "../expressions";
import { EXPRESSION_BASE_MOOD, type MochiExpression } from "../manifest";

const ALL = Object.keys(EXPRESSION_BASE_MOOD) as MochiExpression[];

function numbersIn(shape: Shape): number[] {
  if (shape.type === "circle") return [shape.cx, shape.cy, shape.r];
  return (shape.d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
}

describe("expresiones de Mochi", () => {
  it("cada expresión del manifiesto tiene cara definida", () => {
    expect(Object.keys(EXPRESSIONS).sort()).toEqual([...ALL].sort());
  });

  it.each(ALL)("%s produce ojos y boca con coordenadas válidas", (expression) => {
    const face = buildFace(expression);
    expect(face.eyes.length).toBeGreaterThan(0);
    expect(face.mouth.length).toBeGreaterThan(0);
    const shapes = [...face.eyes, ...face.pupils, ...face.brows, ...face.mouth, ...face.extra];
    for (const value of shapes.flatMap(numbersIn)) expect(Number.isFinite(value)).toBe(true);
  });

  it("solo parpadean los ojos abiertos", () => {
    expect(buildFace("happy").blinks).toBe(true);
    expect(buildFace("sleepy").blinks).toBe(false);
    expect(buildFace("proud").blinks).toBe(false);
    for (const expression of ALL) {
      expect(buildFace(expression).blinks).toBe(BLINKING_EYES.has(EXPRESSIONS[expression].eyes));
    }
  });

  it("los ojos cerrados no tienen brillo de pupila", () => {
    expect(buildFace("celebrating").pupils).toHaveLength(0);
    expect(buildFace("happy").pupils.length).toBeGreaterThan(0);
  });
});
