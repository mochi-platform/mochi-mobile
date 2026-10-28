import { tc } from "@/src/shared/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { AnimatedDashboardCard } from "@/src/features/home/dashboard/AnimatedDashboardCard";
import type { UpcomingExam } from "@/src/features/home/dashboard/types";
import { getDaysUntilExam, getUrgencyStyles } from "@/src/features/home/dashboard/helpers";

type UpcomingExamsCardProps = {
  animationSeed: number;
  upcomingExams: UpcomingExam[];
};

export function UpcomingExamsCard({ animationSeed, upcomingExams }: UpcomingExamsCardProps) {
  return (
    <AnimatedDashboardCard
      delay={80}
      animationSeed={animationSeed}
      className="mt-4 rounded-3xl border-2 border-yellow-300 bg-white p-5 dark:border-yellow-700 dark:bg-surface"
    >
      <View className="mb-3 flex-row items-center">
        <Ionicons name="time" size={18} color={tc("#b45309")} />
        <Text className="ml-2 text-base font-bold text-yellow-900 dark:text-yellow-100">
          Próximos exámenes
        </Text>
      </View>

      {upcomingExams.map((exam) => {
        const days = getDaysUntilExam(exam.exam_date);
        const urgency = getUrgencyStyles(days);

        return (
          <View
            key={exam.id}
            className="mb-2 rounded-2xl border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950"
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-extrabold text-yellow-900 dark:text-yellow-100">
                {exam.subject}
              </Text>
              <View className={`rounded-full px-2 py-1 ${urgency.badgeClass}`}>
                <Text className="text-xs font-bold">{urgency.text}</Text>
              </View>
            </View>
          </View>
        );
      })}

      {upcomingExams.some((exam) => getDaysUntilExam(exam.exam_date) === 0) && (
        <View className="mt-1 flex-row items-center rounded-2xl border border-pink-200 bg-pink-50 px-3 py-2 dark:border-pink-800 dark:bg-pink-950">
          <MochiCharacter mood="excited" size={34} />
          <Text className="ml-2 flex-1 text-xs font-semibold text-pink-700 dark:text-pink-300">
            Hoy tienes examen. Respira, confía en tu proceso y hazlo increíble.
          </Text>
        </View>
      )}
    </AnimatedDashboardCard>
  );
}
