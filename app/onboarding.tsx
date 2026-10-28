import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import Animated, { FadeInRight } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { TimePickerModal } from "@/src/shared/components/TimePickerModal";
import { Button, Card, Chip, Input, Toggle } from "@/src/shared/ui";
import { EASE_OUT, REDUCE } from "@/src/shared/ui/motion";
import { StepProgress } from "@/src/features/onboarding/StepProgress";
import { clearOnboardingDraft, draftKey } from "@/src/features/onboarding/draft";
import { useCycle } from "@/src/core/providers/CycleContext";
import { useSession } from "@/src/core/providers/SessionContext";
import {
  GOALS,
  MODULES,
  ageGroupFromBirth,
  firstPlanFor,
  modulesForGoals,
  type GoalKey,
  type ModuleKey,
} from "@/src/features/onboarding/modules";
import { setConsent } from "@/src/shared/lib/consents";
import {
  getNotificationPermissionStatus,
  requestNotificationPermissions,
  saveNotificationPrefs,
  scheduleMorningReminder,
} from "@/src/shared/lib/notifications";
import { track } from "@/src/shared/lib/observability/analytics";
import { reportError } from "@/src/shared/lib/observability/reportError";
import { supabase } from "@/src/shared/lib/supabase";

type Step =
  | "welcome"
  | "age"
  | "profile"
  | "goals"
  | "modules"
  | "consents"
  | "connect"
  | "plan"
  | "blocked";
const FLOW: Step[] = [
  "welcome",
  "age",
  "profile",
  "goals",
  "modules",
  "consents",
  "connect",
  "plan",
];

type AgeGroup = NonNullable<ReturnType<typeof ageGroupFromBirth>>;

/** Borrador local: sobrevive a que Android cierre la app mientras se concede un permiso.
 * No incluye la fecha de nacimiento, solo el grupo de edad ya validado. */
type Draft = {
  step: Step;
  ageGroup: AgeGroup | null;
  guardianOk: boolean;
  fullName: string;
  wakeUpTime: string;
  goals: GoalKey[];
  modules: ModuleKey[];
  memoryConsent: boolean;
  analyticsConsent: boolean;
  cycleConsent: boolean;
};

