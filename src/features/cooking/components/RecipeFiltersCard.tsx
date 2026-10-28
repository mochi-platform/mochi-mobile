import { Ionicons } from "@expo/vector-icons";
import { ScrollView, Text, TextInput, View } from "react-native";
import type { RecipeGenerationType } from "@/src/shared/lib/ai";
import { COLORS } from "@/src/shared/theme/tokens";
import type { RecipeDifficulty } from "@/src/shared/types/database";
import { Chip } from "@/src/shared/ui";
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

/** Buscador y filtros de recetas: mismo orden de siempre (buscar, dificultad, tipo, favoritas). */
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
    <View className="mt-5">
      <View className="min-h-[50px] flex-row items-center rounded-control bg-surface-muted px-4">
        <Ionicons name="search" size={17} color={COLORS.inkMuted} />
        <TextInput
          accessibilityLabel="Buscar recetas"
          className="ml-2 flex-1 font-body text-[15px] text-ink"
          placeholder="Buscar por nombre, tipo o etiqueta"
          placeholderTextColor={COLORS.inkFaint}
          value={searchQuery}
          onChangeText={onSearchQueryChange}
        />
      </View>

      <Text className="ml-1 mt-4 font-body-extrabold text-xs uppercase tracking-[0.9px] text-ink-muted">
        Dificultad
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="-mx-5 mt-2"
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingVertical: 4 }}
      >
        {listDifficultyOptions.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={difficultyFilter === option.value}
            onPress={() => onDifficultyFilterChange(option.value)}
          />
        ))}
      </ScrollView>

      <Text className="ml-1 mt-3 font-body-extrabold text-xs uppercase tracking-[0.9px] text-ink-muted">
        Tipo
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="-mx-5 mt-2"
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingVertical: 4 }}
      >
        {listRecipeTypeOptions.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={typeFilter === option.value}
            onPress={() => onTypeFilterChange(option.value)}
          />
        ))}
        <Chip
          label="Solo favoritas"
          icon={favoritesOnly ? "heart" : "heart-outline"}
          selected={favoritesOnly}
          onPress={onToggleFavoritesOnly}
        />
      </ScrollView>
    </View>
  );
}
