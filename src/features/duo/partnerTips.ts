/**
 * Consejos para la pareja en Duo (modo pareja, Fase 3 del Remaster).
 * Solo hablan de energía, nunca del ciclo ni de la fase: es lo que ella decidió compartir.
 * Catálogo local, sin IA: así ningún dato de salud sale del teléfono.
 */
export type PartnerEnergy = "baja" | "media" | "alta";

export const ENERGY_LABEL: Record<PartnerEnergy, string> = {
  baja: "Energía baja",
  media: "Energía media",
  alta: "Energía alta",
};

export const PARTNER_TIPS: Record<PartnerEnergy, string[]> = {
  baja: [
    "Hoy le vendría bien calma. Propón algo tranquilo: una peli y algo calientito.",
    "Un mensaje cariñoso sin pedirle nada puede alegrarle el día.",
    "Ofrécete a encargarte de algo pequeño que ella tenga pendiente.",
    "Menos planes, más compañía. Estar cerca ya ayuda.",
  ],
  media: [
    "Buen día para un plan sencillo juntos: caminar o cocinar algo rico.",
    "Pregúntale cómo va su día y escucha con calma.",
    "Recuérdale algo que hizo bien esta semana.",
  ],
  alta: [
    "Tiene energía: buen momento para un plan nuevo o una salida.",
    "Anímala con lo que tenga pendiente; hoy puede con todo.",
    "Proponle una meta juntos para esta semana.",
  ],
};

/** Consejo estable para el día (no cambia al refrescar). */
export function tipFor(energy: PartnerEnergy, dayKey: string): string {
  const tips = PARTNER_TIPS[energy];
  let hash = 0;
  for (let i = 0; i < dayKey.length; i++) hash = (hash * 31 + dayKey.charCodeAt(i)) | 0;
  return tips[Math.abs(hash) % tips.length];
}
