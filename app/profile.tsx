import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { supabase } from "@/src/shared/lib/supabase";
import {
  getLevelProgress,
  getMochiLevel,
  MOCHI_LEVELS,
} from "@mochi/supabase/levels";
import { useSession } from "@/src/core/providers/SessionContext";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import type {
  Achievement,
  UserAchievement,
  Streak,
} from "@/src/shared/types/database";

interface Profile {
  full_name: string;
  mochi_name: string | null;
  total_points: number;
  wake_up_time: string | null;
}

export function ProfileScreen() {
  const { session } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>(
    [],
  );
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNameModalVisible, setIsNameModalVisible] = useState(false);
  const [draftMochiName, setDraftMochiName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);

  const loadingScale = useSharedValue(1);

  useEffect(() => {
    if (loading) {
      loadingScale.value = withRepeat(
        withSequence(
          withTiming(1.06, {
            duration: 650,
            easing: Easing.inOut(Easing.quad),
          }),
          withTiming(1, { duration: 650, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
    } else {
      loadingScale.value = withTiming(1, { duration: 180 });
    }
  }, [loading, loadingScale]);

  const loadingAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: loadingScale.value }],
  }));

  const loadProfile = useCallback(async () => {
    const userId = session?.user.id;
    if (!userId) {
      setProfile(null);
      setStreak(null);
      setUserAchievements([]);
      setAllAchievements([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [profileRes, streakRes, userAchRes, allAchRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, mochi_name, total_points, wake_up_time")
          .eq("id", userId)
          .single(),
        supabase.from("streaks").select("*").eq("user_id", userId).single(),
        supabase
          .from("user_achievements")
          .select("*, achievement:achievements(*)")
          .eq("user_id", userId),
        supabase.from("achievements").select("*"),
      ]);

      if (profileRes.error && profileRes.error.code !== "PGRST116")
        throw profileRes.error;
      if (streakRes.error && streakRes.error.code !== "PGRST116")
        throw streakRes.error;
      if (userAchRes.error) throw userAchRes.error;
      if (allAchRes.error) throw allAchRes.error;

      setProfile(profileRes.data ?? null);
      setStreak(streakRes.data ?? null);
      setUserAchievements(userAchRes.data ?? []);
      setAllAchievements(allAchRes.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando perfil");
      setProfile(null);
      setStreak(null);
      setUserAchievements([]);
      setAllAchievements([]);
    } finally {
      setLoading(false);
    }
  }, [session?.user.id]);

  const openEditNameModal = useCallback(() => {
    setDraftMochiName((profile?.mochi_name ?? "").trim());
    setNameError(null);
    setIsNameModalVisible(true);
  }, [profile?.mochi_name]);

  const closeEditNameModal = useCallback(() => {
    if (savingName) return;
    setIsNameModalVisible(false);
    setNameError(null);
  }, [savingName]);

  const saveMochiName = useCallback(async () => {
    const userId = session?.user.id;
    if (!userId) return;

    const trimmedName = draftMochiName.trim();
    if (trimmedName.length > 24) {
      setNameError("El nombre no puede superar 24 caracteres.");
      return;
    }

    try {
      setSavingName(true);
      setNameError(null);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ mochi_name: trimmedName.length > 0 ? trimmedName : null })
        .eq("id", userId);

      if (updateError) throw updateError;

      setProfile((prev) =>
        prev
          ? { ...prev, mochi_name: trimmedName.length > 0 ? trimmedName : null }
          : prev,
      );
      setIsNameModalVisible(false);
    } catch (err) {
      setNameError(
        err instanceof Error
          ? err.message
          : "No pudimos actualizar el nombre. Intenta de nuevo.",
      );
    } finally {
      setSavingName(false);
    }
  }, [draftMochiName, session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile]),
  );

  const unlockedIds = useMemo(
    () => new Set(userAchievements.map((ua) => ua.achievement_id)),
    [userAchievements],
  );
  const totalPoints = profile?.total_points ?? 0;
  const level = getMochiLevel(totalPoints);
  const levelProgress = getLevelProgress(totalPoints);
  const nextLevel =
    MOCHI_LEVELS.find((item) => item.level === level.level + 1) ?? null;
  const pointsToNext = nextLevel
    ? Math.max(0, nextLevel.minPoints - totalPoints)
    : 0;

  if (loading && !profile) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-purple-50">
        <Animated.View style={loadingAnimatedStyle}>
          <MochiCharacter mood="thinking" size={96} />
        </Animated.View>
        <Text className="mt-4 text-sm font-semibold text-purple-700">
          Cargando perfil...
        </Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-purple-50 px-6">
        <MochiCharacter mood="sleepy" size={80} />
        <Text className="mt-4 text-center text-sm font-semibold text-red-600">
          {error}
        </Text>
        <TouchableOpacity
          className="mt-6 rounded-2xl bg-purple-500 px-6 py-3"
          onPress={() => void loadProfile()}
        >
          <Text className="font-bold text-white">Reintentar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-purple-50">
      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          className="mt-4 flex-row items-center"
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color="#7c3aed" />
          <Text className="ml-1 font-bold text-purple-700">Volver</Text>
        </TouchableOpacity>

        <View className="mt-6 items-center">
          <MochiCharacter mood="happy" size={80} />
          <Text className="mt-4 text-2xl font-extrabold text-purple-900">
            {(profile?.mochi_name ?? "").trim() || "Mochi"}
          </Text>

          <TouchableOpacity
            className="mt-2 flex-row items-center rounded-full border border-purple-200 bg-white px-4 py-2"
            onPress={openEditNameModal}
            activeOpacity={0.85}
          >
            <Ionicons name="create" size={14} color="#7c3aed" />
            <Text className="ml-1.5 text-xs font-bold text-purple-800">
              Renombrar
            </Text>
          </TouchableOpacity>

          <View className="mt-3 flex-row items-center">
            <View className="mr-3 flex-row items-center rounded-full bg-yellow-200 px-4 py-2">
              {loading ? (
                <ActivityIndicator size="small" color="#92400e" />
              ) : (
                <Ionicons name="star" size={14} color="#92400e" />
              )}
              <Text className="ml-1 font-extrabold text-yellow-900">
                {profile?.total_points ?? 0} puntos
              </Text>
            </View>
            <View className="flex-row items-center rounded-full bg-orange-100 px-4 py-2">
              <Ionicons name="flame" size={14} color="#ea580c" />
              <Text className="ml-1 font-extrabold text-orange-800">
                {streak?.current_streak ?? 0} días
              </Text>
            </View>
          </View>

          <View className="mt-3 w-full rounded-2xl border border-purple-200 bg-purple-100 px-3 py-3">
            <Text className="text-xs font-bold text-purple-700">
              Nivel {level.level} · {level.name}
            </Text>
            <View className="mt-2 h-2 w-full rounded-full bg-purple-200">
              <View
                className="h-2 rounded-full bg-purple-500"
                style={{ width: `${levelProgress}%` }}
              />
            </View>
            <Text className="mt-1 text-xs font-semibold text-purple-700">
              {nextLevel
                ? `${pointsToNext} puntos para ${nextLevel.name}`
                : "Nivel máximo alcanzado"}
            </Text>
          </View>

          {streak && streak.longest_streak > 0 && (
            <Text className="mt-2 text-xs font-semibold text-purple-500">
              Racha más larga: {streak.longest_streak} días
            </Text>
          )}
        </View>

        <TouchableOpacity
            className="mt-3 w-full flex-row items-center justify-center rounded-full border border-purple-200 bg-white px-4 py-2"
            onPress={() => router.push("/settings")}
            activeOpacity={0.85}
          >
            <Ionicons name="settings" size={14} color="#7c3aed" />
            <Text className="ml-1.5 text-xs font-bold text-purple-800">
              Configuración
            </Text>
          </TouchableOpacity>

        <View className="mt-8">
          <Text className="mb-4 text-lg font-extrabold text-purple-900">
            Logros
          </Text>

          {allAchievements.length === 0 ? (
            <View className="items-center rounded-3xl border-2 border-purple-200 bg-white p-6">
              <MochiCharacter mood="happy" size={64} />
              <Text className="mt-3 text-center text-sm font-semibold text-purple-600">
                Completa actividades para desbloquear logros
              </Text>
            </View>
          ) : (
            <View className="flex-row flex-wrap">
              {allAchievements.map((achievement) => {
                const isUnlocked = unlockedIds.has(achievement.id);
                return (
                  <View key={achievement.id} className="mb-3 w-1/2 pr-3">
                    <View
                      className={`h-40 rounded-2xl border-2 p-3 ${
                        isUnlocked
                          ? "border-purple-200 bg-purple-100"
                          : "border-gray-200 bg-gray-100 opacity-60"
                      }`}
                    >
                      <View className="flex-row items-center justify-between">
                        <View className="h-9 w-9 items-center justify-center rounded-xl bg-white">
                          <Ionicons
                            name={
                              isUnlocked
                                ? ((achievement.icon as keyof typeof Ionicons.glyphMap) ??
                                  "trophy")
                                : "lock-closed"
                            }
                            size={18}
                            color={isUnlocked ? "#7c3aed" : "#9ca3af"}
                          />
                        </View>
                        {isUnlocked && (
                          <View className="rounded-full bg-purple-200 px-2 py-0.5">
                            <Text className="text-xs font-bold text-purple-800">
                              +{achievement.points}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text
                        className={`mt-2 text-xs font-bold ${isUnlocked ? "text-purple-900" : "text-gray-500"}`}
                        numberOfLines={2}
                      >
                        {achievement.title}
                      </Text>

                      <View className="mt-1 flex-1 justify-end">
                        <Text
                          className={`text-xs ${isUnlocked ? "text-purple-500" : "text-gray-500"}`}
                          numberOfLines={2}
                        >
                          {isUnlocked
                            ? achievement.description
                            : "Desbloquéalo completando actividades"}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View className="h-16" />
      </ScrollView>

      <Modal
        visible={isNameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeEditNameModal}
      >
        <View className="flex-1 items-center justify-center bg-black/30 px-6">
          <View className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <Text className="text-center text-2xl font-extrabold text-purple-700">
              Cambiar nombre
            </Text>
            <Text className="mt-2 text-center text-sm font-semibold text-slate-600">
              Elige cómo quieres llamar a Mochi.
            </Text>

            <TextInput
              value={draftMochiName}
              onChangeText={setDraftMochiName}
              placeholder="Ej: Mochi Estrella"
              placeholderTextColor="#94a3b8"
              autoCapitalize="words"
              maxLength={24}
              editable={!savingName}
              className="mt-5 rounded-2xl border-2 border-purple-200 bg-purple-50 px-4 py-3 text-base font-semibold text-purple-900"
            />

            {nameError ? (
              <Text className="mt-2 text-center text-xs font-semibold text-red-600">
                {nameError}
              </Text>
            ) : (
              <Text className="mt-2 text-center text-xs font-semibold text-purple-500">
                Deja el campo vacío para volver al nombre por defecto.
              </Text>
            )}

            <View className="mt-6 flex-row">
              <TouchableOpacity
                className="mr-2 flex-1 rounded-2xl border-2 border-purple-200 bg-white px-4 py-3"
                onPress={closeEditNameModal}
                activeOpacity={0.85}
                disabled={savingName}
              >
                <Text className="text-center text-base font-extrabold text-purple-700">
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="ml-2 flex-1 rounded-2xl bg-purple-500 px-4 py-3"
                onPress={() => void saveMochiName()}
                activeOpacity={0.85}
                disabled={savingName}
              >
                {savingName ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-center text-base font-extrabold text-white">
                    Guardar
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default ProfileScreen;
