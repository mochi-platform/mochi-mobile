import { tc } from "@/src/shared/theme/colors";
import { toLocalISODate } from "@/src/shared/lib/dates";
import type { RoutineWithExercises } from "@/src/shared/types/database";
import type { MoodDisplay, QuickAccessItem } from "@/src/features/home/dashboard/types";

export const colorMap: Record<string, string> = {
  pink: "bg-pink-200 dark:bg-pink-800",
  blue: "bg-blue-200 dark:bg-blue-800",
  yellow: "bg-yellow-200 dark:bg-yellow-800",
  teal: "bg-teal-200 dark:bg-teal-800",
  purple: "bg-purple-200 dark:bg-purple-800",
  green: "bg-green-200 dark:bg-green-800",
};

export const moodDisplayMap: Record<number, MoodDisplay> = {
  1: {
    label: "Mal",
    icon: "sad",
    cardClass: "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950",
    iconColor: tc("#b91c1c"),
    textColor: "text-red-800 dark:text-red-200",
  },
  2: {
    label: "Regular",
    icon: "sad-outline",
    cardClass: "border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950",
    iconColor: tc("#c2410c"),
    textColor: "text-orange-800 dark:text-orange-200",
  },
  3: {
    label: "Bien",
    icon: "happy-outline",
    cardClass: "border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950",
    iconColor: tc("#a16207"),
    textColor: "text-yellow-800 dark:text-yellow-200",
  },
  4: {
    label: "Muy bien",
    icon: "happy",
    cardClass: "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950",
    iconColor: tc("#15803d"),
    textColor: "text-green-800 dark:text-green-200",
  },
  5: {
    label: "Excelente",
    icon: "heart",
    cardClass: "border-pink-200 dark:border-pink-800 bg-pink-50 dark:bg-pink-950",
    iconColor: tc("#be185d"),
    textColor: "text-pink-800 dark:text-pink-200",
  },
};

export function getMoodDisplay(mood: number | null | undefined): MoodDisplay {
  return mood
    ? moodDisplayMap[mood]
    : {
        label: "Sin registro",
        icon: "ellipse-outline",
        cardClass: "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950",
        iconColor: tc("#94a3b8"),
        textColor: "text-slate-500",
      };
}

export function buildCurrentWeekDays(): string[] {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + 1);
  weekStart.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + index);
    return toLocalISODate(day);
  });
}

export function formatTimeHHMM(value: string): string {
  const [hoursRaw = "00", minutesRaw = "00"] = value.split(":");
  const hours = Number.parseInt(hoursRaw, 10);
  const minutes = Number.parseInt(minutesRaw, 10);

  const safeHours = Number.isFinite(hours) ? Math.max(0, Math.min(23, hours)) : 0;
  const safeMinutes = Number.isFinite(minutes) ? Math.max(0, Math.min(59, minutes)) : 0;

  return `${String(safeHours).padStart(2, "0")}:${String(safeMinutes).padStart(2, "0")}`;
}

export function getBlockDurationLabel(startTime: string, endTime: string): string {
  const [startHoursRaw = "0", startMinutesRaw = "0"] = startTime.split(":");
  const [endHoursRaw = "0", endMinutesRaw = "0"] = endTime.split(":");

  const startHours = Number.parseInt(startHoursRaw, 10);
  const startMinutes = Number.parseInt(startMinutesRaw, 10);
  const endHours = Number.parseInt(endHoursRaw, 10);
  const endMinutes = Number.parseInt(endMinutesRaw, 10);

  const startTotal =
    (Number.isFinite(startHours) ? startHours : 0) * 60 +
    (Number.isFinite(startMinutes) ? startMinutes : 0);
  const endTotal =
    (Number.isFinite(endHours) ? endHours : 0) * 60 +
    (Number.isFinite(endMinutes) ? endMinutes : 0);
  const durationMinutes = Math.max(0, endTotal - startTotal);
  const durationHours = Math.floor(durationMinutes / 60);
  const remainingMinutes = durationMinutes % 60;

  if (durationHours > 0 && remainingMinutes > 0) {
    return `${durationHours}h ${remainingMinutes}min`;
  }

  if (durationHours > 0) {
    return `${durationHours}h`;
  }

  return `${durationMinutes}min`;
}

export const quickAccessItems: QuickAccessItem[] = [
  {
    label: "Metas",
    route: "/goals",
    enabledKey: "goals_enabled",
    icon: "flag",
    cardClass: "border-pink-200 dark:border-pink-800 bg-pink-100 dark:bg-pink-900",
    iconColor: tc("#be185d"),
  },
  {
    label: "Vales",
    route: "/vouchers",
    enabledKey: "vouchers_enabled",
    icon: "ticket",
    cardClass: "border-yellow-200 dark:border-yellow-800 bg-yellow-100 dark:bg-yellow-900",
    iconColor: tc("#92400e"),
  },
  {
    label: "Mochi Duo™",
    route: "/mochi-duo",
    enabledKey: "partner_features_enabled",
    icon: "people",
    cardClass: "border-emerald-200 dark:border-emerald-800 bg-emerald-100 dark:bg-emerald-900",
    iconColor: tc("#047857"),
  },
  {
    label: "Estado de ánimo",
    route: "/mood",
    enabledKey: "mood_enabled",
    icon: "heart",
    cardClass: "border-purple-200 dark:border-purple-800 bg-purple-100 dark:bg-purple-900",
    iconColor: tc("#7c3aed"),
  },
  {
    label: "Gratitud",
    route: "/gratitude",
    enabledKey: "gratitude_enabled",
    icon: "flower",
    cardClass: "border-emerald-200 dark:border-emerald-800 bg-emerald-100 dark:bg-emerald-900",
    iconColor: tc("#047857"),
  },
];

export const quickAccessRouteMap: Record<QuickAccessItem["route"], string> = {
  "/goals": "/(tabs)/goals",
  "/vouchers": "/vouchers",
  "/mood": "/(tabs)/mood",
  "/gratitude": "/(tabs)/gratitude",
  "/mochi-duo": "/mochi-duo",
};

export function buildCycleDismissKey(userId: string): string {
  return `dashboard:cycle_prompt_dismissed:${userId}`;
}

export function buildDashboardCacheKey(userId: string): string {
  return `dashboard:home-cache:${userId}`;
}

export function getRoutineTotalTime(routine: RoutineWithExercises): string {
  const totalSeconds = routine.routine_exercises.reduce(
    (sum, re) => sum + (re.exercise?.duration_seconds ?? 0),
    0,
  );
  return `${Math.ceil(totalSeconds / 60)} min`;
}

export function getDaysUntilExam(examDate: string): number {
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  const exam = new Date(`${examDate}T00:00:00`);
  exam.setHours(0, 0, 0, 0);

  return Math.round((exam.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
}

export function getUrgencyStyles(days: number): { badgeClass: string; text: string } {
  if (days <= 0)
    return {
      badgeClass: "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300",
      text: "Hoy",
    };
  if (days === 1)
    return {
      badgeClass: "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300",
      text: "Mañana",
    };
  if (days <= 3)
    return {
      badgeClass: "bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300",
      text: `En ${days} días`,
    };
  if (days <= 7)
    return {
      badgeClass: "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200",
      text: `En ${days} días`,
    };
  return {
    badgeClass: "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300",
    text: `En ${days} días`,
  };
}
