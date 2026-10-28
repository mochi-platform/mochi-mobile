import { COLORS } from "@/src/shared/theme/tokens";
import { reportError } from "@/src/shared/lib/observability/reportError";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as Calendar from "expo-calendar/legacy";
import { supabase } from "@/src/shared/lib/supabase";
import { useSession } from "@/src/core/providers/SessionContext";
import { useCycle } from "@/src/core/providers/CycleContext";
import { TimePickerModal } from "@/src/shared/components/TimePickerModal";
import { suggestStudyDuration } from "@/src/shared/lib/ai";
import { useCustomAlert } from "@/src/shared/components/CustomAlert";
import { IconCtaButton } from "@/src/shared/components/IconCtaButton";
import {
  createDeviceCalendarEvent,
  getDateFromISOAndTime,
  getNextDateForWeekday,
} from "@/src/shared/lib/deviceCalendar";
import { toLocalISODate } from "@/src/shared/lib/dates";

const daysOfWeek = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
];

const colors = [
  { value: "pink", label: "Rosa", hex: "#fce7f3" },
  { value: "blue", label: "Azul", hex: "#dbeafe" },
  { value: "yellow", label: "Amarillo", hex: "#fef3c7" },
  { value: "teal", label: "Turquesa", hex: "#ccfbf1" },
  { value: "purple", label: "Púrpura", hex: "#e9d5ff" },
  { value: "green", label: "Verde", hex: "#dcfce7" },
];

type EnergyMode = "baja" | "media" | "alta";

type EnergySuggestion = {
  mode: EnergyMode;
  minutes: number;
  title: string;
  subtitle: string;
};

function normalizeTimeValue(value: string): string {
  const [hoursRaw = "0", minutesRaw = "0"] = value.split(":");
  const hours = Number.parseInt(hoursRaw, 10);
  const minutes = Number.parseInt(minutesRaw, 10);

  const safeHours = Number.isFinite(hours) ? Math.max(0, Math.min(23, hours)) : 0;
  const safeMinutes = Number.isFinite(minutes) ? Math.max(0, Math.min(59, minutes)) : 0;

  return `${String(safeHours).padStart(2, "0")}:${String(safeMinutes).padStart(2, "0")}`;
}

