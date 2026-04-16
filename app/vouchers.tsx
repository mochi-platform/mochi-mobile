import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Modal,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { useCustomAlert } from "@/src/shared/components/CustomAlert";
import { useSession } from "@/src/core/providers/SessionContext";
import { supabase } from "@/src/shared/lib/supabase";
import type { Voucher, VoucherTemplate } from "@/src/shared/types/database";

type ProfilePoints = {
  total_points: number;
};

type VoucherStatus = {
  label: string;
  className: string;
  textClass: string;
};

const templateCardClassMap: Record<string, string> = {
  pink: "border-pink-200 bg-pink-100",
  purple: "border-purple-200 bg-purple-100",
  yellow: "border-yellow-200 bg-yellow-100",
  blue: "border-blue-200 bg-blue-100",
  mint: "border-emerald-200 bg-emerald-100",
  green: "border-green-200 bg-green-100",
  orange: "border-orange-200 bg-orange-100",
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
    .format(new Date(value))
    .replace(".", "");
}

function getStatus(isRedeemed: boolean): VoucherStatus {
  if (isRedeemed) {
    return {
      label: "Canjeado",
      className: "bg-emerald-100",
      textClass: "text-emerald-800",
    };
  }

  return {
    label: "Pendiente",
    className: "bg-yellow-100",
    textClass: "text-yellow-900",
  };
}

function resolveTemplateClass(color: string): string {
  return templateCardClassMap[color] ?? "border-purple-200 bg-purple-100";
}

