import { Text, TouchableOpacity, View } from "react-native";
import { showAdsPrivacyOptions } from "@/src/shared/lib/ads";
import type { AiCreditBalance } from "@/src/shared/lib/aiCredits";

type AiCreditsSectionProps = {
  aiCredits: AiCreditBalance | null;
  aiCreditsLoading: boolean;
  rewardedReady: boolean;
  rewardedLoading: boolean;
  onWatchAd: () => void;
  onRefreshCredits: () => Promise<void>;
};

export function AiCreditsSection({
  aiCredits,
  aiCreditsLoading,
  rewardedReady,
  rewardedLoading,
  onWatchAd,
  onRefreshCredits,
}: AiCreditsSectionProps) {
  return (
    <View className="mt-6 rounded-3xl border-2 border-violet-200 bg-white p-4 dark:border-violet-800 dark:bg-surface">
      <View className="flex-row items-center justify-between">
        <Text className="text-lg font-extrabold text-violet-900 dark:text-violet-100">
          Creditos de IA
        </Text>
        <View className="rounded-full bg-violet-100 px-3 py-1 dark:bg-violet-900">
          <Text
            className="text-xs font-extrabold text-violet-800 dark:text-violet-200"
            numberOfLines={1}
          >
            {aiCredits?.balance ?? 0} creditos
          </Text>
        </View>
      </View>
      <Text className="mt-2 text-sm font-semibold text-violet-700 dark:text-violet-300">
        Usa anuncios recompensados para ganar creditos cuando los necesites.
      </Text>

      <View className="mt-3 rounded-2xl border border-violet-200 bg-violet-50 px-3 py-3 dark:border-violet-800 dark:bg-violet-950">
        <Text className="text-xs font-semibold text-violet-700 dark:text-violet-300">
          Restantes hoy: {aiCredits?.remainingToday ?? 0}
        </Text>
      </View>

      <View className="mt-4 flex-row gap-2">
        <TouchableOpacity
          className={`flex-1 rounded-2xl py-3 ${rewardedReady ? "bg-violet-500" : "bg-violet-300 dark:bg-violet-700"}`}
          onPress={onWatchAd}
          disabled={!rewardedReady}
        >
          <Text className="text-center font-extrabold text-white">
            {rewardedLoading ? "Cargando anuncio..." : "Ver anuncio"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 rounded-2xl border-2 border-violet-200 bg-white py-3 dark:border-violet-800 dark:bg-surface"
          onPress={() => void onRefreshCredits()}
        >
          <Text className="text-center font-extrabold text-violet-800 dark:text-violet-200">
            {aiCreditsLoading ? "Actualizando..." : "Actualizar"}
          </Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        className="mt-3 min-h-[44px] items-center justify-center"
        onPress={() => void showAdsPrivacyOptions()}
      >
        <Text className="text-xs font-extrabold text-violet-700 dark:text-violet-300">
          Preferencias de anuncios
        </Text>
      </TouchableOpacity>
    </View>
  );
}
