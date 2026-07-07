export const CITIZEN_COMPACT_TAB_BREAKPOINT = 390;
export const MOBILE_HEADER_TOP_PADDING = 6;
export const MOBILE_HEADER_BAR_HEIGHT = 54;
export const MOBILE_HEADER_TOUCH_TARGET = 44;

export type CitizenTabLayout = {
  hideScheduleTab: boolean;
  showLabels: boolean;
  tabBarHeight: number;
  tabBarPaddingTop: number;
  tabBarPaddingBottom: number;
  tabBarPaddingHorizontal: number;
  tabBarItemMarginVertical: number;
  tabBarItemPaddingVertical: number;
  tabBarLabelFontSize: number;
  edgeSwipeWidth: number;
};

export const resolveCitizenTabLayout = (
  width: number,
  bottomInset: number
): CitizenTabLayout => {
  const hideScheduleTab = false;
  const showLabels = width >= 340;
  const tabBarPaddingBottom = Math.max(bottomInset, 8);
  const tabBarPaddingTop = width < CITIZEN_COMPACT_TAB_BREAKPOINT ? 7 : 6;
  const tabBarHeight = 64 + tabBarPaddingTop + tabBarPaddingBottom;

  return {
    hideScheduleTab,
    showLabels,
    tabBarHeight,
    tabBarPaddingTop,
    tabBarPaddingBottom,
    tabBarPaddingHorizontal: width < CITIZEN_COMPACT_TAB_BREAKPOINT ? 2 : 4,
    tabBarItemMarginVertical: width < CITIZEN_COMPACT_TAB_BREAKPOINT ? 1 : 2,
    tabBarItemPaddingVertical: width < CITIZEN_COMPACT_TAB_BREAKPOINT ? 3 : 4,
    tabBarLabelFontSize: width < 360 ? 9 : 11,
    edgeSwipeWidth: width < CITIZEN_COMPACT_TAB_BREAKPOINT ? 18 : 24
  };
};

export const resolveMobileHeaderOffset = (topInset: number) =>
  Math.max(MOBILE_HEADER_TOP_PADDING, topInset) + MOBILE_HEADER_BAR_HEIGHT;
