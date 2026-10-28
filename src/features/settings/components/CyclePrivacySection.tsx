import { Caption, Surface, Title, Toggle } from "@/src/shared/ui";

type CyclePrivacySectionProps = {
  cycleConsent: boolean;
  onToggleCycleConsent: (value: boolean) => Promise<void>;
};

export function CyclePrivacySection({
  cycleConsent,
  onToggleCycleConsent,
}: CyclePrivacySectionProps) {
  return (
    <Surface className="mt-6 p-4">
      <Title>Privacidad de tu ciclo</Title>
      <Caption className="mb-2 mt-1">
        Tu ciclo se calcula en tu teléfono y no se envía a la IA. Si lo activas, Mochi guarda solo
        la fecha de inicio y la duración, para que tu pareja vea tu nivel de energía (nunca la fase)
        en Duo, únicamente si tú se lo permites.
      </Caption>
      <Toggle
        label="Guardar resumen de mi ciclo en Mochi"
        value={cycleConsent}
        onValueChange={(value) => void onToggleCycleConsent(value)}
      />
      <Caption className="mt-1">
        Puedes desactivarlo cuando quieras: se borran esos datos del servidor. Mochi no es un
        dispositivo médico ni sirve como anticonceptivo.
      </Caption>
    </Surface>
  );
}
