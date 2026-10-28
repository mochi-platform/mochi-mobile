import { TabBarSpacer } from "@/src/shared/ui/TabBarSpacer";
import { reportError } from "@/src/shared/lib/observability/reportError";
import { tc } from "@/src/shared/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { supabase } from "@/src/shared/lib/supabase";
import { useSession } from "@/src/core/providers/SessionContext";
import { useCustomAlert } from "@/src/shared/components/CustomAlert";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { FloatingActionButton } from "@/src/shared/components/FloatingActionButton";
import { TabHeader } from "@/src/shared/components/TabHeader";
import { HabitCard } from "@/src/features/habits/components/HabitCard";
import type { Habit } from "@/src/shared/types/database";
import { useCycleRecommendation } from "@/src/shared/hooks/useCycleRecommendation";
import {
  cancelHabitReminder,
  loadHabitNotificationMap,
  loadNotificationPrefs,
  removeHabitNotificationPreference,
  saveHabitNotificationEnabled,
  scheduleHabitReminderForHabit,
} from "@/src/shared/lib/notifications";
import { toLocalISODate } from "@/src/shared/lib/dates";
import { useFocusEffect } from "expo-router";

const COLOR_OPTIONS = ["pink", "yellow", "blue", "teal", "purple"] as const;
const ICON_OPTIONS = ["leaf", "water", "book", "heart", "fitness"] as const;

function getLast7Days(): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(toLocalISODate(d));
  }
  return days;
}

const colorBgMap: Record<string, string> = {
  pink: "bg-pink-200 dark:bg-pink-800",
  yellow: "bg-yellow-200 dark:bg-yellow-800",
  blue: "bg-blue-200 dark:bg-blue-800",
  teal: "bg-teal-200 dark:bg-teal-800",
  purple: "bg-purple-200 dark:bg-purple-800",
};

