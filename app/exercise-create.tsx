import { reportError } from "@/src/shared/lib/observability/reportError";
import { tc } from "@/src/shared/theme/colors";
import { useState } from "react";
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
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/src/shared/lib/supabase";
import { useSession } from "@/src/core/providers/SessionContext";
import { suggestExerciseDescription } from "@/src/shared/lib/ai";
import { useCustomAlert } from "@/src/shared/components/CustomAlert";
import { IconCtaButton } from "@/src/shared/components/IconCtaButton";

export function CreateExerciseScreen() {
  const insets = useSafeAreaInsets();
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
    <SafeAreaView className="flex-1 bg-tint-ok">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          className="flex-1 bg-tint-ok"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        >
          <View className="px-5 py-6">
            {/* Header */}
            <TouchableOpacity onPress={handleGoBack} className="mb-4 flex-row items-center">
              <Ionicons name="chevron-back" size={24} color={tc("#0d9488")} />
              <Text className="ml-2 text-lg font-bold text-positive">Volver</Text>
            </TouchableOpacity>

            <Text className="text-3xl font-extrabold text-positive">Nuevo ejercicio</Text>
            <Text className="mt-1 text-sm font-semibold text-positive">
              Añade un ejercicio personalizado a tu banco
            </Text>

            {/* Exercise name */}
            <View className="mt-6 rounded-3xl bg-surface p-4">
              <Text className="text-sm font-bold text-positive">Nombre del ejercicio</Text>
              <TextInput
                className="mt-2 rounded-2xl bg-surface-muted px-4 py-3 text-base text-positive"
                placeholder="Ejemplo: Flexiones"
                value={name}
                onChangeText={setName}
                editable={!loading}
              />
            </View>

            {/* AI Description suggestion */}
            <View className="mt-4 rounded-3xl bg-surface p-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-bold text-positive">Sugerencias con IA</Text>
                {aiDescription && (
                  <View className="flex-row items-center gap-1 rounded-full bg-tint-ok px-3 py-1">
                    <Ionicons name="checkmark-circle" size={14} color={tc("#059669")} />
                    <Text className="text-xs font-bold text-positive">Aplicable</Text>
                  </View>
                )}
              </View>

              <IconCtaButton
                label="Obtener sugerencias"
                onPress={handleAISuggest}
                iconName="sparkles"
                iconColor={tc("#0d9488")}
                iconSize={16}
                loading={aiLoading}
                loadingColor={tc("#0d9488")}
                disabled={!name.trim()}
                containerClassName="mt-3 w-full rounded-2xl bg-gradient-to-r from-yellow-100 to-yellow-50 py-3"
                textClassName="text-positive"
              />

              {aiDescription && (
                <View className="mt-3 rounded-2xl bg-surface-muted p-3">
                  <Text className="text-xs font-semibold text-positive">Descripción sugerida:</Text>
                  <Text className="mt-1 text-sm font-semibold text-positive">{aiDescription}</Text>
                </View>
              )}
            </View>

            {/* Sets, reps, duration */}
            <View className="mt-4 rounded-3xl bg-surface p-4">
              <Text className="text-sm font-bold text-positive">Configuración</Text>

              <View className="mt-3 flex-row gap-3">
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-positive">Series</Text>
                  <TextInput
                    className="mt-2 rounded-2xl bg-surface-muted px-4 py-3 text-center text-base font-bold text-positive"
                    keyboardType="number-pad"
                    value={sets}
                    onChangeText={setSets}
                    editable={!loading}
                  />
                </View>

                <View className="flex-1">
                  <Text className="text-xs font-semibold text-positive">Repeticiones</Text>
                  <TextInput
                    className="mt-2 rounded-2xl bg-surface-muted px-4 py-3 text-center text-base font-bold text-positive"
                    keyboardType="number-pad"
                    value={reps}
                    onChangeText={setReps}
                    editable={!loading}
                  />
                </View>

                <View className="flex-1">
                  <Text className="text-xs font-semibold text-positive">Segundos</Text>
                  <TextInput
                    className="mt-2 rounded-2xl bg-surface-muted px-4 py-3 text-center text-base font-bold text-positive"
                    keyboardType="number-pad"
                    value={duration}
                    onChangeText={setDuration}
                    editable={!loading}
                  />
                </View>
              </View>
            </View>

            {/* Notes */}
            <View className="mt-4 rounded-3xl bg-surface p-4">
              <Text className="text-sm font-bold text-positive">Notas (descripción completa)</Text>
              <TextInput
                className="mt-2 min-h-20 rounded-2xl bg-surface-muted px-4 py-3 text-base text-positive"
                placeholder="Cómo hacerlo, posición correcta, respiración, etc."
                value={notes}
                onChangeText={setNotes}
                multiline
                editable={!loading}
                textAlignVertical="top"
              />
            </View>

            {/* Create button */}
            <TouchableOpacity
              className="mt-8 rounded-2xl bg-positive py-4 disabled:opacity-60"
              onPress={handleCreate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="large" color="white" />
              ) : (
                <Text className="text-center text-lg font-extrabold text-white">
                  Crear ejercicio
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      {AlertComponent}
    </SafeAreaView>
  );
}

export default CreateExerciseScreen;
