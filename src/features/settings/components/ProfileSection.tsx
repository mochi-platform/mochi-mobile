import type { Dispatch, SetStateAction } from "react";
import { Text } from "react-native";
import { Button, Input, PressableScale, Surface, Title } from "@/src/shared/ui";
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
  // Postgres guarda «08:00:00»; se muestra como «08:00».
  const wakeUp = (profile.wake_up_time || "06:00").slice(0, 5);
  return (
    <Surface className="mt-6 p-4">
      <Title className="mb-3">Perfil</Title>
      <Input
        label="Tu nombre"
        placeholder="Tu nombre"
        value={profile.full_name ?? ""}
        onChangeText={(value) => setProfile((prev) => ({ ...prev, full_name: value }))}
      />
      <Input
        label="Nombre de tu Mochi"
        placeholder="Mochi"
        value={profile.mochi_name ?? ""}
        onChangeText={(value) => setProfile((prev) => ({ ...prev, mochi_name: value }))}
      />
      <Text className="mb-1.5 ml-1 font-body-bold text-sm text-ink">Hora de despertar</Text>
      <PressableScale
        haptics="selection"
        onPress={onOpenTimePicker}
        accessibilityLabel={`Hora de despertar: ${wakeUp}`}
        className="mb-4 min-h-[52px] items-center justify-center rounded-control bg-surface-muted"
      >
        <Text className="font-display text-xl text-ink">{wakeUp}</Text>
      </PressableScale>
      <Button title="Guardar perfil" loading={savingProfile} onPress={() => void onSaveProfile()} />
    </Surface>
  );
}
