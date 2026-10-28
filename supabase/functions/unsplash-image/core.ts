export type ImageDeps = {
  getUser: (token: string) => Promise<{ id: string } | null>;
  cacheGet: (key: string) => Promise<string | null>;
  cacheSet: (key: string, value: string, ttlSeconds: number) => Promise<void>;
  /** Devuelve la URL de la primera foto o null. Lanza si el proveedor falla. */
  search: (query: string, orientation: string) => Promise<string | null>;
  keyConfigured: boolean;
};

const ORIENTATIONS = ["landscape", "portrait", "squarish"];

export async function handleImage(req: Request, deps: ImageDeps, cors: Record<string, string>): Promise<Response> {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  const user = token ? await deps.getUser(token) : null;
  if (!user) return json({ error: "No autenticado" }, 401);

  const body = await req.json().catch(() => null);
  const query = typeof body?.query === "string" ? body.query.trim().toLowerCase() : "";
  const orientation = ORIENTATIONS.includes(body?.orientation) ? body.orientation : "landscape";
  if (query.length === 0 || query.length > 80) return json({ error: "Consulta no válida" }, 400);

  const key = `unsplash:${orientation}:${query}`;
  const cached = await deps.cacheGet(key);
  if (cached) return json({ url: cached, cached: true });

  if (!deps.keyConfigured) return json({ url: null });
  try {
    const url = await deps.search(query, orientation);
    if (url) await deps.cacheSet(key, url, 30 * 86400);
    return json({ url });
  } catch (error) {
    console.error("unsplash failed", error instanceof Error ? error.message : String(error));
    return json({ url: null });
  }
}
