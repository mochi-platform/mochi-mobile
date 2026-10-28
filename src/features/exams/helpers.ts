import type {
  CalmChecklistState,
  ExamPreparationState,
  MissionState,
  MissionStepKey,
} from "./types";

export const DEFAULT_CALM_CHECKLIST: CalmChecklistState = {
  pendingClosure: false,
  miniReview: false,
  rest: false,
};

export const DEFAULT_MISSION: MissionState = {
  diagnosis: false,
  guidedPractice: false,
  mockExam: false,
  finalReview: false,
};

export const MISSION_ORDER: { key: MissionStepKey; label: string }[] = [
  { key: "diagnosis", label: "Diagnóstico" },
  { key: "guidedPractice", label: "Práctica guiada" },
  { key: "mockExam", label: "Simulacro" },
  { key: "finalReview", label: "Repaso final" },
];

export const CALM_ORDER: { key: keyof CalmChecklistState; label: string }[] = [
  { key: "pendingClosure", label: "Cierre de pendientes" },
  { key: "miniReview", label: "Mini repaso" },
  { key: "rest", label: "Descanso" },
];

export const EXAM_REMINDER_OPTIONS = [7, 3, 1] as const;

export function createDefaultPreparationState(): ExamPreparationState {
  return {
    calm: { ...DEFAULT_CALM_CHECKLIST },
    mission: { ...DEFAULT_MISSION },
  };
}

export function buildExamPreparationKey(userId: string, examId: string): string {
  return `exam:preparation:${userId}:${examId}`;
}

export function formatExamDate(value: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
  })
    .format(new Date(`${value}T00:00:00`))
    .replace(".", "")
    .toLowerCase();
}

export function getResultBadge(
  gradeValue: number,
  maxGrade: number,
): { label: string; className: string } {
  const percentage = gradeValue / maxGrade;

  if (percentage >= 0.9) {
    return {
      label: "Excelente",
      className: "bg-tint-ok text-positive",
    };
  }

  if (percentage >= 0.7) {
    return {
      label: "Aprobado",
      className: "bg-tint-kitchen text-ink",
    };
  }

  return {
    label: "Reprobado",
    className: "bg-tint-me text-danger",
  };
}

export function getDaysUntil(value: string, todayISO: string): number {
  const start = new Date(`${todayISO}T00:00:00`).getTime();
  const end = new Date(`${value}T00:00:00`).getTime();
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
}

export function getUpcomingLabel(value: string, todayISO: string): string {
  const days = getDaysUntil(value, todayISO);
  if (days <= 0) return "¡Hoy!";
  if (days === 1) return "Mañana";
  return `En ${days} días`;
}

export function formatReminderDays(days: number[]): string {
  if (days.length === 0) return "Sin recordatorios";

  if (days.length === 1) {
    return days[0] === 1 ? "1 día antes" : `${days[0]} días antes`;
  }

  const sorted = [...days].sort((left, right) => right - left);
  const allButLast = sorted.slice(0, -1).join(", ");
  const last = sorted[sorted.length - 1];
  return `${allButLast} y ${last} días antes`;
}

export function getMissionProgress(mission: MissionState): number {
  const completed = MISSION_ORDER.reduce((count, step) => count + (mission[step.key] ? 1 : 0), 0);
  return Math.round((completed / MISSION_ORDER.length) * 100);
}

export function getNextMissionStep(mission: MissionState): string {
  const pendingStep = MISSION_ORDER.find((step) => !mission[step.key]);
  return pendingStep ? pendingStep.label : "Misión completada";
}