export function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { session, refreshProfile } = useSession();
  const userId = session?.user.id;
  const { requestPermission: requestHealthPermission, isAvailable: healthAvailable } = useCycle();

  const [step, setStep] = useState<Step>("welcome");
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [guardianOk, setGuardianOk] = useState(false);
  const [fullName, setFullName] = useState("");
  const [wakeUpTime, setWakeUpTime] = useState("05:20");
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [goals, setGoals] = useState<GoalKey[]>([]);
  const [modules, setModules] = useState<Set<ModuleKey>>(new Set(["study_enabled"]));
  const [memoryConsent, setMemoryConsent] = useState(false);
  const [analyticsConsent, setAnalyticsConsent] = useState(false);
  const [cycleConsent, setCycleConsent] = useState(false);
  const [notificationsGranted, setNotificationsGranted] = useState(false);
  const [healthRequested, setHealthRequested] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [savedAgeGroup, setSavedAgeGroup] = useState<AgeGroup | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const computedAge = useMemo(
    () => ageGroupFromBirth(Number(birthYear), Number(birthMonth)),
    [birthYear, birthMonth],
  );
  const ageGroup = computedAge ?? savedAgeGroup;
  const plan = useMemo(() => firstPlanFor(modules), [modules]);
  const stepIndex = FLOW.indexOf(step);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void AsyncStorage.getItem(draftKey(userId))
      .then((raw) => {
        if (cancelled || !raw) return;
        const d = JSON.parse(raw) as Draft;
        // Solo se restaura un borrador con la edad ya confirmada en "Continuar".
        const unsafe =
          !d.ageGroup ||
          d.ageGroup === "under_16" ||
          (d.ageGroup === "16_17" && !d.guardianOk) ||
          d.step === "blocked" ||
          d.step === "plan" ||
          d.step === "welcome" ||
          d.step === "age";
        if (unsafe) {
          void clearOnboardingDraft(userId);
          return;
        }
        setSavedAgeGroup(d.ageGroup);
        setGuardianOk(d.guardianOk);
        setFullName(d.fullName);
        setWakeUpTime(d.wakeUpTime);
        setGoals(d.goals);
        setModules(new Set(d.modules));
        setMemoryConsent(d.memoryConsent);
        setAnalyticsConsent(d.analyticsConsent);
        setCycleConsent(d.cycleConsent);
        setStep(d.step);
      })
      .catch((error) => reportError(error, { scope: "onboarding/draft-load" }))
      .finally(() => {
        if (!cancelled) setDraftLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const finished = useRef(false);
  useEffect(() => {
    if (!userId || !draftLoaded || finished.current) return;
    if (!savedAgeGroup || savedAgeGroup === "under_16" || stepIndex < FLOW.indexOf("profile"))
      return;
    const draft: Draft = {
      step,
      ageGroup: savedAgeGroup,
      guardianOk,
      fullName,
      wakeUpTime,
      goals,
      modules: [...modules],
      memoryConsent,
      analyticsConsent,
      cycleConsent,
    };
    void AsyncStorage.setItem(draftKey(userId), JSON.stringify(draft)).catch(() => {});
  }, [
    userId,
    draftLoaded,
    step,
    stepIndex,
    savedAgeGroup,
    guardianOk,
    fullName,
    wakeUpTime,
    goals,
    modules,
    memoryConsent,
    analyticsConsent,
    cycleConsent,
  ]);

  // El permiso puede haberse concedido antes de que Android cerrara la app: se lee del sistema.
  useEffect(() => {
    if (step !== "connect") return;
    void getNotificationPermissionStatus().then((status) => {
      if (status === "granted") setNotificationsGranted(true);
    });
  }, [step]);

  const go = (next: Step) => {
    setError(null);
    setStep(next);
  };

  const handleAge = () => {
    if (!ageGroup) {
      setError("Escribe un año (por ejemplo 2004) y un mes (1 a 12) válidos.");
      return;
    }
    if (ageGroup === "under_16") {
      setSavedAgeGroup(null);
      if (userId) void clearOnboardingDraft(userId);
      setStep("blocked");
      return;
    }
    if (ageGroup === "16_17" && !guardianOk) {
      setError("Necesitamos que confirmes que tu madre, padre o tutor está de acuerdo.");
      return;
    }
    if (computedAge) setSavedAgeGroup(computedAge);
    go("profile");
  };

  const toggleGoal = (key: GoalKey) => {
    setGoals((prev) => {
      const next = prev.includes(key) ? prev.filter((g) => g !== key) : [...prev, key];
      setModules(modulesForGoals(next));
      return next;
    });
  };

  const toggleModule = (key: ModuleKey) => {
    setModules((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const askNotifications = async () => {
    const status = await requestNotificationPermissions();
    setNotificationsGranted(status === "granted");
  };

  const askHealth = async () => {
    setHealthRequested(true);
    await requestHealthPermission();
  };

  /** Guarda todo al final del flujo: edad, perfil, módulos y consentimientos. */
  const finish = async () => {
    if (!ageGroup || ageGroup === "under_16") return;
    setSaving(true);
    setError(null);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error("No se encontró tu sesión.");
      const userId = userData.user.id;

      const { error: ageError } = await supabase.rpc("set_age_group", {
        p_group: ageGroup,
        p_guardian_ok: guardianOk,
      });
      if (ageError) throw ageError;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim(), mochi_name: "Mochi", wake_up_time: wakeUpTime })
        .eq("id", userId);
      if (profileError) throw profileError;

      const { error: settingsError } = await supabase.from("user_settings").upsert(
        {
          user_id: userId,
          study_enabled: modules.has("study_enabled"),
          exercise_enabled: modules.has("exercise_enabled"),
          habits_enabled: modules.has("habits_enabled"),
          cooking_enabled: modules.has("cooking_enabled"),
          goals_enabled: modules.has("goals_enabled"),
          mood_enabled: modules.has("mood_enabled"),
          gratitude_enabled: modules.has("gratitude_enabled"),
        },
        { onConflict: "user_id" },
      );
      if (settingsError) throw settingsError;
      // Lo esencial ya está en el servidor: el borrador local deja de ser necesario.
      finished.current = true;
      if (userId) void clearOnboardingDraft(userId);

      // Consentimientos: solo se registran los que la usuaria activó (todos arrancan apagados).
      await Promise.all([
        memoryConsent ? setConsent("mochi_memory", true) : Promise.resolve(),
        analyticsConsent ? setConsent("analytics", true) : Promise.resolve(),
        cycleConsent ? setConsent("cycle_server", true) : Promise.resolve(),
      ]);

      if (notificationsGranted) {
        await saveNotificationPrefs({
          enabled: true,
          morningEnabled: true,
          studyEnabled: true,
          habitEnabled: true,
        });
        await scheduleMorningReminder(wakeUpTime);
      }

      track("onboarding_completed", { modules_enabled: modules.size });
      await refreshProfile();
      setStep("plan");
    } catch (saveError) {
      reportError(saveError, { scope: "onboarding/finish" });
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar tu perfil.");
    } finally {
      setSaving(false);
    }
  };

  const canGoBack = stepIndex > 1 && step !== "plan";
  useEffect(() => {
    if (!canGoBack) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      go(FLOW[stepIndex - 1]);
      return true;
    });
    return () => sub.remove();
  }, [canGoBack, stepIndex]);
  const progress = (
    <View className="mb-4 flex-row items-center gap-3">
      {canGoBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver al paso anterior"
          hitSlop={12}
          onPress={() => go(FLOW[stepIndex - 1])}
        >
          <Text className="text-sm font-extrabold text-accent">Atrás</Text>
        </Pressable>
      ) : null}
      <StepProgress index={stepIndex} total={FLOW.length} />
    </View>
  );

  const body = (() => {
    switch (step) {
      case "welcome":
        return (
          <>
            <View className="items-center">
              <MochiCharacter expression="excited" size={110} />
            </View>
            <Text className="mt-4 text-center text-3xl font-extrabold text-ink">
              Bienvenida a Mochi
            </Text>
            <Text className="mt-2 text-center text-base font-semibold text-ink-muted">
              Tu compañera de estudio y bienestar. Vamos a dejarla a tu medida en unos pasos.
            </Text>
            <Card className="mt-6">
              <Text className="text-sm font-semibold text-ink-muted">
                Mochi no es un dispositivo médico ni sirve como método anticonceptivo. Si algo te
                preocupa sobre tu salud, consulta con un profesional.
              </Text>
            </Card>
            <View className="mt-6">
              <Button title="Empezar" onPress={() => go("age")} />
            </View>
          </>
        );
      case "age":
        return (
          <>
            <Text className="text-2xl font-extrabold text-ink">Verifiquemos tu edad</Text>
            <Text className="mb-4 mt-1 text-sm font-semibold text-ink-muted">
              Mochi es para personas de 16 años o más. No guardamos tu fecha, solo si eres menor o
              mayor de 18.
            </Text>
            <Input
              label="Año de nacimiento"
              keyboardType="number-pad"
              maxLength={4}
              value={birthYear}
              onChangeText={setBirthYear}
              placeholder="2004"
            />
            <Input
              label="Mes de nacimiento (1 a 12)"
              keyboardType="number-pad"
              maxLength={2}
              value={birthMonth}
              onChangeText={setBirthMonth}
              placeholder="8"
              error={error}
            />
            {ageGroup === "16_17" ? (
              <Card className="mb-4">
                <Toggle
                  label="Mi madre, padre o tutor sabe que uso Mochi y está de acuerdo"
                  value={guardianOk}
                  onValueChange={setGuardianOk}
                />
                <Text className="mt-1 text-xs font-semibold text-ink-muted">
                  A tu edad tratamos tus datos con más cuidado: no verás anuncios personalizados.
                </Text>
              </Card>
            ) : null}
            <Button title="Continuar" onPress={handleAge} />
          </>
        );
      case "profile":
        return (
          <>
            <Text className="text-2xl font-extrabold text-ink">¿Cómo te llamas?</Text>
            <View className="mt-4">
              <Input
                label="Nombre"
                value={fullName}
                onChangeText={setFullName}
                placeholder="Tu nombre"
                autoCapitalize="words"
                error={error}
              />
              <Text className="mb-1 text-sm font-bold text-ink">¿A qué hora te despiertas?</Text>
              <Button
                title={wakeUpTime}
                variant="outline"
                onPress={() => setShowTimePicker(true)}
              />
            </View>
            <View className="mt-6">
              <Button
                title="Continuar"
                onPress={() => {
                  if (fullName.trim().length < 2) setError("Escribe tu nombre para continuar.");
                  else go("goals");
                }}
              />
            </View>
          </>
        );
      case "goals":
        return (
          <>
            <Text className="text-2xl font-extrabold text-ink">¿Qué quieres lograr?</Text>
            <Text className="mb-4 mt-1 text-sm font-semibold text-ink-muted">
              Elige todo lo que te interese; puedes cambiarlo después.
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {GOALS.map((g) => (
                <Chip
                  key={g.key}
                  label={g.label}
                  selected={goals.includes(g.key)}
                  onPress={() => toggleGoal(g.key)}
                />
              ))}
            </View>
            <View className="mt-6">
              <Button title="Continuar" onPress={() => go("modules")} />
            </View>
          </>
        );
      case "modules":
        return (
          <>
            <Text className="text-2xl font-extrabold text-ink">Tus módulos</Text>
            <Text className="mb-2 mt-1 text-sm font-semibold text-ink-muted">
              Activa solo lo que vayas a usar.
            </Text>
            {MODULES.map((m) => (
              <Toggle
                key={m.key}
                label={m.label}
                description={m.description}
                value={modules.has(m.key)}
                onValueChange={() => toggleModule(m.key)}
              />
            ))}
            <View className="mt-6">
              <Button title="Continuar" onPress={() => go("consents")} />
            </View>
          </>
        );
      case "consents":
        return (
          <>
            <Text className="text-2xl font-extrabold text-ink">Tu privacidad, tu decisión</Text>
            <Text className="mb-3 mt-1 text-sm font-semibold text-ink-muted">
              Todo está apagado. Activa solo lo que quieras; puedes cambiarlo en Ajustes cuando
              quieras.
            </Text>
            <Card className="mb-3">
              <Toggle
                label="Memoria de Mochi"
                value={memoryConsent}
                onValueChange={setMemoryConsent}
              />
              <Text className="text-xs font-semibold text-ink-muted">
                Guarda un resumen de tus metas, exámenes y racha y lo envía a la IA para
                personalizar sus respuestas. Nunca incluye datos de salud.
              </Text>
            </Card>
            <Card className="mb-3">
              <Toggle
                label="Guardar resumen de mi ciclo en Mochi"
                value={cycleConsent}
                onValueChange={setCycleConsent}
              />
              <Text className="text-xs font-semibold text-ink-muted">
                Solo la fecha de inicio y duración. Sirve para que tu pareja vea tu fase en Duo si
                tú lo permites. No va a la IA.
              </Text>
            </Card>
            <Card className="mb-3">
              <Toggle
                label="Ayudar a mejorar Mochi"
                value={analyticsConsent}
                onValueChange={setAnalyticsConsent}
              />
              <Text className="text-xs font-semibold text-ink-muted">
                Estadísticas de uso anónimas. Nunca incluyen salud ni lo que escribes.
              </Text>
            </Card>
            <Button title="Continuar" onPress={() => go("connect")} />
          </>
        );
      case "connect":
        return (
          <>
            <Text className="text-2xl font-extrabold text-ink">Conexiones opcionales</Text>
            <Card className="mt-4">
              <Text className="text-base font-extrabold text-ink">Recordatorios</Text>
              <Text className="mb-3 mt-1 text-sm font-semibold text-ink-muted">
                Un aviso suave por la mañana y para tus bloques de estudio.
              </Text>
              <Button
                title={notificationsGranted ? "Activados" : "Permitir notificaciones"}
                variant={notificationsGranted ? "soft" : "outline"}
                disabled={notificationsGranted}
                onPress={() => void askNotifications()}
              />
            </Card>
            {healthAvailable ? (
              <Card className="mt-3">
                <Text className="text-base font-extrabold text-ink">Health Connect</Text>
                <Text className="mb-3 mt-1 text-sm font-semibold text-ink-muted">
                  Si registras tu ciclo en otra app, Mochi puede leerlo en tu teléfono para adaptar
                  sus sugerencias.
                </Text>
                <Button
                  title={healthRequested ? "Solicitado" : "Conectar Health Connect"}
                  variant={healthRequested ? "soft" : "outline"}
                  disabled={healthRequested}
                  onPress={() => void askHealth()}
                />
              </Card>
            ) : null}
            {error ? <Text className="mt-3 text-sm font-semibold text-danger">{error}</Text> : null}
            <View className="mt-6">
              <Button title="Terminar" loading={saving} onPress={() => void finish()} />
            </View>
          </>
        );
      case "plan":
        return (
          <>
            <View className="items-center">
              <MochiCharacter expression="proud" size={100} />
            </View>
            <Text className="mt-4 text-center text-2xl font-extrabold text-ink">
              ¡Todo listo, {fullName.trim().split(" ")[0]}!
            </Text>
            <Card className="mt-6">
              <Text className="text-xs font-extrabold uppercase text-ink-muted">
                Tu plan de hoy
              </Text>
              <Text className="mt-1 text-xl font-extrabold text-ink">{plan.title}</Text>
              <Text className="mb-4 mt-1 text-sm font-semibold text-ink-muted">{plan.body}</Text>
              <Button title={plan.cta} onPress={() => router.replace(plan.route as never)} />
            </Card>
            <View className="mt-3">
              <Button title="Ir al inicio" variant="soft" onPress={() => router.replace("/")} />
            </View>
          </>
        );
      case "blocked":
        return (
          <>
            <View className="items-center">
              <MochiCharacter expression="soft_sad" size={100} />
            </View>
            <Text className="mt-4 text-center text-2xl font-extrabold text-ink">
              Aún no puedes usar Mochi
            </Text>
            <Text className="mb-6 mt-2 text-center text-sm font-semibold text-ink-muted">
              Mochi es para personas de 16 años o más. No guardamos tu fecha de nacimiento. Vuelve
              cuando cumplas 16.
            </Text>
            <Button
              title="Cerrar sesión"
              variant="outline"
              onPress={() => void supabase.auth.signOut()}
            />
          </>
        );
    }
  })();

  // Espera al borrador para no mostrar la bienvenida un instante antes del paso restaurado.
  if (userId && !draftLoaded) return <SafeAreaView className="flex-1 bg-canvas" />;

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          className="flex-1 px-6 pt-6"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        >
          {step !== "blocked" && step !== "plan" ? progress : null}
          <Animated.View
            key={step}
            entering={FadeInRight.duration(260).easing(EASE_OUT).reduceMotion(REDUCE)}
          >
            {body}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
      <TimePickerModal
        visible={showTimePicker}
        time={wakeUpTime}
        label="Hora de despertar"
        onConfirm={(time: string) => {
          setWakeUpTime(time);
          setShowTimePicker(false);
        }}
        onCancel={() => setShowTimePicker(false)}
      />
    </SafeAreaView>
  );
}

/** Montada por usuaria: un cambio de cuenta nunca reutiliza el estado ni el borrador de la anterior. */
export default function OnboardingRoute() {
  const { session } = useSession();
  return <OnboardingScreen key={session?.user.id ?? "anon"} />;
}
