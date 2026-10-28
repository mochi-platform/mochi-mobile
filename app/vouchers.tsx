import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import * as Sharing from "expo-sharing";
import { useCallback, useRef, useState, type ComponentRef } from "react";
import { Alert, Share, Text, View } from "react-native";
import { captureRef } from "react-native-view-shot";
import { useSession } from "@/src/core/providers/SessionContext";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { reportError } from "@/src/shared/lib/observability/reportError";
import { supabase } from "@/src/shared/lib/supabase";
import { COLORS } from "@/src/shared/theme/tokens";
import type { Voucher, VoucherTemplate } from "@/src/shared/types/database";
import {
  Button,
  Caption,
  ELEVATION,
  ErrorState,
  Eyebrow,
  IconTile,
  ListGroup,
  ListRow,
  MochiBubble,
  PressableScale,
  Screen,
  SectionHeader,
  Sheet,
  Stat,
  Surface,
  Title,
  haptic,
} from "@/src/shared/ui";

const VOUCHER_COLUMNS =
  "id, user_id, title, description, points_cost, icon, color, is_redeemed, redeemed_at, created_at, space_id, redeemed_by, updated_by_partner, created_by, mode, image_url";

type Data = {
  templates: VoucherTemplate[];
  mine: Voucher[];
  shared: Voucher[];
  points: number;
  isPartner: boolean;
};

