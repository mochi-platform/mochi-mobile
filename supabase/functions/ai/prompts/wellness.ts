import { z } from "npm:zod@3";
import { energySchema, shortText, type TaskDef } from "./types.ts";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const wellness: TaskDef<{
  recentEnergyLevels: number[];
  energyProfile?: "baja" | "media" | "alta";
  recentMoodRatings: number[];
  currentStreak: number;
  recentExamSprints: { exam: string; daysLeft: number }[];
  totalGoalsActive: number;
  totalRoutinesActive: number;
}> = {
  input: z.object({
    recentEnergyLevels: z.array(z.number()).max(30),
    energyProfile: energySchema,
    recentMoodRatings: z.array(z.number()).max(30),
    currentStreak: z.number().int().min(0).max(100000),
    recentExamSprints: z.array(z.object({ exam: shortText(80), daysLeft: z.number().int() })).max(10),
    totalGoalsActive: z.number().int().min(0).max(1000),
    totalRoutinesActive: z.number().int().min(0).max(1000),
  }),
  output: "json",
  maxTokens: 4096,
  temperature: 0.2,
  schema: z
    .object({
      riskPercentage: z.coerce.number().transform((v) => clamp(Math.round(v), 0, 100)),
      factors: z
        .object({
          lowEnergy: z.coerce.boolean().default(false),
          cyclePhase: z.coerce.string().default("desconocida"),
          examStress: z.coerce.number().transform((v) => clamp(v, 0, 100)).default(0),
          streakRisk: z.coerce.boolean().default(false),
          academicOverload: z.coerce.boolean().default(false),
        })
        .default({}),
      recommendations: z
        .array(
          z.object({
            type: z.string().transform((v) => (["rest", "focus", "motivation"].includes(v) ? v : "motivation")),
            text: z.coerce.string().trim().min(1),
            urgency: z.string().transform((v) => (["low", "medium", "high"].includes(v) ? v : "medium")),
          }),
        )
        .max(5)
        .default([]),
      confidence: z.coerce.number().transform((v) => clamp(v, 0, 1)).default(0.5),
    }),
  build: (i) => ({
    system:
      'Eres coach de bienestar académico para estudiantes mujeres. Analiza múltiples factores (energía, exámenes, streak) y predice vulnerabilidad para la próxima semana. Sé prudente y no alarmista. Recomendaciones SIEMPRE positivas, concretas y accionables. Responde SIEMPRE en español y ÚNICAMENTE con JSON válido sin markdown ni texto extra. Formato exacto: {"riskPercentage":0,"factors":{"lowEnergy":false,"cyclePhase":"string","examStress":0,"streakRisk":false,"academicOverload":false},"recommendations":[{"type":"rest|focus|motivation","text":"string","urgency":"low|medium|high"}],"confidence":0.0}',
    messages: [{ role: "user", content: JSON.stringify({ ...i, energyProfile: i.energyProfile ?? "desconocida" }, null, 2) }],
  }),
};

export const recoveryPlan: TaskDef<{
  context: { currentEnergy?: number; energyProfile?: "baja" | "media" | "alta"; favoriteExercises?: string[]; favoriteStudySubjects?: string[] };
}> = {
  input: z.object({
    context: z.object({
      currentEnergy: z.number().optional(),
      energyProfile: energySchema,
      favoriteExercises: z.array(shortText(80)).max(10).optional(),
      favoriteStudySubjects: z.array(shortText(80)).max(10).optional(),
    }),
  }),
  output: "json",
  maxTokens: 4096,
  temperature: 0.35,
  schema: z
    .array(
      z.object({
        day: z.coerce.number().int().min(1).max(3),
        description: z.coerce.string().trim().min(1),
        difficulty: z.string().transform((v) => (["easy", "medium", "hard"].includes(v) ? v : "easy")),
        estimatedMinutes: z.coerce.number().transform((v) => clamp(Math.round(v), 5, 180)).default(20),
      }),
    )
    .min(1)
    .max(3),
  build: (i) => ({
    system:
      'Eres coach motivacional. El usuario acaba de perder su racha. Crea 3 tareas progresivas para recuperarla en 3 días, personalizadas según su contexto. Tono motivador, empático y nunca culpabilizador. Responde SIEMPRE en español y ÚNICAMENTE con JSON válido sin markdown ni texto extra. Formato exacto: [{"day":1,"description":"string","difficulty":"easy|medium|hard","estimatedMinutes":20},{"day":2,"description":"string","difficulty":"medium","estimatedMinutes":30},{"day":3,"description":"string","difficulty":"hard","estimatedMinutes":45}]',
    messages: [{ role: "user", content: JSON.stringify({ context: i.context }, null, 2) }],
  }),
};

