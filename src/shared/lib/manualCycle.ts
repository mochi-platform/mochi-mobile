import AsyncStorage from "@react-native-async-storage/async-storage";
import { toLocalISODate } from "@/src/shared/lib/dates";

const MANUAL_KEY = "cycle:manual:starts";

/** Registro manual: solo se guarda en el dispositivo. */
export async function getManualPeriodStarts(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(MANUAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export async function addManualPeriodStart(
  dateISO: string = toLocalISODate(new Date()),
): Promise<void> {
  const current = await getManualPeriodStarts();
  if (current.includes(dateISO)) return;
  const next = [...current, dateISO].sort().slice(-12);
  await AsyncStorage.setItem(MANUAL_KEY, JSON.stringify(next));
}

export async function clearManualPeriods(): Promise<void> {
  await AsyncStorage.removeItem(MANUAL_KEY);
}
