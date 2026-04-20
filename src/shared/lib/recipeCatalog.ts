import type { RecipeGenerationType } from "@/src/shared/types/database";

const generationTypeValues: RecipeGenerationType[] = [
  "normal",
  "keto",
  "vegetariana",
  "vegana",
  "alta_proteina",
];

export function getRecipeGenerationTypeFromPrompt(
  userPrompt: string | null,
): RecipeGenerationType {
  const match = userPrompt?.match(/Tipo:\s*([a-z_]+)/i);
  const candidate = match?.[1]?.toLowerCase() as
    | RecipeGenerationType
    | undefined;

  if (!candidate || !generationTypeValues.includes(candidate)) {
    return "normal";
  }

  return candidate;
}
