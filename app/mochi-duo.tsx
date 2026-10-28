import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Text, View } from "react-native";
import { useSession } from "@/src/core/providers/SessionContext";
import { ENERGY_LABEL } from "@/src/features/duo/partnerTips";
import { energyProfileFromPhase } from "@/src/shared/lib/ai";
import { reportError } from "@/src/shared/lib/observability/reportError";
import { supabase } from "@/src/shared/lib/supabase";
import { COLORS } from "@/src/shared/theme/tokens";
import {
  Button,
  Caption,
  ErrorState,
  IconTile,
  Input,
  ListGroup,
  ListRow,
  PressableScale,
  Screen,
  SectionHeader,
  Sheet,
  Stat,
  Surface,
  Toggle,
  haptic,
} from "@/src/shared/ui";

/** Lo que ella puede compartir. El ciclo se comparte como energía: él nunca ve la fase. */
const SHARE_OPTIONS: { key: string; label: string; description: string }[] = [
  {
    key: "cycle",
    label: "Mi energía",
    description: "Baja, media o alta según tu ciclo. Nunca la fase.",
  },
  { key: "mood", label: "Mi ánimo", description: "El último ánimo que registraste" },
  { key: "study", label: "Estudio", description: "Horas de estudio de la semana" },
  { key: "exercise", label: "Ejercicio", description: "Rutinas de la semana" },
  { key: "habits", label: "Hábitos", description: "Hábitos cumplidos en la semana" },
  { key: "cooking", label: "Cocina", description: "Recetas de la semana" },
];

const MOOD_WORD: Record<number, string> = {
  1: "Muy mal",
  2: "Mal",
  3: "Tranquila",
  4: "Contenta",
  5: "Feliz",
};

type Space = { id: string; ownerId: string; partnerId: string | null };
type Snapshot = {
  shared_fields?: Record<string, boolean>;
  cycle_phase: string | null;
  study_week: number | null;
  exercise_week: number | null;
  habits_week: number | null;
  mood_last: number | null;
  cooking_week: number | null;
};
type Goal = {
  id: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  target_date: string | null;
};

