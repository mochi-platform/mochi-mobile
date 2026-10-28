import { View } from "react-native";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import type { RecipePublication } from "@/src/shared/types/database";
import { Caption, ErrorState, SectionHeader, Skeleton, Surface, Title } from "@/src/shared/ui";
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
    <View>
      <SectionHeader title="Catálogo público" className="mt-8" />
      <Caption className="-mt-1 mb-3 ml-1">Recetas compartidas por la comunidad.</Caption>
      {loading ? (
        <Skeleton height={200} className="rounded-card" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void onRetry()} />
      ) : publications.length === 0 ? (
        <Surface className="items-center px-6 py-7">
          <MochiCharacter expression="thinking" size={88} animated={false} />
          <Title className="mt-3 text-center">Todavía no hay recetas públicas</Title>
          <Caption className="mt-1.5 text-center">Cuando alguien publique una receta, aparecerá aquí.</Caption>
        </Surface>
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
  );
}
