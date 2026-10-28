export type SsvKey = { keyId: number | string; pem: string };

export type SsvDeps = {
  getKeys: () => Promise<SsvKey[]>;
  allowedUnits: string[];
  now: () => number;
  claim: (args: Record<string, unknown>) => Promise<{ message: string } | null>;
};

function b64urlToBytes(s: string): Uint8Array<ArrayBuffer> {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

function pemToDer(pem: string): Uint8Array<ArrayBuffer> {
  const b64 = pem.replace(/-----[A-Z ]+-----/g, "").replace(/\s+/g, "");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

/** WebCrypto espera r||s crudo; AdMob firma en DER. Valida etiquetas y longitudes. */
export function derToRaw(der: Uint8Array): Uint8Array<ArrayBuffer> {
  if (der[0] !== 0x30) throw new Error("der");
  let i = 2;
  if (der[1] & 0x80) i += der[1] & 0x7f;
  const read = () => {
    if (der[i] !== 0x02) throw new Error("der");
    const len = der[i + 1];
    if (len > 33) throw new Error("der");
    let v = der.slice(i + 2, i + 2 + len);
    i += 2 + len;
    while (v.length > 32 && v[0] === 0) v = v.slice(1);
    if (v.length > 32) throw new Error("der");
    const out = new Uint8Array(32);
    out.set(v, 32 - v.length);
    return out;
  };
  const r = read();
  const s = read();
  const raw = new Uint8Array(64);
  raw.set(r, 0);
  raw.set(s, 32);
  return raw;
}

export async function verifySignature(
  rawQuery: string,
  keyId: string,
  signature: string,
  keys: SsvKey[],
): Promise<boolean> {
  const key = keys.find((k) => String(k.keyId) === keyId);
  if (!key) return false;
  const cryptoKey = await crypto.subtle.importKey(
    "spki",
    pemToDer(key.pem),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"],
  );
  const signed = rawQuery.slice(0, rawQuery.indexOf("&signature="));
  return crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    derToRaw(b64urlToBytes(signature)),
    new TextEncoder().encode(signed),
  );
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function handleSsv(req: Request, deps: SsvDeps): Promise<Response> {
  const url = new URL(req.url);
  const q = url.searchParams;
  const signature = q.get("signature");
  const keyId = q.get("key_id");
  const userId = q.get("user_id");
  const transactionId = q.get("transaction_id");
  if (!signature || !keyId || !userId || !transactionId) {
    return new Response("Bad request", { status: 400 });
  }

  const rawQuery = req.url.slice(req.url.indexOf("?") + 1);
  const ok = await deps
    .getKeys()
    .then((keys) => verifySignature(rawQuery, keyId, signature, keys))
    .catch(() => false);
  if (!ok) return new Response("Invalid signature", { status: 403 });

  // La firma es de Google y válida para cualquier publisher: se exige que sea un bloque de Mochi.
  const adUnit = q.get("ad_unit") ?? "";
  if (deps.allowedUnits.length === 0 || !deps.allowedUnits.includes(adUnit)) {
    return new Response("Ad unit not allowed", { status: 403 });
  }
  const ts = Number(q.get("timestamp"));
  if (!Number.isFinite(ts) || Math.abs(deps.now() - ts) > 24 * 3600 * 1000) {
    return new Response("Stale reward", { status: 403 });
  }
  if (!UUID_RE.test(userId)) return new Response("Bad user", { status: 400 });

  const error = await deps.claim({
    p_user_id: userId,
    p_reward_event_id: transactionId,
    p_ad_network: "admob",
    p_ad_unit_id: adUnit,
  });
  if (error) {
    console.error("claim failed", error.message);
    // Reintentable solo ante fallos transitorios; el tope diario no es un error.
    if (!/limit/i.test(error.message)) return new Response("Error", { status: 500 });
  }
  return new Response("OK", { status: 200 });
}
