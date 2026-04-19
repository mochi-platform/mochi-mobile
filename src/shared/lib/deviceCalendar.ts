import * as Calendar from "expo-calendar";
import { Platform } from "react-native";

export type CreateDeviceCalendarEventInput = {
  title: string;
  startDate: Date;
  endDate: Date;
  notes?: string;
  location?: string;
  url?: string;
  allDay?: boolean;
  recurrenceRule?: Calendar.RecurrenceRule;
  alarmsMinutesBefore?: number[];
};

function parseTime(time: string): { hour: number; minute: number } {
  const [hoursRaw = "0", minutesRaw = "0"] = time.split(":");
  const hour = Number.parseInt(hoursRaw, 10);
  const minute = Number.parseInt(minutesRaw, 10);

  return {
    hour: Number.isFinite(hour) ? Math.max(0, Math.min(23, hour)) : 0,
    minute: Number.isFinite(minute) ? Math.max(0, Math.min(59, minute)) : 0,
  };
}

function toAlarmOffsets(minutesBefore: number[] | undefined): Calendar.Alarm[] {
  if (!minutesBefore || minutesBefore.length === 0) {
    return [];
  }

  return Array.from(new Set(minutesBefore))
    .filter((value) => Number.isFinite(value) && value >= 0)
    .map((value) => ({ relativeOffset: -Math.abs(value) }));
}

function buildMochiCalendarInput(source: Calendar.Source): Partial<Calendar.Calendar> {
  return {
    title: "Mochi",
    name: "Mochi",
    color: "#7c3aed",
    entityType: Calendar.EntityTypes.EVENT,
    source,
    sourceId: source.id,
    ownerAccount: source.name ?? "Mochi",
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  };
}

async function resolveWritableCalendarId(): Promise<string | null> {
  if (Platform.OS === "ios") {
    try {
      const defaultCalendar = await Calendar.getDefaultCalendarAsync();
      if (defaultCalendar?.id) {
        return defaultCalendar.id;
      }
    } catch {
      // Fallback below.
    }
  }

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const mochiCalendar = calendars.find(
    (calendar) =>
      calendar.title === "Mochi" &&
      ((calendar as { allowsModifications?: boolean }).allowsModifications ??
        true),
  );

  if (mochiCalendar?.id) {
    return mochiCalendar.id;
  }

  const writableCalendar = calendars.find(
    (calendar) =>
      (calendar as { allowsModifications?: boolean }).allowsModifications ?? true,
  );

  if (writableCalendar?.id) {
    return writableCalendar.id;
  }

  if (Platform.OS === "android") {
    const sourceCalendar = calendars.find(
      (calendar) =>
        calendar.source?.id &&
        calendar.source?.name &&
        calendar.accessLevel !== Calendar.CalendarAccessLevel.NONE,
    );

    if (sourceCalendar?.source) {
      return Calendar.createCalendarAsync(
        buildMochiCalendarInput(sourceCalendar.source),
      );
    }
  }

  return null;
}

export async function createDeviceCalendarEvent(
  input: CreateDeviceCalendarEventInput,
): Promise<string | null> {
  const available = await Calendar.isAvailableAsync();
  if (!available) {
    throw new Error("El calendario no está disponible en este dispositivo.");
  }

  const permission = await Calendar.requestCalendarPermissionsAsync();
  if (permission.status !== "granted") {
    throw new Error("Permiso de calendario denegado.");
  }

  const eventData: Omit<Partial<Calendar.Event>, "id" | "organizer"> = {
    title: input.title,
    startDate: input.startDate,
    endDate: input.endDate,
    notes: input.notes,
    location: input.location,
    url: input.url,
    allDay: input.allDay,
    recurrenceRule: input.recurrenceRule,
    alarms: toAlarmOffsets(input.alarmsMinutesBefore),
    timeZone: "local",
  };

  const calendarId = await resolveWritableCalendarId();

  if (calendarId) {
    return Calendar.createEventAsync(calendarId, eventData);
  }

  const dialogResult = await Calendar.createEventInCalendarAsync(eventData, {
    startNewActivityTask: false,
  });

  if (dialogResult.action === Calendar.CalendarDialogResultActions.canceled) {
    throw new Error("La creación del evento fue cancelada.");
  }

  return dialogResult.id;
}

export function getNextDateForWeekday(
  dayOfWeek: number,
  time: string,
  from: Date = new Date(),
): Date {
  const safeDay = ((dayOfWeek % 7) + 7) % 7;
  const { hour, minute } = parseTime(time);

  const candidate = new Date(from);
  candidate.setHours(hour, minute, 0, 0);

  const diff = (safeDay - from.getDay() + 7) % 7;
  candidate.setDate(candidate.getDate() + diff);

  if (candidate.getTime() <= from.getTime()) {
    candidate.setDate(candidate.getDate() + 7);
  }

  return candidate;
}

export function getDateFromISOAndTime(dateISO: string, time: string): Date {
  const base = new Date(`${dateISO}T00:00:00`);
  const { hour, minute } = parseTime(time);
  base.setHours(hour, minute, 0, 0);
  return base;
}
