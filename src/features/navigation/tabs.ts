import type { Ionicons } from "@expo/vector-icons";

/** Pestañas del Remaster: se arman según los módulos activos (máximo 5). */
export type TabKey = "hoy" | "estudio" | "cocina" | "yo" | "duo";
export type AppMode = "personal" | "partner";

export type TabDef = {
  key: TabKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
};

export const TAB_DEFS: Record<TabKey, TabDef> = {
  hoy: { key: "hoy", label: "Hoy", icon: "sunny", route: "/(tabs)" },
  estudio: { key: "estudio", label: "Estudio", icon: "book", route: "/(tabs)/study" },
  cocina: { key: "cocina", label: "Cocina", icon: "restaurant", route: "/(tabs)/cooking" },
  yo: { key: "yo", label: "Yo", icon: "flower", route: "/(tabs)/me" },
  duo: { key: "duo", label: "Duo", icon: "heart", route: "/(tabs)/duo" },
};

type Visibility = {
  study_enabled: boolean;
  cooking_enabled: boolean;
  partner_features_enabled: boolean;
};

/** Quien llega solo por su pareja ve Hoy · Duo · Yo; el resto, lo que tenga activo. */
export function tabsFor(visibility: Visibility, mode: AppMode = "personal"): TabDef[] {
  if (mode === "partner") return [TAB_DEFS.hoy, TAB_DEFS.duo, TAB_DEFS.yo];
  const keys: TabKey[] = [
    "hoy",
    ...(visibility.study_enabled ? (["estudio"] as const) : []),
    ...(visibility.cooking_enabled ? (["cocina"] as const) : []),
    "yo",
    ...(visibility.partner_features_enabled ? (["duo"] as const) : []),
  ];
  return keys.map((key) => TAB_DEFS[key]);
}

/** Rutas que se abren desde Yo y la mantienen marcada. */
const YO_ROUTES = ["/me", "/wellness", "/habits", "/exercise", "/mood", "/gratitude", "/goals"];

/** Pestaña activa para una ruta, o null si la barra no debe mostrarse ahí. */
export function activeTabFor(pathname: string): TabKey | null {
  if (pathname === "/") return "hoy";
  if (pathname === "/study") return "estudio";
  if (pathname === "/cooking") return "cocina";
  if (YO_ROUTES.includes(pathname)) return "yo";
  if (pathname === "/duo") return "duo";
  return null;
}
