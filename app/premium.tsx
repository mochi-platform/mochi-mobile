import { tc } from "@/src/shared/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Linking, ScrollView, Text, TouchableOpacity, View } from "react-native";
import type { PurchasesOfferings, PurchasesPackage } from "react-native-purchases";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCustomAlert } from "@/src/shared/components/CustomAlert";
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
    <SafeAreaView className="flex-1 bg-canvas">
      <View className="flex-row items-center px-4 pb-2 pt-2">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Volver"
          className="h-11 w-11 items-center justify-center rounded-full"
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={tc("#34244c")} />
        </TouchableOpacity>
        <Text className="ml-1 text-xl font-extrabold text-ink">Mochi Premium</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {plan.isPremium ? (
          <View className="mb-4 rounded-3xl bg-accent-soft p-5">
            <Text className="text-lg font-extrabold text-ink">Tu plan Premium está activo</Text>
            {plan.periodEndsAt ? (
              <Text className="mt-1 text-sm font-semibold text-ink">
                Vigente hasta {new Date(plan.periodEndsAt).toLocaleDateString("es-EC")}
              </Text>
            ) : null}
            <TouchableOpacity
              accessibilityRole="link"
              className="mt-3 min-h-[44px] justify-center"
              onPress={() => void Linking.openURL(PLAY_SUBSCRIPTIONS_URL)}
            >
              <Text className="font-extrabold text-ink">Gestionar suscripción en Google Play</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View className="mb-4 overflow-hidden rounded-3xl border border-line bg-surface">
          <View className="flex-row bg-surface-muted px-4 py-3">
            <Text className="flex-1 text-xs font-extrabold text-ink">Qué incluye</Text>
            <Text className="w-28 text-xs font-extrabold text-ink">Gratis</Text>
            <Text className="w-28 text-xs font-extrabold text-ink">Premium</Text>
          </View>
          {ROWS.map((row) => (
            <View key={row.label} className="flex-row border-t border-line px-4 py-3">
              <Text className="flex-1 pr-2 text-xs font-bold text-ink">{row.label}</Text>
              <Text className="w-28 text-xs font-semibold text-ink-muted">{row.free}</Text>
              <Text className="w-28 text-xs font-bold text-ink">{row.premium}</Text>
            </View>
          ))}
        </View>

        {!plan.isPremium ? (
          loading ? (
            <ActivityIndicator color={tc("#8b6fd6")} />
          ) : packages.length > 0 ? (
            packages.map((pkg) => (
              <View
                key={pkg.identifier}
                className="mb-3 rounded-2xl border-2 border-accent bg-surface p-4"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-sm font-extrabold text-ink">{pkg.product.title}</Text>
                    <Text className="mt-1 text-xs font-semibold text-ink-muted">
                      {pkg.product.description}
                    </Text>
                  </View>
                  <Text className="text-base font-extrabold text-ink">
                    {pkg.product.priceString}
                  </Text>
                </View>
                <TouchableOpacity
                  accessibilityRole="button"
                  className={`mt-3 min-h-[44px] justify-center rounded-2xl ${busy ? "bg-accent/60" : "bg-canvas0"}`}
                  disabled={busy}
                  onPress={() => void handlePurchase(pkg)}
                >
                  <Text className="text-center font-extrabold text-accent-ink">Elegir plan</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <View className="rounded-2xl border border-line bg-surface p-4">
              <Text className="text-sm font-semibold text-ink-muted">
                Los planes no están disponibles en este momento.
              </Text>
            </View>
          )
        ) : null}

        <TouchableOpacity
          accessibilityRole="button"
          className="mt-4 min-h-[44px] items-center justify-center"
          disabled={busy}
          onPress={() => void handleRestore()}
        >
          <Text className="font-extrabold text-ink">Restaurar compras</Text>
        </TouchableOpacity>
      </ScrollView>
      {AlertComponent}
    </SafeAreaView>
  );
}

export default PremiumScreen;
