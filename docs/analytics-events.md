# Plan de eventos de analítica (PostHog)

Reglas: sin datos de salud en eventos ni propiedades (nunca fase del ciclo, ánimo ni texto libre); identificar con el id de usuaria, no con correo ni nombre; solo con el consentimiento `analytics`.

| Evento | Cuándo | Propiedades |
|---|---|---|
| `onboarding_completed` | Termina el onboarding | `modules_enabled` |
| `module_opened` | Abre un módulo | `module` |
| `study_session_completed` | Cierra una sesión de estudio | `minutes` |
| `ai_request` | Una tarea de IA | `task`, `result` (ok/error/limit) |
| `paywall_viewed` | Ve la pantalla Premium | `source` |
| `purchase_started` / `purchase_completed` | Compra | `product` |
| `ad_reward_requested` | Pide un anuncio con recompensa | — |
| `duo_linked` | Acepta una invitación | — |
| `account_deleted` | Elimina la cuenta | — |

Estado: integrados en `src/shared/lib/observability/` y activos solo con `EXPO_PUBLIC_POSTHOG_KEY` / `EXPO_PUBLIC_SENTRY_DSN` y, en PostHog, con el consentimiento `analytics`. Eventos conectados (todos): `onboarding_completed`, `module_opened`, `ad_reward_requested`, `ai_request`, `paywall_viewed`, `purchase_started`, `purchase_completed`, `study_session_completed`, `duo_linked`, `account_deleted`. Para subir sourcemaps a Sentry falta el plugin `@sentry/react-native/expo` con organización, proyecto y token.
