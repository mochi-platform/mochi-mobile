export type ModuleKey =
  | "study_enabled"
  | "exercise_enabled"
  | "habits_enabled"
  | "cooking_enabled"
  | "goals_enabled"
  | "mood_enabled"
  | "gratitude_enabled";

export type ModuleOption = { key: ModuleKey; label: string; description: string };

export const MODULES: ModuleOption[] = [
  {
    key: "study_enabled",
    label: "Estudio",
    description: "Horario semanal, bloques de estudio y temporizador",
  },
  {
    key: "exercise_enabled",
    label: "Ejercicio",
    description: "Rutinas personalizadas y seguimiento de entrenos",
  },
  {
    key: "habits_enabled",
    label: "Hábitos",
    description: "Seguimiento diario de tus hábitos y rachas",
  },
  {
    key: "cooking_enabled",
    label: "Cocina",
    description: "Recetas con IA y modo cocina paso a paso",
  },
  { key: "goals_enabled", label: "Metas", description: "Define objetivos y visualiza tu progreso" },
  {
    key: "mood_enabled",
    label: "Estado de ánimo",
    description: "Check-in emocional diario en segundos",
  },
  {
    key: "gratitude_enabled",
    label: "Gratitud",
    description: "Diario de gratitud para cerrar el día",
  },
];

export type GoalKey = "study" | "habits" | "wellness" | "cooking" | "fitness";

export const GOALS: { key: GoalKey; label: string; modules: ModuleKey[] }[] = [
  { key: "study", label: "Estudiar mejor", modules: ["study_enabled", "goals_enabled"] },
  { key: "habits", label: "Crear hábitos", modules: ["habits_enabled"] },
  { key: "wellness", label: "Cuidar mi bienestar", modules: ["mood_enabled", "gratitude_enabled"] },
  { key: "cooking", label: "Cocinar más fácil", modules: ["cooking_enabled"] },
  { key: "fitness", label: "Moverme más", modules: ["exercise_enabled"] },
];

export function modulesForGoals(goals: GoalKey[]): Set<ModuleKey> {
  const result = new Set<ModuleKey>();
  for (const goal of GOALS) {
    if (goals.includes(goal.key)) goal.modules.forEach((m) => result.add(m));
  }
  // Siempre hay un punto de partida útil.
  if (result.size === 0) result.add("study_enabled");
  return result;
}

export type AgeGroup = "16_17" | "18_plus" | "under_16";

/** Calcula el grupo de edad desde año y mes de nacimiento. No se guarda la fecha. */
export function ageGroupFromBirth(
  year: number,
  month: number,
  now: Date = new Date(),
): AgeGroup | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null;
  if (year < 1900 || year > now.getFullYear()) return null;
  let age = now.getFullYear() - year;
  if (now.getMonth() + 1 < month) age -= 1;
  if (age < 16) return "under_16";
  if (age < 18) return "16_17";
  return "18_plus";
}

/** Plan inicial según los módulos elegidos. */
export function firstPlanFor(modules: Set<ModuleKey>): {
  title: string;
  body: string;
  route: string;
  cta: string;
} {
  if (modules.has("study_enabled")) {
    return {
      title: "Tu primer bloque de estudio",
      body: "Elige una materia y un horario. Con 25 minutos basta para empezar.",
      route: "/study-create",
      cta: "Crear mi primer bloque",
    };
  }
  if (modules.has("habits_enabled")) {
    return {
      title: "Tu primer hábito",
      body: "Empieza con uno pequeño que puedas cumplir hoy.",
      route: "/habits",
      cta: "Crear mi primer hábito",
    };
  }
  if (modules.has("cooking_enabled")) {
    return {
      title: "Tu primera receta",
      body: "Pídele a Mochi una receta con lo que tengas en casa.",
      route: "/cooking",
      cta: "Cocinar con Mochi",
    };
  }
  return {
    title: "Hoy empieza con Mochi",
    body: "Explora tus módulos desde el inicio.",
    route: "/",
    cta: "Ir al inicio",
  };
}
