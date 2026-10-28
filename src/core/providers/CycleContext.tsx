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
import { syncCycleSummary } from "@/src/shared/lib/consents";
import { addManualPeriodStart } from "@/src/shared/lib/manualCycle";
import {
  getCurrentCyclePhase,
  invalidateCyclePhaseCache,
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
  logPeriodToday: () => Promise<void>;
};

const CycleContext = createContext<CycleContextValue>({
  cycleData: null,
  loading: true,
  isAvailable: false,
  hasPermission: false,
  requestPermission: async () => {},
  refresh: async () => {},
  logPeriodToday: async () => {},
});

export function CycleProvider({ children }: { children: ReactNode }) {
  const [cycleData, setCycleData] = useState<CyclePhaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);

    try {
      const available = await isHealthConnectAvailable().catch(() => false);
      setIsAvailable(available);
      const granted = available ? await hasCyclePermissions().catch(() => false) : false;
      setHasPermission(granted);

      // Funciona también solo con registros manuales.
      const phase = await getCurrentCyclePhase();
      setCycleData(phase);
      if (phase) {
        void syncCycleSummary({
          lastPeriodStart: phase.lastPeriodStart,
          cycleLength: phase.cycleLength,
          source: granted ? "health_connect" : "manual",
        }).catch(() => undefined);
      }
    } catch {
      setCycleData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logPeriodToday = useCallback(async () => {
    await addManualPeriodStart();
    await invalidateCyclePhaseCache();
    await refresh();
  }, [refresh]);

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
    const subscription = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (nextState === "active") {
        void refresh();
      }
    });

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
      logPeriodToday,
    }),
    [cycleData, hasPermission, isAvailable, loading, refresh, requestPermission, logPeriodToday],
  );

  return <CycleContext.Provider value={value}>{children}</CycleContext.Provider>;
}

export function useCycle(): CycleContextValue {
  return useContext(CycleContext);
}

export default CycleProvider;
