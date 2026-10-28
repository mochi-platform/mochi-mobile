import { tc } from "@/src/shared/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import type { RecipePublication } from "@/src/shared/types/database";
import { PublicRecipeCard } from "@/src/features/cooking/components/PublicRecipeCard";

type PublicRecipesCatalogProps = {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  publications: RecipePublication[];
  userId: string | undefined;
  imageMap: Record<string, string>;
  loadingMap: Record<string, boolean>;
  onLoadImage: (recipeId: string, title: string) => Promise<void>;
  onUseRecipe: (publication: RecipePublication) => Promise<void>;
};

export function PublicRecipesCatalog({
  loading,
  error,
  onRetry,
  publications,
  userId,
  imageMap,
  loadingMap,
  onLoadImage,
  onUseRecipe,
}: PublicRecipesCatalogProps) {
  return (
    <View className="mt-8 rounded-3xl border-2 border-fuchsia-200 bg-white p-4 dark:border-fuchsia-800 dark:bg-surface">
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-lg font-extrabold text-fuchsia-950 dark:text-fuchsia-50">
            Catálogo público
          </Text>
          <Text className="mt-1 text-xs font-semibold text-fuchsia-700 dark:text-fuchsia-300">
            Recetas compartidas por la comunidad.
          </Text>
        </View>
        <Ionicons name="globe" size={20} color={tc("#c026d3")} />
      </View>

      <View className="mt-4">
        {loading ? (
          <View className="items-center py-10">
            <MochiCharacter mood="thinking" size={72} />
            <Text className="mt-3 text-sm font-semibold text-fuchsia-700 dark:text-fuchsia-300">
              Cargando catálogo...
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
        ) : publications.length === 0 ? (
          <View className="items-center rounded-3xl border-2 border-fuchsia-200 bg-fuchsia-50 p-8 dark:border-fuchsia-800 dark:bg-fuchsia-950">
            <MochiCharacter mood="thinking" size={72} />
            <Text className="mt-3 text-center text-base font-extrabold text-fuchsia-950 dark:text-fuchsia-50">
              Todavía no hay recetas públicas
            </Text>
            <Text className="mt-2 text-center text-sm font-semibold text-fuchsia-700 dark:text-fuchsia-300">
              Cuando alguien publique una receta, aparecerá aquí.
            </Text>
          </View>
        ) : (
          publications.map((publication) => (
            <PublicRecipeCard
              key={publication.id}
              publication={publication}
              imageUrl={imageMap[publication.id] ?? null}
              imageLoading={Boolean(loadingMap[publication.id])}
              onLoadImage={onLoadImage}
              isOwned={publication.owner_id === userId}
              onPress={() => void onUseRecipe(publication)}
            />
          ))
        )}
      </View>
    </View>
  );
}
