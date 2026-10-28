import { tc } from "@/src/shared/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import {
  ActivityIndicator,
  ImageBackground,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/src/shared/lib/supabase";
import { useSession } from "@/src/core/providers/SessionContext";
import { useAchievement } from "@/src/core/providers/AchievementContext";
import { useCustomAlert } from "@/src/shared/components/CustomAlert";
import { IconCtaButton } from "@/src/shared/components/IconCtaButton";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { checkFavoriteRecipeAchievement } from "@/src/shared/lib/gamification";
import { getRecipeGenerationTypeFromPrompt } from "@/src/shared/lib/recipeCatalog";
import { searchUnsplashImage } from "@/src/shared/lib/unsplash";
import type {
  Recipe,
  RecipeIngredient,
  RecipePublication,
  RecipeStep,
  RecipeCookSession,
} from "@/src/shared/types/database";

const difficultyConfig: Record<string, { label: string; className: string; textClass: string }> = {
  fácil: {
    label: "Fácil",
    className: "bg-green-100 dark:bg-green-900",
    textClass: "text-green-800 dark:text-green-200",
  },
  media: {
    label: "Media",
    className: "bg-yellow-100 dark:bg-yellow-900",
    textClass: "text-yellow-800 dark:text-yellow-200",
  },
  difícil: {
    label: "Difícil",
    className: "bg-red-100 dark:bg-red-900",
    textClass: "text-red-800 dark:text-red-200",
  },
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}min ${s}s` : `${m}min`;
}

function scaleAmount(amount: number | null, baseServings: number, targetServings: number): string {
  if (amount === null) return "";
  const scaled = (amount / baseServings) * targetServings;
  // Redondear a 1 decimal si es necesario
  const rounded = Math.round(scaled * 10) / 10;
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(1);
}

function formatRecipeTag(tag: string): string {
  const normalized = tag.trim();
  if (!normalized) return "";

  const capitalized = normalized.charAt(0).toLocaleUpperCase("es-ES") + normalized.slice(1);

  // Keep multi-word tags on a single line inside pill chips.
  return capitalized.replace(/\s+/g, "\u00A0");
}

export function RecipeDetailScreen() {
  const { recipeId } = useLocalSearchParams<{ recipeId: string }>();
  const { session } = useSession();
  const { showAchievement } = useAchievement();
  const { showAlert, AlertComponent } = useCustomAlert();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [steps, setSteps] = useState<RecipeStep[]>([]);
  const [publication, setPublication] = useState<RecipePublication | null>(null);
  const [activeSession, setActiveSession] = useState<RecipeCookSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Escalado de porciones
  const [servings, setServings] = useState<number>(2);

  // Editar notas personales
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesInput, setNotesInput] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [heroImageLoading, setHeroImageLoading] = useState(false);

  const userId = session?.user.id;

  const loadRecipe = useCallback(async () => {
    if (!userId || !recipeId) {
      setError("No se encontró la receta");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const [recipeRes, ingredientsRes, stepsRes, publicationRes, sessionRes] = await Promise.all([
        supabase.from("recipes").select("*").eq("id", recipeId).eq("user_id", userId).single(),
        supabase
          .from("recipe_ingredients")
          .select("*")
          .eq("recipe_id", recipeId)
          .order("order_index", { ascending: true }),
        supabase
          .from("recipe_steps")
          .select("*")
          .eq("recipe_id", recipeId)
          .order("step_number", { ascending: true }),
        supabase
          .from("recipe_publications")
          .select("*")
          .eq("source_recipe_id", recipeId)
          .maybeSingle(),
        supabase
          .from("recipe_cook_sessions")
          .select("*")
          .eq("recipe_id", recipeId)
          .eq("user_id", userId)
          .eq("is_finished", false)
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (recipeRes.error) throw recipeRes.error;
      if (ingredientsRes.error) throw ingredientsRes.error;
      if (stepsRes.error) throw stepsRes.error;
      if (publicationRes.error) throw publicationRes.error;

      const r = recipeRes.data as Recipe;
      setRecipe(r);
      setIngredients((ingredientsRes.data ?? []) as RecipeIngredient[]);
      setSteps((stepsRes.data ?? []) as RecipeStep[]);
      setPublication((publicationRes.data as RecipePublication | null) ?? null);
      setActiveSession((sessionRes.data as RecipeCookSession | null) ?? null);
      setServings(r.servings);
      setNotesInput(r.personal_notes ?? "");

      setHeroImageLoading(true);
      const imageUrl = await searchUnsplashImage(`${r.title} food dish`, "landscape");
      setHeroImageUrl(imageUrl);
      setHeroImageLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando receta");
    } finally {
      setLoading(false);
    }
  }, [recipeId, userId]);

  useFocusEffect(
    useCallback(() => {
      void loadRecipe();
    }, [loadRecipe]),
  );

  const handleToggleFavorite = async () => {
    if (!recipe || !userId) return;
    const next = !recipe.is_favorite;
    setRecipe((prev) => (prev ? { ...prev, is_favorite: next } : prev));
    await supabase
      .from("recipes")
      .update({ is_favorite: next })
      .eq("id", recipe.id)
      .eq("user_id", userId);
    // Logro: primera receta marcada como favorita
    if (next) await checkFavoriteRecipeAchievement(userId, showAchievement);
  };

  const handleSaveNotes = async () => {
    if (!recipe || !userId) return;
    try {
      setSavingNotes(true);
      const { error: updateError } = await supabase
        .from("recipes")
        .update({ personal_notes: notesInput.trim() || null })
        .eq("id", recipe.id)
        .eq("user_id", userId);
      if (updateError) throw updateError;
      setRecipe((prev) => (prev ? { ...prev, personal_notes: notesInput.trim() || null } : prev));
      setEditingNotes(false);
    } catch (err) {
      showAlert({
        title: "Error",
        message: err instanceof Error ? err.message : "No se pudo guardar",
        buttons: [{ text: "Entendido", style: "cancel" }],
      });
    } finally {
      setSavingNotes(false);
    }
  };

  const handleDelete = () => {
    if (!recipe || !userId) return;
    showAlert({
      title: "Eliminar receta",
      message: `¿Eliminar "${recipe.title}"? Esta acción no se puede deshacer.`,
      buttons: [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            void (async () => {
              await supabase.from("recipes").delete().eq("id", recipe.id).eq("user_id", userId);
              router.back();
            })();
          },
        },
      ],
    });
  };

  const handleTogglePublication = async () => {
    if (!recipe || !userId) return;

    try {
      setPublishing(true);

      if (publication?.is_published) {
        const { error: unpublishError } = await supabase.rpc("unpublish_recipe_from_catalog", {
          p_recipe_id: recipe.id,
        });
        if (unpublishError) throw unpublishError;
      } else {
        const { error: publishError } = await supabase.rpc("publish_recipe_to_catalog", {
          p_recipe_id: recipe.id,
          p_generation_type: getRecipeGenerationTypeFromPrompt(recipe.user_prompt),
        });
        if (publishError) throw publishError;
      }

      await loadRecipe();
    } catch (err) {
      showAlert({
        title: "No se pudo actualizar el catálogo",
        message: err instanceof Error ? err.message : "Intenta de nuevo más tarde",
        buttons: [{ text: "Entendido", style: "destructive" }],
      });
    } finally {
      setPublishing(false);
    }
  };

  const handleStartCooking = () => {
    if (!recipe) return;
    if (activeSession) {
      showAlert({
        title: "Sesión en curso",
        message: `Tienes una sesión activa en el paso ${activeSession.last_step_completed + 1}. ¿Quieres continuar o empezar de nuevo?`,
        buttons: [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Empezar de nuevo",
            style: "destructive",
            onPress: () => router.push(`/recipe-player?recipeId=${recipe.id}&fresh=true`),
          },
          {
            text: "Continuar",
            onPress: () =>
              router.push(`/recipe-player?recipeId=${recipe.id}&sessionId=${activeSession.id}`),
          },
        ],
      });
      return;
    }
    router.push(`/recipe-player?recipeId=${recipe.id}`);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-orange-50 dark:bg-orange-950">
        <MochiCharacter mood="thinking" size={88} />
        <Text className="mt-3 text-sm font-semibold text-orange-700 dark:text-orange-300">
          Cargando receta...
        </Text>
      </SafeAreaView>
    );
  }

  if (error || !recipe) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-orange-50 px-6 dark:bg-orange-950">
        <MochiCharacter mood="sleepy" size={80} />
        <Text className="mt-4 text-center text-sm font-semibold text-red-600 dark:text-red-400">
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

  const diff = difficultyConfig[recipe.difficulty] ?? difficultyConfig["media"];
  const totalTime =
    recipe.total_time_minutes > 0
      ? recipe.total_time_minutes
      : recipe.prep_time_minutes + recipe.cook_time_minutes;

  return (
    <>
      <View className="flex-1 bg-orange-50 dark:bg-orange-950">
        <SafeAreaView className="flex-1">
          <ScrollView
            className="flex-1 px-5"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Nav */}
            <View className="mt-4 flex-row items-center justify-between">
              <TouchableOpacity className="flex-row items-center" onPress={() => router.back()}>
                <Ionicons name="chevron-back" size={22} color={tc("#c2410c")} />
                <Text className="ml-1 font-bold text-orange-900 dark:text-orange-100">Volver</Text>
              </TouchableOpacity>
              <View className="flex-row items-center gap-3">
                <TouchableOpacity onPress={handleToggleFavorite}>
                  <Ionicons
                    name={recipe.is_favorite ? "heart" : "heart"}
                    size={22}
                    color={tc("#f97316")}
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDelete}>
                  <Ionicons name="trash" size={20} color={tc("#ef4444")} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Título y meta */}
            <View className="mt-5 overflow-hidden rounded-3xl border-2 border-orange-200 bg-orange-100 dark:border-orange-800 dark:bg-orange-900">
              {heroImageUrl ? (
                <ImageBackground
                  source={{ uri: heroImageUrl }}
                  className="h-52 w-full"
                  resizeMode="cover"
                >
                  <LinearGradient
                    colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.55)"]}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    className="flex-1 justify-end px-4 pb-4"
                  >
                    <Text className="text-2xl font-extrabold text-white">{recipe.title}</Text>
                  </LinearGradient>
                </ImageBackground>
              ) : (
                <View className="h-52 items-center justify-center">
                  <MochiCharacter mood="thinking" size={72} />
                  <Text className="mt-2 text-sm font-semibold text-orange-700 dark:text-orange-300">
                    {heroImageLoading ? "Buscando imagen de receta..." : recipe.title}
                  </Text>
                </View>
              )}
            </View>

            <View className="mt-4 rounded-3xl border-2 border-orange-200 bg-white p-5 dark:border-orange-800 dark:bg-surface">
              {recipe.description ? (
                <Text className="mt-2 text-sm font-semibold text-orange-700 dark:text-orange-300">
                  {recipe.description}
                </Text>
              ) : null}

              <View className="mt-4 flex-row flex-wrap gap-2">
                {totalTime > 0 && (
                  <View className="flex-row items-center rounded-full bg-orange-100 px-3 py-1.5 dark:bg-orange-900">
                    <Ionicons name="time" size={13} color={tc("#c2410c")} />
                    <Text className="ml-1 text-xs font-bold text-orange-800 dark:text-orange-200">
                      {totalTime} min total
                    </Text>
                  </View>
                )}
                {recipe.prep_time_minutes > 0 && (
                  <View className="flex-row items-center rounded-full bg-amber-100 px-3 py-1.5 dark:bg-amber-900">
                    <Ionicons name="cut" size={13} color={tc("#92400e")} />
                    <Text className="ml-1 text-xs font-bold text-amber-800 dark:text-amber-200">
                      {recipe.prep_time_minutes} min prep
                    </Text>
                  </View>
                )}
                {recipe.cook_time_minutes > 0 && (
                  <View className="flex-row items-center rounded-full bg-red-100 px-3 py-1.5 dark:bg-red-900">
                    <Ionicons name="flame" size={13} color={tc("#b91c1c")} />
                    <Text className="ml-1 text-xs font-bold text-red-800 dark:text-red-200">
                      {recipe.cook_time_minutes} min cocción
                    </Text>
                  </View>
                )}
                <View className={`rounded-full px-3 py-1.5 ${diff.className}`}>
                  <Text className={`text-xs font-bold ${diff.textClass}`}>{diff.label}</Text>
                </View>
                {recipe.cuisine_type ? (
                  <View className="rounded-full bg-purple-100 px-3 py-1.5 dark:bg-purple-900">
                    <Text className="text-xs font-bold text-purple-800 dark:text-purple-200">
                      {formatRecipeTag(recipe.cuisine_type)}
                    </Text>
                  </View>
                ) : null}
              </View>

              {recipe.tags.length > 0 && (
                <View className="mt-3 flex-row flex-wrap gap-1">
                  {recipe.tags.map((tag, index) => (
                    <View
                      key={`${tag}-${index}`}
                      className="shrink-0 self-start rounded-full border border-orange-200 px-2.5 py-1 dark:border-orange-800"
                    >
                      <Text className="text-xs font-semibold leading-4 text-orange-600 dark:text-orange-400">
                        {formatRecipeTag(tag)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <IconCtaButton
                label={
                  publication?.is_published
                    ? "Quitar del catálogo público"
                    : "Publicar en catálogo público"
                }
                onPress={() => void handleTogglePublication()}
                iconName={publication?.is_published ? "eye-off" : "globe"}
                iconColor={tc("#c2410c")}
                iconSize={16}
                containerClassName="mt-4 w-full rounded-2xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950 py-3"
                textClassName="text-orange-800 dark:text-orange-200"
                loading={publishing}
                loadingColor={tc("#c2410c")}
              />
            </View>

            {/* Sesión activa */}
            {activeSession && (
              <View className="mt-4 rounded-3xl border-2 border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950">
                <View className="flex-row items-center">
                  <Ionicons name="play-circle" size={20} color={tc("#d97706")} />
                  <Text className="ml-2 text-sm font-extrabold text-amber-900 dark:text-amber-100">
                    Sesión activa — paso {activeSession.last_step_completed + 1} de {steps.length}
                  </Text>
                </View>
                <Text className="mt-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                  Empezaste esta receta. ¿Continuamos?
                </Text>
              </View>
            )}

            {/* Escalado de porciones */}
            <View className="mt-4 rounded-3xl border-2 border-orange-200 bg-white p-4 dark:border-orange-800 dark:bg-surface">
              <Text className="text-sm font-bold text-orange-900 dark:text-orange-100">
                Porciones
              </Text>
              <View className="mt-3 flex-row items-center justify-between rounded-2xl bg-orange-50 px-4 py-3 dark:bg-orange-950">
                <TouchableOpacity
                  className="h-9 w-9 items-center justify-center rounded-full bg-white dark:bg-surface"
                  onPress={() => setServings((s) => Math.max(1, s - 1))}
                >
                  <Ionicons name="remove" size={18} color={tc("#c2410c")} />
                </TouchableOpacity>
                <Text className="text-xl font-extrabold text-orange-900 dark:text-orange-100">
                  {servings}
                </Text>
                <TouchableOpacity
                  className="h-9 w-9 items-center justify-center rounded-full bg-white dark:bg-surface"
                  onPress={() => setServings((s) => s + 1)}
                >
                  <Ionicons name="add" size={18} color={tc("#c2410c")} />
                </TouchableOpacity>
              </View>
              {servings !== recipe.servings && (
                <Text className="mt-2 text-center text-xs font-semibold text-orange-500">
                  Receta original para {recipe.servings} porciones — cantidades ajustadas
                </Text>
              )}
            </View>

            {/* Ingredientes */}
            {ingredients.length > 0 && (
              <View className="mt-4 rounded-3xl border-2 border-orange-200 bg-white p-4 dark:border-orange-800 dark:bg-surface">
                <View className="flex-row items-center">
                  <Ionicons name="list" size={18} color={tc("#c2410c")} />
                  <Text className="ml-2 text-lg font-extrabold text-orange-900 dark:text-orange-100">
                    Ingredientes
                  </Text>
                </View>
                <View className="mt-3">
                  {ingredients.map((ing, idx) => {
                    const scaled =
                      ing.amount !== null
                        ? scaleAmount(ing.amount, recipe.servings, servings)
                        : null;
                    return (
                      <View
                        key={ing.id}
                        className={`flex-row items-start py-2.5 ${idx < ingredients.length - 1 ? "border-b border-orange-100 dark:border-orange-900" : ""}`}
                      >
                        <View className="mr-3 mt-0.5 h-2 w-2 rounded-full bg-orange-400" />
                        <View className="flex-1">
                          <Text className="text-sm font-bold text-slate-800 dark:text-slate-200">
                            {scaled ? `${scaled}${ing.unit ? ` ${ing.unit}` : ""} ` : ""}
                            <Text className="font-semibold">{ing.name}</Text>
                          </Text>
                          {ing.notes ? (
                            <Text className="mt-0.5 text-xs font-semibold text-orange-600 dark:text-orange-400">
                              {ing.notes}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Pasos */}
            {steps.length > 0 && (
              <View className="mt-4 rounded-3xl border-2 border-orange-200 bg-white p-4 dark:border-orange-800 dark:bg-surface">
                <View className="flex-row items-center">
                  <Ionicons name="footsteps" size={18} color={tc("#c2410c")} />
                  <Text className="ml-2 text-lg font-extrabold text-orange-900 dark:text-orange-100">
                    Preparación
                  </Text>
                </View>
                <View className="mt-3">
                  {steps.map((step) => (
                    <View key={step.id} className="mb-4">
                      <View className="flex-row items-start">
                        <View className="mr-3 h-7 w-7 items-center justify-center rounded-full bg-orange-500">
                          <Text className="text-xs font-extrabold text-white">
                            {step.step_number}
                          </Text>
                        </View>
                        <View className="flex-1">
                          <Text className="text-sm font-extrabold text-orange-900 dark:text-orange-100">
                            {step.title}
                          </Text>
                          {step.duration_seconds ? (
                            <View className="mt-1 flex-row items-center">
                              <Ionicons name="timer" size={12} color={tc("#9a3412")} />
                              <Text className="ml-1 text-xs font-bold text-orange-700 dark:text-orange-300">
                                {formatDuration(step.duration_seconds)}
                              </Text>
                              {step.temperature ? (
                                <Text className="ml-2 text-xs font-bold text-red-600 dark:text-red-400">
                                  · {step.temperature}
                                </Text>
                              ) : null}
                            </View>
                          ) : null}
                          <Text className="mt-1.5 text-sm font-semibold leading-5 text-slate-700 dark:text-slate-300">
                            {step.instructions}
                          </Text>
                          {step.tip ? (
                            <View className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:bg-amber-950">
                              <View className="flex-row items-center">
                                <Ionicons name="bulb" size={13} color={tc("#d97706")} />
                                <Text className="ml-1 text-xs font-bold text-amber-800 dark:text-amber-200">
                                  Consejo de Mochi
                                </Text>
                              </View>
                              <Text className="mt-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                                {step.tip}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Notas personales */}
            <View className="mt-4 rounded-3xl border-2 border-orange-200 bg-white p-4 dark:border-orange-800 dark:bg-surface">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ionicons name="create" size={18} color={tc("#c2410c")} />
                  <Text className="ml-2 text-lg font-extrabold text-orange-900 dark:text-orange-100">
                    Mis notas
                  </Text>
                </View>
                {!editingNotes && (
                  <TouchableOpacity
                    className="rounded-full bg-orange-100 px-3 py-1 dark:bg-orange-900"
                    onPress={() => setEditingNotes(true)}
                  >
                    <Text className="text-xs font-extrabold text-orange-800 dark:text-orange-200">
                      Editar
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {editingNotes ? (
                <>
                  <TextInput
                    className="mt-3 min-h-20 rounded-2xl border-2 border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-slate-800 dark:border-orange-800 dark:bg-orange-950 dark:text-slate-200"
                    placeholder="Tus trucos, variantes, recordatorios..."
                    placeholderTextColor={tc("#fdba74")}
                    value={notesInput}
                    onChangeText={setNotesInput}
                    multiline
                    textAlignVertical="top"
                  />
                  <View className="mt-3 flex-row gap-3">
                    <TouchableOpacity
                      className="flex-1 rounded-2xl border-2 border-orange-200 py-2 dark:border-orange-800"
                      onPress={() => {
                        setEditingNotes(false);
                        setNotesInput(recipe.personal_notes ?? "");
                      }}
                      disabled={savingNotes}
                    >
                      <Text className="text-center font-bold text-orange-700 dark:text-orange-300">
                        Cancelar
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="flex-1 rounded-2xl bg-orange-500 py-2"
                      onPress={() => void handleSaveNotes()}
                      disabled={savingNotes}
                    >
                      {savingNotes ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Text className="text-center font-extrabold text-white">Guardar</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <Text className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-400">
                  {recipe.personal_notes || "Aún no tienes notas para esta receta."}
                </Text>
              )}
            </View>

            <View className="h-32" />
          </ScrollView>

          {/* CTA fijo */}
          <View className="absolute bottom-0 left-0 right-0 border-t border-orange-200 bg-orange-50 px-5 pb-8 pt-3 dark:border-orange-800 dark:bg-orange-950">
            <IconCtaButton
              label={activeSession ? "Continuar cocinando" : "Empezar a cocinar"}
              onPress={handleStartCooking}
              iconName="restaurant"
              iconColor={tc("#ffffff")}
              iconSize={20}
              containerClassName="w-full rounded-2xl bg-orange-500 py-4"
              textClassName="text-base text-white"
            />
          </View>
        </SafeAreaView>
      </View>
      {AlertComponent}
    </>
  );
}

export default RecipeDetailScreen;
