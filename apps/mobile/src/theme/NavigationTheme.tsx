// 내비게이션(화면 바탕·탭 막대·테두리) 색을 앱 디자인 토큰에 맞춰요. 이 앱은 밝은 화면만 있어요(userInterfaceStyle: "light").
import { DefaultTheme, ThemeProvider, type Theme } from "expo-router";
import type { ReactNode } from "react";
import { COLORS } from "@/theme";

export const NAVIGATION_THEME: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: COLORS.primary,
    background: COLORS.bg,
    card: COLORS.card,
    text: COLORS.text,
    border: COLORS.border,
    notification: COLORS.danger,
  },
};

export function NavigationTheme({ children }: { children: ReactNode }) {
  return <ThemeProvider value={NAVIGATION_THEME}>{children}</ThemeProvider>;
}
