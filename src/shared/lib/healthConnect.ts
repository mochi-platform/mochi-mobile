import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import type { Permission } from "react-native-health-connect";
import { isExpoGo } from "@/lib/env";

export type CyclePhase =
  | "menstrual"
  | "folicular"
  | "ovulatoria"
  | "lutea"
  | "unknown";

export interface MenstruationRecord {
  startDate: string;
  endDate: string;
}

export interface CyclePhaseData {
  phase: CyclePhase;
  dayOfCycle: number;
  cycleLength: number;
  periodLength: number;
  nextPeriodDate: string;
  daysUntilNextPeriod: number;
  fertilityWindow: boolean;
  source: "health_connect" | "manual" | "estimated";
}

type CachedCyclePayload = {
  savedAt: number;
  data: CyclePhaseData;
};

const PHASE_CACHE_KEY = "cycle:phase:cache";
const PHASE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
let permissionRequestInFlight: Promise<boolean> | null = null;
let healthConnectModulePromise:
  | Promise<typeof import("react-native-health-connect")>
  | null = null;

async function getHealthConnectModule(): Promise<
  typeof import("react-native-health-connect") | null
> {
  if (isExpoGo) return null;
  healthConnectModulePromise ??= import("react-native-health-connect");
  return healthConnectModulePromise;
}

