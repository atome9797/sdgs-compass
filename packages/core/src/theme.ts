// 웹·모바일이 함께 쓰는 디자인 토큰(색·간격·글자 크기). 웹은 CSS 변수로, 모바일은 StyleSheet 로 같은 값을 써서 두 앱이 같은 모습이에요.
// 기준: 기능명세 UI 가이드 — 메인 컬러는 파랑, 카드는 흰색, 바탕은 연한 청회색.

export const COLORS = {
  primary: "#1D6FB8",
  primaryDark: "#154E84",
  primarySoft: "#E6F0FA",
  bg: "#F3F6FA",
  card: "#FFFFFF",
  border: "#DFE6EE",
  text: "#10161F",
  textMuted: "#4F5B6B",
  textSubtle: "#7B8797",
  onPrimary: "#FFFFFF",
  success: "#17703D",
  successSoft: "#E3F4EA",
  warning: "#8A5A0B",
  warningSoft: "#FDF3DC",
  danger: "#B42828",
  dangerSoft: "#FDE8E8",
  /** 기부·사회공헌 강조색 */
  donation: "#D9468A",
  overlay: "rgba(16, 22, 31, 0.5)",
} as const;
export type ColorToken = keyof typeof COLORS;

export const RADIUS = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;
export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const FONT_SIZE = { xs: 11, sm: 13, md: 15, lg: 17, xl: 20, xxl: 26, display: 34 } as const;

/** 앱 본문이 놓이는 가로 폭(px). 웹은 이 폭의 휴대폰 모양으로 가운데에 보여 줘요. */
export const PHONE_WIDTH = 430;

/** 챌린지 표지 색: hue(0~360) 하나로 위·아래 두 색을 만들어요 (CSS·React Native 모두 hsl() 문자열을 이해해요) */
export function coverColors(hue: number): { from: string; to: string } {
  const h = ((Math.round(hue) % 360) + 360) % 360;
  return { from: `hsl(${h}, 72%, 52%)`, to: `hsl(${(h + 32) % 360}, 68%, 38%)` };
}
