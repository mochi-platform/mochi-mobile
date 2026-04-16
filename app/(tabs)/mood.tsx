import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { useCustomAlert } from "@/src/shared/components/CustomAlert";
import { useSession } from "@/src/core/providers/SessionContext";
import { supabase } from "@/src/shared/lib/supabase";
import type { MoodLog } from "@/src/shared/types/database";
import { useCycleRecommendation } from "@/src/shared/hooks/useCycleRecommendation";

type MoodOption = {
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tintClass: string;
  activeClass: string;
  iconColor: string;
};

const moodOptions: MoodOption[] = [
  {
    value: 1,
    icon: "sad",
    label: "Mal",
    tintClass: "border-red-200 bg-red-100",
    activeClass: "border-red-400 bg-red-200",
    iconColor: "#b91c1c",
  },
  {
    value: 2,
    icon: "sad-outline",
    label: "Regular",
    tintClass: "border-orange-200 bg-orange-100",
    activeClass: "border-orange-400 bg-orange-200",
    iconColor: "#c2410c",
  },
  {
    value: 3,
    icon: "happy-outline",
    label: "Bien",
    tintClass: "border-yellow-200 bg-yellow-100",
    activeClass: "border-yellow-400 bg-yellow-200",
    iconColor: "#a16207",
  },
  {
    value: 4,
    icon: "happy",
    label: "Muy bien",
    tintClass: "border-green-200 bg-green-100",
    activeClass: "border-green-400 bg-green-200",
    iconColor: "#15803d",
  },
  {
    value: 5,
    icon: "heart",
    label: "Excelente",
    tintClass: "border-pink-200 bg-pink-100",
    activeClass: "border-pink-400 bg-pink-200",
    iconColor: "#be185d",
  },
];

function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildLast7Days(): string[] {
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setDate(day.getDate() - (6 - index));
    return day.toISOString().slice(0, 10);
  });
}

function getMoodCircleClass(mood: number | undefined): string {
  if (mood === 1) return "bg-red-300";
  if (mood === 2) return "bg-orange-300";
  if (mood === 3) return "bg-yellow-300";
  if (mood === 4) return "bg-green-300";
  if (mood === 5) return "bg-pink-300";
  return "bg-slate-200";
}

function formatDateLabel(isoDate: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
  })
    .format(new Date(`${isoDate}T00:00:00`))
    .replace(".", "");
}

function getMoodLabel(value: number): string {
  return (
    moodOptions.find((option) => option.value === value)?.label ??
    "Sin registro"
  );
}

