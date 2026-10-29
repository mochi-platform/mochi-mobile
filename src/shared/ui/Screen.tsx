import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { RefreshControl, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getTabBarClearance } from "@/src/shared/lib/layout";
import { COLORS } from "@/src/shared/theme/tokens";
import { PressableScale } from "./PressableScale";
import { Caption, Display, Eyebrow } from "./Typography";

type ScreenProps = {
  children: ReactNode;
  /** Título grande de la pantalla. Si falta, el contenido empieza arriba (p. ej. Hoy arma su propio saludo). */
  title?: string;
  eyebrow?: string;
  /** Línea corta bajo el título. */
  subtitle?: string;
  /** Acción a la derecha del título (avatar, botón +). */
  headerRight?: ReactNode;
  /** Deja espacio para la barra inferior flotante. */
  withTabBar?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Para pantallas que no deben desplazarse (reproductor, temporizador). */
  scroll?: boolean;
  /** Pantallas abiertas encima (formularios, detalle): botón de cerrar a la derecha. */
  closable?: boolean;
  onClose?: () => void;
  /** Formularios: el contenido sube con el teclado y los toques no lo cierran. */
  keyboard?: boolean;
};

/** Botón redondo de cerrar, el mismo de Perfil y Ajustes. */
export function CloseButton({ onPress }: { onPress?: () => void }) {
  return (
    <PressableScale
      haptics="selection"
      onPress={onPress ?? (() => router.back())}
      accessibilityLabel="Cerrar"
      className="h-10 w-10 items-center justify-center rounded-full bg-surface-muted"
    >
      <Ionicons name="close" size={20} color={COLORS.inkMuted} />
    </PressableScale>
  );
}

/** Andamio común: fondo crema, márgenes de 20, título grande y espacio para la barra. */
export function Screen({
  children,
  title,
  eyebrow,
  subtitle,
  headerRight,
  withTabBar = true,
  refreshing,
  onRefresh,
  scroll = true,
  closable = false,
  onClose,
  keyboard = false,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const bottom = withTabBar ? getTabBarClearance(insets.bottom) : insets.bottom + 24;
  const header =
    title || headerRight || closable ? (
      <View className="mb-2 mt-2.5 flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          {eyebrow ? <Eyebrow className="mb-1.5">{eyebrow}</Eyebrow> : null}
          {title ? <Display>{title}</Display> : null}
          {subtitle ? <Caption className="mt-1">{subtitle}</Caption> : null}
        </View>
        {headerRight || closable ? (
          <View className="flex-row items-center gap-2">
            {headerRight}
            {closable ? <CloseButton onPress={onClose} /> : null}
          </View>
        ) : null}
      </View>
    ) : null;

  if (!scroll) {
    return (
      <View
        className="flex-1 bg-canvas px-5"
        style={{ paddingTop: insets.top, paddingBottom: bottom }}
      >
        {header}
        {children}
      </View>
    );
  }
  return (
    <View className="flex-1 bg-canvas">
      {/* Desplaza hasta el campo enfocado: con edge-to-edge Android no encoge la ventana. */}
      <KeyboardAwareScrollView
        className="flex-1 bg-canvas"
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={keyboard ? "on-drag" : undefined}
        contentContainerStyle={{
          paddingTop: insets.top,
          paddingBottom: bottom,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing ?? false}
              onRefresh={onRefresh}
              tintColor={COLORS.accent}
              colors={[COLORS.accent]}
              progressViewOffset={insets.top}
            />
          ) : undefined
        }
      >
        {header}
        {children}
      </KeyboardAwareScrollView>
      {/* El contenido no se ve por debajo de la barra de estado al desplazarse. */}
      <View
        pointerEvents="none"
        className="absolute inset-x-0 top-0 bg-canvas"
        style={{ height: insets.top }}
      />
    </View>
  );
}
