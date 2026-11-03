// 웹·모바일이 함께 쓰는 디자인 토큰(색·간격·글자 크기). 웹은 CSS 변수로, 모바일은 StyleSheet 로 같은 값을 써서 두 앱이 같은 모습이에요.
// 기준: 차분한 색감(채도를 낮춘 메인 색 · 흰 카드 · 옅은 바탕). 강조는 넓은 면이 아니라 작은 표시(테두리·점)에만 써요.

export const COLORS = {
  primary: "#2F5E50",
  primaryDark: "#22463B",
  primarySoft: "#E7EFEB",
  bg: "#F4F6F4",
  card: "#FFFFFF",
  border: "#DEE4E0",
  text: "#1E2925",
  textMuted: "#53605A",
  textSubtle: "#808B86",
  onPrimary: "#FFFFFF",
  success: "#3D7350",
  successSoft: "#E6EFE8",
  warning: "#876620",
  warningSoft: "#F6EFDD",
  danger: "#A4473F",
  dangerSoft: "#F7E8E5",
  /** 기부·사회공헌 강조색 */
  donation: "#9A5A77",
  overlay: "rgba(30, 41, 37, 0.5)",
} as const;
export type ColorToken = keyof typeof COLORS;

export const RADIUS = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;
export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const FONT_SIZE = { xs: 11, sm: 13, md: 15, lg: 17, xl: 20, xxl: 26, display: 34 } as const;

/** 앱 본문이 놓이는 가로 폭(px). 웹은 이 폭의 휴대폰 모양으로 가운데에 보여 줘요. */
export const PHONE_WIDTH = 430;

/**
 * 그래프·막대의 계열 색(차분한 4색). 같은 대상은 어느 그래프에서나 같은 색이에요.
 * 채도를 낮췄지만(OKLCH C 0.10) 색맹 시뮬레이션(Machado 2009)에서 이웃한 색끼리 ΔE 8 이상, 보통 시각 ΔE 15 이상인 것을 확인했어요.
 * 웹 운영자 화면 admin.css 의 --adm-c1~c4 가 이 순서 그대로예요(globals.test.ts 가 비교해요). 색만으로 알리지 않게 이름·숫자를 항상 함께 둬요.
 */
export const CHART_COLORS = ["#3770A3", "#AC6549", "#2FA094", "#C19652"] as const;

/** ESG 영역 막대 색: 환경 = 청록, 사회 = 파랑, 지배구조 = 적갈색 (메인 색인 초록과 겹치지 않게 그래프 색에서 골라요) */
export const ESG_COLORS = { E: CHART_COLORS[2], S: CHART_COLORS[0], G: CHART_COLORS[1] } as const;

/**
 * SDGs 실천 마크의 별 색(#35, 웹·앱 같은 값): 가득·반 별은 금색(star — 흰 카드·옅은 바탕과 3:1 이상), 빈 별은 같은 금색 테두리 + 옅은 금색 바탕(starSoft).
 * 별 그림은 늘 숫자(★2.5)와 함께 보여서 색만으로 뜻을 전하지 않아요. 웹은 globals.css 의 --mark-star · --mark-star-soft 가 같은 값이에요(globals.test.ts).
 */
export const MARK_COLORS = { star: "#A87612", starSoft: "#F5EEDC" } as const;

/**
 * #RRGGBB 를 흰색과 섞은 옅은 색(amount 0~1 = 원래 색의 비율, 결과도 #RRGGBB). SDG 타일·기업 로고처럼 넓은 면을 차분하게 칠할 때 써요.
 * 모양이 #RRGGBB 가 아니면 그대로 돌려줘요(화면이 깨지지 않게).
 */
export function tint(hex: string, amount: number): string {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return hex;
  const a = Math.min(1, Math.max(0, Number.isFinite(amount) ? amount : 0));
  const ch = (i: number) => Math.round(255 - (255 - parseInt(hex.slice(i, i + 2), 16)) * a);
  return `#${[1, 3, 5].map((i) => ch(i).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

/**
 * 홈 SDG 타일의 옅은 색 비율(tint 의 amount, 웹·앱 같은 값): 바탕 16%, 모집 중 과제가 0건인 타일은 바탕 6%·왼쪽 띠 45%로 흐리게(#29).
 * 흐린 타일도 글자 대비(textMuted 4.5:1 이상)는 지켜요 — theme.test.ts 가 17색 모두 확인해요.
 */
export const SDG_TILE_TINT = { base: 0.16, zero: 0.06, zeroBar: 0.45 } as const;

/** 챌린지 표지 색: hue(0~360) 하나로 위·아래 두 색을 만들어요 (CSS·React Native 모두 hsl() 문자열을 이해해요). 채도를 낮춰서 표지가 넓어도 차분해요 */
export function coverColors(hue: number): { from: string; to: string } {
  const h = ((Math.round(hue) % 360) + 360) % 360;
  return { from: `hsl(${h}, 30%, 47%)`, to: `hsl(${(h + 24) % 360}, 28%, 33%)` };
}
