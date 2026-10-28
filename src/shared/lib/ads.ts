import { isExpoGo } from "@/lib/env";
import { reportError } from "@/src/shared/lib/observability/reportError";

export type AgeGroup = "16_17" | "18_plus" | null;

let initialized = false;

/**
 * Prepara AdMob respetando el consentimiento (UMP de Google) y la edad:
 * para 16-17 se activa el tratamiento de menores (anuncios no personalizados).
 * Devuelve true si se pueden pedir anuncios.
 */
export async function initAdsWithConsent(ageGroup: AgeGroup): Promise<boolean> {
  if (isExpoGo) return false;
  try {
    const ads = await import("react-native-google-mobile-ads");
    const consent = await ads.AdsConsent.gatherConsent();
    if (!consent.canRequestAds) return false;

    await ads.default().setRequestConfiguration({
      tagForUnderAgeOfConsent: ageGroup === "16_17",
      maxAdContentRating: ads.MaxAdContentRating.PG,
    });
    if (!initialized) {
      await ads.default().initialize();
      initialized = true;
    }
    return true;
  } catch (error) {
    reportError(error, { scope: "ads/init" });
    return false;
  }
}

/** Opciones de privacidad de anuncios (UMP) para que la usuaria cambie su decisión. */
export async function showAdsPrivacyOptions(): Promise<void> {
  if (isExpoGo) return;
  try {
    const ads = await import("react-native-google-mobile-ads");
    await ads.AdsConsent.showPrivacyOptionsForm();
  } catch (error) {
    reportError(error, { scope: "ads/privacy-options" });
  }
}
