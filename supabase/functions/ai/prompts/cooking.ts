import { z } from "npm:zod@3";
import { energySchema, shortText, type TaskDef } from "./types.ts";

const TYPE_TEXT = {
  normal: "Normal (sin restriccion especial)",
  keto: "Keto (baja en carbohidratos)",
  vegetariana: "Vegetariana (sin carne ni pescado)",
  vegana: "Vegana (sin ingredientes de origen animal)",
  alta_proteina: "Alta en proteina",
} as const;

const nullableText = z.coerce.string().nullable().optional().transform((v) => v ?? null);
const nullableNum = z.coerce.number().nullable().optional().transform((v) => (v === undefined ? null : v));

export const recipe: TaskDef<{
  userPrompt: string;
  options: { recipeType: keyof typeof TYPE_TEXT; servings: number; complexity: "fácil" | "media" | "difícil" };
  energyProfile?: "baja" | "media" | "alta";
}> = {
  input: z.object({
    userPrompt: shortText(500),
    options: z.object({
      recipeType: z.enum(["normal", "keto", "vegetariana", "vegana", "alta_proteina"]),
      servings: z.number().int().min(1).max(20),
      complexity: z.enum(["fácil", "media", "difícil"]),
    }),
    energyProfile: energySchema,
  }),
  output: "json",
  maxTokens: 8192,
  schema: z.object({
    title: z.coerce.string().trim().min(1),
    description: z.coerce.string().default(""),
    prep_time_minutes: z.coerce.number().default(10),
    cook_time_minutes: z.coerce.number().default(20),
    servings: z.coerce.number().default(2),
    difficulty: z.string().transform((v) => (["fácil", "media", "difícil"].includes(v) ? v : "media")),
    cuisine_type: z.coerce.string().default(""),
    tags: z.array(z.coerce.string()).default([]),
    ingredients: z
      .array(z.object({ name: z.coerce.string().min(1), amount: nullableNum, unit: nullableText, notes: nullableText }))
      .min(1),
    steps: z
      .array(
        z.object({
          step_number: z.coerce.number(),
          title: z.coerce.string().default(""),
          instructions: z.coerce.string().min(1),
          duration_seconds: nullableNum,
          temperature: nullableText,
          tip: nullableText,
        }),
      )
      .min(1),
  }),
  build: ({ userPrompt, options, energyProfile }) => {
    const hint = energyProfile
      ? `\nContexto adicional de bienestar:\n- Hoy su nivel de energía suele ser ${energyProfile}. Si es apropiado, sugiere preparaciones acordes a ese nivel de energía, sin dar consejos médicos.`
      : "";
    return {
      system: "Eres Mochi, una asistente de cocina experta.",
      messages: [
        {
          role: "user",
          content: `Una estudiante te pide:

"${userPrompt}"

Configuracion obligatoria para esta receta:
- Tipo de receta: ${TYPE_TEXT[options.recipeType]}
- Cantidad de personas: ${options.servings}
- Nivel de complejidad: ${options.complexity}
${hint}

Genera una receta detallada, realista y deliciosa en español. Responde ÚNICAMENTE con un objeto JSON válido (sin texto adicional, sin markdown, sin bloques de código) con esta estructura exacta:

{
  "title": "Nombre de la receta",
  "description": "Descripción apetitosa de 1-2 oraciones",
  "prep_time_minutes": 10,
  "cook_time_minutes": 20,
  "servings": ${options.servings},
  "difficulty": "${options.complexity}",
  "cuisine_type": "mexicana",
  "tags": ["vegetariana", "rápida"],
  "ingredients": [
    { "name": "champiñones", "amount": 200, "unit": "g", "notes": "rebanados" },
    { "name": "sal", "amount": null, "unit": null, "notes": "al gusto" }
  ],
  "steps": [
    {
      "step_number": 1,
      "title": "Preparar los champiñones",
      "instructions": "Limpia los champiñones con un paño húmedo y córtalos en rebanadas de medio centímetro.",
      "duration_seconds": 180,
      "temperature": null,
      "tip": "No los laves bajo el agua o absorberán humedad y no dorarán bien."
    }
  ]
}

Reglas:
- difficulty debe ser exactamente: "fácil", "media" o "difícil" y debe coincidir con el nivel solicitado
- servings debe ser exactamente ${options.servings}
- Ajusta ingredientes y porciones para ${options.servings} personas
- Respeta estrictamente el tipo de receta solicitado
- duration_seconds en los pasos: usa null si es un paso manual sin tiempo fijo
- Los pasos deben ser suficientemente detallados para que alguien sin experiencia los siga
- Máximo 12 ingredientes y 10 pasos
- Los tips deben ser consejos prácticos y útiles`,
        },
      ],
    };
  },
};

export const cookingHelp: TaskDef<{ recipeTitle: string; currentStepTitle: string; question: string }> = {
  input: z.object({ recipeTitle: shortText(200), currentStepTitle: shortText(200), question: shortText(1000) }),
  output: "text",
  maxTokens: 220,
  post: (t) => t.trim() || "No pude responder ahora, pero sigue con confianza.",
  build: (i) => ({
    system: "Eres Mochi, una asistente de cocina cálida. Responde de forma breve, útil y siempre en español.",
    messages: [
      {
        role: "user",
        content: `La usuaria está preparando "${i.recipeTitle}" y está en el paso "${i.currentStepTitle}". Tiene esta pregunta: "${i.question}". Responde máximo 3 oraciones.`,
      },
    ],
  }),
};

export const exerciseDesc: TaskDef<{ exerciseName: string }> = {
  input: z.object({ exerciseName: shortText(120) }),
  output: "json",
  maxTokens: 2048,
  cache: { key: (i) => `exercise_desc:${i.exerciseName.toLowerCase()}`, ttlSeconds: 90 * 86400 },
  schema: z.object({
    description: z.coerce.string().trim().min(1),
    estimatedDuration: z.coerce.number().default(60),
    difficulty: z.string().transform((v) => (["fácil", "medio", "difícil"].includes(v) ? v : "medio")),
  }),
  build: (i) => ({
    system: "Eres un entrenador personal de Mochi. Responde siempre en español y si se solicita JSON, responde solo JSON válido.",
    messages: [
      {
        role: "user",
        content: `El usuario quiere hacer el ejercicio: "${i.exerciseName}". Proporciona una descripción breve (1-2 oraciones) de cómo hacerlo correctamente y el tiempo estimado en segundos (número solo). Responde SOLO en este formato JSON sin explicaciones adicionales: {"description": "...", "estimatedDuration": 60, "difficulty": "medio"}`,
      },
    ],
  }),
};
