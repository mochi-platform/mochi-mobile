import { Appearance } from "react-native";
import { DARK_MODE_ENABLED } from "@/src/shared/config/flags";

// Con el modo oscuro apagado, la app se ve siempre en claro aunque el sistema esté en oscuro.
// Va aquí, en el nivel del módulo, porque otros archivos llaman a tc() al importarse.
if (!DARK_MODE_ENABLED) Appearance.setColorScheme("light");

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255,
    gn = g / 255,
    bn = b / 255;
  const max = Math.max(rn, gn, bn),
    min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return [h / 6, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const hue = (p: number, q: number, t: number) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  let r = l,
    g = l,
    b = l;
  if (s !== 0) {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue(p, q, h + 1 / 3);
    g = hue(p, q, h);
    b = hue(p, q, h - 1 / 3);
  }
  const to = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** Invierte la luminosidad manteniendo el tono, acotada para no quemar ni apagar el color. */
export function invertForDark(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const [h, s, l] = rgbToHsl(...rgb);
  let inverted = Math.min(0.9, Math.max(0.14, 1 - l));
  // Acentos de marca (saturados y de luminosidad media, p. ej. #7c3aed): invertidos quedarían
  // medios sobre un fondo oscuro. Se aclaran para que iconos y textos se lean.
  if (s > 0.35 && l > 0.3 && l < 0.72) inverted = Math.max(inverted, 0.68);
  return hslToHex(h, s, inverted);
}

/** Color adaptado al tema actual (claro: igual; oscuro: luminosidad invertida). */
export function tc(hex: string): string {
  return DARK_MODE_ENABLED && Appearance.getColorScheme() === "dark" ? invertForDark(hex) : hex;
}
