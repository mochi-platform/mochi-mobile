import type { Ionicons } from "@expo/vector-icons";

export type HabitNotificationTarget = {
  id: string;
  name: string;
};

export type ProfileSettings = {
  full_name: string | null;
  mochi_name: string | null;
  wake_up_time: string | null;
};

export type PlanInfo = {
  planKey: "free" | "premium";
  status: string | null;
  periodEndsAt: string | null;
};

export type ModuleToggleKey =
  | "partner_features_enabled"
  | "quick_capture_enabled"
  | "study_enabled"
  | "exercise_enabled"
  | "habits_enabled"
  | "goals_enabled"
  | "mood_enabled"
  | "gratitude_enabled"
  | "vouchers_enabled"
  | "cooking_enabled";

export type ModuleSettings = {
  partner_features_enabled: boolean;
  quick_capture_enabled: boolean;
  study_enabled: boolean;
  exercise_enabled: boolean;
  habits_enabled: boolean;
  goals_enabled: boolean;
  mood_enabled: boolean;
  gratitude_enabled: boolean;
  vouchers_enabled: boolean;
  cooking_enabled: boolean;
};

export type ModuleItem = {
  key: ModuleToggleKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export type RewardedAdInstance = import("react-native-google-mobile-ads").RewardedAd;

export const TEST_REWARDED_AD_UNIT_ID_ANDROID = "ca-app-pub-3940256099942544/5224354917";
export const TEST_REWARDED_AD_UNIT_ID_IOS = "ca-app-pub-3940256099942544/1712485313";
