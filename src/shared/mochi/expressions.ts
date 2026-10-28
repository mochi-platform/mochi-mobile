import { ANCHORS, EYE_RADIUS, MOCHI_COLORS as C } from "./geometry";
import type { MochiExpression } from "./manifest";

/**
 * Cada expresión es una combinación de piezas (ojos, cejas, boca, extra) y la intensidad del rubor.
 * Las piezas se traducen a primitivas de dibujo puras (`buildFace`) que MochiCanvas pinta con Skia,
 * así que añadir una expresión es solo añadir una entrada aquí.
 */
export type EyeKind =
  | "round"
  | "look"
  | "sparkle"
  | "arc"
  | "closedDown"
  | "half"
  | "focus"
  | "teary"
  | "heart";
export type MouthKind =
  | "w"
  | "open"
  | "big"
  | "o"
  | "small"
  | "smug"
  | "flat"
  | "wavy"
  | "frown";
export type BrowKind = "up";
export type ExtraKind = "sparkles" | "zzz" | "dots" | "sweat" | "confetti" | "heart";

export type FaceSpec = {
  eyes: EyeKind;
  mouth: MouthKind;
  blush: number;
  brows?: BrowKind;
  extra?: ExtraKind;
};

export const EXPRESSIONS: Record<MochiExpression, FaceSpec> = {
  happy: { eyes: "round", mouth: "w", blush: 1 },
  excited: { eyes: "sparkle", mouth: "open", blush: 1.2, extra: "sparkles" },
  thinking: { eyes: "look", mouth: "o", blush: 0.8, extra: "dots" },
  sleepy: { eyes: "closedDown", mouth: "small", blush: 0.8, extra: "zzz" },
  proud: { eyes: "arc", mouth: "smug", blush: 1.3 },
  worried: { eyes: "round", brows: "up", mouth: "wavy", blush: 0.7, extra: "sweat" },
  celebrating: { eyes: "arc", mouth: "big", blush: 1.3, extra: "confetti" },
  tired: { eyes: "half", mouth: "flat", blush: 0.6 },
  focused: { eyes: "focus", mouth: "small", blush: 0.8 },
  soft_sad: { eyes: "teary", brows: "up", mouth: "frown", blush: 0.9 },
  love: { eyes: "heart", mouth: "w", blush: 1.4, extra: "heart" },
};

/** Ojos abiertos: son los únicos que parpadean y siguen la mirada. */
export const BLINKING_EYES: ReadonlySet<EyeKind> = new Set([
  "round",
  "look",
  "sparkle",
  "focus",
  "teary",
]);

/** Primitivas de dibujo independientes del motor (Skia en la app, SVG en las maquetas). */
export type Shape =
  | { type: "circle"; cx: number; cy: number; r: number; color: string; opacity?: number }
  | {
      type: "path";
      d: string;
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
      opacity?: number;
      /** Giro en grados alrededor de (cx, cy). */
      rotate?: { deg: number; cx: number; cy: number };
    };

export type Face = {
  /** Ojos (y lo que se mueve con ellos): se escalan en vertical al parpadear. */
  eyes: Shape[];
  /** Brillos de las pupilas: se desplazan al mirar. */
  pupils: Shape[];
  brows: Shape[];
  mouth: Shape[];
  extra: Shape[];
  blush: number;
  blinks: boolean;
};

const INK = C.outline;
const line = (d: string, width = 2.6): Shape => ({
  type: "path",
  d,
  stroke: INK,
  strokeWidth: width,
});

/** Parte inferior de un ojo redondo cortado por una línea horizontal (párpado). */
function lidPath(x: number, y: number, cut: number): string {
  const yc = y + cut;
  const dx = Math.sqrt(Math.max(EYE_RADIUS ** 2 - cut ** 2, 0));
  const large = cut <= 0 ? 1 : 0;
  return `M${x - dx} ${yc} A${EYE_RADIUS} ${EYE_RADIUS} 0 ${large} 0 ${x + dx} ${yc} Z`;
}

