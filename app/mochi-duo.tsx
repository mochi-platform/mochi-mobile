import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "@/src/core/providers/SessionContext";
import { useCustomAlert } from "@/src/shared/components/CustomAlert";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { TabHeader } from "@/src/shared/components/TabHeader";
import { supabase } from "@/src/shared/lib/supabase";
import type {
  JointGoal,
  PartnerSpace,
  Voucher,
} from "@/src/shared/types/database";

type PartnerSnapshot = {
  cycle_phase: string | null;
  study_week: number;
  exercise_week: number;
  habits_week: number;
  mood_last: number | null;
  cooking_week: number;
};

type DuoProfile = {
  id: string;
  full_name: string | null;
  mochi_name: string | null;
};

function formatPhase(value: string | null): string {
  const map: Record<string, string> = {
    menstrual: "Menstrual",
    folicular: "Folicular",
    ovulatoria: "Ovulatoria",
    lutea: "Lutea",
    unknown: "Desconocida",
  };
  if (!value) return "Desconocida";
  return map[value] ?? "Desconocida";
}

function formatMood(value: number | null): string {
  if (value === 1) return "Mal";
  if (value === 2) return "Regular";
  if (value === 3) return "Bien";
  if (value === 4) return "Muy bien";
  if (value === 5) return "Excelente";
  return "Sin registro";
}

