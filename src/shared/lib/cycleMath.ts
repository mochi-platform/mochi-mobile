import { toLocalISODate } from "@/src/shared/lib/dates";

export type CyclePhaseKey = "menstrual" | "folicular" | "ovulatoria" | "lutea" | "unknown";

export interface CycleState {
  phase: CyclePhaseKey;
  dayOfCycle: number;
  ovulationDay: number;
  nextPeriodDate: string;
  daysUntilNextPeriod: number;
  fertilityWindow: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysBetweenISO(startISO: string, endISO: string): number {
  const start = new Date(`${startISO}T00:00:00`);
  const end = new Date(`${endISO}T00:00:00`);
  return Math.round((end.getTime() - start.getTime()) / DAY_MS);
}

export function addDaysISO(baseISO: string, days: number): string {
  const date = new Date(`${baseISO}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toLocalISODate(date);
}

/**
 * Calcula la fase a partir de la última fecha de inicio. La ovulación se estima
 * por la duración real del ciclo (≈ duración − 14), no por días fijos.
 */
export function computeCycleState(params: {
  lastPeriodStart: string;
  periodLength: number;
  cycleLength: number;
  todayISO: string;
}): CycleState {
  const { lastPeriodStart, periodLength, cycleLength, todayISO } = params;

  const absoluteDay = daysBetweenISO(lastPeriodStart, todayISO) + 1;
  const dayOfCycle = absoluteDay <= 0 ? 1 : ((absoluteDay - 1) % cycleLength) + 1;
  const ovulationDay = Math.max(periodLength + 2, cycleLength - 14);

  let phase: CyclePhaseKey;
  if (dayOfCycle <= periodLength) {
    phase = "menstrual";
  } else if (dayOfCycle >= ovulationDay - 1 && dayOfCycle <= ovulationDay + 1) {
    phase = "ovulatoria";
  } else if (dayOfCycle < ovulationDay - 1) {
    phase = "folicular";
  } else {
    phase = "lutea";
  }

  const cyclesPassed = Math.max(1, Math.ceil(absoluteDay / cycleLength));
  const nextPeriodDate = addDaysISO(lastPeriodStart, cyclesPassed * cycleLength);

  return {
    phase,
    dayOfCycle,
    ovulationDay,
    nextPeriodDate,
    daysUntilNextPeriod: Math.max(0, daysBetweenISO(todayISO, nextPeriodDate)),
    fertilityWindow: dayOfCycle >= ovulationDay - 5 && dayOfCycle <= ovulationDay + 1,
  };
}
