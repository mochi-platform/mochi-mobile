import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { supabase } from "@/src/shared/lib/supabase";
import { useSession } from "@/src/core/providers/SessionContext";
import { useCycle } from "@/src/core/providers/CycleContext";
import type { StudyBlock } from "@/src/shared/types/database";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { useCustomAlert } from "@/src/shared/components/CustomAlert";
import { MochiCycleTip } from "@/src/shared/components/MochiCycleTip";

const days = ["L", "M", "X", "J", "V", "S", "D"];
const dayOfWeekMap: Record<string, number> = {
  L: 1,
  M: 2,
  X: 3,
  J: 4,
  V: 5,
  S: 6,
  D: 0,
};

const dayLettersByGetDay = ["D", "L", "M", "X", "J", "V", "S"];

const colorMap: Record<string, string> = {
  pink: "bg-pink-200",
  blue: "bg-blue-200",
  yellow: "bg-yellow-200",
  teal: "bg-teal-200",
  purple: "bg-purple-200",
  green: "bg-green-200",
};

type AnimatedStudyCardProps = {
  block: StudyBlock;
  index: number;
  animationSeed: number;
  onDelete: (blockId: string) => void;
  onEdit: (blockId: string) => void;
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim().length > 0) {
      return maybeMessage;
    }
  }

  return fallback;
}

function AnimatedStudyCard({
  block,
  index,
  animationSeed,
  onDelete,
  onEdit,
}: AnimatedStudyCardProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);

  useEffect(() => {
    opacity.value = 0;
    translateY.value = 16;

    opacity.value = withDelay(
      index * 100,
      withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) }),
    );
    translateY.value = withDelay(
      index * 100,
      withTiming(0, { duration: 360, easing: Easing.out(Easing.cubic) }),
    );
  }, [animationSeed, index, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });

  return (
    <Animated.View
      style={animatedStyle}
      className={`mb-3 rounded-2xl border border-slate-100 p-4 ${colorMap[block.color] || "bg-purple-200"}`}
    >
      <View className="flex-row items-center justify-between">
        <TouchableOpacity
          className="flex-1"
          onPress={() => router.push(`/study-timer?blockId=${block.id}`)}
          activeOpacity={0.85}
        >
          <Text className="text-base font-extrabold text-slate-800">
            {block.subject}
          </Text>
          <Text className="mt-1 text-sm font-semibold text-slate-700">
            {block.start_time} - {block.end_time}
          </Text>
        </TouchableOpacity>

        <View className="ml-3 flex-row items-center">
          <Text className="mr-2 text-xs font-bold text-slate-600">
            {(() => {
              const start = parseInt(block.start_time.split(":")[0]);
              const end = parseInt(block.end_time.split(":")[0]);
              const duration = end - start;
              return `${duration}h`;
            })()}
          </Text>

          <TouchableOpacity className="mr-2" onPress={() => onEdit(block.id)}>
            <Ionicons name="create-outline" size={18} color="#7c3aed" />
          </TouchableOpacity>

          <TouchableOpacity className="mr-2" onPress={() => onDelete(block.id)}>
            <Ionicons name="trash-outline" size={18} color="#7c3aed" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push(`/study-timer?blockId=${block.id}`)}
          >
            <Ionicons name="play-circle" size={18} color="#7c3aed" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

