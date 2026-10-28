import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { useSession } from "@/src/core/providers/SessionContext";
import { MoodFace } from "@/src/features/today/MoodFace";
import type { Mood } from "@/src/features/companion/lines";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { energyProfileFromPhase } from "@/src/shared/lib/ai";
import { toLocalISODate } from "@/src/shared/lib/dates";
import { reportError } from "@/src/shared/lib/observability/reportError";
import {
  Button,
  Caption,
  ELEVATION,
  Eyebrow,
  IconTile,
  Input,
  ListGroup,
  ListRow,
  MochiBubble,
  MochiQuote,
  PressableScale,
  ProgressRing,
  Screen,
  SectionHeader,
  Sheet,
  Strong,
  Surface,
  Title,
  haptic,
} from "@/src/shared/ui";
import {
  loadDuo,
  markNotesRead,
  redeemVoucher,
  sendNote,
  shareCheckin,
  type DuoState,
  type DuoVoucher,
} from "./api";
import { PartnerVoucherModal } from "./PartnerVoucherModal";
import { ENERGY_LABEL, tipFor } from "./partnerTips";

const MOODS: Mood[] = [1, 2, 3, 4, 5];
const MOOD_WORD: Record<Mood, string> = {
  1: "Muy mal",
  2: "Mal",
  3: "Tranquila",
  4: "Contenta",
  5: "Feliz",
};
const MOOD_WORD_HIM: Record<Mood, string> = {
  1: "Muy mal",
  2: "Mal",
  3: "Tranquilo",
  4: "Contento",
  5: "Feliz",
};

function asMood(value: number | null | undefined): Mood | null {
  return value && value >= 1 && value <= 5 ? (value as Mood) : null;
}

