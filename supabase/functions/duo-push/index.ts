import { createClient } from "npm:@supabase/supabase-js@2";
import { handlePush, type PushDeps } from "./core.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
};

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const deps: PushDeps = {
  getUser: async (token) => {
    const { data, error } = await admin.auth.getUser(token);
    return error || !data.user ? null : { id: data.user.id };
  },
  targets: async (voucherId, callerId) => {
    const { data, error } = await admin.rpc("server_voucher_push_targets", { p_voucher_id: voucherId, p_caller: callerId });
    if (error) throw error;
    return data ?? [];
  },
  send: async (messages) => {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages.map((m) => ({ ...m, sound: "default", channelId: "duo" }))),
    });
    if (!res.ok) console.error("expo push failed", res.status);
  },
  now: () => new Date(),
};

Deno.serve((req) => handlePush(req, deps, cors));
