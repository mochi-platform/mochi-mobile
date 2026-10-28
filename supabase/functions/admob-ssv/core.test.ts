import { assertEquals } from "jsr:@std/assert@1";
import { handleSsv, type SsvDeps } from "./core.ts";

const UID = "11111111-1111-1111-1111-111111111111";
const UNIT = "ca-app-pub-1/2";

function b64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** raw r||s -> DER, como lo firma AdMob. */
function rawToDer(raw: Uint8Array): Uint8Array {
  const enc = (v: Uint8Array) => {
    let x = v;
    while (x.length > 1 && x[0] === 0) x = x.slice(1);
    if (x[0] & 0x80) x = new Uint8Array([0, ...x]);
    return new Uint8Array([0x02, x.length, ...x]);
  };
  const r = enc(raw.slice(0, 32));
  const s = enc(raw.slice(32));
  return new Uint8Array([0x30, r.length + s.length, ...r, ...s]);
}

async function setup() {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const spki = new Uint8Array(await crypto.subtle.exportKey("spki", pair.publicKey));
  const pem = `-----BEGIN PUBLIC KEY-----\n${btoa(String.fromCharCode(...spki))}\n-----END PUBLIC KEY-----`;
  const claims: Record<string, unknown>[] = [];
  const deps: SsvDeps = {
    getKeys: async () => [{ keyId: 3335741209, pem }],
    allowedUnits: [UNIT],
    now: () => 1_700_000_000_000,
    claim: async (a) => {
      claims.push(a);
      return null;
    },
  };
  const url = async (params: Record<string, string>, tamper = false) => {
    const base = new URLSearchParams(params).toString();
    const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, pair.privateKey, new TextEncoder().encode(base)));
    const query = `${tamper ? base.replace(UID, "33333333-3333-3333-3333-333333333333") : base}&signature=${b64url(rawToDer(sig))}&key_id=3335741209`;
    return new Request(`https://x.test/ssv?${query}`);
  };
  return { deps, claims, url };
}

const ok = { ad_unit: UNIT, timestamp: "1700000000000", transaction_id: "tx1", user_id: UID };

Deno.test("firma válida de un bloque de Mochi: otorga el crédito", async () => {
  const { deps, claims, url } = await setup();
  assertEquals((await handleSsv(await url(ok), deps)).status, 200);
  assertEquals(claims.length, 1);
  assertEquals(claims[0].p_user_id, UID);
});

Deno.test("query manipulada tras firmar: 403", async () => {
  const { deps, claims, url } = await setup();
  assertEquals((await handleSsv(await url(ok, true), deps)).status, 403);
  assertEquals(claims.length, 0);
});

Deno.test("bloque ajeno (otro publisher): 403", async () => {
  const { deps, claims, url } = await setup();
  assertEquals((await handleSsv(await url({ ...ok, ad_unit: "ca-app-pub-9/9" }), deps)).status, 403);
  assertEquals(claims.length, 0);
});

Deno.test("recompensa vieja: 403", async () => {
  const { deps, url } = await setup();
  assertEquals((await handleSsv(await url({ ...ok, timestamp: "1600000000000" }), deps)).status, 403);
});

Deno.test("sin bloques configurados rechaza todo", async () => {
  const { deps, url } = await setup();
  assertEquals((await handleSsv(await url(ok), { ...deps, allowedUnits: [] })).status, 403);
});

Deno.test("user_id inválido: 400", async () => {
  const { deps, url } = await setup();
  assertEquals((await handleSsv(await url({ ...ok, user_id: "no-es-uuid" }), deps)).status, 400);
});

Deno.test("faltan parámetros: 400", async () => {
  const { deps } = await setup();
  assertEquals((await handleSsv(new Request("https://x.test/ssv?user_id=a"), deps)).status, 400);
});

Deno.test("tope diario no se reintenta (200) pero un fallo de base de datos sí (500)", async () => {
  const { deps, url } = await setup();
  assertEquals((await handleSsv(await url(ok), { ...deps, claim: async () => ({ message: "Limite diario alcanzado (limit)" }) })).status, 200);
  assertEquals((await handleSsv(await url(ok), { ...deps, claim: async () => ({ message: "connection reset" }) })).status, 500);
});
