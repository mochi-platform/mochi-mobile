import * as Haptics from "expo-haptics";

/**
 * Vibraciones con significado fijo en toda la app:
 * - selection: pestañas, chips, interruptores y selectores.
 * - light: pulsar una acción principal.
 * - success: completar algo (hábito, sesión, check-in).
 * - warning: confirmar algo destructivo.
 * Nunca al desplazar ni en animaciones automáticas.
 */
export type HapticKind = "selection" | "light" | "success" | "warning";

export function haptic(kind: HapticKind): void {
  const run = (): Promise<void> => {
    switch (kind) {
      case "selection":
        return Haptics.selectionAsync();
      case "light":
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      case "success":
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      case "warning":
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };
  // Sin motor de vibración (emulador, web) no pasa nada.
  void run().catch(() => {});
}
