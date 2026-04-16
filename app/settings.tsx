import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import TimePickerModal from "@/src/shared/components/TimePickerModal";
import { useCustomAlert } from "@/src/shared/components/CustomAlert";
import { useSession } from "@/src/core/providers/SessionContext";
import { supabase } from "@/src/shared/lib/supabase";
import {
  cancelAllNotifications,
  cancelAllStudyBlockReminders,
  cancelCookingReminder,
  cancelWeeklySummaryNotification,
  cancelHabitReminder,
  cancelMorningReminder,
  getNotificationPermissionStatus,
  loadNotificationPrefs,
  loadHabitNotificationMap,
  requestNotificationPermissions,
  scheduleHabitRemindersForHabits,
  scheduleWeeklySummaryNotification,
  saveNotificationPrefs,
  scheduleCookingReminder,
  scheduleMorningReminder,
  scheduleStudyBlockReminders,
  type NotificationPrefs,
} from "@/src/shared/lib/notifications";
import {
  getCycleLastSync,
  hasCyclePermissions,
  isHealthConnectAvailable,
  requestCyclePermissions,
  revokeCyclePermissions,
} from "@/src/shared/lib/healthConnect";
import type { StudyBlock, UserSettings } from "@/src/shared/types/database";

type HabitNotificationTarget = {
  id: string;
  name: string;
};

type ProfileSettings = {
  full_name: string | null;
  mochi_name: string | null;
  wake_up_time: string | null;
};

type ModuleToggleKey =
  | "partner_features_enabled"
  | "study_enabled"
  | "exercise_enabled"
  | "habits_enabled"
  | "goals_enabled"
  | "mood_enabled"
  | "gratitude_enabled"
  | "vouchers_enabled"
  | "cooking_enabled"
  | "notes_enabled";

