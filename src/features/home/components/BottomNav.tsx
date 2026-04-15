import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

export type MobileScreen = "home" | "study" | "exercise" | "habits" | "cooking";

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
  { id: "exercise", label: "Ejercicio", icon: "barbell" },
  { id: "habits", label: "Hábitos", icon: "leaf" },
  { id: "cooking", label: "Cocina", icon: "restaurant" },
];

const tabPalettes: Record<MobileScreen, TabPalette> = {
  home: {
    container: "bg-purple-50",
    border: "border-purple-200",
    activeBg: "bg-purple-200",
    activeIcon: "#7e22ce",
    inactiveIcon: "#c4b5fd",
    activeText: "text-purple-800",
    inactiveText: "text-purple-500",
  },
  study: {
    container: "bg-purple-50",
    border: "border-purple-200",
    activeBg: "bg-purple-200",
    activeIcon: "#6b21a8",
    inactiveIcon: "#c4b5fd",
    activeText: "text-purple-800",
    inactiveText: "text-purple-500",
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

  return (
    <TouchableOpacity
      className={`h-14 w-16 items-center justify-center rounded-2xl ${active ? palette.activeBg : ""}`}
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
  const palette = tabPalettes[currentScreen];
  const filteredTabs = visibleTabs?.length
    ? tabs.filter((tab) => visibleTabs.includes(tab.id))
    : tabs;

  return (
    <View
      className={`border-t px-3 pb-6 pt-3 ${palette.border} ${palette.container}`}
    >
      <View className="flex-row items-center justify-between">
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
