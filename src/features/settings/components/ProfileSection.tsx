import type { Dispatch, SetStateAction } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { tc } from "@/src/shared/theme/colors";
import type { ProfileSettings } from "../types";

type ProfileSectionProps = {
  profile: ProfileSettings;
  setProfile: Dispatch<SetStateAction<ProfileSettings>>;
  savingProfile: boolean;
  onSaveProfile: () => Promise<void>;
  onOpenTimePicker: () => void;
};

export function ProfileSection({
  profile,
  setProfile,
  savingProfile,
  onSaveProfile,
  onOpenTimePicker,
}: ProfileSectionProps) {
  return (
    <View className="mt-6 rounded-3xl border-2 border-blue-200 bg-white p-4 dark:border-blue-800 dark:bg-surface">
      <Text className="text-lg font-extrabold text-blue-900 dark:text-blue-100">Perfil</Text>

      <View className="mt-4">
        <Text className="mb-2 text-sm font-bold text-blue-900 dark:text-blue-100">Nombre</Text>
        <TextInput
          className="rounded-2xl border-2 border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-slate-800 dark:border-blue-800 dark:bg-blue-950 dark:text-slate-200"
          placeholder="Tu nombre"
          placeholderTextColor={tc("#3b82f6")}
          value={profile.full_name ?? ""}
          onChangeText={(value) => setProfile((prev) => ({ ...prev, full_name: value }))}
        />
      </View>

      <View className="mt-4">
        <Text className="mb-2 text-sm font-bold text-blue-900 dark:text-blue-100">
          Nombre de tu Mochi
        </Text>
        <TextInput
          className="rounded-2xl border-2 border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-slate-800 dark:border-blue-800 dark:bg-blue-950 dark:text-slate-200"
          placeholder="Mochi"
          placeholderTextColor={tc("#3b82f6")}
          value={profile.mochi_name ?? ""}
          onChangeText={(value) => setProfile((prev) => ({ ...prev, mochi_name: value }))}
        />
      </View>

      <View className="mt-4">
        <Text className="mb-2 text-sm font-bold text-blue-900 dark:text-blue-100">
          Hora de despertar
        </Text>
        <TouchableOpacity
          className="rounded-2xl border-2 border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-950"
          onPress={onOpenTimePicker}
        >
          <Text className="text-center text-lg font-extrabold text-blue-900 dark:text-blue-100">
            {profile.wake_up_time || "06:00"}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        className="mt-5 items-center rounded-2xl bg-blue-600 py-3"
        onPress={() => void onSaveProfile()}
        disabled={savingProfile}
      >
        <Text className="font-extrabold text-white">
          {savingProfile ? "Guardando..." : "Guardar perfil"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
