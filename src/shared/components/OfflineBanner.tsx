import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => NetInfo.addEventListener((state) => setOffline(state.isConnected === false)), []);

  if (!offline) return null;
  return (
    <View
      accessibilityRole="alert"
      className="absolute left-0 right-0 top-0 z-50 bg-tint-kitchen px-4 py-1.5"
    >
      <Text className="text-center text-xs font-bold text-ink">
        Sin conexión · verás lo último que guardamos
      </Text>
    </View>
  );
}
