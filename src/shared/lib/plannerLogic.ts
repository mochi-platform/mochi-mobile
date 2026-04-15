export type CyclePhase = "menstruation" | "follicular" | "ovulation" | "luteal";

export interface TaskScore {
  id: string;
  type: "study" | "routine" | "goal" | "habit";
  title: string;
  score: number;
  reason: string;
  recommendedLevel: "light" | "medium" | "intense";
}

export interface MergedTask {
  id: string;
  type: "study" | "routine" | "goal" | "habit";
  title: string;
  description?: string;
}

export function scoreTodaysTasks(
  energyLevel: number | null,
  cyclePhase: CyclePhase | null,
  currentStreak: number,
  tasks: MergedTask[],
): TaskScore[] {
  return tasks
    .map((task) => {
      let score = 0;
      let reason = "";

      // Energy component (25% weight if exists)
      if (energyLevel !== null) {
        const energyScore = (energyLevel / 5) * 100 * 0.25;
        score += energyScore;
        reason += `Energía: ${energyScore.toFixed(0)}pt. `;
      }

      // Streak component (35% weight)
      const streakScore =
        currentStreak === 0 ? -50 : currentStreak < 3 ? 0 : 50;
      score += streakScore * 0.35;
      reason += `Racha: ${streakScore}pt. `;

      // Cycle component (40% weight)
      const cycleScore = cyclePhase ? typeScoreByCycle(cyclePhase) : 0;
      score += cycleScore * 0.4;
      reason += `Ciclo: ${cycleScore > 0 ? "+" : ""}${cycleScore}pt.`;

      // Determine recommended difficulty level
      const recommendedLevel: "light" | "medium" | "intense" =
        energyLevel !== null && energyLevel < 3
          ? "light"
          : energyLevel !== null && energyLevel > 4
            ? "intense"
            : "medium";

      return {
        id: task.id,
        type: task.type,
        title: task.title,
        score: Math.max(0, Math.min(100, score)),
        reason,
        recommendedLevel,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5); // Top 5 tasks
}

function typeScoreByCycle(phase: CyclePhase): number {
  switch (phase) {
    case "menstruation":
      return -20;
    case "follicular":
      return 10;
    case "ovulation":
      return 20;
    case "luteal":
      return -10;
    default:
      return 0;
  }
}
