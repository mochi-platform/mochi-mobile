/**
 * Contraste AA verificado en src/shared/theme/__tests__/contrast.test.ts.
 * Los mismos colores de global.css en hex, para lo que no acepta clases: iconos, SVG, Skia,
 * gráficos y el widget. Mantener en sincronía con los `--color-*` del tema claro.
 */
export const COLORS = {
  canvas: "#FBF6EF",
  surface: "#FFFFFF",
  surfaceMuted: "#F4ECE3",
  ink: "#3A2A2E",
  inkMuted: "#7A6469",
  inkFaint: "#B9A7A9",
  border: "#F1E8E2",
  accent: "#A35C8A",
  accentStrong: "#8E4E78",
  accentInk: "#FFFFFF",
  accentSoft: "#F5E6EF",
  positive: "#4F9C78",
  warning: "#D98048",
  danger: "#D05668",
  mochiOutline: "#5A2F2F",
  /** Pista de anillos y barras de progreso. */
  track: "#EDE3DF",
} as const;

/** Tintes: solo para el fondo del icono de una fila o tarjeta, nunca para fondos de pantalla. */
export type Tint = "study" | "me" | "kitchen" | "duo" | "ok";

export const TINTS: Record<Tint, { bg: string; ink: string; bgClass: string; inkClass: string }> = {
  study: { bg: "#ECE4F7", ink: "#7556B3", bgClass: "bg-tint-study", inkClass: "text-tint-study-ink" },
  me: { bg: "#FBE4E8", ink: "#B84868", bgClass: "bg-tint-me", inkClass: "text-tint-me-ink" },
  kitchen: {
    bg: "#FDEBDC",
    ink: "#B0602A",
    bgClass: "bg-tint-kitchen",
    inkClass: "text-tint-kitchen-ink",
  },
  duo: { bg: "#F6E1EC", ink: "#9C5A85", bgClass: "bg-tint-duo", inkClass: "text-tint-duo-ink" },
  ok: { bg: "#E3F2EA", ink: "#3B8062", bgClass: "bg-tint-ok", inkClass: "text-tint-ok-ink" },
};
