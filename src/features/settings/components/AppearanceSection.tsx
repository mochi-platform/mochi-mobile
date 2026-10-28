import { router } from "expo-router";
import { Text, View } from "react-native";
import { useTheme } from "@/src/core/providers/ThemeContext";
import { Card, Chip } from "@/src/shared/ui";
import { THEMES } from "@/src/shared/theme/themes";

/** Temas de color. Solo el tema Lavanda es gratuito; el resto es Premium. */
export function AppearanceSection() {
  const { theme, selectTheme, themesAllowed } = useTheme();

  return (
    <Card className="mt-6">
      <Text className="text-lg font-extrabold text-ink">Apariencia</Text>
      <Text className="mb-3 mt-1 text-sm font-semibold text-ink-muted">
        {themesAllowed
          ? "Elige los colores de Mochi."
          : "Los temas de color son parte de Premium. El tema Lavanda es gratuito."}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {THEMES.map((item) => (
          <Chip
            key={item.id}
            label={item.premium && !themesAllowed ? `${item.label} (Premium)` : item.label}
            selected={theme.id === item.id}
            onPress={() => {
              void selectTheme(item.id).then((ok) => {
                if (!ok) router.push("/premium");
              });
            }}
          />
        ))}
      </View>
    </Card>
  );
}

export default AppearanceSection;
