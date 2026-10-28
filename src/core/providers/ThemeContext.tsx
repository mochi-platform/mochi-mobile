import AsyncStorage from "@react-native-async-storage/async-storage";
import { vars } from "nativewind";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme, View } from "react-native";
import { useSession } from "@/src/core/providers/SessionContext";
import { usePlan } from "@/src/shared/hooks/usePlan";
import {
  canUseTheme,
  getTheme,
  themeVariables,
  type ThemeDef,
  type ThemeId,
} from "@/src/shared/theme/themes";

const STORAGE_KEY = "theme:selected";

type ThemeContextValue = {
  theme: ThemeDef;
  /** Devuelve false si el tema es premium y el plan no lo permite. */
  selectTheme: (id: ThemeId) => Promise<boolean>;
  themesAllowed: boolean;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: getTheme("base"),
  selectTheme: async () => false,
  themesAllowed: false,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { plan, refresh } = usePlan();
  const { session } = useSession();
  const userId = session?.user.id;
  const [selected, setSelected] = useState<ThemeId>("base");

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value) setSelected(getTheme(value).id);
    });
  }, []);

  // El plan se vuelve a leer cuando cambia la sesión (login, logout o cambio de cuenta).
  useEffect(() => {
    if (userId) void refresh();
  }, [userId, refresh]);

  const themesAllowed = plan.features.themes;
  // Si pierde Premium, vuelve al tema base automáticamente.
  const effective = useMemo(() => {
    const theme = getTheme(selected);
    return canUseTheme(theme, themesAllowed) ? theme : getTheme("base");
  }, [selected, themesAllowed]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: effective,
      themesAllowed,
      selectTheme: async (id) => {
        const target = getTheme(id);
        if (!canUseTheme(target, themesAllowed)) return false;
        setSelected(target.id);
        await AsyncStorage.setItem(STORAGE_KEY, target.id);
        return true;
      },
    }),
    [effective, themesAllowed],
  );

  const dark = useColorScheme() === "dark";
  const style = useMemo(() => vars(themeVariables(effective, dark)), [effective, dark]);

  return (
    <ThemeContext.Provider value={value}>
      <View style={[{ flex: 1 }, style]}>{children}</View>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
