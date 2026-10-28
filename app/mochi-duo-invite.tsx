import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Share, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useSession } from "@/src/core/providers/SessionContext";
import { QrScannerModal } from "@/src/features/duo/QrScannerModal";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { track } from "@/src/shared/lib/observability/analytics";
import { reportError } from "@/src/shared/lib/observability/reportError";
import { supabase } from "@/src/shared/lib/supabase";
import { COLORS } from "@/src/shared/theme/tokens";
import type { PartnerSpace } from "@/src/shared/types/database";
import {
  Button,
  Caption,
  ELEVATION,
  Input,
  MochiBubble,
  PressableScale,
  Screen,
  Surface,
  haptic,
} from "@/src/shared/ui";

type Mode = "create" | "join";

export function MochiDuoInviteScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const [mode, setMode] = useState<Mode>("create");
  const [code, setCode] = useState("");
  const [space, setSpace] = useState<PartnerSpace | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [working, setWorking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from("partner_spaces")
        .select("*")
        .or(`owner_user_id.eq.${userId},partner_user_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      setSpace((data as PartnerSpace | null) ?? null);
    } catch (e) {
      reportError(e, { scope: "duo-invite/load" });
      setSpace(null);
    } finally {
      setLoaded(true);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const createInvite = async () => {
    setWorking(true);
    try {
      const { error } = await supabase.rpc("create_partner_invite");
      if (error) throw error;
      haptic("success");
      await load();
    } catch (e) {
      Alert.alert(
        "No se pudo crear",
        e instanceof Error ? e.message : "Intenta de nuevo en unos segundos.",
      );
    } finally {
      setWorking(false);
    }
  };

  const copy = async () => {
    if (!space?.invite_code) return;
    await Clipboard.setStringAsync(space.invite_code);
    haptic("success");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareCode = async () => {
    if (!space?.invite_code) return;
    try {
      await Share.share({
        message: `Únete a mi Mochi Duo: descarga Mochi, elige «Me invitó mi pareja» y escribe el código ${space.invite_code}`,
      });
    } catch (e) {
      reportError(e, { scope: "duo-invite/share" });
    }
  };

  const join = async () => {
    const value = code.trim().toUpperCase();
    if (!value) {
      Alert.alert("Falta el código", "Escribe el código que te compartió tu pareja.");
      return;
    }
    setWorking(true);
    try {
      const { data, error } = await supabase.rpc("accept_partner_invite", { p_invite_code: value });
      if (error) throw error;
      if (data) {
        track("duo_linked");
        haptic("success");
        router.replace("/(tabs)/duo");
      }
    } catch (e) {
      Alert.alert(
        "No se pudo unir",
        e instanceof Error && /invitaci|codigo|código/i.test(e.message)
          ? "Ese código no funciona: puede estar vencido o ya usado. Pídele uno nuevo."
          : e instanceof Error
            ? e.message
            : "Verifica el código e intenta de nuevo.",
      );
    } finally {
      setWorking(false);
    }
  };

  const close = (
    <PressableScale
      onPress={() => router.back()}
      accessibilityLabel="Volver"
      className="h-10 w-10 items-center justify-center rounded-full bg-surface-muted"
    >
      <Ionicons name="close" size={20} color={COLORS.inkMuted} />
    </PressableScale>
  );

  if (loaded && space?.invite_status === "accepted") {
    return (
      <Screen title="Duo" withTabBar={false} headerRight={close}>
        <View className="mt-8 items-center">
          <MochiCharacter expression="love" size={170} interactive />
        </View>
        <MochiBubble
          className="mt-2"
          text="¡Ya están conectados! Todo lo de los dos vive en la pestaña Duo."
        />
        <View className="mt-6">
          <Button title="Ir a Duo" onPress={() => router.replace("/(tabs)/duo")} />
        </View>
      </Screen>
    );
  }

  const pendingCode = space?.invite_status === "pending" ? space.invite_code : null;

  return (
    <Screen title="Invitar a mi pareja" withTabBar={false} headerRight={close}>
      <View
        className="mt-3 flex-row rounded-control bg-surface-muted p-1"
        accessibilityRole="tablist"
      >
        {(["create", "join"] as const).map((value) => {
          const on = mode === value;
          return (
            <PressableScale
              key={value}
              haptics="selection"
              onPress={() => setMode(value)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              className={`flex-1 items-center rounded-[14px] py-2.5 ${on ? "bg-surface" : "bg-surface-muted"}`}
              style={on ? ELEVATION[1] : undefined}
            >
              <Text className={`font-body-extrabold text-sm ${on ? "text-ink" : "text-ink-muted"}`}>
                {value === "create" ? "Invitar" : "Tengo un código"}
              </Text>
            </PressableScale>
          );
        })}
      </View>

      {mode === "create" ? (
        pendingCode ? (
          <>
            <Surface elevation={2} className="mt-5 items-center p-6">
              <View className="rounded-[20px] bg-white p-3">
                <QRCode
                  value={pendingCode}
                  size={170}
                  color={COLORS.ink}
                  backgroundColor="#FFFFFF"
                />
              </View>
              <Text
                className="mt-4 font-display text-[34px] tracking-[6px] text-ink"
                accessibilityLabel={`Código ${pendingCode.split("").join(" ")}`}
              >
                {pendingCode}
              </Text>
              <Caption className="mt-1 text-center">
                Vale por 7 días. Tu pareja lo escanea o lo escribe.
              </Caption>
            </Surface>
            <View className="mt-4 gap-2">
              <Button title="Compartir código" onPress={() => void shareCode()} />
              <Button
                title={copied ? "Copiado" : "Copiar código"}
                variant="soft"
                onPress={() => void copy()}
              />
            </View>
          </>
        ) : (
          <>
            <View className="mt-5 flex-row items-end gap-2.5">
              <MochiCharacter expression="love" size={96} interactive />
              <MochiBubble
                className="flex-1"
                tail="left"
                text="Crea un código y compártelo con tu pareja. Solo verá lo que tú decidas."
              />
            </View>
            <View className="mt-6">
              <Button
                title="Crear código de invitación"
                loading={working}
                onPress={() => void createInvite()}
              />
            </View>
          </>
        )
      ) : (
        <>
          <View className="mt-5 flex-row items-end gap-2.5">
            <MochiCharacter expression="happy" size={96} interactive />
            <MochiBubble
              className="flex-1"
              tail="left"
              text="Escribe el código que te compartieron o escanea su QR."
            />
          </View>
          <View className="mt-5">
            <Input
              label="Código de invitación"
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase())}
              placeholder="M7K2Q9"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={12}
            />
            <View className="gap-2">
              <Button title="Unirme" loading={working} onPress={() => void join()} />
              <Button title="Escanear su QR" variant="soft" onPress={() => setScannerOpen(true)} />
            </View>
          </View>
        </>
      )}

      <QrScannerModal
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onCode={(value) => setCode(value.toUpperCase())}
      />
    </Screen>
  );
}

export default MochiDuoInviteScreen;
