import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { getBottomNavPaddingBottom } from "@/src/shared/lib/layout";

export type MobileScreen =
  | "home"
  | "study"
  | "mochi-duo"
  | "exercise"
  | "habits"
  | "cooking";

type BottomNavProps = {
  currentScreen: MobileScreen;
  onNavigate: (screen: MobileScreen) => void;
  visibleTabs?: MobileScreen[];
};

type TabPalette = {
  container: string;
  border: string;
  activeBg: string;
  activeIcon: string;
  inactiveIcon: string;
  activeText: string;
  inactiveText: string;
};

const tabs: Array<{
  id: MobileScreen;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { id: "home", label: "Inicio", icon: "home" },
  { id: "study", label: "Estudio", icon: "book" },
  { id: "mochi-duo", label: "Duo™", icon: "people" },
  { id: "exercise", label: "Ejercicio", icon: "barbell" },
  { id: "habits", label: "Hábitos", icon: "leaf" },
  { id: "cooking", label: "Cocina", icon: "restaurant" },
];

const tabPalettes: Record<MobileScreen, TabPalette> = {
  home: {
    container: "bg-blue-50",
    border: "border-blue-200",
    activeBg: "bg-blue-200",
    activeIcon: "#1d4ed8",
    inactiveIcon: "#93c5fd",
    activeText: "text-blue-800",
    inactiveText: "text-blue-500",
  },
  study: {
    container: "bg-pink-50",
    border: "border-pink-200",
    activeBg: "bg-pink-200",
    activeIcon: "#be185d",
    inactiveIcon: "#f9a8d4",
    activeText: "text-pink-800",
    inactiveText: "text-pink-500",
  },
  "mochi-duo": {
    container: "bg-emerald-50",
    border: "border-emerald-200",
    activeBg: "bg-emerald-200",
    activeIcon: "#047857",
    inactiveIcon: "#6ee7b7",
    activeText: "text-emerald-800",
    inactiveText: "text-emerald-500",
  },
  exercise: {
    container: "bg-teal-50",
    border: "border-teal-200",
    activeBg: "bg-teal-200",
    activeIcon: "#0f766e",
    inactiveIcon: "#99f6e4",
    activeText: "text-teal-800",
    inactiveText: "text-teal-600",
  },
  habits: {
    container: "bg-purple-50",
    border: "border-purple-200",
    activeBg: "bg-purple-200",
    activeIcon: "#7c3aed",
    inactiveIcon: "#c4b5fd",
    activeText: "text-purple-800",
    inactiveText: "text-purple-500",
  },
  cooking: {
    container: "bg-orange-50",
    border: "border-orange-200",
    activeBg: "bg-orange-200",
    activeIcon: "#c2410c",
    inactiveIcon: "#fdba74",
    activeText: "text-orange-800",
    inactiveText: "text-orange-500",
  },
};

type BottomTabItemProps = {
  id: MobileScreen;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  palette: TabPalette;
  onNavigate: (screen: MobileScreen) => void;
};

function BottomTabItem({
  id,
  label,
  icon,
  active,
  palette,
  onNavigate,
}: BottomTabItemProps) {
  const iconScale = useSharedValue(1);
  const hasMounted = useRef(false);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    if (active) {
      iconScale.value = withSequence(
        withTiming(1.15, { duration: 220, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 220, easing: Easing.inOut(Easing.quad) }),
      );
    }
  }, [active, iconScale]);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const isCenterTab = id === "mochi-duo";

  return (
    <TouchableOpacity
      className={`flex-1 items-center justify-center rounded-2xl h-14 ${active ? palette.activeBg : ""}`}
      onPress={() => onNavigate(id)}
    >
      <Animated.View style={iconAnimatedStyle}>
        <Ionicons
          name={icon}
          size={20}
          color={active ? palette.activeIcon : palette.inactiveIcon}
        />
      </Animated.View>
      <Text
        className={`mt-1 text-xs font-bold ${active ? palette.activeText : palette.inactiveText}`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function BottomNav({
  currentScreen,
  onNavigate,
  visibleTabs,
}: BottomNavProps) {
  const insets = useSafeAreaInsets();
  const palette = tabPalettes[currentScreen];
  const filteredTabs = visibleTabs?.length
    ? tabs.filter((tab) => visibleTabs.includes(tab.id))
    : tabs;

  return (
    <View
      className={`px-3 pt-3 ${palette.border} ${palette.container}`}
      style={{ paddingBottom: getBottomNavPaddingBottom(insets.bottom) }}
    >
      <View className="flex-row items-end justify-between gap-1">
        {filteredTabs.map((tab) => (
          <BottomTabItem
            key={tab.id}
            id={tab.id}
            label={tab.label}
            icon={tab.icon}
            active={currentScreen === tab.id}
            palette={palette}
            onNavigate={onNavigate}
          />
        ))}
      </View>
    </View>
  );
}

export default BottomNav;