async function fetchVouchers(userId: string): Promise<Data> {
  const [templates, mine, profile, space] = await Promise.all([
    supabase
      .from("voucher_templates")
      .select("id, title, description, points_cost, icon, color")
      .order("points_cost", { ascending: true }),
    supabase
      .from("vouchers")
      .select(VOUCHER_COLUMNS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("total_points").eq("id", userId).single(),
    supabase
      .from("partner_spaces")
      .select("id, partner_user_id")
      .or(`owner_user_id.eq.${userId},partner_user_id.eq.${userId}`)
      .eq("invite_status", "accepted")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (templates.error) throw templates.error;
  if (mine.error) throw mine.error;
  if (profile.error) throw profile.error;
  let shared: Voucher[] = [];
  const isPartner = space.data?.partner_user_id === userId;
  if (space.data && isPartner) {
    const res = await supabase
      .from("vouchers")
      .select(VOUCHER_COLUMNS)
      .eq("space_id", space.data.id)
      .order("created_at", { ascending: false });
    if (res.error) throw res.error;
    shared = (res.data ?? []) as Voucher[];
  }
  return {
    templates: (templates.data ?? []) as VoucherTemplate[],
    mine: (mine.data ?? []) as Voucher[],
    shared,
    points: profile.data?.total_points ?? 0,
    isPartner,
  };
}

function Ticket({
  voucher,
  tone,
  onPress,
}: {
  voucher: Voucher;
  tone: number;
  onPress: () => void;
}) {
  const duo = tone % 2 === 0;
  return (
    <PressableScale
      scaleTo={0.98}
      onPress={onPress}
      accessibilityLabel={`Vale: ${voucher.title}${voucher.is_redeemed ? ", canjeado" : ""}`}
      className={`h-[124px] w-[48%] justify-between rounded-[22px] p-3.5 ${duo ? "bg-tint-duo" : "bg-tint-kitchen"} ${voucher.is_redeemed ? "opacity-50" : ""}`}
      style={ELEVATION[1]}
    >
      <View>
        <Eyebrow className={duo ? "text-tint-duo-ink" : "text-tint-kitchen-ink"}>
          {voucher.is_redeemed
            ? "Canjeado"
            : voucher.mode === "gift"
              ? "Regalo"
              : `${voucher.points_cost} puntos`}
        </Eyebrow>
        <Text numberOfLines={3} className="mt-1.5 font-display text-[17px] leading-[20px] text-ink">
          {voucher.title}
        </Text>
      </View>
      <Ionicons
        name={voucher.is_redeemed ? "checkmark-circle" : "ticket"}
        size={18}
        color={COLORS.inkMuted}
      />
    </PressableScale>
  );
}

export function VouchersScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const [open, setOpen] = useState<Voucher | null>(null);
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef<ComponentRef<typeof View>>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      setData(await fetchVouchers(userId));
      setError(false);
    } catch (e) {
      reportError(e, { scope: "vouchers/load" });
      setError(true);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const generate = async (template: VoucherTemplate) => {
    if (!data) return;
    if (data.points < template.points_cost) {
      Alert.alert(
        "Te faltan puntos",
        `Necesitas ${template.points_cost - data.points} puntos más para este vale.`,
      );
      return;
    }
    setWorking(template.id);
    try {
      const { error: rpcError } = await supabase.rpc("generate_voucher", {
        p_template_id: template.id,
      });
      if (rpcError) throw rpcError;
      haptic("success");
      await load();
    } catch (e) {
      reportError(e, { scope: "vouchers/generate" });
      Alert.alert("No se pudo crear el vale", e instanceof Error ? e.message : "Intenta de nuevo.");
    } finally {
      setWorking(null);
    }
  };

  const redeem = (voucher: Voucher) => {
    Alert.alert("Canjear vale", `¿Marcar «${voucher.title}» como canjeado?`, [
      { text: "Ahora no", style: "cancel" },
      {
        text: "Canjear",
        onPress: () =>
          void (async () => {
            try {
              const { error: rpcError } = await supabase.rpc("redeem_voucher", {
                p_voucher_id: voucher.id,
              });
              if (rpcError) throw rpcError;
              haptic("success");
              setOpen(null);
              await load();
            } catch (e) {
              reportError(e, { scope: "vouchers/redeem" });
              Alert.alert(
                "No se pudo canjear",
                e instanceof Error ? e.message : "Intenta de nuevo.",
              );
            }
          })(),
      },
    ]);
  };

  const share = async () => {
    if (!open) return;
    setSharing(true);
    try {
      if ((await Sharing.isAvailableAsync()) && cardRef.current) {
        const uri = await captureRef(cardRef, { format: "png", quality: 1, result: "tmpfile" });
        await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: open.title });
      } else {
        await Share.share({
          title: open.title,
          message: `${open.title}\n${open.description ?? ""}\n\nUn vale de Mochi`,
        });
      }
    } catch (e) {
      reportError(e, { scope: "vouchers/share" });
    } finally {
      setSharing(false);
    }
  };

  const vouchers = data ? (data.isPartner ? data.shared : data.mine) : [];
  const pending = vouchers.filter((v) => !v.is_redeemed);
  const redeemed = vouchers.filter((v) => v.is_redeemed).slice(0, 6);

  return (
    <Screen
      title="Vales"
      withTabBar={false}
      headerRight={
        <PressableScale
          onPress={() => router.back()}
          accessibilityLabel="Volver"
          className="h-10 w-10 items-center justify-center rounded-full bg-surface-muted"
        >
          <Ionicons name="close" size={20} color={COLORS.inkMuted} />
        </PressableScale>
      }
    >
      {error && !data ? (
        <ErrorState message="No pudimos cargar los vales." onRetry={() => void load()} />
      ) : null}

      {data ? (
        <>
          <Surface elevation={2} className="mt-4 flex-row items-center gap-3 p-4">
            <MochiCharacter expression="love" size={84} animated={false} shadow={false} />
            <View className="min-w-0 flex-1">
              <Stat value={String(data.points)} label="puntos para canjear" />
              <Caption className="mt-1">
                {data.isPartner
                  ? "Aquí ves los vales que le regalaste."
                  : "Los ganas cumpliendo hábitos, metas y más."}
              </Caption>
            </View>
          </Surface>

          <SectionHeader title={data.isPartner ? "Vales que regalaste" : "Tus vales"} />
          {pending.length > 0 ? (
            <View className="flex-row flex-wrap justify-between gap-y-3">
              {pending.map((v, i) => (
                <Ticket key={v.id} voucher={v} tone={i} onPress={() => setOpen(v)} />
              ))}
            </View>
          ) : (
            <MochiBubble
              tail="none"
              text={
                data.isPartner
                  ? "Aún no hay vales pendientes. Regálale uno desde Duo."
                  : "Todavía no tienes vales. Canjea uno con tus puntos o espera un regalo."
              }
            />
          )}

          {!data.isPartner && data.templates.length > 0 ? (
            <>
              <SectionHeader title="Canjear con puntos" />
              <ListGroup>
                {data.templates.map((t) => {
                  const enough = data.points >= t.points_cost;
                  return (
                    <ListRow
                      key={t.id}
                      title={t.title}
                      subtitle={t.description ?? undefined}
                      leading={<IconTile icon="gift" tint={enough ? "duo" : "study"} />}
                      trailing={
                        <Text
                          className={`font-body-extrabold text-sm ${enough ? "text-accent-strong" : "text-ink-faint"}`}
                        >
                          {working === t.id ? "…" : `${t.points_cost} pts`}
                        </Text>
                      }
                      onPress={() => void generate(t)}
                      accessibilityLabel={`${t.title}, ${t.points_cost} puntos`}
                    />
                  );
                })}
              </ListGroup>
            </>
          ) : null}

          {redeemed.length > 0 ? (
            <>
              <SectionHeader title="Ya canjeados" />
              <View className="flex-row flex-wrap justify-between gap-y-3">
                {redeemed.map((v, i) => (
                  <Ticket key={v.id} voucher={v} tone={i + 1} onPress={() => setOpen(v)} />
                ))}
              </View>
            </>
          ) : null}
        </>
      ) : null}

      <Sheet visible={open !== null} onClose={() => !sharing && setOpen(null)}>
        <View
          ref={cardRef}
          collapsable={false}
          className="items-center rounded-card bg-tint-duo px-5 py-6"
        >
          <MochiCharacter expression="love" size={96} animated={false} />
          <Eyebrow className="mt-2 text-tint-duo-ink">Vale de Mochi</Eyebrow>
          <Title className="mt-1 text-center">{open?.title ?? ""}</Title>
          {open?.description ? (
            <Caption className="mt-1.5 text-center text-ink">{open.description}</Caption>
          ) : null}
        </View>
        <View className="mt-4 gap-2">
          {open && !open.is_redeemed && !data?.isPartner ? (
            <Button title="Marcar como canjeado" onPress={() => redeem(open)} />
          ) : null}
          <Button title="Compartir" variant="soft" loading={sharing} onPress={() => void share()} />
        </View>
      </Sheet>
    </Screen>
  );
}

export default VouchersScreen;