/** Ajustes de Duo: privacidad (ella), lo que ella comparte (él) y metas juntos. */
export function MochiDuoScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const [space, setSpace] = useState<Space | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalDescription, setGoalDescription] = useState("");
  const [goalDate, setGoalDate] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error: spaceError } = await supabase
        .from("partner_spaces")
        .select("id, owner_user_id, partner_user_id, invite_status")
        .or(`owner_user_id.eq.${userId},partner_user_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (spaceError) throw spaceError;
      if (!data || data.invite_status !== "accepted") {
        setSpace(null);
        return;
      }
      setSpace({ id: data.id, ownerId: data.owner_user_id, partnerId: data.partner_user_id });
      const [goalsRes, snapshotRes] = await Promise.all([
        supabase
          .from("joint_goals")
          .select("id, title, description, is_completed, target_date")
          .eq("space_id", data.id)
          .order("created_at", { ascending: false }),
        supabase.rpc("get_partner_space_snapshot", { p_space_id: data.id }),
      ]);
      if (goalsRes.error) throw goalsRes.error;
      setGoals((goalsRes.data ?? []) as Goal[]);
      setSnapshot((snapshotRes.data as Snapshot | null) ?? null);
      setError(false);
    } catch (e) {
      reportError(e, { scope: "duo-settings/load" });
      setError(true);
    } finally {
      setLoaded(true);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const isOwner = space?.ownerId === userId;
  const shared = snapshot?.shared_fields ?? {};

  const toggleShare = async (key: string, value: boolean) => {
    if (!space) return;
    setSnapshot((prev) =>
      prev ? { ...prev, shared_fields: { ...(prev.shared_fields ?? {}), [key]: value } } : prev,
    );
    const { error: prefsError } = await supabase.rpc("update_partner_space_prefs", {
      p_space_id: space.id,
      p_fields: { [key]: value },
    });
    if (prefsError) {
      Alert.alert("No se pudo guardar", prefsError.message);
      void load();
    }
  };

  const createGoal = async () => {
    if (!userId || !space || !goalTitle.trim()) return;
    if (goalDate && !/^\d{4}-\d{2}-\d{2}$/.test(goalDate.trim())) {
      Alert.alert("Fecha no válida", "Escríbela como año-mes-día, por ejemplo 2026-12-20.");
      return;
    }
    setSaving(true);
    try {
      const { error: insertError } = await supabase.from("joint_goals").insert({
        space_id: space.id,
        title: goalTitle.trim(),
        description: goalDescription.trim() || null,
        color: "purple",
        progress: 0,
        is_completed: false,
        target_date: goalDate.trim() || null,
        created_by: userId,
      });
      if (insertError) throw insertError;
      haptic("success");
      setGoalTitle("");
      setGoalDescription("");
      setGoalDate("");
      setGoalOpen(false);
      await load();
    } catch (e) {
      Alert.alert(
        "No se pudo crear",
        e instanceof Error ? e.message : "Intenta de nuevo en unos segundos.",
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleGoal = async (goal: Goal) => {
    const done = !goal.is_completed;
    setGoals((prev) => prev.map((g) => (g.id === goal.id ? { ...g, is_completed: done } : g)));
    if (done) haptic("success");
    const { error: updateError } = await supabase
      .from("joint_goals")
      .update({ is_completed: done, progress: done ? 100 : 0 })
      .eq("id", goal.id);
    if (updateError) {
      Alert.alert("No se pudo actualizar", updateError.message);
      void load();
    }
  };

  const close = (
    <PressableScale
      onPress={() => router.back()}
      accessibilityLabel="Volver"
      className="h-10 w-10 items-center justify-center rounded-full bg-surface-muted"
    >
      <Ionicons name="close" size={20} color={COLORS.inkMuted} />
    </PressableScale>
  );

  if (loaded && !space) {
    return (
      <Screen title="Ajustes de Duo" withTabBar={false} headerRight={close}>
        {error ? <ErrorState message="No pudimos cargar Duo." onRetry={() => void load()} /> : null}
        <Caption className="mt-4">Todavía no tienes un espacio Duo activo.</Caption>
        <View className="mt-4">
          <Button title="Invitar a mi pareja" onPress={() => router.push("/mochi-duo-invite")} />
        </View>
      </Screen>
    );
  }

  const energy =
    !isOwner && shared.cycle ? energyProfileFromPhase(snapshot?.cycle_phase) : undefined;
  const stats = [
    {
      key: "study",
      value: `${Math.round(((snapshot?.study_week ?? 0) / 3600) * 10) / 10} h`,
      label: "de estudio",
    },
    { key: "exercise", value: String(snapshot?.exercise_week ?? 0), label: "rutinas" },
    { key: "habits", value: String(snapshot?.habits_week ?? 0), label: "hábitos" },
    { key: "cooking", value: String(snapshot?.cooking_week ?? 0), label: "recetas" },
  ].filter((s) => shared[s.key]);

  return (
    <Screen title="Ajustes de Duo" withTabBar={false} headerRight={close}>
      {isOwner ? (
        <>
          <SectionHeader title="Qué compartes" />
          <Surface className="px-4 py-1">
            {SHARE_OPTIONS.map((option) => (
              <Toggle
                key={option.key}
                label={option.label}
                description={option.description}
                value={Boolean(shared[option.key])}
                onValueChange={(value) => void toggleShare(option.key, value)}
              />
            ))}
          </Surface>
          <Caption className="ml-1 mt-2">
            Tu pareja solo ve lo que actives, y puedes cambiarlo cuando quieras.
          </Caption>
        </>
      ) : (
        <>
          <SectionHeader title="Lo que comparte contigo" />
          {Object.values(shared).every((v) => !v) ? (
            <Surface tone="sunken" className="p-4">
              <Caption>Por ahora no comparte nada. Ella decide qué mostrarte.</Caption>
            </Surface>
          ) : (
            <Surface className="p-4">
              {energy ? (
                <Text className="font-body-extrabold text-[15px] text-ink">
                  {ENERGY_LABEL[energy]}
                </Text>
              ) : null}
              {shared.mood && snapshot?.mood_last ? (
                <Caption className="mt-0.5">
                  Ánimo: {MOOD_WORD[snapshot.mood_last] ?? "Sin registro"}
                </Caption>
              ) : null}
              {stats.length > 0 ? (
                <View className="mt-3 flex-row flex-wrap justify-between gap-y-3">
                  {stats.map((s) => (
                    <Stat
                      key={s.key}
                      className="w-[47%]"
                      value={s.value}
                      label={`${s.label} esta semana`}
                    />
                  ))}
                </View>
              ) : null}
            </Surface>
          )}
        </>
      )}

      <SectionHeader title="Metas juntos" actionLabel="Nueva" onAction={() => setGoalOpen(true)} />
      {goals.length > 0 ? (
        <ListGroup>
          {goals.map((goal) => (
            <ListRow
              key={goal.id}
              title={goal.title}
              subtitle={
                goal.is_completed
                  ? "¡Lo lograron!"
                  : (goal.description ?? goal.target_date ?? "En camino")
              }
              leading={
                goal.is_completed ? (
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-tint-ok">
                    <Ionicons name="checkmark" size={20} color={COLORS.positive} />
                  </View>
                ) : (
                  <IconTile icon="flag" tint="duo" />
                )
              }
              onPress={() => void toggleGoal(goal)}
              accessibilityLabel={`${goal.title}. ${goal.is_completed ? "Cumplida, toca para reabrir" : "Toca para marcar como cumplida"}`}
            />
          ))}
        </ListGroup>
      ) : (
        <Surface tone="sunken" className="p-4">
          <Caption>Una meta para los dos: un viaje, ahorrar algo, una costumbre nueva.</Caption>
        </Surface>
      )}

      <Sheet
        visible={goalOpen}
        onClose={() => !saving && setGoalOpen(false)}
        title="Nueva meta juntos"
      >
        <Input
          label="¿Qué quieren lograr?"
          value={goalTitle}
          onChangeText={setGoalTitle}
          placeholder="Viaje a Baños"
          maxLength={80}
        />
        <Input
          label="Detalle (opcional)"
          value={goalDescription}
          onChangeText={setGoalDescription}
          placeholder="Ahorrar 300 dólares"
          multiline
        />
        <Input
          label="Fecha (opcional, año-mes-día)"
          value={goalDate}
          onChangeText={setGoalDate}
          placeholder="2026-12-20"
          keyboardType="numbers-and-punctuation"
          maxLength={10}
        />
        <Button
          title="Crear meta"
          loading={saving}
          disabled={!goalTitle.trim()}
          onPress={() => void createGoal()}
        />
      </Sheet>
    </Screen>
  );
}

export default MochiDuoScreen;
