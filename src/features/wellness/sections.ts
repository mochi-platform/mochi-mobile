import type { Ionicons } from "@expo/vector-icons";

export type WellnessKey = "exercise" | "habits" | "mood" | "gratitude" | "cooking";

export type WellnessSection = {
  key: WellnessKey;
  label: string;
  description: string;
  route: string;
  icon: keyof typeof Ionicons.glyphMap;
  enabledKey: `${WellnessKey}_enabled`;
};

export const WELLNESS_SECTIONS: WellnessSection[] = [
  {
    key: "exercise",
    label: "Ejercicio",
    description: "Rutinas y entrenos",
    route: "/exercise",
    icon: "barbell",
    enabledKey: "exercise_enabled",
  },
  {
    key: "habits",
    label: "Hábitos",
    description: "Rachas y seguimiento diario",
    route: "/habits",
    icon: "leaf",
    enabledKey: "habits_enabled",
  },
  {
    key: "mood",
    label: "Ánimo",
    description: "Check-in emocional",
    route: "/mood",
    icon: "heart",
    enabledKey: "mood_enabled",
  },
  {
    key: "gratitude",
    label: "Gratitud",
    description: "Tu diario de gratitud",
    route: "/gratitude",
    icon: "flower",
    enabledKey: "gratitude_enabled",
  },
  {
    key: "cooking",
    label: "Cocina",
    description: "Recetas con Mochi",
    route: "/cooking",
    icon: "restaurant",
    enabledKey: "cooking_enabled",
  },
];

export function visibleWellnessSections(visibility: Record<string, boolean>): WellnessSection[] {
  return WELLNESS_SECTIONS.filter((section) => visibility[section.enabledKey]);
}
