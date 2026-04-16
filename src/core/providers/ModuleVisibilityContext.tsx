import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "@/src/core/providers/SessionContext";
import { supabase } from "@/src/shared/lib/supabase";

export type ModuleVisibility = {
  partner_features_enabled: boolean;
  study_enabled: boolean;
  exercise_enabled: boolean;
  habits_enabled: boolean;
  goals_enabled: boolean;
  mood_enabled: boolean;
  gratitude_enabled: boolean;
  vouchers_enabled: boolean;
  cooking_enabled: boolean;
};

export const defaultModuleVisibility: ModuleVisibility = {
  partner_features_enabled: false,
  study_enabled: true,
  exercise_enabled: true,
  habits_enabled: true,
  goals_enabled: true,
  mood_enabled: true,
  gratitude_enabled: true,
  vouchers_enabled: false,
  cooking_enabled: true,
};

type ModuleVisibilityContextValue = {
  moduleVisibility: ModuleVisibility;
  moduleVisibilityLoaded: boolean;
};

const ModuleVisibilityContext =
  createContext<ModuleVisibilityContextValue | null>(null);

type ModuleVisibilityProviderProps = {
  children: ReactNode;
};

export function ModuleVisibilityProvider({
  children,
}: ModuleVisibilityProviderProps) {
  const { session } = useSession();
  const [moduleVisibility, setModuleVisibility] = useState<ModuleVisibility>(
    defaultModuleVisibility,
  );
  const [moduleVisibilityLoaded, setModuleVisibilityLoaded] = useState(false);

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
          "partner_features_enabled, study_enabled, exercise_enabled, habits_enabled, goals_enabled, mood_enabled, gratitude_enabled, vouchers_enabled, cooking_enabled",
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

  const value = useMemo(
    () => ({
      moduleVisibility,
      moduleVisibilityLoaded,
    }),
    [moduleVisibility, moduleVisibilityLoaded],
  );

  return (
    <ModuleVisibilityContext.Provider value={value}>
      {children}
    </ModuleVisibilityContext.Provider>
  );
}

export function useModuleVisibility() {
  const context = useContext(ModuleVisibilityContext);

  if (!context) {
    throw new Error(
      "useModuleVisibility debe usarse dentro de ModuleVisibilityProvider",
    );
  }

  return context;
}