function buildEyes(kind: EyeKind): { eyes: Shape[]; pupils: Shape[] } {
  const L = ANCHORS.leftEye;
  const R = ANCHORS.rightEye;
  const both = <T>(fn: (p: { x: number; y: number }, side: -1 | 1) => T[]): T[] => [
    ...fn(L, -1),
    ...fn(R, 1),
  ];
  const ball = (p: { x: number; y: number }, r = EYE_RADIUS): Shape => ({
    type: "circle",
    cx: p.x,
    cy: p.y,
    r,
    color: INK,
  });
  const shine = (p: { x: number; y: number }, dx: number, dy: number, big = 2.8, small = 1.2) => [
    { type: "circle", cx: p.x + 2.6 + dx, cy: p.y - 2.8 + dy, r: big, color: "#FFFFFF" } as Shape,
    {
      type: "circle",
      cx: p.x - 2.4 + dx,
      cy: p.y + 2.6 + dy,
      r: small,
      color: "#FFFFFF",
      opacity: 0.8,
    } as Shape,
  ];

  switch (kind) {
    case "round":
      return { eyes: both((p) => [ball(p)]), pupils: both((p) => shine(p, 0, 0)) };
    case "look":
      return { eyes: both((p) => [ball(p)]), pupils: both((p) => shine(p, 1.5, -1.5)) };
    case "sparkle":
      return {
        eyes: both((p) => [ball(p, 9)]),
        pupils: both((p) => [
          {
            type: "path",
            d: `M${p.x + 2.5} ${p.y - 6} l1.3 3 3 1.3 -3 1.3 -1.3 3 -1.3 -3 -3 -1.3 3 -1.3z`,
            fill: "#FFFFFF",
          },
          { type: "circle", cx: p.x - 3, cy: p.y + 3, r: 1.6, color: "#FFFFFF" },
        ]),
      };
    case "arc":
      return {
        eyes: both((p) => [line(`M${p.x - 7} ${p.y + 2} Q${p.x} ${p.y - 8} ${p.x + 7} ${p.y + 2}`, 3.2)]),
        pupils: [],
      };
    case "closedDown":
      return {
        eyes: both((p) => [line(`M${p.x - 7} ${p.y - 1} Q${p.x} ${p.y + 6} ${p.x + 7} ${p.y - 1}`, 3.2)]),
        pupils: [],
      };
    case "half":
      // Párpado caído hacia afuera: cansada, no enojada.
      return {
        eyes: both((p, side) => [
          { type: "path", d: lidPath(p.x, p.y, 0), fill: INK },
          { type: "circle", cx: p.x + 2.5, cy: p.y + 2, r: 1.8, color: "#FFFFFF" },
          line(
            side < 0
              ? `M${p.x - 9} ${p.y + 1} L${p.x + 9} ${p.y - 2}`
              : `M${p.x - 9} ${p.y - 2} L${p.x + 9} ${p.y + 1}`,
            3,
          ),
        ]),
        pupils: [],
      };
    case "focus":
      return {
        eyes: both((p) => [{ type: "path", d: lidPath(p.x, p.y, -4), fill: INK }]),
        pupils: both((p) => [
          { type: "circle", cx: p.x + 2.5, cy: p.y - 0.5, r: 2.4, color: "#FFFFFF" },
        ]),
      };
    case "teary":
      return {
        eyes: both((p) => [
          ball(p, 8.6),
          {
            type: "path",
            d: `M${p.x - 7} ${p.y + 6} Q${p.x} ${p.y + 9} ${p.x + 7} ${p.y + 6}`,
            stroke: C.tear,
            strokeWidth: 2.2,
          },
        ]),
        pupils: both((p) => shine(p, 0, 0.2, 3.2, 1.8)),
      };
    case "heart":
      return {
        eyes: both((p) => [
          {
            type: "path",
            d: `M${p.x} ${p.y + 7} C${p.x - 11} ${p.y - 1} ${p.x - 6} ${p.y - 10} ${p.x} ${p.y - 4} C${p.x + 6} ${p.y - 10} ${p.x + 11} ${p.y - 1} ${p.x} ${p.y + 7}Z`,
            fill: C.heart,
          },
          { type: "circle", cx: p.x + 3, cy: p.y - 4, r: 1.5, color: "#FFFFFF" },
        ]),
        pupils: [],
      };
  }
}

