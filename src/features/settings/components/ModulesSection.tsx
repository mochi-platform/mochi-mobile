import { Ionicons } from "@expo/vector-icons";
import { Switch, Text, View } from "react-native";
import { tc } from "@/src/shared/theme/colors";
import { moduleItems } from "../helpers";
import type { ModuleSettings, ModuleToggleKey } from "../types";

type ModulesSectionProps = {
  moduleSettings: ModuleSettings;
  onToggleModule: (key: ModuleToggleKey, value: boolean) => Promise<void>;
};

export function ModulesSection({ moduleSettings, onToggleModule }: ModulesSectionProps) {
  return (
    <View className="mt-6 rounded-3xl border-2 border-blue-200 bg-white p-4 dark:border-blue-800 dark:bg-surface">
      <Text className="text-lg font-extrabold text-blue-900 dark:text-blue-100">Módulos</Text>

      <View className="mt-4">
        {moduleItems.map((module) => (
          <View
            key={module.key}
            className="mb-3 flex-row items-center justify-between rounded-2xl border border-blue-200 bg-blue-50 px-3 py-3 dark:border-blue-800 dark:bg-blue-950"
          >
            <View className="flex-row items-center">
              <Ionicons name={module.icon} size={18} color={tc("#1d4ed8")} />
              <Text className="ml-2 text-sm font-bold text-blue-900 dark:text-blue-100">
                {module.label}
              </Text>
            </View>
            <Switch
              value={moduleSettings[module.key]}
              onValueChange={(nextValue) => {
                void onToggleModule(module.key, nextValue);
              }}
              thumbColor={moduleSettings[module.key] ? tc("#1d4ed8") : tc("#94a3b8")}
              trackColor={{ false: tc("#cbd5e1"), true: tc("#bfdbfe") }}
            />
          </View>
        ))}
      </View>

      <View className="rounded-2xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
        <Text className="text-xs font-semibold text-blue-700 dark:text-blue-300">
          Los módulos desactivados se ocultarán del perfil.
        </Text>
      </View>
    </View>
  );
}
