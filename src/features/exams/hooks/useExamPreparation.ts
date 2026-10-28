import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import {
  buildExamPreparationKey,
  createDefaultPreparationState,
} from "@/src/features/exams/helpers";
import type {
  CalmChecklistState,
  ExamPreparationState,
  MissionStepKey,
  UpcomingExamItem,
} from "@/src/features/exams/types";

export function useExamPreparation(userId: string | undefined, upcomingExams: UpcomingExamItem[]) {
  const [prepStates, setPrepStates] = useState<Record<string, ExamPreparationState>>({});
  const [prepLoading, setPrepLoading] = useState(false);
  const [prepError, setPrepError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || upcomingExams.length === 0) {
      setPrepStates({});
      setPrepLoading(false);
      setPrepError(null);
      return;
    }

    void (async () => {
      try {
        setPrepLoading(true);
        setPrepError(null);

        const keys = upcomingExams.map((exam) => buildExamPreparationKey(userId, exam.id));
        const stored = await AsyncStorage.multiGet(keys);

        const nextState: Record<string, ExamPreparationState> = {};

        upcomingExams.forEach((exam, index) => {
          const value = stored[index]?.[1];

          if (!value) {
            nextState[exam.id] = createDefaultPreparationState();
            return;
          }

          try {
            const parsed = JSON.parse(value) as Partial<ExamPreparationState>;
            nextState[exam.id] = {
              calm: {
                pendingClosure: Boolean(parsed.calm?.pendingClosure),
                miniReview: Boolean(parsed.calm?.miniReview),
                rest: Boolean(parsed.calm?.rest),
              },
              mission: {
                diagnosis: Boolean(parsed.mission?.diagnosis),
                guidedPractice: Boolean(parsed.mission?.guidedPractice),
                mockExam: Boolean(parsed.mission?.mockExam),
                finalReview: Boolean(parsed.mission?.finalReview),
              },
            };
          } catch {
            nextState[exam.id] = createDefaultPreparationState();
          }
        });

        setPrepStates(nextState);
      } catch {
        setPrepError("No se pudo cargar el progreso del cofre y la misión");
      } finally {
        setPrepLoading(false);
      }
    })();
  }, [userId, upcomingExams]);

  const persistExamPreparation = useCallback(
    async (examId: string, data: ExamPreparationState) => {
      if (!userId) return;

      try {
        await AsyncStorage.setItem(buildExamPreparationKey(userId, examId), JSON.stringify(data));
        setPrepError(null);
      } catch {
        setPrepError("No se pudo guardar el progreso del cofre y la misión");
      }
    },
    [userId],
  );

  const getPrepState = useCallback(
    (examId: string): ExamPreparationState => prepStates[examId] ?? createDefaultPreparationState(),
    [prepStates],
  );

  const toggleCalmStep = useCallback(
    (examId: string, step: keyof CalmChecklistState) => {
      const current = getPrepState(examId);
      const updated: ExamPreparationState = {
        calm: {
          ...current.calm,
          [step]: !current.calm[step],
        },
        mission: {
          ...current.mission,
        },
      };

      setPrepStates((prev) => ({
        ...prev,
        [examId]: updated,
      }));

      void persistExamPreparation(examId, updated);
    },
    [getPrepState, persistExamPreparation],
  );

  const toggleMissionStep = useCallback(
    (examId: string, step: MissionStepKey) => {
      const current = getPrepState(examId);
      const updated: ExamPreparationState = {
        calm: {
          ...current.calm,
        },
        mission: {
          ...current.mission,
          [step]: !current.mission[step],
        },
      };

      setPrepStates((prev) => ({
        ...prev,
        [examId]: updated,
      }));

      void persistExamPreparation(examId, updated);
    },
    [getPrepState, persistExamPreparation],
  );

  return { prepLoading, prepError, getPrepState, toggleCalmStep, toggleMissionStep };
}
