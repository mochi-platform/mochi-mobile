/**
 * Geometría de Mochi en un lienzo de 170 × 160, calcada de assets/mochi/source/mochi-base.png
 * (maqueta aprobada: docs/remaster/mockups/mochi.js). Todo se escala desde aquí.
 */
export const MOCHI_VIEWBOX = { width: 170, height: 160 } as const;

export const MOCHI_COLORS = {
  outline: "#5A2F2F",
  bodyTop: "#FFF8EC",
  bodyBottom: "#F6E1CF",
  capTop: "#EBDDF4",
  capBottom: "#D3BCE6",
  capCrease: "#C7AEDC",
  topTop: "#FBD3D0",
  topBottom: "#F3A9A5",
  topCrease: "#EE9C98",
  blush: "#F26D8F",
  freckle: "#D6C2EA",
  tongue: "#F08AA0",
  tear: "#9FD3F0",
  heart: "#E2557F",
  gold: "#F4C65A",
  lilac: "#B9A3E3",
  mint: "#8FD0B5",
} as const;

/** Silueta: cuerpo, gorro lavanda y copete rosa. El contorno se dibuja detrás con trazo grueso. */
export const BODY_PATH =
  "M85 64 C130 64 162 88 162 116 C162 140 128 149 85 149 C42 149 8 140 8 116 C8 88 40 64 85 64 Z";
export const CAP_PATH =
  "M23 84 C16 66 30 48 52 44 C64 39 106 39 118 44 C141 50 154 66 147 84 C139 93 118 94 104 88 C97 85 91 84 85 86 C79 84 73 85 66 88 C52 94 31 93 23 84 Z";
export const TOP_PATH =
  "M47 43 C47 22 64 7 86 7 C108 7 125 22 125 43 C121 53 110 55 101 51 C96 58 86 60 80 56 C73 59 62 57 60 51 C53 53 48 49 47 43 Z";

/** Brillos y pliegues que dan volumen. */
export const BODY_SHINE_PATH = "M30 120 C40 136 70 141 100 139";
export const CAP_CREASE_PATH = "M40 74 C52 82 70 82 80 78";
export const TOP_CREASE_PATH = "M60 46 C66 50 74 50 80 47";

/** Puntitos blancos del glaseado: [cx, cy, r, opacidad]. */
export const SPRINKLES: readonly (readonly [number, number, number, number])[] = [
  [72, 17, 2.6, 1],
  [84, 19, 2, 1],
  [98, 18, 2.4, 1],
  [64, 29, 2.2, 1],
  [80, 32, 1.4, 1],
  [94, 33, 2.1, 1],
  [108, 28, 1.5, 1],
  [102, 43, 2.3, 1],
  [62, 40, 2, 1],
  [36, 66, 3, 0.9],
  [44, 78, 2.4, 0.9],
  [85, 64, 2.8, 1],
  [118, 72, 1.6, 1],
  [135, 68, 1.4, 1],
  [140, 92, 2.4, 0.8],
  [62, 122, 2.4, 0.8],
];

/** Anclajes de la cara y de los accesorios. */
export const ANCHORS = {
  leftEye: { x: 60, y: 96 },
  rightEye: { x: 110, y: 96 },
  mouth: { x: 85, y: 103 },
  leftCheek: { x: 51, y: 106 },
  rightCheek: { x: 119, y: 106 },
  /** Centro de los ojos: pivote del parpadeo. */
  eyeLine: 96,
  /** Base del cuerpo: pivote de la respiración y del aplastamiento. */
  ground: { x: 85, y: 149 },
  headTop: { x: 86, y: 7 },
  shadow: { x: 85, y: 152, rx: 62, ry: 5 },
} as const;

export const OUTLINE_WIDTH = 7;
export const EYE_RADIUS = 8.2;
