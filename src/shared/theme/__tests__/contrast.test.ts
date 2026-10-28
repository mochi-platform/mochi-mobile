import { COLORS, TINTS } from "../tokens";

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("contraste de los tokens (WCAG AA)", () => {
  it.each([
    ["texto principal en crema", COLORS.ink, COLORS.canvas],
    ["texto secundario en crema", COLORS.inkMuted, COLORS.canvas],
    ["texto secundario en tarjeta", COLORS.inkMuted, COLORS.surface],
    ["texto secundario en zona hundida", COLORS.inkMuted, COLORS.surfaceMuted],
    ["texto del botón principal", COLORS.accentInk, COLORS.accent],
    ["enlaces y botón suave", COLORS.accentStrong, COLORS.accentSoft],
  ])("%s ≥ 4.5", (_, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(Object.entries(TINTS))("icono del tinte %s ≥ 3", (_, tint) => {
    expect(contrast(tint.ink, tint.bg)).toBeGreaterThanOrEqual(3);
  });
});
