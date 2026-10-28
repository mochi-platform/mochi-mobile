/**
 * Los mismos colores de global.css en hex, para lo que no acepta clases: iconos, SVG, Skia,
 * gráficos y el widget. Mantener en sincronía con los `--color-*` del tema claro.
 */
export const COLORS = {
  canvas: "#FBF6EF",
  surface: "#FFFFFF",
  surfaceMuted: "#F4ECE3",
  ink: "#3A2A2E",
  inkMuted: "#8A7479",
  inkFaint: "#B9A7A9",
  border: "#F1E8E2",
  accent: "#B9739F",
  accentStrong: "#9C5A85",
  accentInk: "#FFFFFF",
  accentSoft: "#F5E6EF",
  positive: "#4F9C78",
  warning: "#D98048",
  danger: "#D05668",
  mochiOutline: "#5A2F2F",
} as const;

/** Tintes: solo para el fondo del icono de una fila o tarjeta, nunca para fondos de pantalla. */
export type Tint = "study" | "me" | "kitchen" | "duo" | "ok";

export const TINTS: Record<Tint, { bg: string; ink: string; bgClass: string; inkClass: string }> = {
  study: { bg: "#ECE4F7", ink: "#8A6CC4", bgClass: "bg-tint-study", inkClass: "text-tint-study-ink" },
  me: { bg: "#FBE4E8", ink: "#D0607E", bgClass: "bg-tint-me", inkClass: "text-tint-me-ink" },
  kitchen: {
    bg: "#FDEBDC",
    ink: "#D98048",
    bgClass: "bg-tint-kitchen",
    inkClass: "text-tint-kitchen-ink",
  },
  duo: { bg: "#F6E1EC", ink: "#B9739F", bgClass: "bg-tint-duo", inkClass: "text-tint-duo-ink" },
  ok: { bg: "#E3F2EA", ink: "#4F9C78", bgClass: "bg-tint-ok", inkClass: "text-tint-ok-ink" },
};
