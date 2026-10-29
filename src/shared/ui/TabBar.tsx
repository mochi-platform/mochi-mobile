import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { TabDef, TabKey } from "@/src/features/navigation/tabs";
import { TAB_BAR_HEIGHT, TAB_BAR_MARGIN_BOTTOM } from "@/src/shared/lib/layout";
import { useAccent } from "@/src/core/providers/ThemeContext";
import { COLORS } from "@/src/shared/theme/tokens";
import { ELEVATION } from "./elevation";
import { PressableScale } from "./PressableScale";

type TabBarProps = {
  tabs: TabDef[];
  active: TabKey;
  onSelect: (tab: TabDef) => void;
};

/** Barra inferior flotante: crema, un solo acento y sin cambiar de color por pestaña. */
export function TabBar({ tabs, active, onSelect }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const accent = useAccent();
  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0 bottom-0 px-3.5"
      style={{ paddingBottom: insets.bottom + TAB_BAR_MARGIN_BOTTOM }}
    >
      <View
        accessibilityRole="tablist"
        className="flex-row items-stretch bg-surface px-1.5"
        style={[ELEVATION[3], { height: TAB_BAR_HEIGHT, borderRadius: 26 }]}
      >
        {tabs.map((tab) => {
          const on = tab.key === active;
          return (
            <PressableScale
              key={tab.key}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: on }}
              haptics="selection"
              onPress={() => onSelect(tab)}
              className="flex-1 items-center justify-center gap-0.5"
            >
              <View className="items-center justify-center px-4 py-1">
                {/* La píldora siempre tiene fondo y solo cambia su opacidad: en Android, una vista que
                    empieza transparente pierde el radio al recibir color después. */}
                <View
                  pointerEvents="none"
                  className="absolute inset-0"
                  style={{ borderRadius: 14, backgroundColor: accent.soft, opacity: on ? 1 : 0 }}
                />
                <Ionicons
                  name={(on ? tab.icon : `${tab.icon}-outline`) as keyof typeof Ionicons.glyphMap}
                  size={23}
                  color={on ? accent.strong : COLORS.inkFaint}
                />
              </View>
              <Text
                className="font-body-extrabold text-[11.5px]"
                style={{ color: on ? accent.strong : COLORS.inkMuted }}
              >
                {tab.label}
              </Text>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}
