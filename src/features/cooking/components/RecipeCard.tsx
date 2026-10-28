import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { Image, Text, View } from "react-native";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { COLORS } from "@/src/shared/theme/tokens";
import type { Recipe } from "@/src/shared/types/database";
import { Caption, Surface } from "@/src/shared/ui";
import { difficultyConfig, formatRecipeTag } from "@/src/features/cooking/helpers";

type RecipeCardProps = {
  recipe: Recipe;
  onPress: () => void;
  imageUrl: string | null;
  imageLoading: boolean;
  onLoadImage: (recipeId: string, title: string) => Promise<void>;
};

function Pill({ icon, label }: { icon?: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View className="flex-row items-center gap-1 rounded-full bg-tint-kitchen px-2.5 py-1">
      {icon ? <Ionicons name={icon} size={12} color={COLORS.ink} /> : null}
      <Text className="font-body-bold text-xs text-ink">{label}</Text>
    </View>
  );
}

/** Tarjeta de receta: foto arriba, nombre y lo esencial (tiempo, dificultad, porciones). */
export function RecipeCard({ recipe, onPress, imageUrl, imageLoading, onLoadImage }: RecipeCardProps) {
  const diff = difficultyConfig[recipe.difficulty] ?? difficultyConfig["media"];
  const totalTime =
    recipe.total_time_minutes > 0
      ? recipe.total_time_minutes
      : recipe.prep_time_minutes + recipe.cook_time_minutes;

  useEffect(() => {
    void onLoadImage(recipe.id, recipe.title);
  }, [onLoadImage, recipe.id, recipe.title]);

  return (
    <Surface onPress={onPress} accessibilityLabel={`Receta: ${recipe.title}`} className="mb-3 overflow-hidden">
      <View className="h-32 items-center justify-center bg-tint-kitchen">
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} className="h-full w-full" resizeMode="cover" />
        ) : (
          <View className="items-center">
            <MochiCharacter expression="thinking" size={56} animated={false} shadow={false} />
            {imageLoading ? <Caption className="mt-1">Buscando imagen…</Caption> : null}
          </View>
        )}
      </View>

      <View className="p-4">
        <View className="flex-row items-start gap-3">
          <Text className="flex-1 font-body-extrabold text-[16px] leading-[21px] text-ink" numberOfLines={2}>
            {recipe.title}
          </Text>
          {recipe.is_favorite ? (
            <Ionicons name="heart" size={18} color={COLORS.accent} accessibilityLabel="Favorita" />
          ) : null}
        </View>
        {recipe.description ? (
          <Caption className="mt-1" numberOfLines={2}>
            {recipe.description}
          </Caption>
        ) : null}

        <View className="mt-3 flex-row flex-wrap items-center gap-2">
          {totalTime > 0 ? <Pill icon="time" label={`${totalTime} min`} /> : null}
          <Pill label={diff.label} />
          {recipe.servings > 0 ? <Pill icon="people" label={`${recipe.servings} porc.`} /> : null}
          {recipe.cuisine_type ? <Pill label={formatRecipeTag(recipe.cuisine_type)} /> : null}
          {recipe.tags.slice(0, 2).map((tag, index) => (
            <Pill key={`${tag}-${index}`} label={formatRecipeTag(tag)} />
          ))}
        </View>
      </View>
    </Surface>
  );
}
