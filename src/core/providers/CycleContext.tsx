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
import {
  getCurrentCyclePhase,
  hasCyclePermissions,
  isHealthConnectAvailable,
  requestCyclePermissions,
  type CyclePhaseData,
} from "@/src/shared/lib/healthConnect";

type CycleContextValue = {
  cycleData: CyclePhaseData | null;
  loading: boolean;
  isAvailable: boolean;
  hasPermission: boolean;
  requestPermission: () => Promise<void>;
  refresh: () => Promise<void>;
};

const CycleContext = createContext<CycleContextValue>({
  cycleData: null,
  loading: true,
  isAvailable: false,
  hasPermission: false,
  requestPermission: async () => {},
  refresh: async () => {},
});

export function CycleProvider({ children }: { children: ReactNode }) {
  const [cycleData, setCycleData] = useState<CyclePhaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);

    try {
      const available = await isHealthConnectAvailable();
      setIsAvailable(available);

      if (!available) {
        setHasPermission(false);
        setCycleData(null);
        return;
      }

      const granted = await hasCyclePermissions();
      setHasPermission(granted);

      if (!granted) {
        setCycleData(null);
        return;
      }

      const phase = await getCurrentCyclePhase();
      setCycleData(phase);
    } catch {
      setIsAvailable(false);
      setHasPermission(false);
      setCycleData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    try {
      const available = await isHealthConnectAvailable();
      setIsAvailable(available);

      if (!available) {
        setHasPermission(false);
        setCycleData(null);
        return;
      }

      const granted = await requestCyclePermissions();
      setHasPermission(granted);

      if (granted) {
        const phase = await getCurrentCyclePhase();
        setCycleData(phase);
      } else {
        setCycleData(null);
      }
    } catch {
      setIsAvailable(false);
      setHasPermission(false);
      setCycleData(null);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "active") {
          void refresh();
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, [refresh]);

  const value = useMemo<CycleContextValue>(
    () => ({
      cycleData,
      loading,
      isAvailable,
      hasPermission,
      requestPermission,
      refresh,
    }),
    [
      cycleData,
      hasPermission,
      isAvailable,
      loading,
      refresh,
      requestPermission,
    ],
  );

  return (
    <CycleContext.Provider value={value}>{children}</CycleContext.Provider>
  );
}

export function useCycle(): CycleContextValue {
  return useContext(CycleContext);
}

export default CycleProvider;
