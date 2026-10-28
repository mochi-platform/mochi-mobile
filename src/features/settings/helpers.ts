import type { PartnerSpace } from "@/src/shared/types/database";
import type { ModuleItem, ModuleSettings } from "./types";

export const moduleItems: ModuleItem[] = [
  { key: "partner_features_enabled", label: "Mochi Duo™", icon: "people" },
  { key: "quick_capture_enabled", label: "QuickCapture", icon: "flash" },
  { key: "study_enabled", label: "Estudio", icon: "book" },
  { key: "exercise_enabled", label: "Ejercicio", icon: "barbell" },
  { key: "habits_enabled", label: "Hábitos", icon: "leaf" },
  { key: "goals_enabled", label: "Metas", icon: "flag" },
  { key: "mood_enabled", label: "Estado de ánimo", icon: "heart" },
  { key: "gratitude_enabled", label: "Gratitud", icon: "flower" },
  { key: "cooking_enabled", label: "Cocina", icon: "restaurant" },
];

export const defaultModuleSettings: ModuleSettings = {
  partner_features_enabled: false,
  quick_capture_enabled: true,
  study_enabled: true,
  exercise_enabled: true,
  habits_enabled: true,
  goals_enabled: true,
  mood_enabled: true,
  gratitude_enabled: true,
  vouchers_enabled: false,
  cooking_enabled: true,
};

export function isValidTime(value: string): boolean {
  const validPattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return validPattern.test(value);
}

export function formatCycleSync(lastCycleSync: string | null): string {
  return lastCycleSync
    ? new Date(lastCycleSync).toLocaleString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Sin sincronización aún";
}

export function getPartnerStatusLabel(partnerSpace: PartnerSpace | null): string {
  if (!partnerSpace) return "Sin vinculo";
  if (partnerSpace.invite_status === "accepted") return "Activo";
  if (partnerSpace.invite_status === "pending") return "Invitacion pendiente";
  return "Cancelado";
}
