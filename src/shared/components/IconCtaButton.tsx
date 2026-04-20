import { Ionicons } from "@expo/vector-icons";
import { ReactNode } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

type IconCtaButtonProps = {
  label: string;
  onPress: () => void;
  iconName?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconSize?: number;
  icon?: ReactNode;
  trailingIconName?: keyof typeof Ionicons.glyphMap;
  trailingIconColor?: string;
  trailingIconSize?: number;
  trailingIcon?: ReactNode;
  containerClassName?: string;
  contentClassName?: string;
  textClassName?: string;
  iconContainerClassName?: string;
  disabled?: boolean;
  loading?: boolean;
  loadingColor?: string;
  activeOpacity?: number;
};

export function IconCtaButton({
  label,
  onPress,
  iconName,
  iconColor = "#0f172a",
  iconSize = 14,
  icon,
  trailingIconName,
  trailingIconColor = "#0f172a",
  trailingIconSize = 14,
  trailingIcon,
  containerClassName = "",
  contentClassName = "",
  textClassName = "",
  iconContainerClassName = "",
  disabled = false,
  loading = false,
  loadingColor = "#0f172a",
  activeOpacity = 0.85,
}: IconCtaButtonProps) {
  const leftIconNode =
    icon ??
    (iconName ? <Ionicons name={iconName} size={iconSize} color={iconColor} /> : null);

  const rightIconNode =
    trailingIcon ??
    (trailingIconName ? (
      <Ionicons
        name={trailingIconName}
        size={trailingIconSize}
        color={trailingIconColor}
      />
    ) : null);

  return (
    <TouchableOpacity
      className={`min-h-11 rounded-full px-4 py-2 ${containerClassName}`}
      onPress={onPress}
      activeOpacity={activeOpacity}
      disabled={disabled || loading}
    >
      {loading ? (
        <View className="min-h-6 items-center justify-center">
          <ActivityIndicator size="small" color={loadingColor} />
        </View>
      ) : (
        <View
          className={`max-w-full flex-row items-center justify-center ${contentClassName}`}
        >
          {leftIconNode ? (
            <View className={iconContainerClassName}>{leftIconNode}</View>
          ) : null}
          <Text
            className={`shrink text-center text-sm font-bold ${leftIconNode ? "ml-1.5" : ""} ${rightIconNode ? "mr-1.5" : ""} ${textClassName}`}
          >
            {label}
          </Text>
          {rightIconNode ? <View>{rightIconNode}</View> : null}
        </View>
      )}
    </TouchableOpacity>
  );
}
