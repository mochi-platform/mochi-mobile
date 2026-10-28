import { reportError } from "@/src/shared/lib/observability/reportError";
import { toLocalISODate } from "@/src/shared/lib/dates";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import type { Permission } from "react-native-health-connect";
import { isExpoGo } from "@/lib/env";
import { computeCycleState } from "@/src/shared/lib/cycleMath";
import { getManualPeriodStarts } from "@/src/shared/lib/manualCycle";

export type CyclePhase = "menstrual" | "folicular" | "ovulatoria" | "lutea" | "unknown";

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
  lastPeriodStart?: string;
  source: "health_connect" | "manual" | "estimated";
}

type CachedCyclePayload = {
  savedAt: number;
  data: CyclePhaseData;
};

const PHASE_CACHE_KEY = "cycle:phase:cache";
const PHASE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
let permissionRequestInFlight: Promise<boolean> | null = null;
let healthConnectModulePromise: Promise<typeof import("react-native-health-connect")> | null = null;

async function getHealthConnectModule(): Promise<
  typeof import("react-native-health-connect") | null
> {
  if (isExpoGo) return null;
  healthConnectModulePromise ??= import("react-native-health-connect");
  return healthConnectModulePromise;
}

function logHealthConnectError(scope: string, error: unknown): void {
  reportError(error, { scope: `health-connect/${scope}` });
}

/** Opcional: permite leer más de 30 días hacia atrás. Sin él, el ciclo funciona con la ventana por defecto. */
export const HISTORY_PERMISSION = {
  accessType: "read",
  recordType: "ReadHealthDataHistory",
} as unknown as Permission;

export const CYCLE_PERMISSIONS: Permission[] = [
  { accessType: "read", recordType: "MenstruationPeriod" },
  { accessType: "read", recordType: "MenstruationFlow" },
];

function toISODate(input: Date): string {
  return toLocalISODate(input);
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

  const starts = records.map((record) => record.startDate).sort((a, b) => (a < b ? -1 : 1));

  const distances: number[] = [];
  for (let i = 1; i < starts.length; i += 1) {
    const distance = daysBetween(starts[i - 1], starts[i]);
    if (distance >= 20 && distance <= 40) {
      distances.push(distance);
    }
  }

  if (distances.length === 0) return 28;
  const average = Math.round(distances.reduce((sum, value) => sum + value, 0) / distances.length);
  return Math.min(35, Math.max(24, average));
}

function estimatePeriodLength(records: MenstruationRecord[]): number {
  if (records.length === 0) return 5;

  const lengths = records
    .map((record) => daysBetween(record.startDate, record.endDate) + 1)
    .filter((length) => length >= 2 && length <= 10);

  if (lengths.length === 0) return 5;

  const average = Math.round(lengths.reduce((sum, value) => sum + value, 0) / lengths.length);
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
      const granted = await healthConnect.requestPermission([
        ...CYCLE_PERMISSIONS,
        HISTORY_PERMISSION,
      ]);
      const grantedKeys = new Set(
        granted.map((permission) => `${permission.accessType}:${permission.recordType}`),
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
      granted.map((permission) => `${permission.accessType}:${permission.recordType}`),
    );

    return CYCLE_PERMISSIONS.every((permission) =>
      grantedKeys.has(`${permission.accessType}:${permission.recordType}`),
    );
  } catch (error) {
    logHealthConnectError("hasCyclePermissions", error);
    return false;
  }
}

/** ¿Se concedió la lectura de historial (más de 30 días)? */
export async function hasHistoryPermission(): Promise<boolean> {
  const isReady = await ensureHealthConnectInitialized();
  if (!isReady) return false;
  const healthConnect = await getHealthConnectModule();
  if (!healthConnect) return false;
  try {
    const granted = await healthConnect.getGrantedPermissions();
    return granted.some((p) => (p.recordType as string) === "ReadHealthDataHistory");
  } catch (error) {
    logHealthConnectError("hasHistoryPermission", error);
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
  // Con el permiso de historial se leen hasta 24 meses; sin él, 6 (Health Connect limita lo anterior a 30 días).
  sixMonthsAgo.setMonth(now.getMonth() - ((await hasHistoryPermission()) ? 24 : 6));

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
      new Set(periodResult.records.map((record) => toISODate(new Date(record.time)))),
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
      new Set(flowResult.records.map((record) => toISODate(new Date(record.time)))),
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

/** Une los registros de Health Connect con los manuales (inicios a menos de 4 días se consideran el mismo). */
async function readAllPeriodRecords(): Promise<MenstruationRecord[]> {
  const [fromHealth, manualStarts] = await Promise.all([
    readMenstruationRecords(),
    getManualPeriodStarts(),
  ]);

  const merged = [...fromHealth];
  for (const start of manualStarts) {
    const duplicate = merged.some((record) => Math.abs(daysBetween(record.startDate, start)) <= 3);
    if (!duplicate) merged.push({ startDate: start, endDate: start });
  }
  return merged.sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
}

export async function invalidateCyclePhaseCache(): Promise<void> {
  await AsyncStorage.removeItem(PHASE_CACHE_KEY);
}

export async function getCurrentCyclePhase(): Promise<CyclePhaseData | null> {
  const cached = await getValidCachedPhase();
  if (cached) return cached;

  const records = await readAllPeriodRecords();
  const lastPeriod = records[0];
  if (!lastPeriod) return null;

  const cycleLength = estimateCycleLength(records);
  const periodLength =
    daysBetween(lastPeriod.startDate, lastPeriod.endDate) + 1 > 1
      ? daysBetween(lastPeriod.startDate, lastPeriod.endDate) + 1
      : estimatePeriodLength(records);

  const state = computeCycleState({
    lastPeriodStart: lastPeriod.startDate,
    periodLength,
    cycleLength,
    todayISO: toISODate(startOfToday()),
  });

  const data: CyclePhaseData = {
    phase: state.phase,
    dayOfCycle: state.dayOfCycle,
    cycleLength,
    periodLength,
    nextPeriodDate: state.nextPeriodDate,
    daysUntilNextPeriod: state.daysUntilNextPeriod,
    fertilityWindow: state.fertilityWindow,
    lastPeriodStart: lastPeriod.startDate,
    source: "health_connect",
  };

  try {
    await setCachedPhase(data);
  } catch (error) {
    // Si no se puede cachear, devolvemos el cálculo igualmente.
    reportError(error, { scope: "src/shared/lib/healthConnect.ts" });
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
