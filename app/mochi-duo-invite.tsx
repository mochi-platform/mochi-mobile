import { track } from "@/src/shared/lib/observability/analytics";
import { tc } from "@/src/shared/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import QRCode from "react-native-qrcode-svg";
import { QrScannerModal } from "@/src/features/duo/QrScannerModal";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "@/src/core/providers/SessionContext";
import { useCustomAlert } from "@/src/shared/components/CustomAlert";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { supabase } from "@/src/shared/lib/supabase";
import type { PartnerSpace } from "@/src/shared/types/database";

type InviteMode = "create" | "join";

export function MochiDuoInviteScreen() {
  const { session } = useSession();
  const { showAlert, AlertComponent } = useCustomAlert();

  const [mode, setMode] = useState<InviteMode>("create");
  const [inviteCode, setInviteCode] = useState("");
  const [activeSpace, setActiveSpace] = useState<PartnerSpace | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  const userId = session?.user.id;

  const loadSpace = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("partner_spaces")
        .select("*")
        .or(`owner_user_id.eq.${userId},partner_user_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setActiveSpace((data as PartnerSpace | null) ?? null);
    } catch {
      setActiveSpace(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void loadSpace();
    }, [loadSpace]),
  );

  const handleCreateInvite = async () => {
    if (activeSpace?.invite_status === "pending") {
      showAlert({
        title: "Invitacion pendiente",
        message: "Ya tienes un codigo activo. Compartelo con tu pareja.",
        buttons: [{ text: "Entendido", style: "cancel" }],
      });
      return;
    }

    try {
      setWorking(true);
      const { error } = await supabase.rpc("create_partner_invite");
      if (error) throw error;
      setInviteCode("");
      await loadSpace();
    } catch (err) {
      showAlert({
        title: "No se pudo crear",
        message: err instanceof Error ? err.message : "Intenta de nuevo en unos segundos.",
        buttons: [{ text: "Entendido", style: "cancel" }],
      });
    } finally {
      setWorking(false);
    }
  };

  const handleCopyCode = async () => {
    if (activeSpace?.invite_code) {
      await Clipboard.setStringAsync(activeSpace.invite_code);
      setCopiedToClipboard(true);
      setTimeout(() => setCopiedToClipboard(false), 2000);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      showAlert({
        title: "Codigo requerido",
        message: "Escribe el codigo de invitacion para continuar.",
        buttons: [{ text: "Entendido", style: "cancel" }],
      });
      return;
    }

    try {
      setWorking(true);
      const { data, error } = await supabase.rpc("accept_partner_invite", {
        p_invite_code: inviteCode.trim().toUpperCase(),
      });
      if (error) throw error;
      if (data) {
        track("duo_linked");
        showAlert({
          title: "Mochi Duo™ activado",
          message: "El vinculo se completo correctamente.",
          buttons: [{ text: "Perfecto", style: "default" }],
        });
        await loadSpace();
        router.push("/mochi-duo");
      }
    } catch (err) {
      showAlert({
        title: "No se pudo unir",
        message: err instanceof Error ? err.message : "Verifica el codigo e intenta de nuevo.",
        buttons: [{ text: "Entendido", style: "cancel" }],
      });
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-emerald-50 dark:bg-emerald-950">
        <MochiCharacter mood="thinking" size={90} />
        <Text className="mt-4 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          Cargando invitaciones...
        </Text>
      </SafeAreaView>
    );
  }

  if (activeSpace?.invite_status === "accepted") {
    return (
      <SafeAreaView className="flex-1 bg-emerald-50 px-6 dark:bg-emerald-950">
        <TouchableOpacity className="mt-4 flex-row items-center" onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={tc("#047857")} />
          <Text className="ml-1 font-bold text-emerald-900 dark:text-emerald-100">Volver</Text>
        </TouchableOpacity>

        <View className="mt-8 items-center rounded-3xl border-2 border-emerald-200 bg-white p-6 dark:border-emerald-800 dark:bg-surface">
          <MochiCharacter mood="happy" size={90} />
          <Text className="mt-4 text-center text-lg font-extrabold text-emerald-900 dark:text-emerald-100">
            Ya tienes un espacio activo
          </Text>
          <Text className="mt-2 text-center text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            Gestiona Mochi Duo™ desde tu panel principal.
          </Text>
          <TouchableOpacity
            className="mt-5 rounded-2xl bg-emerald-500 px-6 py-3"
            onPress={() => router.push("/mochi-duo")}
          >
            <Text className="font-bold text-white">Abrir Mochi Duo™</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView className="flex-1 bg-emerald-50 dark:bg-emerald-950">
        <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
          <TouchableOpacity className="mt-4 flex-row items-center" onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={tc("#047857")} />
            <Text className="ml-1 font-bold text-emerald-900 dark:text-emerald-100">Volver</Text>
          </TouchableOpacity>

          <View className="mt-6 rounded-3xl border-2 border-emerald-200 bg-white p-5 dark:border-emerald-800 dark:bg-surface">
            <Text className="text-2xl font-extrabold text-emerald-900 dark:text-emerald-100">
              Mochi Duo™
            </Text>
            <Text className="mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              Crea una invitacion o ingresa un codigo existente.
            </Text>
          </View>

          <View className="mt-6 flex-row">
            <TouchableOpacity
              className={`flex-1 rounded-l-2xl border-2 px-4 py-3 ${mode === "create" ? "border-emerald-400 bg-emerald-100 dark:bg-emerald-900" : "border-emerald-200 bg-white dark:border-emerald-800 dark:bg-surface"}`}
              onPress={() => {
                setMode("create");
                setInviteCode("");
              }}
            >
              <Text className="text-center text-sm font-extrabold text-emerald-900 dark:text-emerald-100">
                Crear invitacion
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 rounded-r-2xl border-2 px-4 py-3 ${mode === "join" ? "border-emerald-400 bg-emerald-100 dark:bg-emerald-900" : "border-emerald-200 bg-white dark:border-emerald-800 dark:bg-surface"}`}
              onPress={() => {
                setMode("join");
                setInviteCode("");
              }}
            >
              <Text className="text-center text-sm font-extrabold text-emerald-900 dark:text-emerald-100">
                Unirme
              </Text>
            </TouchableOpacity>
          </View>

          {mode === "create" ? (
            <View className="mt-6 rounded-3xl border-2 border-emerald-200 bg-white p-5 dark:border-emerald-800 dark:bg-surface">
              <Text className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                Genera un codigo para compartir con tu pareja.
              </Text>

              {activeSpace?.invite_status === "pending" && (
                <View className="mt-4">
                  <View className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-950">
                    <Text
                      selectable
                      className="text-center text-2xl font-extrabold text-emerald-900 dark:text-emerald-100"
                    >
                      {activeSpace.invite_code}
                    </Text>
                  </View>
                  <View
                    className="mt-4 items-center rounded-2xl bg-white p-4 dark:bg-surface"
                    accessibilityLabel="Código QR de la invitación"
                  >
                    <QRCode value={activeSpace.invite_code} size={160} />
                  </View>
                  <TouchableOpacity
                    className="mt-3 flex-row items-center justify-center gap-2 rounded-2xl border-2 border-emerald-300 bg-emerald-50 py-2.5 dark:border-emerald-700 dark:bg-emerald-950"
                    onPress={handleCopyCode}
                  >
                    <Ionicons
                      name={copiedToClipboard ? "checkmark" : "copy"}
                      size={18}
                      color={tc("#047857")}
                    />
                    <Text className="font-semibold text-emerald-700 dark:text-emerald-300">
                      {copiedToClipboard ? "Copiado" : "Copiar codigo"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity
                className={`mt-5 rounded-2xl py-3 ${working ? "bg-emerald-300 dark:bg-emerald-700" : "bg-emerald-500"}`}
                onPress={() => void handleCreateInvite()}
                disabled={working || activeSpace?.invite_status === "pending"}
              >
                {working ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-center font-extrabold text-white">
                    {activeSpace?.invite_status === "pending" ? "Codigo listo" : "Crear codigo"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View className="mt-6 rounded-3xl border-2 border-emerald-200 bg-white p-5 dark:border-emerald-800 dark:bg-surface">
              <Text className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                Ingresa el codigo de 8 caracteres para unirte.
              </Text>
              <TextInput
                value={inviteCode}
                onChangeText={setInviteCode}
                placeholder="ABCD1234"
                placeholderTextColor={tc("#6ee7b7")}
                autoCapitalize="characters"
                className="mt-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-lg font-extrabold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100"
              />
              <TouchableOpacity
                accessibilityRole="button"
                className="mt-3 min-h-[44px] items-center justify-center"
                onPress={() => setScannerOpen(true)}
              >
                <Text className="font-extrabold text-emerald-700 dark:text-emerald-300">
                  Escanear código QR
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`mt-2 rounded-2xl py-3 ${working ? "bg-emerald-300 dark:bg-emerald-700" : "bg-emerald-500"}`}
                onPress={() => void handleJoin()}
                disabled={working}
              >
                {working ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-center font-extrabold text-white">Confirmar codigo</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          <View className="h-10" />
        </ScrollView>
      </SafeAreaView>
      {AlertComponent}
      <QrScannerModal
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onCode={(code) => setInviteCode(code)}
      />
    </>
  );
}

export default MochiDuoInviteScreen;
