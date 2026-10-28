import { Text, View } from "react-native";
import { showAdsPrivacyOptions } from "@/src/shared/lib/ads";
import type { AiCreditBalance } from "@/src/shared/lib/aiCredits";
import { Button, Caption, PressableScale, Stat, Surface, Title } from "@/src/shared/ui";

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
    <Surface className="mt-6 p-4">
      <Title>Créditos de IA</Title>
      <Caption className="mt-1">Gana créditos con un anuncio cuando los necesites.</Caption>
      <View className="mt-3 flex-row justify-around rounded-control bg-surface-muted py-3">
        <Stat value={String(aiCredits?.balance ?? 0)} label="créditos" />
        <Stat value={String(aiCredits?.remainingToday ?? 0)} label="restantes hoy" />
      </View>
      <View className="mt-3 gap-2">
        <Button
          title={rewardedLoading ? "Cargando anuncio…" : "Ver anuncio"}
          disabled={!rewardedReady}
          onPress={onWatchAd}
        />
        <Button
          title={aiCreditsLoading ? "Actualizando…" : "Actualizar"}
          variant="soft"
          loading={aiCreditsLoading}
          onPress={() => void onRefreshCredits()}
        />
      </View>
      <PressableScale
        haptics="selection"
        onPress={() => void showAdsPrivacyOptions()}
        accessibilityLabel="Preferencias de anuncios"
        className="mt-2 min-h-[44px] items-center justify-center"
      >
        <Text className="font-body-extrabold text-sm text-accent-strong">
          Preferencias de anuncios
        </Text>
      </PressableScale>
    </Surface>
  );
}
