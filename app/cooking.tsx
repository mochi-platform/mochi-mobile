import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { supabase } from "@/src/shared/lib/supabase";
import { useSession } from "@/src/core/providers/SessionContext";
import { useAchievement } from "@/src/core/providers/AchievementContext";
import { generateRecipe } from "@/src/shared/lib/ai";
import {
  addPoints,
  checkCookingRecipeAchievements,
} from "@/src/shared/lib/gamification";
import { useCustomAlert } from "@/src/shared/components/CustomAlert";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { searchUnsplashImage } from "@/src/shared/lib/unsplash";
import type {
  Recipe,
  AIRecipeResponse,
  RecipeDifficulty,
} from "@/src/shared/types/database";
import type { RecipeGenerationType } from "@/src/shared/lib/ai";
import { useCycleRecommendation } from "@/src/shared/hooks/useCycleRecommendation";

const difficultyConfig: Record<
  string,
  { label: string; className: string; textClass: string }
> = {
  fácil: {
    label: "Fácil",
    className: "bg-green-100",
    textClass: "text-green-800",
  },
  media: {
    label: "Media",
    className: "bg-yellow-100",
    textClass: "text-yellow-800",
  },
  difícil: {
    label: "Difícil",
    className: "bg-red-100",
    textClass: "text-red-800",
  },
};

const recipeTypeOptions: Array<{ value: RecipeGenerationType; label: string }> =
  [
    { value: "normal", label: "Normal" },
    { value: "keto", label: "Keto" },
    { value: "vegetariana", label: "Vegetariana" },
    { value: "vegana", label: "Vegana" },
    { value: "alta_proteina", label: "Alta proteína" },
  ];

const complexityOptions: Array<{ value: RecipeDifficulty; label: string }> = [
  { value: "fácil", label: "Fácil" },
  { value: "media", label: "Media" },
  { value: "difícil", label: "Difícil" },
];

