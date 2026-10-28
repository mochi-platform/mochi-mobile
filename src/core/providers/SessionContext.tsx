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
import { fetchAppMode } from "@/src/features/duo/api";
import { clearOnboardingDraft } from "@/src/features/onboarding/draft";
import { reportError } from "@/src/shared/lib/observability/reportError";
import { supabase } from "@/src/shared/lib/supabase";

type SessionContextValue = {
  session: Session | null;
  loading: boolean;
  requiresOnboarding: boolean;
  profileError: string | null;
  refreshProfile: () => Promise<void>;
  /** «partner» si la persona llegó solo por Duo (ver src/features/navigation/tabs.ts). */
  appMode: "personal" | "partner";
};

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

type SessionProviderProps = {
  children: ReactNode;
};

async function fetchOnboardingStatus(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, age_group")
    .eq("id", userId)
    .single();
  if (error) throw error;
  // Hay onboarding pendiente si falta el nombre o la verificación de edad.
  return !data?.full_name?.trim() || !data?.age_group;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [requiresOnboarding, setRequiresOnboarding] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [appMode, setAppMode] = useState<"personal" | "partner">("personal");

  // El modo se lee aparte y sin bloquear: si falla, la app sigue en modo personal.
  const userIdForMode = session?.user.id;
  useEffect(() => {
    if (!userIdForMode) {
      setAppMode("personal");
      return;
    }
    let alive = true;
    void fetchAppMode(userIdForMode).then((mode) => {
      if (alive) setAppMode(mode);
    });
    return () => {
      alive = false;
    };
  }, [userIdForMode]);

  const refreshProfile = useCallback(async () => {
    if (!session?.user.id) return;
    void fetchAppMode(session.user.id).then(setAppMode);
    try {
      const needsOnboarding = await fetchOnboardingStatus(session.user.id);
      setRequiresOnboarding(needsOnboarding);
      setProfileError(null);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Error cargando perfil");
    }
  }, [session?.user.id]);

  // ─── Inicialización y listener de auth ───────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    let statusKnown = false;
    let authSubscription: { unsubscribe: () => void } | null = null;
    let appStateSubscription: { remove: () => void } | null = null;

    // Conserva la misma referencia si es la misma sesión: refrescarla al volver a la app
    // no debe disparar efectos que dependan de ella.
    const applySessionState = (nextSession: Session | null) => {
      setSession((prev) =>
        prev && nextSession && prev.access_token === nextSession.access_token ? prev : nextSession,
      );
      setUser((prev) => (prev?.id === nextSession?.user.id ? prev : (nextSession?.user ?? null)));
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
          statusKnown = true;
          setRequiresOnboarding(needsOnboarding);
          setProfileError(null);
        }
      } catch (error) {
        if (!mounted) return;
        // Una recarga en segundo plano (volver de un permiso, sin red) no debe desmontar la app:
        // si ya había un estado conocido, se conserva y solo se reporta.
        if (statusKnown) reportError(error, { scope: "session/refresh-status" });
        else setProfileError(error instanceof Error ? error.message : "Error cargando perfil");
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
            statusKnown = false;
            void clearOnboardingDraft();
            return;
          }

          if (
            event === "SIGNED_IN" ||
            event === "TOKEN_REFRESHED" ||
            event === "INITIAL_SESSION" ||
            event === "PASSWORD_RECOVERY" ||
            event === "USER_UPDATED"
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

        appStateSubscription = AppState.addEventListener("change", (state) => {
          void handleAppStateChange(state);
        });
      } catch (error) {
        if (mounted) {
          applySessionState(null);
          setRequiresOnboarding(false);
          setProfileError(error instanceof Error ? error.message : "Error cargando sesión");
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
      appMode,
    }),
    [session, loading, requiresOnboarding, profileError, refreshProfile, appMode],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession debe usarse dentro de SessionProvider");
  }
  return context;
}
