import { createClient } from "npm:@supabase/supabase-js@2";
import { handleTask, type Deps } from "./core.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const deps: Deps = {
  getUser: async (token) => {
    const { data, error } = await admin.auth.getUser(token);
    return error || !data.user ? null : { id: data.user.id };
  },
  rpc: async (fn, args) => {
    const { data, error } = await admin.rpc(fn, args);
    return { data, error: error ? { message: error.message, code: error.code } : null };
  },
  cacheGet: async (key) => {
    const { data } = await admin
      .from("ai_cache")
      .select("value")
      .eq("key", key)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    return data?.value ?? null;
  },
  cacheSet: async (key, value, ttlSeconds) => {
    await admin.from("ai_cache").upsert({
      key,
      value,
      expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
    });
  },
  upstream: async (model, messages, maxTokens, temperature) => {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("OPENROUTER_API_KEY")}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://mochi.siramong.tech",
        "X-Title": "Mochi",
      },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
    });
    const text = await res.text();
    if (!res.ok) {
      console.error("upstream failed", res.status, text.slice(0, 200));
      return { ok: false, status: res.status, text: "" };
    }
    try {
      const content = JSON.parse(text)?.choices?.[0]?.message?.content;
      return { ok: typeof content === "string" && content.length > 0, status: 200, text: content ?? "" };
    } catch {
      return { ok: false, status: 502, text: "" };
    }
  },
  apiKeyConfigured: Boolean(Deno.env.get("OPENROUTER_API_KEY")),
  newId: () => crypto.randomUUID(),
};

Deno.serve((req) => handleTask(req, deps, cors));
