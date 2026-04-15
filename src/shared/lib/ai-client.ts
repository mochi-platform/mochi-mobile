import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import {
  AIError,
  askMochiWhileCooking as sharedAskMochiWhileCooking,
  askStudyCompanion as sharedAskStudyCompanion,
  callAIText,
  callAIWithMessages,
  callAIWithFallback,
  createAIClient,
  detectStudyDiscipline as sharedDetectStudyDiscipline,
  generateFlashcards as sharedGenerateFlashcards,
  generateRecipe as sharedGenerateRecipe,
  generateStudyBlockSuggestions,
  generateStudySessionPlan as sharedGenerateStudySessionPlan,
  parseAIJson,
  callAI,
  type AIRecipeResponse,
  type MochiAIContract,
  type RecipeGenerationOptions,
  type RecipeGenerationType,
  type StudyHistoryMessage,
} from "./ai";
import type { RecipeDifficulty } from "@/src/shared/types/database";

export interface AISuggestion {
  description: string;
  estimatedDuration?: number;
  difficulty?: "fácil" | "medio" | "difícil";
}

export type { MochiAIContract };
export {
  AIError,
  callAI,
  callAIText,
  callAIWithFallback,
  callAIWithMessages,
  generateStudyBlockSuggestions,
  parseAIJson,
};

function resolveOpenRouterKey(): string {
  const envKey = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY?.trim();
  if (envKey) return envKey;

  const extra = Constants.expoConfig?.extra as
    | { openrouterApiKey?: unknown }
    | undefined;
  const extraKey =
    typeof extra?.openrouterApiKey === "string"
      ? extra.openrouterApiKey.trim()
      : "";

  return extraKey;
}

const OPENROUTER_KEY = resolveOpenRouterKey();

if (OPENROUTER_KEY) {
  createAIClient(OPENROUTER_KEY);
}

function canUseAI(): boolean {
  return Boolean(OPENROUTER_KEY);
}

function sanitizeDailyMotivationMessage(raw: string): string {
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text) return "";

  const withoutGreeting = text.replace(
    /^(?:¡?hola(?:\s+[\p{L}\p{M}'-]+)?!?|buen(?:os|as)?\s+d[ií]as(?:\s+[\p{L}\p{M}'-]+)?!?|buenas\s+tardes(?:\s+[\p{L}\p{M}'-]+)?!?|buenas\s+noches(?:\s+[\p{L}\p{M}'-]+)?!?|good\s+morning(?:\s+[\w'-]+)?!?|good\s+afternoon(?:\s+[\w'-]+)?!?|good\s+evening(?:\s+[\w'-]+)?!?|good\s+night(?:\s+[\w'-]+)?!?)[,:\s-]*/iu,
    "",
  );

  const cleaned = withoutGreeting
    .replace(/\bstudent\b/giu, "estudiante")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned;
}

export async function suggestExerciseDescription(
  exerciseName: string,
): Promise<AISuggestion> {
  const cacheKey = `ai-exercise-${exerciseName}`;

  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached) as AISuggestion;
  } catch {}

  if (!canUseAI()) {
    return {
      description: `${exerciseName}: Realiza correctamente`,
      estimatedDuration: 60,
      difficulty: "medio",
    };
  }

  const prompt = `Eres un entrenador personal experto. El usuario quiere hacer el ejercicio: "${exerciseName}". Proporciona una descripción breve (1-2 oraciones) de cómo hacerlo correctamente y el tiempo estimado en segundos (número solo). Responde SOLO en este formato JSON sin explicaciones adicionales: {"description": "...", "estimatedDuration": 60, "difficulty": "medio"}`;

  const response = await callAIWithFallback({
    systemPrompt:
      "Eres un entrenador personal de Mochi. Responde siempre en español y si se solicita JSON, responde solo JSON válido.",
    userMessage: prompt,
    maxTokens: 2048,
  });

  try {
    const parsed = parseAIJson<AISuggestion>(response, { expected: "object" });
    const suggestion: AISuggestion = {
      description:
        parsed.description || `${exerciseName}: Realiza correctamente`,
      estimatedDuration: parsed.estimatedDuration || 60,
      difficulty: parsed.difficulty || "medio",
    };

    AsyncStorage.setItem(cacheKey, JSON.stringify(suggestion)).catch(() => {});
    return suggestion;
  } catch {
    return {
      description: `${exerciseName}: Realiza correctamente`,
      estimatedDuration: 60,
      difficulty: "medio",
    };
  }
}

export async function suggestStudyDuration(subject: string): Promise<number> {
  if (!canUseAI()) return 90;

  const prompt = `Sugiere una duración en minutos para un bloque de estudio de "${subject}" para una estudiante. Responde SOLO con un número (entre 30 y 180).`;

  const response = await callAI(prompt);
  const duration = parseInt(response.trim(), 10);
  return Number.isNaN(duration) ? 90 : Math.max(30, Math.min(180, duration));
}

