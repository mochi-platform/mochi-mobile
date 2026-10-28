import { tc } from "@/src/shared/theme/colors";
import { Ionicons, Entypo } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import type { Habit } from "@/src/shared/types/database";

type HabitCardProps = {
  habit: Habit;
  isCompleted: boolean;
  onToggle: () => void;
  onLongPress?: () => void;
  isReminderEnabled?: boolean;
  onToggleReminder?: () => void;
  weeklyDots?: boolean[];
  weeklyDayLabels?: string[];
};

const colorBorderMap: Record<string, string> = {
  pink: "border-pink-200 dark:border-pink-800",
  yellow: "border-yellow-200 dark:border-yellow-800",
  blue: "border-blue-200 dark:border-blue-800",
  teal: "border-teal-200 dark:border-teal-800",
  purple: "border-purple-200 dark:border-purple-800",
};

const colorBgMap: Record<string, string> = {
  pink: "bg-pink-100 dark:bg-pink-900",
  yellow: "bg-yellow-100 dark:bg-yellow-900",
  blue: "bg-blue-100 dark:bg-blue-900",
  teal: "bg-teal-100 dark:bg-teal-900",
  purple: "bg-purple-100 dark:bg-purple-900",
};

const colorIconBgMap: Record<string, string> = {
  pink: "bg-pink-200 dark:bg-pink-800",
  yellow: "bg-yellow-200 dark:bg-yellow-800",
  blue: "bg-blue-200 dark:bg-blue-800",
  teal: "bg-teal-200 dark:bg-teal-800",
  purple: "bg-purple-200 dark:bg-purple-800",
};

const colorIconMap: Record<string, string> = {
  pink: tc("#9d174d"),
  yellow: tc("#92400e"),
  blue: tc("#1e3a8a"),
  teal: tc("#134e4a"),
  purple: tc("#4c1d95"),
};

const colorDotMap: Record<string, string> = {
  pink: tc("#9d174d"),
  yellow: tc("#92400e"),
  blue: tc("#1e3a8a"),
  teal: tc("#134e4a"),
  purple: tc("#4c1d95"),
};

const colorDotInactiveMap: Record<string, string> = {
  pink: tc("#fbcfe8"),
  yellow: tc("#fde68a"),
  blue: tc("#bfdbfe"),
  teal: tc("#99f6e4"),
  purple: tc("#ddd6fe"),
};

const colorMutedIconMap: Record<string, string> = {
  pink: tc("#be185d"),
  yellow: tc("#b45309"),
  blue: tc("#1d4ed8"),
  teal: tc("#0f766e"),
  purple: tc("#6d28d9"),
};

export function HabitCard({
  habit,
  isCompleted,
  onToggle,
  onLongPress,
  isReminderEnabled = true,
  onToggleReminder,
  weeklyDots,
  weeklyDayLabels,
}: HabitCardProps) {
  const scale = useSharedValue(1);
  const isCompletedShared = useDerivedValue(() => isCompleted);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: isCompletedShared.value ? 0.6 : 1,
  }));

  function handlePress() {
    scale.value = withSpring(0.94, { damping: 8, stiffness: 200 }, () => {
      scale.value = withSpring(1, { damping: 8, stiffness: 200 });
    });
    onToggle();
  }

  return (
    <TouchableOpacity onPress={handlePress} onLongPress={onLongPress} activeOpacity={0.8}>
      <Animated.View
        style={animatedStyle}
        className={`mb-3 flex-row items-center rounded-2xl border-2 p-4 ${colorBorderMap[habit.color] ?? "border-purple-200 dark:border-purple-800"} ${colorBgMap[habit.color] ?? "bg-purple-100 dark:bg-purple-900"}`}
      >
        <View
          className={`h-10 w-10 items-center justify-center rounded-xl ${colorIconBgMap[habit.color] ?? "bg-purple-200 dark:bg-purple-800"}`}
        >
          <Ionicons
            name={habit.icon as keyof typeof Ionicons.glyphMap}
            size={20}
            color={colorIconMap[habit.color] ?? tc("#4c1d95")}
          />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-sm font-bold text-slate-800 dark:text-slate-200">{habit.name}</Text>
          {weeklyDots && weeklyDots.length === 7 && (
            <View className="mt-1.5 flex-row items-center gap-1">
              {weeklyDots.map((done, i) => (
                <View
                  key={i}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: done
                      ? (colorDotMap[habit.color] ?? "#c4b5fd")
                      : (colorDotInactiveMap[habit.color] ?? "#ddd6fe"),
                  }}
                />
              ))}
              {weeklyDayLabels && (
                <Text className="ml-1 text-xs font-semibold text-slate-400">
                  {weeklyDots.filter(Boolean).length}/7
                </Text>
              )}
            </View>
          )}
        </View>
        <View className="ml-2 items-center">
          <TouchableOpacity
            className="mb-2 h-8 w-8 items-center justify-center rounded-full border"
            style={{
              borderColor: isReminderEnabled
                ? (colorIconMap[habit.color] ?? "#4c1d95")
                : (colorDotInactiveMap[habit.color] ?? "#ddd6fe"),
              backgroundColor: isReminderEnabled
                ? (colorDotInactiveMap[habit.color] ?? "#ddd6fe")
                : tc("#ffffff"),
            }}
            onPress={(event) => {
              event.stopPropagation();
              onToggleReminder?.();
            }}
          >
            <Ionicons
              name={isReminderEnabled ? "notifications" : "notifications-off"}
              size={14}
              color={
                isReminderEnabled
                  ? (colorIconMap[habit.color] ?? "#4c1d95")
                  : (colorMutedIconMap[habit.color] ?? "#6d28d9")
              }
            />
          </TouchableOpacity>

          <View
            className={`h-8 w-8 items-center justify-center rounded-full ${isCompleted ? "" : "border-2 border-slate-300 bg-white dark:border-slate-700 dark:bg-surface"}`}
            style={
              isCompleted
                ? { backgroundColor: colorIconMap[habit.color] ?? tc("#4c1d95") }
                : undefined
            }
          >
            {isCompleted && <Entypo name="check" size={16} color="white" />}
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default HabitCard;