function buildBrows(kind?: BrowKind): Shape[] {
  if (kind !== "up") return [];
  return [
    { ...line("M52 84 L66 80"), rotate: { deg: -14, cx: 59, cy: 82 } } as Shape,
    { ...line("M104 80 L118 84"), rotate: { deg: 14, cx: 111, cy: 82 } } as Shape,
  ];
}

function buildMouth(kind: MouthKind): Shape[] {
  switch (kind) {
    case "w":
      return [line("M78 101 q3.5 5 7 0 q3.5 5 7 0")];
    case "open":
      return [
        { type: "path", d: "M78 101 Q85 113 92 101 Z", fill: INK },
        { type: "path", d: "M81 106 Q85 110 89 106", fill: C.tongue },
      ];
    case "big":
      return [
        { type: "path", d: "M75 100 Q85 118 95 100 Z", fill: INK },
        { type: "path", d: "M79 107 Q85 113 91 107", fill: C.tongue },
      ];
    case "o":
      return [{ type: "circle", cx: 88, cy: 104, r: 3.5, color: INK }];
    case "small":
      return [line("M81 103 Q85 106 89 103")];
    case "smug":
      return [line("M79 101 Q87 108 93 99")];
    case "flat":
      return [line("M80 104 H90")];
    case "wavy":
      return [line("M77 105 q2 -3 4 0 t4 0 t4 0 t4 0")];
    case "frown":
      return [line("M80 106 Q85 101 90 106")];
  }
}

function sparkle(x: number, y: number, s: number, color: string): Shape {
  return {
    type: "path",
    d: `M${x} ${y} l${s} ${2.4 * s} ${2.4 * s} ${s} -${2.4 * s} ${s} -${s} ${2.4 * s} -${s} -${2.4 * s} -${2.4 * s} -${s} ${2.4 * s} -${s}z`,
    fill: color,
  };
}

function buildExtra(kind?: ExtraKind): Shape[] {
  switch (kind) {
    case "sparkles":
      return [sparkle(14, 40, 2.5, C.gold), sparkle(152, 30, 2, C.gold), sparkle(160, 64, 1.4, C.gold)];
    case "zzz":
      return [
        { ...line("M14 30 h8 l-8 8 h8", 2.4), opacity: 0.75 } as Shape,
        { ...line("M28 18 h6 l-6 6 h6", 2.4), opacity: 0.75 } as Shape,
      ];
    case "dots":
      return [
        { type: "circle", cx: 140, cy: 30, r: 2.6, color: INK, opacity: 0.55 },
        { type: "circle", cx: 150, cy: 22, r: 3.2, color: INK, opacity: 0.55 },
        { type: "circle", cx: 161, cy: 12, r: 3.8, color: INK, opacity: 0.55 },
      ];
    case "sweat":
      return [
        {
          type: "path",
          d: "M146 70 C142 78 142 83 147 83 C152 83 152 78 146 70Z",
          fill: C.tear,
          stroke: INK,
          strokeWidth: 1.6,
        },
      ];
    case "confetti":
      return [
        { type: "path", d: "M12 34 h6 v3 h-6 Z", fill: C.tongue, rotate: { deg: -30, cx: 15, cy: 35 } },
        { type: "path", d: "M150 26 h6 v3 h-6 Z", fill: C.lilac, rotate: { deg: 25, cx: 153, cy: 27 } },
        { type: "circle", cx: 24, cy: 18, r: 2.4, color: C.gold },
        { type: "circle", cx: 156, cy: 56, r: 2.2, color: C.mint },
        { type: "path", d: "M138 8 h5 v2.6 h-5 Z", fill: C.gold, rotate: { deg: -20, cx: 140, cy: 9 } },
        { type: "circle", cx: 8, cy: 64, r: 2, color: C.lilac },
      ];
    case "heart":
      return [{ type: "path", d: "M150 34 C142 28 145 20 150 24 C155 20 158 28 150 34Z", fill: C.heart }];
    default:
      return [];
  }
}

export function buildFace(expression: MochiExpression): Face {
  const spec = EXPRESSIONS[expression];
  const { eyes, pupils } = buildEyes(spec.eyes);
  return {
    eyes,
    pupils,
    brows: buildBrows(spec.brows),
    mouth: buildMouth(spec.mouth),
    extra: buildExtra(spec.extra),
    blush: spec.blush,
    blinks: BLINKING_EYES.has(spec.eyes),
  };
}
