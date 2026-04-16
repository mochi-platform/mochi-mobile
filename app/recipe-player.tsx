import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  Modal,
  Platform,
  ScrollView,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
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
import {
  addPoints,
  checkCookingSessionAchievements,
  checkPerfectRecipeAchievement,
} from "@/src/shared/lib/gamification";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { useCustomAlert } from "@/src/shared/components/CustomAlert";
import { searchUnsplashImage } from "@/src/shared/lib/unsplash";
import type {
  Recipe,
  RecipeStep,
  RecipeCookSession,
} from "@/src/shared/types/database";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function RecipePlayerScreen() {
  const { recipeId, sessionId, fresh } = useLocalSearchParams<{
    recipeId: string;
    sessionId?: string;
    fresh?: string;
  }>();
  const { session } = useSession();
  const { showAchievement } = useAchievement();
  const { showAlert, AlertComponent } = useCustomAlert();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [steps, setSteps] = useState<RecipeStep[]>([]);
  const [cookSession, setCookSession] = useState<RecipeCookSession | null>(
    null,
  );
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
  const [keyboardInset, setKeyboardInset] = useState(0);
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
          supabase
            .from("recipes")
            .select("*")
            .eq("id", recipeId)
            .eq("user_id", userId)
            .single(),
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
        setError(
          err instanceof Error ? err.message : "Error cargando la receta",
        );
      } finally {
        setLoading(false);
      }
    }
    void load();
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

  useEffect(() => {
    if (Platform.OS !== "android") return;

    const showSub = Keyboard.addListener("keyboardDidShow", (event) => {
      setKeyboardInset(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardInset(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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
    await addPoints(userId, 15, showAchievement);
    await checkCookingSessionAchievements(userId, showAchievement);

    setCompleted(true);
  };

  const handleSaveRating = async (stars: number) => {
    if (!cookSession) return;
    setRating(stars);
    await supabase
      .from("recipe_cook_sessions")
      .update({ rating: stars })
      .eq("id", cookSession.id);
    // Logro: 5 estrellas
    if (stars === 5 && userId)
      await checkPerfectRecipeAchievement(userId, showAchievement);
  };

  const handleAskMochi = async () => {
    if (!question.trim() || !recipe || !currentStep) return;
    try {
      setAsking(true);
      const answer = await askMochiWhileCooking(
        recipe.title,
        currentStep.title,
        question.trim(),
      );
      setMochiAnswer(answer);
      setQuestion("");
    } finally {
      setAsking(false);
    }
  };

  // ─── Loading ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-orange-50">
        <MochiCharacter mood="thinking" size={90} />
        <Text className="mt-3 text-sm font-semibold text-orange-700">
          Preparando tu cocina...
        </Text>
      </SafeAreaView>
    );
  }

  if (error || !recipe) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-orange-50 px-6">
        <MochiCharacter mood="sleepy" size={80} />
        <Text className="mt-4 text-center text-sm font-semibold text-red-600">
          {error}
        </Text>
        <TouchableOpacity
          className="mt-6 rounded-2xl bg-orange-500 px-6 py-3"
          onPress={() => router.back()}
        >
          <Text className="font-bold text-white">Volver</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ─── Pantalla de finalización ─────────────────────────────────────────────────

  if (completed) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-orange-50 px-6">
        <MochiCharacter mood="excited" size={110} />
        <Text className="mt-6 text-2xl font-extrabold text-orange-900">
          ¡Buen provecho!
        </Text>
        <Text className="mt-2 text-center text-sm font-semibold text-orange-600">
          Terminaste "{recipe.title}"
        </Text>

        <View className="mt-8 rounded-3xl border-2 border-orange-200 bg-white p-5">
          <Text className="text-center text-sm font-extrabold text-orange-900">
            ¿Cómo quedó?
          </Text>
          <View className="mt-3 flex-row justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => void handleSaveRating(star)}
              >
                <Ionicons
                  name={rating >= star ? "star" : "star"}
                  size={32}
                  color="#f97316"
                />
              </TouchableOpacity>
            ))}
          </View>
          {rating > 0 && (
            <Text className="mt-2 text-center text-xs font-semibold text-orange-500">
              {rating === 5
                ? "¡Obra maestra!"
                : rating === 4
                  ? "¡Muy rico!"
                  : rating === 3
                    ? "¡Bien!"
                    : rating === 2
                      ? "Mejorable"
                      : "Hay que practicar"}
            </Text>
          )}
        </View>

        <TouchableOpacity
          className="mt-6 rounded-2xl bg-orange-500 px-8 py-4"
          onPress={() => router.back()}
        >
          <Text className="font-extrabold text-white">Volver a la receta</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ─── Player principal ─────────────────────────────────────────────────────────

  return (
    <>
      <View className="flex-1 bg-orange-50">
        <SafeAreaView className="flex-1">
          {/* Header */}
          <View className="px-5 pt-4">
            <View className="flex-row items-center justify-between">
              <TouchableOpacity
                className="flex-row items-center"
                onPress={() => {
                  showAlert({
                    title: "Salir de la receta",
                    message:
                      "Tu progreso se guardará. Podrás continuar desde aquí cuando quieras.",
                    buttons: [
                      { text: "Cancelar", style: "cancel" },
                      { text: "Salir", onPress: () => router.back() },
                    ],
                  });
                }}
              >
                <Ionicons name="chevron-back" size={22} color="#c2410c" />
                <Text className="ml-1 font-bold text-orange-900">Salir</Text>
              </TouchableOpacity>
              <Text className="text-sm font-extrabold text-orange-700">
                {currentIndex + 1} / {steps.length}
              </Text>
              <TouchableOpacity
                className="h-9 w-9 items-center justify-center rounded-full bg-orange-200"
                onPress={() => {
                  setShowAsk(true);
                  setMochiAnswer("");
                }}
              >
                <Ionicons name="help" size={18} color="#c2410c" />
              </TouchableOpacity>
            </View>

            {/* Barra de progreso */}
            <View className="mt-3 h-2 w-full overflow-hidden rounded-full bg-orange-100">
              <Animated.View
                style={progressStyle}
                className="h-2 rounded-full bg-orange-500"
              />
            </View>

            <Text
              className="mt-1.5 text-xs font-semibold text-orange-500"
              numberOfLines={1}
            >
              {recipe.title}
            </Text>
          </View>

          <ScrollView
            className="flex-1 px-5 pt-4"
            showsVerticalScrollIndicator={false}
          >
            {currentStep && (
              <>
                {/* Número y título del paso */}
                <View className="rounded-3xl border-2 border-orange-200 bg-white p-5">
                  <View className="flex-row items-center">
                    <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-orange-500">
                      <Text className="text-base font-extrabold text-white">
                        {currentStep.step_number}
                      </Text>
                    </View>
                    <Text className="flex-1 text-lg font-extrabold text-orange-950">
                      {currentStep.title}
                    </Text>
                    <View className="ml-3 h-20 w-20 overflow-hidden rounded-2xl bg-orange-100">
                      {stepImageUrl ? (
                        <Image
                          source={{ uri: stepImageUrl }}
                          className="h-full w-full"
                          resizeMode="cover"
                        />
                      ) : (
                        <View className="h-full items-center justify-center">
                          <MochiCharacter mood="thinking" size={30} />
                          {stepImageLoading ? (
                            <Text className="mt-1 text-[10px] font-semibold text-orange-700">
                              Cargando...
                            </Text>
                          ) : null}
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Meta del paso */}
                  {(currentStep.duration_seconds ||
                    currentStep.temperature) && (
                    <View className="mt-3 flex-row flex-wrap gap-2">
                      {currentStep.duration_seconds ? (
                        <View className="flex-row items-center rounded-full bg-orange-100 px-3 py-1">
                          <Ionicons
                            name="timer"
                            size={13}
                            color="#c2410c"
                          />
                          <Text className="ml-1 text-xs font-bold text-orange-800">
                            {formatTime(currentStep.duration_seconds)}
                          </Text>
                        </View>
                      ) : null}
                      {currentStep.temperature ? (
                        <View className="flex-row items-center rounded-full bg-red-100 px-3 py-1">
                          <Ionicons
                            name="thermometer"
                            size={13}
                            color="#b91c1c"
                          />
                          <Text className="ml-1 text-xs font-bold text-red-700">
                            {currentStep.temperature}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  )}

                  {/* Instrucciones */}
                  <Text className="mt-4 text-base font-semibold leading-6 text-slate-700">
                    {currentStep.instructions}
                  </Text>

                  {/* Tip */}
                  {currentStep.tip ? (
                    <View className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                      <View className="flex-row items-center">
                        <Ionicons name="bulb" size={15} color="#d97706" />
                        <Text className="ml-1.5 text-xs font-extrabold text-amber-800">
                          Consejo de Mochi
                        </Text>
                      </View>
                      <Text className="mt-1 text-sm font-semibold text-amber-700">
                        {currentStep.tip}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Timer */}
                {currentStep.duration_seconds ? (
                  <View className="mt-4 rounded-3xl border-2 border-orange-200 bg-white p-5">
                    <Text className="text-center text-sm font-bold text-orange-700">
                      Temporizador
                    </Text>
                    <Text className="mt-2 text-center text-5xl font-extrabold text-orange-900">
                      {formatTime(timerSeconds)}
                    </Text>
                    {timerSeconds === 0 && (
                      <Text className="mt-1 text-center text-sm font-extrabold text-green-600">
                        ¡Tiempo!
                      </Text>
                    )}
                    <View className="mt-4 flex-row justify-center gap-3">
                      <TouchableOpacity
                        className="rounded-2xl border-2 border-orange-200 px-5 py-3"
                        onPress={() => {
                          setTimerRunning(false);
                          setTimerSeconds(currentStep.duration_seconds!);
                        }}
                      >
                        <Ionicons name="refresh" size={18} color="#c2410c" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        className={`flex-1 rounded-2xl py-3 ${timerRunning ? "bg-orange-200" : "bg-orange-500"}`}
                        onPress={() => setTimerRunning((r) => !r)}
                      >
                        <View className="flex-row items-center justify-center gap-2">
                          <Ionicons
                            name={timerRunning ? "pause" : "play"}
                            size={18}
                            color={timerRunning ? "#c2410c" : "white"}
                          />
                          <Text
                            className={`font-extrabold ${timerRunning ? "text-orange-800" : "text-white"}`}
                          >
                            {timerRunning
                              ? "Pausar"
                              : timerSeconds === 0
                                ? "Reiniciar"
                                : "Iniciar"}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}

                {/* Respuesta de Mochi si la hay */}
                {mochiAnswer ? (
                  <View className="mt-4 rounded-3xl border-2 border-yellow-200 bg-yellow-50 p-4">
                    <View className="flex-row items-center">
                      <MochiCharacter mood="happy" size={40} />
                      <Text className="ml-3 flex-1 text-sm font-semibold text-yellow-900 leading-5">
                        {mochiAnswer}
                      </Text>
                    </View>
                    <TouchableOpacity
                      className="mt-3 self-end"
                      onPress={() => setMochiAnswer("")}
                    >
                      <Text className="text-xs font-bold text-yellow-600">
                        Cerrar
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </>
            )}

            <View className="h-32" />
          </ScrollView>

          {/* Navegación entre pasos */}
          <View className="border-t border-orange-200 bg-orange-50 px-5 pb-8 pt-3">
            <View className="flex-row gap-3">
              <TouchableOpacity
                className={`h-14 w-14 items-center justify-center rounded-2xl border-2 border-orange-200 ${currentIndex === 0 ? "opacity-40" : ""}`}
                onPress={() => void handlePrev()}
                disabled={currentIndex === 0}
              >
                <Ionicons name="chevron-back" size={22} color="#c2410c" />
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 items-center justify-center rounded-2xl bg-orange-500 py-3"
                onPress={() => void handleNext()}
                activeOpacity={0.85}
              >
                <Text className="text-base font-extrabold text-white">
                  {currentIndex + 1 >= steps.length
                    ? "¡Listo, a comer!"
                    : "Siguiente paso"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* Modal preguntarle a Mochi */}
      <Modal
        transparent
        visible={showAsk}
        animationType="slide"
        onRequestClose={() => setShowAsk(false)}
      >
        <View
          className="flex-1 justify-end"
          style={{ paddingBottom: keyboardInset }}
        >
          <View className="flex-1 justify-end bg-black/40">
            <View className="max-h-[90%] rounded-t-3xl bg-white px-5 pb-10 pt-5">
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View className="mb-4 h-1.5 w-16 self-center rounded-full bg-slate-200" />

                <View className="flex-row items-center">
                  <MochiCharacter mood="thinking" size={50} />
                  <View className="ml-3 flex-1">
                    <Text className="text-base font-extrabold text-orange-900">
                      Pregúntale a Mochi
                    </Text>
                    <Text className="text-xs font-semibold text-orange-600">
                      Paso actual: {currentStep?.title}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowAsk(false)}>
                    <Ionicons name="close" size={22} color="#64748b" />
                  </TouchableOpacity>
                </View>

                {mochiAnswer ? (
                  <View className="mt-4 rounded-2xl border-2 border-yellow-200 bg-yellow-50 p-4">
                    <Text className="text-sm font-semibold text-yellow-900 leading-5">
                      {mochiAnswer}
                    </Text>
                  </View>
                ) : null}

                <TextInput
                  className="mt-4 rounded-2xl border-2 border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-slate-800"
                  placeholder="¿Puedo usar aceite de oliva? ¿A qué temperatura...?"
                  placeholderTextColor="#fdba74"
                  value={question}
                  onChangeText={setQuestion}
                  multiline
                  textAlignVertical="top"
                />

                <TouchableOpacity
                  className={`mt-4 flex-row items-center justify-center rounded-2xl py-4 ${question.trim() && !asking ? "bg-orange-500" : "bg-orange-200"}`}
                  onPress={() => void handleAskMochi()}
                  disabled={!question.trim() || asking}
                >
                  {asking ? (
                    <>
                      <MochiCharacter mood="thinking" size={22} />
                      <Text className="ml-2 font-extrabold text-white">
                        Pensando...
                      </Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={16} color="white" />
                      <Text className="ml-2 font-extrabold text-white">
                        Preguntar
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {AlertComponent}
    </>
  );
}

export default RecipePlayerScreen;