function Avatar({ name, tone }: { name: string; tone: "me" | "study" }) {
  return (
    <View
      className={`h-10 w-10 items-center justify-center rounded-full border-[3px] border-canvas ${tone === "me" ? "bg-tint-me" : "bg-tint-study"}`}
    >
      <Text className={`font-display text-base ${tone === "me" ? "text-tint-me-ink" : "text-tint-study-ink"}`}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

/** Duo: la relación como un lugar cálido. Ella y él ven lo mismo desde su lado. */
export function DuoScreen() {
  const { session, appMode } = useSession();
  const userId = session?.user.id;
  const [state, setState] = useState<DuoState | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [sending, setSending] = useState(false);
  const [voucherOpen, setVoucherOpen] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const next = await loadDuo(userId);
      setState(next);
      if (next.space && next.partnerModeReady) void markNotesRead(next.space.id).catch(() => {});
    } catch (error) {
      reportError(error, { scope: "duo/load" });
    } finally {
      setRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const space = state?.space ?? null;
  const other = space ? (space.isOwner ? space.partner : space.owner) : null;
  const myCheckin = state?.checkins.find((c) => c.userId === userId);
  const theirCheckin = state?.checkins.find((c) => c.userId !== userId);

  const share = (mood: Mood) => {
    if (!space || !state) return;
    haptic("success");
    setState({
      ...state,
      checkins: [...state.checkins.filter((c) => c.userId !== userId), { userId: userId ?? "", mood, note: myCheckin?.note ?? null }],
    });
    shareCheckin(space.id, mood).catch((error) => {
      reportError(error, { scope: "duo/checkin" });
      void load();
    });
  };

  const submitNote = async () => {
    if (!space || !noteText.trim()) return;
    setSending(true);
    try {
      await sendNote(space.id, noteText.trim());
      haptic("success");
      setNoteText("");
      setNoteOpen(false);
      void load();
    } catch (error) {
      reportError(error, { scope: "duo/note" });
      Alert.alert("No se pudo enviar", error instanceof Error ? error.message : "Intenta de nuevo.");
    } finally {
      setSending(false);
    }
  };

  const askRedeem = (voucher: DuoVoucher) => {
    if (!space?.isOwner || voucher.isRedeemed) return;
    const cost = voucher.mode === "points" ? ` Cuesta ${voucher.pointsCost} puntos.` : "";
    Alert.alert("Canjear vale", `«${voucher.title}».${cost}`, [
      { text: "Ahora no", style: "cancel" },
      {
        text: "Canjear",
        onPress: () =>
          void redeemVoucher(voucher.id)
            .then(() => {
              haptic("success");
              void load();
            })
            .catch((error) => {
              reportError(error, { scope: "duo/redeem" });
              Alert.alert("No se pudo canjear", error instanceof Error ? error.message : "Intenta de nuevo.");
            }),
      },
    ]);
  };

  const header =
    space && other ? (
      <View className="flex-row">
        <Avatar name={space.owner.name} tone="me" />
        <View className="-ml-3">
          <Avatar name={space.partner?.name ?? "?"} tone="study" />
        </View>
      </View>
    ) : null;

  if (state && (!space || space.inviteStatus !== "accepted")) {
    return (
      <Screen title="Duo">
        <View className="mt-6 items-center">
          <MochiCharacter expression="love" size={170} interactive />
        </View>
        <MochiBubble
          className="mt-2"
          text={
            space
              ? `Tu invitación está lista. Comparte el código ${space.inviteCode} con tu pareja.`
              : "Duo es un lugar para los dos: notas, ánimo del día, metas y vales para regalarse."
          }
        />
        <View className="mt-6">
          <Button
            title={space ? "Ver invitación" : "Invitar a mi pareja"}
            onPress={() => router.push("/mochi-duo-invite")}
          />
        </View>
      </Screen>
    );
  }

  const pendingVouchers = state?.vouchers.filter((v) => !v.isRedeemed) ?? [];
  const energy = !space?.isOwner ? energyProfileFromPhase(state?.snapshot?.cyclePhase) : undefined;
  const herMood = asMood(theirCheckin?.mood ?? state?.snapshot?.moodLast);
  const today = toLocalISODate(new Date());

  return (
    <Screen
      title="Duo"
      headerRight={header}
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        void load();
      }}
    >
      {space && other ? (
        <>
          {space.isOwner ? (
            <Surface elevation={2} className="mt-4 flex-row items-center gap-3.5 p-[18px]">
              {asMood(theirCheckin?.mood) ? (
                <MoodFace mood={asMood(theirCheckin?.mood) as Mood} size={54} />
              ) : (
                <MochiCharacter expression="thinking" size={58} animated={false} />
              )}
              <View className="min-w-0 flex-1">
                <Eyebrow>{other.name} hoy</Eyebrow>
                <Strong className="mt-0.5 text-[17px]">
                  {asMood(theirCheckin?.mood)
                    ? MOOD_WORD_HIM[asMood(theirCheckin?.mood) as Mood]
                    : "Aún no cuenta cómo está"}
                </Strong>
                {theirCheckin?.note ? (
                  <MochiQuote className="mt-1 text-[15.5px] leading-[21px]">“{theirCheckin.note}”</MochiQuote>
                ) : null}
              </View>
            </Surface>
          ) : (
            <View className="mt-4 rounded-card bg-tint-duo p-5" style={ELEVATION[2]}>
              <View className="flex-row items-center gap-3">
                <View className="min-w-0 flex-1">
                  <Eyebrow className="text-tint-duo-ink">{other.name} hoy</Eyebrow>
                  <Title className="mt-1.5 text-2xl leading-7">
                    {energy ? ENERGY_LABEL[energy] : herMood ? MOOD_WORD[herMood] : "Sin novedades"}
                  </Title>
                </View>
                <MochiCharacter
                  expression={energy === "baja" ? "sleepy" : energy === "alta" ? "excited" : "happy"}
                  size={84}
                  animated={false}
                  shadow={false}
                />
              </View>
              <MochiQuote className="mt-3 text-[17px] leading-[23px]">
                {energy
                  ? tipFor(energy, today)
                  : `Cuando ${other.name} comparta cómo está, aquí verás ideas para acompañarla.`}
              </MochiQuote>
            </View>
          )}

          {state?.partnerModeReady ? (
            <>
              <SectionHeader title={space.isOwner ? "¿Cómo estás hoy?" : "¿Y tú cómo estás?"} />
              <View className="flex-row justify-between" accessibilityRole="radiogroup">
                {MOODS.map((value) => {
                  const on = myCheckin?.mood === value;
                  return (
                    <PressableScale
                      key={value}
                      haptics={false}
                      onPress={() => share(value)}
                      accessibilityRole="radio"
                      accessibilityLabel={MOOD_WORD[value]}
                      accessibilityState={{ selected: on }}
                      className={`h-[54px] w-[54px] items-center justify-center rounded-[18px] ${on ? "bg-accent" : "bg-surface"}`}
                      style={on ? undefined : ELEVATION[1]}
                    >
                      <MoodFace mood={value} />
                    </PressableScale>
                  );
                })}
              </View>
              <Caption className="ml-1 mt-2">{other.name} verá cómo estás hoy.</Caption>

              <SectionHeader title="Notas" actionLabel="Escribir" onAction={() => setNoteOpen(true)} />
              {state.notes.length === 0 ? (
                <Surface tone="sunken" className="p-4">
                  <Caption>Aún no hay notas. Escríbele algo bonito a {other.name}.</Caption>
                </Surface>
              ) : (
                <View className="gap-2">
                  {[...state.notes].slice(0, 4).reverse().map((note) => {
                    const mine = note.authorId === userId;
                    return (
                      <View
                        key={note.id}
                        className={`max-w-[80%] px-3.5 py-2.5 ${mine ? "self-end rounded-[20px] rounded-br-md bg-accent" : "self-start rounded-[20px] rounded-bl-md bg-surface"}`}
                        style={mine ? undefined : ELEVATION[1]}
                      >
                        <Text className={`font-body-bold text-[15px] leading-5 ${mine ? "text-accent-ink" : "text-ink"}`}>
                          {note.content}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          ) : null}

          <SectionHeader
            title={space.isOwner ? "Vales" : "Vales para ella"}
            actionLabel="Ver todos"
            onAction={() => router.push("/vouchers")}
          />
          {pendingVouchers.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="-mx-5"
              contentContainerStyle={{ paddingHorizontal: 20, gap: 14, paddingVertical: 4 }}
            >
              {pendingVouchers.map((voucher, index) => (
                <PressableScale
                  key={voucher.id}
                  scaleTo={0.98}
                  onPress={space.isOwner ? () => askRedeem(voucher) : undefined}
                  accessibilityLabel={`Vale: ${voucher.title}`}
                  className={`h-[118px] w-[200px] justify-between rounded-[22px] p-3.5 ${index % 2 === 0 ? "bg-tint-duo" : "bg-tint-kitchen"}`}
                  style={ELEVATION[1]}
                >
                  <View>
                    <Eyebrow className={index % 2 === 0 ? "text-tint-duo-ink" : "text-tint-kitchen-ink"}>
                      {voucher.mode === "points" ? `${voucher.pointsCost} puntos` : "Regalo"}
                    </Eyebrow>
                    <Text numberOfLines={2} className="mt-1.5 font-display text-[19px] leading-[22px] text-ink">
                      {voucher.title}
                    </Text>
                  </View>
                  {space.isOwner ? (
                    <Text className="font-body-extrabold text-[12.5px] text-accent-strong">Canjear</Text>
                  ) : null}
                </PressableScale>
              ))}
            </ScrollView>
          ) : (
            <Surface tone="sunken" className="p-4">
              <Caption>
                {space.isOwner
                  ? `Cuando ${other.name} te regale un vale, aparecerá aquí.`
                  : "Aún no hay vales. Regálale uno."}
              </Caption>
            </Surface>
          )}
          {!space.isOwner ? (
            <ListGroup className="mt-3">
              <ListRow
                title="Regálale un vale"
                subtitle="Una cena, un masaje, una tarde sin celulares"
                leading={<IconTile icon="gift" tint="duo" />}
                onPress={() => setVoucherOpen(true)}
              />
            </ListGroup>
          ) : null}

          {state && state.goals.length > 0 ? (
            <>
              <SectionHeader title="Metas juntos" />
              <ListGroup>
                {state.goals.slice(0, 3).map((goal) => (
                  <ListRow
                    key={goal.id}
                    title={goal.title}
                    subtitle={goal.isCompleted ? "¡Cumplida!" : `${goal.progress}% completado`}
                    leading={<IconTile icon="flag" tint="kitchen" />}
                    trailing={<ProgressRing progress={goal.progress / 100} accessibilityLabel={goal.title} />}
                  />
                ))}
              </ListGroup>
            </>
          ) : null}

          <SectionHeader title="Ajustes de Duo" />
          <ListGroup>
            <ListRow
              title={space.isOwner ? `Qué compartes con ${other.name}` : "Metas, privacidad y más"}
              subtitle="Privacidad, metas juntos y el espacio"
              leading={<IconTile icon="lock-closed" tint="study" />}
              onPress={() => router.push("/mochi-duo")}
            />
            {appMode === "partner" ? (
              <ListRow
                title="Activar módulos para mí"
                subtitle="Hábitos, estudio, cocina y más"
                leading={<IconTile icon="sparkles" tint="ok" />}
                onPress={() => router.push("/settings")}
              />
            ) : null}
          </ListGroup>

          <Sheet visible={noteOpen} onClose={() => setNoteOpen(false)} title={`Nota para ${other.name}`}>
            <Input
              label="Tu nota"
              value={noteText}
              onChangeText={setNoteText}
              placeholder="Mucha suerte hoy, tú puedes"
              maxLength={500}
              multiline
              autoFocus
            />
            <Button title="Enviar" loading={sending} disabled={!noteText.trim()} onPress={() => void submitNote()} />
          </Sheet>
          {!space.isOwner ? (
            <PartnerVoucherModal
              visible={voucherOpen}
              spaceId={space.id}
              onClose={() => setVoucherOpen(false)}
              onCreated={() => {
                setVoucherOpen(false);
                haptic("success");
                void load();
              }}
            />
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
