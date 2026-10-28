export const BOTTOM_NAV_TOP_PADDING = 12;
export const BOTTOM_NAV_BOTTOM_PADDING = 18;
export const BOTTOM_NAV_TAB_HEIGHT = 56;

const FAB_BOTTOM_GUTTER = 18;
const HOME_BOTTOM_SPACER = 40;

export function getBottomNavPaddingBottom(insetBottom: number): number {
  return insetBottom + BOTTOM_NAV_BOTTOM_PADDING;
}

export function getBottomNavHeight(insetBottom: number): number {
  return insetBottom + BOTTOM_NAV_TOP_PADDING + BOTTOM_NAV_BOTTOM_PADDING + BOTTOM_NAV_TAB_HEIGHT;
}

export function getFabBottomOffset(insetBottom: number): number {
  return insetBottom + FAB_BOTTOM_GUTTER;
}

export function getHomeBottomSpacerHeight(insetBottom: number): number {
  return insetBottom + HOME_BOTTOM_SPACER;
}

/** Barra inferior flotante del Remaster (src/shared/ui/TabBar.tsx). */
export const TAB_BAR_HEIGHT = 68;
export const TAB_BAR_MARGIN_BOTTOM = 12;

/** Espacio que deja el contenido desplazable para no quedar bajo la barra flotante. */
export function getTabBarClearance(insetBottom: number): number {
  return insetBottom + TAB_BAR_MARGIN_BOTTOM + TAB_BAR_HEIGHT + 24;
}
