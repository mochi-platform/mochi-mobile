import type { TaskDef } from "./prompts/types.ts";
import { companion, discipline, flashcards, flashcardsFromImage, studyDuration, studyPlan, weeklyPlanner } from "./prompts/study.ts";
import { motivation, noteToAction, recoveryPlan, weeklySummary, wellness } from "./prompts/wellness.ts";
import { cookingHelp, exerciseDesc, recipe } from "./prompts/cooking.ts";

// deno-lint-ignore no-explicit-any
export const TASKS: Record<string, TaskDef<any>> = {
  recipe,
  flashcards,
  flashcards_from_image: flashcardsFromImage,
  study_plan: studyPlan,
  companion,
  weekly_planner: weeklyPlanner,
  wellness,
  motivation,
  note_to_action: noteToAction,
  recovery_plan: recoveryPlan,
  exercise_desc: exerciseDesc,
  study_duration: studyDuration,
  cooking_help: cookingHelp,
  weekly_summary: weeklySummary,
  discipline,
};
