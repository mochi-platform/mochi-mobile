import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { Alert, Image, Text, View } from "react-native";
import { reportError } from "@/src/shared/lib/observability/reportError";
import { supabase } from "@/src/shared/lib/supabase";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { COLORS } from "@/src/shared/theme/tokens";
import type { RecipePublication } from "@/src/shared/types/database";
import { Caption, PressableScale, Surface } from "@/src/shared/ui";
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
    <Surface onPress={onPress} accessibilityLabel={`Receta pública: ${publication.title}`} className="mb-3 overflow-hidden">
      <View className="h-32 items-center justify-center bg-tint-duo">
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
          <View className="min-w-0 flex-1">
            <Text className="font-body-extrabold text-[16px] leading-[21px] text-ink" numberOfLines={2}>
              {publication.title}
            </Text>
            <Caption className="mt-0.5">
              {isOwned
                ? "Tu receta en el catálogo público"
                : publication.owner_name
                  ? `Compartida por ${publication.owner_name}`
                  : "Compartida por la comunidad"}
            </Caption>
          </View>
          {!isOwned ? (
            <PressableScale
              accessibilityLabel="Reportar receta"
              haptics="selection"
              hitSlop={10}
              onPress={() => askReport(publication.id)}
              className="h-8 w-8 items-center justify-center rounded-full bg-surface-muted"
            >
              <Ionicons name="flag-outline" size={15} color={COLORS.inkMuted} />
            </PressableScale>
          ) : null}
        </View>
        {publication.description ? (
          <Caption className="mt-1.5" numberOfLines={2}>
            {publication.description}
          </Caption>
        ) : null}
        <View className="mt-3 flex-row flex-wrap items-center gap-2">
          {totalTime > 0 ? <Pill icon="time" label={`${totalTime} min`} /> : null}
          <Pill label={diff.label} />
          {publication.servings > 0 ? <Pill icon="people" label={`${publication.servings} porc.`} /> : null}
          {publication.tags.slice(0, 2).map((tag, index) => (
            <Pill key={`${tag}-${index}`} label={formatRecipeTag(tag)} />
          ))}
        </View>
        <Text className="mt-3 font-body-extrabold text-sm text-accent-strong">
          {isOwned ? "Abrir receta" : "Usar receta"}
        </Text>
      </View>
    </Surface>
  );
}

function Pill({ icon, label }: { icon?: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View className="flex-row items-center gap-1 rounded-full bg-tint-duo px-2.5 py-1">
      {icon ? <Ionicons name={icon} size={12} color={COLORS.ink} /> : null}
      <Text className="font-body-bold text-xs text-ink">{label}</Text>
    </View>
  );
}
