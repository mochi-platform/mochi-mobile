import { tc } from "@/src/shared/theme/colors";
import { toLocalISODate } from "@/src/shared/lib/dates";
import type { RoutineWithExercises } from "@/src/shared/types/database";
import type { MoodDisplay, QuickAccessItem } from "@/src/features/home/dashboard/types";

export const colorMap: Record<string, string> = {
  pink: "bg-tint-me",
  blue: "bg-surface-muted",
  yellow: "bg-tint-kitchen",
  teal: "bg-tint-ok",
  purple: "bg-tint-study",
  green: "bg-tint-ok",
};

export const moodDisplayMap: Record<number, MoodDisplay> = {
  1: {
    label: "Mal",
    icon: "sad",
    cardClass: "bg-surface-muted",
    iconColor: tc("#b91c1c"),
    textColor: "text-danger",
  },
  2: {
    label: "Regular",
    icon: "sad-outline",
    cardClass: "bg-surface-muted",
    iconColor: tc("#c2410c"),
    textColor: "text-ink",
  },
  3: {
    label: "Bien",
    icon: "happy-outline",
    cardClass: "bg-surface-muted",
    iconColor: tc("#a16207"),
    textColor: "text-ink",
  },
  4: {
    label: "Muy bien",
    icon: "happy",
    cardClass: "bg-surface-muted",
    iconColor: tc("#15803d"),
    textColor: "text-positive",
  },
  5: {
    label: "Excelente",
    icon: "heart",
    cardClass: "bg-surface-muted",
    iconColor: tc("#be185d"),
    textColor: "text-ink",
  },
};

export function getMoodDisplay(mood: number | null | undefined): MoodDisplay {
  return mood
    ? moodDisplayMap[mood]
    : {
        label: "Sin registro",
        icon: "ellipse-outline",
        cardClass: "bg-surface-muted",
        iconColor: tc("#94a3b8"),
        textColor: "text-ink-muted",
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
    cardClass: "bg-tint-me",
    iconColor: tc("#be185d"),
  },
  {
    label: "Vales",
    route: "/vouchers",
    enabledKey: "vouchers_enabled",
    icon: "ticket",
    cardClass: "bg-tint-kitchen",
    iconColor: tc("#92400e"),
  },
  {
    label: "Mochi Duo™",
    route: "/mochi-duo",
    enabledKey: "partner_features_enabled",
    icon: "people",
    cardClass: "bg-tint-ok",
    iconColor: tc("#047857"),
  },
  {
    label: "Estado de ánimo",
    route: "/mood",
    enabledKey: "mood_enabled",
    icon: "heart",
    cardClass: "bg-tint-study",
    iconColor: tc("#7c3aed"),
  },
  {
    label: "Gratitud",
    route: "/gratitude",
    enabledKey: "gratitude_enabled",
    icon: "flower",
    cardClass: "bg-tint-ok",
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
      badgeClass: "bg-tint-me text-danger",
      text: "Hoy",
    };
  if (days === 1)
    return {
      badgeClass: "bg-tint-me text-danger",
      text: "Mañana",
    };
  if (days <= 3)
    return {
      badgeClass: "bg-tint-me text-ink",
      text: `En ${days} días`,
    };
  if (days <= 7)
    return {
      badgeClass: "bg-tint-kitchen text-ink",
      text: `En ${days} días`,
    };
  return {
    badgeClass: "bg-tint-ok text-positive",
    text: `En ${days} días`,
  };
}
