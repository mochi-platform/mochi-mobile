export type PushTarget = {
  token: string;
  title: string;
  quiet_enabled: boolean;
  quiet_start: number;
  quiet_end: number;
  tz_offset_min: number;
};

export type PushDeps = {
  getUser: (token: string) => Promise<{ id: string } | null>;
  targets: (voucherId: string, callerId: string) => Promise<PushTarget[]>;
  send: (messages: { to: string; title: string; body: string; data: Record<string, string> }[]) => Promise<void>;
  now: () => Date;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** ¿La hora local de la destinataria cae dentro de sus horas de silencio? (admite rangos que cruzan medianoche) */
export function isQuietNow(t: Pick<PushTarget, "quiet_enabled" | "quiet_start" | "quiet_end" | "tz_offset_min">, now: Date): boolean {
  if (!t.quiet_enabled || t.quiet_start === t.quiet_end) return false;
  const local = new Date(now.getTime() + t.tz_offset_min * 60000);
  const h = local.getUTCHours();
  return t.quiet_start < t.quiet_end ? h >= t.quiet_start && h < t.quiet_end : h >= t.quiet_start || h < t.quiet_end;
}

export async function handlePush(req: Request, deps: PushDeps, cors: Record<string, string>): Promise<Response> {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  const user = token ? await deps.getUser(token) : null;
  if (!user) return json({ error: "No autenticado" }, 401);

  const body = await req.json().catch(() => null);
  const voucherId = typeof body?.voucherId === "string" ? body.voucherId : "";
  if (!UUID.test(voucherId)) return json({ error: "Vale no válido" }, 400);

  const targets = await deps.targets(voucherId, user.id);
  const now = deps.now();
  const audible = targets.filter((t) => !isQuietNow(t, now));
  if (audible.length > 0) {
    await deps.send(
      audible.map((t) => ({
        to: t.token,
        title: "Tu pareja te regaló un vale 🎁",
        // El título del vale lo escribió su pareja; se recorta para no desbordar la notificación.
        body: t.title.slice(0, 80),
        data: { type: "voucher", voucherId },
      })),
    );
  }
  return json({ sent: audible.length, silenced: targets.length - audible.length });
}
