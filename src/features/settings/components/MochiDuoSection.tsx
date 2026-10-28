import { Text, View } from "react-native";
import type { PartnerSpace } from "@/src/shared/types/database";
import { Button, Caption, Surface, Title } from "@/src/shared/ui";
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
  return (
    <Surface className="mt-6 p-4">
      <View className="flex-row items-center justify-between">
        <Title>Mochi Duo</Title>
        <View className="rounded-full bg-tint-duo px-3 py-1">
          <Text className="font-body-extrabold text-xs text-tint-duo-ink">
            {getPartnerStatusLabel(partnerSpace)}
          </Text>
        </View>
      </View>
      <Caption className="mt-1">
        Vincula tu cuenta con tu pareja: notas, ánimo, metas y vales.
      </Caption>
      {!partnerFeaturesEnabled ? (
        <Surface tone="sunken" className="mt-3 p-3">
          <Caption>Activa el módulo Mochi Duo en Módulos para abrir este espacio.</Caption>
        </Surface>
      ) : null}
      <View className="mt-4 gap-2">
        <Button title="Abrir Duo" disabled={!partnerFeaturesEnabled} onPress={onOpenMochiDuo} />
        <Button
          title="Crear o unirme"
          variant="soft"
          disabled={!partnerFeaturesEnabled}
          onPress={onOpenMochiDuoInvite}
        />
        {partnerSpace?.invite_status === "accepted" ? (
          <Button title="Desvincular" variant="ghost" onPress={onLeaveMochiDuo} />
        ) : null}
      </View>
    </Surface>
  );
}
