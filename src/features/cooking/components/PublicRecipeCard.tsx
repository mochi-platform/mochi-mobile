import { tc } from "@/src/shared/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { Alert, Image, Text, TouchableOpacity, View } from "react-native";
import { reportError } from "@/src/shared/lib/observability/reportError";
import { supabase } from "@/src/shared/lib/supabase";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import type { RecipePublication } from "@/src/shared/types/database";
import { difficultyConfig, formatRecipeTag } from "@/src/features/cooking/helpers";

type PublicRecipeCardProps = {
  publication: RecipePublication;
  onPress: () => void;
  imageUrl: string | null;
  imageLoading: boolean;
  onLoadImage: (recipeId: string, title: string) => Promise<void>;
  isOwned: boolean;
};

async function sendReport(publicationId: string, reason: string) {
  const { error } = await supabase.rpc("report_recipe", {
    p_publication_id: publicationId,
    p_reason: reason,
  });
  if (error) {
    reportError(error, { scope: "cooking/report-recipe" });
    Alert.alert("No se pudo enviar", "Inténtalo de nuevo en un momento.");
    return;
  }
  Alert.alert("Gracias", "Revisaremos esta receta.");
}

function askReport(publicationId: string) {
  Alert.alert("Reportar receta", "¿Qué le pasa a esta receta?", [
    { text: "Inapropiada", onPress: () => void sendReport(publicationId, "inappropriate") },
    { text: "Spam", onPress: () => void sendReport(publicationId, "spam") },
    { text: "Peligrosa", onPress: () => void sendReport(publicationId, "dangerous") },
  ]);
}

export function PublicRecipeCard({
  publication,
  onPress,
  imageUrl,
  imageLoading,
  onLoadImage,
  isOwned,
}: PublicRecipeCardProps) {
  const diff = difficultyConfig[publication.difficulty] ?? difficultyConfig["media"];
  const totalTime =
    publication.total_time_minutes > 0
      ? publication.total_time_minutes
      : publication.prep_time_minutes + publication.cook_time_minutes;

  useEffect(() => {
    void onLoadImage(publication.id, publication.title);
  }, [onLoadImage, publication.id, publication.title]);

  return (
    <TouchableOpacity
      className="mb-3 rounded-3xl border-2 border-fuchsia-200 bg-white p-4 dark:border-fuchsia-800 dark:bg-surface"
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View className="mb-3 h-28 overflow-hidden rounded-2xl bg-fuchsia-100 dark:bg-fuchsia-900">
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} className="h-full w-full" resizeMode="cover" />
        ) : (
          <View className="h-full items-center justify-center">
            <MochiCharacter mood="thinking" size={48} />
            {imageLoading ? (
              <Text className="mt-1 text-xs font-semibold text-fuchsia-700 dark:text-fuchsia-300">
                Buscando imagen...
              </Text>
            ) : null}
          </View>
        )}
      </View>

      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text
            className="text-base font-extrabold text-fuchsia-950 dark:text-fuchsia-50"
            numberOfLines={2}
          >
            {publication.title}
          </Text>
          {publication.description ? (
            <Text
              className="mt-1 text-xs font-semibold text-fuchsia-700 dark:text-fuchsia-300"
              numberOfLines={2}
            >
              {publication.description}
            </Text>
          ) : null}
          <Text className="mt-1 text-[11px] font-bold text-fuchsia-500">
            {isOwned
              ? "Tu receta en el catálogo público"
              : publication.owner_name
                ? `Compartida por ${publication.owner_name}`
                : "Compartida por la comunidad"}
          </Text>
        </View>
        <View className="items-center gap-2">
          <Ionicons name="globe" size={18} color={tc("#c026d3")} />
          {!isOwned ? (
            <TouchableOpacity
              accessibilityLabel="Reportar receta"
              hitSlop={10}
              onPress={() => askReport(publication.id)}
            >
              <Ionicons name="flag-outline" size={16} color={tc("#a21caf")} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View className="mt-3 flex-row flex-wrap items-center gap-2">
        {totalTime > 0 && (
          <View className="flex-row items-center rounded-full bg-fuchsia-100 px-3 py-1 dark:bg-fuchsia-900">
            <Ionicons name="time" size={12} color={tc("#a21caf")} />
            <Text className="ml-1 text-xs font-bold text-fuchsia-800 dark:text-fuchsia-200">
              {totalTime} min
            </Text>
          </View>
        )}
        <View className={`rounded-full px-3 py-1 ${diff.className}`}>
          <Text className={`text-xs font-bold ${diff.textClass}`}>{diff.label}</Text>
        </View>
        {publication.servings > 0 && (
          <View className="flex-row items-center rounded-full bg-fuchsia-100 px-3 py-1 dark:bg-fuchsia-900">
            <Ionicons name="people" size={12} color={tc("#a21caf")} />
            <Text className="ml-1 text-xs font-bold text-fuchsia-800 dark:text-fuchsia-200">
              {publication.servings} porc.
            </Text>
          </View>
        )}
        {publication.generation_type !== "normal" ? (
          <View className="rounded-full bg-fuchsia-100 px-3 py-1 dark:bg-fuchsia-900">
            <Text className="text-xs font-bold text-fuchsia-800 dark:text-fuchsia-200">
              {formatRecipeTag(publication.generation_type.replace(/_/g, " "))}
            </Text>
          </View>
        ) : null}
      </View>

      {publication.tags.length > 0 && (
        <View className="mt-2 flex-row flex-wrap gap-1">
          {publication.tags.slice(0, 3).map((tag, index) => (
            <View
              key={`${tag}-${index}`}
              className="shrink-0 self-start rounded-full border border-fuchsia-200 px-2.5 py-1 dark:border-fuchsia-800"
            >
              <Text className="text-xs font-semibold leading-4 text-fuchsia-600 dark:text-fuchsia-400">
                {formatRecipeTag(tag)}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View className="mt-3 rounded-2xl bg-fuchsia-500 px-4 py-2.5">
        <Text className="text-center text-sm font-extrabold text-white">
          {isOwned ? "Abrir receta" : "Usar receta"}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
