/**
 * Frases locales de Mochi (voz: docs/mochi-voice.md). Se muestran al instante, sin red;
 * la IA puede reemplazarlas después. Nunca mencionan el ciclo ni datos de salud.
 */
export type TimeOfDay = "manana" | "tarde" | "noche";
export type Mood = 1 | 2 | 3 | 4 | 5;

export const GREETING_QUESTION: Record<TimeOfDay, string[]> = {
  manana: [
    "Buenos días. ¿Cómo amaneciste? Cuéntame y armamos un día a tu medida.",
    "Ya estoy despierta. ¿Cómo te sientes hoy?",
    "Un día nuevo, sin apuros. ¿Cómo amaneciste?",
  ],
  tarde: [
    "¿Cómo va tu tarde? Dime cómo te sientes.",
    "Pausa de un segundo: ¿cómo estás ahora mismo?",
    "Llevamos medio día. ¿Cómo te sientes?",
  ],
  noche: [
    "Ya casi termina el día. ¿Cómo te fue?",
    "Antes de descansar, ¿cómo te sientes?",
    "¿Qué tal estuvo tu día? Aquí te escucho.",
  ],
};

export const CHECKIN_REPLY: Record<Mood, string[]> = {
  1: [
    "Gracias por contármelo. Hoy vamos despacio: una sola cosa pequeña basta.",
    "Está bien no estar bien. Si quieres, hoy solo cuidamos lo básico.",
  ],
  2: [
    "Te entiendo. Elijamos algo corto y amable para hoy.",
    "Día cuesta arriba. Un paso pequeño también cuenta.",
  ],
  3: [
    "Un día tranquilo también es un buen día. Vamos a tu ritmo.",
    "Bien, sin prisa. Te dejo lo importante a la mano.",
  ],
  4: [
    "Qué lindo leer eso. Aprovechemos esa energía.",
    "Me alegra. Hoy puede salir algo bonito.",
  ],
  5: [
    "¡Así me gusta! Hoy podemos con lo que sea.",
    "Esa energía se contagia. ¿Empezamos por lo más importante?",
  ],
};

export function timeOfDay(date: Date): TimeOfDay {
  const h = date.getHours();
  if (h < 12) return "manana";
  if (h < 19) return "tarde";
  return "noche";
}

/** Elige una frase de forma estable para el día (no cambia en cada render ni al refrescar). */
export function pickLine(lines: readonly string[], seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return lines[Math.abs(hash) % lines.length];
}

/** Frases cortas para el widget: afirmaciones, no preguntas (no se puede responder desde ahí). */
export const WIDGET_LINES: string[] = [
  "Un paso pequeño hoy también cuenta.",
  "Aquí estoy. Vamos a tu ritmo.",
  "Hoy puede salir algo bonito.",
  "Sin prisa: lo importante primero.",
  "Respira. Tú puedes con esto.",
  "Cuida de ti, que yo te acompaño.",
  "Un ratito de estudio y listo.",
];
