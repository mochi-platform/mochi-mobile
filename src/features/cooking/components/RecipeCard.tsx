import { tc } from "@/src/shared/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import type { Recipe } from "@/src/shared/types/database";
import { difficultyConfig, formatRecipeTag } from "@/src/features/cooking/helpers";

type RecipeCardProps = {
  recipe: Recipe;
  onPress: () => void;
  imageUrl: string | null;
  imageLoading: boolean;
  onLoadImage: (recipeId: string, title: string) => Promise<void>;
};

export function RecipeCard({
  recipe,
  onPress,
  imageUrl,
  imageLoading,
  onLoadImage,
}: RecipeCardProps) {
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
      className="mb-3 rounded-3xl border-2 border-orange-200 bg-white p-4 dark:border-orange-800 dark:bg-surface"
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View className="mb-3 h-28 overflow-hidden rounded-2xl bg-orange-100 dark:bg-orange-900">
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} className="h-full w-full" resizeMode="cover" />
        ) : (
          <View className="h-full items-center justify-center">
            <MochiCharacter mood="thinking" size={48} />
            {imageLoading ? (
              <Text className="mt-1 text-xs font-semibold text-orange-700 dark:text-orange-300">
                Buscando imagen...
              </Text>
            ) : null}
          </View>
        )}
      </View>

      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text
            className="text-base font-extrabold text-orange-950 dark:text-orange-50"
            numberOfLines={2}
          >
            {recipe.title}
          </Text>
          {recipe.description ? (
            <Text
              className="mt-1 text-xs font-semibold text-orange-700 dark:text-orange-300"
              numberOfLines={2}
            >
              {recipe.description}
            </Text>
          ) : null}
        </View>
        {recipe.is_favorite && <Ionicons name="heart" size={18} color={tc("#f97316")} />}
      </View>

      <View className="mt-3 flex-row flex-wrap items-center gap-2">
        {totalTime > 0 && (
          <View className="flex-row items-center rounded-full bg-orange-100 px-3 py-1 dark:bg-orange-900">
            <Ionicons name="time" size={12} color={tc("#c2410c")} />
            <Text className="ml-1 text-xs font-bold text-orange-800 dark:text-orange-200">
              {totalTime} min
            </Text>
          </View>
        )}
        <View className={`rounded-full px-3 py-1 ${diff.className}`}>
          <Text className={`text-xs font-bold ${diff.textClass}`}>{diff.label}</Text>
        </View>
        {recipe.servings > 0 && (
          <View className="flex-row items-center rounded-full bg-orange-100 px-3 py-1 dark:bg-orange-900">
            <Ionicons name="people" size={12} color={tc("#c2410c")} />
            <Text className="ml-1 text-xs font-bold text-orange-800 dark:text-orange-200">
              {recipe.servings} porc.
            </Text>
          </View>
        )}
        {recipe.cuisine_type ? (
          <View className="rounded-full bg-amber-100 px-3 py-1 dark:bg-amber-900">
            <Text className="text-xs font-bold text-amber-800 dark:text-amber-200">
              {formatRecipeTag(recipe.cuisine_type)}
            </Text>
          </View>
        ) : null}
      </View>

      {recipe.tags.length > 0 && (
        <View className="mt-2 flex-row flex-wrap gap-1">
          {recipe.tags.slice(0, 3).map((tag, index) => (
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
    </TouchableOpacity>
  );
}
