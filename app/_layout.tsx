import { tc } from "@/src/shared/theme/colors";
import "../global.css";
import { useEffect, useRef } from "react";
import { Stack, router, usePathname, useSegments, type ErrorBoundaryProps } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, useColorScheme, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { FONT_ASSETS } from "@/src/shared/theme/fonts";
import {
  bottomNavRoutes,
  getBottomNavScreen,
  getVisibleTabs,
} from "@/src/features/home/navigation";
import { WellnessSubNav } from "@/src/features/wellness/WellnessSubNav";
import { ThemeProvider } from "@/src/core/providers/ThemeContext";
import { initSentry, wrapWithSentry } from "@/src/shared/lib/observability/sentry";
import {
  resetAnalytics,
  syncAnalyticsConsent,
  track,
} from "@/src/shared/lib/observability/analytics";
import { NavigationBar } from "expo-navigation-bar";
import { isExpoGo } from "@/lib/env";
import { listenWidgetActions } from "@/src/shared/widgets/widgetActions";
import { registerDuoPush } from "@/src/features/duo/push";
import { SessionProvider, useSession } from "@/src/core/providers/SessionContext";
import {
  ModuleVisibilityProvider,
  useModuleVisibility,
} from "@/src/core/providers/ModuleVisibilityContext";
import { SystemBarsProvider, useSystemBars } from "@/src/core/providers/SystemBarsContext";
import { AchievementProvider } from "@/src/core/providers/AchievementContext";
import { QueryProvider } from "@/src/core/providers/QueryProvider";
import { OfflineBanner } from "@/src/shared/components/OfflineBanner";
import { CycleProvider } from "@/src/core/providers/CycleContext";
import { BottomNav } from "@/src/features/home/components/BottomNav";
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
  const scheme = useColorScheme();
  if (isExpoGo) return null;
  // Las pantallas declaran el estilo pensado para fondo claro; en oscuro los iconos van claros.
  const isDark = scheme === "dark";
  return (
    <>
      <StatusBar style={isDark ? "light" : style.statusBar === "dark" ? "dark" : "light"} />
      <NavigationBar style={isDark ? "light" : style.navigationBar} />
    </>
  );
}

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View className="flex-1 items-center justify-center bg-white px-6 dark:bg-surface">
      <EdgeToEdgeSystemBars style={{ statusBar: "dark", navigationBar: "light" }} />
      <View className="w-full max-w-sm items-center rounded-3xl border border-rose-100 bg-rose-50 p-6 dark:border-rose-900 dark:bg-rose-950">
        <View className="h-14 w-14 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900">
          <Ionicons name="alert-circle" size={30} color={tc("#e11d48")} />
        </View>
        <Text className="mt-4 text-center text-xl font-bold text-rose-900 dark:text-rose-100">
          Algo salió mal
        </Text>
        <Text className="mt-2 text-center text-sm font-semibold text-rose-700 dark:text-rose-300">
          Ocurrió un error inesperado
        </Text>
        <TouchableOpacity
          className="mt-6 rounded-2xl bg-pink-200 px-5 py-3 dark:bg-pink-800"
          onPress={retry}
        >
          <Text className="text-center text-base font-bold text-pink-900 dark:text-pink-100">
            Reintentar
          </Text>
        </TouchableOpacity>
        {error?.message ? (
          <Text className="mt-3 text-center text-xs text-rose-500">{error.message}</Text>
        ) : null}
      </View>
    </View>
  );
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
    pathname === "/wellness" ||
    pathname === "/premium" ||
    pathname === "/weekly-summary" ||
    pathname === "/flashcards" ||
    pathname.startsWith("/auth")
  ) {
    return true;
  }

  if (pathname === "/mochi-duo" || pathname.startsWith("/mochi-duo")) {
    return settings.partner_features_enabled;
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
    return settings.vouchers_enabled;
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

  if (pathname === "/cooking" || pathname === "/recipe-detail" || pathname === "/recipe-player") {
    return settings.cooking_enabled;
  }

  return true;
}