type ModuleItem = {
  key: ModuleToggleKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const readOnlyModuleKeys: ModuleToggleKey[] = [
  "partner_features_enabled",
  "vouchers_enabled",
];

const moduleItems: ModuleItem[] = [
  { key: "study_enabled", label: "Estudio", icon: "book" },
  { key: "exercise_enabled", label: "Ejercicio", icon: "barbell" },
  { key: "habits_enabled", label: "Hábitos", icon: "leaf" },
  { key: "goals_enabled", label: "Metas", icon: "flag" },
  { key: "mood_enabled", label: "Estado de ánimo", icon: "heart" },
  { key: "gratitude_enabled", label: "Gratitud", icon: "flower" },
  { key: "vouchers_enabled", label: "Vales (pareja)", icon: "ticket" },
  { key: "cooking_enabled", label: "Cocina", icon: "restaurant" },
  {
    key: "notes_enabled",
    label: "Notas rápidas",
    icon: "document-text",
  },
];

const defaultModuleSettings: Pick<
  UserSettings,
  | "partner_features_enabled"
  | "study_enabled"
  | "exercise_enabled"
  | "habits_enabled"
  | "goals_enabled"
  | "mood_enabled"
  | "gratitude_enabled"
  | "vouchers_enabled"
  | "cooking_enabled"
  | "notes_enabled"
> = {
  partner_features_enabled: false,
  study_enabled: true,
  exercise_enabled: true,
  habits_enabled: true,
  goals_enabled: true,
  mood_enabled: true,
  gratitude_enabled: true,
  vouchers_enabled: false,
  cooking_enabled: true,
  notes_enabled: true,
};

function isValidTime(value: string): boolean {
  const validPattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return validPattern.test(value);
}

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const { showAlert, AlertComponent } = useCustomAlert();

  const [profile, setProfile] = useState<ProfileSettings>({
    full_name: "",
    mochi_name: "Mochi",
    wake_up_time: "",
  });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [moduleSettings, setModuleSettings] = useState(defaultModuleSettings);

  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>({
    enabled: false,
    morningEnabled: true,
    studyEnabled: true,
    habitEnabled: true,
    weeklyEnabled: false,
    habitTime: "21:00",
    cookingEnabled: false,
    cookingTime: "19:00",
  });
  const [permissionStatus, setPermissionStatus] =
    useState<string>("undetermined");
  const [showHabitTimePicker, setShowHabitTimePicker] = useState(false);
  const [showCookingTimePicker, setShowCookingTimePicker] = useState(false);
  const [studyBlocks, setStudyBlocks] = useState<StudyBlock[]>([]);
  const [habitTargets, setHabitTargets] = useState<HabitNotificationTarget[]>(
    [],
  );
  const [habitNotificationMap, setHabitNotificationMap] = useState<
    Record<string, boolean>
  >({});
  const [savingNotif, setSavingNotif] = useState(false);
  const [healthAvailable, setHealthAvailable] = useState(false);
  const [healthPermission, setHealthPermission] = useState(false);
  const [healthSyncing, setHealthSyncing] = useState(false);
  const [lastCycleSync, setLastCycleSync] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = session?.user.id;

  const loadSettings = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [
        profileRes,
        settingsRes,
        blocksRes,
        habitsRes,
        prefs,
        habitPrefs,
        permStatus,
        cycleAvailable,
        cyclePermission,
        cycleSync,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, mochi_name, wake_up_time")
          .eq("id", userId)
          .single(),
        supabase
          .from("user_settings")
          .select(
            "partner_features_enabled, study_enabled, exercise_enabled, habits_enabled, goals_enabled, mood_enabled, gratitude_enabled, vouchers_enabled, cooking_enabled, notes_enabled",
          )
          .eq("user_id", userId)
          .maybeSingle(),
        supabase.from("study_blocks").select("*").eq("user_id", userId),
        supabase
          .from("habits")
          .select("id, name")
          .eq("user_id", userId)
          .order("created_at", { ascending: true }),
        loadNotificationPrefs(),
        loadHabitNotificationMap(),
        getNotificationPermissionStatus(),
        isHealthConnectAvailable(),
        hasCyclePermissions(),
        getCycleLastSync(),
      ]);

      if (profileRes.error) throw profileRes.error;
      if (settingsRes.error) throw settingsRes.error;
      if (habitsRes.error) throw habitsRes.error;

      const profileData = profileRes.data as ProfileSettings | null;
      setProfile({
        full_name: profileData?.full_name ?? "",
        mochi_name: (profileData?.mochi_name ?? "").trim() || "Mochi",
        wake_up_time: profileData?.wake_up_time ?? "",
      });
      const mergedModuleSettings = {
        ...defaultModuleSettings,
        ...((settingsRes.data as Partial<
          typeof defaultModuleSettings
        > | null) ?? {}),
      };

      setModuleSettings({
        ...mergedModuleSettings,
        vouchers_enabled:
          mergedModuleSettings.partner_features_enabled &&
          mergedModuleSettings.vouchers_enabled,
      });
      setStudyBlocks((blocksRes.data as StudyBlock[] | null) ?? []);
      setHabitTargets(
        (habitsRes.data as HabitNotificationTarget[] | null) ?? [],
      );
      setNotifPrefs(prefs);
      setHabitNotificationMap(habitPrefs);
      setPermissionStatus(permStatus);
      setHealthAvailable(cycleAvailable);
      setHealthPermission(cyclePermission);
      setLastCycleSync(cycleSync);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar los ajustes",
      );
      setProfile({ full_name: "", mochi_name: "Mochi", wake_up_time: "" });
      setModuleSettings(defaultModuleSettings);
      setHabitTargets([]);
      setHabitNotificationMap({});
      setHealthAvailable(false);
      setHealthPermission(false);
      setLastCycleSync(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void loadSettings();
    }, [loadSettings]),
  );

  const handleSaveProfile = async () => {
    if (!userId) return;

    const wakeUpTimeValue = (profile.wake_up_time ?? "").trim();
    if (!isValidTime(wakeUpTimeValue)) {
      showAlert({
        title: "Hora inválida",
        message: "La hora debe estar en formato HH:MM",
        buttons: [{ text: "Entendido", style: "cancel" }],
      });
      return;
    }

    try {
      setSavingProfile(true);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: (profile.full_name ?? "").trim() || null,
          mochi_name: (profile.mochi_name ?? "").trim() || "Mochi",
          wake_up_time: wakeUpTimeValue,
        })
        .eq("id", userId);

      if (updateError) throw updateError;

      if (notifPrefs.enabled && notifPrefs.morningEnabled) {
        await scheduleMorningReminder(wakeUpTimeValue);
      }

      showAlert({
        title: "Perfil actualizado",
        message: "Tus datos se guardaron correctamente",
        buttons: [{ text: "Aceptar", style: "default" }],
      });
    } catch (err) {
      showAlert({
        title: "Error",
        message:
          err instanceof Error
            ? err.message
            : "No se pudo actualizar el perfil",
        buttons: [{ text: "Entendido", style: "destructive" }],
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleToggleModule = async (key: ModuleToggleKey, value: boolean) => {
    if (!userId) return;

    if (readOnlyModuleKeys.includes(key)) {
      showAlert({
        title: "Cambio restringido",
        message:
          "Este módulo se administra desde base de datos y no se puede cambiar desde la app.",
        buttons: [{ text: "Entendido", style: "cancel" }],
      });
      return;
    }

    const previousSettings = moduleSettings;
    const nextSettings = {
      ...moduleSettings,
      [key]: value,
    };

    setModuleSettings(nextSettings);

    try {
      const payload = {
        user_id: userId,
        study_enabled: nextSettings.study_enabled,
        exercise_enabled: nextSettings.exercise_enabled,
        habits_enabled: nextSettings.habits_enabled,
        goals_enabled: nextSettings.goals_enabled,
        mood_enabled: nextSettings.mood_enabled,
        gratitude_enabled: nextSettings.gratitude_enabled,
        cooking_enabled: nextSettings.cooking_enabled,
        notes_enabled: nextSettings.notes_enabled,
      };

      const { error: upsertError } = await supabase
        .from("user_settings")
        .upsert(payload, { onConflict: "user_id" });

      if (upsertError) throw upsertError;
    } catch (err) {
      setModuleSettings(previousSettings);
      showAlert({
        title: "Error",
        message:
          err instanceof Error ? err.message : "No se pudo guardar el cambio",
        buttons: [{ text: "Entendido", style: "destructive" }],
      });
    }
  };

  const handleToggleNotifications = async (value: boolean) => {
    if (value && permissionStatus !== "granted") {
      const status = await requestNotificationPermissions();
      setPermissionStatus(status);

      if (status !== "granted") {
        showAlert({
          title: "Permiso requerido",
          message:
            "Para recibir notificaciones, actívalas en los ajustes de tu dispositivo.",
          buttons: [
            { text: "Cancelar", style: "cancel" },
            {
              text: "Abrir ajustes",
              style: "default",
              onPress: () => {
                void Linking.openSettings();
              },
            },
          ],
        });
        return;
      }
    }

    setSavingNotif(true);
    try {
      const updated = { ...notifPrefs, enabled: value };
      setNotifPrefs(updated);
      await saveNotificationPrefs({ enabled: value });

      if (!value) {
        await cancelAllNotifications();
        return;
      }

      const wakeUpTime = profile.wake_up_time ?? "06:00";
      if (updated.morningEnabled) await scheduleMorningReminder(wakeUpTime);
      if (updated.studyEnabled) await scheduleStudyBlockReminders(studyBlocks);
      if (updated.habitEnabled) {
        await scheduleHabitRemindersForHabits(
          habitTargets,
          updated.habitTime,
          habitNotificationMap,
        );
      }
      if (updated.weeklyEnabled) await scheduleWeeklySummaryNotification();
      if (updated.cookingEnabled)
        await scheduleCookingReminder(updated.cookingTime);
    } catch {
      setNotifPrefs((prev) => ({ ...prev, enabled: !value }));
    } finally {
      setSavingNotif(false);
    }
  };

  const handleToggleMorning = async (value: boolean) => {
    const updated = { ...notifPrefs, morningEnabled: value };
    setNotifPrefs(updated);
    await saveNotificationPrefs({ morningEnabled: value });

    if (!notifPrefs.enabled) return;
    if (value) {
      await scheduleMorningReminder(profile.wake_up_time ?? "06:00");
    } else {
      await cancelMorningReminder();
    }
  };

  const handleToggleStudyReminders = async (value: boolean) => {
    setSavingNotif(true);
    try {
      const updated = { ...notifPrefs, studyEnabled: value };
      setNotifPrefs(updated);
      await saveNotificationPrefs({ studyEnabled: value });

      if (!notifPrefs.enabled) return;
      if (value) {
        await scheduleStudyBlockReminders(studyBlocks);
      } else {
        await cancelAllStudyBlockReminders();
      }
    } finally {
      setSavingNotif(false);
    }
  };

  const handleToggleHabitReminder = async (value: boolean) => {
    const updated = { ...notifPrefs, habitEnabled: value };
    setNotifPrefs(updated);
    await saveNotificationPrefs({ habitEnabled: value });

    if (!notifPrefs.enabled) return;
    if (value) {
      await scheduleHabitRemindersForHabits(
        habitTargets,
        notifPrefs.habitTime,
        habitNotificationMap,
      );
    } else {
      await cancelHabitReminder();
    }
  };

  const handleToggleWeeklySummary = async (value: boolean) => {
    const updated = { ...notifPrefs, weeklyEnabled: value };
    setNotifPrefs(updated);
    await saveNotificationPrefs({ weeklyEnabled: value });

    if (!notifPrefs.enabled) return;
    if (value) {
      await scheduleWeeklySummaryNotification();
    } else {
      await cancelWeeklySummaryNotification();
    }
  };

  const handleHabitTimeConfirm = async (time: string) => {
    setShowHabitTimePicker(false);
    const updated = { ...notifPrefs, habitTime: time };
    setNotifPrefs(updated);
    await saveNotificationPrefs({ habitTime: time });

    if (notifPrefs.enabled && notifPrefs.habitEnabled) {
      await scheduleHabitRemindersForHabits(
        habitTargets,
        time,
        habitNotificationMap,
      );
    }
  };

  // ─── Cooking handlers ──────────────────────────────────────────────────────

  const handleToggleCookingReminder = async (value: boolean) => {
    const updated = { ...notifPrefs, cookingEnabled: value };
    setNotifPrefs(updated);
    await saveNotificationPrefs({ cookingEnabled: value });

    if (!notifPrefs.enabled) return;
    if (value) {
      await scheduleCookingReminder(notifPrefs.cookingTime);
    } else {
      await cancelCookingReminder();
    }
  };

  const handleCookingTimeConfirm = async (time: string) => {
    setShowCookingTimePicker(false);
    const updated = { ...notifPrefs, cookingTime: time };
    setNotifPrefs(updated);
    await saveNotificationPrefs({ cookingTime: time });

    if (notifPrefs.enabled && notifPrefs.cookingEnabled) {
      await scheduleCookingReminder(time);
    }
  };

  const handleSignOut = () => {
    showAlert({
      title: "Cerrar sesión",
      message: "¿Quieres cerrar tu sesión ahora?",
      buttons: [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Cerrar sesión",
          style: "destructive",
          onPress: () => {
            void supabase.auth.signOut();
          },
        },
      ],
    });
  };

  const refreshCycleHealthState = async () => {
    const [available, permission, sync] = await Promise.all([
      isHealthConnectAvailable(),
      hasCyclePermissions(),
      getCycleLastSync(),
    ]);

    setHealthAvailable(available);
    setHealthPermission(permission);
    setLastCycleSync(sync);
  };

  const handleConnectHealth = async () => {
    setHealthSyncing(true);
    try {
      const granted = await requestCyclePermissions();
      setHealthPermission(granted);
      await refreshCycleHealthState();

      if (!granted) {
        showAlert({
          title: "Permiso no concedido",
          message:
            "Puedes intentarlo de nuevo cuando quieras. Mochi seguirá funcionando con normalidad.",
          buttons: [{ text: "Entendido", style: "cancel" }],
        });
      }
    } catch (err) {
      showAlert({
        title: "No se pudo conectar",
        message:
          err instanceof Error
            ? err.message
            : "Ocurrio un error al abrir permisos de Health Connect.",
        buttons: [{ text: "Entendido", style: "cancel" }],
      });
    } finally {
      setHealthSyncing(false);
    }
  };

  const handleRevokeHealth = async () => {
    setHealthSyncing(true);
    try {
      await revokeCyclePermissions();
      await refreshCycleHealthState();
    } finally {
      setHealthSyncing(false);
    }
  };

  const formattedCycleSync = lastCycleSync
    ? new Date(lastCycleSync).toLocaleString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Sin sincronización aún";

  return (
    <>
      <SafeAreaView className="flex-1 bg-blue-50">
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            className="flex-1 px-5"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          >
            <TouchableOpacity
              className="mt-4 flex-row items-center"
              onPress={() => router.back()}
            >
              <Ionicons name="chevron-back" size={22} color="#1d4ed8" />
              <Text className="ml-1 font-bold text-blue-900">Volver</Text>
            </TouchableOpacity>

            <View className="mt-6 rounded-3xl border-2 border-blue-200 bg-white p-4">
              <Text className="text-2xl font-extrabold text-blue-900">
                Ajustes
              </Text>
              <Text className="mt-2 text-sm font-semibold text-blue-700">
                Personaliza tu perfil y los módulos que quieres ver
              </Text>
            </View>

            {loading ? (
              <View className="mt-6 items-center rounded-3xl border-2 border-blue-200 bg-white p-6">
                <MochiCharacter mood="thinking" size={88} />
                <Text className="mt-3 text-sm font-semibold text-blue-800">
                  Cargando ajustes...
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
                  onPress={() => void loadSettings()}
                >
                  <Text className="font-extrabold text-white">Reintentar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* ── Perfil ── */}
                <View className="mt-6 rounded-3xl border-2 border-blue-200 bg-white p-4">
                  <Text className="text-lg font-extrabold text-blue-900">
                    Perfil
                  </Text>

                  <View className="mt-4">
                    <Text className="mb-2 text-sm font-bold text-blue-900">
                      Nombre
                    </Text>
                    <TextInput
                      className="rounded-2xl border-2 border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-slate-800"
                      placeholder="Tu nombre"
                      placeholderTextColor="#93c5fd"
                      value={profile.full_name ?? ""}
                      onChangeText={(value) =>
                        setProfile((prev) => ({ ...prev, full_name: value }))
                      }
                    />
                  </View>

                  <View className="mt-4">
                    <Text className="mb-2 text-sm font-bold text-blue-900">
                      Nombre de tu Mochi
                    </Text>
                    <TextInput
                      className="rounded-2xl border-2 border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-slate-800"
                      placeholder="Mochi"
                      placeholderTextColor="#93c5fd"
                      value={profile.mochi_name ?? ""}
                      onChangeText={(value) =>
                        setProfile((prev) => ({ ...prev, mochi_name: value }))
                      }
                    />
                  </View>

                  <View className="mt-4">
                    <Text className="mb-2 text-sm font-bold text-blue-900">
                      Hora de despertar
                    </Text>
                    <TouchableOpacity
                      className="rounded-2xl border-2 border-blue-200 bg-blue-50 px-4 py-3"
                      onPress={() => setShowTimePicker(true)}
                    >
                      <Text className="text-center text-lg font-extrabold text-blue-900">
                        {profile.wake_up_time || "06:00"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    className="mt-5 items-center rounded-2xl bg-blue-600 py-3"
                    onPress={() => void handleSaveProfile()}
                    disabled={savingProfile}
                  >
                    <Text className="font-extrabold text-white">
                      {savingProfile ? "Guardando..." : "Guardar perfil"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TimePickerModal
                  visible={showTimePicker}
                  time={profile.wake_up_time ?? "06:00"}
                  label="Hora de despertar"
                  onConfirm={(time) => {
                    setProfile((prev) => ({ ...prev, wake_up_time: time }));
                    setShowTimePicker(false);
                  }}
                  onCancel={() => setShowTimePicker(false)}
                />

                {/* ── Módulos ── */}
                <View className="mt-6 rounded-3xl border-2 border-blue-200 bg-white p-4">
                  <Text className="text-lg font-extrabold text-blue-900">
                    Módulos
                  </Text>

                  <View className="mt-4">
                    {moduleItems.map((module) => (
                      <View
                        key={module.key}
                        className="mb-3 flex-row items-center justify-between rounded-2xl border border-blue-200 bg-blue-50 px-3 py-3"
                      >
                        <View className="flex-row items-center">
                          <Ionicons
                            name={module.icon}
                            size={18}
                            color="#1d4ed8"
                          />
                          <Text className="ml-2 text-sm font-bold text-blue-900">
                            {module.label}
                          </Text>
                        </View>
                        <Switch
                          value={moduleSettings[module.key]}
                          disabled={readOnlyModuleKeys.includes(module.key)}
                          onValueChange={(nextValue) => {
                            void handleToggleModule(module.key, nextValue);
                          }}
                          thumbColor={
                            moduleSettings[module.key] ? "#1d4ed8" : "#94a3b8"
                          }
                          trackColor={{ false: "#cbd5e1", true: "#bfdbfe" }}
                        />
                      </View>
                    ))}
                  </View>

                  <View className="rounded-2xl border border-blue-200 bg-blue-50 p-3">
                    <Text className="text-xs font-semibold text-blue-700">
                      Los módulos desactivados se ocultarán del perfil.
                      Funciones de pareja y vales son informativas.
                    </Text>
                  </View>
                </View>

                {/* ── Datos de salud ── */}
                <View className="mt-6 rounded-3xl border-2 border-rose-200 bg-white p-4">
                  <Text className="text-lg font-extrabold text-rose-900">
                    Datos de salud
                  </Text>
                  <Text className="mt-2 text-sm font-semibold text-rose-700">
                    Conecta Health Connect para que Mochi conozca tu ciclo
                    menstrual
                  </Text>

                  {healthAvailable ? (
                    <>
                      <View className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3">
                        <Text className="text-xs font-bold text-rose-800">
                          Estado del permiso
                        </Text>
                        <Text className="mt-1 text-sm font-semibold text-rose-700">
                          {healthPermission ? "Concedido" : "No concedido"}
                        </Text>
                        <Text className="mt-2 text-xs font-semibold text-rose-700">
                          Última sincronización: {formattedCycleSync}
                        </Text>
                      </View>

                      <TouchableOpacity
                        className={`mt-4 items-center rounded-2xl py-3 ${healthSyncing ? "bg-rose-300" : "bg-rose-500"}`}
                        onPress={() => {
                          if (healthPermission) {
                            void handleRevokeHealth();
                          } else {
                            void handleConnectHealth();
                          }
                        }}
                        disabled={healthSyncing}
                      >
                        <Text className="font-extrabold text-white">
                          {healthSyncing
                            ? "Actualizando..."
                            : healthPermission
                              ? "Revocar"
                              : "Conectar"}
                        </Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <View className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3">
                      <Text className="text-xs font-semibold text-amber-800">
                        No disponible en este dispositivo. Requiere Android 14+
                        o Health Connect instalado.
                      </Text>
                    </View>
                  )}
                </View>

                {/* ── Notificaciones ── */}
                <View className="mt-6 rounded-3xl border-2 border-violet-200 bg-white p-4">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <View className="h-9 w-9 items-center justify-center rounded-xl bg-violet-100">
                        <Ionicons
                          name="notifications"
                          size={18}
                          color="#7c3aed"
                        />
                      </View>
                      <Text className="text-lg font-extrabold text-violet-900">
                        Notificaciones
                      </Text>
                    </View>
                    <Switch
                      value={notifPrefs.enabled}
                      onValueChange={(v) => {
                        void handleToggleNotifications(v);
                      }}
                      disabled={savingNotif}
                      thumbColor={notifPrefs.enabled ? "#7c3aed" : "#94a3b8"}
                      trackColor={{ false: "#cbd5e1", true: "#ddd6fe" }}
                    />
                  </View>

                  {permissionStatus === "denied" && (
                    <TouchableOpacity
                      className="mt-3 flex-row items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2"
                      onPress={() => {
                        void Linking.openSettings();
                      }}
                    >
                      <Ionicons
                        name="warning"
                        size={14}
                        color="#d97706"
                      />
                      <Text className="flex-1 text-xs font-semibold text-amber-800">
                        Permiso denegado. Toca aquí para activar en ajustes del
                        sistema.
                      </Text>
                    </TouchableOpacity>
                  )}

                  {notifPrefs.enabled && (
                    <View className="mt-4 gap-3">
                      {/* Morning reminder */}
                      <View className="flex-row items-center justify-between rounded-2xl border border-violet-100 bg-violet-50 px-3 py-3">
                        <View className="flex-1">
                          <View className="flex-row items-center gap-1.5">
                            <Ionicons
                              name="sunny"
                              size={15}
                              color="#7c3aed"
                            />
                            <Text className="text-sm font-bold text-violet-900">
                              Recordatorio matutino
                            </Text>
                          </View>
                          <Text className="mt-0.5 text-xs font-semibold text-violet-500">
                            A las {profile.wake_up_time || "06:00"} (hora de
                            despertar)
                          </Text>
                        </View>
                        <Switch
                          value={notifPrefs.morningEnabled}
                          onValueChange={(v) => {
                            void handleToggleMorning(v);
                          }}
                          thumbColor={
                            notifPrefs.morningEnabled ? "#7c3aed" : "#94a3b8"
                          }
                          trackColor={{ false: "#cbd5e1", true: "#ddd6fe" }}
                        />
                      </View>

                      {/* Study reminders */}
                      <View className="flex-row items-center justify-between rounded-2xl border border-violet-100 bg-violet-50 px-3 py-3">
                        <View className="flex-1">
                          <View className="flex-row items-center gap-1.5">
                            <Ionicons
                              name="book"
                              size={15}
                              color="#7c3aed"
                            />
                            <Text className="text-sm font-bold text-violet-900">
                              Bloques de estudio
                            </Text>
                          </View>
                          <Text className="mt-0.5 text-xs font-semibold text-violet-500">
                            10 min antes de cada bloque ({studyBlocks.length}{" "}
                            bloques)
                          </Text>
                        </View>
                        <Switch
                          value={notifPrefs.studyEnabled}
                          onValueChange={(v) => {
                            void handleToggleStudyReminders(v);
                          }}
                          disabled={savingNotif}
                          thumbColor={
                            notifPrefs.studyEnabled ? "#7c3aed" : "#94a3b8"
                          }
                          trackColor={{ false: "#cbd5e1", true: "#ddd6fe" }}
                        />
                      </View>

                      {/* Habit reminder */}
                      <View className="rounded-2xl border border-violet-100 bg-violet-50 px-3 py-3">
                        <View className="flex-row items-center justify-between">
                          <View className="flex-1">
                            <View className="flex-row items-center gap-1.5">
                              <Ionicons
                                name="leaf"
                                size={15}
                                color="#7c3aed"
                              />
                              <Text className="text-sm font-bold text-violet-900">
                                Recordatorio de hábitos
                              </Text>
                            </View>
                            <Text className="mt-0.5 text-xs font-semibold text-violet-500">
                              Diario a las {notifPrefs.habitTime}
                            </Text>
                          </View>
                          <Switch
                            value={notifPrefs.habitEnabled}
                            onValueChange={(v) => {
                              void handleToggleHabitReminder(v);
                            }}
                            thumbColor={
                              notifPrefs.habitEnabled ? "#7c3aed" : "#94a3b8"
                            }
                            trackColor={{ false: "#cbd5e1", true: "#ddd6fe" }}
                          />
                        </View>
                        {notifPrefs.habitEnabled && (
                          <TouchableOpacity
                            className="mt-2 items-center rounded-xl border border-violet-200 bg-white py-2"
                            onPress={() => setShowHabitTimePicker(true)}
                          >
                            <Text className="text-sm font-extrabold text-violet-700">
                              Cambiar hora: {notifPrefs.habitTime}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Cooking reminder */}
                      <View className="rounded-2xl border border-orange-100 bg-orange-50 px-3 py-3">
                        <View className="flex-row items-center justify-between">
                          <View className="flex-1">
                            <View className="flex-row items-center gap-1.5">
                              <Ionicons
                                name="restaurant"
                                size={15}
                                color="#c2410c"
                              />
                              <Text className="text-sm font-bold text-orange-900">
                                Recordatorio de cocina
                              </Text>
                            </View>
                            <Text className="mt-0.5 text-xs font-semibold text-orange-500">
                              Diario a las {notifPrefs.cookingTime}
                            </Text>
                          </View>
                          <Switch
                            value={notifPrefs.cookingEnabled}
                            onValueChange={(v) => {
                              void handleToggleCookingReminder(v);
                            }}
                            thumbColor={
                              notifPrefs.cookingEnabled ? "#c2410c" : "#94a3b8"
                            }
                            trackColor={{ false: "#cbd5e1", true: "#fed7aa" }}
                          />
                        </View>
                        {notifPrefs.cookingEnabled && (
                          <TouchableOpacity
                            className="mt-2 items-center rounded-xl border border-orange-200 bg-white py-2"
                            onPress={() => setShowCookingTimePicker(true)}
                          >
                            <Text className="text-sm font-extrabold text-orange-700">
                              Cambiar hora: {notifPrefs.cookingTime}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Weekly summary reminder */}
                      <View className="flex-row items-center justify-between rounded-2xl border border-indigo-100 bg-indigo-50 px-3 py-3">
                        <View className="flex-1 pr-2">
                          <View className="flex-row items-center gap-1.5">
                            <Ionicons
                              name="calendar"
                              size={15}
                              color="#4338ca"
                            />
                            <Text className="text-sm font-bold text-indigo-900">
                              Resumen semanal
                            </Text>
                          </View>
                          <Text className="mt-0.5 text-xs font-semibold text-indigo-600">
                            Domingo a las 10:00
                          </Text>
                        </View>
                        <Switch
                          value={notifPrefs.weeklyEnabled}
                          onValueChange={(v) => {
                            void handleToggleWeeklySummary(v);
                          }}
                          thumbColor={
                            notifPrefs.weeklyEnabled ? "#4338ca" : "#94a3b8"
                          }
                          trackColor={{ false: "#cbd5e1", true: "#c7d2fe" }}
                        />
                      </View>
                    </View>
                  )}
                </View>

                <TimePickerModal
                  visible={showHabitTimePicker}
                  time={notifPrefs.habitTime}
                  label="Hora del recordatorio de hábitos"
                  onConfirm={(time) => {
                    void handleHabitTimeConfirm(time);
                  }}
                  onCancel={() => setShowHabitTimePicker(false)}
                />

                <TimePickerModal
                  visible={showCookingTimePicker}
                  time={notifPrefs.cookingTime}
                  label="Hora del recordatorio de cocina"
                  onConfirm={(time) => {
                    void handleCookingTimeConfirm(time);
                  }}
                  onCancel={() => setShowCookingTimePicker(false)}
                />

                {/* ── Cuenta ── */}
                <View className="mb-12 mt-6 rounded-3xl border-2 border-blue-200 bg-white p-4">
                  <Text className="text-lg font-extrabold text-blue-900">
                    Cuenta
                  </Text>

                  <TouchableOpacity
                    className="mt-4 items-center rounded-2xl bg-red-500 py-3"
                    onPress={handleSignOut}
                  >
                    <Text className="font-extrabold text-white">
                      Cerrar sesión
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      {AlertComponent}
    </>
  );
}

export default SettingsScreen;
