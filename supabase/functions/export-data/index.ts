import { createClient } from "npm:@supabase/supabase-js@2";
import { handleExport, type ExportDeps } from "./core.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
};

Deno.serve((req) => {
  const authHeader = req.headers.get("Authorization") ?? "";
  // Cliente con el JWT de la usuaria: RLS garantiza que solo lee lo suyo.
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const deps: ExportDeps = {
    getUser: async (token) => {
      const { data, error } = await supabase.auth.getUser(token);
      return error || !data.user
        ? null
        : { id: data.user.id, email: data.user.email, created_at: data.user.created_at };
    },
    fetchRows: async (table, column, uid) => {
      const { data, error } = await supabase.from(table).select("*").eq(column, uid).limit(10000);
      return { data, error };
    },
    now: () => new Date().toISOString(),
  };
  return handleExport(req, deps, cors);
});
