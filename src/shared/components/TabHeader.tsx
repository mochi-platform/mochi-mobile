import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

type TabHeaderProps = {
	iconName: keyof typeof Ionicons.glyphMap;
	title: string;
	subtitle: string;
	iconColor: string;
	titleClassName: string;
	subtitleClassName: string;
};

export function TabHeader({
	iconName,
	title,
	subtitle,
	iconColor,
	titleClassName,
	subtitleClassName,
}: TabHeaderProps) {
	return (
		<View className="mb-5 flex-row items-center">
			<Ionicons name={iconName} size={20} color={iconColor} />
			<View className="ml-2 flex-1">
				<Text className={titleClassName}>{title}</Text>
				<Text className={subtitleClassName}>{subtitle}</Text>
			</View>
		</View>
	);
}