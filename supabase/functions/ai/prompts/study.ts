import { z } from "npm:zod@3";
import { attachmentSchema, shortText, userMessage, type TaskDef } from "./types.ts";

const base = { subject: shortText(120), topic: shortText(200) };

export const discipline: TaskDef<{ subject: string; topic: string }> = {
  input: z.object(base),
  output: "text",
  maxTokens: 64,
  temperature: 0.2,
  post: (t) => t.trim().toLowerCase().slice(0, 60) || "estudio general",
  build: (i) => ({
    system: "Clasifica la disciplina principal y responde solo una frase corta en minúsculas en español.",
    messages: [{ role: "user", content: `Materia: ${i.subject}\nTema: ${i.topic}` }],
  }),
};

export const studyPlan: TaskDef<
  { subject: string; topic: string; durationMinutes: number; discipline: string; attachment?: { base64: string; mimeType: string } }
> = {
  input: z.object({
    ...base,
    durationMinutes: z.number().int().min(5).max(600),
    discipline: shortText(80),
    attachment: attachmentSchema,
  }),
  output: "text",
  maxTokens: 2048,
  post: (t) => t.trim() || "No pude generar el plan por ahora.",
  build: (i) => ({
    vision: Boolean(i.attachment),
    system:
      "Eres Mochi, mentora de estudio. Responde en español, máximo 120 palabras, sin emojis. Debes: 1) incluir una frase motivadora, 2) dar 2-3 tips concretos del tema, 3) proponer desglose de tiempo para la sesión. Ajusta técnicas a la disciplina y usa conceptos del adjunto si existe.",
    messages: [
      userMessage(
        `Materia: ${i.subject}\nTema: ${i.topic}\nDuración: ${i.durationMinutes} minutos\nDisciplina: ${i.discipline}`,
        i.attachment,
      ),
    ],
  }),
};

export const companion: TaskDef<{
  subject: string;
  topic: string;
  discipline: string;
  history: { role: "user" | "assistant"; content: string }[];
  question: string;
  attachment?: { base64: string; mimeType: string };
}> = {
  input: z.object({
    ...base,
    discipline: shortText(80),
    history: z
      .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
      .max(20),
    question: shortText(4000),
    attachment: attachmentSchema,
  }),
  output: "text",
  maxTokens: 2048,
  post: (t) => t.trim() || "No pude responder en este momento.",
  build: (i) => ({
    vision: Boolean(i.attachment),
    system: `Eres Mochi, compañera de estudio. Responde máximo 150 palabras, en español y sin emojis. Contexto: ${i.subject} | ${i.topic} | ${i.discipline}. Ayuda con teoría, resolución paso a paso, depuración de código, gramática/traducción, memorización y fórmulas.`,
    messages: [...i.history, userMessage(i.question, i.attachment)],
  }),
};

export const flashcards: TaskDef<{ subject: string; topic: string; count: number }> = {
  input: z.object({ ...base, count: z.number().int().min(1).max(20).default(8) }),
  output: "json",
  maxTokens: 4096,
  schema: z
    .array(z.object({ front: z.coerce.string().trim().min(1), back: z.coerce.string().trim().min(1) }))
    .min(1),
  build: (i) => ({
    system: "Eres Mochi, asistente de estudio. Todo en español.",
    messages: [
      {
        role: "user",
        content: `Genera exactamente ${i.count} flashcards de estudio para:
Materia: ${i.subject}
Tema específico: ${i.topic}

Responde ÚNICAMENTE con un array JSON válido, sin markdown ni texto extra:
[
  { "front": "¿Pregunta o concepto?", "back": "Respuesta o definición clara" }
]

Reglas:
- Las preguntas deben ser específicas y concretas
- Las respuestas deben ser concisas (máximo 2 oraciones)
- Varía el tipo: definiciones, fórmulas, ejemplos, comparaciones
- Todo en español`,
      },
    ],
  }),
};

export const weeklyPlanner: TaskDef<{ context: string }> = {
  input: z.object({ context: z.string().trim().min(1).max(12000) }),
  output: "json",
  maxTokens: 4096,
  schema: z.array(
    z.object({
      subject: z.coerce.string().trim().min(1),
      day_of_week: z.coerce.number().int().min(0).max(7),
      start_time: z.string().regex(/^\d{1,2}:\d{2}$/),
      end_time: z.string().regex(/^\d{1,2}:\d{2}$/),
      reason: z.coerce.string().default(""),
    }),
  ),
  build: (i) => ({
    system:
      "Eres un planificador académico experto de Mochi. Responde siempre en español y ÚNICAMENTE con JSON válido sin texto adicional.",
    messages: [
      {
        role: "user",
        content: `Analiza este contexto de horario y sugiere bloques de estudio óptimos.\n\nContexto:\n${i.context}\n\nFormato exacto requerido:\n[{"subject":"string","day_of_week":1,"start_time":"HH:MM","end_time":"HH:MM","reason":"string"}]`,
      },
    ],
  }),
};

export const studyDuration: TaskDef<{ subject: string }> = {
  input: z.object({ subject: shortText(120) }),
  output: "text",
  maxTokens: 16,
  temperature: 0.2,
  cache: { key: (i) => `study_duration:${i.subject.toLowerCase()}`, ttlSeconds: 30 * 86400 },
  post: (t) => {
    const n = parseInt(t.trim(), 10);
    return Number.isNaN(n) ? 90 : Math.max(30, Math.min(180, n));
  },
  build: (i) => ({
    system: "Responde SOLO con un número.",
    messages: [
      {
        role: "user",
        content: `Sugiere una duración en minutos para un bloque de estudio de "${i.subject}" para una estudiante. Responde SOLO con un número (entre 30 y 180).`,
      },
    ],
  }),
};

/** Genera tarjetas a partir de una foto de apuntes (multimodal, solo Premium). */
export const flashcardsFromImage: TaskDef<{ subject: string; topic?: string; count: number; attachment: { base64: string; mimeType: string } }> = {
  input: z.object({
    subject: shortText(120),
    topic: z.string().trim().max(200).optional(),
    count: z.number().int().min(1).max(20).default(8),
    attachment: z.object({
      base64: z.string().max(5_500_000),
      mimeType: z.string().regex(/^image\/(png|jpe?g|webp|gif)$/),
    }),
  }),
  output: "json",
  premiumOnly: true,
  maxTokens: 4096,
  schema: z
    .array(z.object({ front: z.coerce.string().trim().min(1), back: z.coerce.string().trim().min(1) }))
    .min(1),
  build: (i) => ({
    vision: true,
    system: "Eres Mochi, asistente de estudio. Todo en español.",
    messages: [
      userMessage(
        `Lee los apuntes de la imagen y genera exactamente ${i.count} flashcards.\nMateria: ${i.subject}${i.topic ? `\nTema: ${i.topic}` : ""}\n\nResponde ÚNICAMENTE con un array JSON válido, sin markdown ni texto extra:\n[{ "front": "¿Pregunta o concepto?", "back": "Respuesta concisa (máximo 2 oraciones)" }]\nUsa solo información que aparezca en la imagen.`,
        i.attachment,
      ),
    ],
  }),
};
