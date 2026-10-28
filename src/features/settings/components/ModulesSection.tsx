import { View } from "react-native";
import { Caption, Surface, Title, Toggle } from "@/src/shared/ui";
import { moduleItems } from "../helpers";
import type { ModuleSettings, ModuleToggleKey } from "../types";

type ModulesSectionProps = {
  moduleSettings: ModuleSettings;
  onToggleModule: (key: ModuleToggleKey, value: boolean) => Promise<void>;
};

/** Qué módulos ve la usuaria: cambia al instante las pestañas y lo que muestra Hoy. */
export function ModulesSection({ moduleSettings, onToggleModule }: ModulesSectionProps) {
  return (
    <Surface className="mt-6 p-4">
      <Title>Módulos</Title>
      <Caption className="mb-2 mt-1">
        Activa solo lo que uses; el resto se oculta de tus pestañas y de Hoy.
      </Caption>
      <View>
        {moduleItems.map((module) => (
          <Toggle
            key={module.key}
            label={module.label}
            value={moduleSettings[module.key]}
            onValueChange={(next) => void onToggleModule(module.key, next)}
          />
        ))}
      </View>
    </Surface>
  );
}
