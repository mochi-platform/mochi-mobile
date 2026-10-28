import { tc } from "@/src/shared/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { getCyclePersonality } from "@/src/shared/lib/cyclePersonality";
import type { CyclePhaseData } from "@/src/shared/lib/healthConnect";

interface CycleWidgetProps {
  cycleData: CyclePhaseData | null;
  isAvailable: boolean;
  hasPermission: boolean;
  onRequestPermission: () => Promise<void>;
  onDismissPrompt?: () => void;
  onLogPeriod?: () => Promise<void>;
}

function buildPhaseProgress(dayOfCycle: number, cycleLength: number): number {
  if (cycleLength <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((dayOfCycle / cycleLength) * 100)));
}

export function CycleWidget({
  cycleData,
  isAvailable,
  hasPermission,
  onRequestPermission,
  onDismissPrompt,
  onLogPeriod,
}: CycleWidgetProps) {
  const logPeriodButton = onLogPeriod ? (
    <TouchableOpacity
      accessibilityRole="button"
      className="mt-3 min-h-[44px] items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 dark:border-rose-800 dark:bg-rose-950"
      onPress={() => {
        void onLogPeriod();
      }}
    >
      <Text className="text-xs font-extrabold text-rose-700 dark:text-rose-300">Me llegó hoy</Text>
    </TouchableOpacity>
  ) : null;

  if (!cycleData && hasPermission) return null;

  if (!hasPermission) {
    return (
      <View className="mt-4 rounded-3xl border-2 border-violet-200 bg-white p-4 dark:border-violet-800 dark:bg-surface">
        <View className="flex-row items-start">
          <View className="h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 dark:bg-violet-900">
            <Ionicons name="medical" size={18} color={tc("#7c3aed")} />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-sm font-extrabold text-violet-900 dark:text-violet-100">
              Conecta Flo o tu app de ciclo
            </Text>
            <Text className="mt-1 text-xs font-semibold text-violet-700 dark:text-violet-300">
              {isAvailable
                ? "Activa Health Connect para que Mochi adapte sus recomendaciones a tu fase."
                : "Health Connect no esta disponible en este dispositivo o requiere actualizacion."}
            </Text>
          </View>
        </View>
        <View className="mt-3 flex-row items-center gap-2">
          <TouchableOpacity
            className={`rounded-2xl border px-4 py-2 ${isAvailable ? "border-violet-300 bg-violet-100 dark:border-violet-700 dark:bg-violet-900" : "border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-900"}`}
            disabled={!isAvailable}
            onPress={() => {
              void onRequestPermission();
            }}
          >
            <Text
              className={`text-xs font-extrabold ${isAvailable ? "text-violet-800 dark:text-violet-200" : "text-slate-500"}`}
            >
              {isAvailable ? "Conectar ahora" : "No disponible"}
            </Text>
          </TouchableOpacity>

          {isAvailable && onDismissPrompt && (
            <TouchableOpacity
              className="rounded-2xl border border-slate-300 bg-slate-100 px-4 py-2 dark:border-slate-700 dark:bg-slate-900"
              onPress={onDismissPrompt}
            >
              <Text className="text-xs font-extrabold text-slate-600 dark:text-slate-400">
                No mostrar en inicio
              </Text>
            </TouchableOpacity>
          )}
        </View>
        {logPeriodButton}
      </View>
    );
  }

  if (!cycleData) return null;

  const personality = getCyclePersonality(cycleData.phase);
  const progress = buildPhaseProgress(cycleData.dayOfCycle, cycleData.cycleLength);
  const progressColor = personality.phaseColor;

  return (
    <View className="mt-4 rounded-3xl border-2 border-violet-200 bg-white p-4 dark:border-violet-800 dark:bg-surface">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <View
            className={`self-start rounded-full border px-3 py-1 ${personality.phaseBadgeClass}`}
          >
            <View className="flex-row items-center">
              <Ionicons name={personality.phaseIconName} size={12} color={tc("#334155")} />
              <Text className="ml-1 text-xs font-extrabold text-slate-700 dark:text-slate-300">
                {personality.phaseLabel}
              </Text>
            </View>
          </View>

          <Text className="mt-3 text-sm font-extrabold text-violet-900 dark:text-violet-100">
            Día {cycleData.dayOfCycle} de tu ciclo
          </Text>

          <View className="mt-3 h-2 w-full overflow-hidden rounded-full bg-violet-100 dark:bg-violet-900">
            <View
              className="h-2 rounded-full"
              style={{ width: `${progress}%`, backgroundColor: progressColor }}
            />
          </View>

          <Text className="mt-2 text-xs font-semibold text-violet-700 dark:text-violet-300">
            {cycleData.daysUntilNextPeriod <= 2
              ? "Tu período comienza pronto"
              : `Próxima menstruación en ${cycleData.daysUntilNextPeriod} días`}
          </Text>
        </View>

        <MochiCharacter mood={personality.mochiMood} size={58} />
      </View>

      <View className="mt-3 rounded-2xl border border-violet-100 bg-violet-50 p-3 dark:border-violet-900 dark:bg-violet-950">
        <Text className="text-xs font-semibold text-violet-800 dark:text-violet-200">
          {personality.generalNote}
        </Text>
      </View>
      {logPeriodButton}
    </View>
  );
}

export default CycleWidget;
