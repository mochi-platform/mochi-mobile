import { tc } from "@/src/shared/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { IconCtaButton } from "@/src/shared/components/IconCtaButton";
import type { RecipeGenerationType } from "@/src/shared/lib/ai";
import type { RecipeDifficulty } from "@/src/shared/types/database";
import { listDifficultyOptions, listRecipeTypeOptions } from "@/src/features/cooking/helpers";

type RecipeFiltersCardProps = {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  difficultyFilter: RecipeDifficulty | "all";
  onDifficultyFilterChange: (value: RecipeDifficulty | "all") => void;
  typeFilter: RecipeGenerationType | "all";
  onTypeFilterChange: (value: RecipeGenerationType | "all") => void;
  favoritesOnly: boolean;
  onToggleFavoritesOnly: () => void;
};

export function RecipeFiltersCard({
  searchQuery,
  onSearchQueryChange,
  difficultyFilter,
  onDifficultyFilterChange,
  typeFilter,
  onTypeFilterChange,
  favoritesOnly,
  onToggleFavoritesOnly,
}: RecipeFiltersCardProps) {
  return (
    <View className="mt-4 rounded-3xl border-2 border-orange-200 bg-white p-4 dark:border-orange-800 dark:bg-surface">
      <View className="flex-row items-center rounded-2xl border border-orange-200 bg-orange-50 px-3 py-2 dark:border-orange-800 dark:bg-orange-950">
        <Ionicons name="search" size={15} color={tc("#c2410c")} />
        <TextInput
          className="ml-2 flex-1 text-sm font-semibold text-orange-900 dark:text-orange-100"
          placeholder="Buscar por nombre, tipo o etiqueta"
          placeholderTextColor={tc("#f97316")}
          value={searchQuery}
          onChangeText={onSearchQueryChange}
        />
      </View>

      <Text className="mt-3 text-xs font-bold text-orange-700 dark:text-orange-300">
        Dificultad
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2">
        {listDifficultyOptions.map((option) => {
          const active = difficultyFilter === option.value;

          return (
            <TouchableOpacity
              key={option.value}
              className={`mr-2 rounded-full border px-3 py-1.5 ${
                active
                  ? "border-orange-500 bg-orange-500"
                  : "border-orange-200 bg-white dark:border-orange-800 dark:bg-surface"
              }`}
              onPress={() => onDifficultyFilterChange(option.value)}
            >
              <Text
                className={`text-xs font-bold ${
                  active ? "text-white" : "text-orange-700 dark:text-orange-300"
                }`}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Text className="mt-3 text-xs font-bold text-orange-700 dark:text-orange-300">Tipo</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2">
        {listRecipeTypeOptions.map((option) => {
          const active = typeFilter === option.value;

          return (
            <TouchableOpacity
              key={option.value}
              className={`mr-2 rounded-full border px-3 py-1.5 ${
                active
                  ? "border-orange-500 bg-orange-500"
                  : "border-orange-200 bg-white dark:border-orange-800 dark:bg-surface"
              }`}
              onPress={() => onTypeFilterChange(option.value)}
            >
              <Text
                className={`text-xs font-bold ${
                  active ? "text-white" : "text-orange-700 dark:text-orange-300"
                }`}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <IconCtaButton
        label="Solo favoritas"
        onPress={onToggleFavoritesOnly}
        iconName={favoritesOnly ? "heart" : "heart-outline"}
        iconColor={favoritesOnly ? tc("#db2777") : tc("#c2410c")}
        iconSize={14}
        containerClassName={`mt-3 w-full rounded-2xl border px-4 py-2.5 ${
          favoritesOnly
            ? "border-pink-400 bg-pink-100 dark:bg-pink-900"
            : "border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950"
        }`}
        textClassName={
          favoritesOnly
            ? "text-pink-700 dark:text-pink-300"
            : "text-orange-700 dark:text-orange-300"
        }
      />
    </View>
  );
}
