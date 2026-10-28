import type { Ionicons } from "@expo/vector-icons";
import type { Recipe, RoutineWithExercises, StudyBlock } from "@/src/shared/types/database";

export type UpcomingExam = {
  id: string;
  subject: string;
  exam_date: string;
};

export type QuickAccessItem = {
  label: string;
  route: "/goals" | "/vouchers" | "/mood" | "/gratitude" | "/mochi-duo";
  enabledKey:
    | "partner_features_enabled"
    | "goals_enabled"
    | "vouchers_enabled"
    | "mood_enabled"
    | "gratitude_enabled";
  icon: keyof typeof Ionicons.glyphMap;
  cardClass: string;
  iconColor: string;
};

export type MoodDisplay = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  cardClass: string;
  iconColor: string;
  textColor: string;
};

export type WeeklySummary = {
  studySessions: number;
  currentStreak: number;
  habitsProgress: number;
  pointsGained: number;
  moodDots: (number | null)[];
};

export type HomeDashboardCache = {
  todayBlocks: StudyBlock[];
  todayRoutines: RoutineWithExercises[];
  habitCount: number;
  habitLogsCount: number;
  latestRecipe: Recipe | null;
  recipeCount: number;
  upcomingExams: UpcomingExam[];
  weeklySummary: WeeklySummary;
  totalPoints: number;
  cachedAt: string;
};
