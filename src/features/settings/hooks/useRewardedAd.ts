import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Platform } from "react-native";
import type { useCustomAlert } from "@/src/shared/components/CustomAlert";
import { isExpoGo } from "@/lib/env";
import { initAdsWithConsent, type AgeGroup } from "@/src/shared/lib/ads";
import { track } from "@/src/shared/lib/observability/analytics";
import { supabase } from "@/src/shared/lib/supabase";
import {
  waitForAdCredit,
  getAiCreditBalance,
  type AiCreditBalance,
} from "@/src/shared/lib/aiCredits";
import {
  TEST_REWARDED_AD_UNIT_ID_ANDROID,
  TEST_REWARDED_AD_UNIT_ID_IOS,
  type RewardedAdInstance,
} from "../types";

type UseRewardedAdParams = {
  userId: string | undefined;
  showAlert: ReturnType<typeof useCustomAlert>["showAlert"];
  setAiCredits: Dispatch<SetStateAction<AiCreditBalance | null>>;
  /** Premium nunca ve anuncios. */
  enabled?: boolean;
};

export function useRewardedAd({
  userId,
  showAlert,
  setAiCredits,
  enabled = true,
}: UseRewardedAdParams) {
  const [rewardedReady, setRewardedReady] = useState(false);
  const [rewardedLoading, setRewardedLoading] = useState(false);
  const rewardedAdRef = useRef<RewardedAdInstance | null>(null);

  const rewardedAdUnitId =
    Platform.OS === "android"
      ? process.env.EXPO_PUBLIC_ADMOB_REWARDED_ANDROID_UNIT_ID?.trim() ||
        TEST_REWARDED_AD_UNIT_ID_ANDROID
      : process.env.EXPO_PUBLIC_ADMOB_REWARDED_IOS_UNIT_ID?.trim() || TEST_REWARDED_AD_UNIT_ID_IOS;

  useEffect(() => {
    if (isExpoGo || !enabled || !userId) return;
    let mounted = true;
    let unsubscribeLoaded: (() => void) | null = null;
    let unsubscribeReward: (() => void) | null = null;

    void (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("age_group")
        .eq("id", userId)
        .maybeSingle<{ age_group: AgeGroup }>();
      // Consentimiento (UMP) y tratamiento de menores antes de pedir cualquier anuncio.
      const canRequestAds = await initAdsWithConsent(profile?.age_group ?? null);
      if (!mounted || !canRequestAds) return;

      const adsModule = await import("react-native-google-mobile-ads");
      if (!mounted) return;

      const ad = adsModule.RewardedAd.createForAdRequest(rewardedAdUnitId, {
        requestNonPersonalizedAdsOnly: true,
        serverSideVerificationOptions: { userId: userId ?? undefined },
      });

      rewardedAdRef.current = ad;
      setRewardedLoading(true);

      unsubscribeLoaded = ad.addAdEventListener(adsModule.RewardedAdEventType.LOADED, () => {
        setRewardedReady(true);
        setRewardedLoading(false);
      });

      unsubscribeReward = ad.addAdEventListener(adsModule.RewardedAdEventType.EARNED_REWARD, () => {
        void (async () => {
          if (!userId) return;
          track("ad_reward_requested");

          try {
            const before = await getAiCreditBalance();
            const updated = await waitForAdCredit(before?.balance ?? 0);

            if (updated) {
              setAiCredits(updated);
            }
          } catch {
            showAlert({
              title: "No se pudo validar",
              message: "No se pudo validar la recompensa.",
              buttons: [{ text: "Entendido", style: "cancel" }],
            });
          } finally {
            setRewardedReady(false);
            setRewardedLoading(true);
            ad.load();
          }
        })();
      });

      ad.load();
    })();

    return () => {
      mounted = false;
      unsubscribeLoaded?.();
      unsubscribeReward?.();
    };
  }, [rewardedAdUnitId, showAlert, userId, setAiCredits, enabled]);

  const handleWatchAd = () => {
    if (isExpoGo) {
      showAlert({
        title: "Anuncios no disponibles",
        message: "Los anuncios recompensados requieren un build nativo.",
        buttons: [{ text: "Entendido", style: "cancel" }],
      });
      return;
    }

    if (!rewardedAdRef.current) {
      showAlert({
        title: "Anuncio no listo",
        message: "Estamos preparando el anuncio. Intenta de nuevo en unos segundos.",
        buttons: [{ text: "Entendido", style: "cancel" }],
      });
      return;
    }

    if (rewardedReady) {
      setRewardedReady(false);
      rewardedAdRef.current.show();
      return;
    }

    setRewardedLoading(true);
    rewardedAdRef.current.load();
  };

  return { rewardedReady, rewardedLoading, handleWatchAd };
}