function logHealthConnectError(scope: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[health-connect] ${scope}: ${message}`);
}

export const CYCLE_PERMISSIONS: Permission[] = [
  { accessType: "read", recordType: "MenstruationPeriod" },
  { accessType: "read", recordType: "MenstruationFlow" },
];

function toISODate(input: Date): string {
  return input.toISOString().slice(0, 10);
}

function startOfToday(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function daysBetween(startISO: string, endISO: string): number {
  const start = new Date(`${startISO}T00:00:00`);
  const end = new Date(`${endISO}T00:00:00`);
  const diff = end.getTime() - start.getTime();
  return Math.floor(diff / (24 * 60 * 60 * 1000));
}

function addDays(baseISO: string, days: number): string {
  const date = new Date(`${baseISO}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

function normalizeCycleDay(dayOfCycle: number, cycleLength: number): number {
  if (dayOfCycle <= 0) return 1;
  return ((dayOfCycle - 1) % cycleLength) + 1;
}

function groupConsecutiveDays(days: string[]): MenstruationRecord[] {
  if (days.length === 0) return [];

  const sorted = [...days].sort((a, b) => (a < b ? -1 : 1));
  const grouped: MenstruationRecord[] = [];

  let currentStart = sorted[0];
  let currentEnd = sorted[0];

  for (let index = 1; index < sorted.length; index += 1) {
    const day = sorted[index];
    const gap = daysBetween(currentEnd, day);

    if (gap <= 1) {
      currentEnd = day;
    } else {
      grouped.push({ startDate: currentStart, endDate: currentEnd });
      currentStart = day;
      currentEnd = day;
    }
  }

  grouped.push({ startDate: currentStart, endDate: currentEnd });
  return grouped;
}

function estimateCycleLength(records: MenstruationRecord[]): number {
  if (records.length < 2) return 28;

  const starts = records
    .map((record) => record.startDate)
    .sort((a, b) => (a < b ? -1 : 1));

  const distances: number[] = [];
  for (let i = 1; i < starts.length; i += 1) {
    const distance = daysBetween(starts[i - 1], starts[i]);
    if (distance >= 20 && distance <= 40) {
      distances.push(distance);
    }
  }

  if (distances.length === 0) return 28;
  const average = Math.round(
    distances.reduce((sum, value) => sum + value, 0) / distances.length,
  );
  return Math.min(35, Math.max(24, average));
}

function estimatePeriodLength(records: MenstruationRecord[]): number {
  if (records.length === 0) return 5;

  const lengths = records
    .map((record) => daysBetween(record.startDate, record.endDate) + 1)
    .filter((length) => length >= 2 && length <= 10);

  if (lengths.length === 0) return 5;

  const average = Math.round(
    lengths.reduce((sum, value) => sum + value, 0) / lengths.length,
  );
  return Math.min(8, Math.max(3, average));
}

async function ensureHealthConnectInitialized(): Promise<boolean> {
  if (isExpoGo || Platform.OS !== "android") return false;

  const healthConnect = await getHealthConnectModule();
  if (!healthConnect) return false;

  let status: number;
  try {
    status = await healthConnect.getSdkStatus();
  } catch (error) {
    logHealthConnectError("getSdkStatus", error);
    return false;
  }

  if (status !== healthConnect.SdkAvailabilityStatus.SDK_AVAILABLE) return false;

  try {
    return await healthConnect.initialize();
  } catch (error) {
    logHealthConnectError("initialize", error);
    return false;
  }
}

export async function isHealthConnectAvailable(): Promise<boolean> {
  try {
    return await ensureHealthConnectInitialized();
  } catch (error) {
    logHealthConnectError("isHealthConnectAvailable", error);
    return false;
  }
}

export async function requestCyclePermissions(): Promise<boolean> {
  if (permissionRequestInFlight) {
    return permissionRequestInFlight;
  }

  permissionRequestInFlight = (async () => {
    const isReady = await ensureHealthConnectInitialized();
    if (!isReady) return false;

    const healthConnect = await getHealthConnectModule();
    if (!healthConnect) return false;

    try {
      const granted = await healthConnect.requestPermission(CYCLE_PERMISSIONS);
      const grantedKeys = new Set(
        granted.map(
          (permission) => `${permission.accessType}:${permission.recordType}`,
        ),
      );

      return CYCLE_PERMISSIONS.every((permission) =>
        grantedKeys.has(`${permission.accessType}:${permission.recordType}`),
      );
    } catch (error) {
      logHealthConnectError("requestCyclePermissions", error);
      return false;
    }
  })();

  try {
    return await permissionRequestInFlight;
  } finally {
    permissionRequestInFlight = null;
  }
}

export async function hasCyclePermissions(): Promise<boolean> {
  const isReady = await ensureHealthConnectInitialized();
  if (!isReady) return false;

  const healthConnect = await getHealthConnectModule();
  if (!healthConnect) return false;

  try {
    const granted = await healthConnect.getGrantedPermissions();
    const grantedKeys = new Set(
      granted.map(
        (permission) => `${permission.accessType}:${permission.recordType}`,
      ),
    );

    return CYCLE_PERMISSIONS.every((permission) =>
      grantedKeys.has(`${permission.accessType}:${permission.recordType}`),
    );
  } catch (error) {
    logHealthConnectError("hasCyclePermissions", error);
    return false;
  }
}

export async function revokeCyclePermissions(): Promise<boolean> {
  const isReady = await ensureHealthConnectInitialized();
  if (!isReady) return false;

  const healthConnect = await getHealthConnectModule();
  if (!healthConnect) return false;

  try {
    await healthConnect.revokeAllPermissions();
    await AsyncStorage.removeItem(PHASE_CACHE_KEY);
    return true;
  } catch (error) {
    logHealthConnectError("revokeCyclePermissions", error);
    return false;
  }
}

export async function readMenstruationRecords(): Promise<MenstruationRecord[]> {
  const canRead = await hasCyclePermissions();
  if (!canRead) return [];

  const healthConnect = await getHealthConnectModule();
  if (!healthConnect) return [];

  const now = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(now.getMonth() - 6);

  try {
    const periodResult = await healthConnect.readRecords("MenstruationPeriod", {
      timeRangeFilter: {
        operator: "between",
        startTime: sixMonthsAgo.toISOString(),
        endTime: now.toISOString(),
      },
      ascendingOrder: false,
      pageSize: 200,
    });

    const periodDays = Array.from(
      new Set(
        periodResult.records.map((record) => toISODate(new Date(record.time))),
      ),
    );

    const periodRecords = groupConsecutiveDays(periodDays);

    if (periodRecords.length > 0) {
      return periodRecords.sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
    }

    const flowResult = await healthConnect.readRecords("MenstruationFlow", {
      timeRangeFilter: {
        operator: "between",
        startTime: sixMonthsAgo.toISOString(),
        endTime: now.toISOString(),
      },
      ascendingOrder: true,
      pageSize: 500,
    });

    const flowDays = Array.from(
      new Set(
        flowResult.records.map((record) => toISODate(new Date(record.time))),
      ),
    ).sort((a, b) => (a < b ? -1 : 1));

    if (flowDays.length === 0) return [];

    const grouped = groupConsecutiveDays(flowDays);

    return grouped.sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
  } catch (error) {
    logHealthConnectError("readMenstruationRecords", error);
    return [];
  }
}

async function getValidCachedPhase(): Promise<CyclePhaseData | null> {
  try {
    const cachedRaw = await AsyncStorage.getItem(PHASE_CACHE_KEY);
    if (!cachedRaw) return null;

    const parsed = JSON.parse(cachedRaw) as CachedCyclePayload;
    if (!parsed.savedAt || !parsed.data) return null;

    const cacheAge = Date.now() - parsed.savedAt;
    if (cacheAge > PHASE_CACHE_TTL_MS) return null;

    return parsed.data;
  } catch {
    return null;
  }
}

async function setCachedPhase(data: CyclePhaseData): Promise<void> {
  const payload: CachedCyclePayload = {
    savedAt: Date.now(),
    data,
  };

  await AsyncStorage.setItem(PHASE_CACHE_KEY, JSON.stringify(payload));
}

export async function getCycleLastSync(): Promise<string | null> {
  try {
    const cachedRaw = await AsyncStorage.getItem(PHASE_CACHE_KEY);
    if (!cachedRaw) return null;

    const parsed = JSON.parse(cachedRaw) as CachedCyclePayload;
    if (!parsed.savedAt) return null;

    return new Date(parsed.savedAt).toISOString();
  } catch {
    return null;
  }
}

export async function getCurrentCyclePhase(): Promise<CyclePhaseData | null> {
  const cached = await getValidCachedPhase();
  if (cached) return cached;

  const records = await readMenstruationRecords();
  if (records.length === 0) return null;

  const lastPeriod = records[0];
  if (!lastPeriod) return null;

  const cycleLength = estimateCycleLength(records);
  const periodLength =
    daysBetween(lastPeriod.startDate, lastPeriod.endDate) + 1 ||
    estimatePeriodLength(records);

  const todayISO = toISODate(startOfToday());
  const absoluteDay = daysBetween(lastPeriod.startDate, todayISO) + 1;
  const dayOfCycle = normalizeCycleDay(absoluteDay, cycleLength);

  let phase: CyclePhase = "unknown";
  if (dayOfCycle <= periodLength) {
    phase = "menstrual";
  } else if (dayOfCycle >= 13 && dayOfCycle <= 16) {
    phase = "ovulatoria";
  } else if (dayOfCycle >= 6 && dayOfCycle < 13) {
    phase = "folicular";
  } else {
    phase = "lutea";
  }

  const cyclesPassed = Math.max(1, Math.ceil(absoluteDay / cycleLength));
  const nextPeriodDate = addDays(
    lastPeriod.startDate,
    cyclesPassed * cycleLength,
  );
  const daysUntilNextPeriod = Math.max(
    0,
    daysBetween(todayISO, nextPeriodDate),
  );

  const data: CyclePhaseData = {
    phase,
    dayOfCycle,
    cycleLength,
    periodLength,
    nextPeriodDate,
    daysUntilNextPeriod,
    fertilityWindow: dayOfCycle >= 11 && dayOfCycle <= 16,
    source: "health_connect",
  };

  try {
    await setCachedPhase(data);
  } catch {
    // Si no se puede cachear, devolvemos el cálculo igualmente.
  }

  return data;
}

export default {
  CYCLE_PERMISSIONS,
  requestCyclePermissions,
  hasCyclePermissions,
  readMenstruationRecords,
  getCurrentCyclePhase,
};
