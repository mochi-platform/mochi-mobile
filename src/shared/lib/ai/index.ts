import AsyncStorage from "@react-native-async-storage/async-storage";
import { toLocalISODate } from "@/src/shared/lib/dates";
import { track } from "@/src/shared/lib/observability/analytics";
import { reportError } from "@/src/shared/lib/observability/reportError";
import { supabase } from "@/src/shared/lib/supabase";

/**
 * Cliente fino de IA. Los prompts, la validación y las claves viven en la Edge Function `ai`
 * (supabase/functions/ai). Aquí solo se envía `task` + `input` y se reciben resultados ya validados.
 */
const AI_TASK_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? ""}/functions/v1/ai/task`;

export type AIErrorCode =
  | "CONFIGURATION"
  | "RATE_LIMIT"
  | "NETWORK"
  | "TIMEOUT"
  | "API_ERROR"
  | "EMPTY_RESPONSE"
  | "PARSE_ERROR"
  | "VALIDATION_ERROR"
  | "ALL_MODELS_UNAVAILABLE"
  | "UNKNOWN";

export class AIError extends Error {
  code: AIErrorCode;
  retryable: boolean;
  status?: number;
  model?: string;
  cause?: unknown;

  constructor(params: {
    code: AIErrorCode;
    message: string;
    retryable?: boolean;
    status?: number;
    model?: string;
    cause?: unknown;
  }) {
    super(params.message);
    this.name = "AIError";
    this.code = params.code;
    this.retryable = Boolean(params.retryable);
    this.status = params.status;
    this.model = params.model;
    this.cause = params.cause;
  }
}

export type StudyHistoryMessage = { role: "user" | "assistant"; content: string };
export type RecipeGenerationType = "normal" | "keto" | "vegetariana" | "vegana" | "alta_proteina";
export type RecipeDifficulty = "fácil" | "media" | "difícil";

export interface RecipeGenerationOptions {
  recipeType: RecipeGenerationType;
  servings: number;
  complexity: RecipeDifficulty;
}

export interface AIRecipeResponse {
  title: string;
  description: string;
  prep_time_minutes: number;
  cook_time_minutes: number;
  servings: number;
  difficulty: RecipeDifficulty;
  cuisine_type: string;
  tags: string[];
  ingredients: {
    name: string;
    amount: number | null;
    unit: string | null;
    notes: string | null;
  }[];
  steps: {
    step_number: number;
    title: string;
    instructions: string;
    duration_seconds: number | null;
    temperature: string | null;
    tip: string | null;
  }[];
}

export interface FlashcardPair {
  front: string;
  back: string;
}

export interface AISuggestion {
  description: string;
  estimatedDuration?: number;
  difficulty?: "fácil" | "medio" | "difícil";
}

export interface StudyBlockSuggestion {
  subject: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  reason: string;
}

export interface StudyBlockSuggestionParams {
  context: string;
}

export type ActionType = "study" | "exercise" | "goal" | "habit";
export type TaskDifficulty = "easy" | "medium" | "hard";
export type RecommendationType = "rest" | "focus" | "motivation";
export type RecommendationUrgency = "low" | "medium" | "high";

export interface ConvertNoteToActionInput {
  note: string;
  context?: {
    cyclePhase?: string;
    energyLevel?: number;
    currentGoals?: string[];
  };
}

export interface ConvertNoteToActionOutput {
  type: ActionType;
  confidence: number;
  data: {
    title: string;
    description?: string;
    durationMinutes?: number;
    difficulty?: TaskDifficulty;
    [key: string]: unknown;
  };
  reasoning: string;
}

export interface PredictWellnessRiskInput {
  userId: string;
  recentEnergyLevels: number[];
  cyclePhase: string | null;
  recentMoodRatings: number[];
  currentStreak: number;
  recentExamSprints: { exam: string; daysLeft: number }[];
  totalGoalsActive: number;
  totalRoutinesActive: number;
}

export interface PredictWellnessRiskOutput {
  riskPercentage: number;
  factors: {
    lowEnergy: boolean;
    cyclePhase: string;
    examStress: number;
    streakRisk: boolean;
    academicOverload: boolean;
  };
  recommendations: {
    type: RecommendationType;
    text: string;
    urgency: RecommendationUrgency;
  }[];
  confidence: number;
}

export interface GenerateRecoveryPlanSuggestionsInput {
  userId: string;
  context: {
    currentEnergy?: number;
    cyclePhase?: string;
    favoriteExercises?: string[];
    favoriteStudySubjects?: string[];
  };
}

export interface RecoveryPlanTask {
  day: 1 | 2 | 3;
  description: string;
  difficulty: TaskDifficulty;
  estimatedMinutes: number;
}

export interface StudySessionPlanParams {
  subject: string;
  topic: string;
  durationMinutes: number;
  discipline: string;
  attachmentBase64?: string;
  attachmentMimeType?: string;
}

export interface StudyCompanionParams {
  subject: string;
  topic: string;
  discipline: string;
  history: StudyHistoryMessage[];
  question: string;
  attachmentBase64?: string;
  attachmentMimeType?: string;
}

export type AITask =
  | "recipe"
  | "flashcards"
  | "flashcards_from_image"
  | "study_plan"
  | "companion"
  | "weekly_planner"
  | "wellness"
  | "motivation"
  | "note_to_action"
  | "recovery_plan"
  | "exercise_desc"
  | "study_duration"
  | "cooking_help"
  | "weekly_summary"
  | "discipline";

type EnergyProfile = "baja" | "media" | "alta";

/**
 * Privacidad: la fase del ciclo es un dato de salud y nunca se envía a la IA.
 * Se traduce a un perfil de energía genérico.
 */
export function energyProfileFromPhase(phase?: string | null): EnergyProfile | undefined {
  const value = (phase ?? "").toLowerCase();
  if (!value || value.includes("desconoc") || value === "unknown") return undefined;
  if (value.includes("menstru") || value.includes("lute") || value.includes("lút")) return "baja";
  if (value.includes("folicul") || value.includes("ovulat")) return "alta";
  return "media";
}

/** Única puerta hacia la IA: `callMochiAI(task, input)`. */
export async function callMochiAI<T>(task: AITask, input: Record<string, unknown>): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new AIError({ code: "CONFIGURATION", message: "Inicia sesión para usar la IA." });
  }

  let response: Response;
  try {
    response = await fetch(AI_TASK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ task, input }),
    });
  } catch (cause) {
    track("ai_request", { task, result: "error" });
    throw new AIError({
      code: "NETWORK",
      message: "No hay conexión con la IA. Intenta de nuevo.",
      retryable: true,
      cause,
    });
  }

  const payload = (await response.json().catch(() => null)) as {
    result?: T;
    error?: { message?: string; code?: string };
  } | null;

  if (response.ok && payload && "result" in payload) {
    track("ai_request", { task, result: "ok" });
    return payload.result as T;
  }

  const code = payload?.error?.code;
  track("ai_request", {
    task,
    result: response.status === 402 || response.status === 429 ? "limit" : "error",
  });
  throw new AIError({
    code:
      response.status === 402 || response.status === 429
        ? "RATE_LIMIT"
        : code === "invalid_output"
          ? "PARSE_ERROR"
          : code === "invalid_input"
            ? "VALIDATION_ERROR"
            : "API_ERROR",
    message: payload?.error?.message ?? "La IA no está disponible en este momento.",
    status: response.status,
    retryable: response.status >= 500,
  });
}

// ─── Tareas ──────────────────────────────────────────────────────────────────

export async function detectStudyDiscipline(subject: string, topic: string): Promise<string> {
  try {
    return await callMochiAI<string>("discipline", { subject, topic });
  } catch (error) {
    reportError(error, { task: "discipline" });
    return "estudio general";
  }
}

export async function generateStudySessionPlan(
  subject: string,
  topic: string,
  durationMinutes: number,
  discipline: string,
  attachmentBase64?: string,
  attachmentMimeType?: string,
): Promise<string> {
  return callMochiAI<string>("study_plan", {
    subject,
    topic,
    durationMinutes,
    discipline,
    attachment:
      attachmentBase64 && attachmentMimeType
        ? { base64: attachmentBase64, mimeType: attachmentMimeType }
        : undefined,
  });
}

export async function askStudyCompanion(
  subject: string,
  topic: string,
  discipline: string,
  history: StudyHistoryMessage[],
  question: string,
  attachmentBase64?: string,
  attachmentMimeType?: string,
): Promise<string> {
  return callMochiAI<string>("companion", {
    subject,
    topic,
    discipline,
    history,
    question,
    attachment:
      attachmentBase64 && attachmentMimeType
        ? { base64: attachmentBase64, mimeType: attachmentMimeType }
        : undefined,
  });
}

export async function askMochiWhileCooking(
  recipeTitle: string,
  currentStepTitle: string,
  question: string,
): Promise<string> {
  return callMochiAI<string>("cooking_help", { recipeTitle, currentStepTitle, question });
}

export async function generateRecipe(
  userPrompt: string,
  options: RecipeGenerationOptions,
  cyclePhaseLabel?: string,
): Promise<AIRecipeResponse> {
  return callMochiAI<AIRecipeResponse>("recipe", {
    userPrompt,
    options,
    energyProfile: energyProfileFromPhase(cyclePhaseLabel),
  });
}

export async function generateFlashcards(
  subject: string,
  topic: string,
  count: number = 8,
): Promise<FlashcardPair[]> {
  return callMochiAI<FlashcardPair[]>("flashcards", { subject, topic, count });
}

/** Foto de apuntes → tarjetas (Premium). El servidor responde 403 si el plan no lo permite. */
export async function generateFlashcardsFromImage(params: {
  subject: string;
  topic?: string;
  count?: number;
  imageBase64: string;
  mimeType: string;
}): Promise<FlashcardPair[]> {
  return callMochiAI<FlashcardPair[]>("flashcards_from_image", {
    subject: params.subject,
    topic: params.topic,
    count: params.count ?? 8,
    attachment: { base64: params.imageBase64, mimeType: params.mimeType },
  });
}

export async function generateStudyBlockSuggestions(
  params: StudyBlockSuggestionParams,
): Promise<StudyBlockSuggestion[]> {
  return callMochiAI<StudyBlockSuggestion[]>("weekly_planner", { context: params.context });
}

function defaultNoteToAction(input: ConvertNoteToActionInput): ConvertNoteToActionOutput {
  return {
    type: "goal",
    confidence: 0.25,
    data: {
      title: input.note.trim().slice(0, 90) || "Acción sugerida",
      description:
        "No fue posible clasificar con alta confianza. Revisa y ajusta antes de guardar.",
      difficulty: "easy",
    },
    reasoning: "No tuve suficiente certeza para clasificar la nota automáticamente.",
  };
}

/** Convierte una nota libre en una acción estructurada; ante fallos de formato devuelve una sugerencia segura. */
export async function convertNoteToAction(
  input: ConvertNoteToActionInput,
): Promise<ConvertNoteToActionOutput> {
  try {
    return await callMochiAI<ConvertNoteToActionOutput>("note_to_action", {
      note: input.note,
      context: input.context
        ? {
            energyProfile: energyProfileFromPhase(input.context.cyclePhase),
            energyLevel: input.context.energyLevel,
            currentGoals: input.context.currentGoals,
          }
        : undefined,
    });
  } catch (error) {
    if (error instanceof AIError && (error.code === "PARSE_ERROR" || error.code === "API_ERROR")) {
      return defaultNoteToAction(input);
    }
    throw error;
  }
}

function defaultWellnessRisk(input: PredictWellnessRiskInput): PredictWellnessRiskOutput {
  const lowEnergy =
    input.recentEnergyLevels.length > 0 &&
    input.recentEnergyLevels.reduce((sum, value) => sum + value, 0) /
      input.recentEnergyLevels.length <=
      2.5;
  return {
    riskPercentage: 50,
    factors: {
      lowEnergy,
      cyclePhase: "desconocida",
      examStress: 50,
      streakRisk: input.currentStreak <= 1,
      academicOverload: input.totalGoalsActive + input.totalRoutinesActive >= 8,
    },
    recommendations: [
      {
        type: "focus",
        text: "Organiza una sola prioridad académica para hoy y complétala en bloques cortos.",
        urgency: "medium",
      },
      {
        type: "rest",
        text: "Reserva una pausa breve de recuperación para sostener tu energía durante la semana.",
        urgency: "medium",
      },
    ],
    confidence: 0.4,
  };
}

const wellnessCache = new Map<string, PredictWellnessRiskOutput>();

/** Predice riesgo de abandono a 7 días. Sin IA disponible devuelve la última predicción o una neutral. */
export async function predictWellnessRisk(
  input: PredictWellnessRiskInput,
): Promise<PredictWellnessRiskOutput> {
  try {
    const result = await callMochiAI<PredictWellnessRiskOutput>("wellness", {
      recentEnergyLevels: input.recentEnergyLevels,
      energyProfile: energyProfileFromPhase(input.cyclePhase),
      recentMoodRatings: input.recentMoodRatings,
      currentStreak: input.currentStreak,
      recentExamSprints: input.recentExamSprints,
      totalGoalsActive: input.totalGoalsActive,
      totalRoutinesActive: input.totalRoutinesActive,
    });
    wellnessCache.set(input.userId, result);
    return result;
  } catch (error) {
    if (error instanceof AIError && error.code === "NETWORK") {
      const cached = wellnessCache.get(input.userId);
      if (cached) return cached;
      throw error;
    }
    return wellnessCache.get(input.userId) ?? defaultWellnessRisk(input);
  }
}

const DEFAULT_RECOVERY: RecoveryPlanTask[] = [
  {
    day: 1,
    description: "Dedica 15 minutos a un repaso ligero para retomar el ritmo.",
    difficulty: "easy",
    estimatedMinutes: 15,
  },
  {
    day: 2,
    description: "Completa una tarea concreta de estudio o ejercicio para reforzar consistencia.",
    difficulty: "medium",
    estimatedMinutes: 25,
  },
  {
    day: 3,
    description:
      "Haz un bloque profundo de enfoque y registra tu progreso para cerrar la recuperación.",
    difficulty: "hard",
    estimatedMinutes: 40,
  },
];

/** Tres tareas progresivas para recuperar la racha; si la IA falla, devuelve un plan base. */
export async function generateRecoveryPlanSuggestions(
  input: GenerateRecoveryPlanSuggestionsInput,
): Promise<RecoveryPlanTask[]> {
  try {
    const tasks = await callMochiAI<RecoveryPlanTask[]>("recovery_plan", {
      context: {
        currentEnergy: input.context.currentEnergy,
        energyProfile: energyProfileFromPhase(input.context.cyclePhase),
        favoriteExercises: input.context.favoriteExercises,
        favoriteStudySubjects: input.context.favoriteStudySubjects,
      },
    });
    return DEFAULT_RECOVERY.map((fallback, index) => ({
      ...fallback,
      ...(tasks[index] ?? {}),
      day: (index + 1) as 1 | 2 | 3,
    }));
  } catch (error) {
    reportError(error, { task: "recovery_plan" });
    return DEFAULT_RECOVERY;
  }
}

export async function suggestExerciseDescription(exerciseName: string): Promise<AISuggestion> {
  const fallback: AISuggestion = {
    description: `${exerciseName}: Realiza correctamente`,
    estimatedDuration: 60,
    difficulty: "medio",
  };
  try {
    return await callMochiAI<AISuggestion>("exercise_desc", { exerciseName });
  } catch (error) {
    reportError(error, { task: "exercise_desc" });
    return fallback;
  }
}

export async function suggestStudyDuration(subject: string): Promise<number> {
  try {
    return await callMochiAI<number>("study_duration", { subject });
  } catch (error) {
    reportError(error, { task: "study_duration" });
    return 90;
  }
}

export async function generateWeeklySummaryMessage(stats: {
  studyHours: number;
  sessions: number;
  routines: number;
  habitsCompleted: number;
  habitsTotal: number;
  points: number;
  streak: number;
}): Promise<string> {
  return callMochiAI<string>("weekly_summary", stats);
}

function buildDailyMotivationFallback(
  studyBlockCount: number,
  hasRoutine: boolean,
  timeOfDay: string,
  cyclePhaseLabel?: string,
): string {
  const timeSegment =
    timeOfDay === "dawn"
      ? "Arranca con calma"
      : timeOfDay === "morning"
        ? "Empieza con enfoque"
        : timeOfDay === "afternoon"
          ? "Aprovecha este impulso"
          : "Cierra el día con intención";
  const studySegment =
    studyBlockCount > 0
      ? `tienes ${studyBlockCount} bloque${studyBlockCount === 1 ? "" : "s"} de estudio para avanzar.`
      : "hoy puedes avanzar con una tarea corta y concreta.";
  const routineSegment = hasRoutine
    ? " Si completas también tu rutina, sumarás un extra de energía."
    : "";
  const cycleSegment = cyclePhaseLabel
    ? ` Respeta tu ${cyclePhaseLabel.toLowerCase()} y ve a tu ritmo.`
    : "";
  return `${timeSegment}: ${studySegment}${routineSegment}${cycleSegment}`.trim();
}

/** Mensaje diario. El servidor lo cachea por día; aquí además se guarda local para funcionar sin conexión. */
export async function getDailyMotivation(
  studyBlockCount: number,
  hasRoutine: boolean,
  timeOfDay: string,
  cyclePhaseLabel?: string,
): Promise<string> {
  const today = toLocalISODate(new Date());
  const energyProfile = energyProfileFromPhase(cyclePhaseLabel);
  const cacheKey = `daily-motivation-v3-${today}-${timeOfDay}-${energyProfile ?? "x"}-${studyBlockCount}-${hasRoutine}`;

  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) return cached;
  } catch (error) {
    reportError(error, { scope: "ai/getDailyMotivation/cache-read" });
  }

  try {
    const message = await callMochiAI<string>("motivation", {
      studyBlockCount,
      hasRoutine,
      timeOfDay,
      energyProfile,
      day: today,
    });
    await AsyncStorage.setItem(cacheKey, message).catch((error) =>
      reportError(error, { scope: "ai/getDailyMotivation/cache-write" }),
    );
    return message;
  } catch (error) {
    if (!(error instanceof AIError && error.code === "RATE_LIMIT")) {
      reportError(error, { task: "motivation" });
    }
    return buildDailyMotivationFallback(studyBlockCount, hasRoutine, timeOfDay, cyclePhaseLabel);
  }
}
