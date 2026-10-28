import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Alert, Text, View } from "react-native";
import { useSession } from "@/src/core/providers/SessionContext";
import {
  createHabit,
  deleteHabit,
  fetchHabits,
  last7Days,
  setHabitDone,
  setHabitReminder,
  type HabitItem,
  type HabitsData,
} from "@/src/features/habits/api";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { useCycleRecommendation } from "@/src/shared/hooks/useCycleRecommendation";
import {
  cancelHabitReminder,
  loadNotificationPrefs,
  removeHabitNotificationPreference,
  saveHabitNotificationEnabled,
  scheduleHabitReminderForHabit,
} from "@/src/shared/lib/notifications";
import { reportError } from "@/src/shared/lib/observability/reportError";
import type { MochiHandle } from "@/src/shared/mochi/MochiCanvas";
import { COLORS } from "@/src/shared/theme/tokens";
import {
  ACCENT_GLOW,
  Button,
  Caption,
  Chip,
  ELEVATION,
  ErrorState,
  Input,
  MochiBubble,
  PressableScale,
  Screen,
  SectionHeader,
  Sheet,
  Skeleton,
  Strong,
  Surface,
  Title,
  haptic,
} from "@/src/shared/ui";

const ICONS = ["leaf", "water", "book", "heart", "fitness", "moon", "walk", "cafe"] as const;
const ICON_LABEL: Record<(typeof ICONS)[number], string> = {
  leaf: "Bienestar",
  water: "Agua",
  book: "Leer",
  heart: "Cuidarme",
  fitness: "Ejercicio",
  moon: "Dormir",
  walk: "Caminar",
  cafe: "Pausa",
};
const DAY_LETTER = ["D", "L", "M", "X", "J", "V", "S"];