function RecipeCard({
  recipe,
  onPress,
  imageUrl,
  imageLoading,
  onLoadImage,
}: {
  recipe: Recipe;
  onPress: () => void;
  imageUrl: string | null;
  imageLoading: boolean;
  onLoadImage: (recipeId: string, title: string) => Promise<void>;
}) {
  const diff = difficultyConfig[recipe.difficulty] ?? difficultyConfig["media"];
  const totalTime =
    recipe.total_time_minutes > 0
      ? recipe.total_time_minutes
      : recipe.prep_time_minutes + recipe.cook_time_minutes;

  useEffect(() => {
    void onLoadImage(recipe.id, recipe.title);
  }, [onLoadImage, recipe.id, recipe.title]);

  return (
    <TouchableOpacity
      className="mb-3 rounded-3xl border-2 border-orange-200 bg-white p-4"
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View className="mb-3 h-28 overflow-hidden rounded-2xl bg-orange-100">
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            className="h-full w-full"
            resizeMode="cover"
          />
        ) : (
          <View className="h-full items-center justify-center">
            <MochiCharacter mood="thinking" size={48} />
            {imageLoading ? (
              <Text className="mt-1 text-xs font-semibold text-orange-700">
                Buscando imagen...
              </Text>
            ) : null}
          </View>
        )}
      </View>

      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text
            className="text-base font-extrabold text-orange-950"
            numberOfLines={2}
          >
            {recipe.title}
          </Text>
          {recipe.description ? (
            <Text
              className="mt-1 text-xs font-semibold text-orange-700"
              numberOfLines={2}
            >
              {recipe.description}
            </Text>
          ) : null}
        </View>
        {recipe.is_favorite && (
          <Ionicons name="heart" size={18} color="#f97316" />
        )}
      </View>

      <View className="mt-3 flex-row flex-wrap items-center gap-2">
        {totalTime > 0 && (
          <View className="flex-row items-center rounded-full bg-orange-100 px-3 py-1">
            <Ionicons name="time-outline" size={12} color="#c2410c" />
            <Text className="ml-1 text-xs font-bold text-orange-800">
              {totalTime} min
            </Text>
          </View>
        )}
        <View className={`rounded-full px-3 py-1 ${diff.className}`}>
          <Text className={`text-xs font-bold ${diff.textClass}`}>
            {diff.label}
          </Text>
        </View>
        {recipe.servings > 0 && (
          <View className="flex-row items-center rounded-full bg-orange-100 px-3 py-1">
            <Ionicons name="people-outline" size={12} color="#c2410c" />
            <Text className="ml-1 text-xs font-bold text-orange-800">
              {recipe.servings} porc.
            </Text>
          </View>
        )}
        {recipe.cuisine_type ? (
          <View className="rounded-full bg-amber-100 px-3 py-1">
            <Text className="text-xs font-bold text-amber-800">
              {recipe.cuisine_type}
            </Text>
          </View>
        ) : null}
      </View>

      {recipe.tags.length > 0 && (
        <View className="mt-2 flex-row flex-wrap gap-1">
          {recipe.tags.slice(0, 3).map((tag) => (
            <View
              key={tag}
              className="rounded-full border border-orange-200 px-2 py-0.5"
            >
              <Text className="text-xs font-semibold text-orange-600">
                {tag}
              </Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

export function CookingScreen() {
  const { session } = useSession();
  const { showAchievement } = useAchievement();
  const { showAlert, AlertComponent } = useCustomAlert();
  const { tip: cycleCookingTip, personality } =
    useCycleRecommendation("cooking");

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [recipeType, setRecipeType] = useState<RecipeGenerationType>("normal");
  const [servings, setServings] = useState(2);
  const [complexity, setComplexity] = useState<RecipeDifficulty>("media");
  const [generating, setGenerating] = useState(false);
  const [generatingStep, setGeneratingStep] = useState("");
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [recipeImageMap, setRecipeImageMap] = useState<Record<string, string>>(
    {},
  );
  const [recipeImageLoadingMap, setRecipeImageLoadingMap] = useState<
    Record<string, boolean>
  >({});

  const userId = session?.user.id;

  const loadRecipes = useCallback(async () => {
    if (!userId) {
      setRecipes([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from("recipes")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (fetchError) throw fetchError;
      setRecipes((data ?? []) as Recipe[]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar las recetas",
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void loadRecipes();
    }, [loadRecipes]),
  );

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

  const loadRecipeImage = useCallback(
    async (recipeId: string, title: string) => {
      if (recipeImageMap[recipeId] || recipeImageLoadingMap[recipeId]) return;

      setRecipeImageLoadingMap((prev) => ({ ...prev, [recipeId]: true }));
      const imageUrl = await searchUnsplashImage(
        `${title} food dish`,
        "landscape",
      );

      if (imageUrl) {
        setRecipeImageMap((prev) => ({ ...prev, [recipeId]: imageUrl }));
      }

      setRecipeImageLoadingMap((prev) => ({ ...prev, [recipeId]: false }));
    },
    [recipeImageLoadingMap, recipeImageMap],
  );

  const handleGenerate = async () => {
    if (!userId || !prompt.trim()) return;
    try {
      setGenerating(true);
      setGeneratingStep("Pensando en tu receta...");

      const aiRecipe: AIRecipeResponse = await generateRecipe(
        prompt.trim(),
        {
          recipeType,
          servings,
          complexity,
        },
        personality?.phaseLabel,
      );
      setGeneratingStep("Guardando receta...");

      const totalTime = aiRecipe.prep_time_minutes + aiRecipe.cook_time_minutes;

      const { data: recipeData, error: recipeError } = await supabase
        .from("recipes")
        .insert({
          user_id: userId,
          title: aiRecipe.title,
          description: aiRecipe.description,
          total_time_minutes: totalTime,
          prep_time_minutes: aiRecipe.prep_time_minutes,
          cook_time_minutes: aiRecipe.cook_time_minutes,
          servings: aiRecipe.servings,
          difficulty: aiRecipe.difficulty,
          cuisine_type: aiRecipe.cuisine_type || null,
          tags: aiRecipe.tags ?? [],
          user_prompt: `${prompt.trim()} | Tipo: ${recipeType} | Personas: ${servings} | Complejidad: ${complexity}${personality ? ` | Fase: ${personality.phaseLabel}` : ""}`,
        })
        .select("id")
        .single();

      if (recipeError) throw recipeError;
      const recipeId = recipeData.id;

      if (aiRecipe.ingredients.length > 0) {
        const { error: ingError } = await supabase
          .from("recipe_ingredients")
          .insert(
            aiRecipe.ingredients.map((ing, idx) => ({
              recipe_id: recipeId,
              order_index: idx,
              name: ing.name,
              amount: ing.amount,
              unit: ing.unit,
              notes: ing.notes,
            })),
          );
        if (ingError) throw ingError;
      }

      if (aiRecipe.steps.length > 0) {
        const { error: stepsError } = await supabase
          .from("recipe_steps")
          .insert(
            aiRecipe.steps.map((step) => ({
              recipe_id: recipeId,
              step_number: step.step_number,
              title: step.title,
              instructions: step.instructions,
              duration_seconds: step.duration_seconds,
              temperature: step.temperature,
              tip: step.tip,
            })),
          );
        if (stepsError) throw stepsError;
      }

      // Puntos y logros
      await addPoints(userId, 5, showAchievement);
      await checkCookingRecipeAchievements(userId, showAchievement);

      setShowGenerateModal(false);
      setPrompt("");
      setRecipeType("normal");
      setServings(2);
      setComplexity("media");
      await loadRecipes();
      router.push(`/recipe-detail?recipeId=${recipeId}`);
    } catch (err) {
      showAlert({
        title: "Error al generar",
        message:
          err instanceof Error ? err.message : "No se pudo generar la receta",
        buttons: [{ text: "Entendido", style: "destructive" }],
      });
    } finally {
      setGenerating(false);
      setGeneratingStep("");
    }
  };

  return (
    <>
      <View className="flex-1 bg-orange-50">
        <ScrollView
          className="flex-1 px-5 pt-12"
          showsVerticalScrollIndicator={false}
        >
          <View className="mb-5 flex-row items-center">
            <Ionicons name="restaurant" size={20} color="#c2410c" />
            <Text className="ml-2 text-2xl font-extrabold text-orange-900">
              Cocina
            </Text>
          </View>

          <TouchableOpacity
            className="mb-5 flex-row items-center justify-center rounded-3xl bg-orange-500 py-4"
            onPress={() => setShowGenerateModal(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="sparkles" size={18} color="white" />
            <Text className="ml-2 text-base font-extrabold text-white">
              Generar receta con IA
            </Text>
          </TouchableOpacity>

          {loading ? (
            <View className="items-center py-12">
              <MochiCharacter mood="thinking" size={88} />
              <Text className="mt-3 text-sm font-semibold text-orange-700">
                Cargando recetas...
              </Text>
            </View>
          ) : error ? (
            <View className="rounded-3xl border-2 border-red-200 bg-red-50 p-4">
              <Text className="text-sm font-semibold text-red-700">
                {error}
              </Text>
              <TouchableOpacity
                className="mt-3 rounded-2xl bg-red-500 py-2"
                onPress={() => void loadRecipes()}
              >
                <Text className="text-center font-bold text-white">
                  Reintentar
                </Text>
              </TouchableOpacity>
            </View>
          ) : recipes.length === 0 ? (
            <View className="items-center rounded-3xl border-2 border-orange-200 bg-white p-8">
              <MochiCharacter
                mood={personality?.mochiMood ?? "happy"}
                size={88}
              />
              <Text className="mt-3 text-center text-base font-extrabold text-orange-900">
                Aún no tienes recetas guardadas
              </Text>
              <Text className="mt-2 text-center text-sm font-semibold text-orange-600">
                {cycleCookingTip ??
                  "Cuéntame qué quieres cocinar y lo creo para ti"}
              </Text>
            </View>
          ) : (
            recipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                imageUrl={recipeImageMap[recipe.id] ?? null}
                imageLoading={Boolean(recipeImageLoadingMap[recipe.id])}
                onLoadImage={loadRecipeImage}
                onPress={() =>
                  router.push(`/recipe-detail?recipeId=${recipe.id}`)
                }
              />
            ))
          )}
          <View className="h-6" />
        </ScrollView>
      </View>

      <Modal
        transparent
        visible={showGenerateModal}
        animationType="slide"
        onRequestClose={() => {
          if (!generating) setShowGenerateModal(false);
        }}
      >
        <TouchableWithoutFeedback
          onPress={() => {
            if (!generating) setShowGenerateModal(false);
          }}
        >
          <View
            className="flex-1 justify-end bg-black/40"
            style={{ paddingBottom: keyboardInset }}
          >
            <TouchableWithoutFeedback onPress={() => undefined}>
              <View className="max-h-[90%] rounded-t-3xl bg-white px-5 pb-10 pt-5">
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <View className="mb-4 h-1.5 w-16 self-center rounded-full bg-slate-200" />

                  {generating ? (
                    <View className="items-center py-8">
                      <MochiCharacter mood="thinking" size={90} />
                      <Text className="mt-4 text-center text-base font-extrabold text-orange-900">
                        {generatingStep}
                      </Text>
                      <ActivityIndicator
                        className="mt-4"
                        size="large"
                        color="#f97316"
                      />
                    </View>
                  ) : (
                    <>
                      <Text className="text-xl font-extrabold text-orange-900">
                        ¿Qué quieres cocinar?
                      </Text>
                      <Text className="mt-1 text-sm font-semibold text-orange-600">
                        Descríbelo con tus palabras, yo me encargo del resto
                      </Text>
                      {personality && (
                        <View
                          className={`mt-3 self-start rounded-full border px-3 py-1 ${personality.phaseBadgeClass}`}
                        >
                          <View className="flex-row items-center">
                            <Ionicons
                              name={personality.phaseIconName}
                              size={12}
                              color="#334155"
                            />
                            <Text className="ml-1 text-xs font-extrabold text-slate-700">
                              {personality.phaseLabel}
                            </Text>
                          </View>
                        </View>
                      )}
                      <View className="mt-4 rounded-2xl border-2 border-orange-200 bg-orange-50 px-4 py-3">
                        <Text className="mb-1 text-xs font-bold text-orange-700">
                          Ejemplos:
                        </Text>
                        <Text className="text-xs font-semibold text-orange-600">
                          • "pasta con atún rápida para 1 persona"{"\n"}• "algo
                          dulce con plátano, huevo y avena"{"\n"}• "pollo al
                          horno fácil para 4, menos de 40 minutos"
                        </Text>
                      </View>
                      <View className="mt-4 rounded-2xl border-2 border-orange-200 bg-orange-50 px-4 py-3">
                        <Text className="text-xs font-bold text-orange-700">
                          Tipo de receta
                        </Text>
                        <View className="mt-2 flex-row flex-wrap gap-2">
                          {recipeTypeOptions.map((option) => {
                            const selected = recipeType === option.value;
                            return (
                              <TouchableOpacity
                                key={option.value}
                                className={`rounded-full border px-3 py-1 ${selected ? "border-orange-500 bg-orange-500" : "border-orange-200 bg-white"}`}
                                onPress={() => setRecipeType(option.value)}
                              >
                                <Text
                                  className={`text-xs font-bold ${selected ? "text-white" : "text-orange-700"}`}
                                >
                                  {option.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        <Text className="mt-4 text-xs font-bold text-orange-700">
                          Cantidad de personas
                        </Text>
                        <View className="mt-2 flex-row items-center justify-between rounded-2xl border border-orange-200 bg-white px-3 py-2">
                          <TouchableOpacity
                            className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1"
                            onPress={() =>
                              setServings((prev) => Math.max(1, prev - 1))
                            }
                          >
                            <Text className="text-sm font-extrabold text-orange-700">
                              -
                            </Text>
                          </TouchableOpacity>
                          <Text className="text-base font-extrabold text-orange-900">
                            {servings} {servings === 1 ? "persona" : "personas"}
                          </Text>
                          <TouchableOpacity
                            className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1"
                            onPress={() =>
                              setServings((prev) => Math.min(12, prev + 1))
                            }
                          >
                            <Text className="text-sm font-extrabold text-orange-700">
                              +
                            </Text>
                          </TouchableOpacity>
                        </View>

                        <Text className="mt-4 text-xs font-bold text-orange-700">
                          Nivel de complejidad
                        </Text>
                        <View className="mt-2 flex-row gap-2">
                          {complexityOptions.map((option) => {
                            const selected = complexity === option.value;
                            return (
                              <TouchableOpacity
                                key={option.value}
                                className={`flex-1 rounded-xl border px-3 py-2 ${selected ? "border-orange-500 bg-orange-500" : "border-orange-200 bg-white"}`}
                                onPress={() => setComplexity(option.value)}
                              >
                                <Text
                                  className={`text-center text-xs font-bold ${selected ? "text-white" : "text-orange-700"}`}
                                >
                                  {option.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                      <TextInput
                        className="mt-4 min-h-24 rounded-2xl border-2 border-orange-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800"
                        placeholder="Quiero hacer..."
                        placeholderTextColor="#fdba74"
                        value={prompt}
                        onChangeText={setPrompt}
                        multiline
                        textAlignVertical="top"
                      />
                      <View className="mt-5 flex-row gap-3">
                        <TouchableOpacity
                          className="flex-1 rounded-2xl border-2 border-orange-200 py-3"
                          onPress={() => {
                            setShowGenerateModal(false);
                            setPrompt("");
                            setRecipeType("normal");
                            setServings(2);
                            setComplexity("media");
                          }}
                        >
                          <Text className="text-center font-bold text-orange-700">
                            Cancelar
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          className={`flex-1 rounded-2xl py-3 ${prompt.trim() ? "bg-orange-500" : "bg-orange-200"}`}
                          onPress={() => void handleGenerate()}
                          disabled={!prompt.trim()}
                        >
                          <Text className="text-center font-extrabold text-white">
                            Generar
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {AlertComponent}
    </>
  );
}

export default CookingScreen;
