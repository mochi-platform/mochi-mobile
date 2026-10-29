import { COLORS } from "@/src/shared/theme/tokens";
import { reportError } from "@/src/shared/lib/observability/reportError";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { router } from "expo-router";
import * as Calendar from "expo-calendar/legacy";
import { supabase } from "@/src/shared/lib/supabase";
import { useSession } from "@/src/core/providers/SessionContext";
import { useCycle } from "@/src/core/providers/CycleContext";
import { TimePickerModal } from "@/src/shared/components/TimePickerModal";
import { suggestStudyDuration } from "@/src/shared/lib/ai";
import { useCustomAlert } from "@/src/shared/components/CustomAlert";
import {
  createDeviceCalendarEvent,
  getDateFromISOAndTime,
  getNextDateForWeekday,
} from "@/src/shared/lib/deviceCalendar";
import { toLocalISODate } from "@/src/shared/lib/dates";
import {
  Button,
  Caption,
  IconTile,
  Input,
  Screen,
  SectionHeader,
  Strong,
  Surface,
  Toggle,
} from "@/src/shared/ui";
import { ColorSwatches, DayChips, TimeRange } from "@/src/features/study/components/BlockFormParts";

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
      <Screen
        title="Nuevo bloque"
        subtitle="Un horario fijo en tu semana."
        withTabBar={false}
        closable
        keyboard
      >
        <Input
          label="Materia"
          placeholder="Ejemplo: Cálculo"
          value={subject}
          onChangeText={setSubject}
          editable={!loading}
        />
        <Caption className="-mt-1 ml-1">
          Sé específica: «Cálculo» es mejor que «Matemáticas».
        </Caption>

        <SectionHeader title="Día de la semana" />
        <DayChips value={dayOfWeek} onChange={setDayOfWeek} />

        <SectionHeader title="Horario" />
        <Surface className="p-4">
          <TimeRange
            start={startTime}
            end={endTime}
            onPressStart={() => setShowStartPicker(true)}
            onPressEnd={() => setShowEndPicker(true)}
          />
          <View className="mt-3">
            <Button
              title="Sugerir duración con IA"
              variant="soft"
              icon="sparkles"
              loading={aiLoading}
              disabled={!subject.trim()}
              onPress={() => void handleAISuggestDuration()}
            />
          </View>
        </Surface>

        <SectionHeader title="Según tu energía" />
        <Surface className="p-4">
          <View className="flex-row items-center gap-3">
            <IconTile icon="flash" tint="me" />
            <View className="min-w-0 flex-1">
              <Strong>{energySuggestion.title}</Strong>
              <Caption className="mt-0.5">{energySuggestion.subtitle}</Caption>
            </View>
            {energyLoading || cycleLoading ? (
              <ActivityIndicator size="small" color={COLORS.accent} />
            ) : null}
          </View>
          {energyError ? <Caption className="mt-2 text-danger">{energyError}</Caption> : null}
          <View className="mt-3">
            <Button
              title={`Usar ${energySuggestion.minutes} minutos`}
              variant="soft"
              onPress={applyEnergyPlan}
            />
          </View>
        </Surface>

        <SectionHeader title="Color" />
        <ColorSwatches value={color} onChange={setColor} />

        <Surface className="mt-6 px-4 py-2">
          <Toggle
            label="Agregar a mi calendario"
            description="Crea un evento semanal en el calendario del teléfono."
            value={addToCalendar}
            onValueChange={setAddToCalendar}
          />
        </Surface>

        <View className="mt-6">
          <Button title="Crear bloque" loading={loading} onPress={() => void handleCreate()} />
        </View>
      </Screen>

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
      {AlertComponent}
    </>
  );
}

export default CreateStudyBlockScreen;
