import { createClient } from "npm:@supabase/supabase-js@2";
import { handleSsv, type SsvDeps, type SsvKey } from "./core.ts";

const KEYS_URL = "https://www.gstatic.com/admob/reward/verifier-keys.json";
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

let cached: { keys: SsvKey[]; at: number } | null = null;

const deps: SsvDeps = {
  getKeys: async () => {
    if (cached && Date.now() - cached.at < 24 * 3600 * 1000) return cached.keys;
    const res = await fetch(KEYS_URL);
    const { keys } = await res.json();
    cached = { keys, at: Date.now() };
    return keys as SsvKey[];
  },
  allowedUnits: (Deno.env.get("ADMOB_AD_UNITS") ?? "").split(",").map((u) => u.trim()).filter(Boolean),
  now: () => Date.now(),
  claim: async (args) => {
    const { error } = await supabase.rpc("server_claim_ad_credit", args);
    return error ? { message: error.message } : null;
  },
};

Deno.serve((req) => handleSsv(req, deps));
