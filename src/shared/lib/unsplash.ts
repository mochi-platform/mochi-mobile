const UNSPLASH_KEY = process.env.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY || "";

const imageCache = new Map<string, string>();

export async function searchUnsplashImage(
  query: string,
  orientation: "landscape" | "portrait" | "squarish" = "landscape",
): Promise<string | null> {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return null;

  const cacheKey = `${normalizedQuery}::${orientation}`;
  const cached = imageCache.get(cacheKey);
  if (cached) return cached;

  if (!UNSPLASH_KEY) return null;

  try {
    const params = new URLSearchParams({
      query,
      per_page: "1",
      orientation,
    });

    const response = await fetch(
      `https://api.unsplash.com/search/photos?${params.toString()}`,
      {
        headers: {
          Authorization: `Client-ID ${UNSPLASH_KEY}`,
        },
      },
    );

    if (!response.ok) return null;

    const json = (await response.json()) as {
      results?: Array<{ urls?: { small?: string } }>;
    };

    const imageUrl = json.results?.[0]?.urls?.small ?? null;
    if (imageUrl) {
      imageCache.set(cacheKey, imageUrl);
    }

    return imageUrl;
  } catch {
    return null;
  }
}
