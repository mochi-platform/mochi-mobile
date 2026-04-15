import { useMemo, useState } from "react";
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
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { supabase } from "@/src/shared/lib/supabase";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import TimePickerModal from "@/src/shared/components/TimePickerModal";
import {
  requestNotificationPermissions,
  saveNotificationPrefs,
  scheduleMorningReminder,
} from "@/src/shared/lib/notifications";

type Step = "profile" | "modules";

type ModuleOption = {
  key: string;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  iconColor: string;
  borderColor: string;
  selectedBg: string;
  defaultEnabled: boolean;
  editable?: boolean;
};

const moduleOptions: ModuleOption[] = [
  {
    key: "study_enabled",
    label: "Estudio",
    description: "Horario semanal, bloques de estudio y timer",
    icon: "book-outline",
    color: "bg-indigo-100",
    iconColor: "#4338ca",
    borderColor: "border-indigo-300",
    selectedBg: "bg-indigo-100",
    defaultEnabled: true,
  },
  {
    key: "exercise_enabled",
    label: "Ejercicio",
    description: "Rutinas personalizadas y seguimiento de entrenos",
    icon: "barbell-outline",
    color: "bg-teal-100",
    iconColor: "#0d9488",
    borderColor: "border-teal-300",
    selectedBg: "bg-teal-100",
    defaultEnabled: true,
  },
  {
    key: "habits_enabled",
    label: "Hábitos",
    description: "Seguimiento diario de tus hábitos y rachas",
    icon: "leaf-outline",
    color: "bg-emerald-100",
    iconColor: "#047857",
    borderColor: "border-emerald-300",
    selectedBg: "bg-emerald-100",
    defaultEnabled: true,
  },
  {
    key: "cooking_enabled",
    label: "Cocina",
    description: "Recetas con IA y modo cocina paso a paso",
    icon: "restaurant-outline",
    color: "bg-orange-100",
    iconColor: "#c2410c",
    borderColor: "border-orange-300",
    selectedBg: "bg-orange-100",
    defaultEnabled: true,
  },
  {
    key: "goals_enabled",
    label: "Metas",
    description: "Define objetivos y visualiza tu progreso",
    icon: "flag-outline",
    color: "bg-pink-100",
    iconColor: "#be185d",
    borderColor: "border-pink-300",
    selectedBg: "bg-pink-100",
    defaultEnabled: true,
  },
  {
    key: "mood_enabled",
    label: "Estado de ánimo",
    description: "Check-in emocional diario en segundos",
    icon: "heart-outline",
    color: "bg-rose-100",
    iconColor: "#e11d48",
    borderColor: "border-rose-300",
    selectedBg: "bg-rose-100",
    defaultEnabled: false,
  },
  {
    key: "gratitude_enabled",
    label: "Gratitud",
    description: "Diario de gratitud para cerrar el día",
    icon: "flower-outline",
    color: "bg-purple-100",
    iconColor: "#7c3aed",
    borderColor: "border-purple-300",
    selectedBg: "bg-purple-100",
    defaultEnabled: false,
  },
  {
    key: "vouchers_enabled",
    label: "Vales",
    description:
      "Disponible cuando funciones de pareja esté habilitado por administración",
    icon: "ticket-outline",
    color: "bg-yellow-100",
    iconColor: "#92400e",
    borderColor: "border-yellow-300",
    selectedBg: "bg-yellow-100",
    defaultEnabled: false,
    editable: false,
  },
];

