import { View } from "react-native";
import { Button, Surface, Title } from "@/src/shared/ui";

type AccountSectionProps = {
  onSignOut: () => void;
  onDeleteAccount: () => void;
};

export function AccountSection({ onSignOut, onDeleteAccount }: AccountSectionProps) {
  return (
    <Surface className="mb-12 mt-6 p-4">
      <Title className="mb-3">Cuenta</Title>
      <View className="gap-2">
        <Button title="Cerrar sesión" variant="outline" onPress={onSignOut} />
        <Button title="Eliminar mi cuenta" variant="danger" onPress={onDeleteAccount} />
      </View>
    </Surface>
  );
}
