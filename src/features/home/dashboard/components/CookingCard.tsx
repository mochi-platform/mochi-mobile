import { tc } from "@/src/shared/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import Animated from "react-native-reanimated";
import { Text, TouchableOpacity, View } from "react-native";
import type { Recipe } from "@/src/shared/types/database";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { AnimatedDashboardCard } from "@/src/features/home/dashboard/AnimatedDashboardCard";
import type { LoadingPulseStyle } from "@/src/features/home/dashboard/useLoadingPulse";

type CookingCardProps = {
  animationSeed: number;
  loading: boolean;
  loadingStyle: LoadingPulseStyle;
  recipeCount: number;
  recipeError: string | null;
  latestRecipe: Recipe | null;
  onNavigateToCooking: () => void;
};

export function CookingCard({
  animationSeed,
  loading,
  loadingStyle,
  recipeCount,
  recipeError,
  latestRecipe,
  onNavigateToCooking,
}: CookingCardProps) {
  return (
    <AnimatedDashboardCard
      delay={200}
      animationSeed={animationSeed}
      className="mt-4 rounded-3xl border-2 border-orange-200 bg-white p-5 dark:border-orange-800 dark:bg-surface"
    >
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center">
          <Ionicons name="restaurant" size={18} color={tc("#c2410c")} />
          <Text className="ml-2 text-base font-bold text-orange-900 dark:text-orange-100">
            Cocina
          </Text>
        </View>
        {recipeCount > 0 && (
          <View className="ml-3 shrink-0 rounded-full bg-orange-100 px-3 py-1 dark:bg-orange-900">
            <Text
              className="text-xs font-bold text-orange-700 dark:text-orange-300"
              numberOfLines={1}
            >
              {recipeCount}
              {" "}
              {recipeCount === 1 ? "receta" : "recetas"}
            </Text>
          </View>
        )}
      </View>

      {loading ? (
        <View className="items-center py-4">
          <Animated.View style={loadingStyle}>
            <MochiCharacter mood="thinking" size={72} />
          </Animated.View>
        </View>
      ) : recipeError ? (
        <Text className="text-xs font-semibold text-red-500">{recipeError}</Text>
      ) : latestRecipe ? (
        <>
          <TouchableOpacity
            className="rounded-2xl border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-950"
            onPress={onNavigateToCooking}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text
                  className="text-sm font-extrabold text-orange-950 dark:text-orange-50"
                  numberOfLines={1}
                >
                  {latestRecipe.title}
                </Text>
                {latestRecipe.description ? (
                  <Text
                    className="mt-0.5 text-xs font-semibold text-orange-700 dark:text-orange-300"
                    numberOfLines={1}
                  >
                    {latestRecipe.description}
                  </Text>
                ) : null}
              </View>
              <View className="flex-row items-center gap-1">
                {latestRecipe.is_favorite && (
                  <Ionicons name="heart" size={14} color={tc("#ec4899")} />
                )}
                <Ionicons name="chevron-forward" size={16} color={tc("#c2410c")} />
              </View>
            </View>
            {(latestRecipe.total_time_minutes > 0 || latestRecipe.difficulty) && (
              <View className="mt-2 flex-row gap-2">
                {latestRecipe.total_time_minutes > 0 && (
                  <View className="flex-row items-center rounded-full bg-orange-200 px-2 py-0.5 dark:bg-orange-800">
                    <Ionicons name="time" size={11} color={tc("#c2410c")} />
                    <Text className="ml-0.5 text-xs font-bold text-orange-800 dark:text-orange-200">
                      {latestRecipe.total_time_minutes} min
                    </Text>
                  </View>
                )}
                <View className="rounded-full bg-orange-200 px-2 py-0.5 dark:bg-orange-800">
                  <Text className="text-xs font-bold capitalize text-orange-800 dark:text-orange-200">
                    {latestRecipe.difficulty}
                  </Text>
                </View>
              </View>
            )}
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity
          className="items-center py-2"
          onPress={onNavigateToCooking}
          activeOpacity={0.8}
        >
          <MochiCharacter mood="happy" size={72} />
          <Text className="mt-2 text-center text-sm font-semibold text-orange-700 dark:text-orange-300">
            Cuéntame qué quieres cocinar hoy
          </Text>
        </TouchableOpacity>
      )}
    </AnimatedDashboardCard>
  );
}
