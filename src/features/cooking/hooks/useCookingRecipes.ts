import { useCallback, useState } from "react";
import { supabase } from "@/src/shared/lib/supabase";
import type { Recipe, RecipePublication } from "@/src/shared/types/database";
import { useFocusEffect } from "expo-router";

export function useCookingRecipes(userId: string | undefined) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [publicRecipes, setPublicRecipes] = useState<RecipePublication[]>([]);
  const [loading, setLoading] = useState(true);
  const [publicLoading, setPublicLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publicError, setPublicError] = useState<string | null>(null);

  const loadRecipes = useCallback(async () => {
    if (!userId) {
      setRecipes([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from("recipes")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (fetchError) throw fetchError;
      setRecipes((data ?? []) as Recipe[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las recetas");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const loadPublicRecipes = useCallback(async () => {
    try {
      setPublicLoading(true);
      setPublicError(null);
      const { data, error: fetchError } = await supabase
        .from("recipe_publications")
        .select("*")
        .eq("is_published", true)
        .order("published_at", { ascending: false });

      if (fetchError) throw fetchError;
      setPublicRecipes((data ?? []) as RecipePublication[]);
    } catch (err) {
      setPublicError(err instanceof Error ? err.message : "No se pudo cargar el catálogo público");
    } finally {
      setPublicLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadPublicRecipes();
      void loadRecipes();
    }, [loadPublicRecipes, loadRecipes]),
  );

  return {
    recipes,
    publicRecipes,
    loading,
    publicLoading,
    error,
    publicError,
    loadRecipes,
    loadPublicRecipes,
  };
}
