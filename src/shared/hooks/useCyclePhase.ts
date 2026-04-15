import { useMemo } from "react";
import { useCycle } from "@/src/core/providers/CycleContext";
import type { CyclePhase } from "@/src/shared/lib/plannerLogic";

export function useCyclePhase(): CyclePhase | null {
  const { cycleData } = useCycle();

  return useMemo(() => {
    if (!cycleData?.phase) return null;
    return cycleData.phase as CyclePhase;
  }, [cycleData?.phase]);
}
