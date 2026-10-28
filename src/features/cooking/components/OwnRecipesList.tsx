import { router } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import type { MochiCyclePersonality } from "@/src/shared/lib/cyclePersonality";
import type { Recipe } from "@/src/shared/types/database";
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
    <View className="mt-5">
      {loading ? (
        <View className="items-center py-12">
          <MochiCharacter mood="thinking" size={88} />
          <Text className="mt-3 text-sm font-semibold text-orange-700 dark:text-orange-300">
            Cargando recetas...
          </Text>
        </View>
      ) : error ? (
        <View className="rounded-3xl border-2 border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
          <Text className="text-sm font-semibold text-red-700 dark:text-red-300">{error}</Text>
          <TouchableOpacity
            className="mt-3 rounded-2xl bg-red-500 py-2"
            onPress={() => void onRetry()}
          >
            <Text className="text-center font-bold text-white">Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : recipes.length === 0 ? (
        <View className="items-center rounded-3xl border-2 border-orange-200 bg-white p-8 dark:border-orange-800 dark:bg-surface">
          <MochiCharacter mood={mochiMood} size={88} />
          <Text className="mt-3 text-center text-base font-extrabold text-orange-900 dark:text-orange-100">
            Aún no tienes recetas guardadas
          </Text>
          <Text className="mt-2 text-center text-sm font-semibold text-orange-600 dark:text-orange-400">
            {cookingTip ?? "Cuéntame qué quieres cocinar y lo creo para ti"}
          </Text>
        </View>
      ) : filteredRecipes.length === 0 ? (
        <View className="items-center rounded-3xl border-2 border-orange-200 bg-white p-8 dark:border-orange-800 dark:bg-surface">
          <MochiCharacter mood="thinking" size={88} />
          <Text className="mt-3 text-center text-base font-extrabold text-orange-900 dark:text-orange-100">
            No encontramos recetas con esos filtros
          </Text>
          <Text className="mt-2 text-center text-sm font-semibold text-orange-600 dark:text-orange-400">
            Ajusta la busqueda o desactiva algun filtro para ver mas opciones.
          </Text>
        </View>
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
