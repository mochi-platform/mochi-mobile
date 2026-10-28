import PostHog from "posthog-react-native";
import { getConsent } from "@/src/shared/lib/consents";

const key = process.env.EXPO_PUBLIC_POSTHOG_KEY?.trim();
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST?.trim() || "https://us.i.posthog.com";

let client: PostHog | null = null;
let enabled = false;

/** Propiedades permitidas: nunca salud, ánimo ni texto libre (ver docs/analytics-events.md). */
export type AnalyticsEvent =
  | "onboarding_completed"
  | "module_opened"
  | "study_session_completed"
  | "ai_request"
  | "paywall_viewed"
  | "purchase_started"
  | "purchase_completed"
  | "ad_reward_requested"
  | "duo_linked"
  | "account_deleted";

type Props = Record<string, string | number | boolean>;

/** Se activa solo con clave y con el consentimiento "analytics" de la usuaria. */
export async function syncAnalyticsConsent(userId: string | null): Promise<void> {
  if (!key || !userId) {
    enabled = false;
    return;
  }
  const granted = await getConsent("analytics").catch(() => false);
  if (!granted) {
    enabled = false;
    client?.optOut();
    return;
  }
  client ??= new PostHog(key, { host, disabled: false });
  client.optIn();
  client.identify(userId);
  enabled = true;
}

export function track(event: AnalyticsEvent, props?: Props): void {
  if (!enabled || !client) return;
  client.capture(event, props);
}

export function resetAnalytics(): void {
  enabled = false;
  client?.reset();
}
