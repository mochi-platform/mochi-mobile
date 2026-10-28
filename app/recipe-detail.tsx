import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { ImageBackground, Text, View } from "react-native";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/src/shared/lib/supabase";
import { useSession } from "@/src/core/providers/SessionContext";
import { useAchievement } from "@/src/core/providers/AchievementContext";
import { useCustomAlert } from "@/src/shared/components/CustomAlert";
import { COLORS } from "@/src/shared/theme/tokens";
import {
  Body,
  Button,
  Caption,
  ELEVATION,
  ErrorState,
  Eyebrow,
  Input,
  MochiQuote,
  PressableScale,
  Screen,
  SectionHeader,
  Strong,
  Surface,
  Title,
} from "@/src/shared/ui";
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

const difficultyConfig: Record<string, { label: string }> = {
  fácil: { label: "Fácil" },
  media: { label: "Media" },
  difícil: { label: "Difícil" },
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
  const insets = useSafeAreaInsets();

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
      <View className="flex-1 items-center justify-center bg-canvas">
        <MochiCharacter expression="thinking" size={120} />
        <Caption className="mt-3">Abriendo la receta…</Caption>
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

  const diff = difficultyConfig[recipe.difficulty] ?? difficultyConfig["media"];
  const totalTime =
    recipe.total_time_minutes > 0
      ? recipe.total_time_minutes
      : recipe.prep_time_minutes + recipe.cook_time_minutes;
  const pills: { icon?: keyof typeof Ionicons.glyphMap; label: string }[] = [
    ...(totalTime > 0 ? [{ icon: "time" as const, label: `${totalTime} min` }] : []),
    ...(recipe.prep_time_minutes > 0
      ? [{ icon: "cut" as const, label: `${recipe.prep_time_minutes} min prep` }]
      : []),
    ...(recipe.cook_time_minutes > 0
      ? [{ icon: "flame" as const, label: `${recipe.cook_time_minutes} min cocción` }]
      : []),
    { label: diff.label },
    ...(recipe.cuisine_type ? [{ label: formatRecipeTag(recipe.cuisine_type) }] : []),
  ];

  return (
    <>
      <View className="flex-1 bg-canvas">
        <Screen
          withTabBar={false}
          headerRight={
            <View className="flex-row gap-2">
              <PressableScale
                haptics="selection"
                onPress={handleToggleFavorite}
                accessibilityLabel={
                  recipe.is_favorite ? "Quitar de favoritas" : "Marcar como favorita"
                }
                className="h-10 w-10 items-center justify-center rounded-full bg-surface-muted"
              >
                <Ionicons
                  name={recipe.is_favorite ? "heart" : "heart-outline"}
                  size={20}
                  color={recipe.is_favorite ? COLORS.accent : COLORS.inkMuted}
                />
              </PressableScale>
              <PressableScale
                haptics="warning"
                onPress={handleDelete}
                accessibilityLabel="Eliminar receta"
                className="h-10 w-10 items-center justify-center rounded-full bg-surface-muted"
              >
                <Ionicons name="trash-outline" size={19} color={COLORS.danger} />
              </PressableScale>
              <PressableScale
                onPress={() => router.back()}
                accessibilityLabel="Volver"
                className="h-10 w-10 items-center justify-center rounded-full bg-surface-muted"
              >
                <Ionicons name="close" size={20} color={COLORS.inkMuted} />
              </PressableScale>
            </View>
          }
        >
          <View className="mt-3 overflow-hidden rounded-card bg-tint-kitchen" style={ELEVATION[2]}>
            {heroImageUrl ? (
              <ImageBackground
                source={{ uri: heroImageUrl }}
                className="h-56 w-full"
                resizeMode="cover"
              >
                <LinearGradient
                  colors={["rgba(0,0,0,0)", "rgba(40,20,20,0.6)"]}
                  start={{ x: 0.5, y: 0.2 }}
                  end={{ x: 0.5, y: 1 }}
                  className="flex-1 justify-end px-5 pb-4"
                >
                  <Text className="font-display text-[26px] leading-[30px] text-white">
                    {recipe.title}
                  </Text>
                </LinearGradient>
              </ImageBackground>
            ) : (
              <View className="items-center px-5 pb-5 pt-4">
                <MochiCharacter expression="excited" size={96} animated={false} shadow={false} />
                {heroImageLoading ? <Caption className="mt-1">Buscando una foto…</Caption> : null}
                <Title className="mt-2 text-center text-[24px] leading-[28px]">
                  {recipe.title}
                </Title>
              </View>
            )}
          </View>

          {recipe.description ? (
            <Body className="mt-4 text-ink-muted">{recipe.description}</Body>
          ) : null}

          <View className="mt-3 flex-row flex-wrap gap-2">
            {pills.map((p) => (
              <View
                key={p.label}
                className="flex-row items-center gap-1 rounded-full bg-tint-kitchen px-3 py-1.5"
              >
                {p.icon ? <Ionicons name={p.icon} size={13} color={COLORS.ink} /> : null}
                <Text className="font-body-bold text-xs text-ink">{p.label}</Text>
              </View>
            ))}
            {recipe.tags.map((tag, index) => (
              <View key={`${tag}-${index}`} className="rounded-full bg-surface-muted px-3 py-1.5">
                <Text className="font-body-bold text-xs text-ink-muted">
                  {formatRecipeTag(tag)}
                </Text>
              </View>
            ))}
          </View>

          <View className="mt-4">
            <Button
              title={
                publication?.is_published
                  ? "Quitar del catálogo público"
                  : "Publicar en catálogo público"
              }
              variant="outline"
              loading={publishing}
              onPress={() => void handleTogglePublication()}
            />
          </View>

          {activeSession ? (
            <Surface tone="sunken" className="mt-4 flex-row items-center gap-3 p-4">
              <Ionicons name="play-circle" size={24} color={COLORS.accent} />
              <View className="flex-1">
                <Strong>
                  Vas en el paso {activeSession.last_step_completed + 1} de {steps.length}
                </Strong>
                <Caption>Empezaste esta receta. ¿Continuamos?</Caption>
              </View>
            </Surface>
          ) : null}

          <Surface className="mt-4 flex-row items-center justify-between p-4">
            <View className="flex-1 pr-3">
              <Strong>Porciones</Strong>
              {servings !== recipe.servings ? (
                <Caption>Receta original para {recipe.servings}; cantidades ajustadas</Caption>
              ) : null}
            </View>
            <View className="flex-row items-center gap-3">
              <PressableScale
                haptics="selection"
                onPress={() => setServings((s) => Math.max(1, s - 1))}
                accessibilityLabel="Menos porciones"
                className="h-10 w-10 items-center justify-center rounded-full bg-surface-muted"
              >
                <Ionicons name="remove" size={20} color={COLORS.ink} />
              </PressableScale>
              <Text
                className="min-w-[28px] text-center font-display text-2xl text-ink"
                accessibilityLabel={`${servings} porciones`}
              >
                {servings}
              </Text>
              <PressableScale
                haptics="selection"
                onPress={() => setServings((s) => s + 1)}
                accessibilityLabel="Más porciones"
                className="h-10 w-10 items-center justify-center rounded-full bg-surface-muted"
              >
                <Ionicons name="add" size={20} color={COLORS.ink} />
              </PressableScale>
            </View>
          </Surface>

          {ingredients.length > 0 ? (
            <>
              <SectionHeader title="Ingredientes" />
              <Surface className="px-4 py-1">
                {ingredients.map((ing, idx) => {
                  const scaled =
                    ing.amount !== null ? scaleAmount(ing.amount, recipe.servings, servings) : null;
                  return (
                    <View
                      key={ing.id}
                      className={`flex-row items-start gap-3 py-3 ${idx < ingredients.length - 1 ? "border-b border-line" : ""}`}
                    >
                      <View className="mt-[7px] h-2 w-2 rounded-full bg-tint-kitchen-ink" />
                      <View className="flex-1">
                        <Text className="font-body text-[15px] leading-[21px] text-ink">
                          {scaled ? (
                            <Text className="font-body-extrabold">{`${scaled}${ing.unit ? ` ${ing.unit}` : ""} `}</Text>
                          ) : null}
                          {ing.name}
                        </Text>
                        {ing.notes ? <Caption className="mt-0.5">{ing.notes}</Caption> : null}
                      </View>
                    </View>
                  );
                })}
              </Surface>
            </>
          ) : null}

          {steps.length > 0 ? (
            <>
              <SectionHeader title="Pasos" />
              <View className="gap-3">
                {steps.map((step) => (
                  <Surface key={step.id} className="flex-row gap-3 p-4">
                    <View className="h-8 w-8 items-center justify-center rounded-full bg-accent">
                      <Text className="font-display text-sm text-accent-ink">
                        {step.step_number}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Strong>{step.title}</Strong>
                      {step.duration_seconds ? (
                        <Caption className="mt-0.5">
                          {formatDuration(step.duration_seconds)}
                          {step.temperature ? ` · ${step.temperature}` : ""}
                        </Caption>
                      ) : null}
                      <Body className="mt-1.5">{step.instructions}</Body>
                      {step.tip ? (
                        <View className="mt-2.5 rounded-[14px] bg-accent-soft px-3 py-2.5">
                          <Eyebrow className="text-accent-strong">Consejo de Mochi</Eyebrow>
                          <MochiQuote className="mt-1 text-[15px] leading-[20px]">
                            {step.tip}
                          </MochiQuote>
                        </View>
                      ) : null}
                    </View>
                  </Surface>
                ))}
              </View>
            </>
          ) : null}

          <SectionHeader
            title="Mis notas"
            actionLabel={editingNotes ? undefined : "Editar"}
            onAction={editingNotes ? undefined : () => setEditingNotes(true)}
          />
          {editingNotes ? (
            <Surface className="p-4">
              <Input
                label="Tus trucos, variantes o recordatorios"
                value={notesInput}
                onChangeText={setNotesInput}
                multiline
                textAlignVertical="top"
                placeholder="Con menos sal le queda mejor…"
              />
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <Button
                    title="Cancelar"
                    variant="outline"
                    onPress={() => {
                      setEditingNotes(false);
                      setNotesInput(recipe.personal_notes ?? "");
                    }}
                  />
                </View>
                <View className="flex-1">
                  <Button
                    title="Guardar"
                    loading={savingNotes}
                    onPress={() => void handleSaveNotes()}
                  />
                </View>
              </View>
            </Surface>
          ) : (
            <Surface tone="sunken" className="p-4">
              <Caption>{recipe.personal_notes || "Aún no tienes notas para esta receta."}</Caption>
            </Surface>
          )}
          <View className="h-24" />
        </Screen>

        <View
          className="absolute inset-x-0 bottom-0 bg-canvas/95 px-5 pt-3"
          style={{ paddingBottom: insets.bottom + 14 }}
        >
          <Button
            title={activeSession ? "Continuar cocinando" : "Empezar a cocinar"}
            onPress={handleStartCooking}
          />
        </View>
      </View>
      {AlertComponent}
    </>
  );
}

export default RecipeDetailScreen;
