import { router } from "expo-router";
import { ScrollView, Text, TouchableOpacity } from "react-native";
import { visibleWellnessSections } from "./sections";

type WellnessSubNavProps = { pathname: string; visibility: Record<string, boolean> };

/** Fila de subnavegación entre los módulos de Bienestar (sobre la barra inferior). */
export function WellnessSubNav({ pathname, visibility }: WellnessSubNavProps) {
  const sections = visibleWellnessSections(visibility);
  if (sections.length === 0) return null;

  const items = [{ key: "hub", label: "Resumen", route: "/wellness" }, ...sections];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="max-h-14 border-t border-line bg-canvas"
      contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}
    >
      {items.map((item) => {
        const active = pathname === item.route;
        return (
          <TouchableOpacity
            key={item.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className={`min-h-[40px] justify-center rounded-full border px-4 ${active ? "border-accent bg-accent" : "border-line bg-surface-muted"}`}
            onPress={() => {
              if (!active) router.replace(item.route as never);
            }}
          >
            <Text className={`text-xs font-extrabold ${active ? "text-accent-ink" : "text-ink"}`}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

export default WellnessSubNav;
