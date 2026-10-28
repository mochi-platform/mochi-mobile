import { assertEquals } from "jsr:@std/assert@1";
import { handleDelete, type DeleteDeps } from "./core.ts";

const cors = {};
function make(over: Partial<DeleteDeps> = {}) {
  const deleted: string[] = [];
  const deps: DeleteDeps = {
    getUser: async (t) => (t === "good" ? { id: "u1" } : null),
    deleteUser: async (id) => {
      deleted.push(id);
      return null;
    },
    ...over,
  };
  return { deps, deleted };
}
const req = (body: unknown, token = "good", method = "POST") =>
  new Request("https://x.test/del", { method, headers: { Authorization: `Bearer ${token}` }, body: method === "POST" ? JSON.stringify(body) : undefined });

Deno.test("sin sesión válida: 401 y no borra", async () => {
  const { deps, deleted } = make();
  assertEquals((await handleDelete(req({ confirm: "ELIMINAR" }, "malo"), deps, cors)).status, 401);
  assertEquals(deleted.length, 0);
});

Deno.test("sin confirmación explícita: 400", async () => {
  const { deps, deleted } = make();
  assertEquals((await handleDelete(req({}), deps, cors)).status, 400);
  assertEquals((await handleDelete(req({ confirm: "eliminar" }), deps, cors)).status, 400);
  assertEquals(deleted.length, 0);
});

Deno.test("confirmada: borra solo la cuenta de quien llama", async () => {
  const { deps, deleted } = make();
  const res = await handleDelete(req({ confirm: "ELIMINAR", id: "otra" }), deps, cors);
  assertEquals(res.status, 200);
  assertEquals(deleted, ["u1"]);
});

Deno.test("fallo al borrar: 500", async () => {
  const { deps } = make({ deleteUser: async () => ({ message: "db" }) });
  assertEquals((await handleDelete(req({ confirm: "ELIMINAR" }), deps, cors)).status, 500);
});

Deno.test("solo POST", async () => {
  const { deps } = make();
  assertEquals((await handleDelete(req(null, "good", "GET"), deps, cors)).status, 405);
});
