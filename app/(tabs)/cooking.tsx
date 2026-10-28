import { tc } from "@/src/shared/theme/colors";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Keyboard, Platform, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/src/shared/lib/supabase";
import { useSession } from "@/src/core/providers/SessionContext";
import { useAchievement } from "@/src/core/providers/AchievementContext";
import { generateRecipe } from "@/src/shared/lib/ai";
import { buildAiLimitMessage, requestAiUsage } from "@/src/shared/lib/aiCredits";
import { addPoints, checkCookingRecipeAchievements } from "@/src/shared/lib/gamification";
import { useCustomAlert } from "@/src/shared/components/CustomAlert";
import { FloatingActionButton } from "@/src/shared/components/FloatingActionButton";
import { TabHeader } from "@/src/shared/components/TabHeader";
import { getRecipeGenerationTypeFromPrompt } from "@/src/shared/lib/recipeCatalog";
import { searchUnsplashImage } from "@/src/shared/lib/unsplash";
import type {
  RecipePublication,
  AIRecipeResponse,
  RecipeDifficulty,
} from "@/src/shared/types/database";
import type { RecipeGenerationType } from "@/src/shared/lib/ai";
import { useCycleRecommendation } from "@/src/shared/hooks/useCycleRecommendation";
import { useCookingRecipes } from "@/src/features/cooking/hooks/useCookingRecipes";
import { RecipeFiltersCard } from "@/src/features/cooking/components/RecipeFiltersCard";
import { OwnRecipesList } from "@/src/features/cooking/components/OwnRecipesList";
import { PublicRecipesCatalog } from "@/src/features/cooking/components/PublicRecipesCatalog";
import { RecipeGeneratorModal } from "@/src/features/cooking/components/RecipeGeneratorModal";

