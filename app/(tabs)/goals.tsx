import { TabBarSpacer } from "@/src/shared/ui/TabBarSpacer";
import { tc } from "@/src/shared/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GoalCard } from "@/src/features/goals/components/GoalCard";
import { IconCtaButton } from "@/src/shared/components/IconCtaButton";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { useCustomAlert } from "@/src/shared/components/CustomAlert";
import { TabHeader } from "@/src/shared/components/TabHeader";
import { useSession } from "@/src/core/providers/SessionContext";
import { addPoints } from "@/src/shared/lib/gamification";
import { supabase } from "@/src/shared/lib/supabase";
import type { Goal } from "@/src/shared/types/database";
import { useCycleRecommendation } from "@/src/shared/hooks/useCycleRecommendation";
import { toLocalISODate } from "@/src/shared/lib/dates";
import { useFocusEffect } from "expo-router";

type GoalColor = {
  key: string;
  label: string;
  className: string;
};

const goalColors: GoalColor[] = [
  { key: "pink", label: "Rosa", className: "bg-pink-200 dark:bg-pink-800" },
  { key: "purple", label: "Lila", className: "bg-purple-200 dark:bg-purple-800" },
  { key: "mint", label: "Menta", className: "bg-emerald-200 dark:bg-emerald-800" },
  { key: "blue", label: "Celeste", className: "bg-sky-200 dark:bg-sky-800" },
  { key: "yellow", label: "Amarillo", className: "bg-yellow-200 dark:bg-yellow-800" },
];

