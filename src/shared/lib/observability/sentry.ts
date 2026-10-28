import * as Sentry from "@sentry/react-native";

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();

/** Sentry solo se activa con DSN; sin él, todo es un no-op. */
export function initSentry(): void {
  if (!dsn) return;
  Sentry.init({
    dsn,
    enabled: !__DEV__,
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
    beforeSend(event) {
      // Privacidad: sin identificadores personales ni cuerpos de petición.
      if (event.user) event.user = { id: event.user.id };
      if (event.request) delete event.request.data;
      return event;
    },
  });
}

export const wrapWithSentry = Sentry.wrap;
