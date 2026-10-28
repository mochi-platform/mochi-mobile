// tabla -> columna que identifica a la dueña
export const TABLES: Record<string, string> = {
  profiles: "id",
  user_settings: "user_id",
  user_consents: "user_id",
  user_achievements: "user_id",
  streaks: "user_id",
  streak_recovery_plans: "user_id",
  study_blocks: "user_id",
  study_sessions: "user_id",
  exam_logs: "user_id",
  exam_prep_sprints: "user_id",
  exam_sprint_progress: "user_id",
  flashcard_decks: "user_id",
  exercises: "user_id",
  routines: "user_id",
  routine_logs: "user_id",
  habits: "user_id",
  habit_logs: "user_id",
  goals: "user_id",
  mood_logs: "user_id",
  energy_levels: "user_id",
  gratitude_logs: "user_id",
  quick_notes: "user_id",
  action_conversions: "user_id",
  recipes: "user_id",
  recipe_cook_sessions: "user_id",
  recipe_publications: "owner_id",
  vouchers: "user_id",
  rewards: "user_id",
  cycle_logs: "user_id",
  partner_spaces: "owner_user_id",
  points_ledger: "user_id",
  ai_credits_ledger: "user_id",
  billing_subscriptions: "user_id",
  entitlement_grants: "user_id",
  mochi_memory: "user_id",
};

export type ExportDeps = {
  getUser: (token: string) => Promise<{ id: string; email?: string | null; created_at?: string } | null>;
  /** Lee con el JWT de la usuaria: RLS garantiza que solo ve lo suyo. */
  fetchRows: (table: string, column: string, uid: string) => Promise<{ data: unknown[] | null; error: unknown }>;
  now: () => string;
};

export async function handleExport(req: Request, deps: ExportDeps, cors: Record<string, string>): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const user = token ? await deps.getUser(token) : null;
  if (!user) {
    return new Response(JSON.stringify({ error: "No autenticado" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
  }

  const result: Record<string, unknown> = {
    exported_at: deps.now(),
    account: { id: user.id, email: user.email ?? null, created_at: user.created_at ?? null },
  };
  for (const [table, column] of Object.entries(TABLES)) {
    const { data, error } = await deps.fetchRows(table, column, user.id);
    result[table] = error ? { error: "no disponible" } : data;
  }
  return new Response(JSON.stringify(result), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
}
