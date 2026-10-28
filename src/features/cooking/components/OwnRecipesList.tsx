import { router } from "expo-router";
import { View } from "react-native";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import type { MochiCyclePersonality } from "@/src/shared/lib/cyclePersonality";
import type { Recipe } from "@/src/shared/types/database";
import { Caption, ErrorState, SectionHeader, Skeleton, Surface, Title } from "@/src/shared/ui";
import { RecipeCard } from "@/src/features/cooking/components/RecipeCard";

type OwnRecipesListProps = {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  recipes: Recipe[];
  filteredRecipes: Recipe[];
  cookingTip: string | null;
  mochiMood: MochiCyclePersonality["mochiMood"];
  imageMap: Record<string, string>;
  loadingMap: Record<string, boolean>;
  onLoadImage: (recipeId: string, title: string) => Promise<void>;
};

export function OwnRecipesList({
  loading,
  error,
  onRetry,
  recipes,
  filteredRecipes,
  cookingTip,
  mochiMood,
  imageMap,
  loadingMap,
  onLoadImage,
}: OwnRecipesListProps) {
  return (
    <View>
      <SectionHeader title="Tus recetas" />
      {loading ? (
        <View className="gap-3">
          <Skeleton height={200} className="rounded-card" />
          <Skeleton height={200} className="rounded-card" />
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={() => void onRetry()} />
      ) : recipes.length === 0 || filteredRecipes.length === 0 ? (
        <Surface className="items-center px-6 py-7">
          <MochiCharacter
            expression={recipes.length === 0 ? mochiMood : "thinking"}
            size={96}
            animated={false}
          />
          <Title className="mt-3 text-center">
            {recipes.length === 0 ? "Aún no tienes recetas guardadas" : "No hay recetas con esos filtros"}
          </Title>
          <Caption className="mt-1.5 text-center">
            {recipes.length === 0
              ? (cookingTip ?? "Cuéntame qué quieres cocinar y lo creo para ti.")
              : "Cambia la búsqueda o quita algún filtro para ver más."}
          </Caption>
        </Surface>
      ) : (
        filteredRecipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            imageUrl={imageMap[recipe.id] ?? null}
            imageLoading={Boolean(loadingMap[recipe.id])}
            onLoadImage={onLoadImage}
            onPress={() => router.push(`/recipe-detail?recipeId=${recipe.id}`)}
          />
        ))
      )}
    </View>
  );
}
