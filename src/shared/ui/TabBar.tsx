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
        className="flex-row items-center justify-around rounded-[26px] bg-surface px-1.5"
        style={[ELEVATION[3], { height: TAB_BAR_HEIGHT }]}
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
              onPress={() => {
                if (!on) onSelect(tab);
              }}
              className="min-w-[60px] items-center gap-0.5"
            >
              <View className={`rounded-[14px] px-4 py-1 ${on ? "bg-accent-soft" : ""}`}>
                <Ionicons
                  name={(on ? tab.icon : `${tab.icon}-outline`) as keyof typeof Ionicons.glyphMap}
                  size={23}
                  color={on ? accent.strong : COLORS.inkFaint}
                />
              </View>
              <Text
                className={`font-body-extrabold text-[11.5px] ${on ? "text-accent-strong" : "text-ink-muted"}`}
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
