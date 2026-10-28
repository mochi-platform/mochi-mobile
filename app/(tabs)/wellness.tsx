import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useModuleVisibility } from "@/src/core/providers/ModuleVisibilityContext";
import { visibleWellnessSections } from "@/src/features/wellness/sections";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { Card, EmptyState } from "@/src/shared/ui";

export function WellnessScreen() {
  const { moduleVisibility } = useModuleVisibility();
  const sections = visibleWellnessSections(moduleVisibility);

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View className="flex-row items-center">
          <MochiCharacter expression="happy" size={64} />
          <View className="ml-3 flex-1">
            <Text className="text-2xl font-extrabold text-ink">Bienestar</Text>
            <Text className="text-sm font-semibold text-ink-muted">
              Cuida tu cuerpo y tu ánimo, a tu ritmo.
            </Text>
          </View>
        </View>

        {sections.length === 0 ? (
          <EmptyState
            title="Aún no tienes módulos de bienestar"
            message="Actívalos desde Ajustes para verlos aquí."
            actionLabel="Ir a Ajustes"
            onAction={() => router.push("/settings")}
          />
        ) : (
          <View className="mt-5 gap-3">
            {sections.map((section) => (
              <TouchableOpacity
                key={section.key}
                accessibilityRole="button"
                accessibilityLabel={`${section.label}. ${section.description}`}
                onPress={() => router.replace(section.route as never)}
              >
                <Card className="flex-row items-center">
                  <View className="h-12 w-12 items-center justify-center rounded-control bg-accent-soft">
                    <Ionicons name={section.icon} size={24} color="#8b6fd6" />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-base font-extrabold text-ink">{section.label}</Text>
                    <Text className="text-xs font-semibold text-ink-muted">
                      {section.description}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#8b6fd6" />
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default WellnessScreen;
