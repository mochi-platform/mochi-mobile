import { toLocalISODate } from "@/src/shared/lib/dates";
import { supabase } from "@/src/shared/lib/supabase";

/**
 * Datos de Duo para el Remaster. Las funciones del modo pareja (check-ins, notas) llegaron en la
 * migración 20261029000000_duo_partner_mode: mientras no esté en producción, esas secciones se
 * ocultan en vez de romper la pantalla (`partnerModeReady = false`).
 */
export type DuoMember = { id: string; name: string };

export type DuoSpace = {
  id: string;
  inviteStatus: "pending" | "accepted" | "cancelled";
  inviteCode: string;
  owner: DuoMember;
  partner: DuoMember | null;
  /** true si quien usa la app es la dueña del espacio (ella). */
  isOwner: boolean;
};

export type DuoSnapshot = {
  sharedFields: Record<string, boolean>;
  cyclePhase: string | null;
  moodLast: number | null;
};

export type DuoCheckin = { userId: string; mood: number; note: string | null };
export type DuoNote = {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
  readAt: string | null;
};
export type DuoVoucher = {
  id: string;
  title: string;
  description: string | null;
  mode: "prepaid" | "points" | "gift";
  pointsCost: number;
  isRedeemed: boolean;
  createdBy: string | null;
};
export type DuoGoal = { id: string; title: string; progress: number; isCompleted: boolean };

export type DuoState = {
  space: DuoSpace | null;
  snapshot: DuoSnapshot | null;
  checkins: DuoCheckin[];
  notes: DuoNote[];
  vouchers: DuoVoucher[];
  goals: DuoGoal[];
  partnerModeReady: boolean;
};

const EMPTY: Omit<DuoState, "space"> = {
  snapshot: null,
  checkins: [],
  notes: [],
  vouchers: [],
  goals: [],
  partnerModeReady: false,
};

/** Error de "esto aún no existe en la base" (tabla, columna o función). */
function isMissing(error: { code?: string } | null): boolean {
  return Boolean(
    error && ["42P01", "42703", "PGRST202", "PGRST205", "PGRST204"].includes(error.code ?? ""),
  );
}

function firstName(full: string | null | undefined, fallback: string): string {
  return full?.trim().split(/\s+/)[0] || fallback;
}

export async function loadDuo(userId: string): Promise<DuoState> {
  const { data: row, error } = await supabase
    .from("partner_spaces")
    .select("id, owner_user_id, partner_user_id, invite_code, invite_status")
    .or(`owner_user_id.eq.${userId},partner_user_id.eq.${userId}`)
    .neq("invite_status", "cancelled")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!row) return { space: null, ...EMPTY };

  const ids = [row.owner_user_id, row.partner_user_id].filter((id): id is string => Boolean(id));
  const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", ids);
  const nameOf = (id: string | null, fallback: string) =>
    firstName(profiles?.find((p) => p.id === id)?.full_name, fallback);

  const space: DuoSpace = {
    id: row.id,
    inviteStatus: row.invite_status as DuoSpace["inviteStatus"],
    inviteCode: row.invite_code,
    owner: { id: row.owner_user_id, name: nameOf(row.owner_user_id, "Ella") },
    partner: row.partner_user_id
      ? { id: row.partner_user_id, name: nameOf(row.partner_user_id, "Él") }
      : null,
    isOwner: row.owner_user_id === userId,
  };
  if (space.inviteStatus !== "accepted") return { space, ...EMPTY };

  const today = toLocalISODate(new Date());
  const [snapshotRes, vouchersRes, goalsRes, checkinsRes, notesRes] = await Promise.all([
    supabase.rpc("get_partner_space_snapshot", { p_space_id: space.id }),
    supabase
      .from("vouchers")
      .select("id, title, description, mode, points_cost, is_redeemed, created_by")
      .eq("space_id", space.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("joint_goals")
      .select("id, title, progress, is_completed")
      .eq("space_id", space.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("partner_checkins")
      .select("user_id, mood, note")
      .eq("space_id", space.id)
      .eq("day", today),
    supabase
      .from("partner_notes")
      .select("id, author_id, content, created_at, read_at")
      .eq("space_id", space.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  if (vouchersRes.error) throw vouchersRes.error;
  if (goalsRes.error) throw goalsRes.error;
  const partnerModeReady = !isMissing(checkinsRes.error) && !isMissing(notesRes.error);
  if (partnerModeReady && checkinsRes.error) throw checkinsRes.error;
  if (partnerModeReady && notesRes.error) throw notesRes.error;

  const snap = (snapshotRes.data ?? null) as {
    shared_fields?: Record<string, boolean>;
    cycle_phase?: string | null;
    mood_last?: number | null;
  } | null;

  return {
    space,
    snapshot: snap
      ? {
          sharedFields: snap.shared_fields ?? {},
          cyclePhase: snap.cycle_phase ?? null,
          moodLast: snap.mood_last ?? null,
        }
      : null,
    vouchers: (vouchersRes.data ?? []).map((v) => ({
      id: v.id,
      title: v.title,
      description: v.description,
      mode: (v.mode ?? "prepaid") as DuoVoucher["mode"],
      pointsCost: v.points_cost ?? 0,
      isRedeemed: Boolean(v.is_redeemed),
      createdBy: v.created_by,
    })),
    goals: (goalsRes.data ?? []).map((g) => ({
      id: g.id,
      title: g.title,
      progress: g.progress,
      isCompleted: g.is_completed,
    })),
    checkins: partnerModeReady
      ? (checkinsRes.data ?? []).map((c) => ({ userId: c.user_id, mood: c.mood, note: c.note }))
      : [],
    notes: partnerModeReady
      ? (notesRes.data ?? []).map((n) => ({
          id: n.id,
          authorId: n.author_id,
          content: n.content,
          createdAt: n.created_at,
          readAt: n.read_at,
        }))
      : [],
    partnerModeReady,
  };
}

export async function shareCheckin(spaceId: string, mood: number, note?: string): Promise<void> {
  const { error } = await supabase.rpc("upsert_partner_checkin", {
    p_space_id: spaceId,
    p_day: toLocalISODate(new Date()),
    p_mood: mood,
    p_note: note ?? undefined,
  });
  if (error) throw error;
}

export async function sendNote(spaceId: string, content: string): Promise<void> {
  const { error } = await supabase.rpc("send_partner_note", {
    p_space_id: spaceId,
    p_content: content,
  });
  if (error) throw error;
}

export async function markNotesRead(spaceId: string): Promise<void> {
  const { error } = await supabase.rpc("mark_partner_notes_read", { p_space_id: spaceId });
  if (error && !isMissing(error)) throw error;
}

export async function redeemVoucher(voucherId: string): Promise<void> {
  const { error } = await supabase.rpc("redeem_voucher", { p_voucher_id: voucherId });
  if (error) throw error;
}

/** Modo de la app; si la columna aún no existe en el servidor, «personal». */
export async function fetchAppMode(userId: string): Promise<"personal" | "partner"> {
  const { data, error } = await supabase
    .from("profiles")
    .select("app_mode")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return "personal";
  return data.app_mode === "partner" ? "partner" : "personal";
}

export async function setAppMode(mode: "personal" | "partner"): Promise<void> {
  const { error } = await supabase.rpc("set_app_mode", { p_mode: mode });
  if (error) throw error;
}
