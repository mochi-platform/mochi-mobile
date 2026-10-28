import { darkShades, HUE_500, MUTED_HUES } from "../darkScale";

const lum = (c: string) => {
  const [r, g, b] = c.split(" ").map(Number);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

describe("darkScale", () => {
  it("cubre las 15 escalas que usa la app", () => {
    expect(MUTED_HUES).toHaveLength(15);
  });

  it("los tonos oscuros quedan cerca de la base lavanda, no saturados", () => {
    for (const hue of MUTED_HUES) {
      const s = darkShades(HUE_500[hue]);
      expect(lum(s[950]!)).toBeLessThan(40);
      expect(lum(s[900]!)).toBeLessThan(70);
      const [r, g, b] = s[950]!.split(" ").map(Number);
      expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeLessThan(45);
    }
  });

  it("mantiene el orden de claridad 950 < 900 < 800 < 700", () => {
    const s = darkShades(HUE_500.blue);
    expect(lum(s[950]!)).toBeLessThan(lum(s[900]!));
    expect(lum(s[900]!)).toBeLessThan(lum(s[800]!));
    expect(lum(s[800]!)).toBeLessThan(lum(s[700]!));
  });
});