export function HabitsScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { tip } = useCycleRecommendation("habit");
  const [data, setData] = useState<HabitsData | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<(typeof ICONS)[number]>("leaf");
  const [saving, setSaving] = useState(false);
  const mochi = useRef<MochiHandle>(null);
  const days = useMemo(() => last7Days(), []);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      setData(await fetchHabits(userId));
      setError(false);
    } catch (e) {
      reportError(e, { scope: "habits/load" });
      setError(true);
    } finally {
      setRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const total = data?.habits.length ?? 0;
  const done = data?.doneToday.size ?? 0;
  const allDone = total > 0 && done === total;

  const toggle = (habit: HabitItem) => {
    if (!userId || !data) return;
    const next = !data.doneToday.has(habit.id);
    const doneToday = new Set(data.doneToday);
    if (next) doneToday.add(habit.id);
    else doneToday.delete(habit.id);
    setData({ ...data, doneToday });
    if (next) {
      haptic("success");
      mochi.current?.react(doneToday.size === total ? "celebrate" : "nod");
    } else {
      haptic("selection");
    }
    setHabitDone(userId, habit.id, next).catch((e) => {
      reportError(e, { scope: "habits/toggle" });
      void load();
    });
  };

  const create = async () => {
    if (!userId || !name.trim()) return;
    setSaving(true);
    try {
      const habit = await createHabit(userId, name.trim(), icon);
      await saveHabitNotificationEnabled(habit.id, true);
      const prefs = await loadNotificationPrefs();
      if (prefs.enabled && prefs.habitEnabled)
        await scheduleHabitReminderForHabit(habit, prefs.habitTime);
      haptic("success");
      setName("");
      setIcon("leaf");
      setCreateOpen(false);
      await load();
    } catch (e) {
      reportError(e, { scope: "habits/create" });
      Alert.alert("No se pudo crear", "Intenta de nuevo en un momento.");
    } finally {
      setSaving(false);
    }
  };

  const toggleReminder = async (habit: HabitItem) => {
    if (!data) return;
    const enabled = !habit.reminderEnabled;
    setData({
      ...data,
      habits: data.habits.map((h) => (h.id === habit.id ? { ...h, reminderEnabled: enabled } : h)),
    });
    haptic("selection");
    try {
      await setHabitReminder(habit.id, enabled);
      await saveHabitNotificationEnabled(habit.id, enabled);
      const prefs = await loadNotificationPrefs();
      if (!prefs.enabled || !prefs.habitEnabled) return;
      if (enabled)
        await scheduleHabitReminderForHabit({ id: habit.id, name: habit.name }, prefs.habitTime);
      else await cancelHabitReminder(habit.id);
    } catch (e) {
      reportError(e, { scope: "habits/reminder" });
      void load();
    }
  };

  const askDelete = (habit: HabitItem) => {
    haptic("warning");
    Alert.alert("Eliminar hábito", `¿Eliminar «${habit.name}» y su historial?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => {
          if (!userId) return;
          void deleteHabit(userId, habit.id)
            .then(async () => {
              await cancelHabitReminder(habit.id);
              await removeHabitNotificationPreference(habit.id);
              await load();
            })
            .catch((e) => reportError(e, { scope: "habits/delete" }));
        },
      },
    ]);
  };

  return (
    <Screen
      title="Hábitos"
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        void load();
      }}
      headerRight={
        <PressableScale
          onPress={() => setCreateOpen(true)}
          accessibilityLabel="Nuevo hábito"
          className="h-11 w-11 items-center justify-center rounded-2xl bg-accent"
          style={ACCENT_GLOW}
        >
          <Ionicons name="add" size={26} color={COLORS.accentInk} />
        </PressableScale>
      }
    >
      {error && !data ? (
        <ErrorState message="No pudimos cargar tus hábitos." onRetry={() => void load()} />
      ) : null}
      {!data && !error ? (
        <View className="mt-4 gap-3">
          <Skeleton height={110} className="rounded-card" />
          <Skeleton height={180} className="rounded-card" />
        </View>
      ) : null}

      {data && total === 0 ? (
        <View className="mt-6 items-center">
          <MochiCharacter expression="happy" size={160} interactive />
          <MochiBubble
            className="mt-2 self-stretch"
            text="Empieza con un hábito pequeño que puedas cumplir hoy. Yo te acompaño."
          >
            <View className="mt-3">
              <Button title="Crear mi primer hábito" onPress={() => setCreateOpen(true)} />
            </View>
          </MochiBubble>
        </View>
      ) : null}

      {data && total > 0 ? (
        <>
          <Surface elevation={2} className="mt-4 flex-row items-center gap-3 p-4">
            <MochiCharacter
              ref={mochi}
              expression={allDone ? "celebrating" : done > 0 ? "proud" : "happy"}
              size={92}
              interactive
              shadow={false}
            />
            <View className="min-w-0 flex-1">
              <Title>{allDone ? "¡Lo lograste hoy!" : `${done} de ${total} hoy`}</Title>
              <Caption className="mt-1">
                {allDone
                  ? "Todos tus hábitos listos. Disfruta el resto del día."
                  : (tip ?? "Uno a la vez. Cada check cuenta.")}
              </Caption>
              <View className="mt-2.5 h-2 overflow-hidden rounded-full bg-surface-muted">
                <View
                  className="h-full rounded-full bg-positive"
                  style={{ width: `${(done / total) * 100}%` }}
                />
              </View>
            </View>
          </Surface>

          <SectionHeader title="Tus hábitos" />
          <View className="gap-2.5">
            {data.habits.map((habit) => {
              const on = data.doneToday.has(habit.id);
              const week = data.week.get(habit.id) ?? new Set<string>();
              return (
                <View
                  key={habit.id}
                  className="flex-row items-center gap-3 rounded-[22px] bg-surface px-3.5 py-3"
                  style={ELEVATION[1]}
                >
                  <PressableScale
                    haptics={false}
                    onPress={() => toggle(habit)}
                    onLongPress={() => askDelete(habit)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={habit.name}
                    accessibilityHint="Mantén presionado para eliminar"
                    className="min-w-0 flex-1 flex-row items-center gap-3"
                  >
                    <View
                      className={`h-9 w-9 items-center justify-center rounded-full ${on ? "bg-positive" : "border-[2.5px] border-ink-faint/60 bg-surface"}`}
                    >
                      {on ? <Ionicons name="checkmark" size={20} color={COLORS.accentInk} /> : null}
                    </View>
                    <View className="min-w-0 flex-1">
                      <View className="flex-row items-center gap-1.5">
                        <Ionicons
                          name={
                            (ICONS as readonly string[]).includes(habit.icon)
                              ? (habit.icon as (typeof ICONS)[number])
                              : "leaf"
                          }
                          size={15}
                          color={COLORS.inkMuted}
                        />
                        <Strong className={on ? "line-through opacity-60" : ""} numberOfLines={1}>
                          {habit.name}
                        </Strong>
                      </View>
                      <View
                        className="mt-1.5 flex-row gap-1"
                        accessibilityLabel={`${week.size} de 7 días esta semana`}
                      >
                        {days.map((iso) => {
                          const [y, m, d] = iso.split("-").map(Number);
                          const letter = DAY_LETTER[new Date(y, m - 1, d).getDay()];
                          const hit = week.has(iso) || (iso === days[6] && on);
                          return (
                            <View
                              key={iso}
                              className={`h-5 w-5 items-center justify-center rounded-md ${hit ? "bg-tint-ok" : "bg-surface-muted"}`}
                            >
                              <Text
                                className={`font-body-extrabold text-[9px] ${hit ? "text-tint-ok-ink" : "text-ink-faint"}`}
                              >
                                {letter}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  </PressableScale>
                  <PressableScale
                    haptics={false}
                    onPress={() => void toggleReminder(habit)}
                    hitSlop={8}
                    accessibilityRole="switch"
                    accessibilityState={{ checked: habit.reminderEnabled }}
                    accessibilityLabel={`Recordatorio de ${habit.name}`}
                    className="h-9 w-9 items-center justify-center rounded-full bg-surface-muted"
                  >
                    <Ionicons
                      name={habit.reminderEnabled ? "notifications" : "notifications-off-outline"}
                      size={17}
                      color={habit.reminderEnabled ? COLORS.accentStrong : COLORS.inkFaint}
                    />
                  </PressableScale>
                </View>
              );
            })}
          </View>
          <Caption className="ml-1 mt-3">Mantén presionado un hábito para eliminarlo.</Caption>
        </>
      ) : null}

      <Sheet visible={createOpen} onClose={() => setCreateOpen(false)} title="Nuevo hábito">
        <Input
          label="¿Qué quieres hacer cada día?"
          value={name}
          onChangeText={setName}
          placeholder="Tomar 8 vasos de agua"
          maxLength={60}
        />
        <Text className="mb-2 ml-1 font-body-bold text-sm text-ink">Ícono</Text>
        <View className="mb-5 flex-row flex-wrap gap-2">
          {ICONS.map((i) => (
            <Chip
              key={i}
              icon={i}
              label={ICON_LABEL[i]}
              selected={icon === i}
              onPress={() => setIcon(i)}
            />
          ))}
        </View>
        <Button
          title="Crear hábito"
          loading={saving}
          disabled={!name.trim()}
          onPress={() => void create()}
        />
      </Sheet>
    </Screen>
  );
}

export default HabitsScreen;
