import { Text, TouchableOpacity, View } from "react-native";
import type { PlanInfo } from "../types";

type PremiumSectionProps = {
  planInfo: PlanInfo | null;
  premiumLoading: boolean;
  onOpenPremium: () => void;
  onRestorePurchases: () => Promise<void>;
};

export function PremiumSection({
  planInfo,
  premiumLoading,
  onOpenPremium,
  onRestorePurchases,
}: PremiumSectionProps) {
  const premiumStatusLabel = planInfo?.planKey === "premium" ? "Premium activo" : "Plan gratis";
  const premiumEndsLabel = planInfo?.periodEndsAt
    ? new Date(planInfo.periodEndsAt).toLocaleDateString("es-ES")
    : null;

  return (
    <View className="mt-6 rounded-3xl border-2 border-amber-200 bg-white p-4 dark:border-amber-800 dark:bg-surface">
      <View className="flex-row items-center justify-between">
        <Text className="text-lg font-extrabold text-amber-900 dark:text-amber-100">
          Premium IA
        </Text>
        <View className="rounded-full bg-amber-100 px-3 py-1 dark:bg-amber-900">
          <Text className="text-xs font-extrabold text-amber-800 dark:text-amber-200">
            {premiumStatusLabel}
          </Text>
        </View>
      </View>
      <Text className="mt-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
        Acceso extendido a IA con menos limites diarios.
      </Text>
      {premiumEndsLabel && (
        <Text className="mt-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
          Vigente hasta {premiumEndsLabel}
        </Text>
      )}

      <View className="mt-4 flex-row gap-2">
        <TouchableOpacity
          className={`flex-1 rounded-2xl py-3 ${premiumLoading ? "bg-amber-300 dark:bg-amber-700" : "bg-amber-500"}`}
          onPress={() => void onOpenPremium()}
        >
          <Text className="text-center font-extrabold text-white">Ver planes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 rounded-2xl border-2 border-amber-200 bg-amber-50 py-3 dark:border-amber-800 dark:bg-amber-950"
          onPress={() => void onRestorePurchases()}
        >
          <Text className="text-center font-extrabold text-amber-800 dark:text-amber-200">
            Restaurar compras
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
