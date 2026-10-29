import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { BackHandler, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import Animated, { FadeInRight } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useModuleVisibility } from "@/src/core/providers/ModuleVisibilityContext";
import { useSession } from "@/src/core/providers/SessionContext";
import { setAppMode } from "@/src/features/duo/api";
import { QrScannerModal } from "@/src/features/duo/QrScannerModal";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { TimePickerModal } from "@/src/shared/components/TimePickerModal";
import { setConsent } from "@/src/shared/lib/consents";
import {
  requestNotificationPermissions,
  saveNotificationPrefs,
  scheduleMorningReminder,
} from "@/src/shared/lib/notifications";
import { track } from "@/src/shared/lib/observability/analytics";
import { reportError } from "@/src/shared/lib/observability/reportError";
import { supabase } from "@/src/shared/lib/supabase";
import type { MochiExpression } from "@/src/shared/mochi/manifest";
import { COLORS } from "@/src/shared/theme/tokens";
import {
  Button,
  Caption,
  Chip,
  Display,
  ELEVATION,
  IconTile,
  Input,
  MochiBubble,
  PressableScale,
  Strong,
  Surface,
  Toggle,
} from "@/src/shared/ui";
import { DURATION, EASE_OUT, REDUCE } from "@/src/shared/ui/motion";
import { clearOnboardingDraft, draftKey } from "./draft";
import {
  ageGroupFromBirth,
  firstPlanFor,
  GOALS,
  MODULES,
  modulesForGoals,
  type AgeGroup,
  type GoalKey,
  type ModuleKey,
} from "./modules";

type Intent = "personal" | "partner";
const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

type Step = "intent" | "age" | "name" | "goals" | "consents" | "code" | "done" | "blocked";

const FLOWS: Record<Intent, Step[]> = {
  personal: ["intent", "age", "name", "goals", "consents", "done"],
  partner: ["intent", "age", "name", "code", "done"],
};

const GOAL_ICONS: Record<GoalKey, keyof typeof Ionicons.glyphMap> = {
  study: "book",
  habits: "leaf",
  wellness: "happy",
  cooking: "restaurant",
  fitness: "barbell",
};

/** Borrador local (sobrevive a que Android cierre la app). Sin fecha de nacimiento. */
type Draft = {
  v: 2;
  intent: Intent;
  step: Step;
  ageGroup: AgeGroup;
  guardianOk: boolean;
  fullName: string;
  wakeUpTime: string;
  goals: GoalKey[];
  memoryConsent: boolean;
  analyticsConsent: boolean;
  cycleConsent: boolean;
};

