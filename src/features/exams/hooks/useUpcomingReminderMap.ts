import { useEffect, useState } from "react";
import { loadExamReminderDays } from "@/src/shared/lib/notifications";
import type { UpcomingExamItem } from "@/src/features/exams/types";

export function useUpcomingReminderMap(upcomingExams: UpcomingExamItem[]) {
  const [upcomingReminderMap, setUpcomingReminderMap] = useState<Record<string, number[]>>({});

  useEffect(() => {
    if (upcomingExams.length === 0) {
      setUpcomingReminderMap({});
      return;
    }

    let mounted = true;

    void (async () => {
      const entries = await Promise.all(
        upcomingExams.map(async (exam) => {
          const days = await loadExamReminderDays(exam.id);
          return [exam.id, days] as const;
        }),
      );

      if (!mounted) return;

      const nextReminderMap: Record<string, number[]> = {};
      entries.forEach(([examId, days]) => {
        nextReminderMap[examId] = days;
      });
      setUpcomingReminderMap(nextReminderMap);
    })();

    return () => {
      mounted = false;
    };
  }, [upcomingExams]);

  return upcomingReminderMap;
}
