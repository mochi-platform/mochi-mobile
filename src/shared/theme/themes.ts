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

/** Variables CSS que reemplazan las escalas de marca para el tema indicado. */
export function themeVariables(theme: ThemeDef, dark = false): Record<string, string> {
  const result: Record<string, string> = {};
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
