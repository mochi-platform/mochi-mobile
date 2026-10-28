import { Text, View } from "react-native";
import { Button, Caption, Surface, Title } from "@/src/shared/ui";
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
  const isPremium = planInfo?.planKey === "premium";
  const endsLabel = planInfo?.periodEndsAt
    ? new Date(planInfo.periodEndsAt).toLocaleDateString("es-EC")
    : null;
  return (
    <Surface className="mt-6 p-4">
      <View className="flex-row items-center justify-between">
        <Title>Premium IA</Title>
        <View
          className={`rounded-full px-3 py-1 ${isPremium ? "bg-tint-kitchen" : "bg-surface-muted"}`}
        >
          <Text
            className={`font-body-extrabold text-xs ${isPremium ? "text-tint-kitchen-ink" : "text-ink-muted"}`}
          >
            {isPremium ? "Premium activo" : "Plan gratis"}
          </Text>
        </View>
      </View>
      <Caption className="mt-1">Más IA cada día, temas de color y más cosas para Mochi.</Caption>
      {endsLabel ? <Caption className="mt-1">Vigente hasta {endsLabel}</Caption> : null}
      <View className="mt-4 gap-2">
        <Button title="Ver planes" loading={premiumLoading} onPress={() => void onOpenPremium()} />
        <Button
          title="Restaurar compras"
          variant="soft"
          onPress={() => void onRestorePurchases()}
        />
      </View>
    </Surface>
  );
}
