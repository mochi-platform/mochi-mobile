/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--color-${name}) / <alpha-value>)`;
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
// Escala de marca controlada por variables CSS: permite cambiar de tema sin tocar las pantallas.
const brandScale = (name) =>
  Object.fromEntries(SHADES.map((shade) => [shade, `rgb(var(--${name}-${shade}) / <alpha-value>)`]));

// Matices cuya escala también va por variables (ver scripts/gen-palette.js): en modo oscuro sus
// tonos 700–950 se mezclan con la base del tema en ThemeContext.
const HUES = ["red", "orange", "amber", "yellow", "green", "emerald", "teal", "sky", "blue", "indigo", "violet", "fuchsia", "rose", "slate", "gray"];

module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ...Object.fromEntries(HUES.map((hue) => [hue, brandScale(hue)])),
        purple: brandScale("purple"),
        pink: brandScale("pink"),
        canvas: token("canvas"),
        surface: token("surface"),
        "surface-muted": token("surface-muted"),
        ink: token("ink"),
        "ink-muted": token("ink-muted"),
        line: token("border"),
        accent: token("accent"),
        "accent-ink": token("accent-ink"),
        "accent-soft": token("accent-soft"),
        peach: token("peach"),
        positive: token("positive"),
        warning: token("warning"),
        danger: token("danger"),
      },
      borderRadius: {
        card: "24px",
        control: "16px",
      },
    },
  },
  plugins: [],
};
