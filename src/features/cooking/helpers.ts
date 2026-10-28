import type { RecipeGenerationType } from "@/src/shared/lib/ai";
import type { RecipeDifficulty } from "@/src/shared/types/database";

export const difficultyConfig: Record<
  string,
  { label: string; className: string; textClass: string }
> = {
  fácil: {
    label: "Fácil",
    className: "bg-green-100 dark:bg-green-900",
    textClass: "text-green-800 dark:text-green-200",
  },
  media: {
    label: "Media",
    className: "bg-yellow-100 dark:bg-yellow-900",
    textClass: "text-yellow-800 dark:text-yellow-200",
  },
  difícil: {
    label: "Difícil",
    className: "bg-red-100 dark:bg-red-900",
    textClass: "text-red-800 dark:text-red-200",
  },
};

export const recipeTypeOptions: { value: RecipeGenerationType; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "keto", label: "Keto" },
  { value: "vegetariana", label: "Vegetariana" },
  { value: "vegana", label: "Vegana" },
  { value: "alta_proteina", label: "Alta proteína" },
];

export const complexityOptions: { value: RecipeDifficulty; label: string }[] = [
  { value: "fácil", label: "Fácil" },
  { value: "media", label: "Media" },
  { value: "difícil", label: "Difícil" },
];

export const listRecipeTypeOptions: (
  | { value: "all"; label: string }
  | { value: RecipeGenerationType; label: string }
)[] = [{ value: "all", label: "Todos" }, ...recipeTypeOptions];

export const listDifficultyOptions: (
  | { value: "all"; label: string }
  | { value: RecipeDifficulty; label: string }
)[] = [
  { value: "all", label: "Todas" },
  { value: "fácil", label: "Fácil" },
  { value: "media", label: "Media" },
  { value: "difícil", label: "Difícil" },
];

export function formatRecipeTag(tag: string): string {
  const normalized = tag.trim();
  if (!normalized) return "";

  const capitalized = normalized.charAt(0).toLocaleUpperCase("es-ES") + normalized.slice(1);

  // Keep multi-word tags on a single line inside pill chips.
  return capitalized.replace(/\s+/g, " ");
}
