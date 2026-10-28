import type { ReactNode } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getTabBarClearance } from "@/src/shared/lib/layout";
import { COLORS } from "@/src/shared/theme/tokens";
import { Display, Eyebrow } from "./Typography";

type ScreenProps = {
  children: ReactNode;
  /** Título grande de la pantalla. Si falta, el contenido empieza arriba (p. ej. Hoy arma su propio saludo). */
  title?: string;
  eyebrow?: string;
  /** Acción a la derecha del título (avatar, botón +). */
  headerRight?: ReactNode;
  /** Deja espacio para la barra inferior flotante. */
  withTabBar?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Para pantallas que no deben desplazarse (reproductor, temporizador). */
  scroll?: boolean;
};

/** Andamio común: fondo crema, márgenes de 20, título grande y espacio para la barra. */
export function Screen({
  children,
  title,
  eyebrow,
  headerRight,
  withTabBar = true,
  refreshing,
  onRefresh,
  scroll = true,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const bottom = withTabBar ? getTabBarClearance(insets.bottom) : insets.bottom + 24;
  const header =
    title || headerRight ? (
      <View className="mb-2 mt-2.5 flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          {eyebrow ? <Eyebrow className="mb-1.5">{eyebrow}</Eyebrow> : null}
          {title ? <Display>{title}</Display> : null}
        </View>
        {headerRight}
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
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: bottom, paddingHorizontal: 20 }}
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
    </ScrollView>
  );
}
