import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" color={color as string} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="study"
        options={{
          title: "Estudio",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="school-outline" color={color as string} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="exercise"
        options={{
          title: "Ejercicio",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="barbell" color={color as string} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="habits"
        options={{
          title: "Hábitos",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="leaf" color={color as string} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="cooking"
        options={{
          title: "Cocina",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="restaurant" color={color as string} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="wellness"
        options={{
          title: "Bienestar",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="leaf" color={color as string} size={size} />
          ),
        }}
      />
      <Tabs.Screen name="me" options={{ title: "Yo" }} />
      <Tabs.Screen name="duo" options={{ title: "Duo" }} />
      <Tabs.Screen
        name="goals"
        options={{
          href: null,
          title: "Metas",
        }}
      />
      <Tabs.Screen
        name="mood"
        options={{
          href: null,
          title: "Estado de ánimo",
        }}
      />
      <Tabs.Screen
        name="gratitude"
        options={{
          href: null,
          title: "Gratitud",
        }}
      />
    </Tabs>
  );
}
