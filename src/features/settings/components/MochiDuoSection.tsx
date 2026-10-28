import { Text, TouchableOpacity, View } from "react-native";
import type { PartnerSpace } from "@/src/shared/types/database";
import { getPartnerStatusLabel } from "../helpers";

type MochiDuoSectionProps = {
  partnerSpace: PartnerSpace | null;
  partnerFeaturesEnabled: boolean;
  onOpenMochiDuo: () => void;
  onOpenMochiDuoInvite: () => void;
  onLeaveMochiDuo: () => void;
};

export function MochiDuoSection({
  partnerSpace,
  partnerFeaturesEnabled,
  onOpenMochiDuo,
  onOpenMochiDuoInvite,
  onLeaveMochiDuo,
}: MochiDuoSectionProps) {
  const partnerStatusLabel = getPartnerStatusLabel(partnerSpace);

  return (
    <View className="mt-6 rounded-3xl border-2 border-emerald-200 bg-white p-4 dark:border-emerald-800 dark:bg-surface">
      <View className="flex-row items-center justify-between">
        <Text className="text-lg font-extrabold text-emerald-900 dark:text-emerald-100">
          Mochi Duo™
        </Text>
        <View className="rounded-full bg-emerald-100 px-3 py-1 dark:bg-emerald-900">
          <Text className="text-xs font-extrabold text-emerald-800 dark:text-emerald-200">
            {partnerStatusLabel}
          </Text>
        </View>
      </View>
      <Text className="mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
        Vincula tu cuenta con tu pareja y compartan metas y vales.
      </Text>

      {!partnerFeaturesEnabled && (
        <View className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:bg-amber-950">
          <Text className="text-xs font-semibold text-amber-800 dark:text-amber-200">
            Activa el módulo Mochi Duo™ en la sección de módulos para abrir este espacio.
          </Text>
        </View>
      )}

      <View className="mt-4 flex-row gap-2">
        <TouchableOpacity
          className={`flex-1 rounded-2xl py-3 ${partnerFeaturesEnabled ? "bg-emerald-500" : "bg-emerald-300 dark:bg-emerald-700"}`}
          onPress={onOpenMochiDuo}
          disabled={!partnerFeaturesEnabled}
        >
          <Text className="text-center font-extrabold text-white">Abrir Mochi Duo™</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 rounded-2xl border-2 py-3 ${partnerFeaturesEnabled ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950" : "border-emerald-100 bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-900"}`}
          onPress={onOpenMochiDuoInvite}
          disabled={!partnerFeaturesEnabled}
        >
          <Text className="text-center font-extrabold text-emerald-800 dark:text-emerald-200">
            Crear o unirme
          </Text>
        </TouchableOpacity>
      </View>

      {partnerSpace?.invite_status === "accepted" && (
        <TouchableOpacity
          className="mt-3 rounded-2xl border-2 border-red-200 bg-red-50 py-3 dark:border-red-800 dark:bg-red-950"
          onPress={onLeaveMochiDuo}
        >
          <Text className="text-center font-extrabold text-red-700 dark:text-red-300">
            Desvincular
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
