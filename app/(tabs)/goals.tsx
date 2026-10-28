import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Alert, Text, View } from "react-native";
import { useSession } from "@/src/core/providers/SessionContext";
import {
  createGoal,
  deleteGoal,
  fetchGoals,
  updateGoal,
  type GoalDraft,
  type GoalItem,
} from "@/src/features/goals/api";
import { daysUntil } from "@/src/features/study/api";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { addPoints } from "@/src/shared/lib/gamification";
import { reportError } from "@/src/shared/lib/observability/reportError";
import type { MochiHandle } from "@/src/shared/mochi/MochiCanvas";
import { COLORS } from "@/src/shared/theme/tokens";
import {
  ACCENT_GLOW,
  Button,
  Caption,
  Chip,
  ErrorState,
  Input,
  ListGroup,
  ListRow,
  MochiBubble,
  PressableScale,
  ProgressRing,
  Screen,
  SectionHeader,
  Sheet,
  haptic,
} from "@/src/shared/ui";

const STEPS = [0, 25, 50, 75, 100];
const EMPTY: GoalDraft = { title: "", description: "", targetDate: "", progress: 0 };

function dueLabel(date: string | null): string {
  if (!date) return "Sin fecha";
  const days = daysUntil(date);
  if (days < 0) return "Ya pasó la fecha";
  if (days === 0) return "Es para hoy";
  if (days === 1) return "Para mañana";
  return `Faltan ${days} días`;
}

