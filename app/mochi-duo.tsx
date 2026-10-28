import { tc } from "@/src/shared/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "@/src/core/providers/SessionContext";
import { PartnerVoucherModal } from "@/src/features/duo/PartnerVoucherModal";
import { VoucherImage } from "@/src/features/duo/VoucherImage";
import { Button } from "@/src/shared/ui";
import { useCustomAlert } from "@/src/shared/components/CustomAlert";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { TabHeader } from "@/src/shared/components/TabHeader";
import { supabase } from "@/src/shared/lib/supabase";
import type { JointGoal, PartnerSpace, Voucher } from "@/src/shared/types/database";

type PartnerSnapshot = {
  shared_fields?: Record<string, boolean>;
  cycle_phase: string | null;
  study_week: number | null;
  exercise_week: number | null;
  habits_week: number | null;
  mood_last: number | null;
  cooking_week: number | null;
};

const SHARE_OPTIONS: { key: string; label: string }[] = [
  { key: "cycle", label: "Fase del ciclo" },
  { key: "mood", label: "Ánimo" },
  { key: "study", label: "Estudio" },
  { key: "exercise", label: "Ejercicio" },
  { key: "habits", label: "Hábitos" },
  { key: "cooking", label: "Cocina" },
];

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
  const [showVoucherModal, setShowVoucherModal] = useState(false);
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

      const profileIds = [activeSpace.owner_user_id, activeSpace.partner_user_id].filter(
        (id): id is string => Boolean(id),
      );

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, mochi_name")
        .in("id", profileIds);

      const profiles = (profilesData as DuoProfile[] | null) ?? [];
      setOwnerProfile(profiles.find((profile) => profile.id === activeSpace.owner_user_id) ?? null);
      setPartnerProfile(
        profiles.find((profile) => profile.id === activeSpace.partner_user_id) ?? null,
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
            "id, user_id, title, description, points_cost, icon, color, is_redeemed, redeemed_at, created_at, space_id, redeemed_by, updated_by_partner, created_by, mode, image_url",
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
      setError(err instanceof Error ? err.message : "No se pudo cargar Mochi Duo™");
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

  const displayOwner = ownerProfile?.full_name?.trim() || "Ella";
  const displayPartner = partnerProfile?.full_name?.trim() || "El";

  const summaryCards = useMemo(() => {
    const shared = snapshot?.shared_fields ?? {};
    const cards = [
      {
        key: "study",
        label: "Estudio",
        value: Math.round(((snapshot?.study_week ?? 0) / 3600) * 10) / 10,
        unit: "h",
      },
      { key: "exercise", label: "Ejercicio", value: snapshot?.exercise_week ?? 0, unit: "rut" },
      { key: "habits", label: "Habitos", value: snapshot?.habits_week ?? 0, unit: "logs" },
      { key: "cooking", label: "Cocina", value: snapshot?.cooking_week ?? 0, unit: "rec" },
    ];
    return cards.filter((card) => shared[card.key]);
  }, [snapshot]);

  const handleToggleShare = async (key: string, value: boolean) => {
    if (!space) return;
    const { error: prefsError } = await supabase.rpc("update_partner_space_prefs", {
      p_space_id: space.id,
      p_fields: { [key]: value },
    });
    if (prefsError) {
      showAlert({
        title: "No se pudo guardar",
        message: prefsError.message,
        buttons: [{ text: "Entendido", style: "cancel" }],
      });
      return;
    }
    await loadSpace();
  };

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
        message: err instanceof Error ? err.message : "Intenta de nuevo en unos segundos.",
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
        message: err instanceof Error ? err.message : "Intenta de nuevo en unos segundos.",
        buttons: [{ text: "Entendido", style: "cancel" }],
      });
    }
  };

  const handleRedeemVoucher = async (voucher: Voucher) => {
    if (!userId) return;
    if (voucher.is_redeemed) return;

    try {
      const { error: updateError } = await supabase.rpc("redeem_voucher", {
        p_voucher_id: voucher.id,
      });

      if (updateError) throw updateError;
      await loadSpace();
    } catch (err) {
      showAlert({
        title: "No se pudo canjear",
        message: err instanceof Error ? err.message : "Intenta de nuevo en unos segundos.",
        buttons: [{ text: "Entendido", style: "cancel" }],
      });
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-emerald-50 dark:bg-emerald-950">
        <MochiCharacter mood="thinking" size={90} />
        <Text className="mt-4 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          Cargando Mochi Duo™...
        </Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-emerald-50 px-6 dark:bg-emerald-950">
        <MochiCharacter mood="sleepy" size={80} />
        <Text className="mt-4 text-center text-sm font-semibold text-red-600 dark:text-red-400">
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
      <SafeAreaView className="flex-1 bg-emerald-50 px-6 dark:bg-emerald-950">
        <View className="mt-4">
          <TabHeader
            iconName="people"
            title="Mochi Duo™"
            subtitle="Crea un vinculo con tu pareja para compartir metas y vales"
            iconColor={tc("#047857")}
            titleClassName="text-2xl font-extrabold text-emerald-900 dark:text-emerald-100"
            subtitleClassName="text-sm font-semibold text-emerald-700 dark:text-emerald-300"
          />
        </View>

        <View className="mt-8 items-center rounded-3xl border-2 border-emerald-200 bg-white p-6 dark:border-emerald-800 dark:bg-surface">
          <MochiCharacter mood="happy" size={96} />
          <Text className="mt-4 text-center text-lg font-extrabold text-emerald-900 dark:text-emerald-100">
            Mochi Duo™
          </Text>
          <Text className="mt-2 text-center text-sm font-semibold text-emerald-700 dark:text-emerald-300">
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
      <SafeAreaView className="flex-1 bg-emerald-50 px-6 dark:bg-emerald-950">
        <View className="mt-4">
          <TabHeader
            iconName="people"
            title="Mochi Duo™"
            subtitle="Comparte este codigo con tu pareja para activar Mochi Duo™"
            iconColor={tc("#047857")}
            titleClassName="text-2xl font-extrabold text-emerald-900 dark:text-emerald-100"
            subtitleClassName="text-sm font-semibold text-emerald-700 dark:text-emerald-300"
          />
        </View>

        <View className="mt-8 rounded-3xl border-2 border-emerald-200 bg-white p-6 dark:border-emerald-800 dark:bg-surface">
          <Text className="text-lg font-extrabold text-emerald-900 dark:text-emerald-100">
            Invitacion pendiente
          </Text>
          <Text className="mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            Comparte este codigo con tu pareja para activar Mochi Duo™.
          </Text>
          <View className="mt-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-950">
            <Text className="text-center text-2xl font-extrabold text-emerald-900 dark:text-emerald-100">
              {space.invite_code}
            </Text>
          </View>
          <TouchableOpacity
            className="mt-4 rounded-2xl bg-emerald-500 py-3"
            onPress={() => router.push("/mochi-duo-invite")}
          >
            <Text className="text-center font-extrabold text-white">Gestionar invitacion</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView className="flex-1 bg-emerald-50 dark:bg-emerald-950">
        <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
          <View className="mt-4">
            <TabHeader
              iconName="people"
              title="Mochi Duo™"
              subtitle={`Espacio entre ${displayOwner} y ${displayPartner}`}
              iconColor={tc("#047857")}
              titleClassName="text-2xl font-extrabold text-emerald-900 dark:text-emerald-100"
              subtitleClassName="text-sm font-semibold text-emerald-700 dark:text-emerald-300"
            />
          </View>

          {isOwner ? (
            <View className="mt-6 rounded-3xl border-2 border-emerald-200 bg-white p-5 dark:border-emerald-800 dark:bg-surface">
              <Text className="text-lg font-extrabold text-emerald-900 dark:text-emerald-100">
                Qué compartes con tu pareja
              </Text>
              <Text className="mt-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                Todo está apagado hasta que tú lo actives. El ciclo requiere activar antes
                "Privacidad de tu ciclo" en Ajustes.
              </Text>
              {SHARE_OPTIONS.map((option) => (
                <View key={option.key} className="mt-3 flex-row items-center justify-between">
                  <Text className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                    {option.label}
                  </Text>
                  <Switch
                    accessibilityLabel={`Compartir ${option.label}`}
                    value={Boolean(space?.shared_fields?.[option.key])}
                    onValueChange={(value) => void handleToggleShare(option.key, value)}
                  />
                </View>
              ))}
            </View>
          ) : null}

          <View className="mt-6 rounded-3xl border-2 border-emerald-200 bg-white p-5 dark:border-emerald-800 dark:bg-surface">
            <Text className="text-lg font-extrabold text-emerald-900 dark:text-emerald-100">
              Snapshot de ella
            </Text>
            {snapshot?.shared_fields?.cycle ? (
              <Text className="mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                Fase del ciclo: {formatPhase(snapshot?.cycle_phase ?? null)}
              </Text>
            ) : null}
            {snapshot?.shared_fields?.mood ? (
              <Text className="mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                Ultimo mood: {formatMood(snapshot?.mood_last ?? null)}
              </Text>
            ) : null}
            {!isOwner && Object.values(snapshot?.shared_fields ?? {}).every((v) => !v) ? (
              <Text className="mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                Ella aún no ha elegido qué compartir contigo.
              </Text>
            ) : null}

            <View className="mt-4 flex-row flex-wrap">
              {summaryCards.map((card) => (
                <View key={card.label} className="mb-3 w-1/2 pr-2">
                  <View className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950">
                    <Text className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      {card.label}
                    </Text>
                    <Text className="mt-1 text-lg font-extrabold text-emerald-900 dark:text-emerald-100">
                      {card.value}
                    </Text>
                    <Text className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      {card.unit}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View className="mt-6 rounded-3xl border-2 border-purple-200 bg-white p-5 dark:border-purple-800 dark:bg-surface">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-extrabold text-purple-900 dark:text-purple-100">
                Metas compartidas
              </Text>
              <TouchableOpacity
                className="rounded-full bg-purple-100 px-3 py-1 dark:bg-purple-900"
                onPress={() => setShowGoalModal(true)}
              >
                <Text className="text-xs font-extrabold text-purple-800 dark:text-purple-200">
                  Nueva meta
                </Text>
              </TouchableOpacity>
            </View>

            {jointGoals.length === 0 ? (
              <View className="mt-4 items-center rounded-2xl border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-950">
                <MochiCharacter mood="happy" size={72} />
                <Text className="mt-3 text-center text-sm font-semibold text-purple-700 dark:text-purple-300">
                  Aun no hay metas compartidas
                </Text>
              </View>
            ) : (
              <View className="mt-4">
                {jointGoals.map((goal) => (
                  <TouchableOpacity
                    key={goal.id}
                    className="mb-3 rounded-2xl border border-purple-200 bg-purple-50 p-3 dark:border-purple-800 dark:bg-purple-950"
                    onPress={() => void handleToggleGoal(goal)}
                  >
                    <Text className="text-sm font-extrabold text-purple-900 dark:text-purple-100">
                      {goal.title}
                    </Text>
                    {goal.description ? (
                      <Text className="mt-1 text-xs font-semibold text-purple-700 dark:text-purple-300">
                        {goal.description}
                      </Text>
                    ) : null}
                    <View className="mt-2 flex-row items-center justify-between">
                      <Text className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                        {goal.is_completed ? "Completada" : "En progreso"}
                      </Text>
                      <View className="rounded-full bg-purple-200 px-3 py-1 dark:bg-purple-800">
                        <Text className="text-xs font-extrabold text-purple-800 dark:text-purple-200">
                          {goal.progress}%
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View className="mt-6 rounded-3xl border-2 border-yellow-200 bg-white p-5 dark:border-yellow-800 dark:bg-surface">
            <Text className="text-lg font-extrabold text-yellow-900 dark:text-yellow-100">
              Vales compartidos
            </Text>
            {!isOwner && space ? (
              <View className="mt-3">
                <Button title="Crear un vale para ella" onPress={() => setShowVoucherModal(true)} />
              </View>
            ) : null}

            {sharedVouchers.length === 0 ? (
              <View className="mt-4 items-center rounded-2xl border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-950">
                <MochiCharacter mood="happy" size={72} />
                <Text className="mt-3 text-center text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                  No hay vales compartidos aun
                </Text>
              </View>
            ) : (
              <View className="mt-4">
                {sharedVouchers.map((voucher) => (
                  <TouchableOpacity
                    key={voucher.id}
                    className="mb-3 rounded-2xl border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950"
                    onPress={() => void handleRedeemVoucher(voucher)}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <Ionicons
                          name={(voucher.icon as keyof typeof Ionicons.glyphMap) || "ticket"}
                          size={16}
                          color={tc("#92400e")}
                        />
                        <Text className="ml-2 text-sm font-extrabold text-yellow-900 dark:text-yellow-100">
                          {voucher.title}
                        </Text>
                      </View>
                      <View className="rounded-full bg-yellow-200 px-3 py-1 dark:bg-yellow-800">
                        <Text className="text-xs font-extrabold text-yellow-900 dark:text-yellow-100">
                          {voucher.is_redeemed
                            ? "Canjeado"
                            : voucher.mode === "gift"
                              ? "Regalo"
                              : voucher.mode === "points"
                                ? `${voucher.points_cost} pts`
                                : "Pendiente"}
                        </Text>
                      </View>
                    </View>
                    {voucher.description ? (
                      <Text className="mt-2 text-xs font-semibold text-yellow-700 dark:text-yellow-300">
                        {voucher.description}
                      </Text>
                    ) : null}
                    <VoucherImage path={voucher.image_url} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View className="h-10" />
        </ScrollView>
      </SafeAreaView>

      {space ? (
        <PartnerVoucherModal
          visible={showVoucherModal}
          spaceId={space.id}
          onClose={() => setShowVoucherModal(false)}
          onCreated={() => void loadSpace()}
        />
      ) : null}

      <Modal visible={showGoalModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <View className="flex-1 justify-end bg-black/40">
            <View className="max-h-96 rounded-t-3xl bg-white p-4 dark:bg-surface">
              <View className="mb-4 flex-row items-center justify-between">
                <Text className="text-lg font-extrabold text-purple-900 dark:text-purple-100">
                  Nueva meta compartida
                </Text>
                <TouchableOpacity onPress={() => setShowGoalModal(false)}>
                  <Ionicons name="close" size={22} color={tc("#7c3aed")} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="mt-4">
                  <Text className="mb-2 text-sm font-semibold text-purple-800 dark:text-purple-200">
                    Titulo
                  </Text>
                  <TextInput
                    value={goalTitle}
                    onChangeText={setGoalTitle}
                    placeholder="Ej: Completar el curso de ingles"
                    placeholderTextColor={tc("#a855f7")}
                    className="rounded-2xl border-2 border-purple-200 bg-purple-50 px-4 py-3 text-sm font-semibold text-purple-900 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-100"
                  />
                </View>

                <View className="mt-4">
                  <Text className="mb-2 text-sm font-semibold text-purple-800 dark:text-purple-200">
                    Descripcion (opcional)
                  </Text>
                  <TextInput
                    value={goalDescription}
                    onChangeText={setGoalDescription}
                    placeholder="Describe el objetivo"
                    placeholderTextColor={tc("#a855f7")}
                    className="rounded-2xl border-2 border-purple-200 bg-purple-50 px-4 py-3 text-sm font-semibold text-purple-900 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-100"
                  />
                </View>

                <View className="mt-4">
                  <Text className="mb-2 text-sm font-semibold text-purple-800 dark:text-purple-200">
                    Fecha objetivo (opcional)
                  </Text>
                  <TextInput
                    value={goalTargetDate}
                    onChangeText={setGoalTargetDate}
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor={tc("#a855f7")}
                    className="rounded-2xl border-2 border-purple-200 bg-purple-50 px-4 py-3 text-sm font-semibold text-purple-900 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-100"
                  />
                </View>

                <TouchableOpacity
                  className={`mt-5 rounded-2xl py-3 ${savingGoal ? "bg-purple-300 dark:bg-purple-700" : "bg-purple-500"}`}
                  onPress={() => {
                    void handleCreateGoal();
                  }}
                  disabled={savingGoal}
                >
                  {savingGoal ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-center font-extrabold text-white">Guardar meta</Text>
                  )}
                </TouchableOpacity>

                <View className="h-4" />
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {AlertComponent}
    </>
  );
}

export default MochiDuoScreen;
