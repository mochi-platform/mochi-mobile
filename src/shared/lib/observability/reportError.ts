import * as Sentry from "@sentry/react-native";

/**
 * Reporta un error sin romper el flujo. Nunca incluir datos de salud ni texto libre de la usuaria
 * en `context`; solo identificadores técnicos.
 */
export function reportError(
  error: unknown,
  context?: Record<string, string | number | boolean>,
): void {
  const err = error instanceof Error ? error : new Error(String(error));
  if (__DEV__) {
    console.warn("[reportError]", err.message, context ?? "");
  }
  Sentry.captureException(err, context ? { extra: context } : undefined);
}