export function GoalsScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const [goals, setGoals] = useState<GoalItem[] | null>(null);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState<GoalItem | "new" | null>(null);
  const [draft, setDraft] = useState<GoalDraft>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [celebrated, setCelebrated] = useState<string | null>(null);
  const mochi = useRef<MochiHandle>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      setGoals(await fetchGoals(userId));
      setError(false);
    } catch (e) {
      reportError(e, { scope: "goals/load" });
      setError(true);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const open = (goal: GoalItem | "new") => {
    setDraft(
      goal === "new"
        ? EMPTY
        : {
            title: goal.title,
            description: goal.description ?? "",
            targetDate: goal.targetDate ?? "",
            progress: goal.progress,
          },
    );
    setEditing(goal);
  };

  const save = async () => {
    if (!userId || !editing || !draft.title.trim()) return;
    if (draft.targetDate && !/^\d{4}-\d{2}-\d{2}$/.test(draft.targetDate.trim())) {
      Alert.alert("Fecha no válida", "Escríbela como año-mes-día, por ejemplo 2026-12-20.");
      return;
    }
    setSaving(true);
    try {
      if (editing === "new") {
        await createGoal(userId, draft);
        haptic("success");
      } else if (await updateGoal(userId, editing, draft)) {
        await addPoints(userId, "goal_completed");
        haptic("success");
        setCelebrated(draft.title.trim());
        mochi.current?.react("celebrate");
      } else {
        haptic("light");
      }
      setEditing(null);
      await load();
    } catch (e) {
      reportError(e, { scope: "goals/save" });
      Alert.alert("No se pudo guardar", "Intenta de nuevo en un momento.");
    } finally {
      setSaving(false);
    }
  };

  const remove = (goal: GoalItem) => {
    haptic("warning");
    Alert.alert("Eliminar meta", `¿Eliminar «${goal.title}»? No se puede deshacer.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => {
          if (!userId) return;
          void deleteGoal(userId, goal.id)
            .then(() => {
              setEditing(null);
              return load();
            })
            .catch((e) => reportError(e, { scope: "goals/delete" }));
        },
      },
    ]);
  };

  const active = goals?.filter((g) => !g.completed) ?? [];
  const done = goals?.filter((g) => g.completed) ?? [];

  return (
    <Screen
      title="Metas"
      headerRight={
        <PressableScale
          onPress={() => open("new")}
          accessibilityLabel="Nueva meta"
          className="h-11 w-11 items-center justify-center rounded-2xl bg-accent"
          style={ACCENT_GLOW}
        >
          <Ionicons name="add" size={26} color={COLORS.accentInk} />
        </PressableScale>
      }
    >
      {error && !goals ? (
        <ErrorState message="No pudimos cargar tus metas." onRetry={() => void load()} />
      ) : null}

      <View className="mt-2 flex-row items-end gap-2.5">
        <MochiCharacter
          ref={mochi}
          expression={celebrated ? "celebrating" : active.length > 0 ? "focused" : "happy"}
          size={96}
          interactive
        />
        <MochiBubble
          className="flex-1"
          tail="left"
          text={
            celebrated
              ? `¡Cumpliste «${celebrated}»! Estoy muy orgullosa de ti.`
              : active.length > 0
                ? "Paso a paso. Toca una meta para anotar cuánto avanzaste."
                : "¿Qué te gustaría lograr? Empieza con algo que te ilusione."
          }
        />
      </View>

      {goals && active.length === 0 && done.length === 0 ? (
        <View className="mt-5">
          <Button title="Crear mi primera meta" onPress={() => open("new")} />
        </View>
      ) : null}

      {active.length > 0 ? (
        <>
          <SectionHeader title="En camino" />
          <ListGroup>
            {active.map((g) => (
              <ListRow
                key={g.id}
                title={g.title}
                subtitle={dueLabel(g.targetDate)}
                leading={
                  <ProgressRing
                    progress={g.progress / 100}
                    size={44}
                    color={COLORS.accent}
                    accessibilityLabel={`${g.progress}%`}
                  >
                    <Text className="font-body-extrabold text-[10px] text-ink">{g.progress}%</Text>
                  </ProgressRing>
                }
                onPress={() => open(g)}
              />
            ))}
          </ListGroup>
        </>
      ) : null}

      {done.length > 0 ? (
        <>
          <SectionHeader title="Cumplidas" />
          <ListGroup>
            {done.map((g) => (
              <ListRow
                key={g.id}
                title={g.title}
                subtitle="¡Lo lograste!"
                leading={
                  <View className="h-11 w-11 items-center justify-center rounded-full bg-tint-ok">
                    <Ionicons name="checkmark" size={22} color={COLORS.positive} />
                  </View>
                }
                onPress={() => open(g)}
              />
            ))}
          </ListGroup>
        </>
      ) : null}

      <Sheet
        visible={editing !== null}
        onClose={() => !saving && setEditing(null)}
        title={editing === "new" ? "Nueva meta" : "Tu meta"}
      >
        <Input
          label="¿Qué quieres lograr?"
          value={draft.title}
          onChangeText={(title) => setDraft((d) => ({ ...d, title }))}
          placeholder="Aprobar Biología con 9"
          maxLength={80}
        />
        <Input
          label="Fecha (opcional, año-mes-día)"
          value={draft.targetDate}
          onChangeText={(targetDate) => setDraft((d) => ({ ...d, targetDate }))}
          placeholder="2026-12-20"
          keyboardType="numbers-and-punctuation"
          maxLength={10}
        />
        {editing !== "new" ? (
          <>
            <Text className="mb-2 ml-1 font-body-bold text-sm text-ink">¿Cuánto avanzaste?</Text>
            <View className="mb-4 flex-row flex-wrap gap-2">
              {STEPS.map((step) => (
                <Chip
                  key={step}
                  label={step === 100 ? "¡Cumplida!" : `${step}%`}
                  selected={draft.progress === step}
                  onSurface
                  onPress={() => setDraft((d) => ({ ...d, progress: step }))}
                />
              ))}
            </View>
          </>
        ) : null}
        <Button
          title="Guardar"
          loading={saving}
          disabled={!draft.title.trim()}
          onPress={() => void save()}
        />
        {editing && editing !== "new" ? (
          <View className="mt-1">
            <Button title="Eliminar meta" variant="ghost" onPress={() => remove(editing)} />
          </View>
        ) : null}
        {editing === "new" ? (
          <Caption className="mt-2 text-center">Sumas puntos cuando la cumples.</Caption>
        ) : null}
      </Sheet>
    </Screen>
  );
}

export default GoalsScreen;
