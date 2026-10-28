import { Button, Caption, Strong, Surface, Title } from "@/src/shared/ui";
import { formatCycleSync } from "../helpers";

type HealthSectionProps = {
  healthAvailable: boolean;
  healthPermission: boolean;
  healthSyncing: boolean;
  lastCycleSync: string | null;
  onConnectHealth: () => Promise<void>;
  onRevokeHealth: () => Promise<void>;
};

export function HealthSection({
  healthAvailable,
  healthPermission,
  healthSyncing,
  lastCycleSync,
  onConnectHealth,
  onRevokeHealth,
}: HealthSectionProps) {
  return (
    <Surface className="mt-6 p-4">
      <Title>Datos de salud</Title>
      <Caption className="mt-1">Conecta Health Connect para que Mochi conozca tu ciclo.</Caption>
      {healthAvailable ? (
        <>
          <Surface tone="sunken" className="mt-3 p-3">
            <Strong>{healthPermission ? "Permiso concedido" : "Permiso sin conceder"}</Strong>
            <Caption className="mt-0.5">
              Última sincronización: {formatCycleSync(lastCycleSync)}
            </Caption>
          </Surface>
          <Button
            title={
              healthSyncing ? "Actualizando…" : healthPermission ? "Revocar permiso" : "Conectar"
            }
            variant={healthPermission ? "outline" : "primary"}
            loading={healthSyncing}
            onPress={() => void (healthPermission ? onRevokeHealth() : onConnectHealth())}
          />
        </>
      ) : (
        <Surface tone="sunken" className="mt-3 p-3">
          <Caption>
            No disponible en este teléfono: requiere Android 14 o Health Connect instalado. Puedes
            registrar tu ciclo a mano con «Me llegó hoy».
          </Caption>
        </Surface>
      )}
    </Surface>
  );
}
