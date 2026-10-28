import { z } from "npm:zod@3";

export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type Message = {
  role: "system" | "user" | "assistant";
  content: string | ContentPart[];
};

export type Built = { system: string; messages: Message[]; vision?: boolean };

export type TaskDef<I = unknown> = {
  input: z.ZodType<I, z.ZodTypeDef, unknown>;
  output: "text" | "json";
  /** Validación del JSON de salida (solo output "json"). Devuelve el valor ya normalizado. */
  schema?: z.ZodTypeAny;
  /** Transformación final de salida de texto. */
  post?: (text: string) => unknown;
  maxTokens: number;
  temperature?: number;
  /** Solo para plan Premium (p. ej. tareas multimodales). */
  premiumOnly?: boolean;
  /** Tareas deterministas: se cachean en el servidor y no consumen crédito al acertar. */
  cache?: { key: (input: I, uid: string) => string; ttlSeconds: number };
  build: (input: I) => Built;
};

/** Adjunto: solo imágenes. Los PDF no se soportan con los modelos gratuitos. */
export const attachmentSchema = z
  .object({
    base64: z.string().max(5_500_000),
    mimeType: z.string().regex(/^image\/(png|jpe?g|webp|gif)$/),
  })
  .optional();

export function userMessage(text: string, attachment?: { base64: string; mimeType: string }): Message {
  if (!attachment) return { role: "user", content: text };
  return {
    role: "user",
    content: [
      { type: "text", text },
      { type: "image_url", image_url: { url: `data:${attachment.mimeType};base64,${attachment.base64}` } },
    ],
  };
}

export const energySchema = z.enum(["baja", "media", "alta"]).optional();
export const shortText = (max: number) => z.string().trim().min(1).max(max);