export function MoodScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const { showAlert, AlertComponent } = useCustomAlert();
  const { personality, phase } = useCycleRecommendation("mood");

  const [todayEntry, setTodayEntry] = useState<MoodLog | null>(null);
  const [recentEntries, setRecentEntries] = useState<MoodLog[]>([]);
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [editingToday, setEditingToday] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = session?.user.id;

  const loadMoodData = useCallback(async () => {
    if (!userId) {
      setTodayEntry(null);
      setRecentEntries([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const todayISO = getTodayISO();
      const { data: todayData, error: todayError } = await supabase
        .from("mood_logs")
        .select("id, user_id, mood, note, logged_date, created_at")
        .eq("user_id", userId)
        .eq("logged_date", todayISO)
        .maybeSingle();

      if (todayError) throw todayError;

      const since = new Date();
      since.setDate(since.getDate() - 6);

      const { data: recentData, error: recentError } = await supabase
        .from("mood_logs")
        .select("id, user_id, mood, note, logged_date, created_at")
        .eq("user_id", userId)
        .gte("logged_date", since.toISOString().slice(0, 10))
        .order("logged_date", { ascending: true });

      if (recentError) throw recentError;

      const normalizedToday = (todayData as MoodLog | null) ?? null;

      setTodayEntry(normalizedToday);
      setRecentEntries((recentData ?? []) as MoodLog[]);
      setSelectedMood(normalizedToday?.mood ?? null);
      setNote(normalizedToday?.note ?? "");
      setEditingToday(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar tu estado de ánimo",
      );
      setTodayEntry(null);
      setRecentEntries([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void loadMoodData();
    }, [loadMoodData]),
  );

  const last7Days = useMemo(() => buildLast7Days(), []);
  const moodByDate = useMemo(() => {
    const entries = new Map<string, number>();

    recentEntries.forEach((entry) => {
      entries.set(entry.logged_date, entry.mood);
    });

    return entries;
  }, [recentEntries]);

  const showEditor = !todayEntry || editingToday;
  const shouldShowCompassionNote =
    (selectedMood === 1 || selectedMood === 2) &&
    (phase === "lutea" || phase === "menstrual");

  const handleSaveMood = async () => {
    if (!userId) return;

    if (!selectedMood) {
      showAlert({
        title: "Selecciona un estado",
        message: "Elige cómo te sientes hoy antes de guardar",
        buttons: [{ text: "Entendido", style: "cancel" }],
      });
      return;
    }

    try {
      setSaving(true);

      const todayISO = getTodayISO();
      const { error: upsertError } = await supabase.from("mood_logs").upsert(
        {
          user_id: userId,
          mood: selectedMood,
          note: note.trim() || null,
          logged_date: todayISO,
        },
        { onConflict: "user_id,logged_date" },
      );

      if (upsertError) throw upsertError;

      showAlert({
        title: "Registro guardado",
        message: "Tu estado de ánimo quedó registrado para hoy",
        buttons: [{ text: "Aceptar", style: "default" }],
      });

      await loadMoodData();
    } catch (err) {
      showAlert({
        title: "Error",
        message:
          err instanceof Error
            ? err.message
            : "No se pudo guardar el estado de ánimo",
        buttons: [{ text: "Entendido", style: "destructive" }],
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <View className="flex-1 bg-orange-50">
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            className="flex-1 px-5 pt-12"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          >
            <View className="mb-5 flex-row items-center">
              <Ionicons name="heart" size={20} color="#c2410c" />
              <Text className="ml-2 text-2xl font-extrabold text-orange-900">
                Estado de ánimo
              </Text>
            </View>

            <Text className="text-sm font-semibold text-orange-700">
              Tu check-in emocional diario en pocos segundos
            </Text>

            {loading ? (
              <View className="mt-6 items-center rounded-3xl border-2 border-orange-200 bg-white p-6">
                <MochiCharacter mood="thinking" size={88} />
                <Text className="mt-3 text-sm font-semibold text-orange-800">
                  Cargando registro de hoy...
                </Text>
              </View>
            ) : error ? (
              <View className="mt-6 items-center rounded-3xl border-2 border-red-200 bg-red-50 p-6">
                <MochiCharacter mood="sleepy" size={80} />
                <Text className="mt-3 text-center text-sm font-semibold text-red-700">
                  {error}
                </Text>
                <TouchableOpacity
                  className="mt-4 rounded-2xl bg-red-500 px-5 py-2"
                  onPress={() => void loadMoodData()}
                >
                  <Text className="font-extrabold text-white">Reintentar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View className="mt-6 rounded-3xl border-2 border-orange-200 bg-white p-4">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-lg font-extrabold text-orange-900">
                      Hoy
                    </Text>
                    {todayEntry && !editingToday && (
                      <TouchableOpacity
                        className="rounded-full bg-orange-100 px-3 py-1"
                        onPress={() => setEditingToday(true)}
                      >
                        <Text className="text-xs font-extrabold text-orange-800">
                          Editar
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {todayEntry && !editingToday ? (
                    <View className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-4">
                      <Text className="text-base font-extrabold text-orange-900">
                        {getMoodLabel(todayEntry.mood)}
                      </Text>
                      <Text className="mt-2 text-sm font-semibold text-orange-800">
                        {todayEntry.note?.trim()
                          ? todayEntry.note
                          : "Sin nota para hoy"}
                      </Text>
                      {phase === "lutea" && (
                        <Text className="mt-3 text-xs font-semibold text-violet-700">
                          Es normal sentirte más sensible en esta fase. Mochi
                          está aquí.
                        </Text>
                      )}
                    </View>
                  ) : (
                    <>
                      {phase === "lutea" && (
                        <View className="mt-3 rounded-2xl border border-violet-200 bg-violet-50 p-3">
                          <Text className="text-xs font-semibold text-violet-700">
                            Es normal sentirte más sensible en esta fase. Mochi
                            está aquí.
                          </Text>
                        </View>
                      )}
                      <View className="mt-4 flex-row flex-wrap">
                        {moodOptions.map((option) => {
                          const isSelected = selectedMood === option.value;

                          return (
                            <TouchableOpacity
                              key={option.value}
                              className="mb-3 w-1/2 pr-3"
                              onPress={() => setSelectedMood(option.value)}
                            >
                              <View
                                className={`rounded-2xl border-2 p-4 ${isSelected ? option.activeClass : option.tintClass}`}
                              >
                                <Ionicons
                                  name={option.icon}
                                  size={24}
                                  color={option.iconColor}
                                />
                                <Text className="mt-2 text-sm font-extrabold text-slate-900">
                                  {option.label}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {shouldShowCompassionNote && (
                        <View className="rounded-2xl border border-pink-200 bg-pink-50 p-3">
                          <Text className="text-xs font-semibold text-pink-800">
                            Hoy te abrazo con calma. Si necesitas bajar el
                            ritmo, está bien. Estás haciendo lo mejor que
                            puedes.
                          </Text>
                        </View>
                      )}

                      <View className="mt-2">
                        <Text className="mb-2 text-sm font-bold text-orange-900">
                          Nota (opcional)
                        </Text>
                        <TextInput
                          className="rounded-2xl border-2 border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-slate-800"
                          placeholder="¿Qué te hizo sentir así hoy?"
                          placeholderTextColor="#fdba74"
                          value={note}
                          onChangeText={setNote}
                          multiline
                          numberOfLines={3}
                          style={{ minHeight: 90, textAlignVertical: "top" }}
                        />
                      </View>

                      <TouchableOpacity
                        className="mt-4 items-center rounded-2xl bg-orange-500 py-3"
                        onPress={() => void handleSaveMood()}
                        disabled={saving}
                      >
                        <Text className="font-extrabold text-white">
                          {saving ? "Guardando..." : "Guardar estado de ánimo"}
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>

                <View className="mt-6 rounded-3xl border-2 border-orange-200 bg-white p-4">
                  <Text className="text-lg font-extrabold text-orange-900">
                    Últimos 7 días
                  </Text>

                  <View className="mt-4 flex-row items-center justify-between">
                    {last7Days.map((date) => {
                      const mood = moodByDate.get(date);

                      return (
                        <View key={date} className="items-center">
                          <View
                            className={`h-8 w-8 rounded-full ${getMoodCircleClass(mood)}`}
                          />
                          <Text className="mt-2 text-xs font-bold text-orange-700">
                            {formatDateLabel(date)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  {recentEntries.length === 0 && (
                    <View className="mt-5 items-center rounded-2xl border border-orange-200 bg-orange-50 p-4">
                      <MochiCharacter
                        mood={personality?.mochiMood ?? "happy"}
                        size={68}
                      />
                      <Text className="mt-2 text-center text-sm font-semibold text-orange-800">
                        Aún no hay registros. Tu primer check-in te espera.
                      </Text>
                    </View>
                  )}
                </View>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
      {AlertComponent}
    </>
  );
}

export default MoodScreen;
