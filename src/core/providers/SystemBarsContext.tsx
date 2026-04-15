import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

type SystemBarsTheme = {
  statusBarStyle: "light" | "dark";
  navigationBarStyle: "light" | "dark";
};

type SystemBarsContextValue = {
  theme: SystemBarsTheme;
  setTheme: (theme: SystemBarsTheme) => void;
};

const defaultTheme: SystemBarsTheme = {
  statusBarStyle: "dark",
  navigationBarStyle: "dark",
};

const SystemBarsContext = createContext<SystemBarsContextValue>({
  theme: defaultTheme,
  setTheme: () => {},
});

export function SystemBarsProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<SystemBarsTheme>(defaultTheme);
  const setTheme = useCallback(
    (next: SystemBarsTheme) => setThemeState(next),
    [],
  );

  return (
    <SystemBarsContext.Provider value={{ theme, setTheme }}>
      {children}
    </SystemBarsContext.Provider>
  );
}

export function useSystemBars() {
  return useContext(SystemBarsContext);
}
