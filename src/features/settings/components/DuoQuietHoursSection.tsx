import { useEffect, useState } from "react";
import { View } from "react-native";
import { loadQuietHours, saveQuietHours, type QuietHours } from "@/src/features/duo/push";
import { TimePickerModal } from "@/src/shared/components/TimePickerModal";
import { Button, Surface, Toggle } from "@/src/shared/ui";

const hhmm = (h: number) => `${String(h).padStart(2, "0")}:00`;

/** Horas en que no llegan avisos de la pareja. */
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
    <Surface tone="sunken" className="mt-3 px-3 py-2">
      <Toggle
        label="Silencio de Duo"
        description={`Sin avisos de tu pareja de ${hhmm(quiet.start)} a ${hhmm(quiet.end)}`}
        value={quiet.enabled}
        onValueChange={(enabled) => update({ ...quiet, enabled })}
      />
      {quiet.enabled ? (
        <View className="mb-1 mt-1 flex-row gap-2">
          {(["start", "end"] as const).map((which) => (
            <View key={which} className="flex-1">
              <Button
                title={`${which === "start" ? "Desde" : "Hasta"} ${hhmm(quiet[which])}`}
                variant="outline"
                onPress={() => setPicking(which)}
              />
            </View>
          ))}
        </View>
      ) : null}
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
    </Surface>
  );
}
