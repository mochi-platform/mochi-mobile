import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AppState, type AppStateStatus } from "react-native";
import type { Session, User } from "@supabase/supabase-js";
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [requiresOnboarding, setRequiresOnboarding] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

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
    let authSubscription: { unsubscribe: () => void } | null = null;
    let appStateSubscription: { remove: () => void } | null = null;

    const applySessionState = (nextSession: Session | null) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    };

    async function updateOnboardingState(nextSession: Session | null) {
      if (!mounted) return;

      if (!nextSession?.user.id) {
        setRequiresOnboarding(false);
        setProfileError(null);
        return;
      }

      try {
        const needsOnboarding = await fetchOnboardingStatus(nextSession.user.id);
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

    async function initializeSession() {
      try {
        // Recupera sesión inicial antes de registrar el listener para cubrir reloads.
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        applySessionState(initialSession);
        await updateOnboardingState(initialSession);

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
          if (!mounted) return;

          if (event === "SIGNED_OUT") {
            applySessionState(null);
            setRequiresOnboarding(false);
            setProfileError(null);
            return;
          }

          if (
            event === "SIGNED_IN" ||
            event === "TOKEN_REFRESHED" ||
            event === "INITIAL_SESSION"
          ) {
            applySessionState(nextSession);
            await updateOnboardingState(nextSession);
          }
        });

        authSubscription = subscription;

        const handleAppStateChange = async (nextState: AppStateStatus) => {
          if (nextState !== "active" || !mounted) return;

          const {
            data: { session: activeSession },
          } = await supabase.auth.getSession();

          if (!mounted) return;

          applySessionState(activeSession);
          await updateOnboardingState(activeSession);
        };

        appStateSubscription = AppState.addEventListener(
          "change",
          (state) => {
            void handleAppStateChange(state);
          },
        );
      } catch (error) {
        if (mounted) {
          applySessionState(null);
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

    return () => {
      mounted = false;
      authSubscription?.unsubscribe();
      appStateSubscription?.remove();
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
