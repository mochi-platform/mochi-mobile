import { tc } from "@/src/shared/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useRef, useState, type ComponentRef } from "react";
import { Modal, ScrollView, Share, Text, TouchableOpacity, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { useCustomAlert } from "@/src/shared/components/CustomAlert";
import { IconCtaButton } from "@/src/shared/components/IconCtaButton";
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
  pink: "border-pink-200 dark:border-pink-800 bg-pink-100 dark:bg-pink-900",
  purple: "border-purple-200 dark:border-purple-800 bg-purple-100 dark:bg-purple-900",
  yellow: "border-yellow-200 dark:border-yellow-800 bg-yellow-100 dark:bg-yellow-900",
  blue: "border-blue-200 dark:border-blue-800 bg-blue-100 dark:bg-blue-900",
  mint: "border-emerald-200 dark:border-emerald-800 bg-emerald-100 dark:bg-emerald-900",
  green: "border-green-200 dark:border-green-800 bg-green-100 dark:bg-green-900",
  orange: "border-orange-200 dark:border-orange-800 bg-orange-100 dark:bg-orange-900",
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
      className: "bg-emerald-100 dark:bg-emerald-900",
      textClass: "text-emerald-800 dark:text-emerald-200",
    };
  }

  return {
    label: "Pendiente",
    className: "bg-yellow-100 dark:bg-yellow-900",
    textClass: "text-yellow-900 dark:text-yellow-100",
  };
}

function resolveTemplateClass(color: string): string {
  return (
    templateCardClassMap[color] ??
    "border-purple-200 dark:border-purple-800 bg-purple-100 dark:bg-purple-900"
  );
}

