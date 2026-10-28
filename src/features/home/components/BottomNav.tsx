import { tc } from "@/src/shared/theme/colors";
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

export type MobileScreen = "home" | "study" | "wellness" | "mochi-duo" | "profile";

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

const tabs: {
  id: MobileScreen;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { id: "home", label: "Hoy", icon: "home" },
  { id: "study", label: "Estudio", icon: "book" },
  { id: "wellness", label: "Bienestar", icon: "leaf" },
  { id: "mochi-duo", label: "Duo™", icon: "people" },
  { id: "profile", label: "Perfil", icon: "person" },
];

const tabPalettes: Record<MobileScreen, TabPalette> = {
  home: {
    container: "bg-blue-50 dark:bg-blue-950",
    border: "border-blue-200 dark:border-blue-800",
    activeBg: "bg-blue-200 dark:bg-blue-800",
    activeIcon: tc("#1d4ed8"),
    inactiveIcon: tc("#93c5fd"),
    activeText: "text-blue-800 dark:text-blue-200",
    inactiveText: "text-blue-500",
  },
  study: {
    container: "bg-pink-50 dark:bg-pink-950",
    border: "border-pink-200 dark:border-pink-800",
    activeBg: "bg-pink-200 dark:bg-pink-800",
    activeIcon: tc("#be185d"),
    inactiveIcon: tc("#f9a8d4"),
    activeText: "text-pink-800 dark:text-pink-200",
    inactiveText: "text-pink-500",
  },
  "mochi-duo": {
    container: "bg-emerald-50 dark:bg-emerald-950",
    border: "border-emerald-200 dark:border-emerald-800",
    activeBg: "bg-emerald-200 dark:bg-emerald-800",
    activeIcon: tc("#047857"),
    inactiveIcon: tc("#6ee7b7"),
    activeText: "text-emerald-800 dark:text-emerald-200",
    inactiveText: "text-emerald-500",
  },
  wellness: {
    container: "bg-teal-50 dark:bg-teal-950",
    border: "border-teal-200 dark:border-teal-800",
    activeBg: "bg-teal-200 dark:bg-teal-800",
    activeIcon: tc("#0f766e"),
    inactiveIcon: tc("#99f6e4"),
    activeText: "text-teal-800 dark:text-teal-200",
    inactiveText: "text-teal-600 dark:text-teal-400",
  },
  profile: {
    container: "bg-purple-50 dark:bg-purple-950",
    border: "border-purple-200 dark:border-purple-800",
    activeBg: "bg-purple-200 dark:bg-purple-800",
    activeIcon: tc("#7c3aed"),
    inactiveIcon: tc("#c4b5fd"),
    activeText: "text-purple-800 dark:text-purple-200",
    inactiveText: "text-purple-500",
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

function BottomTabItem({ id, label, icon, active, palette, onNavigate }: BottomTabItemProps) {
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
      className={`h-14 flex-1 items-center justify-center rounded-2xl ${active ? palette.activeBg : ""}`}
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

export function BottomNav({ currentScreen, onNavigate, visibleTabs }: BottomNavProps) {
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