export async function getDailyMotivation(
  studyBlockCount: number,
  hasRoutine: boolean,
  timeOfDay: string,
  cyclePhaseLabel?: string,
): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  const cycleKey = cyclePhaseLabel
    ? cyclePhaseLabel.toLowerCase().replace(/\s+/g, "-")
    : "sin-fase";
  const cacheKey = `daily-motivation-v2-${today}-${timeOfDay}-${cycleKey}`;

  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) return cached;
  } catch {}

  if (!canUseAI()) {
    return "Hoy es un gran día para avanzar un paso más hacia tus metas.";
  }

  const timeText =
    timeOfDay === "dawn"
      ? "la madrugada"
      : timeOfDay === "morning"
        ? "la mañana"
        : timeOfDay === "afternoon"
          ? "la tarde"
          : "la noche";

  const cycleHint = cyclePhaseLabel
    ? ` La usuaria está en su ${cyclePhaseLabel}. Ten en cuenta esto con un tono cálido y sin presión.`
    : "";

  const prompt = `Eres Mochi, una asistente adorable. Es ${timeText}. Escribe un mensaje breve y motivador (máximo 2 oraciones) considerando que hoy la usuaria tiene ${studyBlockCount} bloques de estudio${hasRoutine ? " y una rutina de ejercicio" : ""}.${cycleHint} Reglas estrictas: no saludes, no uses nombre propio, no uses inglés, no uses emojis. Responde solo el mensaje, sin comillas.`;

  const response = await callAI(prompt);
  const cleaned = sanitizeDailyMotivationMessage(response);
  const message =
    cleaned || "Hoy es un gran día para avanzar un paso más hacia tus metas.";

  try {
    await AsyncStorage.setItem(cacheKey, message);
  } catch {}

  return message;
}

export { type RecipeGenerationOptions, type RecipeGenerationType };

export async function generateRecipe(
  userPrompt: string,
  options: RecipeGenerationOptions,
  cyclePhaseLabel?: string,
): Promise<AIRecipeResponse> {
  if (!canUseAI()) {
    throw new Error(
      "Configura EXPO_PUBLIC_OPENROUTER_API_KEY para generar recetas",
    );
  }

  return sharedGenerateRecipe(userPrompt, options, cyclePhaseLabel);
}

export async function suggestRecipeNames(
  ingredients: string[],
): Promise<string[]> {
  if (!canUseAI()) return [];

  const ingredientList = ingredients.slice(0, 5).join(", ");
  const prompt = `Sugiere 3 nombres creativos y apetitosos en español para una receta que tiene: ${ingredientList}. Responde SOLO con un JSON array de strings, sin explicaciones: ["nombre1", "nombre2", "nombre3"]`;

  const response = await callAIWithFallback({
    systemPrompt:
      "Eres una asistente creativa de Mochi. Responde siempre en español y devuelve solo JSON válido si se solicita JSON.",
    userMessage: prompt,
    maxTokens: 2048,
  });

  try {
    const parsed = parseAIJson<string[]>(response, { expected: "array" });
    return parsed.map((name) => String(name).trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export async function askMochiWhileCooking(
  recipeTitle: string,
  currentStepTitle: string,
  question: string,
): Promise<string> {
  if (!canUseAI()) {
    return "No pude responder ahora, pero sigue con confianza, tú puedes.";
  }

  return sharedAskMochiWhileCooking(recipeTitle, currentStepTitle, question);
}

export async function detectStudyDiscipline(
  subject: string,
  topic: string,
): Promise<string> {
  if (!canUseAI()) return "estudio general";
  return sharedDetectStudyDiscipline(subject, topic);
}

export async function generateStudySessionPlan(
  subject: string,
  specificTopic: string,
  durationMinutes: number,
  discipline: string,
  attachmentBase64?: string,
  attachmentMimeType?: string,
): Promise<string> {
  if (!canUseAI()) {
    return "No pude generar el plan por ahora.";
  }

  return sharedGenerateStudySessionPlan(
    subject,
    specificTopic,
    durationMinutes,
    discipline,
    attachmentBase64,
    attachmentMimeType,
  );
}

export async function askStudyCompanion(
  subject: string,
  specificTopic: string,
  discipline: string,
  history: StudyHistoryMessage[],
  question: string,
  attachmentBase64?: string,
  attachmentMimeType?: string,
): Promise<string> {
  if (!canUseAI()) {
    return "No pude responder en este momento.";
  }

  return sharedAskStudyCompanion(
    subject,
    specificTopic,
    discipline,
    history,
    question,
    attachmentBase64,
    attachmentMimeType,
  );
}

export type { RecipeDifficulty };

export async function generateFlashcards(
  subject: string,
  topic: string,
  count: number = 8,
): Promise<Array<{ front: string; back: string }>> {
  if (!canUseAI()) {
    throw new Error(
      "Configura EXPO_PUBLIC_OPENROUTER_API_KEY para generar flashcards",
    );
  }

  return sharedGenerateFlashcards(subject, topic, count);
}
