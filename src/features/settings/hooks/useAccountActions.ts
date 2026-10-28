import type { useCustomAlert } from "@/src/shared/components/CustomAlert";
import { track } from "@/src/shared/lib/observability/analytics";
import { supabase } from "@/src/shared/lib/supabase";

type UseAccountActionsParams = {
  showAlert: ReturnType<typeof useCustomAlert>["showAlert"];
};

export function useAccountActions({ showAlert }: UseAccountActionsParams) {
  const handleSignOut = () => {
    showAlert({
      title: "Cerrar sesión",
      message: "¿Quieres cerrar tu sesión ahora?",
      buttons: [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Cerrar sesión",
          style: "destructive",
          onPress: () => {
            void supabase.auth.signOut();
          },
        },
      ],
    });
  };

  const performDeleteAccount = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("delete-account", {
        body: { confirm: "ELIMINAR" },
      });
      if (error || !(data as { ok?: boolean } | null)?.ok) {
        throw error ?? new Error("No se pudo eliminar la cuenta");
      }
      track("account_deleted");
      await supabase.auth.signOut();
    } catch (err) {
      showAlert({
        title: "No se pudo eliminar",
        message: err instanceof Error ? err.message : "Intenta de nuevo en unos segundos.",
        buttons: [{ text: "Entendido", style: "cancel" }],
      });
    }
  };

  const handleDeleteAccount = () => {
    showAlert({
      title: "Eliminar cuenta",
      message:
        "Se borrarán tu cuenta y todos tus datos de forma permanente. Esta acción no se puede deshacer. Si tienes una suscripción, cancélala también en Google Play.",
      buttons: [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar para siempre",
          style: "destructive",
          onPress: () => {
            void performDeleteAccount();
          },
        },
      ],
    });
  };

  return { handleSignOut, handleDeleteAccount };
}