function RootLayoutNavigator() {
  const { session, loading, requiresOnboarding, profileError, refreshProfile } = useSession();
  const { moduleVisibility, moduleVisibilityLoaded } = useModuleVisibility();
  const { theme } = useSystemBars();
  const pathname = usePathname();
  const segments = useSegments();
  const loadingScale = useSharedValue(1);
  const notificationResponseListener = useRef<NotificationEventSubscription | null>(null);

  useEffect(() => {
    let release: (() => void) | null = null;
    let cancelled = false;
    void listenWidgetActions().then((stop) => {
      if (cancelled) stop();
      else release = stop;
    });
    return () => {
      cancelled = true;
      release?.();
    };
  }, []);

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

  const sessionUserId = session?.user.id ?? null;
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const segs: string[] = segments;
  const moduleSegment = segs[0] === "(tabs)" ? (segs[1] ?? "index") : segs[0];
  useEffect(() => {
    // Solo el nombre de la pantalla; nunca contenido ni parámetros.
    if (session && moduleSegment) track("module_opened", { module: String(moduleSegment) });
  }, [moduleSegment, session]);

  useEffect(() => {
    if (loading) return;
    if (session?.user.id) {
      void syncAnalyticsConsent(session.user.id);
      void registerDuoPush();
    } else {
      resetAnalytics();
    }
  }, [session?.user.id, loading]);

  useEffect(() => {
    if (loading) return;
    // Durante la recuperación de contraseña la sesión existe pero debe quedarse en esa pantalla.
    if (pathnameRef.current.startsWith("/auth/reset")) return;
    if (!sessionUserId) {
      router.replace("/login");
      return;
    }
    // Al terminar el onboarding se queda en él para mostrar "Todo listo"; sus botones navegan.
    if (!requiresOnboarding && pathnameRef.current.startsWith("/onboarding")) return;
    router.replace(requiresOnboarding ? "/onboarding" : "/");
    // Depende del id de la usuaria, no del objeto de sesión: al volver de un permiso del
    // sistema la sesión se refresca y no debe reiniciar la pantalla.
  }, [sessionUserId, loading, requiresOnboarding]);

  useEffect(() => {
    if (isExpoGo) return;

    let mounted = true;
    void (async () => {
      const Notifications = await getNotificationsModule();
      if (!mounted || !Notifications) return;

      notificationResponseListener.current = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          const data = response.notification.request.content.data as Record<string, unknown> | null;
          const screen = typeof data?.screen === "string" ? data.screen : null;

          if (screen === "habits") router.push("/(tabs)/habits");
          else if (screen === "study") router.push("/(tabs)/study");
          else if (screen === "cooking") router.push("/(tabs)/cooking");
          else if (screen === "weekly-summary") router.push("/weekly-summary");
          else if (screen === "exam-log") router.push("/exam-log");
          else if (data?.type === "voucher") router.push("/vouchers");
        },
      );
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
  }, [loading, moduleVisibility, moduleVisibilityLoaded, pathname, requiresOnboarding, session]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-purple-50 px-6 dark:bg-purple-950">
        <EdgeToEdgeSystemBars style={{ statusBar: "dark", navigationBar: "dark" }} />
        <View className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-sm dark:bg-surface">
          <View className="items-center">
            <Animated.View style={loadingAnimatedStyle}>
              <MochiCharacter mood="thinking" size={90} />
            </Animated.View>
          </View>
          <Text className="mt-4 text-center text-base font-semibold text-purple-900 dark:text-purple-100">
            Cargando Mochi...
          </Text>
        </View>
      </View>
    );
  }

  if (profileError && session) {
    return (
      <View className="flex-1 items-center justify-center bg-yellow-50 px-6 dark:bg-yellow-950">
        <EdgeToEdgeSystemBars style={{ statusBar: "dark", navigationBar: "dark" }} />
        <View className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-sm dark:bg-surface">
          <Text className="text-center text-lg font-semibold text-purple-900 dark:text-purple-100">
            Ups, no pudimos cargar tu perfil
          </Text>
          <Text className="mt-2 text-center text-sm text-purple-800 dark:text-purple-200">
            {profileError}
          </Text>
          <TouchableOpacity
            className="mt-5 rounded-2xl bg-yellow-300 px-4 py-3 dark:bg-yellow-700"
            onPress={() => {
              void refreshProfile();
            }}
          >
            <Text className="text-center text-base font-semibold text-purple-900 dark:text-purple-100">
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
      <View className="flex-1 items-center justify-center bg-white px-8 dark:bg-surface">
        <Text className="text-center text-lg font-semibold text-gray-800 dark:text-gray-200">
          Error de configuracion
        </Text>
        <Text className="mt-2 text-center text-sm text-gray-500">
          Faltan variables de entorno requeridas. Revisa tu archivo .env
        </Text>
      </View>
    );
  }

  const showBottomNav =
    ((pathname.startsWith("/(tabs)") || pathname === "/" || segments[0] === "(tabs)") &&
      Boolean(session) &&
      !requiresOnboarding &&
      !pathname.startsWith("/auth") &&
      pathname !== "/login") ||
    (Boolean(session) && (pathname.startsWith("/mochi-duo") || pathname === "/profile"));
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
      {showBottomNav && currentScreen === "wellness" ? (
        <WellnessSubNav pathname={pathname} visibility={moduleVisibility} />
      ) : null}
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

initSentry();
// El splash se queda hasta que las fuentes están listas (expo-router lo ocultaría antes).
void SplashScreen.preventAutoHideAsync().catch(() => {});

export function RootLayout() {
  // En Android las fuentes ya vienen embebidas; esto las registra en Expo Go, iOS y web.
  // Si la carga falla se sigue con la fuente del sistema en vez de bloquear la app.
  const [fontsLoaded, fontError] = useFonts(FONT_ASSETS);
  const fontsReady = fontsLoaded || Boolean(fontError);
  useEffect(() => {
    if (fontsReady) void SplashScreen.hideAsync().catch(() => {});
  }, [fontsReady]);
  if (!fontsReady) return null;
  return (
    <SystemBarsProvider>
      <SessionProvider>
        <ModuleVisibilityProvider>
          <AchievementProvider>
            <ThemeProvider>
              <QueryProvider>
                <CycleProvider>
                  <RootLayoutNavigator />
                  <OfflineBanner />
                </CycleProvider>
              </QueryProvider>
            </ThemeProvider>
          </AchievementProvider>
        </ModuleVisibilityProvider>
      </SessionProvider>
    </SystemBarsProvider>
  );
}

export default wrapWithSentry(RootLayout);