export function HabitsScreen() {
  const { session } = useSession();
  const { showAlert, AlertComponent } = useCustomAlert();
  const { personality, phase } = useCycleRecommendation("habit");
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completedToday, setCompletedToday] = useState<Set<string>>(new Set());
  const [weeklyLogs, setWeeklyLogs] = useState<Map<string, Set<string>>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [selectedColor, setSelectedColor] = useState<string>("pink");
  const [selectedIcon, setSelectedIcon] = useState<string>("leaf");
  const [saving, setSaving] = useState(false);
  const [habitReminderMap, setHabitReminderMap] = useState<Record<string, boolean>>({});
  const [habitNotifEnabled, setHabitNotifEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [habitNotifTime, setHabitNotifTime] = useState("21:00");
  const celebrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadingScale = useSharedValue(1);
  const celebrationScale = useSharedValue(0);
  const progressValue = useSharedValue(0);

  useEffect(() => {
    if (loading) {
      loadingScale.value = withRepeat(
        withSequence(
          withTiming(1.06, {
            duration: 650,
            easing: Easing.inOut(Easing.quad),
          }),
          withTiming(1, { duration: 650, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
    } else {
      loadingScale.value = withTiming(1, { duration: 180 });
    }
  }, [loading, loadingScale]);

  useEffect(() => {
    return () => {
      if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== "android") return;

    const showSub = Keyboard.addListener("keyboardDidShow", (event) => {
      setKeyboardInset(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardInset(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const loadingAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: loadingScale.value }],
  }));

  const celebrationAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: celebrationScale.value }],
  }));

  const progressBarAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value * 100}%`,
  }));

  const todayISO = useMemo(() => toLocalISODate(new Date()), []);
  const last7Days = useMemo(() => getLast7Days(), []);

  const loadHabits = useCallback(async () => {
    const userId = session?.user.id;
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const weekStart = last7Days[0];

      const [habitsRes, todayLogsRes, weekLogsRes, notifPrefs, habitPrefs] = await Promise.all([
        supabase
          .from("habits")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: true }),
        supabase
          .from("habit_logs")
          .select("habit_id")
          .eq("user_id", userId)
          .eq("log_date", todayISO),
        supabase
          .from("habit_logs")
          .select("habit_id, log_date")
          .eq("user_id", userId)
          .gte("log_date", weekStart)
          .lte("log_date", todayISO),
        loadNotificationPrefs(),
        loadHabitNotificationMap(),
      ]);

      if (habitsRes.error) throw habitsRes.error;
      if (todayLogsRes.error) throw todayLogsRes.error;
      if (weekLogsRes.error) throw weekLogsRes.error;

      const weekMap = new Map<string, Set<string>>();
      for (const log of weekLogsRes.data ?? []) {
        const existing = weekMap.get(log.habit_id);
        if (existing) {
          existing.add(log.log_date);
        } else {
          weekMap.set(log.habit_id, new Set([log.log_date]));
        }
      }

      setHabits(habitsRes.data ?? []);
      // El servidor manda: se sincroniza el almacenamiento local con habits.reminder_enabled.
      const serverPrefs: Record<string, boolean> = {};
      for (const habit of habitsRes.data ?? []) {
        const enabled = (habit as { reminder_enabled?: boolean }).reminder_enabled !== false;
        serverPrefs[habit.id] = enabled;
        if (habitPrefs[habit.id] !== enabled) {
          void saveHabitNotificationEnabled(habit.id, enabled);
        }
      }
      setCompletedToday(new Set(todayLogsRes.data?.map((l) => l.habit_id) ?? []));
      setWeeklyLogs(weekMap);
      setHabitReminderMap({ ...habitPrefs, ...serverPrefs });
      setNotificationsEnabled(notifPrefs.enabled);
      setHabitNotifEnabled(notifPrefs.habitEnabled);
      setHabitNotifTime(notifPrefs.habitTime);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando hábitos");
    } finally {
      setLoading(false);
    }
  }, [session?.user.id, todayISO, last7Days]);

  useFocusEffect(
    useCallback(() => {
      void loadHabits();
    }, [loadHabits]),
  );

  async function handleToggle(habitId: string) {
    const userId = session?.user.id;
    if (!userId) return;

    const isCompleted = completedToday.has(habitId);

    if (isCompleted) {
      const { error: deleteError } = await supabase
        .from("habit_logs")
        .delete()
        .eq("user_id", userId)
        .eq("habit_id", habitId)
        .eq("log_date", todayISO);
      if (deleteError) {
        reportError(deleteError, { scope: "Habits" });
        return;
      }
      setCompletedToday((prev) => {
        const next = new Set(prev);
        next.delete(habitId);
        return next;
      });
    } else {
      const { error: insertError } = await supabase.from("habit_logs").insert({
        user_id: userId,
        habit_id: habitId,
        log_date: todayISO,
      });
      if (insertError) {
        reportError(insertError, { scope: "Habits" });
        return;
      }
      setCompletedToday((prev) => {
        const next = new Set(prev);
        next.add(habitId);
        return next;
      });

      const newSize = completedToday.size + 1;
      if (habits.length > 0 && newSize === habits.length) {
        celebrationScale.value = withSequence(
          withTiming(1.1, { duration: 300, easing: Easing.out(Easing.cubic) }),
          withTiming(1, { duration: 200 }),
        );
        setShowCelebration(true);
        if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current);
        celebrationTimerRef.current = setTimeout(() => setShowCelebration(false), 3000);
      }
    }
  }

  async function handleCreateHabit() {
    const userId = session?.user.id;
    if (!userId || !newHabitName.trim()) return;

    setSaving(true);
    try {
      const { data: createdHabit, error: sbError } = await supabase
        .from("habits")
        .insert({
          user_id: userId,
          name: newHabitName.trim(),
          color: selectedColor,
          icon: selectedIcon,
        })
        .select("id, name")
        .single();

      if (sbError) throw sbError;

      if (createdHabit) {
        await saveHabitNotificationEnabled(createdHabit.id, true);
        if (notificationsEnabled && habitNotifEnabled) {
          await scheduleHabitReminderForHabit(createdHabit, habitNotifTime);
        }
      }

      setNewHabitName("");
      setSelectedColor("pink");
      setSelectedIcon("leaf");
      setShowModal(false);
      await loadHabits();
    } catch (err) {
      reportError(err, { scope: "Habits" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteHabit(habitId: string) {
    const userId = session?.user.id;
    if (!userId) return;

    try {
      const { error: deleteError } = await supabase
        .from("habits")
        .delete()
        .eq("id", habitId)
        .eq("user_id", userId);

      if (deleteError) throw deleteError;

      await cancelHabitReminder(habitId);
      await removeHabitNotificationPreference(habitId);
      setHabitReminderMap((prev) => {
        const next = { ...prev };
        delete next[habitId];
        return next;
      });

      await loadHabits();
    } catch (err) {
      reportError(err, { scope: "Habits" });
      setError(err instanceof Error ? err.message : "No se pudo eliminar el hábito");
    }
  }

  async function handleToggleHabitNotification(habit: Habit) {
    const currentEnabled = habitReminderMap[habit.id] !== false;
    const nextEnabled = !currentEnabled;

    setHabitReminderMap((prev) => ({ ...prev, [habit.id]: nextEnabled }));

    try {
      const { error: updateError } = await supabase
        .from("habits")
        .update({ reminder_enabled: nextEnabled })
        .eq("id", habit.id);
      if (updateError) throw updateError;
      await saveHabitNotificationEnabled(habit.id, nextEnabled);

      if (!notificationsEnabled || !habitNotifEnabled) {
        return;
      }

      if (nextEnabled) {
        await scheduleHabitReminderForHabit({ id: habit.id, name: habit.name }, habitNotifTime);
      } else {
        await cancelHabitReminder(habit.id);
      }
    } catch {
      setHabitReminderMap((prev) => ({ ...prev, [habit.id]: currentEnabled }));
    }
  }

  const completionProgress = habits.length > 0 ? completedToday.size / habits.length : 0;

  useEffect(() => {
    progressValue.value = withTiming(completionProgress, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
    });
  }, [completionProgress, progressValue]);

  return (
    <View className="flex-1 bg-canvas">
      <ScrollView className="flex-1 px-5 pt-12" showsVerticalScrollIndicator={false}>
        <TabHeader
          iconName="leaf"
          title="Mis hábitos"
          subtitle="Tu seguimiento diario"
          iconColor={tc("#7c3aed")}
          titleClassName="text-2xl font-extrabold text-purple-900 dark:text-purple-100"
          subtitleClassName="text-sm font-semibold text-purple-700 dark:text-purple-300"
        />

        {personality && (
          <View
            className={`mb-4 self-start rounded-full border px-2.5 py-1 ${personality.phaseBadgeClass}`}
          >
            <View className="flex-row items-center">
              <Ionicons name={personality.phaseIconName} size={11} color={tc("#334155")} />
              <Text className="ml-1 text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
                {personality.phaseLabel}
              </Text>
            </View>
          </View>
        )}

        {phase === "menstrual" && (
          <View className="mb-4 rounded-2xl border border-pink-200 bg-pink-100 px-3 py-2 dark:border-pink-800 dark:bg-pink-900">
            <Text className="text-xs font-semibold text-pink-800 dark:text-pink-200">
              Hoy celebramos cada hábito que completes
            </Text>
          </View>
        )}
        {phase === "lutea" && (
          <View className="mb-4 rounded-2xl border border-violet-200 bg-violet-100 px-3 py-2 dark:border-violet-800 dark:bg-violet-900">
            <Text className="text-xs font-semibold text-violet-800 dark:text-violet-200">
              Enfócate en los esenciales, está bien descansar
            </Text>
          </View>
        )}

        {loading ? (
          <View className="flex-1 items-center justify-center py-12">
            <Animated.View style={loadingAnimatedStyle}>
              <MochiCharacter mood={personality?.mochiMood ?? "thinking"} size={92} />
            </Animated.View>
            <Text className="mt-4 text-sm font-semibold text-purple-700 dark:text-purple-300">
              Cargando hábitos...
            </Text>
          </View>
        ) : error ? (
          <View className="rounded-3xl border-2 border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
            <Text className="text-sm font-semibold text-red-700 dark:text-red-300">{error}</Text>
          </View>
        ) : habits.length === 0 ? (
          <View className="items-center rounded-3xl border-2 border-purple-200 bg-white p-8 dark:border-purple-800 dark:bg-surface">
            <MochiCharacter mood="happy" size={88} />
            <Text className="mt-3 text-center text-sm font-semibold text-purple-600 dark:text-purple-400">
              Crea tu primer hábito usando el botón de abajo
            </Text>
          </View>
        ) : (
          <>
            <View className="mb-4 rounded-2xl border border-purple-200 bg-white/80 px-3 py-3 dark:border-purple-800 dark:bg-surface/80">
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-xs font-extrabold uppercase tracking-wide text-purple-500">
                  Progreso de hoy
                </Text>
                <Text className="text-xs font-extrabold text-purple-700 dark:text-purple-300">
                  {Math.round(completionProgress * 100)}%
                </Text>
              </View>
              <View className="h-2.5 overflow-hidden rounded-full bg-purple-100 dark:bg-purple-900">
                <Animated.View
                  style={progressBarAnimatedStyle}
                  className="h-full rounded-full bg-purple-500"
                />
              </View>
            </View>
            {habits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                isCompleted={completedToday.has(habit.id)}
                isReminderEnabled={habitReminderMap[habit.id] !== false}
                onToggleReminder={() => {
                  void handleToggleHabitNotification(habit);
                }}
                weeklyDots={last7Days.map((d) => weeklyLogs.get(habit.id)?.has(d) ?? false)}
                weeklyDayLabels={last7Days}
                onToggle={() => void handleToggle(habit.id)}
                onLongPress={() => {
                  showAlert({
                    title: "Eliminar hábito",
                    message: "¿Quieres eliminar este hábito? Esta acción no se puede deshacer.",
                    buttons: [
                      { text: "Cancelar", style: "cancel" },
                      {
                        text: "Eliminar",
                        style: "destructive",
                        onPress: () => {
                          void handleDeleteHabit(habit.id);
                        },
                      },
                    ],
                  });
                }}
              />
            ))}
          </>
        )}

        <TabBarSpacer />
      </ScrollView>

      {/* Celebration overlay */}
      {showCelebration && (
        <View className="absolute inset-0 items-center justify-center bg-black/30">
          <Animated.View
            style={celebrationAnimatedStyle}
            className="items-center rounded-3xl bg-white p-8 dark:bg-surface"
          >
            <MochiCharacter mood={personality?.mochiMood ?? "excited"} size={96} />
            <Text className="mt-4 text-xl font-extrabold text-purple-900 dark:text-purple-100">
              ¡Todos los hábitos completados!
            </Text>
            <Text className="mt-2 text-sm font-semibold text-purple-500">
              ¡Eres increíble, sigue así!
            </Text>
          </Animated.View>
        </View>
      )}

      <FloatingActionButton
        onPress={() => setShowModal(true)}
        containerClassName="bg-purple-500"
        borderClassName="border-purple-300 dark:border-purple-700"
        accessibilityLabel="Crear hábito"
      />

      {/* Create Habit Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/30" style={{ paddingBottom: keyboardInset }}>
          <View className="max-h-[90%] rounded-t-3xl bg-white px-6 pb-10 pt-6 dark:bg-surface">
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View className="mb-4 flex-row items-center justify-between">
                <Text className="text-lg font-extrabold text-purple-900 dark:text-purple-100">
                  Nuevo hábito
                </Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Ionicons name="close" size={22} color={tc("#7c3aed")} />
                </TouchableOpacity>
              </View>

              <Text className="mb-2 text-sm font-bold text-purple-800 dark:text-purple-200">
                Nombre
              </Text>
              <TextInput
                className="rounded-2xl border-2 border-purple-200 bg-purple-50 px-4 py-3 text-sm font-semibold text-slate-800 dark:border-purple-800 dark:bg-purple-950 dark:text-slate-200"
                placeholder="Ej. Leer 20 minutos, Meditar..."
                placeholderTextColor={tc("#c4b5fd")}
                value={newHabitName}
                onChangeText={setNewHabitName}
              />

              <Text className="mb-2 mt-4 text-sm font-bold text-purple-800 dark:text-purple-200">
                Color
              </Text>
              <View className="flex-row">
                {COLOR_OPTIONS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    className={`mr-2 h-9 w-9 rounded-full border-2 ${colorBgMap[color]} ${selectedColor === color ? "border-purple-500" : "border-transparent"}`}
                    onPress={() => setSelectedColor(color)}
                  />
                ))}
              </View>

              <Text className="mb-2 mt-4 text-sm font-bold text-purple-800 dark:text-purple-200">
                Icono
              </Text>
              <View className="flex-row">
                {ICON_OPTIONS.map((icon) => (
                  <TouchableOpacity
                    key={icon}
                    className={`mr-2 h-10 w-10 items-center justify-center rounded-xl border-2 ${selectedIcon === icon ? "border-purple-500 bg-purple-100 dark:bg-purple-900" : "border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950"}`}
                    onPress={() => setSelectedIcon(icon)}
                  >
                    <Ionicons
                      name={icon as keyof typeof Ionicons.glyphMap}
                      size={18}
                      color={selectedIcon === icon ? tc("#7c3aed") : tc("#a78bfa")}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                className={`mt-6 items-center rounded-2xl py-4 ${saving || !newHabitName.trim() ? "bg-purple-300 dark:bg-purple-700" : "bg-purple-500"}`}
                onPress={() => void handleCreateHabit()}
                disabled={saving || !newHabitName.trim()}
              >
                <Text className="font-extrabold text-white">
                  {saving ? "Creando..." : "Crear hábito"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
      {AlertComponent}
    </View>
  );
}

export default HabitsScreen;
