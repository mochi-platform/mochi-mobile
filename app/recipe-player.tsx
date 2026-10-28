import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { ScrollView, Image, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useKeepAwake } from "expo-keep-awake";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { supabase } from "@/src/shared/lib/supabase";
import { useSession } from "@/src/core/providers/SessionContext";
import { useAchievement } from "@/src/core/providers/AchievementContext";
import { askMochiWhileCooking } from "@/src/shared/lib/ai";
import { buildAiLimitMessage, requestAiUsage } from "@/src/shared/lib/aiCredits";
import {
  addPoints,
  checkCookingSessionAchievements,
  checkPerfectRecipeAchievement,
} from "@/src/shared/lib/gamification";
import { COLORS } from "@/src/shared/theme/tokens";
import {
  Button,
  Caption,
  Display,
  ErrorState,
  Eyebrow,
  Input,
  MochiBubble,
  MochiQuote,
  PressableScale,
  Sheet,
  Strong,
  Surface,
  Title,
} from "@/src/shared/ui";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { useCustomAlert } from "@/src/shared/components/CustomAlert";
import { searchUnsplashImage } from "@/src/shared/lib/unsplash";
import type { Recipe, RecipeStep, RecipeCookSession } from "@/src/shared/types/database";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function RecipePlayerScreen() {
  // Modo cocina: manos con harina, la pantalla no debe apagarse.
  useKeepAwake();
  const { recipeId, sessionId, fresh } = useLocalSearchParams<{
    recipeId: string;
    sessionId?: string;
    fresh?: string;
  }>();
  const { session } = useSession();
  const { showAchievement } = useAchievement();
  const { showAlert, AlertComponent } = useCustomAlert();
  const insets = useSafeAreaInsets();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [steps, setSteps] = useState<RecipeStep[]>([]);
  const [cookSession, setCookSession] = useState<RecipeCookSession | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [rating, setRating] = useState(0);

  // Timer
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Mochi Q&A
  const [showAsk, setShowAsk] = useState(false);
  const [question, setQuestion] = useState("");
  const [mochiAnswer, setMochiAnswer] = useState("");
  const [asking, setAsking] = useState(false);
  const [stepImageUrl, setStepImageUrl] = useState<string | null>(null);
  const [stepImageLoading, setStepImageLoading] = useState(false);

  // Progress bar
  const progress = useSharedValue(0);
  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%` as `${number}%`,
  }));

  const userId = session?.user.id;

  useEffect(() => {
    async function load() {
      if (!userId || !recipeId) {
        setError("No se encontró la receta");
        setLoading(false);
        return;
      }
      try {
        const [recipeRes, stepsRes] = await Promise.all([
          supabase.from("recipes").select("*").eq("id", recipeId).eq("user_id", userId).single(),
          supabase
            .from("recipe_steps")
            .select("*")
            .eq("recipe_id", recipeId)
            .order("step_number", { ascending: true }),
        ]);
        if (recipeRes.error) throw recipeRes.error;
        if (stepsRes.error) throw stepsRes.error;

        const loadedSteps = (stepsRes.data ?? []) as RecipeStep[];
        setRecipe(recipeRes.data as Recipe);
        setSteps(loadedSteps);

        // Determinar desde qué paso empezar
        let startIndex = 0;

        if (sessionId && fresh !== "true") {
          // Retomar sesión existente
          const { data: existingSession } = await supabase
            .from("recipe_cook_sessions")
            .select("*")
            .eq("id", sessionId)
            .single();
          if (existingSession) {
            setCookSession(existingSession as RecipeCookSession);
            startIndex = Math.min(
              (existingSession as RecipeCookSession).last_step_completed,
              loadedSteps.length - 1,
            );
          }
        }

        if (!cookSession) {
          // Si hay que empezar de nuevo, cancelar sesiones activas anteriores
          if (fresh === "true") {
            await supabase
              .from("recipe_cook_sessions")
              .update({
                is_finished: true,
                finished_at: new Date().toISOString(),
              })
              .eq("recipe_id", recipeId)
              .eq("user_id", userId)
              .eq("is_finished", false);
          }

          // Crear nueva sesión
          const { data: newSession, error: sessionError } = await supabase
            .from("recipe_cook_sessions")
            .insert({
              user_id: userId,
              recipe_id: recipeId,
              last_step_completed: 0,
              is_finished: false,
            })
            .select("*")
            .single();
          if (!sessionError && newSession) {
            setCookSession(newSession as RecipeCookSession);
          }
        }

        setCurrentIndex(startIndex);

        // Iniciar timer del primer paso si tiene duración
        const firstStep = loadedSteps[startIndex];
        if (firstStep?.duration_seconds) {
          setTimerSeconds(firstStep.duration_seconds);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error cargando la receta");
      } finally {
        setLoading(false);
      }
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- las dependencias omitidas son estables o se excluyen a propósito para no reiniciar el efecto
  }, [recipeId, sessionId, userId]);

  // Actualizar progreso en la barra
  useEffect(() => {
    if (steps.length === 0) return;
    progress.value = withTiming((currentIndex + 1) / steps.length, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
  }, [currentIndex, steps.length, progress]);

  // Countdown del timer
  useEffect(() => {
    if (!timerRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerRunning]);

  const currentStep = steps[currentIndex];

  useEffect(() => {
    async function loadStepImage() {
      if (!recipe || !currentStep) {
        setStepImageUrl(null);
        return;
      }

      setStepImageLoading(true);
      const url = await searchUnsplashImage(
        `${recipe.title} ${currentStep.title} cooking step`,
        "squarish",
      );
      setStepImageUrl(url);
      setStepImageLoading(false);
    }

    void loadStepImage();
  }, [currentIndex, currentStep, recipe]);

  const goToStep = async (nextIndex: number) => {
    if (!cookSession || !userId) return;

    // Parar timer
    setTimerRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);

    // Guardar progreso en DB
    await supabase
      .from("recipe_cook_sessions")
      .update({ last_step_completed: nextIndex })
      .eq("id", cookSession.id);

    setCurrentIndex(nextIndex);

    // Preparar timer del siguiente paso
    const nextStep = steps[nextIndex];
    if (nextStep?.duration_seconds) {
      setTimerSeconds(nextStep.duration_seconds);
    } else {
      setTimerSeconds(0);
    }
    setMochiAnswer("");
  };

  const handleNext = async () => {
    if (currentIndex + 1 >= steps.length) {
      await handleFinish();
    } else {
      await goToStep(currentIndex + 1);
    }
  };

  const handlePrev = async () => {
    if (currentIndex > 0) await goToStep(currentIndex - 1);
  };

  const handleFinish = async () => {
    if (!cookSession || !userId) return;
    setTimerRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);

    await supabase
      .from("recipe_cook_sessions")
      .update({
        is_finished: true,
        finished_at: new Date().toISOString(),
        last_step_completed: steps.length,
      })
      .eq("id", cookSession.id);

    // Puntos y logros de cocina
    await addPoints(userId, "recipe_completed", showAchievement);
    await checkCookingSessionAchievements(userId, showAchievement);

    setCompleted(true);
  };

  const handleSaveRating = async (stars: number) => {
    if (!cookSession) return;
    setRating(stars);
    await supabase.from("recipe_cook_sessions").update({ rating: stars }).eq("id", cookSession.id);
    // Logro: 5 estrellas
    if (stars === 5 && userId) await checkPerfectRecipeAchievement(userId, showAchievement);
  };

  const handleAskMochi = async () => {
    if (!question.trim() || !recipe || !currentStep) return;
    try {
      const usage = await requestAiUsage({
        reason: "ai_chat",
        sourceRef: "cooking_help",
      });

      if (!usage.allowed) {
        showAlert({
          title: "Creditos de IA",
          message: buildAiLimitMessage(usage.reason),
          buttons: [{ text: "Entendido", style: "cancel" }],
        });
        return;
      }

      setAsking(true);
      const answer = await askMochiWhileCooking(recipe.title, currentStep.title, question.trim());
      setMochiAnswer(answer);
      setQuestion("");
    } finally {
      setAsking(false);
    }
  };

  // ─── Loading ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <MochiCharacter expression="excited" size={120} />
        <Caption className="mt-3">Preparando tu cocina…</Caption>
      </View>
    );
  }

  if (error || !recipe) {
    return (
      <View className="flex-1 justify-center bg-canvas px-6">
        <ErrorState message={error ?? "No encontramos esta receta."} />
        <Button title="Volver" variant="soft" onPress={() => router.back()} />
      </View>
    );
  }

  // ─── Pantalla de finalización ─────────────────────────────────────────────────

  if (completed) {
    const ratingLabel = [
      "",
      "Hay que practicar",
      "Mejorable",
      "¡Bien!",
      "¡Muy rico!",
      "¡Obra maestra!",
    ][rating];
    return (
      <View
        className="flex-1 justify-center bg-canvas px-6"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 16 }}
      >
        <View className="items-center">
          <MochiCharacter expression="celebrating" size={180} interactive />
          <Display className="mt-2 text-center">¡Buen provecho!</Display>
          <Caption className="mt-1 text-center">Terminaste «{recipe.title}»</Caption>
        </View>
        <Surface elevation={2} className="mt-6 items-center p-5">
          <Strong>¿Cómo quedó?</Strong>
          <View className="mt-3 flex-row gap-2" accessibilityRole="radiogroup">
            {[1, 2, 3, 4, 5].map((star) => (
              <PressableScale
                key={star}
                haptics="selection"
                onPress={() => void handleSaveRating(star)}
                accessibilityRole="radio"
                accessibilityLabel={`${star} de 5`}
                accessibilityState={{ selected: rating === star }}
                hitSlop={4}
              >
                <Ionicons
                  name={rating >= star ? "star" : "star-outline"}
                  size={34}
                  color={COLORS.warning}
                />
              </PressableScale>
            ))}
          </View>
          {rating > 0 ? <Caption className="mt-2">{ratingLabel}</Caption> : null}
        </Surface>
        <View className="mt-6">
          <Button title="Volver a la receta" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  // ─── Player principal ─────────────────────────────────────────────────────────

  const confirmExit = () =>
    showAlert({
      title: "Salir de la receta",
      message: "Tu progreso se guardará. Podrás continuar desde aquí cuando quieras.",
      buttons: [
        { text: "Cancelar", style: "cancel" },
        { text: "Salir", onPress: () => router.back() },
      ],
    });

  return (
    <>
      <View className="flex-1 bg-canvas" style={{ paddingTop: insets.top }}>
        <View className="px-5 pt-3">
          <View className="flex-row items-center justify-between">
            <PressableScale
              haptics="selection"
              onPress={confirmExit}
              accessibilityLabel="Salir de la receta"
              className="h-10 flex-row items-center gap-1 rounded-full bg-surface-muted pl-2 pr-3.5"
            >
              <Ionicons name="chevron-back" size={20} color={COLORS.ink} />
              <Text className="font-body-extrabold text-sm text-ink">Salir</Text>
            </PressableScale>
            <Text
              className="font-display text-lg text-ink"
              accessibilityLabel={`Paso ${currentIndex + 1} de ${steps.length}`}
            >
              {currentIndex + 1} / {steps.length}
            </Text>
            <PressableScale
              onPress={() => {
                setShowAsk(true);
                setMochiAnswer("");
              }}
              accessibilityLabel="Preguntarle a Mochi"
              className="h-10 w-10 items-center justify-center rounded-full bg-accent-soft"
            >
              <Ionicons name="help" size={20} color={COLORS.accentStrong} />
            </PressableScale>
          </View>
          <View className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
            <Animated.View style={progressStyle} className="h-2 rounded-full bg-accent" />
          </View>
          <Caption className="mt-1.5" numberOfLines={1}>
            {recipe.title}
          </Caption>
        </View>

        <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
          {currentStep ? (
            <>
              <Surface elevation={2} className="p-5">
                <View className="flex-row items-center gap-3">
                  <View className="h-11 w-11 items-center justify-center rounded-full bg-accent">
                    <Text className="font-display text-lg text-accent-ink">
                      {currentStep.step_number}
                    </Text>
                  </View>
                  <Title className="flex-1">{currentStep.title}</Title>
                  <View className="h-20 w-20 overflow-hidden rounded-[18px] bg-tint-kitchen">
                    {stepImageUrl ? (
                      <Image
                        source={{ uri: stepImageUrl }}
                        className="h-full w-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="h-full items-center justify-center">
                        <MochiCharacter
                          expression="thinking"
                          size={56}
                          animated={false}
                          shadow={false}
                        />
                        {stepImageLoading ? (
                          <Caption className="text-[10px]">Cargando…</Caption>
                        ) : null}
                      </View>
                    )}
                  </View>
                </View>

                {currentStep.duration_seconds || currentStep.temperature ? (
                  <View className="mt-3 flex-row flex-wrap gap-2">
                    {currentStep.duration_seconds ? (
                      <View className="flex-row items-center gap-1 rounded-full bg-tint-kitchen px-3 py-1.5">
                        <Ionicons name="timer" size={13} color={COLORS.ink} />
                        <Text className="font-body-bold text-xs text-ink">
                          {formatTime(currentStep.duration_seconds)}
                        </Text>
                      </View>
                    ) : null}
                    {currentStep.temperature ? (
                      <View className="flex-row items-center gap-1 rounded-full bg-tint-me px-3 py-1.5">
                        <Ionicons name="thermometer" size={13} color={COLORS.ink} />
                        <Text className="font-body-bold text-xs text-ink">
                          {currentStep.temperature}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                <Text className="mt-4 font-body text-[17px] leading-[25px] text-ink">
                  {currentStep.instructions}
                </Text>

                {currentStep.tip ? (
                  <View className="mt-4 rounded-[16px] bg-accent-soft px-4 py-3">
                    <Eyebrow className="text-accent-strong">Consejo de Mochi</Eyebrow>
                    <MochiQuote className="mt-1 text-[16px] leading-[21px]">
                      {currentStep.tip}
                    </MochiQuote>
                  </View>
                ) : null}
              </Surface>

              {currentStep.duration_seconds ? (
                <Surface className="mt-4 items-center p-5">
                  <Eyebrow>Temporizador</Eyebrow>
                  <Text className="mt-1 font-display text-[52px] leading-[58px] text-ink">
                    {formatTime(timerSeconds)}
                  </Text>
                  {timerSeconds === 0 ? <Strong className="text-positive">¡Tiempo!</Strong> : null}
                  <View className="mt-4 flex-row gap-3 self-stretch">
                    <PressableScale
                      haptics="selection"
                      onPress={() => {
                        setTimerRunning(false);
                        setTimerSeconds(currentStep.duration_seconds ?? 0);
                      }}
                      accessibilityLabel="Reiniciar temporizador"
                      className="h-[54px] w-[54px] items-center justify-center rounded-control bg-surface-muted"
                    >
                      <Ionicons name="refresh" size={20} color={COLORS.ink} />
                    </PressableScale>
                    <View className="flex-1">
                      <Button
                        title={
                          timerRunning ? "Pausar" : timerSeconds === 0 ? "Reiniciar" : "Iniciar"
                        }
                        variant={timerRunning ? "soft" : "primary"}
                        onPress={() => setTimerRunning((r) => !r)}
                      />
                    </View>
                  </View>
                </Surface>
              ) : null}

              {mochiAnswer && !showAsk ? (
                <View className="mt-4 flex-row items-end gap-2.5">
                  <MochiCharacter expression="happy" size={72} animated={false} />
                  <MochiBubble className="flex-1" tail="left" text={mochiAnswer}>
                    <PressableScale
                      haptics="selection"
                      onPress={() => setMochiAnswer("")}
                      accessibilityLabel="Cerrar respuesta"
                      className="mt-2 self-end"
                    >
                      <Text className="font-body-extrabold text-xs text-accent-strong">Cerrar</Text>
                    </PressableScale>
                  </MochiBubble>
                </View>
              ) : null}
            </>
          ) : null}
          <View className="h-10" />
        </ScrollView>

        <View
          className="flex-row gap-3 bg-canvas px-5 pt-3"
          style={{ paddingBottom: insets.bottom + 14 }}
        >
          <PressableScale
            haptics="selection"
            onPress={() => void handlePrev()}
            disabled={currentIndex === 0}
            accessibilityLabel="Paso anterior"
            className={`h-[54px] w-[54px] items-center justify-center rounded-control bg-surface-muted ${currentIndex === 0 ? "opacity-40" : ""}`}
          >
            <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
          </PressableScale>
          <View className="flex-1">
            <Button
              title={currentIndex + 1 >= steps.length ? "¡Listo, a comer!" : "Siguiente paso"}
              onPress={() => void handleNext()}
            />
          </View>
        </View>
      </View>

      <Sheet visible={showAsk} onClose={() => setShowAsk(false)} title="Pregúntale a Mochi">
        <Caption className="-mt-2 mb-3">Paso actual: {currentStep?.title}</Caption>
        {mochiAnswer ? <MochiBubble className="mb-4" tail="none" text={mochiAnswer} /> : null}
        <Input
          label="Tu pregunta"
          placeholder="¿Puedo usar aceite de oliva? ¿A qué temperatura…?"
          value={question}
          onChangeText={setQuestion}
          multiline
          textAlignVertical="top"
        />
        <Button
          title="Preguntar"
          loading={asking}
          disabled={!question.trim()}
          onPress={() => void handleAskMochi()}
        />
      </Sheet>

      {AlertComponent}
    </>
  );
}

export default RecipePlayerScreen;
