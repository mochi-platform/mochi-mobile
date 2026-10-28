import { assert, assertEquals } from "jsr:@std/assert@1";
import { handleExport, TABLES, type ExportDeps } from "./core.ts";

function make(over: Partial<ExportDeps> = {}) {
  const asked: [string, string, string][] = [];
  const deps: ExportDeps = {
    getUser: async (t) => (t === "good" ? { id: "u1", email: "a@b.c", created_at: "2026-01-01" } : null),
    fetchRows: async (table, column, uid) => {
      asked.push([table, column, uid]);
      return { data: [{ marker: table }], error: null };
    },
    now: () => "2026-10-28T00:00:00Z",
    ...over,
  };
  return { deps, asked };
}
const req = (token?: string) => new Request("https://x.test/export", { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {} });

Deno.test("sin sesión: 401 y no consulta nada", async () => {
  const { deps, asked } = make();
  assertEquals((await handleExport(req(), deps, {})).status, 401);
  assertEquals((await handleExport(req("malo"), deps, {})).status, 401);
  assertEquals(asked.length, 0);
});

Deno.test("exporta solo filtrando por el id de quien llama", async () => {
  const { deps, asked } = make();
  const res = await handleExport(req("good"), deps, {});
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.account.id, "u1");
  assertEquals(body.profiles[0].marker, "profiles");
  assert(asked.every(([, , uid]) => uid === "u1"));
  assertEquals(asked.length, Object.keys(TABLES).length);
});

Deno.test("una tabla que falla se marca sin romper la exportación", async () => {
  const { deps } = make({
    fetchRows: async (table) => (table === "cycle_logs" ? { data: null, error: "x" } : { data: [], error: null }),
  });
  const body = await (await handleExport(req("good"), deps, {})).json();
  assertEquals(body.cycle_logs.error, "no disponible");
  assertEquals(body.habits, []);
});

Deno.test("incluye datos del ciclo, consentimientos y memoria (derecho de acceso)", () => {
  for (const t of ["cycle_logs", "user_consents", "mochi_memory", "points_ledger", "vouchers", "partner_checkins", "partner_notes"]) assert(t in TABLES, t);
});
