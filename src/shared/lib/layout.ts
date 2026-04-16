export const BOTTOM_NAV_TOP_PADDING = 12;
export const BOTTOM_NAV_BOTTOM_PADDING = 18;
export const BOTTOM_NAV_TAB_HEIGHT = 56;

const FAB_BOTTOM_GUTTER = 18;
const HOME_BOTTOM_SPACER = 40;

export function getBottomNavPaddingBottom(insetBottom: number): number {
  return insetBottom + BOTTOM_NAV_BOTTOM_PADDING;
}

export function getBottomNavHeight(insetBottom: number): number {
  return (
    insetBottom +
    BOTTOM_NAV_TOP_PADDING +
    BOTTOM_NAV_BOTTOM_PADDING +
    BOTTOM_NAV_TAB_HEIGHT
  );
}

export function getFabBottomOffset(insetBottom: number): number {
  return insetBottom + FAB_BOTTOM_GUTTER;
}

export function getHomeBottomSpacerHeight(insetBottom: number): number {
  return insetBottom + HOME_BOTTOM_SPACER;
}