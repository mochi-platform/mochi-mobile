import type { MobileScreen } from "@/src/features/home/components/BottomNav";

export const bottomNavRoutes: Record<MobileScreen, string> = {
  home: "/(tabs)",
  study: "/(tabs)/study",
  wellness: "/(tabs)/wellness",
  "mochi-duo": "/mochi-duo",
  profile: "/profile",
};

export const WELLNESS_ROUTES = [
  "/wellness",
  "/exercise",
  "/habits",
  "/mood",
  "/gratitude",
  "/cooking",
];

export function getBottomNavScreen(pathname: string): MobileScreen {
  if (pathname === "/mochi-duo" || pathname.startsWith("/mochi-duo")) return "mochi-duo";
  if (pathname === "/study") return "study";
  if (WELLNESS_ROUTES.includes(pathname)) return "wellness";
  if (pathname === "/profile") return "profile";
  return "home";
}

export function getVisibleTabs(settings: {
  partner_features_enabled: boolean;
  study_enabled: boolean;
  exercise_enabled: boolean;
  habits_enabled: boolean;
  cooking_enabled: boolean;
  mood_enabled: boolean;
  gratitude_enabled: boolean;
}): MobileScreen[] {
  const hasWellness =
    settings.exercise_enabled ||
    settings.habits_enabled ||
    settings.cooking_enabled ||
    settings.mood_enabled ||
    settings.gratitude_enabled;
  return [
    "home",
    ...(settings.study_enabled ? (["study"] as const) : []),
    ...(hasWellness ? (["wellness"] as const) : []),
    ...(settings.partner_features_enabled ? (["mochi-duo"] as const) : []),
    "profile",
  ];
}
