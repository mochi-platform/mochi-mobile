import { useCustomAlert } from "@/src/shared/components/CustomAlert";
import { TimePickerModal } from "@/src/shared/components/TimePickerModal";
import { AppearanceSection } from "@/src/features/settings/components/AppearanceSection";
import { AnalyticsConsentCard, MochiMemoryCard } from "@/src/shared/components/MochiMemoryCard";
import { reportError } from "@/src/shared/lib/observability/reportError";
import { COLORS } from "@/src/shared/theme/tokens";
import { Caption, Display, ErrorState, PressableScale, Skeleton } from "@/src/shared/ui";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import type {} from "react-native-purchases";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useModuleVisibility } from "@/src/core/providers/ModuleVisibilityContext";
import { useSession } from "@/src/core/providers/SessionContext";
import { supabase } from "@/src/shared/lib/supabase";
import { getAiCreditBalance, type AiCreditBalance } from "@/src/shared/lib/aiCredits";
import {
  canUseRevenueCat,
  configureRevenueCat,
  getRevenueCatCustomerInfo,
  restoreRevenueCatPurchases,
  syncRevenueCatToBackend,
} from "@/src/shared/lib/revenuecat";
import {
  getNotificationPermissionStatus,
  loadNotificationPrefs,
  loadHabitNotificationMap,
  scheduleMorningReminder,
} from "@/src/shared/lib/notifications";
import {
  getCycleLastSync,
  hasCyclePermissions,
  isHealthConnectAvailable,
} from "@/src/shared/lib/healthConnect";
import type { PartnerSpace, StudyBlock } from "@/src/shared/types/database";
import { defaultModuleSettings, isValidTime } from "@/src/features/settings/helpers";
import type {
  HabitNotificationTarget,
  ModuleSettings,
  ModuleToggleKey,
  PlanInfo,
  ProfileSettings,
} from "@/src/features/settings/types";
import { useRewardedAd } from "@/src/features/settings/hooks/useRewardedAd";
import { useNotificationSettings } from "@/src/features/settings/hooks/useNotificationSettings";
import { useCycleHealth } from "@/src/features/settings/hooks/useCycleHealth";
import { useAccountActions } from "@/src/features/settings/hooks/useAccountActions";
import { ProfileSection } from "@/src/features/settings/components/ProfileSection";
import { ModulesSection } from "@/src/features/settings/components/ModulesSection";
import { MochiDuoSection } from "@/src/features/settings/components/MochiDuoSection";
import { AiCreditsSection } from "@/src/features/settings/components/AiCreditsSection";
import { PremiumSection } from "@/src/features/settings/components/PremiumSection";
import { HealthSection } from "@/src/features/settings/components/HealthSection";
import { CyclePrivacySection } from "@/src/features/settings/components/CyclePrivacySection";
import { NotificationsSection } from "@/src/features/settings/components/NotificationsSection";
import { AccountSection } from "@/src/features/settings/components/AccountSection";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const { refreshModuleVisibility } = useModuleVisibility();
  const { showAlert, AlertComponent } = useCustomAlert();

  const [profile, setProfile] = useState<ProfileSettings>({
    full_name: "",
    mochi_name: "Mochi",
    wake_up_time: "",
  });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [moduleSettings, setModuleSettings] = useState(defaultModuleSettings);
  const [partnerSpace, setPartnerSpace] = useState<PartnerSpace | null>(null);

  const [aiCredits, setAiCredits] = useState<AiCreditBalance | null>(null);
  const [aiCreditsLoading, setAiCreditsLoading] = useState(false);

  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const [premiumLoading, setPremiumLoading] = useState(false);

  const [studyBlocks, setStudyBlocks] = useState<StudyBlock[]>([]);
  const [habitTargets, setHabitTargets] = useState<HabitNotificationTarget[]>([]);

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = session?.user.id;

  const { rewardedReady, rewardedLoading, handleWatchAd } = useRewardedAd({
    userId,
    showAlert,
    setAiCredits,
    enabled: planInfo?.planKey !== "premium",
  });

  const {
    notifPrefs,
    setNotifPrefs,
    permissionStatus,
    setPermissionStatus,
    savingNotif,
    showHabitTimePicker,
    setShowHabitTimePicker,
    showCookingTimePicker,
    setShowCookingTimePicker,
    setHabitNotificationMap,
    handleToggleNotifications,
    handleToggleMorning,
    handleToggleStudyReminders,
    handleToggleHabitReminder,
    handleToggleWeeklySummary,
    handleHabitTimeConfirm,
    handleToggleCookingReminder,
    handleCookingTimeConfirm,
  } = useNotificationSettings({
    wakeUpTime: profile.wake_up_time,
    studyBlocks,
    habitTargets,
    showAlert,
  });

  const {
    cycleConsent,
    healthAvailable,
    setHealthAvailable,
    healthPermission,
    setHealthPermission,
    healthSyncing,
    lastCycleSync,
    setLastCycleSync,
    handleToggleCycleConsent,
    handleConnectHealth,
    handleRevokeHealth,
  } = useCycleHealth({ userId, showAlert });

  const { handleSignOut, handleDeleteAccount } = useAccountActions({ showAlert });

  useEffect(() => {
    void configureRevenueCat(userId ?? null);
  }, [userId]);

  const loadSettings = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [
        profileRes,
        settingsRes,
        blocksRes,
        habitsRes,
        prefs,
        habitPrefs,
        permStatus,
        cycleAvailable,
        cyclePermission,
        cycleSync,
        partnerSpaceRes,
        creditsRes,
        planRes,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, mochi_name, wake_up_time")
          .eq("id", userId)
          .single(),
        supabase
          .from("user_settings")
          .select(
            "partner_features_enabled, quick_capture_enabled, study_enabled, exercise_enabled, habits_enabled, goals_enabled, mood_enabled, gratitude_enabled, vouchers_enabled, cooking_enabled",
          )
          .eq("user_id", userId)
          .maybeSingle(),
        supabase.from("study_blocks").select("*").eq("user_id", userId),
        supabase
          .from("habits")
          .select("id, name")
          .eq("user_id", userId)
          .order("created_at", { ascending: true }),
        loadNotificationPrefs(),
        loadHabitNotificationMap(),
        getNotificationPermissionStatus(),
        isHealthConnectAvailable(),
        hasCyclePermissions(),
        getCycleLastSync(),
        supabase
          .from("partner_spaces")
          .select("*")
          .or(`owner_user_id.eq.${userId},partner_user_id.eq.${userId}`)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        getAiCreditBalance().catch(() => null),
        supabase.rpc("get_user_plan"),
      ]);

      if (profileRes.error) throw profileRes.error;
      if (settingsRes.error) throw settingsRes.error;
      if (habitsRes.error) throw habitsRes.error;

      const profileData = profileRes.data as ProfileSettings | null;
      setProfile({
        full_name: profileData?.full_name ?? "",
        mochi_name: (profileData?.mochi_name ?? "").trim() || "Mochi",
        wake_up_time: profileData?.wake_up_time ?? "",
      });
      const mergedModuleSettings: ModuleSettings = {
        ...defaultModuleSettings,
        ...((settingsRes.data as Partial<ModuleSettings> | null) ?? {}),
      };
      setModuleSettings({
        ...mergedModuleSettings,
        vouchers_enabled: mergedModuleSettings.partner_features_enabled,
      });
      setStudyBlocks((blocksRes.data as StudyBlock[] | null) ?? []);
      setHabitTargets((habitsRes.data as HabitNotificationTarget[] | null) ?? []);
      setNotifPrefs(prefs);
      setHabitNotificationMap(habitPrefs);
      setPermissionStatus(permStatus);
      setHealthAvailable(cycleAvailable);
      setHealthPermission(cyclePermission);
      setLastCycleSync(cycleSync);
      setPartnerSpace((partnerSpaceRes.data as PartnerSpace | null) ?? null);
      setAiCredits(creditsRes);

      if (planRes.error) {
        setPlanInfo(null);
      } else {
        const planData = (planRes.data ?? {}) as {
          plan_key?: string;
          status?: string | null;
          current_period_ends_at?: string | null;
        };
        setPlanInfo({
          planKey: planData.plan_key === "premium" ? "premium" : "free",
          status: planData.status ?? null,
          periodEndsAt: planData.current_period_ends_at ?? null,
        });
      }

      if (canUseRevenueCat()) {
        try {
          const info = await getRevenueCatCustomerInfo();
          if (info) {
            const plan = await syncRevenueCatToBackend(info);
            setPlanInfo({
              planKey: plan.isPremium ? "premium" : "free",
              status: plan.status,
              periodEndsAt: plan.periodEndsAt,
            });
          }
        } catch (error) {
          // No bloquear ajustes si falla RevenueCat.
          reportError(error, { scope: "app/settings.tsx" });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los ajustes");
      setProfile({ full_name: "", mochi_name: "Mochi", wake_up_time: "" });
      setModuleSettings(defaultModuleSettings);
      setHabitTargets([]);
      setHabitNotificationMap({});
      setHealthAvailable(false);
      setHealthPermission(false);
      setLastCycleSync(null);
      setPartnerSpace(null);
      setAiCredits(null);
      setPlanInfo(null);
    } finally {
      setLoading(false);
    }
  }, [
    userId,
    setNotifPrefs,
    setPermissionStatus,
    setHabitNotificationMap,
    setHealthAvailable,
    setHealthPermission,
    setLastCycleSync,
  ]);

  useFocusEffect(
    useCallback(() => {
      void loadSettings();
    }, [loadSettings]),
  );

  const handleSaveProfile = async () => {
    if (!userId) return;

    const wakeUpTimeValue = (profile.wake_up_time ?? "").trim();
    if (!isValidTime(wakeUpTimeValue)) {
      showAlert({
        title: "Hora inválida",
        message: "La hora debe estar en formato HH:MM",
        buttons: [{ text: "Entendido", style: "cancel" }],
      });
      return;
    }

    try {
      setSavingProfile(true);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: (profile.full_name ?? "").trim() || null,
          mochi_name: (profile.mochi_name ?? "").trim() || "Mochi",
          wake_up_time: wakeUpTimeValue,
        })
        .eq("id", userId);

      if (updateError) throw updateError;

      if (notifPrefs.enabled && notifPrefs.morningEnabled) {
        await scheduleMorningReminder(wakeUpTimeValue);
      }

      showAlert({
        title: "Perfil actualizado",
        message: "Tus datos se guardaron correctamente",
        buttons: [{ text: "Aceptar", style: "default" }],
      });
    } catch (err) {
      showAlert({
        title: "Error",
        message: err instanceof Error ? err.message : "No se pudo actualizar el perfil",
        buttons: [{ text: "Entendido", style: "destructive" }],
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleOpenMochiDuo = () => {
    router.push("/mochi-duo");
  };

  const handleOpenMochiDuoInvite = () => {
    router.push("/mochi-duo-invite");
  };

  const handleLeaveMochiDuo = () => {
    if (!partnerSpace) return;

    showAlert({
      title: "Desvincular Mochi Duo™",
      message: "Esto cancelara el vinculo con tu pareja. Puedes crear uno nuevo cuando quieras.",
      buttons: [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Desvincular",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await supabase.rpc("leave_partner_space", {
                  p_space_id: partnerSpace.id,
                });
                setPartnerSpace(null);
                await loadSettings();
              } catch (err) {
                showAlert({
                  title: "No se pudo desvincular",
                  message:
                    err instanceof Error ? err.message : "No se pudo completar la solicitud.",
                  buttons: [{ text: "Entendido", style: "cancel" }],
                });
              }
            })();
          },
        },
      ],
    });
  };

  const handleToggleModule = async (key: ModuleToggleKey, value: boolean) => {
    if (!userId) return;

    const previousSettings = moduleSettings;
    const nextSettings = {
      ...moduleSettings,
      [key]: value,
    };

    if (key === "partner_features_enabled") {
      nextSettings.vouchers_enabled = value;
    }

    setModuleSettings(nextSettings);

    try {
      const payload = {
        user_id: userId,
        partner_features_enabled: nextSettings.partner_features_enabled,
        quick_capture_enabled: nextSettings.quick_capture_enabled,
        study_enabled: nextSettings.study_enabled,
        exercise_enabled: nextSettings.exercise_enabled,
        habits_enabled: nextSettings.habits_enabled,
        goals_enabled: nextSettings.goals_enabled,
        mood_enabled: nextSettings.mood_enabled,
        gratitude_enabled: nextSettings.gratitude_enabled,
        cooking_enabled: nextSettings.cooking_enabled,
      };

      const { error: upsertError } = await supabase
        .from("user_settings")
        .upsert(payload, { onConflict: "user_id" });

      if (upsertError) throw upsertError;
      // Pestañas, Hoy y el guardián de rutas leen la visibilidad del contexto: se recarga ya.
      await refreshModuleVisibility();
    } catch (err) {
      setModuleSettings(previousSettings);
      showAlert({
        title: "Error",
        message: err instanceof Error ? err.message : "No se pudo guardar el cambio",
        buttons: [{ text: "Entendido", style: "destructive" }],
      });
    }
  };

  const handleRefreshCredits = async () => {
    if (!userId) return;
    try {
      setAiCreditsLoading(true);
      const latest = await getAiCreditBalance();
      setAiCredits(latest);
    } catch (err) {
      showAlert({
        title: "No se pudo cargar",
        message: err instanceof Error ? err.message : "No se pudieron cargar tus creditos de IA.",
        buttons: [{ text: "Entendido", style: "cancel" }],
      });
    } finally {
      setAiCreditsLoading(false);
    }
  };

  const handleOpenPremium = () => {
    router.push("/premium");
  };

  const handleRestorePurchases = async () => {
    try {
      setPremiumLoading(true);
      const info = await restoreRevenueCatPurchases();
      const plan = await syncRevenueCatToBackend(info);
      setPlanInfo({
        planKey: plan.isPremium ? "premium" : "free",
        status: plan.status,
        periodEndsAt: plan.periodEndsAt,
      });
      showAlert({
        title: "Compras restauradas",
        message: "Tu plan se actualizo correctamente.",
        buttons: [{ text: "Listo", style: "default" }],
      });
    } catch (err) {
      showAlert({
        title: "No se pudo restaurar",
        message: err instanceof Error ? err.message : "Intenta de nuevo en unos segundos.",
        buttons: [{ text: "Entendido", style: "cancel" }],
      });
    } finally {
      setPremiumLoading(false);
    }
  };

  return (
    <>
      <SafeAreaView className="flex-1 bg-canvas">
        <View className="flex-1">
          <KeyboardAwareScrollView
            bottomOffset={24}
            className="flex-1 px-5"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          >
            <View className="mt-4 flex-row items-start justify-between">
              <View className="flex-1">
                <Display>Ajustes</Display>
                <Caption className="mt-1">Tu perfil, tus módulos y tu privacidad.</Caption>
              </View>
              <PressableScale
                onPress={() => router.back()}
                accessibilityLabel="Volver"
                className="h-10 w-10 items-center justify-center rounded-full bg-surface-muted"
              >
                <Ionicons name="close" size={20} color={COLORS.inkMuted} />
              </PressableScale>
            </View>

            {loading ? (
              <View className="mt-6 gap-3">
                <Skeleton height={140} className="rounded-card" />
                <Skeleton height={260} className="rounded-card" />
              </View>
            ) : error ? (
              <ErrorState message={error} onRetry={() => void loadSettings()} />
            ) : (
              <>
                <ProfileSection
                  profile={profile}
                  setProfile={setProfile}
                  savingProfile={savingProfile}
                  onSaveProfile={handleSaveProfile}
                  onOpenTimePicker={() => setShowTimePicker(true)}
                />

                <TimePickerModal
                  visible={showTimePicker}
                  time={profile.wake_up_time ?? "06:00"}
                  label="Hora de despertar"
                  onConfirm={(time) => {
                    setProfile((prev) => ({ ...prev, wake_up_time: time }));
                    setShowTimePicker(false);
                  }}
                  onCancel={() => setShowTimePicker(false)}
                />

                <ModulesSection
                  moduleSettings={moduleSettings}
                  onToggleModule={handleToggleModule}
                />

                <MochiDuoSection
                  partnerSpace={partnerSpace}
                  partnerFeaturesEnabled={moduleSettings.partner_features_enabled}
                  onOpenMochiDuo={handleOpenMochiDuo}
                  onOpenMochiDuoInvite={handleOpenMochiDuoInvite}
                  onLeaveMochiDuo={handleLeaveMochiDuo}
                />

                <AiCreditsSection
                  aiCredits={aiCredits}
                  aiCreditsLoading={aiCreditsLoading}
                  rewardedReady={rewardedReady}
                  rewardedLoading={rewardedLoading}
                  onWatchAd={handleWatchAd}
                  onRefreshCredits={handleRefreshCredits}
                />

                <PremiumSection
                  planInfo={planInfo}
                  premiumLoading={premiumLoading}
                  onOpenPremium={handleOpenPremium}
                  onRestorePurchases={handleRestorePurchases}
                />

                <HealthSection
                  healthAvailable={healthAvailable}
                  healthPermission={healthPermission}
                  healthSyncing={healthSyncing}
                  lastCycleSync={lastCycleSync}
                  onConnectHealth={handleConnectHealth}
                  onRevokeHealth={handleRevokeHealth}
                />

                <CyclePrivacySection
                  cycleConsent={cycleConsent}
                  onToggleCycleConsent={handleToggleCycleConsent}
                />

                <AppearanceSection />

                <MochiMemoryCard />

                <AnalyticsConsentCard />

                <NotificationsSection
                  notifPrefs={notifPrefs}
                  permissionStatus={permissionStatus}
                  savingNotif={savingNotif}
                  wakeUpTime={profile.wake_up_time}
                  studyBlockCount={studyBlocks.length}
                  onToggleNotifications={handleToggleNotifications}
                  onToggleMorning={handleToggleMorning}
                  onToggleStudyReminders={handleToggleStudyReminders}
                  onToggleHabitReminder={handleToggleHabitReminder}
                  onOpenHabitTimePicker={() => setShowHabitTimePicker(true)}
                  onToggleCookingReminder={handleToggleCookingReminder}
                  onOpenCookingTimePicker={() => setShowCookingTimePicker(true)}
                  onToggleWeeklySummary={handleToggleWeeklySummary}
                />

                <TimePickerModal
                  visible={showHabitTimePicker}
                  time={notifPrefs.habitTime}
                  label="Hora del recordatorio de hábitos"
                  onConfirm={(time) => {
                    void handleHabitTimeConfirm(time);
                  }}
                  onCancel={() => setShowHabitTimePicker(false)}
                />

                <TimePickerModal
                  visible={showCookingTimePicker}
                  time={notifPrefs.cookingTime}
                  label="Hora del recordatorio de cocina"
                  onConfirm={(time) => {
                    void handleCookingTimeConfirm(time);
                  }}
                  onCancel={() => setShowCookingTimePicker(false)}
                />

                <AccountSection onSignOut={handleSignOut} onDeleteAccount={handleDeleteAccount} />
              </>
            )}
          </KeyboardAwareScrollView>
        </View>
      </SafeAreaView>
      {AlertComponent}
    </>
  );
}

export default SettingsScreen;
