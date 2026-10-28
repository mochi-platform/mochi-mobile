import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Linking, Text, View } from "react-native";
import type { PurchasesOfferings, PurchasesPackage } from "react-native-purchases";
import { useCustomAlert } from "@/src/shared/components/CustomAlert";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { COLORS } from "@/src/shared/theme/tokens";
import {
  Button,
  Caption,
  Display,
  Eyebrow,
  MochiQuote,
  PressableScale,
  Screen,
  SectionHeader,
  Skeleton,
  Strong,
  Surface,
  Title,
} from "@/src/shared/ui";
import { track } from "@/src/shared/lib/observability/analytics";
import { usePlan } from "@/src/shared/hooks/usePlan";
import {
  canUseRevenueCat,
  getRevenueCatOfferings,
  purchaseRevenueCatPackage,
  restoreRevenueCatPurchases,
  syncRevenueCatToBackend,
} from "@/src/shared/lib/revenuecat";

type Row = { label: string; free: string; premium: string };

const ROWS: Row[] = [
  { label: "Módulos de estudio, hábitos y bienestar", free: "Todos", premium: "Todos" },
  {
    label: "IA de Mochi",
    free: "Créditos + anuncios opcionales",
    premium: "Cupo amplio, sin anuncios",
  },
  { label: "Analíticas", free: "Semana actual", premium: "Histórico y correlaciones" },
  { label: "Personalización", free: "Tema base", premium: "Temas y atuendos" },
  { label: "Duo", free: "1 espacio, vales básicos", premium: "Duo Plus" },
];

const PLAY_SUBSCRIPTIONS_URL = "https://play.google.com/store/account/subscriptions";

export function PremiumScreen() {
  const router = useRouter();
  const { showAlert, AlertComponent } = useCustomAlert();
  const { plan, refresh } = usePlan();
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    track("paywall_viewed");
    void (async () => {
      try {
        if (canUseRevenueCat()) setOfferings(await getRevenueCatOfferings());
      } catch {
        setOfferings(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handlePurchase = useCallback(
    async (selected: PurchasesPackage) => {
      try {
        setBusy(true);
        track("purchase_started", { product: selected.product.identifier });
        const info = await purchaseRevenueCatPackage(selected);
        const result = await syncRevenueCatToBackend(info);
        await refresh();
        if (result.isPremium) track("purchase_completed", { product: selected.product.identifier });
        showAlert({
          title: result.isPremium ? "Premium activado" : "Compra recibida",
          message: result.isPremium
            ? "Gracias por apoyar a Mochi."
            : "Estamos confirmando tu compra. Si no ves Premium en unos minutos, usa Restaurar compras.",
          buttons: [{ text: "Listo", style: "default" }],
        });
      } catch (err) {
        showAlert({
          title: "No se pudo completar la compra",
          message: err instanceof Error ? err.message : "Intenta de nuevo en unos segundos.",
          buttons: [{ text: "Entendido", style: "cancel" }],
        });
      } finally {
        setBusy(false);
      }
    },
    [refresh, showAlert],
  );

  const handleRestore = useCallback(async () => {
    try {
      setBusy(true);
      const info = await restoreRevenueCatPurchases();
      await syncRevenueCatToBackend(info);
      await refresh();
      showAlert({
        title: "Compras restauradas",
        message: "Tu plan se actualizó correctamente.",
        buttons: [{ text: "Listo", style: "default" }],
      });
    } catch (err) {
      showAlert({
        title: "No se pudo restaurar",
        message: err instanceof Error ? err.message : "Intenta de nuevo en unos segundos.",
        buttons: [{ text: "Entendido", style: "cancel" }],
      });
    } finally {
      setBusy(false);
    }
  }, [refresh, showAlert]);

  const packages = offerings?.current?.availablePackages ?? [];

  return (
    <Screen
      withTabBar={false}
      headerRight={
        <PressableScale
          onPress={() => router.back()}
          accessibilityLabel="Volver"
          className="h-10 w-10 items-center justify-center rounded-full bg-surface-muted"
        >
          <Ionicons name="close" size={20} color={COLORS.inkMuted} />
        </PressableScale>
      }
    >
      <View className="items-center">
        <MochiCharacter expression="love" size={150} interactive />
        <Display className="mt-1 text-center">Mochi Premium</Display>
        <MochiQuote className="mt-1 text-center text-[17px] leading-[23px] text-ink-muted">
          Más de mí, cuando más me necesitas.
        </MochiQuote>
      </View>

      {plan.isPremium ? (
        <Surface elevation={2} className="mt-5 p-5">
          <Title>Tu Premium está activo</Title>
          {plan.periodEndsAt ? (
            <Caption className="mt-1">
              Vigente hasta {new Date(plan.periodEndsAt).toLocaleDateString("es-EC")}
            </Caption>
          ) : null}
          <View className="mt-3">
            <Button
              title="Gestionar en Google Play"
              variant="soft"
              onPress={() => void Linking.openURL(PLAY_SUBSCRIPTIONS_URL)}
            />
          </View>
        </Surface>
      ) : null}

      <SectionHeader title="Qué incluye" />
      <Surface className="px-4 py-1">
        {ROWS.map((row, index) => (
          <View key={row.label} className={`py-3 ${index > 0 ? "border-t border-line" : ""}`}>
            <Strong>{row.label}</Strong>
            <View className="mt-1.5 flex-row gap-3">
              <View className="flex-1">
                <Eyebrow>Gratis</Eyebrow>
                <Caption>{row.free}</Caption>
              </View>
              <View className="flex-1">
                <Eyebrow className="text-accent-strong">Premium</Eyebrow>
                <Caption className="text-ink">{row.premium}</Caption>
              </View>
            </View>
          </View>
        ))}
      </Surface>

      {!plan.isPremium ? (
        <>
          <SectionHeader title="Elige tu plan" />
          {loading ? (
            <Skeleton height={120} className="rounded-card" />
          ) : packages.length > 0 ? (
            <View className="gap-3">
              {packages.map((pkg) => (
                <Surface key={pkg.identifier} elevation={2} className="p-4">
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Strong>{pkg.product.title}</Strong>
                      <Caption className="mt-0.5">{pkg.product.description}</Caption>
                    </View>
                    <Text className="font-display text-xl text-ink">{pkg.product.priceString}</Text>
                  </View>
                  <View className="mt-3">
                    <Button
                      title="Elegir plan"
                      loading={busy}
                      onPress={() => void handlePurchase(pkg)}
                    />
                  </View>
                </Surface>
              ))}
            </View>
          ) : (
            <Surface tone="sunken" className="p-4">
              <Caption>Los planes no están disponibles en este momento.</Caption>
            </Surface>
          )}
        </>
      ) : null}

      <View className="mt-4">
        <Button
          title="Restaurar compras"
          variant="ghost"
          disabled={busy}
          onPress={() => void handleRestore()}
        />
      </View>
      <Caption className="mt-1 text-center">
        La suscripción se renueva sola. Puedes cancelarla cuando quieras en Google Play.
      </Caption>
      {AlertComponent}
    </Screen>
  );
}

export default PremiumScreen;
