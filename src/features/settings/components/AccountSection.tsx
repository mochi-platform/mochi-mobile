import { Text, TouchableOpacity, View } from "react-native";

type AccountSectionProps = {
  onSignOut: () => void;
  onDeleteAccount: () => void;
};

export function AccountSection({ onSignOut, onDeleteAccount }: AccountSectionProps) {
  return (
    <View className="mb-12 mt-6 rounded-3xl border-2 border-blue-200 bg-white p-4 dark:border-blue-800 dark:bg-surface">
      <Text className="text-lg font-extrabold text-blue-900 dark:text-blue-100">Cuenta</Text>

      <TouchableOpacity
        className="mt-4 items-center rounded-2xl bg-red-500 py-3"
        onPress={onSignOut}
      >
        <Text className="font-extrabold text-white">Cerrar sesión</Text>
      </TouchableOpacity>

      <TouchableOpacity
        accessibilityRole="button"
        className="mt-3 min-h-[44px] items-center justify-center rounded-2xl border-2 border-red-300 py-3 dark:border-red-700"
        onPress={onDeleteAccount}
      >
        <Text className="font-extrabold text-red-600 dark:text-red-400">Eliminar mi cuenta</Text>
      </TouchableOpacity>
    </View>
  );
}