function clampProgress(value: number): number {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function initialGoalDraft() {
  return {
    title: "",
    description: "",
    targetDate: toLocalISODate(new Date()),
    color: "purple",
    progress: 0,
  };
}

export function GoalsScreen() {
  const { session } = useSession();
  const { showAlert, AlertComponent } = useCustomAlert();
  const { personality, phase } = useCycleRecommendation("general");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [creating, setCreating] = useState(false);
  const [goalDraft, setGoalDraft] = useState(initialGoalDraft);

  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTargetDate, setEditTargetDate] = useState(toLocalISODate(new Date()));
  const [editColor, setEditColor] = useState("purple");
  const [editProgress, setEditProgress] = useState(0);
  const [editCompleted, setEditCompleted] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const [celebratingGoal, setCelebratingGoal] = useState<string | null>(null);

  const userId = session?.user.id;

  const loadGoals = useCallback(async () => {
    if (!userId) {
      setGoals([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", userId)
        .order("is_completed", { ascending: true })
        .order("target_date", { ascending: true });

      if (fetchError) throw fetchError;

      const normalized = (data ?? []).map((goal) => ({
        ...goal,
        progress: clampProgress(goal.progress ?? (goal.is_completed ? 100 : 0)),
      }));

      setGoals(normalized);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar tus metas");
      setGoals([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void loadGoals();
    }, [loadGoals]),
  );

  const progressLabel = useMemo(() => `${editProgress}%`, [editProgress]);

  const openEditSheet = (goal: Goal) => {
    setSelectedGoal(goal);
    setEditTitle(goal.title);
    setEditDescription(goal.description ?? "");
    setEditTargetDate(goal.target_date ?? "");
    setEditColor(goal.color ?? "purple");
    setEditProgress(clampProgress(goal.progress ?? 0));
    setEditCompleted(goal.is_completed);
    setShowEditSheet(true);
  };

  const closeCreateSheet = () => {
    setShowCreateSheet(false);
    setGoalDraft(initialGoalDraft());
  };

  const closeEditSheet = () => {
    setShowEditSheet(false);
    setSelectedGoal(null);
    setEditTitle("");
    setEditDescription("");
    setEditTargetDate(toLocalISODate(new Date()));
    setEditColor("purple");
    setEditProgress(0);
    setEditCompleted(false);
  };

  const handleCreateGoal = async () => {
    if (!userId) {
      showAlert({
        title: "Error",
        message: "No hay una sesión activa",
        buttons: [{ text: "Aceptar", style: "cancel" }],
      });
      return;
    }

    if (!goalDraft.title.trim()) {
      showAlert({
        title: "Falta información",
        message: "Escribe un título para tu meta",
        buttons: [{ text: "Entendido", style: "cancel" }],
      });
      return;
    }

    try {
      setCreating(true);

      const payload = {
        user_id: userId,
        title: goalDraft.title.trim(),
        description: goalDraft.description.trim() || null,
        target_date: goalDraft.targetDate || null,
        color: goalDraft.color,
        progress: 0,
        is_completed: false,
      };

      const { error: insertError } = await supabase.from("goals").insert(payload);
      if (insertError) throw insertError;

      closeCreateSheet();
      await loadGoals();
    } catch (err) {
      showAlert({
        title: "Error",
        message: err instanceof Error ? err.message : "No se pudo crear la meta",
        buttons: [{ text: "Entendido", style: "destructive" }],
      });
    } finally {
      setCreating(false);
    }
  };

  const handleSaveGoalEdit = async () => {
    if (!userId || !selectedGoal) return;

    if (!editTitle.trim()) {
      showAlert({
        title: "Falta información",
        message: "El título de la meta es obligatorio",
        buttons: [{ text: "Entendido", style: "cancel" }],
      });
      return;
    }

    const normalizedProgress = clampProgress(editProgress);
    const shouldComplete = editCompleted || normalizedProgress >= 100;
    const alreadyCompleted = selectedGoal.is_completed;

    try {
      setSavingEdit(true);

      const { error: updateError } = await supabase
        .from("goals")
        .update({
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          target_date: editTargetDate.trim() || null,
          color: editColor,
          progress: shouldComplete ? 100 : normalizedProgress,
          is_completed: shouldComplete,
        })
        .eq("id", selectedGoal.id)
        .eq("user_id", userId);

      if (updateError) throw updateError;

      if (!alreadyCompleted && shouldComplete) {
        await addPoints(userId, "goal_completed");
        setCelebratingGoal(selectedGoal.title);
      }

      closeEditSheet();
      await loadGoals();
    } catch (err) {
      showAlert({
        title: "Error",
        message: err instanceof Error ? err.message : "No se pudieron guardar los cambios",
        buttons: [{ text: "Entendido", style: "destructive" }],
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteGoal = (goalId: string) => {
    if (!userId) return;

    showAlert({
      title: "Eliminar meta",
      message: "¿Seguro que deseas eliminar esta meta? Esta acción no se puede deshacer.",
      buttons: [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                const { error: deleteError } = await supabase
                  .from("goals")
                  .delete()
                  .eq("id", goalId)
                  .eq("user_id", userId);

                if (deleteError) throw deleteError;

                closeEditSheet();
                await loadGoals();
              } catch (err) {
                showAlert({
                  title: "Error",
                  message: err instanceof Error ? err.message : "No se pudo eliminar la meta",
                  buttons: [{ text: "Entendido", style: "destructive" }],
                });
              }
            })();
          },
        },
      ],
    });
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-purple-50 dark:bg-purple-950">
        <ActivityIndicator size="small" color={tc("#7c3aed")} />
        <Text className="mt-3 text-sm font-semibold text-purple-700 dark:text-purple-300">
          Cargando metas...
        </Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-purple-50 px-6 dark:bg-purple-950">
        <MochiCharacter mood="sleepy" size={76} />
        <Text className="mt-4 text-center text-sm font-semibold text-red-600 dark:text-red-400">
          {error}
        </Text>
        <TouchableOpacity
          className="mt-6 rounded-2xl bg-purple-600 px-6 py-3"
          onPress={() => void loadGoals()}
        >
          <Text className="font-extrabold text-white">Reintentar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <>
      <View className="flex-1 bg-canvas">
        <ScrollView className="flex-1 px-5 pt-12" showsVerticalScrollIndicator={false}>
          <TabHeader
            iconName="flag"
            title="Metas"
            subtitle="Visualiza tu progreso y celebra cada avance"
            iconColor={tc("#7c3aed")}
            titleClassName="text-2xl font-extrabold text-purple-900 dark:text-purple-100"
            subtitleClassName="text-sm font-semibold text-purple-700 dark:text-purple-300"
          />

          {celebratingGoal && (
            <View className="mt-5 items-center rounded-3xl border-2 border-green-200 bg-green-50 p-5 dark:border-green-800 dark:bg-green-950">
              <MochiCharacter mood="excited" size={78} />
              <Text className="mt-3 text-center text-base font-extrabold text-green-700 dark:text-green-300">
                ¡Meta completada!
              </Text>
              <Text className="mt-1 text-center text-sm font-semibold text-green-700 dark:text-green-300">
                {celebratingGoal} te dio +15 puntos
              </Text>
              <TouchableOpacity
                className="mt-3 rounded-2xl bg-green-200 px-4 py-2 dark:bg-green-800"
                onPress={() => setCelebratingGoal(null)}
              >
                <Text className="font-bold text-green-800 dark:text-green-200">
                  Seguir con mis metas
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View className="mt-5">
            {goals.length === 0 ? (
              <View className="items-center rounded-3xl border-2 border-purple-200 bg-white p-6 dark:border-purple-800 dark:bg-surface">
                <MochiCharacter mood="happy" size={78} />
                <Text className="mt-3 text-center text-base font-extrabold text-purple-800 dark:text-purple-200">
                  Aún no tienes metas creadas
                </Text>
                <Text className="mt-2 text-center text-sm font-semibold text-purple-600 dark:text-purple-400">
                  Toca el botón + para crear tu primera meta
                </Text>
              </View>
            ) : (
              goals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} onPress={() => openEditSheet(goal)} />
              ))
            )}
          </View>

          <TabBarSpacer />
        </ScrollView>

        <TouchableOpacity
          className="absolute bottom-5 right-5 h-14 w-14 items-center justify-center rounded-full bg-purple-600 shadow-lg"
          onPress={() => setShowCreateSheet(true)}
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={28} color="white" />
        </TouchableOpacity>
      </View>

      <Modal
        transparent
        visible={showCreateSheet}
        animationType="slide"
        onRequestClose={closeCreateSheet}
      >
        <TouchableWithoutFeedback onPress={closeCreateSheet}>
          <View className="flex-1 justify-end bg-black/30">
            <TouchableWithoutFeedback onPress={() => undefined}>
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className="rounded-t-3xl bg-white dark:bg-surface"
              >
                <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
                  <View className="px-5 pb-8 pt-5">
                    <View className="mb-4 h-1.5 w-16 self-center rounded-full bg-slate-200 dark:bg-slate-800" />
                    <Text className="text-xl font-extrabold text-purple-900 dark:text-purple-100">
                      Nueva meta
                    </Text>
                    {phase === "folicular" && personality && (
                      <View
                        className={`mt-3 self-start rounded-2xl border px-3 py-2 ${personality.phaseBadgeClass}`}
                      >
                        <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Estás en tu fase folicular: ideal para empezar metas nuevas.
                        </Text>
                      </View>
                    )}

                    <View className="mt-4">
                      <Text className="text-xs font-bold uppercase tracking-wide text-purple-700 dark:text-purple-300">
                        Título
                      </Text>
                      <TextInput
                        className="mt-2 rounded-2xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm font-semibold text-purple-900 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-100"
                        placeholder="Ej. Terminar capítulo 3 de física"
                        placeholderTextColor={tc("#a78bfa")}
                        value={goalDraft.title}
                        onChangeText={(value) =>
                          setGoalDraft((prev) => ({ ...prev, title: value }))
                        }
                        editable={!creating}
                      />
                    </View>

                    <View className="mt-3">
                      <Text className="text-xs font-bold uppercase tracking-wide text-purple-700 dark:text-purple-300">
                        Descripción (opcional)
                      </Text>
                      <TextInput
                        className="mt-2 rounded-2xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm font-semibold text-purple-900 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-100"
                        placeholder="Describe tu objetivo"
                        placeholderTextColor={tc("#a78bfa")}
                        value={goalDraft.description}
                        onChangeText={(value) =>
                          setGoalDraft((prev) => ({
                            ...prev,
                            description: value,
                          }))
                        }
                        editable={!creating}
                        multiline
                        numberOfLines={2}
                        textAlignVertical="top"
                      />
                    </View>

                    <View className="mt-3">
                      <Text className="text-xs font-bold uppercase tracking-wide text-purple-700 dark:text-purple-300">
                        Fecha objetivo
                      </Text>
                      <TextInput
                        className="mt-2 rounded-2xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm font-semibold text-purple-900 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-100"
                        placeholder="AAAA-MM-DD"
                        placeholderTextColor={tc("#a78bfa")}
                        value={goalDraft.targetDate}
                        onChangeText={(value) =>
                          setGoalDraft((prev) => ({
                            ...prev,
                            targetDate: value,
                          }))
                        }
                        editable={!creating}
                      />
                    </View>

                    <View className="mt-3">
                      <Text className="text-xs font-bold uppercase tracking-wide text-purple-700 dark:text-purple-300">
                        Color
                      </Text>
                      <View className="mt-2 flex-row flex-wrap">
                        {goalColors.map((color) => {
                          const active = goalDraft.color === color.key;

                          return (
                            <TouchableOpacity
                              key={color.key}
                              className={`mr-2 mt-2 rounded-full px-3 py-2 ${color.className} ${active ? "border-2 border-purple-700" : "border border-transparent"}`}
                              onPress={() =>
                                setGoalDraft((prev) => ({
                                  ...prev,
                                  color: color.key,
                                }))
                              }
                              disabled={creating}
                            >
                              <Text className="text-xs font-bold text-purple-900 dark:text-purple-100">
                                {color.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    <View className="mt-6 flex-row gap-3">
                      <TouchableOpacity
                        className="flex-1 rounded-2xl border border-purple-200 py-3 dark:border-purple-800"
                        onPress={closeCreateSheet}
                        disabled={creating}
                      >
                        <Text className="text-center font-bold text-purple-700 dark:text-purple-300">
                          Cancelar
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="flex-1 rounded-2xl bg-purple-600 py-3"
                        onPress={() => void handleCreateGoal()}
                        disabled={creating}
                      >
                        {creating ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <Text className="text-center font-extrabold text-white">Crear meta</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </ScrollView>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        transparent
        visible={showEditSheet}
        animationType="slide"
        onRequestClose={closeEditSheet}
      >
        <TouchableWithoutFeedback onPress={closeEditSheet}>
          <View className="flex-1 justify-end bg-black/30">
            <TouchableWithoutFeedback onPress={() => undefined}>
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className="rounded-t-3xl bg-white dark:bg-surface"
              >
                <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
                  <View className="px-5 pb-8 pt-5">
                    <View className="mb-4 h-1.5 w-16 self-center rounded-full bg-slate-200 dark:bg-slate-800" />
                    <Text className="text-xl font-extrabold text-purple-900 dark:text-purple-100">
                      Actualizar meta
                    </Text>

                    <View className="mt-4">
                      <Text className="text-xs font-bold uppercase tracking-wide text-purple-700 dark:text-purple-300">
                        Título
                      </Text>
                      <TextInput
                        className="mt-2 rounded-2xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm font-semibold text-purple-900 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-100"
                        placeholder="Ej. Terminar capítulo 3 de física"
                        placeholderTextColor={tc("#a78bfa")}
                        value={editTitle}
                        onChangeText={setEditTitle}
                        editable={!savingEdit}
                      />
                    </View>

                    <View className="mt-3">
                      <Text className="text-xs font-bold uppercase tracking-wide text-purple-700 dark:text-purple-300">
                        Descripción (opcional)
                      </Text>
                      <TextInput
                        className="mt-2 rounded-2xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm font-semibold text-purple-900 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-100"
                        placeholder="Describe tu objetivo"
                        placeholderTextColor={tc("#a78bfa")}
                        value={editDescription}
                        onChangeText={setEditDescription}
                        editable={!savingEdit}
                        multiline
                        numberOfLines={2}
                        textAlignVertical="top"
                      />
                    </View>

                    <View className="mt-3">
                      <Text className="text-xs font-bold uppercase tracking-wide text-purple-700 dark:text-purple-300">
                        Fecha objetivo
                      </Text>
                      <TextInput
                        className="mt-2 rounded-2xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm font-semibold text-purple-900 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-100"
                        placeholder="AAAA-MM-DD"
                        placeholderTextColor={tc("#a78bfa")}
                        value={editTargetDate}
                        onChangeText={setEditTargetDate}
                        editable={!savingEdit}
                      />
                    </View>

                    <View className="mt-3">
                      <Text className="text-xs font-bold uppercase tracking-wide text-purple-700 dark:text-purple-300">
                        Color
                      </Text>
                      <View className="mt-2 flex-row flex-wrap">
                        {goalColors.map((color) => {
                          const active = editColor === color.key;

                          return (
                            <TouchableOpacity
                              key={color.key}
                              className={`mr-2 mt-2 rounded-full px-3 py-2 ${color.className} ${active ? "border-2 border-purple-700" : "border border-transparent"}`}
                              onPress={() => setEditColor(color.key)}
                              disabled={savingEdit}
                            >
                              <Text className="text-xs font-bold text-purple-900 dark:text-purple-100">
                                {color.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    <View className="mt-5">
                      <Text className="text-xs font-bold uppercase tracking-wide text-purple-700 dark:text-purple-300">
                        Progreso actual: {progressLabel}
                      </Text>
                      <View className="mt-3 flex-row items-center justify-between rounded-2xl bg-purple-50 px-3 py-3 dark:bg-purple-950">
                        <TouchableOpacity
                          className="h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-surface"
                          onPress={() => setEditProgress((prev) => clampProgress(prev - 10))}
                          disabled={savingEdit}
                        >
                          <Ionicons name="remove" size={18} color={tc("#7c3aed")} />
                        </TouchableOpacity>

                        <Text className="text-xl font-extrabold text-purple-900 dark:text-purple-100">
                          {progressLabel}
                        </Text>

                        <TouchableOpacity
                          className="h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-surface"
                          onPress={() => setEditProgress((prev) => clampProgress(prev + 10))}
                          disabled={savingEdit}
                        >
                          <Ionicons name="add" size={18} color={tc("#7c3aed")} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <IconCtaButton
                      label="Marcar como completada"
                      onPress={() => setEditCompleted((prev) => !prev)}
                      iconName={editCompleted ? "checkbox" : "square"}
                      iconColor={editCompleted ? tc("#16a34a") : tc("#7c3aed")}
                      iconSize={20}
                      disabled={savingEdit}
                      containerClassName={`mt-4 w-full rounded-2xl border px-4 py-3 ${editCompleted ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950" : "border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950"}`}
                      textClassName={
                        editCompleted
                          ? "text-green-700 dark:text-green-300"
                          : "text-purple-800 dark:text-purple-200"
                      }
                    />

                    {selectedGoal ? (
                      <TouchableOpacity
                        className="mt-4 rounded-2xl border border-red-200 bg-red-50 py-3 dark:border-red-800 dark:bg-red-950"
                        onPress={() => void handleDeleteGoal(selectedGoal.id)}
                        disabled={savingEdit}
                      >
                        <Text className="text-center font-bold text-red-600 dark:text-red-400">
                          Eliminar meta
                        </Text>
                      </TouchableOpacity>
                    ) : null}

                    <View className="mt-6 flex-row gap-3">
                      <TouchableOpacity
                        className="flex-1 rounded-2xl border border-purple-200 py-3 dark:border-purple-800"
                        onPress={closeEditSheet}
                        disabled={savingEdit}
                      >
                        <Text className="text-center font-bold text-purple-700 dark:text-purple-300">
                          Cancelar
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="flex-1 rounded-2xl bg-purple-600 py-3"
                        onPress={() => void handleSaveGoalEdit()}
                        disabled={savingEdit}
                      >
                        {savingEdit ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <Text className="text-center font-extrabold text-white">
                            Guardar cambios
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </ScrollView>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {AlertComponent}
    </>
  );
}

export default GoalsScreen;
