import { Text, TouchableOpacity, View } from "react-native";
import { formatCycleSync } from "../helpers";

type HealthSectionProps = {
  healthAvailable: boolean;
  healthPermission: boolean;
  healthSyncing: boolean;
  lastCycleSync: string | null;
  onConnectHealth: () => Promise<void>;
  onRevokeHealth: () => Promise<void>;
};

export function HealthSection({
  healthAvailable,
  healthPermission,
  healthSyncing,
  lastCycleSync,
  onConnectHealth,
  onRevokeHealth,
}: HealthSectionProps) {
  const formattedCycleSync = formatCycleSync(lastCycleSync);

  return (
    <View className="mt-6 rounded-3xl border-2 border-rose-200 bg-white p-4 dark:border-rose-800 dark:bg-surface">
      <Text className="text-lg font-extrabold text-rose-900 dark:text-rose-100">
        Datos de salud
      </Text>
      <Text className="mt-2 text-sm font-semibold text-rose-700 dark:text-rose-300">
        Conecta Health Connect para que Mochi conozca tu ciclo menstrual
      </Text>

      {healthAvailable ? (
        <>
          <View className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 dark:border-rose-800 dark:bg-rose-950">
            <Text className="text-xs font-bold text-rose-800 dark:text-rose-200">
              Estado del permiso
            </Text>
            <Text className="mt-1 text-sm font-semibold text-rose-700 dark:text-rose-300">
              {healthPermission ? "Concedido" : "No concedido"}
            </Text>
            <Text className="mt-2 text-xs font-semibold text-rose-700 dark:text-rose-300">
              Última sincronización: {formattedCycleSync}
            </Text>
          </View>

          <TouchableOpacity
            className={`mt-4 items-center rounded-2xl py-3 ${healthSyncing ? "bg-rose-300 dark:bg-rose-700" : "bg-rose-500"}`}
            onPress={() => {
              if (healthPermission) {
                void onRevokeHealth();
              } else {
                void onConnectHealth();
              }
            }}
            disabled={healthSyncing}
          >
            <Text className="font-extrabold text-white">
              {healthSyncing ? "Actualizando..." : healthPermission ? "Revocar" : "Conectar"}
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <View className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 dark:border-amber-800 dark:bg-amber-950">
          <Text className="text-xs font-semibold text-amber-800 dark:text-amber-200">
            No disponible en este dispositivo. Requiere Android 14+ o Health Connect instalado.
          </Text>
        </View>
      )}
    </View>
  );
}
