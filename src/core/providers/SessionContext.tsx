import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState, type AppStateStatus } from "react-native";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabase } from "@/src/shared/lib/supabase";

type SessionContextValue = {
  session: Session | null;
  loading: boolean;
  requiresOnboarding: boolean;
  profileError: string | null;
  refreshProfile: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | undefined>(
  undefined,
);

type SessionProviderProps = {
  children: ReactNode;
};

async function fetchOnboardingStatus(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return !data?.full_name?.trim();
}

export function SessionProvider({ children }: SessionProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [requiresOnboarding, setRequiresOnboarding] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const isRefreshingForegroundSessionRef = useRef(false);

  const refreshProfile = useCallback(async () => {
    if (!session?.user.id) return;
    try {
      const needsOnboarding = await fetchOnboardingStatus(session.user.id);
      setRequiresOnboarding(needsOnboarding);
      setProfileError(null);
    } catch (error) {
      setProfileError(
        error instanceof Error ? error.message : "Error cargando perfil",
      );
    }
  }, [session?.user.id]);

  // ─── Inicialización y listener de auth ───────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    async function initializeSession() {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        setSession(initialSession);

        if (initialSession?.user.id) {
          try {
            const needsOnboarding = await fetchOnboardingStatus(
              initialSession.user.id,
            );
            if (mounted) {
              setRequiresOnboarding(needsOnboarding);
              setProfileError(null);
            }
          } catch (error) {
            if (mounted) {
              setProfileError(
                error instanceof Error ? error.message : "Error cargando perfil",
              );
            }
          }
        }
      } catch (error) {
        if (mounted) {
          setSession(null);
          setRequiresOnboarding(false);
          setProfileError(
            error instanceof Error ? error.message : "Error cargando sesión",
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void initializeSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, nextSession: Session | null) => {
        if (!mounted) return;

        setSession(nextSession);

        if (!nextSession) {
          setRequiresOnboarding(false);
          setProfileError(null);
          return;
        }

        try {
          const needsOnboarding = await fetchOnboardingStatus(
            nextSession.user.id,
          );
          if (mounted) {
            setRequiresOnboarding(needsOnboarding);
            setProfileError(null);
          }
        } catch (error) {
          if (mounted) {
            setProfileError(
              error instanceof Error ? error.message : "Error cargando perfil",
            );
          }
        }
      },
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ─── AppState: refrescar sesión al volver al primer plano ────────────────────
  // Cuando Android/iOS suspende la app, el autoRefresh se pausa.
  // Al volver al primer plano llamamos getSession() para que Supabase
  // detecte si el token expiró y lo refresque antes de que el usuario
  // intente hacer cualquier acción.
  useEffect(() => {
    let currentAppState: AppStateStatus = AppState.currentState;

    if (currentAppState === "active") {
      void supabase.auth.startAutoRefresh();
    }

    const resetSessionState = () => {
      setSession(null);
      setRequiresOnboarding(false);
      setProfileError(null);
    };

    const handleAppStateChange = async (nextState: AppStateStatus) => {
      const wasInBackground = currentAppState !== "active";
      currentAppState = nextState;

      if (nextState !== "active") {
        try {
          await supabase.auth.stopAutoRefresh();
        } catch {
          // No-op: evitar rechazos no manejados al pausar auto-refresh.
        }
        return;
      }

      if (!wasInBackground || isRefreshingForegroundSessionRef.current) return;

      isRefreshingForegroundSessionRef.current = true;
      try {
        // Al volver a primer plano, forzamos ciclo de refresh para evitar tokens colgados.
        await supabase.auth.startAutoRefresh();

        const { data: currentData } = await supabase.auth.getSession();
        if (!currentData.session) {
          resetSessionState();
          return;
        }

        const { data: refreshedData, error: refreshError } =
          await supabase.auth.refreshSession();

        if (refreshError || !refreshedData.session) {
          const message = refreshError?.message?.toLowerCase() ?? "";
          const isInvalidSession =
            message.includes("refresh token") ||
            message.includes("jwt") ||
            message.includes("session");

          if (isInvalidSession) {
            resetSessionState();
          }
          return;
        }

        setSession((prev) => {
          if (prev?.access_token !== refreshedData.session?.access_token) {
            return refreshedData.session;
          }
          return prev;
        });
      } catch {
        // Silencioso: si fue un error temporal de red, mantenemos estado actual.
      } finally {
        isRefreshingForegroundSessionRef.current = false;
      }
    };

    const subscription = AppState.addEventListener("change", (state) => {
      void handleAppStateChange(state);
    });

    return () => {
      subscription.remove();
      void supabase.auth.stopAutoRefresh();
    };
  }, []);

  const value = useMemo(
    () => ({
      session,
      loading,
      requiresOnboarding,
      profileError,
      refreshProfile,
    }),
    [session, loading, requiresOnboarding, profileError, refreshProfile],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession debe usarse dentro de SessionProvider");
  }
  return context;
}
