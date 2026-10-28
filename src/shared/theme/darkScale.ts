import type { Shade } from "./palettes";

type RGB = [number, number, number];

/** Base oscura del tema (mismos valores que --color-canvas / surface-muted / border en global.css). */
const CANVAS: RGB = [24, 18, 36];
const SURFACE_MUTED: RGB = [50, 40, 74];
const BORDER: RGB = [70, 58, 100];

/** Tono 500 de cada escala de Tailwind: da el matiz que se mezcla con la base oscura. */
export const HUE_500: Record<string, string> = {
  red: "239 68 68",
  orange: "249 115 22",
  amber: "245 158 11",
  yellow: "234 179 8",
  green: "34 197 94",
  emerald: "16 185 129",
  teal: "20 184 166",
  sky: "14 165 233",
  blue: "59 130 246",
  indigo: "99 102 241",
  violet: "139 92 246",
  fuchsia: "217 70 239",
  rose: "244 63 94",
  slate: "100 116 139",
  gray: "107 114 128",
};
export const MUTED_HUES = Object.keys(HUE_500);

const parse = (channels: string): RGB => {
  const [r, g, b] = channels.split(/\s+/).map(Number);
  return [r, g, b];
};
const mix = (base: RGB, tint: RGB, amount: number): string =>
  base.map((v, i) => Math.round(v + (tint[i] - v) * amount)).join(" ");

/**
 * Tonos oscuros (700–950) de una escala para modo oscuro: en vez de los 950/900/800 saturados de
 * Tailwind, la base lavanda del tema con un toque del matiz. Así todos los módulos comparten
 * fondo y conservan su identidad por un tinte sutil. Los tonos claros (texto) no cambian.
 */
export function darkShades(tone500: string): Partial<Record<Shade, string>> {
  const tint = parse(tone500);
  return {
    950: mix(CANVAS, tint, 0.04),
    900: mix(SURFACE_MUTED, tint, 0.14),
    800: mix(BORDER, tint, 0.22),
    700: mix(BORDER, tint, 0.42),
  };
}
