import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { useCycleRecommendation } from "@/src/shared/hooks/useCycleRecommendation";

interface MochiCycleTipProps {
  context: "study" | "exercise" | "cooking" | "habit" | "mood" | "general";
  style?: "banner" | "inline" | "card";
  dismissible?: boolean;
  storageKey?: string;
}

const styleClassMap: Record<
  NonNullable<MochiCycleTipProps["style"]>,
  string
> = {
  banner: "rounded-2xl border px-3 py-3 flex-row items-center",
  inline: "rounded-2xl border px-3 py-2 flex-row items-center",
  card: "rounded-3xl border px-4 py-4",
};

export function MochiCycleTip({
  context,
  style = "banner",
  dismissible = false,
  storageKey,
}: MochiCycleTipProps) {
  const { tip, personality } = useCycleRecommendation(context);
  const [dismissed, setDismissed] = useState(false);
  const [loadedPreference, setLoadedPreference] = useState(
    !dismissible || !storageKey,
  );

  useEffect(() => {
    if (!dismissible || !storageKey) return;
    const key = storageKey;

    let mounted = true;
    async function loadPreference() {
      try {
        const stored = await AsyncStorage.getItem(key);
        if (mounted && stored === "1") {
          setDismissed(true);
        }
      } finally {
        if (mounted) {
          setLoadedPreference(true);
        }
      }
    }

    void loadPreference();
    return () => {
      mounted = false;
    };
  }, [dismissible, storageKey]);

  const className = useMemo(() => {
    if (!personality) return "";
    return `${styleClassMap[style]} ${personality.phaseBadgeClass}`;
  }, [personality, style]);

  if (!tip || !personality) return null;
  if (dismissed) return null;
  if (!loadedPreference) return null;

  const handleDismiss = async () => {
    setDismissed(true);

    if (dismissible && storageKey) {
      try {
        await AsyncStorage.setItem(storageKey, "1");
      } catch {
        // No interrumpimos la experiencia si AsyncStorage falla.
      }
    }
  };

  return (
    <Animated.View entering={FadeInDown.duration(350)} className={className}>
      <MochiCharacter
        mood={personality.mochiMood}
        size={style === "inline" ? 40 : 48}
      />
      <View className="ml-2 flex-1">
        <Text className="text-xs font-extrabold text-slate-800">
          {personality.phaseLabel}
        </Text>
        <Text className="mt-0.5 text-xs font-semibold text-slate-700">
          {tip}
        </Text>
      </View>
      {dismissible && (
        <TouchableOpacity
          onPress={() => void handleDismiss()}
          className="ml-2 rounded-full bg-white/80 p-1.5"
        >
          <Ionicons name="close" size={14} color="#334155" />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

export default MochiCycleTip;
