import { Fraunces_400Regular_Italic, Fraunces_500Medium_Italic } from "@expo-google-fonts/fraunces";
import { Fredoka_500Medium, Fredoka_600SemiBold } from "@expo-google-fonts/fredoka";
import {
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from "@expo-google-fonts/nunito";

/**
 * Fuentes de la app. Las claves son el nombre de familia que usan las clases `font-*` de
 * tailwind.config.js; en Android coinciden con el nombre del archivo que embebe el plugin
 * expo-font (app.config.js), así que están disponibles sin esperar a la carga.
 */
export const FONT_ASSETS = {
  Fredoka_500Medium,
  Fredoka_600SemiBold,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Fraunces_400Regular_Italic,
  Fraunces_500Medium_Italic,
} as const;

export type FontName = keyof typeof FONT_ASSETS;

/** Familias para estilos fuera de NativeWind (Skia, gráficos, widget). */
export const FONTS = {
  display: "Fredoka_600SemiBold",
  displayMedium: "Fredoka_500Medium",
  body: "Nunito_600SemiBold",
  bodyMedium: "Nunito_500Medium",
  bodyBold: "Nunito_700Bold",
  bodyExtraBold: "Nunito_800ExtraBold",
  quote: "Fraunces_400Regular_Italic",
  quoteMedium: "Fraunces_500Medium_Italic",
} as const satisfies Record<string, FontName>;
