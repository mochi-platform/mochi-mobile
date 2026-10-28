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
        "ink-faint": token("ink-faint"),
        line: token("border"),
        accent: token("accent"),
        "accent-strong": token("accent-strong"),
        "accent-ink": token("accent-ink"),
        "accent-soft": token("accent-soft"),
        peach: token("peach"),
        positive: token("positive"),
        warning: token("warning"),
        danger: token("danger"),
        ...Object.fromEntries(
          ["study", "me", "kitchen", "duo", "ok"].flatMap((name) => [
            [`tint-${name}`, token(`tint-${name}`)],
            [`tint-${name}-ink`, token(`tint-${name}-ink`)],
          ]),
        ),
      },
      // Una familia por peso: en Android `fontWeight` no elige el archivo de una fuente propia.
      // Los nombres coinciden con src/shared/theme/fonts.ts y el plugin expo-font de app.config.js.
      fontFamily: {
        display: ["Fredoka_600SemiBold"],
        "display-medium": ["Fredoka_500Medium"],
        body: ["Nunito_600SemiBold"],
        "body-medium": ["Nunito_500Medium"],
        "body-bold": ["Nunito_700Bold"],
        "body-extrabold": ["Nunito_800ExtraBold"],
        quote: ["Fraunces_400Regular_Italic"],
        "quote-medium": ["Fraunces_500Medium_Italic"],
      },
      borderRadius: {
        card: "26px",
        control: "18px",
        tile: "14px",
      },
    },
  },
  plugins: [],
};
