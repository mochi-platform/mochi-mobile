import { useEffect } from "react";
import { useSystemBars } from "@/src/core/providers/SystemBarsContext";

type SystemBarsTheme = {
  statusBarStyle: "light" | "dark";
  navigationBarStyle: "light" | "dark";
};

export function useScreenTheme(theme: SystemBarsTheme) {
  const { setTheme } = useSystemBars();
  useEffect(() => {
    setTheme(theme);
  }, [theme.statusBarStyle, theme.navigationBarStyle, setTheme]);
}