export function VouchersScreen() {
  const { session } = useSession();
  const { showAlert, AlertComponent } = useCustomAlert();
  const [templates, setTemplates] = useState<VoucherTemplate[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [sharedVouchers, setSharedVouchers] = useState<Voucher[]>([]);
  const [partnerSpaceId, setPartnerSpaceId] = useState<string | null>(null);
  const [showSharedSection, setShowSharedSection] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [shareVoucher, setShareVoucher] = useState<Voucher | null>(null);
  const [sharing, setSharing] = useState(false);
  const shareCardRef = useRef<ComponentRef<typeof View>>(null);

  const userId = session?.user.id;

  const loadVouchersData = useCallback(async () => {
    if (!userId) {
      setTemplates([]);
      setVouchers([]);
      setSharedVouchers([]);
      setPartnerSpaceId(null);
      setShowSharedSection(false);
      setTotalPoints(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [templatesRes, vouchersRes, profileRes, partnerSpaceRes] = await Promise.all([
        supabase
          .from("voucher_templates")
          .select("id, title, description, points_cost, icon, color")
          .order("points_cost", { ascending: true }),
        supabase
          .from("vouchers")
          .select(
            "id, user_id, title, description, points_cost, icon, color, is_redeemed, redeemed_at, created_at, space_id, redeemed_by, updated_by_partner, created_by, mode, image_url",
          )
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase.from("profiles").select("total_points").eq("id", userId).single(),
        supabase
          .from("partner_spaces")
          .select("id, invite_status, owner_user_id, partner_user_id")
          .or(`owner_user_id.eq.${userId},partner_user_id.eq.${userId}`)
          .eq("invite_status", "accepted")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (templatesRes.error) throw templatesRes.error;
      if (vouchersRes.error) throw vouchersRes.error;
      if (profileRes.error) throw profileRes.error;

      setTemplates((templatesRes.data ?? []) as VoucherTemplate[]);
      setVouchers((vouchersRes.data ?? []) as Voucher[]);
      setTotalPoints(((profileRes.data as ProfilePoints | null)?.total_points ?? 0) as number);

      const partnerSpace =
        (partnerSpaceRes.data as {
          id: string;
          owner_user_id: string;
          partner_user_id: string | null;
        } | null) ?? null;
      const spaceId = partnerSpace?.id ?? null;
      setPartnerSpaceId(spaceId);
      setShowSharedSection(partnerSpace?.partner_user_id === userId);

      if (spaceId) {
        const { data: sharedData, error: sharedError } = await supabase
          .from("vouchers")
          .select(
            "id, user_id, title, description, points_cost, icon, color, is_redeemed, redeemed_at, created_at, space_id, redeemed_by, updated_by_partner, created_by, mode, image_url",
          )
          .eq("space_id", spaceId)
          .order("created_at", { ascending: false });

        if (sharedError) throw sharedError;
        setSharedVouchers((sharedData ?? []) as Voucher[]);
      } else {
        setSharedVouchers([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los vales");
      setTemplates([]);
      setVouchers([]);
      setSharedVouchers([]);
      setPartnerSpaceId(null);
      setShowSharedSection(false);
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

  const hasGeneratedVouchers = useMemo(() => vouchers.length > 0, [vouchers.length]);

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

      const { error: generateError } = await supabase.rpc("generate_voucher", {
        p_template_id: template.id,
      });
      if (generateError) throw generateError;

      const nextPoints = totalPoints - template.points_cost;
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
        message: err instanceof Error ? err.message : "No se pudo generar el vale",
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

                const { error: updateError } = await supabase.rpc("redeem_voucher", {
                  p_voucher_id: voucher.id,
                });
                if (updateError) throw updateError;
                await loadVouchersData();
              } catch (err) {
                showAlert({
                  title: "Error",
                  message: err instanceof Error ? err.message : "No se pudo actualizar el vale",
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
      <SafeAreaView className="flex-1 bg-yellow-50 dark:bg-yellow-950">
        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
          <TouchableOpacity className="mt-4 flex-row items-center" onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={tc("#92400e")} />
            <Text className="ml-1 font-bold text-yellow-900 dark:text-yellow-100">Volver</Text>
          </TouchableOpacity>

          <View className="mt-6 rounded-3xl border-2 border-yellow-200 bg-white p-4 dark:border-yellow-800 dark:bg-surface">
            <View className="flex-row items-center justify-between">
              <Text className="text-2xl font-extrabold text-yellow-900 dark:text-yellow-100">
                Vales
              </Text>
              <View className="rounded-full bg-yellow-200 px-3 py-1 dark:bg-yellow-800">
                <Text className="text-xs font-extrabold text-yellow-900 dark:text-yellow-100">
                  {totalPoints} puntos
                </Text>
              </View>
            </View>
            <Text className="mt-2 text-sm font-semibold text-yellow-700 dark:text-yellow-300">
              Canjea tus puntos por recompensas especiales
            </Text>
          </View>

          {loading ? (
            <View className="mt-6 items-center rounded-3xl border-2 border-yellow-200 bg-white p-6 dark:border-yellow-800 dark:bg-surface">
              <MochiCharacter mood="thinking" size={88} />
              <Text className="mt-3 text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                Cargando vales...
              </Text>
            </View>
          ) : error ? (
            <View className="mt-6 items-center rounded-3xl border-2 border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-950">
              <MochiCharacter mood="sleepy" size={76} />
              <Text className="mt-3 text-center text-sm font-semibold text-red-700 dark:text-red-300">
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
                <Text className="text-lg font-extrabold text-yellow-900 dark:text-yellow-100">
                  Mis vales
                </Text>

                {!hasGeneratedVouchers ? (
                  <View className="mt-3 items-center rounded-3xl border-2 border-yellow-200 bg-white p-6 dark:border-yellow-800 dark:bg-surface">
                    <MochiCharacter mood="happy" size={86} />
                    <Text className="mt-3 text-center text-sm font-semibold text-yellow-800 dark:text-yellow-200">
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
                          className="mb-3 rounded-2xl border-2 border-yellow-200 bg-white p-4 dark:border-yellow-800 dark:bg-surface"
                          onLongPress={() => handleMarkAsRedeemed(voucher)}
                          delayLongPress={250}
                        >
                          <View className="flex-row items-center justify-between">
                            <View className="mr-2 flex-1 flex-row items-center">
                              <View className="h-10 w-10 items-center justify-center rounded-xl bg-yellow-100 dark:bg-yellow-900">
                                <Ionicons
                                  name={
                                    (voucher.icon as keyof typeof Ionicons.glyphMap) || "ticket"
                                  }
                                  size={18}
                                  color={tc("#92400e")}
                                />
                              </View>
                              <View className="ml-3 flex-1">
                                <Text className="text-base font-extrabold text-yellow-950 dark:text-yellow-50">
                                  {voucher.title}
                                </Text>
                                <Text className="mt-1 text-xs font-semibold text-yellow-800 dark:text-yellow-200">
                                  {formatDate(voucher.created_at)}
                                </Text>
                              </View>
                            </View>
                            <View className="flex-row items-center gap-2">
                              <TouchableOpacity
                                className="h-8 w-8 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900"
                                onPress={() => setShareVoucher(voucher)}
                                hitSlop={{
                                  top: 8,
                                  bottom: 8,
                                  left: 8,
                                  right: 8,
                                }}
                              >
                                <Ionicons name="share" size={16} color={tc("#92400e")} />
                              </TouchableOpacity>
                              <View className={`rounded-full px-3 py-1 ${status.className}`}>
                                <Text className={`text-xs font-extrabold ${status.textClass}`}>
                                  {status.label}
                                </Text>
                              </View>
                            </View>
                          </View>

                          {redeemingId === voucher.id && (
                            <Text className="mt-3 text-xs font-semibold text-yellow-800 dark:text-yellow-200">
                              Actualizando estado...
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              {partnerSpaceId && showSharedSection && (
                <View className="mt-6">
                  <Text className="text-lg font-extrabold text-yellow-900 dark:text-yellow-100">
                    Vales compartidos
                  </Text>

                  {sharedVouchers.length === 0 ? (
                    <View className="mt-3 items-center rounded-3xl border-2 border-yellow-200 bg-white p-6 dark:border-yellow-800 dark:bg-surface">
                      <MochiCharacter mood="happy" size={76} />
                      <Text className="mt-3 text-center text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                        Aun no hay vales compartidos en este espacio
                      </Text>
                    </View>
                  ) : (
                    <View className="mt-3">
                      {sharedVouchers.map((voucher) => {
                        const status = getStatus(voucher.is_redeemed);

                        return (
                          <TouchableOpacity
                            key={voucher.id}
                            className="mb-3 rounded-2xl border-2 border-yellow-200 bg-white p-4 dark:border-yellow-800 dark:bg-surface"
                            onLongPress={() => handleMarkAsRedeemed(voucher)}
                            delayLongPress={250}
                          >
                            <View className="flex-row items-center justify-between">
                              <View className="mr-2 flex-1 flex-row items-center">
                                <View className="h-10 w-10 items-center justify-center rounded-xl bg-yellow-100 dark:bg-yellow-900">
                                  <Ionicons
                                    name={
                                      (voucher.icon as keyof typeof Ionicons.glyphMap) || "ticket"
                                    }
                                    size={18}
                                    color={tc("#92400e")}
                                  />
                                </View>
                                <View className="ml-3 flex-1">
                                  <Text className="text-base font-extrabold text-yellow-950 dark:text-yellow-50">
                                    {voucher.title}
                                  </Text>
                                  <Text className="mt-1 text-xs font-semibold text-yellow-800 dark:text-yellow-200">
                                    {formatDate(voucher.created_at)}
                                  </Text>
                                  {voucher.updated_by_partner && (
                                    <Text className="mt-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                                      Actualizado por tu pareja
                                    </Text>
                                  )}
                                </View>
                              </View>
                              <View className="flex-row items-center gap-2">
                                <View className={`rounded-full px-3 py-1 ${status.className}`}>
                                  <Text className={`text-xs font-extrabold ${status.textClass}`}>
                                    {status.label}
                                  </Text>
                                </View>
                              </View>
                            </View>

                            {redeemingId === voucher.id && (
                              <Text className="mt-3 text-xs font-semibold text-yellow-800 dark:text-yellow-200">
                                Actualizando estado...
                              </Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              <View className="mt-6">
                <Text className="text-lg font-extrabold text-yellow-900 dark:text-yellow-100">
                  Catálogo
                </Text>

                {templates.length === 0 ? (
                  <View className="mt-3 items-center rounded-3xl border-2 border-yellow-200 bg-white p-6 dark:border-yellow-800 dark:bg-surface">
                    <MochiCharacter mood="happy" size={82} />
                    <Text className="mt-3 text-center text-sm font-semibold text-yellow-800 dark:text-yellow-200">
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
                                name={(template.icon as keyof typeof Ionicons.glyphMap) || "gift"}
                                size={16}
                                color={tc("#7c3aed")}
                              />
                              <Text className="ml-2 text-base font-extrabold text-slate-900 dark:text-slate-100">
                                {template.title}
                              </Text>
                            </View>
                            <Text className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                              {template.description}
                            </Text>
                            <Text className="mt-2 text-xs font-extrabold text-slate-600 dark:text-slate-400">
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
                            {generatingId === template.id ? "Generando..." : "Generar vale"}
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
          <View className="w-full max-w-sm rounded-3xl bg-white pb-6 pt-5 dark:bg-surface">
            <View className="mb-4 flex-row items-center justify-between px-5">
              <Text className="text-base font-extrabold text-slate-800 dark:text-slate-200">
                Compartir vale
              </Text>
              <TouchableOpacity onPress={() => setShareVoucher(null)}>
                <Ionicons name="close" size={22} color={tc("#64748b")} />
              </TouchableOpacity>
            </View>

            {shareVoucher && (
              <>
                {/* Capturable card */}
                <View
                  ref={shareCardRef}
                  collapsable={false}
                  className="mx-5 overflow-hidden rounded-2xl"
                  style={{ backgroundColor: tc("#fffbeb") }}
                >
                  <View
                    style={{
                      padding: 24,
                      alignItems: "center",
                      borderWidth: 2,
                      borderColor: tc("#fde68a"),
                      borderRadius: 16,
                    }}
                  >
                    <View
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 20,
                        backgroundColor: tc("#fef3c7"),
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 12,
                      }}
                    >
                      <Ionicons
                        name={(shareVoucher.icon as keyof typeof Ionicons.glyphMap) || "ticket"}
                        size={30}
                        color={tc("#92400e")}
                      />
                    </View>
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "800",
                        color: tc("#78350f"),
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
                        color: tc("#92400e"),
                        textAlign: "center",
                        marginBottom: 16,
                      }}
                    >
                      {shareVoucher.description}
                    </Text>
                    <View
                      style={{
                        backgroundColor: tc("#fcd34d"),
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
                          color: tc("#78350f"),
                        }}
                      >
                        {shareVoucher.points_cost} puntos
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: 11,
                        color: tc("#b45309"),
                        fontWeight: "600",
                      }}
                    >
                      Generado con Mochi
                    </Text>
                  </View>
                </View>

                <IconCtaButton
                  label="Compartir imagen"
                  onPress={() => {
                    void handleShareVoucher();
                  }}
                  iconName="share"
                  iconColor={tc("#ffffff")}
                  iconSize={18}
                  loading={sharing}
                  loadingColor={tc("#ffffff")}
                  containerClassName={`mx-5 mt-5 rounded-2xl py-4 ${sharing ? "bg-yellow-300 dark:bg-yellow-700" : "bg-yellow-500"}`}
                  textClassName="text-white"
                />
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

export default VouchersScreen;
