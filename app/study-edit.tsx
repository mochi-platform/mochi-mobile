import { useCallback, useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { TimePickerModal } from "@/src/shared/components/TimePickerModal";
import { useCustomAlert } from "@/src/shared/components/CustomAlert";
import { useSession } from "@/src/core/providers/SessionContext";
import { supabase } from "@/src/shared/lib/supabase";
import { ColorSwatches, DayChips, TimeRange } from "@/src/features/study/components/BlockFormParts";
import {
  Button,
  ErrorState,
  Input,
  Screen,
  SectionHeader,
  Skeleton,
  Surface,
} from "@/src/shared/ui";

export function EditStudyBlockScreen() {
  const { blockId } = useLocalSearchParams<{ blockId?: string | string[] }>();
  const { session } = useSession();
  const { showAlert, AlertComponent } = useCustomAlert();

  const [subject, setSubject] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:30");
  const [color, setColor] = useState("pink");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const resolvedBlockId = Array.isArray(blockId) ? blockId[0] : blockId;

  const loadBlock = useCallback(async () => {
    const userId = session?.user.id;

    if (!userId || !resolvedBlockId) {
      setError("No se encontró el bloque para editar");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("study_blocks")
        .select("subject, day_of_week, start_time, end_time, color")
        .eq("id", resolvedBlockId)
        .eq("user_id", userId)
        .single();

      if (fetchError) throw fetchError;

      setSubject(data.subject);
      setDayOfWeek(data.day_of_week);
      setStartTime(data.start_time);
      setEndTime(data.end_time);
      setColor(data.color);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el bloque");
    } finally {
      setLoading(false);
    }
  }, [resolvedBlockId, session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      void loadBlock();
    }, [loadBlock]),
  );

  const handleSave = async () => {
    const userId = session?.user.id;

    if (!userId || !resolvedBlockId) {
      showAlert({
        title: "Error",
        message: "No se encontró el bloque para actualizar",
        buttons: [{ text: "Aceptar", style: "cancel" }],
      });
      return;
    }

    if (!subject.trim()) {
      showAlert({
        title: "Error",
        message: "Por favor ingresa la materia",
        buttons: [{ text: "Aceptar", style: "cancel" }],
      });
      return;
    }

    try {
      setSaving(true);

      const { error: updateError } = await supabase
        .from("study_blocks")
        .update({
          subject: subject.trim(),
          day_of_week: dayOfWeek,
          start_time: startTime,
          end_time: endTime,
          color,
        })
        .eq("id", resolvedBlockId)
        .eq("user_id", userId);

      if (updateError) throw updateError;

      showAlert({
        title: "Bloque actualizado",
        message: "Tus cambios se guardaron correctamente.",
        buttons: [
          {
            text: "Aceptar",
            onPress: () => router.back(),
          },
        ],
      });
    } catch (err) {
      showAlert({
        title: "Error",
        message: err instanceof Error ? err.message : "No se pudo actualizar el bloque",
        buttons: [{ text: "Entendido", style: "destructive" }],
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Screen
        title="Editar bloque"
        subtitle="Ajusta materia, horario y color."
        withTabBar={false}
        closable
        keyboard
      >
        {loading ? (
          <View className="mt-4 gap-3">
            <Skeleton height={80} className="rounded-card" />
            <Skeleton height={120} className="rounded-card" />
          </View>
        ) : error ? (
          <ErrorState message={error} onRetry={() => void loadBlock()} />
        ) : (
          <>
            <Input
              label="Materia"
              placeholder="Ejemplo: Cálculo"
              value={subject}
              onChangeText={setSubject}
              editable={!saving}
            />

            <SectionHeader title="Día de la semana" />
            <DayChips value={dayOfWeek} onChange={setDayOfWeek} />

            <SectionHeader title="Horario" />
            <Surface className="p-4">
              <TimeRange
                start={startTime}
                end={endTime}
                onPressStart={() => setShowStartPicker(true)}
                onPressEnd={() => setShowEndPicker(true)}
                disabled={saving}
              />
            </Surface>

            <SectionHeader title="Color" />
            <ColorSwatches value={color} onChange={setColor} disabled={saving} />

            <View className="mt-8">
              <Button title="Guardar cambios" loading={saving} onPress={() => void handleSave()} />
            </View>
          </>
        )}
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

export default EditStudyBlockScreen;