export function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { session, refreshProfile } = useSession();
  const { refreshModuleVisibility } = useModuleVisibility();
  const userId = session?.user.id;

  const [intent, setIntent] = useState<Intent>("personal");
  const [step, setStep] = useState<Step>("intent");
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [savedAgeGroup, setSavedAgeGroup] = useState<AgeGroup | null>(null);
  const [guardianOk, setGuardianOk] = useState(false);
  const [fullName, setFullName] = useState("");
  const [wakeUpTime, setWakeUpTime] = useState("06:30");
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [goals, setGoals] = useState<GoalKey[]>([]);
  const [memoryConsent, setMemoryConsent] = useState(false);
  const [analyticsConsent, setAnalyticsConsent] = useState(false);
  const [cycleConsent, setCycleConsent] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [remindersOn, setRemindersOn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);

  const computedAge = useMemo(
    () => ageGroupFromBirth(Number(birthYear), Number(birthMonth)),
    [birthYear, birthMonth],
  );
  const ageGroup = computedAge ?? savedAgeGroup;
  const modules = useMemo(() => modulesForGoals(goals), [goals]);
  const plan = useMemo(() => firstPlanFor(modules), [modules]);
  const flow = FLOWS[intent];
  const stepIndex = flow.indexOf(step);
  const firstName = fullName.trim().split(/\s+/)[0] ?? "";

  // Restaurar el borrador (solo si la edad ya se había confirmado).
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void AsyncStorage.getItem(draftKey(userId))
      .then((raw) => {
        if (cancelled || !raw) return;
        const d = JSON.parse(raw) as Partial<Draft>;
        const valid =
          d.v === 2 &&
          d.intent &&
          d.step &&
          d.ageGroup &&
          d.ageGroup !== "under_16" &&
          (d.ageGroup !== "16_17" || d.guardianOk) &&
          FLOWS[d.intent].includes(d.step) &&
          !["intent", "age", "done", "blocked"].includes(d.step);
        if (!valid) {
          void clearOnboardingDraft(userId);
          return;
        }
        const draft = d as Draft;
        setIntent(draft.intent);
        setSavedAgeGroup(draft.ageGroup);
        setGuardianOk(draft.guardianOk);
        setFullName(draft.fullName);
        setWakeUpTime(draft.wakeUpTime);
        setGoals(draft.goals);
        setMemoryConsent(draft.memoryConsent);
        setAnalyticsConsent(draft.analyticsConsent);
        setCycleConsent(draft.cycleConsent);
        setStep(draft.step);
      })
      .catch((e) => reportError(e, { scope: "onboarding/draft-load" }))
      .finally(() => {
        if (!cancelled) setDraftLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const finished = useRef(false);
  useEffect(() => {
    if (!userId || !draftLoaded || finished.current || !savedAgeGroup) return;
    if (savedAgeGroup === "under_16" || ["intent", "age", "done", "blocked"].includes(step)) return;
    const draft: Draft = {
      v: 2,
      intent,
      step,
      ageGroup: savedAgeGroup,
      guardianOk,
      fullName,
      wakeUpTime,
      goals,
      memoryConsent,
      analyticsConsent,
      cycleConsent,
    };
    void AsyncStorage.setItem(draftKey(userId), JSON.stringify(draft)).catch(() => {});
  }, [
    userId,
    draftLoaded,
    intent,
    step,
    savedAgeGroup,
    guardianOk,
    fullName,
    wakeUpTime,
    goals,
    memoryConsent,
    analyticsConsent,
    cycleConsent,
  ]);

  const go = (next: Step) => {
    setError(null);
    setStep(next);
  };
  const next = () => go(flow[stepIndex + 1]);
  const canGoBack = stepIndex > 0 && step !== "done" && step !== "blocked" && !saving;
  const back = () => go(flow[stepIndex - 1]);

  useEffect(() => {
    if (!canGoBack) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      back();
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `back` depende solo de stepIndex/flow
  }, [canGoBack, stepIndex, intent]);

  const confirmAge = () => {
    if (!ageGroup) {
      setError("Escribe tu año de nacimiento (por ejemplo 2004) y elige el mes.");
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
    next();
  };

  const confirmName = () => {
    if (fullName.trim().length < 2) {
      setError("Escribe tu nombre para continuar.");
      return;
    }
    next();
  };

  /** Edad y perfil, comunes a los dos caminos. */
  const saveBasics = async (uid: string) => {
    const { error: ageError } = await supabase.rpc("set_age_group", {
      p_group: ageGroup as AgeGroup,
      p_guardian_ok: guardianOk,
    });
    if (ageError) throw ageError;
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim(), mochi_name: "Mochi", wake_up_time: wakeUpTime })
      .eq("id", uid);
    if (profileError) throw profileError;
  };

  const finishPersonal = async () => {
    if (!userId || !ageGroup || ageGroup === "under_16") return;
    setSaving(true);
    setError(null);
    try {
      await saveBasics(userId);
      const settings: Record<ModuleKey, boolean> = Object.fromEntries(
        MODULES.map((m) => [m.key, modules.has(m.key)]),
      ) as Record<ModuleKey, boolean>;
      const { error: settingsError } = await supabase
        .from("user_settings")
        .upsert({ user_id: userId, ...settings }, { onConflict: "user_id" });
      if (settingsError) throw settingsError;
      finished.current = true;
      void clearOnboardingDraft(userId);
      await Promise.all([
        memoryConsent ? setConsent("mochi_memory", true) : Promise.resolve(),
        analyticsConsent ? setConsent("analytics", true) : Promise.resolve(),
        cycleConsent ? setConsent("cycle_server", true) : Promise.resolve(),
      ]);
      track("onboarding_completed", { modules_enabled: modules.size });
      setStep("done");
    } catch (e) {
      reportError(e, { scope: "onboarding/finish" });
      setError(e instanceof Error ? e.message : "No se pudo guardar tu perfil.");
    } finally {
      setSaving(false);
    }
  };

  const finishPartner = async () => {
    if (!userId || !ageGroup || ageGroup === "under_16") return;
    const code = inviteCode.trim().toUpperCase();
    if (code.length < 4) {
      setError("Escribe el código que te compartió tu pareja.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveBasics(userId);
      // Modo pareja: sin módulos propios (los puede activar después desde Duo).
      const settings = Object.fromEntries(MODULES.map((m) => [m.key, false]));
      const { error: settingsError } = await supabase
        .from("user_settings")
        .upsert(
          { user_id: userId, ...settings, quick_capture_enabled: false },
          { onConflict: "user_id" },
        );
      if (settingsError) throw settingsError;
      const { error: inviteError } = await supabase.rpc("accept_partner_invite", {
        p_invite_code: code,
      });
      if (inviteError) throw inviteError;
      // Si el servidor aún no tiene el modo pareja, se queda en modo personal sin módulos.
      await setAppMode("partner").catch((e) => reportError(e, { scope: "onboarding/app-mode" }));
      finished.current = true;
      void clearOnboardingDraft(userId);
      track("duo_linked");
      track("onboarding_completed", { modules_enabled: 0 });
      setStep("done");
    } catch (e) {
      reportError(e, { scope: "onboarding/finish-partner" });
      setError(
        e instanceof Error && /invitaci|codigo|código/i.test(e.message)
          ? "Ese código no funciona: puede estar vencido o ya usado. Pídele uno nuevo."
          : e instanceof Error
            ? e.message
            : "No se pudo unir. Intenta de nuevo.",
      );
    } finally {
      setSaving(false);
    }
  };

  const enableReminders = async () => {
    const status = await requestNotificationPermissions();
    if (status !== "granted") return;
    setRemindersOn(true);
    await saveNotificationPrefs({
      enabled: true,
      morningEnabled: true,
      studyEnabled: true,
      habitEnabled: true,
    });
    await scheduleMorningReminder(wakeUpTime);
  };

  const leave = async (route: string) => {
    // Primero los módulos y el modo nuevos; si no, el guardián de rutas devolvería a Hoy.
    await Promise.all([refreshProfile(), refreshModuleVisibility()]);
    router.replace(route as never);
  };

  const talk = (expression: MochiExpression, text: string, big = false) => (
    <View className={big ? "mt-6 items-center" : "mt-5 flex-row items-end gap-2.5"}>
      <MochiCharacter
        expression={expression}
        size={big ? 190 : 96}
        animated={big}
        interactive={big}
      />
      <MochiBubble
        className={big ? "mt-3 self-stretch" : "flex-1"}
        tail={big ? "up" : "left"}
        text={text}
        size={big ? "lg" : "md"}
      />
    </View>
  );

  const choice = (
    value: Intent,
    icon: keyof typeof Ionicons.glyphMap,
    title: string,
    subtitle: string,
  ) => {
    const on = intent === value;
    return (
      <PressableScale
        haptics="selection"
        onPress={() => setIntent(value)}
        accessibilityRole="radio"
        accessibilityLabel={`${title}. ${subtitle}`}
        accessibilityState={{ selected: on }}
        className={`flex-row items-center gap-3.5 rounded-[22px] bg-surface p-4 ${on ? "border-[2.5px] border-accent" : "border-[2.5px] border-transparent"}`}
        style={ELEVATION[on ? 2 : 1]}
      >
        <IconTile icon={icon} tint={value === "personal" ? "me" : "duo"} size={48} />
        <View className="min-w-0 flex-1">
          <Strong className="text-[17px]">{title}</Strong>
          <Caption>{subtitle}</Caption>
        </View>
        <View
          className={`h-6 w-6 items-center justify-center rounded-full ${on ? "bg-accent" : "border-[2.5px] border-ink-faint/50 bg-surface"}`}
        >
          {on ? <Ionicons name="checkmark" size={16} color={COLORS.accentInk} /> : null}
        </View>
      </PressableScale>
    );
  };

  const body = (() => {
    switch (step) {
      case "intent":
        return (
          <>
            {talk(
              "excited",
              "¡Hola! Soy Mochi. Antes de empezar, ¿vienes por ti o te invitó tu pareja?",
              true,
            )}
            <View className="mt-6 gap-3" accessibilityRole="radiogroup">
              {choice(
                "personal",
                "sparkles",
                "Vengo por mí",
                "Estudio, hábitos, ciclo y más, a mi ritmo",
              )}
              {choice("partner", "heart", "Me invitó mi pareja", "Tengo un código de Mochi Duo")}
            </View>
            <Caption className="mx-1 mt-4">
              Mochi no es un dispositivo médico ni sirve como método anticonceptivo.
            </Caption>
            <View className="mt-5">
              <Button title="Continuar" onPress={next} />
            </View>
          </>
        );
      case "age":
        return (
          <>
            {talk(
              "thinking",
              "Primero, tu edad. Solo guardo si eres mayor o menor de 18, nunca tu fecha.",
            )}
            <View className="mt-6">
              <Input
                label="Año de nacimiento"
                keyboardType="number-pad"
                maxLength={4}
                value={birthYear}
                onChangeText={setBirthYear}
                placeholder="2004"
              />
            </View>
            <Text className="mb-2 ml-1 font-body-bold text-sm text-ink">Mes</Text>
            <View className="mb-3 flex-row flex-wrap gap-2">
              {MONTHS.map((label, index) => (
                <Chip
                  key={label}
                  label={label}
                  selected={birthMonth === String(index + 1)}
                  onPress={() => setBirthMonth(String(index + 1))}
                />
              ))}
            </View>
            {error ? <Caption className="mb-3 ml-1 text-danger">{error}</Caption> : null}
            {ageGroup === "16_17" ? (
              <Surface className="mb-4 p-4">
                <Toggle
                  label="Mi madre, padre o tutor sabe que uso Mochi y está de acuerdo"
                  value={guardianOk}
                  onValueChange={setGuardianOk}
                />
                <Caption className="mt-1">
                  A tu edad tratamos tus datos con más cuidado: no verás anuncios personalizados.
                </Caption>
              </Surface>
            ) : null}
            <Button title="Continuar" onPress={confirmAge} />
          </>
        );
      case "name":
        return (
          <>
            {talk(
              "happy",
              intent === "partner"
                ? "¡Bienvenido! ¿Cómo te llamas?"
                : "¡Qué bueno tenerte aquí! ¿Cómo te llamas?",
            )}
            <View className="mt-6">
              <Input
                label="Tu nombre"
                value={fullName}
                onChangeText={setFullName}
                placeholder="Tu nombre"
                autoCapitalize="words"
                error={error}
              />
              {intent === "personal" ? (
                <>
                  <Text className="mb-1.5 ml-1 font-body-bold text-sm text-ink">
                    ¿A qué hora te despiertas?
                  </Text>
                  <Button
                    title={wakeUpTime}
                    variant="outline"
                    onPress={() => setShowTimePicker(true)}
                  />
                </>
              ) : null}
            </View>
            <View className="mt-6">
              <Button title="Continuar" onPress={confirmName} />
            </View>
          </>
        );
      case "goals":
        return (
          <>
            {talk("thinking", `Me encanta, ${firstName}. ¿Qué quieres cuidar conmigo?`)}
            <Caption className="mx-1 mb-3 mt-5">
              Elige todo lo que quieras. Lo puedes cambiar después.
            </Caption>
            <View className="flex-row flex-wrap gap-2.5">
              {GOALS.map((g) => (
                <Chip
                  key={g.key}
                  icon={GOAL_ICONS[g.key]}
                  label={g.label}
                  selected={goals.includes(g.key)}
                  onPress={() =>
                    setGoals((prev) =>
                      prev.includes(g.key) ? prev.filter((k) => k !== g.key) : [...prev, g.key],
                    )
                  }
                />
              ))}
            </View>
            <Surface tone="sunken" className="mt-5 flex-row items-center gap-3 p-4">
              <Ionicons name="sparkles" size={20} color={COLORS.accent} />
              <Caption className="flex-1 text-ink">
                Tendrás{" "}
                {MODULES.filter((m) => modules.has(m.key))
                  .map((m) => m.label)
                  .join(", ")}
                . Nada más, para que no te abrume.
              </Caption>
            </Surface>
            <View className="mt-6">
              <Button title="Continuar" onPress={next} />
            </View>
          </>
        );
      case "consents":
        return (
          <>
            {talk(
              "love",
              "Tu privacidad es tuya. Todo empieza apagado: activa solo lo que quieras.",
            )}
            <View className="mt-5 gap-3">
              <Surface className="p-4">
                <Toggle
                  label="Que Mochi recuerde tus metas"
                  description="Un resumen de tus metas, exámenes y racha para personalizar sus respuestas. Nunca datos de salud."
                  value={memoryConsent}
                  onValueChange={setMemoryConsent}
                />
              </Surface>
              <Surface className="p-4">
                <Toggle
                  label="Guardar el resumen de mi ciclo"
                  description="Solo inicio y duración, para que tu pareja vea tu energía en Duo si tú lo permites. No va a la IA."
                  value={cycleConsent}
                  onValueChange={setCycleConsent}
                />
              </Surface>
              <Surface className="p-4">
                <Toggle
                  label="Ayudar a mejorar Mochi"
                  description="Estadísticas de uso anónimas. Nunca salud ni lo que escribes."
                  value={analyticsConsent}
                  onValueChange={setAnalyticsConsent}
                />
              </Surface>
            </View>
            {error ? (
              <Text className="ml-1 mt-3 font-body-bold text-sm text-danger">{error}</Text>
            ) : null}
            <View className="mt-6">
              <Button title="Terminar" loading={saving} onPress={() => void finishPersonal()} />
            </View>
          </>
        );
      case "code":
        return (
          <>
            {talk(
              "love",
              `${firstName}, escribe el código que te compartió tu pareja. Así podrán mandarse notas y regalarse vales.`,
            )}
            <View className="mt-6">
              <Input
                label="Código de invitación"
                value={inviteCode}
                onChangeText={(t) => setInviteCode(t.toUpperCase())}
                placeholder="M7K2Q9"
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={12}
                error={error}
              />
              <Button title="Escanear su QR" variant="soft" onPress={() => setScannerOpen(true)} />
            </View>
            <Surface tone="sunken" className="mt-5 flex-row items-center gap-3 p-4">
              <Ionicons name="lock-closed" size={18} color={COLORS.inkMuted} />
              <Caption className="flex-1">
                Solo verás lo que tu pareja decida compartir contigo.
              </Caption>
            </Surface>
            <View className="mt-6">
              <Button title="Unirme" loading={saving} onPress={() => void finishPartner()} />
            </View>
          </>
        );
      case "done":
        return intent === "partner" ? (
          <>
            {talk(
              "celebrating",
              `¡Listo, ${firstName}! Ya están conectados. Te espero en Duo.`,
              true,
            )}
            <View className="mt-6">
              <Button title="Ir a Duo" onPress={() => void leave("/(tabs)/duo")} />
            </View>
          </>
        ) : (
          <>
            {talk("celebrating", `¡Todo listo, ${firstName}! Empecemos con algo pequeño.`, true)}
            <Surface className="mt-6 p-[18px]">
              <Strong className="text-[17px]">{plan.title}</Strong>
              <Caption className="mb-4 mt-1">{plan.body}</Caption>
              <Button title={plan.cta} onPress={() => void leave(plan.route)} />
            </Surface>
            <View className="mt-3">
              <Button
                title={remindersOn ? "Recordatorios activados" : "Activar recordatorios suaves"}
                variant="soft"
                disabled={remindersOn}
                onPress={() => void enableReminders()}
              />
            </View>
            <View className="mt-1">
              <Button title="Ir a Hoy" variant="ghost" onPress={() => void leave("/")} />
            </View>
          </>
        );
      case "blocked":
        return (
          <>
            {talk(
              "soft_sad",
              "Aún no puedes usar Mochi: es para personas de 16 años o más. Te espero cuando cumplas 16.",
              true,
            )}
            <View className="mt-6">
              <Button
                title="Cerrar sesión"
                variant="outline"
                onPress={() => void supabase.auth.signOut()}
              />
            </View>
          </>
        );
    }
  })();

  if (userId && !draftLoaded) return <View className="flex-1 bg-canvas" />;

  const showProgress = step !== "done" && step !== "blocked" && step !== "intent";
  return (
    <View className="flex-1 bg-canvas" style={{ paddingTop: insets.top }}>
      <KeyboardAwareScrollView
        bottomOffset={24}
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 10,
          paddingBottom: insets.bottom + 28,
        }}
      >
        {showProgress ? (
          <View className="mt-1 flex-row items-center gap-3">
            <PressableScale
              haptics="selection"
              onPress={back}
              disabled={!canGoBack}
              hitSlop={12}
              accessibilityLabel="Volver al paso anterior"
            >
              <Ionicons name="chevron-back" size={24} color={COLORS.inkMuted} />
            </PressableScale>
            <View
              className="flex-1 flex-row gap-1.5"
              accessibilityRole="progressbar"
              accessibilityLabel={`Paso ${stepIndex} de ${flow.length - 2}`}
            >
              {flow.slice(1, -1).map((s, i) => (
                <View
                  key={s}
                  className={`h-1.5 flex-1 rounded-full ${i < stepIndex ? "bg-accent" : "bg-line"}`}
                />
              ))}
            </View>
          </View>
        ) : null}
        {step === "intent" ? <Display className="mt-2 text-center">Mochi</Display> : null}
        <Animated.View
          key={step}
          entering={FadeInRight.duration(DURATION.base).easing(EASE_OUT).reduceMotion(REDUCE)}
        >
          {body}
        </Animated.View>
      </KeyboardAwareScrollView>
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
      <QrScannerModal
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onCode={(code) => setInviteCode(code.toUpperCase())}
      />
    </View>
  );
}