export function MochiDuoScreen() {
  const { session } = useSession();
  const { showAlert, AlertComponent } = useCustomAlert();

  const [space, setSpace] = useState<PartnerSpace | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<DuoProfile | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<DuoProfile | null>(null);
  const [snapshot, setSnapshot] = useState<PartnerSnapshot | null>(null);
  const [jointGoals, setJointGoals] = useState<JointGoal[]>([]);
  const [sharedVouchers, setSharedVouchers] = useState<Voucher[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalDescription, setGoalDescription] = useState("");
  const [goalTargetDate, setGoalTargetDate] = useState("");
  const [savingGoal, setSavingGoal] = useState(false);

  const userId = session?.user.id;

  const isOwner = space?.owner_user_id === userId;

  const loadSpace = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: spaceData, error: spaceError } = await supabase
        .from("partner_spaces")
        .select("*")
        .or(`owner_user_id.eq.${userId},partner_user_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (spaceError) throw spaceError;

      const activeSpace = (spaceData as PartnerSpace | null) ?? null;
      setSpace(activeSpace);

      if (!activeSpace) {
        setOwnerProfile(null);
        setPartnerProfile(null);
        setSnapshot(null);
        setJointGoals([]);
        setSharedVouchers([]);
        return;
      }

      const profileIds = [activeSpace.owner_user_id, activeSpace.partner_user_id]
        .filter((id): id is string => Boolean(id));

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, mochi_name")
        .in("id", profileIds);

      const profiles = (profilesData as DuoProfile[] | null) ?? [];
      setOwnerProfile(
        profiles.find((profile) => profile.id === activeSpace.owner_user_id) ??
          null,
      );
      setPartnerProfile(
        profiles.find((profile) => profile.id === activeSpace.partner_user_id) ??
          null,
      );

      if (activeSpace.invite_status !== "accepted") {
        setSnapshot(null);
        setJointGoals([]);
        setSharedVouchers([]);
        return;
      }

      const [goalsRes, vouchersRes, snapshotRes] = await Promise.all([
        supabase
          .from("joint_goals")
          .select("*")
          .eq("space_id", activeSpace.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("vouchers")
          .select(
            "id, user_id, title, description, points_cost, icon, color, is_redeemed, redeemed_at, created_at, space_id, redeemed_by, updated_by_partner",
          )
          .eq("space_id", activeSpace.id)
          .order("created_at", { ascending: false }),
        supabase.rpc("get_partner_space_snapshot", {
          p_space_id: activeSpace.id,
        }),
      ]);

      if (goalsRes.error) throw goalsRes.error;
      if (vouchersRes.error) throw vouchersRes.error;

      setJointGoals((goalsRes.data as JointGoal[] | null) ?? []);
      setSharedVouchers((vouchersRes.data as Voucher[] | null) ?? []);
      setSnapshot((snapshotRes.data as PartnerSnapshot | null) ?? null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar Mochi Duo™",
      );
      setSpace(null);
      setOwnerProfile(null);
      setPartnerProfile(null);
      setSnapshot(null);
      setJointGoals([]);
      setSharedVouchers([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void loadSpace();
    }, [loadSpace]),
  );

  const displayOwner =
    ownerProfile?.full_name?.trim() || "Ella";
  const displayPartner =
    partnerProfile?.full_name?.trim() || "El";

  const summaryCards = useMemo(
    () => [
      {
        label: "Estudio",
        value: Math.round(((snapshot?.study_week ?? 0) / 3600) * 10) / 10,
        unit: "h",
      },
      { label: "Ejercicio", value: snapshot?.exercise_week ?? 0, unit: "rut" },
      { label: "Habitos", value: snapshot?.habits_week ?? 0, unit: "logs" },
      { label: "Cocina", value: snapshot?.cooking_week ?? 0, unit: "rec" },
    ],
    [snapshot],
  );

  const handleCreateGoal = async () => {
    if (!userId || !space) return;
    if (!goalTitle.trim()) {
      showAlert({
        title: "Falta el titulo",
        message: "Escribe un titulo para la meta compartida.",
        buttons: [{ text: "Entendido", style: "cancel" }],
      });
      return;
    }

    try {
      setSavingGoal(true);
      const { error: insertError } = await supabase.from("joint_goals").insert({
        space_id: space.id,
        title: goalTitle.trim(),
        description: goalDescription.trim() || null,
        color: "purple",
        progress: 0,
        is_completed: false,
        target_date: goalTargetDate.trim() || null,
        created_by: userId,
      });

      if (insertError) throw insertError;

      setGoalTitle("");
      setGoalDescription("");
      setGoalTargetDate("");
      setShowGoalModal(false);
      await loadSpace();
    } catch (err) {
      showAlert({
        title: "No se pudo crear",
        message:
          err instanceof Error
            ? err.message
            : "Intenta de nuevo en unos segundos.",
        buttons: [{ text: "Entendido", style: "cancel" }],
      });
    } finally {
      setSavingGoal(false);
    }
  };

  const handleToggleGoal = async (goal: JointGoal) => {
    try {
      const nextCompleted = !goal.is_completed;
      const nextProgress = nextCompleted ? 100 : 0;

      const { error: updateError } = await supabase
        .from("joint_goals")
        .update({ is_completed: nextCompleted, progress: nextProgress })
        .eq("id", goal.id);

      if (updateError) throw updateError;
      await loadSpace();
    } catch (err) {
      showAlert({
        title: "No se pudo actualizar",
        message:
          err instanceof Error
            ? err.message
            : "Intenta de nuevo en unos segundos.",
        buttons: [{ text: "Entendido", style: "cancel" }],
      });
    }
  };

  const handleRedeemVoucher = async (voucher: Voucher) => {
    if (!userId) return;
    if (voucher.is_redeemed) return;

    try {
      const { error: updateError } = await supabase
        .from("vouchers")
        .update({
          is_redeemed: true,
          redeemed_at: new Date().toISOString(),
          redeemed_by: userId,
          updated_by_partner: userId !== voucher.user_id,
        })
        .eq("id", voucher.id);

      if (updateError) throw updateError;
      await loadSpace();
    } catch (err) {
      showAlert({
        title: "No se pudo canjear",
        message:
          err instanceof Error
            ? err.message
            : "Intenta de nuevo en unos segundos.",
        buttons: [{ text: "Entendido", style: "cancel" }],
      });
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-emerald-50">
        <MochiCharacter mood="thinking" size={90} />
        <Text className="mt-4 text-sm font-semibold text-emerald-700">
          Cargando Mochi Duo™...
        </Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-emerald-50 px-6">
        <MochiCharacter mood="sleepy" size={80} />
        <Text className="mt-4 text-center text-sm font-semibold text-red-600">
          {error}
        </Text>
        <TouchableOpacity
          className="mt-6 rounded-2xl bg-emerald-500 px-6 py-3"
          onPress={() => void loadSpace()}
        >
          <Text className="font-bold text-white">Reintentar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!space) {
    return (
      <SafeAreaView className="flex-1 bg-emerald-50 px-6">
        <View className="mt-4">
          <TabHeader
            iconName="people"
            title="Mochi Duo™"
            subtitle="Crea un vinculo con tu pareja para compartir metas y vales"
            iconColor="#047857"
            titleClassName="text-2xl font-extrabold text-emerald-900"
            subtitleClassName="text-sm font-semibold text-emerald-700"
          />
        </View>

        <View className="mt-8 items-center rounded-3xl border-2 border-emerald-200 bg-white p-6">
          <MochiCharacter mood="happy" size={96} />
          <Text className="mt-4 text-center text-lg font-extrabold text-emerald-900">
            Mochi Duo™
          </Text>
          <Text className="mt-2 text-center text-sm font-semibold text-emerald-700">
            Crea un vinculo con tu pareja para compartir metas y vales.
          </Text>
          <TouchableOpacity
            className="mt-5 rounded-2xl bg-emerald-500 px-6 py-3"
            onPress={() => router.push("/mochi-duo-invite")}
          >
            <Text className="font-bold text-white">Crear o unirse</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (space.invite_status !== "accepted") {
    return (
      <SafeAreaView className="flex-1 bg-emerald-50 px-6">
        <View className="mt-4">
          <TabHeader
            iconName="people"
            title="Mochi Duo™"
            subtitle="Comparte este codigo con tu pareja para activar Mochi Duo™"
            iconColor="#047857"
            titleClassName="text-2xl font-extrabold text-emerald-900"
            subtitleClassName="text-sm font-semibold text-emerald-700"
          />
        </View>

        <View className="mt-8 rounded-3xl border-2 border-emerald-200 bg-white p-6">
          <Text className="text-lg font-extrabold text-emerald-900">
            Invitacion pendiente
          </Text>
          <Text className="mt-2 text-sm font-semibold text-emerald-700">
            Comparte este codigo con tu pareja para activar Mochi Duo™.
          </Text>
          <View className="mt-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3">
            <Text className="text-center text-2xl font-extrabold text-emerald-900">
              {space.invite_code}
            </Text>
          </View>
          <TouchableOpacity
            className="mt-4 rounded-2xl bg-emerald-500 py-3"
            onPress={() => router.push("/mochi-duo-invite")}
          >
            <Text className="text-center font-extrabold text-white">
              Gestionar invitacion
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView className="flex-1 bg-emerald-50">
        <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
          <View className="mt-4">
            <TabHeader
              iconName="people"
              title="Mochi Duo™"
              subtitle={`Espacio entre ${displayOwner} y ${displayPartner}`}
              iconColor="#047857"
              titleClassName="text-2xl font-extrabold text-emerald-900"
              subtitleClassName="text-sm font-semibold text-emerald-700"
            />
          </View>

          <View className="mt-6 rounded-3xl border-2 border-emerald-200 bg-white p-5">
            <Text className="text-lg font-extrabold text-emerald-900">
              Snapshot de ella
            </Text>
            <Text className="mt-2 text-sm font-semibold text-emerald-700">
              Fase del ciclo: {formatPhase(snapshot?.cycle_phase ?? null)}
            </Text>
            <Text className="mt-1 text-sm font-semibold text-emerald-700">
              Ultimo mood: {formatMood(snapshot?.mood_last ?? null)}
            </Text>

            <View className="mt-4 flex-row flex-wrap">
              {summaryCards.map((card) => (
                <View
                  key={card.label}
                  className="mb-3 w-1/2 pr-2"
                >
                  <View className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
                    <Text className="text-xs font-semibold text-emerald-600">
                      {card.label}
                    </Text>
                    <Text className="mt-1 text-lg font-extrabold text-emerald-900">
                      {card.value}
                    </Text>
                    <Text className="text-xs font-semibold text-emerald-700">
                      {card.unit}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View className="mt-6 rounded-3xl border-2 border-purple-200 bg-white p-5">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-extrabold text-purple-900">
                Metas compartidas
              </Text>
              <TouchableOpacity
                className="rounded-full bg-purple-100 px-3 py-1"
                onPress={() => setShowGoalModal(true)}
              >
                <Text className="text-xs font-extrabold text-purple-800">
                  Nueva meta
                </Text>
              </TouchableOpacity>
            </View>

            {jointGoals.length === 0 ? (
              <View className="mt-4 items-center rounded-2xl border border-purple-200 bg-purple-50 p-4">
                <MochiCharacter mood="happy" size={72} />
                <Text className="mt-3 text-center text-sm font-semibold text-purple-700">
                  Aun no hay metas compartidas
                </Text>
              </View>
            ) : (
              <View className="mt-4">
                {jointGoals.map((goal) => (
                  <TouchableOpacity
                    key={goal.id}
                    className="mb-3 rounded-2xl border border-purple-200 bg-purple-50 p-3"
                    onPress={() => void handleToggleGoal(goal)}
                  >
                    <Text className="text-sm font-extrabold text-purple-900">
                      {goal.title}
                    </Text>
                    {goal.description ? (
                      <Text className="mt-1 text-xs font-semibold text-purple-700">
                        {goal.description}
                      </Text>
                    ) : null}
                    <View className="mt-2 flex-row items-center justify-between">
                      <Text className="text-xs font-semibold text-purple-600">
                        {goal.is_completed ? "Completada" : "En progreso"}
                      </Text>
                      <View className="rounded-full bg-purple-200 px-3 py-1">
                        <Text className="text-xs font-extrabold text-purple-800">
                          {goal.progress}%
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View className="mt-6 rounded-3xl border-2 border-yellow-200 bg-white p-5">
            <Text className="text-lg font-extrabold text-yellow-900">
              Vales compartidos
            </Text>

            {sharedVouchers.length === 0 ? (
              <View className="mt-4 items-center rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
                <MochiCharacter mood="happy" size={72} />
                <Text className="mt-3 text-center text-sm font-semibold text-yellow-800">
                  No hay vales compartidos aun
                </Text>
              </View>
            ) : (
              <View className="mt-4">
                {sharedVouchers.map((voucher) => (
                  <TouchableOpacity
                    key={voucher.id}
                    className="mb-3 rounded-2xl border border-yellow-200 bg-yellow-50 p-3"
                    onPress={() => void handleRedeemVoucher(voucher)}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <Ionicons
                          name={(voucher.icon as keyof typeof Ionicons.glyphMap) || "ticket"}
                          size={16}
                          color="#92400e"
                        />
                        <Text className="ml-2 text-sm font-extrabold text-yellow-900">
                          {voucher.title}
                        </Text>
                      </View>
                      <View className="rounded-full bg-yellow-200 px-3 py-1">
                        <Text className="text-xs font-extrabold text-yellow-900">
                          {voucher.is_redeemed ? "Canjeado" : "Pendiente"}
                        </Text>
                      </View>
                    </View>
                    {voucher.description ? (
                      <Text className="mt-2 text-xs font-semibold text-yellow-700">
                        {voucher.description}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View className="h-10" />
        </ScrollView>
      </SafeAreaView>

      <Modal visible={showGoalModal} transparent animationType="slide">
        <View className="flex-1 bg-black/40 justify-end">
          <View className="rounded-t-3xl bg-white p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-extrabold text-purple-900">
                Nueva meta compartida
              </Text>
              <TouchableOpacity onPress={() => setShowGoalModal(false)}>
                <Ionicons name="close" size={22} color="#7c3aed" />
              </TouchableOpacity>
            </View>

            <View className="mt-4">
              <Text className="mb-2 text-sm font-semibold text-purple-800">
                Titulo
              </Text>
              <TextInput
                value={goalTitle}
                onChangeText={setGoalTitle}
                placeholder="Ej: Completar el curso de ingles"
                placeholderTextColor="#a855f7"
                className="rounded-2xl border-2 border-purple-200 bg-purple-50 px-4 py-3 text-sm font-semibold text-purple-900"
              />
            </View>

            <View className="mt-4">
              <Text className="mb-2 text-sm font-semibold text-purple-800">
                Descripcion (opcional)
              </Text>
              <TextInput
                value={goalDescription}
                onChangeText={setGoalDescription}
                placeholder="Describe el objetivo"
                placeholderTextColor="#a855f7"
                className="rounded-2xl border-2 border-purple-200 bg-purple-50 px-4 py-3 text-sm font-semibold text-purple-900"
              />
            </View>

            <View className="mt-4">
              <Text className="mb-2 text-sm font-semibold text-purple-800">
                Fecha objetivo (opcional)
              </Text>
              <TextInput
                value={goalTargetDate}
                onChangeText={setGoalTargetDate}
                placeholder="AAAA-MM-DD"
                placeholderTextColor="#a855f7"
                className="rounded-2xl border-2 border-purple-200 bg-purple-50 px-4 py-3 text-sm font-semibold text-purple-900"
              />
            </View>

            <TouchableOpacity
              className={`mt-5 rounded-2xl py-3 ${savingGoal ? "bg-purple-300" : "bg-purple-500"}`}
              onPress={() => {
                void handleCreateGoal();
              }}
              disabled={savingGoal}
            >
              {savingGoal ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-center font-extrabold text-white">
                  Guardar meta
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {AlertComponent}
    </>
  );
}

export default MochiDuoScreen;
