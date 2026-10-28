import { createClient } from "npm:@supabase/supabase-js@2";
import { handleDelete, type DeleteDeps } from "./core.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
};

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const deps: DeleteDeps = {
  getUser: async (token) => {
    const { data, error } = await admin.auth.getUser(token);
    return error || !data.user ? null : { id: data.user.id };
  },
  deleteUser: async (id) => {
    const { error } = await admin.auth.admin.deleteUser(id);
    return error ? { message: error.message } : null;
  },
};

Deno.serve((req) => handleDelete(req, deps, cors));
