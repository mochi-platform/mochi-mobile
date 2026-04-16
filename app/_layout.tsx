import "../global.css";
import { useEffect, useRef, useState, type ComponentType } from "react";
import {
  Stack,
  router,
  usePathname,
  useSegments,
  type ErrorBoundaryProps,
} from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { isExpoGo } from "@/lib/env";
import {
  SessionProvider,
  useSession,
} from "@/src/core/providers/SessionContext";
import {
  ModuleVisibilityProvider,
  useModuleVisibility,
} from "@/src/core/providers/ModuleVisibilityContext";
import {
  SystemBarsProvider,
  useSystemBars,
} from "@/src/core/providers/SystemBarsContext";
import { AchievementProvider } from "@/src/core/providers/AchievementContext";
import { CycleProvider } from "@/src/core/providers/CycleContext";
import {
  BottomNav,
  type MobileScreen,
} from "@/src/features/home/components/BottomNav";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";

type NotificationModule = typeof import("expo-notifications");
type NotificationEventSubscription = import("expo-notifications").EventSubscription;
type SystemBarsProps = {
  style: {
    statusBar: "light" | "dark";
    navigationBar: "light" | "dark";
  };
};

let notificationsModulePromise: Promise<NotificationModule> | null = null;

async function getNotificationsModule(): Promise<NotificationModule | null> {
  if (isExpoGo) return null;
  notificationsModulePromise ??= import("expo-notifications");
  return notificationsModulePromise;
}

