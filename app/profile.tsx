import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import * as Sharing from "expo-sharing";
import { useCallback, useMemo, useRef, useState, type ComponentRef } from "react";
import { Share, Text, View } from "react-native";
import { captureRef } from "react-native-view-shot";
import { useSession } from "@/src/core/providers/SessionContext";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { reportError } from "@/src/shared/lib/observability/reportError";
import { supabase } from "@/src/shared/lib/supabase";
import { getLevelProgress, getMochiLevel, MOCHI_LEVELS } from "@/src/shared/lib/supabase/levels";
import { COLORS } from "@/src/shared/theme/tokens";
import type { Achievement, Streak, UserAchievement } from "@/src/shared/types/database";
import {
  Button,
  Caption,
  ErrorState,
  Eyebrow,
  IconTile,
  Input,
  ListGroup,
  ListRow,
  PressableScale,
  Screen,
  SectionHeader,
  Sheet,
  Skeleton,
  Stat,
  Strong,
  Surface,
  Title,
} from "@/src/shared/ui";

type Profile = {
  full_name: string;
  mochi_name: string | null;
  total_points: number;
};

export function ProfileScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [error, setError] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [shareAchievement, setShareAchievement] = useState<Achievement | null>(null);
  const [sharing, setSharing] = useState(false);
  const shareCardRef = useRef<ComponentRef<typeof View>>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const [profileRes, streakRes, userAchRes, allAchRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, mochi_name, total_points")
          .eq("id", userId)
          .single(),
        supabase.from("streaks").select("*").eq("user_id", userId).single(),
        supabase
          .from("user_achievements")
          .select("*, achievement:achievements(*)")
          .eq("user_id", userId),
        supabase.from("achievements").select("*"),
      ]);
      if (profileRes.error && profileRes.error.code !== "PGRST116") throw profileRes.error;
      if (streakRes.error && streakRes.error.code !== "PGRST116") throw streakRes.error;
      if (userAchRes.error) throw userAchRes.error;
      if (allAchRes.error) throw allAchRes.error;
      setProfile((profileRes.data as Profile | null) ?? null);
      setStreak(streakRes.data ?? null);
      setUserAchievements(userAchRes.data ?? []);
      setAllAchievements(allAchRes.data ?? []);
      setError(false);
    } catch (e) {
      reportError(e, { scope: "profile/load" });
      setError(true);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const saveName = async () => {
    if (!userId) return;
    const name = draftName.trim();
    if (name.length > 24) {
      setNameError("El nombre no puede superar 24 caracteres.");
      return;
    }
    setSavingName(true);
    setNameError(null);
    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ mochi_name: name || null })
        .eq("id", userId);
      if (updateError) throw updateError;
      setProfile((prev) => (prev ? { ...prev, mochi_name: name || null } : prev));
      setRenameOpen(false);
    } catch (e) {
      setNameError(
        e instanceof Error ? e.message : "No pudimos cambiar el nombre. Intenta de nuevo.",
      );
    } finally {
      setSavingName(false);
    }
  };

  const share = async () => {
    if (!shareAchievement) return;
    setSharing(true);
    try {
      if ((await Sharing.isAvailableAsync()) && shareCardRef.current) {
        const uri = await captureRef(shareCardRef, {
          format: "png",
          quality: 1,
          result: "tmpfile",
        });
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: shareAchievement.title,
        });
      } else {
        await Share.share({
          title: shareAchievement.title,
          message: `${shareAchievement.title}\n${shareAchievement.description}\n\n+${shareAchievement.points} puntos en Mochi`,
        });
      }
    } catch (e) {
      reportError(e, { scope: "profile/share" });
    } finally {
      setSharing(false);
    }
  };

  const unlocked = useMemo(
    () => new Set(userAchievements.map((ua) => ua.achievement_id)),
    [userAchievements],
  );
  const points = profile?.total_points ?? 0;
  const level = getMochiLevel(points);
  const progress = getLevelProgress(points);
  const nextLevel = MOCHI_LEVELS.find((item) => item.level === level.level + 1) ?? null;
  const toNext = nextLevel ? Math.max(0, nextLevel.minPoints - points) : 0;
  const mochiName = profile?.mochi_name?.trim() || "Mochi";
  const sortedAchievements = [...allAchievements].sort(
    (a, b) => Number(unlocked.has(b.id)) - Number(unlocked.has(a.id)),
  );

  return (
    <Screen
      title="Perfil"
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
      {error && !profile ? (
        <ErrorState message="No pudimos cargar tu perfil." onRetry={() => void load()} />
      ) : null}
      {!profile && !error ? <Skeleton height={260} className="mt-4 rounded-card" /> : null}

      {profile ? (
        <>
          <View className="mt-4 items-center">
            <MochiCharacter expression="proud" size={150} interactive />
            <PressableScale
              haptics="selection"
              onPress={() => {
                setDraftName(profile.mochi_name ?? "");
                setNameError(null);
                setRenameOpen(true);
              }}
              accessibilityLabel={`Cambiar el nombre de ${mochiName}`}
              className="mt-1 flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
            >
              <Title className="text-2xl leading-7">{mochiName}</Title>
              <Ionicons name="pencil" size={15} color={COLORS.accentStrong} />
            </PressableScale>
            <Caption>Compañera de {profile.full_name.split(" ")[0]}</Caption>
          </View>

          <Surface elevation={2} className="mt-5 p-[18px]">
            <View className="flex-row justify-between">
              <Stat value={String(points)} label="puntos" />
              <Stat value={String(streak?.current_streak ?? 0)} label="días de racha" />
              <Stat
                value={String(unlocked.size)}
                label={unlocked.size === 1 ? "logro" : "logros"}
              />
            </View>
            <View className="mt-4">
              <View className="flex-row items-baseline justify-between">
                <Strong>
                  Nivel {level.level} · {level.name}
                </Strong>
                {nextLevel ? (
                  <Caption>
                    {toNext} para {nextLevel.name}
                  </Caption>
                ) : (
                  <Caption>Nivel máximo</Caption>
                )}
              </View>
              <View className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface-muted">
                <View
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${Math.min(100, Math.round(progress))}%` }}
                />
              </View>
            </View>
            {streak && streak.longest_streak > 0 ? (
              <Caption className="mt-3">Tu racha más larga: {streak.longest_streak} días.</Caption>
            ) : null}
          </Surface>

          <SectionHeader title="Logros" />
          <View className="flex-row flex-wrap justify-between gap-y-3">
            {sortedAchievements.map((a) => {
              const on = unlocked.has(a.id);
              return (
                <Surface
                  key={a.id}
                  onPress={on ? () => setShareAchievement(a) : undefined}
                  accessibilityLabel={on ? `${a.title}. Compartir` : `${a.title}, bloqueado`}
                  className={`w-[48%] p-3.5 ${on ? "" : "opacity-60"}`}
                  elevation={on ? 1 : 0}
                  tone={on ? "surface" : "sunken"}
                >
                  <IconTile
                    icon={
                      on ? ((a.icon as keyof typeof Ionicons.glyphMap) ?? "trophy") : "lock-closed"
                    }
                    tint={on ? "kitchen" : "study"}
                    size={36}
                  />
                  <Strong className="mt-2.5" numberOfLines={2}>
                    {a.title}
                  </Strong>
                  <Caption numberOfLines={2}>
                    {on ? a.description : "Sigue avanzando para desbloquearlo"}
                  </Caption>
                  {on ? (
                    <Eyebrow className="mt-1.5 text-accent-strong">+{a.points} · Compartir</Eyebrow>
                  ) : null}
                </Surface>
              );
            })}
          </View>

          <SectionHeader title="Más" />
          <ListGroup>
            <ListRow
              title="Mis estadísticas"
              subtitle="Estudio, hábitos y ánimo en el tiempo"
              leading={<IconTile icon="stats-chart" tint="study" />}
              onPress={() => router.push("/analytics")}
            />
            <ListRow
              title="Ajustes"
              subtitle="Módulos, recordatorios y privacidad"
              leading={<IconTile icon="settings" tint="me" />}
              onPress={() => router.push("/settings")}
            />
          </ListGroup>
        </>
      ) : null}

      <Sheet
        visible={renameOpen}
        onClose={() => !savingName && setRenameOpen(false)}
        title="¿Cómo quieres llamarla?"
      >
        <Input
          label="Nombre de tu compañera"
          value={draftName}
          onChangeText={setDraftName}
          placeholder="Mochi"
          maxLength={24}
          error={nameError}
          autoFocus
        />
        <Button title="Guardar" loading={savingName} onPress={() => void saveName()} />
      </Sheet>

      <Sheet
        visible={Boolean(shareAchievement)}
        onClose={() => !sharing && setShareAchievement(null)}
      >
        <View
          ref={shareCardRef}
          collapsable={false}
          className="items-center rounded-card bg-tint-duo px-5 py-6"
        >
          <MochiCharacter expression="celebrating" size={110} animated={false} />
          <Eyebrow className="mt-2 text-tint-duo-ink">Logro desbloqueado</Eyebrow>
          <Title className="mt-1 text-center">{shareAchievement?.title ?? ""}</Title>
          <Caption className="mt-1.5 text-center text-ink">
            {shareAchievement?.description ?? ""}
          </Caption>
          <View className="mt-3 rounded-full bg-surface px-4 py-1.5">
            <Text className="font-body-extrabold text-xs text-ink">
              +{shareAchievement?.points ?? 0} puntos
            </Text>
          </View>
          <Caption className="mt-3">{(profile?.full_name ?? "Mi progreso") + " en Mochi"}</Caption>
        </View>
        <View className="mt-4">
          <Button title="Compartir" loading={sharing} onPress={() => void share()} />
        </View>
      </Sheet>
    </Screen>
  );
}

export default ProfileScreen;
