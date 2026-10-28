import { Switch, Text, View } from "react-native";

type CyclePrivacySectionProps = {
  cycleConsent: boolean;
  onToggleCycleConsent: (value: boolean) => Promise<void>;
};

export function CyclePrivacySection({
  cycleConsent,
  onToggleCycleConsent,
}: CyclePrivacySectionProps) {
  return (
    <View className="mt-6 rounded-3xl border-2 border-rose-200 bg-white p-4 dark:border-rose-800 dark:bg-surface">
      <Text className="text-lg font-extrabold text-rose-900 dark:text-rose-100">
        Privacidad de tu ciclo
      </Text>
      <Text className="mt-2 text-sm font-semibold text-rose-700 dark:text-rose-300">
        Tu ciclo se calcula en tu teléfono y no se envía a la IA. Si lo activas, Mochi guarda en su
        servidor solo la fecha de inicio y la duración de tu ciclo, para que tu pareja pueda ver tu
        fase únicamente si tú se lo permites en Duo.
      </Text>
      <View className="mt-3 flex-row items-center justify-between">
        <Text className="flex-1 pr-3 text-sm font-bold text-rose-900 dark:text-rose-100">
          Guardar resumen de mi ciclo en Mochi
        </Text>
        <Switch
          accessibilityLabel="Guardar resumen de mi ciclo en Mochi"
          value={cycleConsent}
          onValueChange={(value) => void onToggleCycleConsent(value)}
        />
      </View>
      <Text className="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-400">
        Puedes desactivarlo cuando quieras: se borran esos datos del servidor. Mochi no es un
        dispositivo médico ni sirve como anticonceptivo.
      </Text>
    </View>
  );
}
