import { assertEquals } from "jsr:@std/assert@1";
import { handleImage, type ImageDeps } from "./core.ts";

function make(over: Partial<ImageDeps> = {}) {
  const calls = { search: 0, cacheSet: [] as string[] };
  const deps: ImageDeps = {
    getUser: async (t) => (t === "good" ? { id: "u1" } : null),
    cacheGet: async () => null,
    cacheSet: async (k) => {
      calls.cacheSet.push(k);
    },
    search: async () => {
      calls.search++;
      return "https://img.test/a.jpg";
    },
    keyConfigured: true,
    ...over,
  };
  return { deps, calls };
}
const req = (body: unknown, token = "good") =>
  new Request("https://x.test/img", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });

Deno.test("sin sesión: 401", async () => {
  const { deps } = make();
  assertEquals((await handleImage(req({ query: "arroz" }, "malo"), deps, {})).status, 401);
});

Deno.test("consulta vacía o larga: 400", async () => {
  const { deps } = make();
  assertEquals((await handleImage(req({ query: "  " }), deps, {})).status, 400);
  assertEquals((await handleImage(req({ query: "x".repeat(81) }), deps, {})).status, 400);
});

Deno.test("busca, devuelve la URL y la cachea normalizada", async () => {
  const { deps, calls } = make();
  const res = await handleImage(req({ query: "  Arroz Con Pollo " }), deps, {});
  assertEquals((await res.json()).url, "https://img.test/a.jpg");
  assertEquals(calls.cacheSet, ["unsplash:landscape:arroz con pollo"]);
});

Deno.test("un acierto de caché no consulta al proveedor", async () => {
  const { deps, calls } = make({ cacheGet: async () => "https://cache.test/b.jpg" });
  const body = await (await handleImage(req({ query: "arroz" }), deps, {})).json();
  assertEquals(body.cached, true);
  assertEquals(calls.search, 0);
});

Deno.test("sin clave configurada o con fallo del proveedor: url null sin error", async () => {
  assertEquals((await (await handleImage(req({ query: "a" }), make({ keyConfigured: false }).deps, {})).json()).url, null);
  const failing = make({ search: async () => { throw new Error("429"); } });
  assertEquals((await (await handleImage(req({ query: "a" }), failing.deps, {})).json()).url, null);
});

Deno.test("orientación inválida cae a landscape", async () => {
  const { deps, calls } = make();
  await handleImage(req({ query: "sopa", orientation: "diagonal" }), deps, {});
  assertEquals(calls.cacheSet[0], "unsplash:landscape:sopa");
});
