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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- las dependencias omitidas son estables o se excluyen a propósito para no reiniciar el efecto
  }, [theme.statusBarStyle, theme.navigationBarStyle, setTheme]);
}