export function VouchersScreen() {
  const { session } = useSession();
  const { showAlert, AlertComponent } = useCustomAlert();
  const [templates, setTemplates] = useState<VoucherTemplate[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [shareVoucher, setShareVoucher] = useState<Voucher | null>(null);
  const [sharing, setSharing] = useState(false);
  const shareCardRef = useRef<View>(null);

  const userId = session?.user.id;

  const loadVouchersData = useCallback(async () => {
    if (!userId) {
      setTemplates([]);
      setVouchers([]);
      setTotalPoints(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [templatesRes, vouchersRes, profileRes] = await Promise.all([
        supabase
          .from("voucher_templates")
          .select("id, title, description, points_cost, icon, color")
          .order("points_cost", { ascending: true }),
        supabase
          .from("vouchers")
          .select(
            "id, user_id, title, description, points_cost, icon, color, is_redeemed, redeemed_at, created_at",
          )
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("total_points")
          .eq("id", userId)
          .single(),
      ]);

      if (templatesRes.error) throw templatesRes.error;
      if (vouchersRes.error) throw vouchersRes.error;
      if (profileRes.error) throw profileRes.error;

      setTemplates((templatesRes.data ?? []) as VoucherTemplate[]);
      setVouchers((vouchersRes.data ?? []) as Voucher[]);
      setTotalPoints(
        ((profileRes.data as ProfilePoints | null)?.total_points ??
          0) as number,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudieron cargar los vales",
      );
      setTemplates([]);
      setVouchers([]);
      setTotalPoints(0);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void loadVouchersData();
    }, [loadVouchersData]),
  );

  const hasGeneratedVouchers = useMemo(
    () => vouchers.length > 0,
    [vouchers.length],
  );

  const handleGenerateVoucher = async (template: VoucherTemplate) => {
    if (!userId) return;

    if (totalPoints < template.points_cost) {
      showAlert({
        title: "Puntos insuficientes",
        message: "No tienes suficientes puntos",
        buttons: [{ text: "Entendido", style: "cancel" }],
      });
      return;
    }

    try {
      setGeneratingId(template.id);

      const nextPoints = totalPoints - template.points_cost;

      const { error: updatePointsError } = await supabase
        .from("profiles")
        .update({ total_points: nextPoints })
        .eq("id", userId);

      if (updatePointsError) throw updatePointsError;

      const { error: createVoucherError } = await supabase
        .from("vouchers")
        .insert({
          user_id: userId,
          template_id: template.id,
          title: template.title,
          description: template.description,
          points_cost: template.points_cost,
          icon: template.icon,
          color: template.color,
          is_redeemed: false,
        });

      if (createVoucherError) throw createVoucherError;

      setTotalPoints(nextPoints);

      showAlert({
        title: "Vale generado",
        message: "Tu vale está listo para compartir con tu pareja",
        buttons: [{ text: "Perfecto", style: "default" }],
      });

      await loadVouchersData();
    } catch (err) {
      showAlert({
        title: "Error",
        message:
          err instanceof Error ? err.message : "No se pudo generar el vale",
        buttons: [{ text: "Entendido", style: "destructive" }],
      });
    } finally {
      setGeneratingId(null);
    }
  };

  const handleMarkAsRedeemed = (voucher: Voucher) => {
    if (voucher.is_redeemed) {
      showAlert({
        title: "Vale canjeado",
        message: "Este vale ya fue canjeado",
        buttons: [{ text: "Aceptar", style: "cancel" }],
      });
      return;
    }

    showAlert({
      title: "Canjear vale",
      message: "¿Quieres marcar este vale como canjeado?",
      buttons: [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Marcar como canjeado",
          style: "default",
          onPress: () => {
            void (async () => {
              try {
                setRedeemingId(voucher.id);

                const { error: updateError } = await supabase
                  .from("vouchers")
                  .update({
                    is_redeemed: true,
                    redeemed_at: new Date().toISOString(),
                  })
                  .eq("id", voucher.id)
                  .eq("user_id", voucher.user_id);

                if (updateError) throw updateError;
                await loadVouchersData();
              } catch (err) {
                showAlert({
                  title: "Error",
                  message:
                    err instanceof Error
                      ? err.message
                      : "No se pudo actualizar el vale",
                  buttons: [{ text: "Entendido", style: "destructive" }],
                });
              } finally {
                setRedeemingId(null);
              }
            })();
          },
        },
      ],
    });
  };

  const handleShareVoucher = async () => {
    if (!shareVoucher) return;
    setSharing(true);
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare && shareCardRef.current) {
        const uri = await captureRef(shareCardRef, {
          format: "png",
          quality: 1,
          result: "tmpfile",
        });
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: shareVoucher.title,
        });
      } else {
        await Share.share({
          message: `${shareVoucher.title}\n${shareVoucher.description}\n\nGenerado con Mochi`,
          title: shareVoucher.title,
        });
      }
    } catch (err) {
      if (err instanceof Error && err.message !== "User did not share") {
        showAlert({
          title: "Error al compartir",
          message: "No se pudo compartir el vale",
          buttons: [{ text: "Entendido", style: "cancel" }],
        });
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <>
      <SafeAreaView className="flex-1 bg-yellow-50">
        <ScrollView
          className="flex-1 px-5"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            className="mt-4 flex-row items-center"
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={22} color="#92400e" />
            <Text className="ml-1 font-bold text-yellow-900">Volver</Text>
          </TouchableOpacity>

          <View className="mt-6 rounded-3xl border-2 border-yellow-200 bg-white p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-2xl font-extrabold text-yellow-900">
                Vales
              </Text>
              <View className="rounded-full bg-yellow-200 px-3 py-1">
                <Text className="text-xs font-extrabold text-yellow-900">
                  {totalPoints} puntos
                </Text>
              </View>
            </View>
            <Text className="mt-2 text-sm font-semibold text-yellow-700">
              Canjea tus puntos por recompensas especiales
            </Text>
          </View>

          {loading ? (
            <View className="mt-6 items-center rounded-3xl border-2 border-yellow-200 bg-white p-6">
              <MochiCharacter mood="thinking" size={88} />
              <Text className="mt-3 text-sm font-semibold text-yellow-800">
                Cargando vales...
              </Text>
            </View>
          ) : error ? (
            <View className="mt-6 items-center rounded-3xl border-2 border-red-200 bg-red-50 p-6">
              <MochiCharacter mood="sleepy" size={76} />
              <Text className="mt-3 text-center text-sm font-semibold text-red-700">
                {error}
              </Text>
              <TouchableOpacity
                className="mt-4 rounded-2xl bg-red-500 px-5 py-2"
                onPress={() => void loadVouchersData()}
              >
                <Text className="font-extrabold text-white">Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View className="mt-6">
                <Text className="text-lg font-extrabold text-yellow-900">
                  Mis vales
                </Text>

                {!hasGeneratedVouchers ? (
                  <View className="mt-3 items-center rounded-3xl border-2 border-yellow-200 bg-white p-6">
                    <MochiCharacter mood="happy" size={86} />
                    <Text className="mt-3 text-center text-sm font-semibold text-yellow-800">
                      Acumula puntos para generar vales
                    </Text>
                  </View>
                ) : (
                  <View className="mt-3">
                    {vouchers.map((voucher) => {
                      const status = getStatus(voucher.is_redeemed);

                      return (
                        <TouchableOpacity
                          key={voucher.id}
                          className="mb-3 rounded-2xl border-2 border-yellow-200 bg-white p-4"
                          onLongPress={() => handleMarkAsRedeemed(voucher)}
                          delayLongPress={250}
                        >
                          <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center flex-1 mr-2">
                              <View className="h-10 w-10 items-center justify-center rounded-xl bg-yellow-100">
                                <Ionicons
                                  name={
                                    (voucher.icon as keyof typeof Ionicons.glyphMap) ||
                                    "ticket"
                                  }
                                  size={18}
                                  color="#92400e"
                                />
                              </View>
                              <View className="ml-3 flex-1">
                                <Text className="text-base font-extrabold text-yellow-950">
                                  {voucher.title}
                                </Text>
                                <Text className="mt-1 text-xs font-semibold text-yellow-800">
                                  {formatDate(voucher.created_at)}
                                </Text>
                              </View>
                            </View>
                            <View className="flex-row items-center gap-2">
                              <TouchableOpacity
                                className="h-8 w-8 items-center justify-center rounded-full bg-yellow-100"
                                onPress={() => setShareVoucher(voucher)}
                                hitSlop={{
                                  top: 8,
                                  bottom: 8,
                                  left: 8,
                                  right: 8,
                                }}
                              >
                                <Ionicons
                                  name="share"
                                  size={16}
                                  color="#92400e"
                                />
                              </TouchableOpacity>
                              <View
                                className={`rounded-full px-3 py-1 ${status.className}`}
                              >
                                <Text
                                  className={`text-xs font-extrabold ${status.textClass}`}
                                >
                                  {status.label}
                                </Text>
                              </View>
                            </View>
                          </View>

                          {redeemingId === voucher.id && (
                            <Text className="mt-3 text-xs font-semibold text-yellow-800">
                              Actualizando estado...
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              <View className="mt-6">
                <Text className="text-lg font-extrabold text-yellow-900">
                  Catálogo
                </Text>

                {templates.length === 0 ? (
                  <View className="mt-3 items-center rounded-3xl border-2 border-yellow-200 bg-white p-6">
                    <MochiCharacter mood="happy" size={82} />
                    <Text className="mt-3 text-center text-sm font-semibold text-yellow-800">
                      Aún no hay plantillas disponibles
                    </Text>
                  </View>
                ) : (
                  <View className="mt-3">
                    {templates.map((template) => (
                      <View
                        key={template.id}
                        className={`mb-3 rounded-2xl border-2 p-4 ${resolveTemplateClass(template.color)}`}
                      >
                        <View className="flex-row items-start justify-between">
                          <View className="flex-1 pr-3">
                            <View className="flex-row items-center">
                              <Ionicons
                                name={
                                  (template.icon as keyof typeof Ionicons.glyphMap) ||
                                  "gift"
                                }
                                size={16}
                                color="#7c3aed"
                              />
                              <Text className="ml-2 text-base font-extrabold text-slate-900">
                                {template.title}
                              </Text>
                            </View>
                            <Text className="mt-2 text-sm font-semibold text-slate-700">
                              {template.description}
                            </Text>
                            <Text className="mt-2 text-xs font-extrabold text-slate-600">
                              {template.points_cost} puntos
                            </Text>
                          </View>
                        </View>

                        <TouchableOpacity
                          className="mt-4 items-center rounded-2xl bg-yellow-500 py-3"
                          onPress={() => void handleGenerateVoucher(template)}
                          disabled={generatingId === template.id}
                        >
                          <Text className="font-extrabold text-white">
                            {generatingId === template.id
                              ? "Generando..."
                              : "Generar vale"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </>
          )}

          <View className="h-14" />
        </ScrollView>
      </SafeAreaView>
      {AlertComponent}

      {/* Share Voucher Modal */}
      <Modal visible={shareVoucher !== null} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/50 px-6">
          <View className="w-full max-w-sm rounded-3xl bg-white pb-6 pt-5">
            <View className="mb-4 flex-row items-center justify-between px-5">
              <Text className="text-base font-extrabold text-slate-800">
                Compartir vale
              </Text>
              <TouchableOpacity onPress={() => setShareVoucher(null)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            {shareVoucher && (
              <>
                {/* Capturable card */}
                <View
                  ref={shareCardRef}
                  collapsable={false}
                  className="mx-5 overflow-hidden rounded-2xl"
                  style={{ backgroundColor: "#fffbeb" }}
                >
                  <View
                    style={{
                      padding: 24,
                      alignItems: "center",
                      borderWidth: 2,
                      borderColor: "#fde68a",
                      borderRadius: 16,
                    }}
                  >
                    <View
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 20,
                        backgroundColor: "#fef3c7",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 12,
                      }}
                    >
                      <Ionicons
                        name={
                          (shareVoucher.icon as keyof typeof Ionicons.glyphMap) ||
                          "ticket"
                        }
                        size={30}
                        color="#92400e"
                      />
                    </View>
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "800",
                        color: "#78350f",
                        textAlign: "center",
                        marginBottom: 8,
                      }}
                    >
                      {shareVoucher.title}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: "#92400e",
                        textAlign: "center",
                        marginBottom: 16,
                      }}
                    >
                      {shareVoucher.description}
                    </Text>
                    <View
                      style={{
                        backgroundColor: "#fcd34d",
                        borderRadius: 999,
                        paddingHorizontal: 14,
                        paddingVertical: 4,
                        marginBottom: 16,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "800",
                          color: "#78350f",
                        }}
                      >
                        {shareVoucher.points_cost} puntos
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: 11,
                        color: "#b45309",
                        fontWeight: "600",
                      }}
                    >
                      Generado con Mochi
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  className={`mx-5 mt-5 items-center rounded-2xl py-4 ${sharing ? "bg-yellow-300" : "bg-yellow-500"}`}
                  onPress={() => void handleShareVoucher()}
                  disabled={sharing}
                >
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="share" size={18} color="white" />
                    <Text className="font-extrabold text-white">
                      {sharing ? "Compartiendo..." : "Compartir imagen"}
                    </Text>
                  </View>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

export default VouchersScreen;
