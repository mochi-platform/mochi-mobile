import { useMemo } from "react";
import { useCycle } from "@/src/core/providers/CycleContext";
import {
  getCyclePersonality,
  type MochiCyclePersonality,
} from "@/src/shared/lib/cyclePersonality";
import type { CyclePhase } from "@/src/shared/lib/healthConnect";

type RecommendationContext =
  | "study"
  | "exercise"
  | "cooking"
  | "habit"
  | "mood"
  | "general";

export function useCycleRecommendation(context: RecommendationContext): {
  tip: string | null;
  personality: MochiCyclePersonality | null;
  phase: CyclePhase | null;
} {
  const { cycleData } = useCycle();

  return useMemo(() => {
    if (!cycleData) {
      return {
        tip: null,
        personality: null,
        phase: null,
      };
    }

    const personality = getCyclePersonality(cycleData.phase);

    const tipByContext: Record<RecommendationContext, string> = {
      study: personality.studyTip,
      exercise: personality.exerciseTip,
      cooking: personality.cookingTip,
      habit: personality.habitTip,
      mood: personality.moodNote,
      general: personality.generalNote,
    };

    return {
      tip: tipByContext[context],
      personality,
      phase: cycleData.phase,
    };
  }, [context, cycleData]);
}

export default useCycleRecommendation;
