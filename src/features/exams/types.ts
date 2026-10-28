export type TabId = "results" | "upcoming";

export type ExamResultItem = {
  id: string;
  subject: string;
  grade: number | null;
  max_grade: number | null;
  exam_date: string;
  notes: string | null;
};

export type UpcomingExamItem = {
  id: string;
  subject: string;
  exam_date: string;
  preparation_notes: string | null;
};

export type MissionStepKey = "diagnosis" | "guidedPractice" | "mockExam" | "finalReview";

export type CalmChecklistState = {
  pendingClosure: boolean;
  miniReview: boolean;
  rest: boolean;
};

export type MissionState = Record<MissionStepKey, boolean>;

export type ExamPreparationState = {
  calm: CalmChecklistState;
  mission: MissionState;
};
