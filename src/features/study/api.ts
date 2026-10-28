import { toLocalISODate } from "@/src/shared/lib/dates";
import { supabase } from "@/src/shared/lib/supabase";

export type StudyBlock = {
  id: string;
  subject: string;
  dayOfWeek: number;
  start: string;
  end: string;
};
export type StudySession = { id: string; subject: string; seconds: number; completedAt: string };
export type ExamLog = {
  id: string;
  subject: string;
  date: string;
  grade: number | null;
  maxGrade: number | null;
  upcoming: boolean;
};

export type StudyData = { blocks: StudyBlock[]; sessions: StudySession[]; exams: ExamLog[] };

export async function fetchStudy(userId: string): Promise<StudyData> {
  const [sessions, exams, blocks] = await Promise.all([
    supabase
      .from("study_sessions")
      .select("id, subject, duration_seconds, completed_at")
      .eq("user_id", userId)
      .order("completed_at", { ascending: false })
      .limit(50),
    supabase
      .from("exam_logs")
      .select("id, subject, grade, max_grade, exam_date, is_upcoming")
      .eq("user_id", userId)
      .order("exam_date", { ascending: false }),
    supabase
      .from("study_blocks")
      .select("id, subject, day_of_week, start_time, end_time")
      .eq("user_id", userId)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true }),
  ]);
  if (sessions.error) throw sessions.error;
  if (exams.error) throw exams.error;
  if (blocks.error) throw blocks.error;
  return {
    sessions: (sessions.data ?? []).map((s) => ({
      id: s.id,
      subject: s.subject,
      seconds: s.duration_seconds,
      completedAt: s.completed_at,
    })),
    exams: (exams.data ?? []).map((e) => ({
      id: e.id,
      subject: e.subject,
      date: e.exam_date,
      grade: e.grade,
      maxGrade: e.max_grade,
      upcoming: Boolean(e.is_upcoming),
    })),
    blocks: (blocks.data ?? []).map((b) => ({
      id: b.id,
      subject: b.subject,
      dayOfWeek: b.day_of_week,
      start: b.start_time,
      end: b.end_time,
    })),
  };
}

/** Días desde hoy (fecha local) hasta `isoDate`; negativo si ya pasó. */
export function daysUntil(isoDate: string, now: Date = new Date()): number {
  const start = new Date(`${toLocalISODate(now)}T00:00:00`).getTime();
  const end = new Date(`${isoDate.slice(0, 10)}T00:00:00`).getTime();
  return Math.round((end - start) / 86_400_000);
}

/** "09:00:00" → "09:00". */
export function hhmm(time: string): string {
  return time.slice(0, 5);
}

export function minutesBetween(start: string, end: string): number {
  const toMin = (t: string) => {
    const [h = "0", m = "0"] = t.split(":");
    return Number(h) * 60 + Number(m);
  };
  return Math.max(0, toMin(end) - toMin(start));
}

export type WeekDay = { iso: string; day: number; letter: string; isToday: boolean };

/** La semana actual de lunes a domingo, con la fecha ISO local de cada día. */
export function currentWeek(now: Date = new Date()): WeekDay[] {
  const letters = ["D", "L", "M", "X", "J", "V", "S"];
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      iso: toLocalISODate(d),
      day: d.getDate(),
      letter: letters[d.getDay()],
      isToday: toLocalISODate(d) === toLocalISODate(now),
    };
  });
}
