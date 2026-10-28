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
import { toLocalISODate } from "@/src/shared/lib/dates";
import {
  addManualPeriodStart,
  getManualPeriodStarts,
  removeManualPeriodStart,
} from "@/src/shared/lib/manualCycle";
import {
  getCurrentCyclePhase,
  invalidateCyclePhaseCache,
  hasCyclePermissions,
  isHealthConnectAvailable,
  requestCyclePermissions,
  type CyclePhaseData,
} from "@/src/shared/lib/healthConnect";

export type PermissionResult = "granted" | "denied" | "unavailable";

type CycleContextValue = {
  cycleData: CyclePhaseData | null;
  loading: boolean;
  isAvailable: boolean;
  hasPermission: boolean;
  requestPermission: () => Promise<PermissionResult>;
  refresh: () => Promise<void>;
  logPeriodToday: () => Promise<void>;
  /** Si hoy hay un registro manual de inicio de periodo (se puede deshacer). */
  loggedToday: boolean;
  undoPeriodToday: () => Promise<void>;
};

const CycleContext = createContext<CycleContextValue>({
  cycleData: null,
  loading: true,
  isAvailable: false,
  hasPermission: false,
  requestPermission: async () => "unavailable" as PermissionResult,
  refresh: async () => {},
  logPeriodToday: async () => {},
  loggedToday: false,
  undoPeriodToday: async () => {},
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

  const [loggedToday, setLoggedToday] = useState(false);

  const logPeriodToday = useCallback(async () => {
    await addManualPeriodStart();
    setLoggedToday(true);
    await invalidateCyclePhaseCache();
    await refresh();
  }, [refresh]);

  const undoPeriodToday = useCallback(async () => {
    await removeManualPeriodStart();
    setLoggedToday(false);
    await invalidateCyclePhaseCache();
    await refresh();
  }, [refresh]);

  useEffect(() => {
    const today = toLocalISODate(new Date());
    void getManualPeriodStarts().then((starts) => setLoggedToday(starts.includes(today)));
  }, []);

  const requestPermission = useCallback(async (): Promise<PermissionResult> => {
    try {
      const available = await isHealthConnectAvailable();
      setIsAvailable(available);

      if (!available) {
        setHasPermission(false);
        setCycleData(null);
        return "unavailable";
      }

      const granted = await requestCyclePermissions();
      setHasPermission(granted);

      if (granted) {
        const phase = await getCurrentCyclePhase();
        setCycleData(phase);
        return "granted";
      }
      setCycleData(null);
      return "denied";
    } catch {
      setIsAvailable(false);
      setHasPermission(false);
      setCycleData(null);
      return "unavailable";
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
      loggedToday,
      undoPeriodToday,
    }),
    [cycleData, hasPermission, isAvailable, loading, refresh, requestPermission, logPeriodToday, loggedToday, undoPeriodToday],
  );

  return <CycleContext.Provider value={value}>{children}</CycleContext.Provider>;
}

export function useCycle(): CycleContextValue {
  return useContext(CycleContext);
}

export default CycleProvider;
