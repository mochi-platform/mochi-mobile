import "../global.css";
import { useEffect, useRef, useState } from "react";
import { Stack, router, usePathname, type ErrorBoundaryProps } from "expo-router";
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
import * as Notifications from "expo-notifications";
import { SystemBars } from "react-native-edge-to-edge";
import {
  SessionProvider,
  useSession,
} from "@/src/core/providers/SessionContext";
import {
  SystemBarsProvider,
  useSystemBars,
} from "@/src/core/providers/SystemBarsContext";
import { AchievementProvider } from "@/src/core/providers/AchievementContext";
import { CycleProvider } from "@/src/core/providers/CycleContext";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { supabase } from "@/src/shared/lib/supabase";

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <SystemBars style={{ statusBar: "dark", navigationBar: "light" }} />
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

type ModuleVisibility = {
  partner_features_enabled: boolean;
  study_enabled: boolean;
  exercise_enabled: boolean;
  habits_enabled: boolean;
  goals_enabled: boolean;
  mood_enabled: boolean;
  gratitude_enabled: boolean;
  vouchers_enabled: boolean;
  cooking_enabled: boolean;
  notes_enabled: boolean;
};

const defaultModuleVisibility: ModuleVisibility = {
  partner_features_enabled: false,
  study_enabled: true,
  exercise_enabled: true,
  habits_enabled: true,
  goals_enabled: true,
  mood_enabled: true,
  gratitude_enabled: true,
  vouchers_enabled: false,
  cooking_enabled: true,
  notes_enabled: true,
};

function isRouteAllowed(pathname: string, settings: ModuleVisibility): boolean {
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

  if (pathname === "/notes") {
    return settings.notes_enabled;
  }

  if (pathname === "/habits") {
    return settings.habits_enabled;
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

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function RootLayoutNavigator() {
  const { session, loading, requiresOnboarding, profileError, refreshProfile } =
    useSession();
  const { theme } = useSystemBars();
  const pathname = usePathname();
  const [moduleVisibility, setModuleVisibility] = useState<ModuleVisibility>(
    defaultModuleVisibility,
  );
  const [moduleVisibilityLoaded, setModuleVisibilityLoaded] = useState(false);
  const loadingScale = useSharedValue(1);
  const notificationResponseListener =
    useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadModuleVisibility(): Promise<void> {
      if (!session?.user.id) {
        if (mounted) {
          setModuleVisibility(defaultModuleVisibility);
          setModuleVisibilityLoaded(true);
        }
        return;
      }

      const { data, error } = await supabase
        .from("user_settings")
        .select(
          "partner_features_enabled, study_enabled, exercise_enabled, habits_enabled, goals_enabled, mood_enabled, gratitude_enabled, vouchers_enabled, cooking_enabled, notes_enabled",
        )
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        setModuleVisibility(defaultModuleVisibility);
        setModuleVisibilityLoaded(true);
        return;
      }

      setModuleVisibility({
        ...defaultModuleVisibility,
        ...((data as Partial<ModuleVisibility> | null) ?? {}),
      });
      setModuleVisibilityLoaded(true);
    }

    setModuleVisibilityLoaded(false);
    void loadModuleVisibility();

    return () => {
      mounted = false;
    };
  }, [session?.user.id]);

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
    notificationResponseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as Record<
          string,
          unknown
        > | null;
        const screen = typeof data?.screen === "string" ? data.screen : null;

        if (screen === "habits") router.push("/habits");
        else if (screen === "study") router.push("/");
        else if (screen === "cooking") router.push("/?tab=cooking");
        else if (screen === "weekly-summary") router.push("/weekly-summary");
        else if (screen === "exam-log") router.push("/exam-log");
      });
    return () => {
      notificationResponseListener.current?.remove();
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
        <SystemBars style={{ statusBar: "dark", navigationBar: "dark" }} />
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
        <SystemBars style={{ statusBar: "dark", navigationBar: "dark" }} />
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

  return (
    <>
      <SystemBars
        style={{
          statusBar: theme.statusBarStyle,
          navigationBar: theme.navigationBarStyle,
        }}
      />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

export function RootLayout() {
  return (
    <SystemBarsProvider>
      <SessionProvider>
        <AchievementProvider>
          <CycleProvider>
            <RootLayoutNavigator />
          </CycleProvider>
        </AchievementProvider>
      </SessionProvider>
    </SystemBarsProvider>
  );
}

export default RootLayout;
