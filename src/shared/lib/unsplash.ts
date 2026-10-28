import { reportError } from "@/src/shared/lib/observability/reportError";
import { supabase } from "@/src/shared/lib/supabase";

const imageCache = new Map<string, string>();

/**
 * Busca una imagen a través de la Edge Function `unsplash-image` (la clave de Unsplash
 * vive en el servidor, que además cachea resultados por 30 días).
 */
export async function searchUnsplashImage(
  query: string,
  orientation: "landscape" | "portrait" | "squarish" = "landscape",
): Promise<string | null> {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return null;

  const cacheKey = `${normalizedQuery}::${orientation}`;
  const cached = imageCache.get(cacheKey);
  if (cached) return cached;

  try {
    const { data, error } = await supabase.functions.invoke("unsplash-image", {
      body: { query: normalizedQuery, orientation },
    });
    if (error) throw error;
    const url = (data as { url?: string | null } | null)?.url ?? null;
    if (url) imageCache.set(cacheKey, url);
    return url;
  } catch (error) {
    reportError(error, { scope: "unsplash/search" });
    return null;
  }
}