export function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>("profile");
  const [fullName, setFullName] = useState("");
  const [wakeUpTime, setWakeUpTime] = useState("05:20");
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedModules, setSelectedModules] = useState<Set<string>>(
    new Set(moduleOptions.filter((m) => m.defaultEnabled).map((m) => m.key)),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formIsValid = useMemo(() => fullName.trim().length > 1, [fullName]);

  const toggleModule = (key: string) => {
    const module = moduleOptions.find((item) => item.key === key);
    if (!module || module.editable === false) {
      return;
    }

    setSelectedModules((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleProfileNext = () => {
    if (fullName.trim().length < 2) {
      setError("Escribe tu nombre completo para continuar");
      return;
    }
    setError(null);
    setStep("modules");
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(userError?.message ?? "No se encontró sesión activa");
      }

      // Guardar perfil
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          wake_up_time: wakeUpTime,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Guardar ajustes de módulos
      const modulePayload = {
        user_id: user.id,
        study_enabled: selectedModules.has("study_enabled"),
        exercise_enabled: selectedModules.has("exercise_enabled"),
        habits_enabled: selectedModules.has("habits_enabled"),
        cooking_enabled: selectedModules.has("cooking_enabled"),
        goals_enabled: selectedModules.has("goals_enabled"),
        mood_enabled: selectedModules.has("mood_enabled"),
        gratitude_enabled: selectedModules.has("gratitude_enabled"),
        notes_enabled: true,
      };

      const { error: settingsError } = await supabase
        .from("user_settings")
        .upsert(modulePayload, { onConflict: "user_id" });

      if (settingsError) throw settingsError;

      // Notificaciones
      const permissionStatus = await requestNotificationPermissions();
      if (permissionStatus === "granted") {
        await saveNotificationPrefs({
          enabled: true,
          morningEnabled: true,
          studyEnabled: true,
          habitEnabled: true,
        });
        await scheduleMorningReminder(wakeUpTime);
      }

      router.replace("/");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No se pudo guardar tu perfil",
      );
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 1: Perfil ───────────────────────────────────────────────────────

  if (step === "profile") {
    return (
      <SafeAreaView className="flex-1 bg-teal-100" edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            className="flex-1 px-6 pt-10"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          >
            <View className="absolute right-10 top-4 h-12 w-12 items-center justify-center rounded-2xl bg-yellow-200">
              <Ionicons name="star" size={22} />
            </View>

            <View className="mb-5 items-center">
              <MochiCharacter mood="excited" size={90} />
              <Text className="mt-3 text-sm font-semibold text-teal-700">
                Estoy lista para acompañarte hoy
              </Text>
            </View>

            <View className="mb-6">
              <Text className="text-4xl font-extrabold text-teal-900">
                Bienvenida a Mochi
              </Text>
              <Text className="mt-2 text-lg font-semibold text-teal-700">
                Configuremos tu perfil
              </Text>
            </View>

            {/* Indicador de pasos */}
            <View className="mb-5 flex-row items-center justify-center gap-2">
              <View className="h-2 w-8 rounded-full bg-teal-500" />
              <View className="h-2 w-8 rounded-full bg-teal-200" />
            </View>

            <View className="rounded-3xl border-2 border-teal-200 bg-white/80 p-5">
              <Text className="text-sm font-bold text-teal-900">
                ¿Cuál es tu nombre?
              </Text>
              <TextInput
                className="mt-2 rounded-3xl border-2 border-teal-200 bg-white px-4 py-4 text-base text-teal-900"
                placeholder="Tu nombre bonito"
                value={fullName}
                onChangeText={setFullName}
                editable={!loading}
                maxLength={60}
              />

              <Text className="mt-4 text-sm font-bold text-teal-900">
                ¿A qué hora despiertas?
              </Text>
              <TouchableOpacity
                className="mt-2 rounded-3xl border-2 border-teal-200 bg-white px-4 py-4"
                onPress={() => setShowTimePicker(true)}
                disabled={loading}
              >
                <Text className="text-center text-2xl font-extrabold text-teal-900">
                  {wakeUpTime}
                </Text>
              </TouchableOpacity>

              {error ? (
                <Text className="mt-3 text-sm text-red-600">{error}</Text>
              ) : null}

              <TouchableOpacity
                className="mt-5 flex-row items-center justify-center rounded-3xl bg-teal-500 px-4 py-4 disabled:opacity-60"
                disabled={!formIsValid}
                onPress={handleProfileNext}
              >
                <Text className="text-base font-extrabold text-white">
                  Continuar
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color="white"
                  style={{ marginLeft: 6 }}
                />
              </TouchableOpacity>
            </View>

            <View className="mt-5 rounded-3xl border border-teal-200 bg-white/70 p-4">
              <Text className="text-center text-sm text-teal-800">
                Puedes cambiar estos datos luego desde Ajustes.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        <TimePickerModal
          visible={showTimePicker}
          time={wakeUpTime}
          label="Hora de despertar"
          onConfirm={(time) => {
            setWakeUpTime(time);
            setShowTimePicker(false);
          }}
          onCancel={() => setShowTimePicker(false)}
        />
      </SafeAreaView>
    );
  }

  // ─── Step 2: Módulos ──────────────────────────────────────────────────────

  return (
    <SafeAreaView className="flex-1 bg-purple-50" edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          className="flex-1 px-6 pt-8"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        >
          <View className="mb-5 items-center">
            <MochiCharacter mood="happy" size={80} />
          </View>

          <View className="mb-4">
            <Text className="text-3xl font-extrabold text-purple-900">
              ¿Qué módulos quieres?
            </Text>
            <Text className="mt-2 text-sm font-semibold text-purple-600">
              Elige los que mejor se adapten a ti. Puedes cambiarlos cuando
              quieras.
            </Text>
          </View>

          {/* Indicador de pasos */}
          <View className="mb-5 flex-row items-center justify-center gap-2">
            <View className="h-2 w-8 rounded-full bg-purple-300" />
            <View className="h-2 w-8 rounded-full bg-purple-600" />
          </View>

          <View className="gap-3">
            {moduleOptions.map((module) => {
              const isSelected = selectedModules.has(module.key);
              const isReadOnly = module.editable === false;
              return (
                <TouchableOpacity
                  key={module.key}
                  className={`flex-row items-center rounded-2xl border-2 p-4 ${
                    isSelected
                      ? `${module.borderColor} ${module.selectedBg}`
                      : "border-slate-200 bg-white"
                  }`}
                  onPress={() => toggleModule(module.key)}
                  activeOpacity={0.85}
                  disabled={isReadOnly}
                >
                  <View
                    className={`mr-4 h-11 w-11 items-center justify-center rounded-xl ${
                      isSelected ? "bg-white" : "bg-slate-100"
                    }`}
                  >
                    <Ionicons
                      name={module.icon}
                      size={22}
                      color={isSelected ? module.iconColor : "#94a3b8"}
                    />
                  </View>
                  <View className="flex-1">
                    <Text
                      className={`text-sm font-extrabold ${
                        isSelected ? "text-slate-900" : "text-slate-500"
                      }`}
                    >
                      {module.label}
                    </Text>
                    <Text
                      className={`mt-0.5 text-xs font-semibold ${
                        isSelected ? "text-slate-600" : "text-slate-400"
                      }`}
                    >
                      {module.description}
                    </Text>
                    {isReadOnly ? (
                      <Text className="mt-1 text-[11px] font-bold text-amber-700">
                        Solo informativo
                      </Text>
                    ) : null}
                  </View>
                  <View
                    className={`h-6 w-6 items-center justify-center rounded-full border-2 ${
                      isSelected
                        ? "border-purple-500 bg-purple-500"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {isSelected && !isReadOnly ? (
                      <Ionicons name="checkmark" size={14} color="white" />
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View className="mt-4 rounded-2xl border border-purple-200 bg-purple-100 p-3">
            <Text className="text-center text-xs font-semibold text-purple-700">
              {selectedModules.size === 0
                ? "Selecciona al menos un módulo"
                : `${selectedModules.size} módulo${selectedModules.size !== 1 ? "s" : ""} seleccionado${selectedModules.size !== 1 ? "s" : ""}`}
            </Text>
          </View>

          {error ? (
            <View className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-3">
              <Text className="text-center text-sm font-semibold text-red-600">
                {error}
              </Text>
            </View>
          ) : null}

          <View className="mt-5 flex-row gap-3">
            <TouchableOpacity
              className="h-14 w-14 items-center justify-center rounded-2xl border-2 border-purple-200 bg-white"
              onPress={() => setStep("profile")}
              disabled={loading}
            >
              <Ionicons name="chevron-back" size={22} color="#7c3aed" />
            </TouchableOpacity>

            <TouchableOpacity
              className={`flex-1 items-center justify-center rounded-2xl py-4 ${
                selectedModules.size > 0 && !loading
                  ? "bg-purple-600"
                  : "bg-purple-300"
              }`}
              onPress={() => void handleConfirm()}
              disabled={selectedModules.size === 0 || loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-base font-extrabold text-white">
                  ¡Empezar con Mochi!
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default OnboardingScreen;