export const noteToAction: TaskDef<{
  note: string;
  context?: { energyProfile?: "baja" | "media" | "alta"; energyLevel?: number; currentGoals?: string[] };
}> = {
  input: z.object({
    note: shortText(2000),
    context: z
      .object({
        energyProfile: energySchema,
        energyLevel: z.number().optional(),
        currentGoals: z.array(shortText(120)).max(10).optional(),
      })
      .optional(),
  }),
  output: "json",
  maxTokens: 4096,
  temperature: 0.2,
  schema: z.object({
    type: z.string().transform((v) => (["study", "exercise", "goal", "habit"].includes(v) ? v : "goal")),
    confidence: z.coerce.number().transform((v) => clamp(v, 0, 1)).default(0.5),
    data: z
      .object({
        title: z.coerce.string().trim().min(1),
        description: z.coerce.string().optional(),
        durationMinutes: z.coerce.number().optional(),
        difficulty: z.string().optional(),
      })
      .passthrough(),
    reasoning: z.coerce.string().default(""),
  }),
  build: (i) => ({
    system:
      'Eres asistente de productividad para estudiantes mujeres. Analiza notas libres y convierte en acciones estructuradas. Responde SIEMPRE en español y ÚNICAMENTE con JSON válido sin markdown ni texto extra. Devuelve exactamente: {"type":"study|exercise|goal|habit","confidence":0.0,"data":{"title":"string","description":"string opcional","durationMinutes":30,"difficulty":"easy|medium|hard"},"reasoning":"string"}. Si hay ambigüedad, usa confidence baja pero igualmente entrega datos útiles.',
    messages: [{ role: "user", content: JSON.stringify({ note: i.note, context: i.context ?? null }, null, 2) }],
  }),
};

const TIME_TEXT: Record<string, string> = {
  dawn: "la madrugada",
  morning: "la mañana",
  afternoon: "la tarde",
  night: "la noche",
};

function sanitizeMotivation(raw: string): string {
  const text = raw.replace(/\s+/g, " ").trim();
  const noGreeting = text.replace(
    /^(?:¡?hola(?:\s+[\p{L}\p{M}'-]+)?!?|buen(?:os|as)?\s+d[ií]as(?:\s+[\p{L}\p{M}'-]+)?!?|buenas\s+tardes(?:\s+[\p{L}\p{M}'-]+)?!?|buenas\s+noches(?:\s+[\p{L}\p{M}'-]+)?!?)[,:\s-]*/iu,
    "",
  );
  return noGreeting.replace(/```[\s\S]*?```/g, "").replace(/`+/g, "").replace(/\s+/g, " ").trim();
}

export const motivation: TaskDef<{
  studyBlockCount: number;
  hasRoutine: boolean;
  timeOfDay: "dawn" | "morning" | "afternoon" | "night";
  energyProfile?: "baja" | "media" | "alta";
  day: string;
}> = {
  input: z.object({
    studyBlockCount: z.number().int().min(0).max(50),
    hasRoutine: z.boolean(),
    timeOfDay: z.enum(["dawn", "morning", "afternoon", "night"]),
    energyProfile: energySchema,
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  output: "text",
  maxTokens: 120,
  cache: {
    key: (i, uid) => `motivation:${uid}:${i.day}:${i.timeOfDay}:${i.energyProfile ?? "x"}:${i.studyBlockCount}:${i.hasRoutine}`,
    ttlSeconds: 86400,
  },
  post: (t) => {
    const cleaned = sanitizeMotivation(t);
    if (!cleaned || cleaned.length > 220 || /\d{20,}/.test(cleaned)) throw new Error("bad_motivation");
    return cleaned;
  },
  build: (i) => {
    const energy = i.energyProfile
      ? ` Hoy su energía suele ser ${i.energyProfile}. Ten en cuenta esto con un tono cálido y sin presión.`
      : "";
    return {
      system: "Eres Mochi, una asistente adorable.",
      messages: [
        {
          role: "user",
          content: `Es ${TIME_TEXT[i.timeOfDay]}. Escribe un mensaje breve y motivador (máximo 2 oraciones) considerando que hoy la usuaria tiene ${i.studyBlockCount} bloques de estudio${i.hasRoutine ? " y una rutina de ejercicio" : ""}.${energy} Reglas estrictas: no saludes, no uses nombre propio, no uses inglés, no uses emojis. Responde solo el mensaje, sin comillas.`,
        },
      ],
    };
  },
};

export const weeklySummary: TaskDef<{
  studyHours: number;
  sessions: number;
  routines: number;
  habitsCompleted: number;
  habitsTotal: number;
  points: number;
  streak: number;
}> = {
  input: z.object({
    studyHours: z.number().min(0).max(200),
    sessions: z.number().int().min(0).max(1000),
    routines: z.number().int().min(0).max(1000),
    habitsCompleted: z.number().int().min(0).max(10000),
    habitsTotal: z.number().int().min(0).max(10000),
    points: z.number().int().min(0).max(10_000_000),
    streak: z.number().int().min(0).max(100000),
  }),
  output: "text",
  maxTokens: 200,
  post: (t) => t.trim(),
  build: (i) => ({
    system: "Eres Mochi. Escribes mensajes motivadores breves, cálidos y en español.",
    messages: [
      {
        role: "user",
        content: `Resumen semanal de estudiante:\nHoras estudio: ${i.studyHours}\nSesiones: ${i.sessions}\nRutinas: ${i.routines}\nHábitos: ${i.habitsCompleted}/${i.habitsTotal}\nPuntos: ${i.points}\nRacha: ${i.streak}\n\nEscribe un mensaje motivador de 2 a 3 líneas, cálido y en español.`,
      },
    ],
  }),
};
