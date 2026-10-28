export type DeleteDeps = {
  getUser: (token: string) => Promise<{ id: string } | null>;
  deleteUser: (id: string) => Promise<{ message: string } | null>;
};

export async function handleDelete(req: Request, deps: DeleteDeps, cors: Record<string, string>): Promise<Response> {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "No autenticado" }, 401);
  const user = await deps.getUser(token);
  if (!user) return json({ error: "No autenticado" }, 401);

  const body = await req.json().catch(() => null);
  if (body?.confirm !== "ELIMINAR") return json({ error: "Confirmación requerida" }, 400);

  const error = await deps.deleteUser(user.id);
  if (error) {
    console.error("delete failed", error.message);
    return json({ error: "No se pudo eliminar la cuenta" }, 500);
  }
  return json({ ok: true });
}
