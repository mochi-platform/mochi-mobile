import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
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
import { addPoints } from "@/src/shared/lib/gamification";
import { supabase } from "@/src/shared/lib/supabase";
import type { GratitudeLog } from "@/src/shared/types/database";

function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
    .format(new Date(`${isoDate}T00:00:00`))
    .replace(".", "");
}

export function GratitudeScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const { showAlert, AlertComponent } = useCustomAlert();

  const [todayEntry, setTodayEntry] = useState<GratitudeLog | null>(null);
  const [history, setHistory] = useState<GratitudeLog[]>([]);
  const [editingToday, setEditingToday] = useState(false);

  const [entry1, setEntry1] = useState("");
  const [entry2, setEntry2] = useState("");
  const [entry3, setEntry3] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = session?.user.id;

  const loadGratitudeData = useCallback(async () => {
    if (!userId) {
      setTodayEntry(null);
      setHistory([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const todayISO = getTodayISO();
      const { data: todayData, error: todayError } = await supabase
        .from("gratitude_logs")
        .select(
          "id, user_id, entry_1, entry_2, entry_3, logged_date, created_at",
        )
        .eq("user_id", userId)
        .eq("logged_date", todayISO)
        .maybeSingle();

      if (todayError) throw todayError;

      const { data: historyData, error: historyError } = await supabase
        .from("gratitude_logs")
        .select(
          "id, user_id, entry_1, entry_2, entry_3, logged_date, created_at",
        )
        .eq("user_id", userId)
        .order("logged_date", { ascending: false })
        .limit(5);

      if (historyError) throw historyError;

      const normalizedToday = (todayData as GratitudeLog | null) ?? null;

      setTodayEntry(normalizedToday);
      setHistory((historyData ?? []) as GratitudeLog[]);
      setEntry1(normalizedToday?.entry_1 ?? "");
      setEntry2(normalizedToday?.entry_2 ?? "");
      setEntry3(normalizedToday?.entry_3 ?? "");
      setEditingToday(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar tu diario de gratitud",
      );
      setTodayEntry(null);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void loadGratitudeData();
    }, [loadGratitudeData]),
  );

  const showEditor = !todayEntry || editingToday;

  const handleSaveGratitude = async () => {
    if (!userId) return;

    if (!entry1.trim()) {
      showAlert({
        title: "Falta información",
        message: "Escribe al menos una cosa por la que sientes gratitud hoy",
        buttons: [{ text: "Entendido", style: "cancel" }],
      });
      return;
    }

    try {
      setSaving(true);

      const todayISO = getTodayISO();
      const { error: upsertError } = await supabase
        .from("gratitude_logs")
        .upsert(
          {
            user_id: userId,
            entry_1: entry1.trim(),
            entry_2: entry2.trim() || null,
            entry_3: entry3.trim() || null,
            logged_date: todayISO,
          },
          { onConflict: "user_id,logged_date" },
        );

      if (upsertError) throw upsertError;

      await addPoints(userId, 3);

      showAlert({
        title: "Gratitud guardada",
        message: "Excelente, sumaste 3 puntos por tu registro de hoy",
        buttons: [{ text: "Qué bien", style: "default" }],
      });

      await loadGratitudeData();
    } catch (err) {
      showAlert({
        title: "Error",
        message:
          err instanceof Error ? err.message : "No se pudo guardar tu registro",
        buttons: [{ text: "Entendido", style: "destructive" }],
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <View className="flex-1 bg-emerald-50">
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
              <Ionicons name="flower" size={20} color="#047857" />
              <Text className="ml-2 text-2xl font-extrabold text-emerald-900">
                Gratitud
              </Text>
            </View>

            <Text className="text-sm font-semibold text-emerald-700">
              Escribe hasta 3 cosas bonitas de tu día
            </Text>

              {loading ? (
                <View className="mt-6 items-center rounded-3xl border-2 border-emerald-200 bg-white p-6">
                  <MochiCharacter mood="thinking" size={88} />
                  <Text className="mt-3 text-sm font-semibold text-emerald-800">
                    Cargando diario...
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
                    onPress={() => void loadGratitudeData()}
                  >
                    <Text className="font-extrabold text-white">
                      Reintentar
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View className="mt-6 rounded-3xl border-2 border-emerald-200 bg-white p-4">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-lg font-extrabold text-emerald-900">
                        Registro de hoy
                      </Text>
                      {todayEntry && !editingToday && (
                        <TouchableOpacity
                          className="rounded-full bg-emerald-100 px-3 py-1"
                          onPress={() => setEditingToday(true)}
                        >
                          <Text className="text-xs font-extrabold text-emerald-800">
                            Editar
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {showEditor ? (
                      <>
                        <View className="mt-4">
                          <Text className="mb-2 text-sm font-bold text-emerald-900">
                            Cosa 1
                          </Text>
                          <TextInput
                            className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-slate-800"
                            placeholder="Algo lindo de hoy"
                            placeholderTextColor="#6ee7b7"
                            value={entry1}
                            onChangeText={setEntry1}
                          />
                        </View>

                        <View className="mt-4">
                          <Text className="mb-2 text-sm font-bold text-emerald-900">
                            Cosa 2 (opcional)
                          </Text>
                          <TextInput
                            className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-slate-800"
                            placeholder="Otra cosa que agradeces"
                            placeholderTextColor="#6ee7b7"
                            value={entry2}
                            onChangeText={setEntry2}
                          />
                        </View>

                        <View className="mt-4">
                          <Text className="mb-2 text-sm font-bold text-emerald-900">
                            Cosa 3 (opcional)
                          </Text>
                          <TextInput
                            className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-slate-800"
                            placeholder="Una más para cerrar el día"
                            placeholderTextColor="#6ee7b7"
                            value={entry3}
                            onChangeText={setEntry3}
                          />
                        </View>

                        <TouchableOpacity
                          className="mt-5 items-center rounded-2xl bg-emerald-500 py-3"
                          onPress={() => void handleSaveGratitude()}
                          disabled={saving}
                        >
                          <Text className="font-extrabold text-white">
                            {saving ? "Guardando..." : "Guardar gratitud"}
                          </Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <View className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                        <Text className="text-sm font-semibold text-emerald-900">
                          1. {todayEntry.entry_1}
                        </Text>
                        {todayEntry.entry_2 ? (
                          <Text className="mt-2 text-sm font-semibold text-emerald-900">
                            2. {todayEntry.entry_2}
                          </Text>
                        ) : null}
                        {todayEntry.entry_3 ? (
                          <Text className="mt-2 text-sm font-semibold text-emerald-900">
                            3. {todayEntry.entry_3}
                          </Text>
                        ) : null}
                      </View>
                    )}
                  </View>

                  <View className="mt-6">
                    <Text className="text-lg font-extrabold text-emerald-900">
                      Últimos 5 registros
                    </Text>

                    {history.length === 0 ? (
                      <View className="mt-3 items-center rounded-3xl border-2 border-emerald-200 bg-white p-6">
                        <MochiCharacter mood="happy" size={76} />
                        <Text className="mt-3 text-center text-sm font-semibold text-emerald-800">
                          Tu diario está vacío por ahora. Empieza hoy.
                        </Text>
                      </View>
                    ) : (
                      <View className="mt-3">
                        {history.map((entry) => (
                          <View
                            key={entry.id}
                            className="mb-3 rounded-2xl border-2 border-emerald-200 bg-white p-4"
                          >
                            <Text className="text-xs font-extrabold uppercase text-emerald-700">
                              {formatDate(entry.logged_date)}
                            </Text>
                            <Text className="mt-2 text-sm font-semibold text-emerald-900">
                              1. {entry.entry_1}
                            </Text>
                            {entry.entry_2 ? (
                              <Text className="mt-1 text-sm font-semibold text-emerald-900">
                                2. {entry.entry_2}
                              </Text>
                            ) : null}
                            {entry.entry_3 ? (
                              <Text className="mt-1 text-sm font-semibold text-emerald-900">
                                3. {entry.entry_3}
                              </Text>
                            ) : null}
                          </View>
                        ))}
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

export default GratitudeScreen;
