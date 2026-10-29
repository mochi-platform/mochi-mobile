import { reportError } from "@/src/shared/lib/observability/reportError";
import { useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "@/src/shared/lib/supabase";
import { useSession } from "@/src/core/providers/SessionContext";
import { suggestExerciseDescription } from "@/src/shared/lib/ai";
import { useCustomAlert } from "@/src/shared/components/CustomAlert";
import {
  Button,
  Caption,
  IconTile,
  Input,
  MochiQuote,
  Screen,
  SectionHeader,
  Strong,
  Surface,
} from "@/src/shared/ui";

export function CreateExerciseScreen() {
  const { session } = useSession();
  const { showAlert, AlertComponent } = useCustomAlert();
  const params = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const [name, setName] = useState("");
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("10");
  const [duration, setDuration] = useState("60");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDescription, setAiDescription] = useState("");

  const returnTo = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo;

  const handleGoBack = () => {
    if (returnTo && returnTo.startsWith("/")) {
      router.replace(returnTo as Parameters<typeof router.replace>[0]);
      return;
    }

    router.back();
  };

  const handleAISuggest = async () => {
    if (!name.trim()) {
      showAlert({
        title: "Por favor",
        message: "Primero ingresa el nombre del ejercicio",
        buttons: [{ text: "Aceptar" }],
      });
      return;
    }

    setAiLoading(true);
    try {
      const suggestion = await suggestExerciseDescription(name);
      setAiDescription(suggestion.description);
      setDuration(String(suggestion.estimatedDuration || 60));
      setNotes(suggestion.description);
    } catch (error) {
      reportError(error, { scope: "ExerciseCreate" });
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      showAlert({
        title: "Error",
        message: "Por favor ingresa el nombre del ejercicio",
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
      const { error } = await supabase.from("exercises").insert({
        user_id: session.user.id,
        name: name.trim(),
        sets: parseInt(sets) || 3,
        reps: parseInt(reps) || 10,
        duration_seconds: parseInt(duration) || 60,
        notes: notes.trim() || null,
      });

      if (error) throw error;

      showAlert({
        title: "¡Éxito!",
        message: "Ejercicio creado",
        buttons: [
          {
            text: "OK",
            onPress: handleGoBack,
          },
        ],
      });
    } catch (error) {
      showAlert({
        title: "Error",
        message: error instanceof Error ? error.message : "No se pudo crear el ejercicio",
        buttons: [{ text: "Entendido", style: "destructive" }],
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Screen
        title="Nuevo ejercicio"
        subtitle="Agrégalo a tu banco para usarlo en rutinas."
        withTabBar={false}
        closable
        onClose={handleGoBack}
        keyboard
      >
        <Input
          label="Nombre"
          placeholder="Ejemplo: Flexiones"
          value={name}
          onChangeText={setName}
          editable={!loading}
        />

        <Surface className="mt-2 p-4">
          <View className="flex-row items-center gap-3">
            <IconTile icon="sparkles" tint="me" />
            <View className="min-w-0 flex-1">
              <Strong>Ideas de Mochi</Strong>
              <Caption>Series, repeticiones y cómo hacerlo bien.</Caption>
            </View>
          </View>
          <View className="mt-3">
            <Button
              title="Sugerir con IA"
              variant="soft"
              icon="sparkles"
              loading={aiLoading}
              disabled={!name.trim()}
              onPress={() => void handleAISuggest()}
            />
          </View>
          {aiDescription ? (
            <MochiQuote className="mt-3 text-[15px] leading-[21px]">{aiDescription}</MochiQuote>
          ) : null}
        </Surface>

        <SectionHeader title="Configuración" />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Input
              label="Series"
              keyboardType="number-pad"
              value={sets}
              onChangeText={setSets}
              editable={!loading}
            />
          </View>
          <View className="flex-1">
            <Input
              label="Repeticiones"
              keyboardType="number-pad"
              value={reps}
              onChangeText={setReps}
              editable={!loading}
            />
          </View>
          <View className="flex-1">
            <Input
              label="Segundos"
              keyboardType="number-pad"
              value={duration}
              onChangeText={setDuration}
              editable={!loading}
            />
          </View>
        </View>

        <Input
          label="Cómo hacerlo (opcional)"
          placeholder="Posición, respiración, cuidados…"
          value={notes}
          onChangeText={setNotes}
          multiline
          editable={!loading}
          style={{ textAlignVertical: "top", minHeight: 96, paddingTop: 14 }}
        />

        <View className="mt-6">
          <Button title="Crear ejercicio" loading={loading} onPress={() => void handleCreate()} />
        </View>
      </Screen>
      {AlertComponent}
    </>
  );
}

export default CreateExerciseScreen;
