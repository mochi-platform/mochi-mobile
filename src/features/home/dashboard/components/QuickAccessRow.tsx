import { Ionicons } from "@expo/vector-icons";
import { ScrollView, TouchableOpacity } from "react-native";
import type { QuickAccessItem } from "@/src/features/home/dashboard/types";

type QuickAccessRowProps = {
  items: QuickAccessItem[];
  onPressItem: (route: QuickAccessItem["route"]) => void;
};

export function QuickAccessRow({ items, onPressItem }: QuickAccessRowProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="mt-4"
      contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
    >
      {items.map((item) => (
        <TouchableOpacity
          key={item.route}
          className={`mr-3 h-14 w-14 items-center justify-center rounded-2xl border-2 ${item.cardClass}`}
          onPress={() => onPressItem(item.route)}
          accessibilityRole="button"
          accessibilityLabel={item.label}
        >
          <Ionicons name={item.icon} size={22} color={item.iconColor} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
