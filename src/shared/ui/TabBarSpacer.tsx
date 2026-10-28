import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getTabBarClearance } from "@/src/shared/lib/layout";

/** Espacio al final de una pantalla con pestañas para que nada quede bajo la barra flotante. */
export function TabBarSpacer() {
  const insets = useSafeAreaInsets();
  return <View style={{ height: getTabBarClearance(insets.bottom) }} />;
}
