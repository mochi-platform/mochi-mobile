import { darkShades, HUE_500, MUTED_HUES } from "./darkScale";
import { PALETTES, type PaletteName, type Shade } from "./palettes";

export type ThemeId = "base" | "menta" | "melocoton" | "oceano" | "fucsia";

export type ThemeDef = {
  id: ThemeId;
  label: string;
  /** Solo el tema base es gratuito. */
  premium: boolean;
  /** Qué paletas ocupan los lugares de la escala `purple` (principal) y `pink` (secundaria). */
  primary: PaletteName;
  secondary: PaletteName;
  swatch: string;
};

export const THEMES: ThemeDef[] = [
  {
    id: "base",
    label: "Lavanda",
    premium: false,
    primary: "purple",
    secondary: "pink",
    swatch: "#8b5cf6",
  },
  {
    id: "menta",
    label: "Menta",
    premium: true,
    primary: "emerald",
    secondary: "teal",
    swatch: "#10b981",
  },
  {
    id: "melocoton",
    label: "Melocotón",
    premium: true,
    primary: "orange",
    secondary: "rose",
    swatch: "#f97316",
  },
  {
    id: "oceano",
    label: "Océano",
    premium: true,
    primary: "sky",
    secondary: "indigo",
    swatch: "#0ea5e9",
  },
  {
    id: "fucsia",
    label: "Fucsia",
    premium: true,
    primary: "fuchsia",
    secondary: "amber",
    swatch: "#d946ef",
  },
];

export function getTheme(id: string | null | undefined): ThemeDef {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0];
}

/**
 * Acento de cada tema (hex). El tema base usa el de global.css. Contraste AA verificado en
 * src/shared/theme/__tests__/contrast.test.ts: blanco sobre `accent` y `strong` sobre `soft`.
 */
export const THEME_ACCENTS: Record<ThemeId, { accent: string; strong: string; soft: string }> = {
  base: { accent: "#A35C8A", strong: "#8E4E78", soft: "#F5E6EF" },
  menta: { accent: "#2D7A64", strong: "#22604E", soft: "#E1F2EB" },
  melocoton: { accent: "#B0532F", strong: "#8C3F22", soft: "#FBE6DA" },
  oceano: { accent: "#2E6A99", strong: "#24557C", soft: "#E0EDF7" },
  fucsia: { accent: "#A33E8C", strong: "#84306F", soft: "#F7E1F1" },
};

const rgbChannels = (hex: string) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(" ");

/** Variables CSS que reemplazan las escalas de marca y el acento para el tema indicado. */
export function themeVariables(theme: ThemeDef, dark = false): Record<string, string> {
  const result: Record<string, string> = {};
  if (theme.id !== "base") {
    const accent = THEME_ACCENTS[theme.id];
    result["--color-accent"] = rgbChannels(accent.accent);
    result["--color-accent-strong"] = rgbChannels(accent.strong);
    result["--color-accent-soft"] = rgbChannels(accent.soft);
    result["--color-tint-duo-ink"] = rgbChannels(accent.strong);
  }
  const scales: [string, Record<Shade, string>][] = [
    ["purple", PALETTES[theme.primary]],
    ["pink", PALETTES[theme.secondary]],
  ];
  for (const [name, palette] of scales) {
    // En oscuro, los tonos 700–950 se funden con la base del tema (ver darkScale).
    const muted = dark ? darkShades(palette[500]) : {};
    (Object.keys(PALETTES.purple) as unknown as Shade[]).forEach((shade) => {
      result[`--${name}-${shade}`] = muted[shade] ?? palette[shade];
    });
  }
  if (dark) {
    for (const hue of MUTED_HUES) {
      const muted = darkShades(HUE_500[hue]);
      (Object.keys(muted) as unknown as Shade[]).forEach((shade) => {
        result[`--${hue}-${shade}`] = muted[shade] as string;
      });
    }
  }
  return result;
}

/** Un tema premium solo se puede usar con plan que lo permita. */
export function canUseTheme(theme: ThemeDef, themesAllowed: boolean): boolean {
  return !theme.premium || themesAllowed;
}
