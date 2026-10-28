import { useEffect, useState } from "react";
import { Switch, Text, TouchableOpacity, View } from "react-native";
import { loadQuietHours, saveQuietHours, type QuietHours } from "@/src/features/duo/push";
import { TimePickerModal } from "@/src/shared/components/TimePickerModal";
import { tc } from "@/src/shared/theme/colors";

const hhmm = (h: number) => `${String(h).padStart(2, "0")}:00`;

export function DuoQuietHoursSection() {
  const [quiet, setQuiet] = useState<QuietHours | null>(null);
  const [picking, setPicking] = useState<"start" | "end" | null>(null);

  useEffect(() => {
    void loadQuietHours().then(setQuiet);
  }, []);

  if (!quiet) return null;

  const update = (next: QuietHours) => {
    setQuiet(next);
    void saveQuietHours(next);
  };

  return (
    <View className="mt-3 rounded-2xl border border-pink-100 bg-pink-50 px-3 py-3 dark:border-pink-900 dark:bg-pink-950">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-2">
          <Text className="text-sm font-bold text-pink-900 dark:text-pink-100">
            Silencio de Mochi Duo
          </Text>
          <Text className="mt-0.5 text-xs font-semibold text-pink-500">
            Sin avisos de tu pareja de {hhmm(quiet.start)} a {hhmm(quiet.end)}
          </Text>
        </View>
        <Switch
          value={quiet.enabled}
          onValueChange={(enabled) => update({ ...quiet, enabled })}
          thumbColor={quiet.enabled ? tc("#db2777") : tc("#94a3b8")}
          trackColor={{ false: tc("#cbd5e1"), true: tc("#fbcfe8") }}
        />
      </View>
      {quiet.enabled && (
        <View className="mt-2 flex-row gap-2">
          {(["start", "end"] as const).map((which) => (
            <TouchableOpacity
              key={which}
              className="flex-1 items-center rounded-xl border border-pink-200 bg-white py-2 dark:border-pink-800 dark:bg-surface"
              onPress={() => setPicking(which)}
            >
              <Text className="text-sm font-extrabold text-pink-700 dark:text-pink-300">
                {which === "start" ? "Desde" : "Hasta"}: {hhmm(quiet[which])}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <TimePickerModal
        hoursOnly
        visible={picking !== null}
        time={picking ? hhmm(quiet[picking]) : "00:00"}
        label={picking === "start" ? "Empieza el silencio" : "Termina el silencio"}
        onCancel={() => setPicking(null)}
        onConfirm={(time) => {
          if (picking) update({ ...quiet, [picking]: Number(time.split(":")[0]) });
          setPicking(null);
        }}
      />
    </View>
  );
}