export function StudySchedule() {
  const { session } = useSession();
  const { cycleData } = useCycle();
  const { showAlert, AlertComponent } = useCustomAlert();
  const loadingMood =
    cycleData?.phase === "menstrual"
      ? "sleepy"
      : cycleData?.phase === "folicular"
        ? "thinking"
        : "thinking";

  const [selectedDay, setSelectedDay] = useState(
    dayLettersByGetDay[new Date().getDay()] ?? "X",
  );
  const [blocks, setBlocks] = useState<StudyBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [animationSeed, setAnimationSeed] = useState(0);

  const loadingScale = useSharedValue(1);
  const fabScale = useSharedValue(1);

  useEffect(() => {
    if (loading) {
      loadingScale.value = withRepeat(
        withSequence(
          withTiming(1.06, {
            duration: 650,
            easing: Easing.inOut(Easing.quad),
          }),
          withTiming(1, { duration: 650, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
      return;
    }

    loadingScale.value = withTiming(1, { duration: 180 });
  }, [loading, loadingScale]);

  const loadingAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: loadingScale.value }],
    };
  });

  const fabAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: fabScale.value }],
    };
  });

  const loadBlocks = useCallback(async () => {
    const userId = session?.user.id;
    if (!userId) {
      setBlocks([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const dayNum = dayOfWeekMap[selectedDay] ?? 3;

      const { data, error: supabaseError } = await supabase
        .from("study_blocks")
        .select("*")
        .eq("user_id", userId)
        .eq("day_of_week", dayNum)
        .order("start_time", { ascending: true });

      if (supabaseError) throw supabaseError;
      setBlocks(data ?? []);
      setAnimationSeed((prev) => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando bloques");
      setBlocks([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDay, session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      void loadBlocks();
    }, [loadBlocks]),
  );

  const handleDeleteBlock = (blockId: string) => {
    const userId = session?.user.id;
    if (!userId) return;

    showAlert({
      title: "Eliminar bloque",
      message: "¿Eliminar este bloque de estudio?",
      buttons: [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                // Preserve previous study history while allowing the block to be removed.
                const { error: detachError } = await supabase
                  .from("study_sessions")
                  .update({ study_block_id: null })
                  .eq("study_block_id", blockId)
                  .eq("user_id", userId);

                if (detachError) {
                  throw detachError;
                }

                const { data: deletedRows, error: deleteError } = await supabase
                  .from("study_blocks")
                  .delete()
                  .select("id")
                  .eq("id", blockId)
                  .eq("user_id", userId);

                if (deleteError) {
                  console.error("Delete error:", JSON.stringify(deleteError));
                  throw deleteError;
                }

                if (!deletedRows || deletedRows.length === 0) {
                  throw new Error(
                    "No se pudo eliminar el bloque. Verifica permisos de tu cuenta e inténtalo de nuevo.",
                  );
                }

                await loadBlocks();
              } catch (err) {
                console.error(
                  "[StudySchedule] error eliminando bloque:",
                  err instanceof Error ? err.message : String(err),
                );
                setError(getErrorMessage(err, "No se pudo eliminar el bloque"));
              }
            })();
          },
        },
      ],
    });
  };

  return (
    <>
      <View className="flex-1 bg-purple-100 px-5 pt-12">
        <View className="mb-6 flex-row items-center">
          <Ionicons name="calendar" size={20} color="#6b21a8" />
          <Text className="ml-2 text-2xl font-extrabold text-purple-900">
            Horario de estudio
          </Text>
        </View>

        <View className="mb-4 flex-row justify-between rounded-3xl border-2 border-purple-200 bg-white p-2">
          {days.map((day) => {
            const active = day === selectedDay;

            return (
              <TouchableOpacity
                key={day}
                className={`h-10 w-10 items-center justify-center rounded-2xl ${active ? "bg-purple-500" : ""}`}
                onPress={() => {
                  setSelectedDay(day);
                }}
              >
                <Text
                  className={`font-extrabold ${active ? "text-white" : "text-purple-500"}`}
                >
                  {day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View className="mb-4">
          <MochiCycleTip
            context="study"
            style="inline"
            dismissible
            storageKey="cycle:tip:study:hidden"
          />
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {loading ? (
            <View className="flex-1 items-center justify-center py-8">
              <Animated.View style={loadingAnimatedStyle}>
                <MochiCharacter mood={loadingMood} size={92} />
              </Animated.View>
              <Text className="mt-4 text-sm font-semibold text-purple-700">
                Cargando bloques...
              </Text>
            </View>
          ) : error ? (
            <View className="rounded-3xl border-2 border-red-200 bg-red-50 p-4">
              <Text className="text-sm font-semibold text-red-700">
                {error}
              </Text>
            </View>
          ) : blocks.length === 0 ? (
            <View className="rounded-3xl border-2 border-purple-200 bg-white p-6">
              <View className="items-center">
                <MochiCharacter mood="sleepy" size={88} />
                <Text className="mt-3 text-center text-sm font-semibold text-purple-600">
                  No hay bloques para este día
                </Text>
              </View>
            </View>
          ) : (
            <View className="rounded-3xl border-2 border-purple-200 bg-white p-4">
              {blocks.map((item, index) => (
                <AnimatedStudyCard
                  key={item.id}
                  block={item}
                  index={index}
                  animationSeed={animationSeed}
                  onDelete={handleDeleteBlock}
                  onEdit={(blockId) =>
                    router.push(`/study-edit?blockId=${blockId}`)
                  }
                />
              ))}
            </View>
          )}
        </ScrollView>

        <Animated.View
          style={fabAnimatedStyle}
          className="absolute bottom-5 right-5"
        >
          <TouchableOpacity
            className="h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-purple-500"
            onPressIn={() => {
              fabScale.value = withSequence(
                withSpring(1.12, { damping: 8, stiffness: 180 }),
                withSpring(1, { damping: 10, stiffness: 180 }),
              );
            }}
            onPress={() => router.push("/study-create")}
          >
            <Ionicons name="add" size={26} color="white" />
          </TouchableOpacity>
        </Animated.View>
      </View>
      {AlertComponent}
    </>
  );
}

export default StudySchedule;
