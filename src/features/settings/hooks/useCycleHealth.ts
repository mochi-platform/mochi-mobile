import { useEffect, useState } from "react";
import type { useCustomAlert } from "@/src/shared/components/CustomAlert";
import { getConsent, setConsent } from "@/src/shared/lib/consents";
import {
  getCycleLastSync,
  hasCyclePermissions,
  isHealthConnectAvailable,
  requestCyclePermissions,
  revokeCyclePermissions,
} from "@/src/shared/lib/healthConnect";

type UseCycleHealthParams = {
  userId: string | undefined;
  showAlert: ReturnType<typeof useCustomAlert>["showAlert"];
};

export function useCycleHealth({ userId, showAlert }: UseCycleHealthParams) {
  const [cycleConsent, setCycleConsent] = useState(false);
  const [healthAvailable, setHealthAvailable] = useState(false);
  const [healthPermission, setHealthPermission] = useState(false);
  const [healthSyncing, setHealthSyncing] = useState(false);
  const [lastCycleSync, setLastCycleSync] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    void getConsent("cycle_server").then(setCycleConsent);
  }, [userId]);

  const handleToggleCycleConsent = async (value: boolean) => {
    const previous = cycleConsent;
    setCycleConsent(value);
    try {
      await setConsent("cycle_server", value);
    } catch (err) {
      setCycleConsent(previous);
      showAlert({
        title: "No se pudo guardar",
        message: err instanceof Error ? err.message : "Intenta de nuevo.",
        buttons: [{ text: "Entendido", style: "cancel" }],
      });
    }
  };

  const refreshCycleHealthState = async () => {
    const [available, permission, sync] = await Promise.all([
      isHealthConnectAvailable(),
      hasCyclePermissions(),
      getCycleLastSync(),
    ]);

    setHealthAvailable(available);
    setHealthPermission(permission);
    setLastCycleSync(sync);
  };

  const handleConnectHealth = async () => {
    setHealthSyncing(true);
    try {
      const granted = await requestCyclePermissions();
      setHealthPermission(granted);
      await refreshCycleHealthState();

      if (!granted) {
        showAlert({
          title: "Permiso no concedido",
          message:
            "Puedes intentarlo de nuevo cuando quieras. Mochi seguirá funcionando con normalidad.",
          buttons: [{ text: "Entendido", style: "cancel" }],
        });
      }
    } catch (err) {
      showAlert({
        title: "No se pudo conectar",
        message:
          err instanceof Error
            ? err.message
            : "Ocurrio un error al abrir permisos de Health Connect.",
        buttons: [{ text: "Entendido", style: "cancel" }],
      });
    } finally {
      setHealthSyncing(false);
    }
  };

  const handleRevokeHealth = async () => {
    setHealthSyncing(true);
    try {
      await revokeCyclePermissions();
      await refreshCycleHealthState();
    } finally {
      setHealthSyncing(false);
    }
  };

  return {
    cycleConsent,
    healthAvailable,
    setHealthAvailable,
    healthPermission,
    setHealthPermission,
    healthSyncing,
    lastCycleSync,
    setLastCycleSync,
    handleToggleCycleConsent,
    handleConnectHealth,
    handleRevokeHealth,
  };
}