function addMinutesToTime(baseTime: string, minutesToAdd: number): string {
  const [hoursRaw = "0", minutesRaw = "0"] = baseTime.split(":");
  const hours = Number.parseInt(hoursRaw, 10);
  const minutes = Number.parseInt(minutesRaw, 10);

  const totalMinutes =
    (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
  const wrapped = (((totalMinutes + minutesToAdd) % (24 * 60)) + 24 * 60) % (24 * 60);

  return `${String(Math.floor(wrapped / 60)).padStart(2, "0")}:${String(wrapped % 60).padStart(2, "0")}`;
}

function getEnergyTemplate(mode: EnergyMode): {
  minutes: number;
  title: string;
} {
  if (mode === "baja") {
    return { minutes: 25, title: "Baja energía" };
  }

  if (mode === "alta") {
    return { minutes: 75, title: "Alta energía" };
  }

  return { minutes: 45, title: "Media energía" };
}

export function CreateStudyBlockScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const { cycleData, loading: cycleLoading } = useCycle();
  const { showAlert, AlertComponent } = useCustomAlert();
  const [subject, setSubject] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:30");
  const [color, setColor] = useState("pink");
  const [loading, setLoading] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [addToCalendar, setAddToCalendar] = useState(true);
  const [moodValue, setMoodValue] = useState<number | null>(null);
  const [energyLoading, setEnergyLoading] = useState(false);
  const [energyError, setEnergyError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user.id) {
      setMoodValue(null);
      setEnergyError(null);
      setEnergyLoading(false);
      return;
    }

    void (async () => {
      try {
        setEnergyLoading(true);
        setEnergyError(null);

        const { data, error } = await supabase
          .from("mood_logs")
          .select("mood, logged_date")
          .eq("user_id", session.user.id)
          .order("logged_date", { ascending: false })
          .limit(1)
          .maybeSingle<{ mood: number | null }>();

        if (error) throw error;
        setMoodValue(typeof data?.mood === "number" ? data.mood : null);
      } catch (error) {
        setMoodValue(null);
        setEnergyError(
          error instanceof Error ? error.message : "No se pudieron cargar tus datos de energía",
        );
      } finally {
        setEnergyLoading(false);
      }
    })();
  }, [session?.user.id]);

  const energySuggestion = useMemo<EnergySuggestion>(() => {
    let score = 2;

    if (typeof moodValue === "number") {
      if (moodValue <= 2) score -= 1;
      else if (moodValue >= 4) score += 1;
    }

    if (cycleData?.phase === "menstrual") {
      score -= 1;
    } else if (cycleData?.phase === "folicular" || cycleData?.phase === "ovulatoria") {
      score += 1;
    }

    const mode: EnergyMode = score <= 1 ? "baja" : score >= 4 ? "alta" : "media";
    const template = getEnergyTemplate(mode);

    const moodText =
      typeof moodValue === "number"
        ? `Tu último ánimo fue ${moodValue}/5.`
        : "Sin registro reciente de ánimo.";

    const cycleText = cycleData?.phase
      ? `Fase de ciclo: ${cycleData.phase}.`
      : "Sin fase de ciclo disponible.";

    return {
      mode,
      minutes: template.minutes,
      title: template.title,
      subtitle: `${moodText} ${cycleText}`,
    };
  }, [cycleData?.phase, moodValue]);

  const applyEnergyPlan = () => {
    const nextEndTime = addMinutesToTime(normalizeTimeValue(startTime), energySuggestion.minutes);
    setEndTime(nextEndTime);
  };

  const handleAISuggestDuration = async () => {
    if (!subject.trim()) {
      showAlert({
        title: "Por favor",
        message: "Primero ingresa la materia",
        buttons: [{ text: "Aceptar" }],
      });
      return;
    }

    setAiLoading(true);
    try {
      const minutes = await suggestStudyDuration(subject);
      const nextEndTime = addMinutesToTime(normalizeTimeValue(startTime), minutes);
      setEndTime(nextEndTime);
    } catch (error) {
      reportError(error, { scope: "StudyCreate" });
      showAlert({
        title: "No se pudo generar sugerencia",
        message: "No logramos calcular una duración con IA en este momento. Intenta nuevamente.",
        buttons: [{ text: "Aceptar", style: "cancel" }],
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!subject.trim()) {
      showAlert({
        title: "Error",
        message: "Por favor ingresa la materia",
        buttons: [{ text: "Aceptar", style: "cancel" }],
      });
      return;
    }

    if (!session?.user.id) {
      showAlert({
        title: "Error",
        message: "Sesión no encontrada",
        buttons: [{ text: "Aceptar", style: "cancel" }],
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("study_blocks").insert({
        user_id: session.user.id,
        subject: subject.trim(),
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        color,
      });

      if (error) throw error;

      let calendarWarning: string | null = null;

      if (addToCalendar) {
        try {
          const nextStartDate = getNextDateForWeekday(dayOfWeek, startTime);
          const nextDateISO = toLocalISODate(nextStartDate);
          const nextEndDate = getDateFromISOAndTime(nextDateISO, endTime);

          if (nextEndDate.getTime() <= nextStartDate.getTime()) {
            nextEndDate.setDate(nextEndDate.getDate() + 1);
          }

          const recurrenceRule: Calendar.RecurrenceRule = {
            frequency: Calendar.Frequency.WEEKLY,
            interval: 1,
          };

          if (Platform.OS === "ios") {
            recurrenceRule.daysOfTheWeek = [
              {
                dayOfTheWeek: (dayOfWeek + 1) as Calendar.DayOfTheWeek,
              },
            ];
          }

          await createDeviceCalendarEvent({
            title: `Estudio: ${subject.trim()}`,
            startDate: nextStartDate,
            endDate: nextEndDate,
            notes: "Evento creado desde Mochi",
            recurrenceRule,
            alarmsMinutesBefore: [10],
          });
        } catch {
          calendarWarning = "El bloque se guardo, pero no pudimos exportarlo al calendario.";
        }
      }

      showAlert({
        title: "¡Éxito!",
        message: calendarWarning
          ? `Bloque de estudio creado.\n\n${calendarWarning}`
          : addToCalendar
            ? "Bloque de estudio creado y agregado a tu calendario"
            : "Bloque de estudio creado",
        buttons: [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ],
      });
    } catch (error) {
      showAlert({
        title: "Error",
        message: error instanceof Error ? error.message : "No se pudo crear el bloque",
        buttons: [{ text: "Entendido", style: "destructive" }],
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SafeAreaView className="flex-1 bg-tint-study">
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            className="flex-1 bg-tint-study"
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          >
            <View className="px-5 py-6">
              {/* Header */}
              <TouchableOpacity
                onPress={() => router.back()}
                className="mb-4 flex-row items-center"
              >
                <Ionicons name="chevron-back" size={24} color={COLORS.accent} />
                <Text className="ml-2 text-lg font-bold text-ink">Volver</Text>
              </TouchableOpacity>

              <Text className="text-3xl font-extrabold text-ink">Nuevo bloque de estudio</Text>
              <Text className="mt-1 text-sm font-semibold text-ink">
                Crea un bloque personalizado para tu horario
              </Text>

              {/* Subject input */}
              <View className="mt-6 rounded-3xl bg-surface p-4">
                <Text className="text-sm font-bold text-ink">Materia</Text>
                <TextInput
                  className="mt-2 rounded-2xl bg-surface-muted px-4 py-3 text-base text-ink"
                  placeholder="Ejemplo: Matemáticas"
                  value={subject}
                  onChangeText={setSubject}
                  editable={!loading}
                />
                <Text className="mt-2 text-xs font-semibold text-ink">
                  Sé específica: "Cálculo" es mejor que "Matemáticas"
                </Text>
              </View>

              {/* Day selector */}
              <View className="mt-4 rounded-3xl bg-surface p-4">
                <Text className="text-sm font-bold text-ink">Día de la semana</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="-mx-2 mt-3"
                >
                  {daysOfWeek.map((day) => (
                    <TouchableOpacity
                      key={day.value}
                      className={`mx-2 rounded-2xl px-4 py-2 ${dayOfWeek === day.value ? "bg-accent" : "bg-tint-study"}`}
                      onPress={() => setDayOfWeek(day.value)}
                    >
                      <Text
                        className={`font-bold ${dayOfWeek === day.value ? "text-white" : "text-ink"}`}
                      >
                        {day.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Time selectors */}
              <View className="mt-4 rounded-3xl bg-surface p-4">
                <Text className="text-sm font-bold text-ink">Horario</Text>

                <View className="mt-3 flex-row gap-3">
                  <View className="flex-1">
                    <Text className="text-xs font-semibold text-ink">Inicio</Text>
                    <TouchableOpacity
                      className="mt-2 rounded-2xl bg-surface-muted px-4 py-3"
                      onPress={() => setShowStartPicker(true)}
                    >
                      <Text className="text-center text-lg font-extrabold text-ink">
                        {startTime}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View className="items-center justify-center">
                    <Ionicons name="arrow-forward" size={20} color={COLORS.accent} />
                  </View>

                  <View className="flex-1">
                    <Text className="text-xs font-semibold text-ink">Fin</Text>
                    <TouchableOpacity
                      className="mt-2 rounded-2xl bg-surface-muted px-4 py-3"
                      onPress={() => setShowEndPicker(true)}
                    >
                      <Text className="text-center text-lg font-extrabold text-ink">{endTime}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* AI Duration suggestion */}
                <IconCtaButton
                  label="Sugerir duración con IA"
                  onPress={handleAISuggestDuration}
                  iconName="sparkles"
                  iconColor={COLORS.accent}
                  iconSize={16}
                  loading={aiLoading}
                  loadingColor={COLORS.accent}
                  disabled={!subject.trim()}
                  containerClassName="mt-4 w-full rounded-2xl bg-gradient-to-r from-yellow-100 to-yellow-50 py-3"
                  textClassName="text-ink"
                />
              </View>

              {/* Energy lab */}
              <View className="mt-4 rounded-3xl bg-surface p-4">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-bold text-ink">Laboratorio de energía</Text>
                  {energyLoading || cycleLoading ? (
                    <ActivityIndicator size="small" color={COLORS.accent} />
                  ) : null}
                </View>

                <Text className="mt-2 text-base font-extrabold text-ink">
                  Modo recomendado: {energySuggestion.title}
                </Text>
                <Text className="mt-1 text-xs font-semibold text-ink">
                  {energySuggestion.subtitle}
                </Text>

                {energyError ? (
                  <View className="mt-3 rounded-2xl bg-surface-muted p-3">
                    <Text className="text-xs font-semibold text-danger">{energyError}</Text>
                  </View>
                ) : null}

                <View className="mt-3 rounded-2xl bg-surface-muted p-3">
                  <Text className="text-xs font-bold text-ink">Plantilla aplicada</Text>
                  <Text className="mt-1 text-sm font-semibold text-ink">
                    {energySuggestion.minutes} minutos ({energySuggestion.mode})
                  </Text>
                </View>

                <TouchableOpacity
                  className="mt-3 items-center rounded-2xl bg-accent py-3 active:opacity-90"
                  onPress={applyEnergyPlan}
                >
                  <Text className="font-extrabold text-white">Aplicar plan recomendado</Text>
                </TouchableOpacity>
              </View>

              <View className="mt-4 rounded-3xl bg-surface p-4">
                <TouchableOpacity
                  className="flex-row items-center justify-between"
                  onPress={() => setAddToCalendar((prev) => !prev)}
                  activeOpacity={0.85}
                >
                  <View className="flex-1 pr-3">
                    <Text className="text-sm font-bold text-ink">Exportar al calendario</Text>
                    <Text className="mt-1 text-xs font-semibold text-ink">
                      Crea un evento semanal en tu calendario del dispositivo.
                    </Text>
                  </View>
                  <View
                    className={`h-7 w-7 items-center justify-center rounded-full ${addToCalendar ? "bg-accent" : "bg-tint-study"}`}
                  >
                    <Ionicons
                      name={addToCalendar ? "checkmark" : "remove"}
                      size={16}
                      color={addToCalendar ? "white" : COLORS.accent}
                    />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Color selector */}
              <View className="mt-4 rounded-3xl bg-surface p-4">
                <Text className="text-sm font-bold text-ink">Color</Text>
                <View className="mt-3 flex-row flex-wrap gap-2">
                  {colors.map((col) => (
                    <TouchableOpacity
                      key={col.value}
                      className={`min-w-[28%] flex-1 rounded-2xl border-4 py-3 ${color === col.value ? "" : "border-transparent"}`}
                      style={{ backgroundColor: col.hex }}
                      onPress={() => setColor(col.value)}
                    >
                      <Text className="text-center text-xs font-bold text-ink">{col.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Create button */}
              <TouchableOpacity
                className="mt-8 rounded-2xl bg-accent py-4 disabled:opacity-60"
                onPress={handleCreate}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="large" color="white" />
                ) : (
                  <Text className="text-center text-lg font-extrabold text-white">
                    Crear bloque de estudio
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Time pickers */}
            <TimePickerModal
              visible={showStartPicker}
              time={startTime}
              label="Hora de inicio"
              onConfirm={(time) => {
                setStartTime(time);
                setShowStartPicker(false);
              }}
              onCancel={() => setShowStartPicker(false)}
            />

            <TimePickerModal
              visible={showEndPicker}
              time={endTime}
              label="Hora de fin"
              onConfirm={(time) => {
                setEndTime(time);
                setShowEndPicker(false);
              }}
              onCancel={() => setShowEndPicker(false)}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      {AlertComponent}
    </>
  );
}

export default CreateStudyBlockScreen;