export function CookingScreen() {
  const { session } = useSession();
  const { showAchievement } = useAchievement();
  const { showAlert, AlertComponent } = useCustomAlert();
  const { tip: cycleCookingTip, personality } = useCycleRecommendation("cooking");

  const userId = session?.user.id;
  const {
    recipes,
    publicRecipes,
    loading,
    publicLoading,
    error,
    publicError,
    loadRecipes,
    loadPublicRecipes,
  } = useCookingRecipes(userId);

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [recipeType, setRecipeType] = useState<RecipeGenerationType>("normal");
  const [servings, setServings] = useState(2);
  const [complexity, setComplexity] = useState<RecipeDifficulty>("media");
  const [generating, setGenerating] = useState(false);
  const [generatingStep, setGeneratingStep] = useState("");
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [recipeImageMap, setRecipeImageMap] = useState<Record<string, string>>({});
  const [recipeImageLoadingMap, setRecipeImageLoadingMap] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<RecipeDifficulty | "all">("all");
  const [typeFilter, setTypeFilter] = useState<RecipeGenerationType | "all">("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

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
      const imageUrl = await searchUnsplashImage(`${title} food dish`, "landscape");

      if (imageUrl) {
        setRecipeImageMap((prev) => ({ ...prev, [recipeId]: imageUrl }));
      }

      setRecipeImageLoadingMap((prev) => ({ ...prev, [recipeId]: false }));
    },
    [recipeImageLoadingMap, recipeImageMap],
  );

  const filteredRecipes = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return recipes.filter((recipe) => {
      if (favoritesOnly && !recipe.is_favorite) {
        return false;
      }

      if (difficultyFilter !== "all" && recipe.difficulty !== difficultyFilter) {
        return false;
      }

      if (
        typeFilter !== "all" &&
        getRecipeGenerationTypeFromPrompt(recipe.user_prompt) !== typeFilter
      ) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        recipe.title,
        recipe.description ?? "",
        recipe.cuisine_type ?? "",
        recipe.tags.join(" "),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [difficultyFilter, favoritesOnly, recipes, searchQuery, typeFilter]);

  const filteredPublicRecipes = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return publicRecipes.filter((publication) => {
      if (difficultyFilter !== "all" && publication.difficulty !== difficultyFilter) {
        return false;
      }

      if (typeFilter !== "all" && publication.generation_type !== typeFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        publication.title,
        publication.description ?? "",
        publication.cuisine_type ?? "",
        publication.tags.join(" "),
        publication.owner_name ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [difficultyFilter, publicRecipes, searchQuery, typeFilter]);

  const handleCloseGenerateModal = () => {
    if (!generating) setShowGenerateModal(false);
  };

  const handleCancelGenerate = () => {
    setShowGenerateModal(false);
    setPrompt("");
    setRecipeType("normal");
    setServings(2);
    setComplexity("media");
  };

  const handleGenerate = async () => {
    if (!userId || !prompt.trim()) return;
    try {
      const usage = await requestAiUsage({
        reason: "ai_recipe",
        sourceRef: "cooking_generate",
      });

      if (!usage.allowed) {
        showAlert({
          title: "Creditos de IA",
          message: buildAiLimitMessage(usage.reason),
          buttons: [{ text: "Entendido", style: "cancel" }],
        });
        return;
      }

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
        const { error: ingError } = await supabase.from("recipe_ingredients").insert(
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
        const { error: stepsError } = await supabase.from("recipe_steps").insert(
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
      await addPoints(userId, "cooking_session", showAchievement);
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
        message: err instanceof Error ? err.message : "No se pudo generar la receta",
        buttons: [{ text: "Entendido", style: "destructive" }],
      });
    } finally {
      setGenerating(false);
      setGeneratingStep("");
    }
  };

  const handleUsePublicRecipe = useCallback(
    async (publication: RecipePublication) => {
      if (!userId) {
        showAlert({
          title: "Inicia sesión",
          message: "Necesitas iniciar sesión para guardar una copia de la receta.",
          buttons: [{ text: "Entendido", style: "cancel" }],
        });
        return;
      }

      if (publication.owner_id === userId) {
        router.push(`/recipe-detail?recipeId=${publication.source_recipe_id}`);
        return;
      }

      try {
        const { data: recipeId, error: importError } = await supabase.rpc("import_public_recipe", {
          p_publication_id: publication.id,
        });

        if (importError) throw importError;

        const newRecipeId = recipeId as string | null;
        if (!newRecipeId) {
          throw new Error("No se pudo crear la copia de la receta");
        }

        await loadRecipes();
        router.push(`/recipe-detail?recipeId=${newRecipeId}`);
      } catch (err) {
        showAlert({
          title: "No se pudo usar la receta",
          message: err instanceof Error ? err.message : "Intenta de nuevo más tarde",
          buttons: [{ text: "Entendido", style: "destructive" }],
        });
      }
    },
    [loadRecipes, showAlert, userId],
  );

  return (
    <>
      <View className="flex-1 bg-orange-50 dark:bg-orange-950">
        <ScrollView className="flex-1 px-5 pt-12" showsVerticalScrollIndicator={false}>
          <TabHeader
            iconName="restaurant"
            title="Cocina"
            subtitle="Recetas y preparación"
            iconColor={tc("#c2410c")}
            titleClassName="text-2xl font-extrabold text-orange-900 dark:text-orange-100"
            subtitleClassName="text-sm font-semibold text-orange-700 dark:text-orange-300"
          />

          <RecipeFiltersCard
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            difficultyFilter={difficultyFilter}
            onDifficultyFilterChange={setDifficultyFilter}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            favoritesOnly={favoritesOnly}
            onToggleFavoritesOnly={() => setFavoritesOnly((prev) => !prev)}
          />

          <OwnRecipesList
            loading={loading}
            error={error}
            onRetry={loadRecipes}
            recipes={recipes}
            filteredRecipes={filteredRecipes}
            cookingTip={cycleCookingTip}
            mochiMood={personality?.mochiMood ?? "happy"}
            imageMap={recipeImageMap}
            loadingMap={recipeImageLoadingMap}
            onLoadImage={loadRecipeImage}
          />

          <PublicRecipesCatalog
            loading={publicLoading}
            error={publicError}
            onRetry={loadPublicRecipes}
            publications={filteredPublicRecipes}
            userId={userId}
            imageMap={recipeImageMap}
            loadingMap={recipeImageLoadingMap}
            onLoadImage={loadRecipeImage}
            onUseRecipe={handleUsePublicRecipe}
          />

          <View className="h-20" />
        </ScrollView>
        <FloatingActionButton
          onPress={() => setShowGenerateModal(true)}
          containerClassName="bg-orange-500"
          borderClassName="border-orange-300 dark:border-orange-700"
          accessibilityLabel="Generar receta con IA"
          showSparkles
        />
      </View>

      <RecipeGeneratorModal
        visible={showGenerateModal}
        generating={generating}
        generatingStep={generatingStep}
        keyboardInset={keyboardInset}
        personality={personality}
        prompt={prompt}
        onPromptChange={setPrompt}
        recipeType={recipeType}
        onRecipeTypeChange={setRecipeType}
        servings={servings}
        onServingsChange={setServings}
        complexity={complexity}
        onComplexityChange={setComplexity}
        onRequestClose={handleCloseGenerateModal}
        onCancel={handleCancelGenerate}
        onGenerate={() => void handleGenerate()}
      />

      {AlertComponent}
    </>
  );
}

export default CookingScreen;
