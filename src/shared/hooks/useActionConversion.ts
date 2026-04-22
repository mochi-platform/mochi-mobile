import { useState } from "react";
import {
  AIError,
  convertNoteToAction as convertNoteToActionAI,
} from "@mochi/ai/index";
import { buildAiLimitMessage, requestAiUsage } from "@/src/shared/lib/aiCredits";

export interface ActionConversionResult {
  type: "study_block" | "exercise" | "goal" | "habit";
  confidence: number;
  data: {
    title?: string;
    duration?: number;
    description?: string;
    difficulty?: "easy" | "medium" | "hard";
  };
  reasoning: string;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("La solicitud de IA supero el tiempo limite"));
    }, timeoutMs);
  });

  return (async () => {
    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  })();
}

function normalizeType(
  type: "study" | "exercise" | "goal" | "habit",
): ActionConversionResult["type"] {
  if (type === "study") {
    return "study_block";
  }

  return type;
}

export function useActionConversion() {
  const [convertingNote, setConvertingNote] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const convertNoteToAction = async (
    note: string,
  ): Promise<ActionConversionResult | null> => {
    setConvertingNote(true);
    setError(null);

    const payloadNote = `Contexto: student_productivity_app. Idioma requerido: español. Nota: ${note}`;

    try {
      const usage = await requestAiUsage({
        reason: "ai_note_to_action",
        sourceRef: "quick_capture",
      });

      if (!usage.allowed) {
        const limitError = new Error(buildAiLimitMessage(usage.reason));
        setError(limitError);
        return null;
      }

      const result = await withTimeout(
        convertNoteToActionAI({
          note: payloadNote,
          context: {
            currentGoals: ["student_productivity_app"],
          },
        }),
        15000,
      );

      if (!result) {
        setError(new Error("No se pudo convertir la nota con IA"));
        return null;
      }

      return {
        type: normalizeType(result.type),
        confidence: result.confidence,
        data: {
          title: result.data?.title,
          duration: result.data?.durationMinutes,
          description: result.data?.description,
          difficulty: result.data?.difficulty,
        },
        reasoning: result.reasoning || "",
      };
    } catch (err) {
      if (err instanceof AIError && err.retryable) {
        try {
          const retryResult = await withTimeout(
            convertNoteToActionAI({
              note: payloadNote,
              context: {
                currentGoals: ["student_productivity_app"],
              },
            }),
            15000,
          );

          if (!retryResult) {
            const noRetryResultError = new Error(
              "No se pudo convertir la nota con IA en el reintento",
            );
            setError(noRetryResultError);
            return null;
          }

          return {
            type: normalizeType(retryResult.type),
            confidence: retryResult.confidence,
            data: {
              title: retryResult.data?.title,
              duration: retryResult.data?.durationMinutes,
              description: retryResult.data?.description,
              difficulty: retryResult.data?.difficulty,
            },
            reasoning: retryResult.reasoning || "",
          };
        } catch (retryErr) {
          const retryError =
            retryErr instanceof Error
              ? retryErr
              : new Error("Error desconocido");
          setError(retryError);
          console.error(
            "[useActionConversion] Error en reintento:",
            retryError,
          );
          return null;
        }
      }

      const conversionError =
        err instanceof Error ? err : new Error("Error desconocido");
      setError(conversionError);
      console.error(
        "[useActionConversion] Error de conversion:",
        conversionError,
      );
      return null;
    } finally {
      setConvertingNote(false);
    }
  };

  return { convertNoteToAction, convertingNote, error };
}
