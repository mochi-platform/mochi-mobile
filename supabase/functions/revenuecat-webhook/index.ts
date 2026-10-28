import { createClient } from "npm:@supabase/supabase-js@2";
import { handleWebhook, type WebhookDeps } from "./core.ts";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const deps: WebhookDeps = {
  expectedAuth: Deno.env.get("REVENUECAT_WEBHOOK_AUTH"),
  lastEventTs: async (userId) => {
    const { data } = await supabase
      .from("billing_events")
      .select("payload")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return Number(data?.payload?.event?.event_timestamp_ms ?? 0);
  },
  sync: async (args) => {
    const { error } = await supabase.rpc("server_sync_subscription", args);
    return error ? { code: error.code, message: error.message } : null;
  },
  newId: () => crypto.randomUUID(),
};

Deno.serve((req) => handleWebhook(req, deps));