function EdgeToEdgeSystemBars({ style }: SystemBarsProps) {
  const [SystemBarsComponent, setSystemBarsComponent] =
    useState<ComponentType<SystemBarsProps> | null>(null);

  useEffect(() => {
    if (isExpoGo) return;

    let mounted = true;
    void import("react-native-edge-to-edge")
      .then((module) => {
        if (!mounted) return;
        setSystemBarsComponent(() => module.SystemBars);
      })
      .catch(() => {
        if (!mounted) return;
        setSystemBarsComponent(null);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (isExpoGo || !SystemBarsComponent) return null;
  return <SystemBarsComponent style={style} />;
}

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <EdgeToEdgeSystemBars
        style={{ statusBar: "dark", navigationBar: "light" }}
      />
      <View className="w-full max-w-sm items-center rounded-3xl border border-rose-100 bg-rose-50 p-6">
        <View className="h-14 w-14 items-center justify-center rounded-full bg-rose-100">
          <Ionicons name="alert-circle" size={30} color="#e11d48" />
        </View>
        <Text className="mt-4 text-center text-xl font-bold text-rose-900">
          Algo salió mal
        </Text>
        <Text className="mt-2 text-center text-sm font-semibold text-rose-700">
          Ocurrió un error inesperado
        </Text>
        <TouchableOpacity
          className="mt-6 rounded-2xl bg-pink-200 px-5 py-3"
          onPress={retry}
        >
          <Text className="text-center text-base font-bold text-pink-900">
            Reintentar
          </Text>
        </TouchableOpacity>
        {error?.message ? (
          <Text className="mt-3 text-center text-xs text-rose-500">
            {error.message}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const bottomNavRoutes: Record<MobileScreen, string> = {
  home: "/(tabs)",
  study: "/(tabs)/study",
  exercise: "/(tabs)/exercise",
  habits: "/(tabs)/habits",
  cooking: "/(tabs)/cooking",
};

function getBottomNavScreen(pathname: string): MobileScreen {
  if (pathname === "/study") {
    return "study";
  }

  if (pathname === "/exercise") {
    return "exercise";
  }

  if (pathname === "/habits") {
    return "habits";
  }

  if (pathname === "/cooking") {
    return "cooking";
  }

  return "home";
}

function getVisibleTabs(settings: {
  study_enabled: boolean;
  exercise_enabled: boolean;
  habits_enabled: boolean;
  cooking_enabled: boolean;
}): MobileScreen[] {
  return [
    "home",
    ...(settings.study_enabled ? (["study"] as const) : []),
    ...(settings.exercise_enabled ? (["exercise"] as const) : []),
    ...(settings.habits_enabled ? (["habits"] as const) : []),
    ...(settings.cooking_enabled ? (["cooking"] as const) : []),
  ];
}

function isRouteAllowed(
  pathname: string,
  settings: {
    partner_features_enabled: boolean;
    study_enabled: boolean;
    exercise_enabled: boolean;
    habits_enabled: boolean;
    goals_enabled: boolean;
    mood_enabled: boolean;
    gratitude_enabled: boolean;
    vouchers_enabled: boolean;
    cooking_enabled: boolean;
  },
): boolean {
  if (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/onboarding" ||
    pathname === "/settings" ||
    pathname === "/profile" ||
    pathname === "/weekly-summary" ||
    pathname === "/flashcards" ||
    pathname.startsWith("/auth")
  ) {
    return true;
  }

  if (pathname === "/habits") {
    return settings.habits_enabled;
  }

  if (pathname === "/study") {
    return settings.study_enabled;
  }

  if (pathname === "/exercise") {
    return settings.exercise_enabled;
  }

  if (pathname === "/goals") {
    return settings.goals_enabled;
  }

  if (pathname === "/mood") {
    return settings.mood_enabled;
  }

  if (pathname === "/gratitude") {
    return settings.gratitude_enabled;
  }

  if (pathname === "/vouchers") {
    return settings.partner_features_enabled && settings.vouchers_enabled;
  }

  if (
    pathname === "/exam-log" ||
    pathname === "/study-create" ||
    pathname === "/study-edit" ||
    pathname === "/study-history" ||
    pathname === "/study-timer"
  ) {
    return settings.study_enabled;
  }

  if (
    pathname === "/exercise-create" ||
    pathname === "/exercise-list" ||
    pathname === "/routine-create" ||
    pathname === "/routine-player"
  ) {
    return settings.exercise_enabled;
  }

  if (
    pathname === "/cooking" ||
    pathname === "/recipe-detail" ||
    pathname === "/recipe-player"
  ) {
    return settings.cooking_enabled;
  }

  return true;
}

function RootLayoutNavigator() {
  const { session, loading, requiresOnboarding, profileError, refreshProfile } =
    useSession();
  const { moduleVisibility, moduleVisibilityLoaded } = useModuleVisibility();
  const { theme } = useSystemBars();
  const pathname = usePathname();
  const segments = useSegments();
  const loadingScale = useSharedValue(1);
  const notificationResponseListener =
    useRef<NotificationEventSubscription | null>(null);

  useEffect(() => {
    if (isExpoGo) return;

    let mounted = true;
    void (async () => {
      const Notifications = await getNotificationsModule();
      if (!mounted || !Notifications) return;

      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (loading) {
      loadingScale.value = withRepeat(
        withSequence(
          withTiming(1.06, {
            duration: 650,
            easing: Easing.inOut(Easing.quad),
          }),
          withTiming(1, { duration: 650, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
      return;
    }
    loadingScale.value = withTiming(1, { duration: 180 });
  }, [loading, loadingScale]);

  const loadingAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: loadingScale.value }],
  }));

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    router.replace(requiresOnboarding ? "/onboarding" : "/");
  }, [session, loading, requiresOnboarding]);

  useEffect(() => {
    if (isExpoGo) return;

    let mounted = true;
    void (async () => {
      const Notifications = await getNotificationsModule();
      if (!mounted || !Notifications) return;

      notificationResponseListener.current =
        Notifications.addNotificationResponseReceivedListener((response) => {
          const data = response.notification.request.content.data as Record<
            string,
            unknown
          > | null;
          const screen = typeof data?.screen === "string" ? data.screen : null;

          if (screen === "habits") router.push("/(tabs)/habits");
          else if (screen === "study") router.push("/(tabs)/study");
          else if (screen === "cooking") router.push("/(tabs)/cooking");
          else if (screen === "weekly-summary") router.push("/weekly-summary");
          else if (screen === "exam-log") router.push("/exam-log");
        });
    })();

    return () => {
      mounted = false;
      notificationResponseListener.current?.remove();
      notificationResponseListener.current = null;
    };
  }, []);

  useEffect(() => {
    if (!session || !moduleVisibilityLoaded) return;
    if (requiresOnboarding || loading) return;
    if (isRouteAllowed(pathname, moduleVisibility)) return;
    router.replace("/");
  }, [
    loading,
    moduleVisibility,
    moduleVisibilityLoaded,
    pathname,
    requiresOnboarding,
    session,
  ]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-purple-50 px-6">
        <EdgeToEdgeSystemBars
          style={{ statusBar: "dark", navigationBar: "dark" }}
        />
        <View className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-sm">
          <View className="items-center">
            <Animated.View style={loadingAnimatedStyle}>
              <MochiCharacter mood="thinking" size={90} />
            </Animated.View>
          </View>
          <Text className="mt-4 text-center text-base font-semibold text-purple-900">
            Cargando Mochi...
          </Text>
        </View>
      </View>
    );
  }

  if (profileError && session) {
    return (
      <View className="flex-1 items-center justify-center bg-yellow-50 px-6">
        <EdgeToEdgeSystemBars
          style={{ statusBar: "dark", navigationBar: "dark" }}
        />
        <View className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-sm">
          <Text className="text-center text-lg font-semibold text-purple-900">
            Ups, no pudimos cargar tu perfil
          </Text>
          <Text className="mt-2 text-center text-sm text-purple-800">
            {profileError}
          </Text>
          <TouchableOpacity
            className="mt-5 rounded-2xl bg-yellow-300 px-4 py-3"
            onPress={() => {
              void refreshProfile();
            }}
          >
            <Text className="text-center text-base font-semibold text-purple-900">
              Reintentar
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (
    !process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ||
    !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim()
  ) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-8">
        <Text className="text-center text-lg font-semibold text-gray-800">
          Error de configuracion
        </Text>
        <Text className="mt-2 text-center text-sm text-gray-500">
          Faltan variables de entorno requeridas. Revisa tu archivo .env
        </Text>
      </View>
    );
  }

  const showBottomNav =
    (pathname.startsWith("/(tabs)") || pathname === "/" || segments[0] === "(tabs)") &&
    Boolean(session) &&
    !requiresOnboarding &&
    !pathname.startsWith("/auth") &&
    pathname !== "/login";
  const currentScreen = getBottomNavScreen(pathname);
  const visibleTabs = getVisibleTabs(moduleVisibility);

  return (
    <View className="flex-1">
      <EdgeToEdgeSystemBars
        style={{
          statusBar: theme.statusBarStyle,
          navigationBar: theme.navigationBarStyle,
        }}
      />
      <View className="flex-1">
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </View>
      {showBottomNav ? (
        <BottomNav
          currentScreen={currentScreen}
          onNavigate={(screen) => {
            const targetRoute = bottomNavRoutes[screen];
            const normalizedTarget = targetRoute.replace("/(tabs)", "") || "/";
            if (pathname === normalizedTarget) return;
            router.replace(targetRoute);
          }}
          visibleTabs={visibleTabs}
        />
      ) : null}
    </View>
  );
}

export function RootLayout() {
  return (
    <SystemBarsProvider>
      <SessionProvider>
        <ModuleVisibilityProvider>
          <AchievementProvider>
            <CycleProvider>
              <RootLayoutNavigator />
            </CycleProvider>
          </AchievementProvider>
        </ModuleVisibilityProvider>
      </SessionProvider>
    </SystemBarsProvider>
  );
}

export default RootLayout;
