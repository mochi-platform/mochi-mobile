import { createClient } from "npm:@supabase/supabase-js@2";
import { handleImage, type ImageDeps } from "./core.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
};

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const accessKey = Deno.env.get("UNSPLASH_ACCESS_KEY");

const deps: ImageDeps = {
  getUser: async (token) => {
    const { data, error } = await admin.auth.getUser(token);
    return error || !data.user ? null : { id: data.user.id };
  },
  cacheGet: async (key) => {
    const { data } = await admin.from("ai_cache").select("value").eq("key", key).gt("expires_at", new Date().toISOString()).maybeSingle();
    return typeof data?.value === "string" ? data.value : null;
  },
  cacheSet: async (key, value, ttl) => {
    await admin.from("ai_cache").upsert({ key, value, expires_at: new Date(Date.now() + ttl * 1000).toISOString() });
  },
  search: async (query, orientation) => {
    const params = new URLSearchParams({ query, per_page: "1", orientation });
    const res = await fetch(`https://api.unsplash.com/search/photos?${params}`, {
      headers: { Authorization: `Client-ID ${accessKey}` },
    });
    if (!res.ok) throw new Error(`unsplash ${res.status}`);
    const json = (await res.json()) as { results?: { urls?: { small?: string } }[] };
    return json.results?.[0]?.urls?.small ?? null;
  },
  keyConfigured: Boolean(accessKey),
};

Deno.serve((req) => handleImage(req, deps, cors));
