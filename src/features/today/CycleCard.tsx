import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { useCycle } from "@/src/core/providers/CycleContext";
import { useAccent } from "@/src/core/providers/ThemeContext";
import { energyProfileFromPhase } from "@/src/shared/lib/ai";
import { openHealthConnectSettingsScreen } from "@/src/shared/lib/healthConnect";
import { reportError } from "@/src/shared/lib/observability/reportError";
import { Button, Caption, Eyebrow, ProgressRing, Surface, Title, haptic } from "@/src/shared/ui";

const ENERGY_COPY = {
  baja: { title: "Energía baja", hint: "Ve suave hoy. Lo pequeño también cuenta." },
  media: { title: "Energía media", hint: "Buen día para avanzar a tu ritmo." },
  alta: { title: "Energía alta", hint: "Buen momento para lo difícil." },
} as const;

/**
 * Ciclo en Hoy: siempre visible. Sin datos invita a registrar con «Me llegó hoy» (manual, sin
 * Health Connect); con datos muestra el día, la energía y cuándo llegaría el próximo periodo.
 */
export function CycleCard() {
  const {
    cycleData,
    isAvailable,
    hasPermission,
    logPeriodToday,
    loggedToday,
    undoPeriodToday,
    requestPermission,
  } = useCycle();

  const connectHealth = async () => {
    const result = await requestPermission();
    if (result === "granted") return;
    Alert.alert(
      "No se pudo conectar",
      result === "unavailable"
        ? "Health Connect no está disponible o no está activado en este teléfono."
        : "No se concedió el permiso de menstruación. Puedes dárselo a Mochi desde Health Connect.",
      [
        { text: "Abrir Health Connect", onPress: () => void openHealthConnectSettingsScreen() },
        { text: "Cerrar", style: "cancel" },
      ],
    );
  };
  const [saving, setSaving] = useState(false);
  const accent = useAccent();
  const logToday = async () => {
    setSaving(true);
    try {
      if (loggedToday) {
        await undoPeriodToday();
        haptic("selection");
      } else {
        await logPeriodToday();
        haptic("success");
      }
    } catch (error) {
      reportError(error, { scope: "today/cycle-log" });
    } finally {
      setSaving(false);
    }
  };

  const logButton = (
    <Button
      title={loggedToday ? "Deshacer registro" : "Me llegó hoy"}
      variant={loggedToday ? "ghost" : "soft"}
      loading={saving}
      onPress={() => void logToday()}
    />
  );

  if (!cycleData) {
    return (
      <Surface className="mt-4 p-[18px]">
        <Eyebrow>Tu ciclo</Eyebrow>
        <Title className="mt-1">Empieza a registrarlo</Title>
        <Caption className="mt-1">
          Toca «Me llegó hoy» el primer día de tu periodo y Mochi adaptará sus sugerencias a tu
          energía. Solo se guarda en tu teléfono.
        </Caption>
        <View className="mt-3.5 gap-2">
          {logButton}
          {isAvailable && !hasPermission ? (
            <Button
              title="Conectar Flo o mi app de ciclo"
              variant="ghost"
              onPress={() => void connectHealth()}
            />
          ) : null}
        </View>
      </Surface>
    );
  }

  const energy = energyProfileFromPhase(cycleData.phase) ?? "media";
  const copy = ENERGY_COPY[energy];
  const next = cycleData.daysUntilNextPeriod;
  return (
    <Surface className="mt-4 flex-row items-center gap-4 p-[18px]">
      <ProgressRing
        progress={cycleData.cycleLength > 0 ? cycleData.dayOfCycle / cycleData.cycleLength : 0}
        size={92}
        stroke={10}
        color={accent.accent}
        accessibilityLabel={`Día ${cycleData.dayOfCycle} de ${cycleData.cycleLength}`}
      >
        <Text className="font-display text-2xl text-ink">{cycleData.dayOfCycle}</Text>
        <Caption className="-mt-1 text-[11px]">de {cycleData.cycleLength}</Caption>
      </ProgressRing>
      <View className="min-w-0 flex-1">
        <Eyebrow>Tu ciclo</Eyebrow>
        <Title className="mt-1">{copy.title}</Title>
        <Caption className="mt-1">
          {copy.hint}{" "}
          {next <= 2 ? "Tu periodo podría llegar pronto." : `Llegaría en unos ${next} días.`}
        </Caption>
        <View className="mt-2.5 self-start">{logButton}</View>
      </View>
    </Surface>
  );
}
