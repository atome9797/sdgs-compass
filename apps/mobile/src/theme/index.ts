// 디자인 토큰: 웹과 같은 값을 core(theme.ts)에서 가져와요. 모바일 전용 조각(그림자·누르는 영역)만 여기에 더해요.
// 대비는 core/theme.test.ts 가 지켜 줘요: 글자는 text·textMuted(흰 카드 위 4.5:1 이상), 버튼은 onPrimary-on-primary 만 써요.
// textSubtle·donation 은 흰 바탕에서 4.5:1 에 못 미쳐서, 큰 글자(18pt 이상 굵게)나 장식에만 써요.
import { Platform, type ViewStyle } from "react-native";

export { COLORS, FONT_SIZE, PHONE_WIDTH, RADIUS, SPACE, coverColors } from "@sdgs-compass/core/theme";

/** 누를 수 있는 곳의 최소 높이·너비(dp) */
export const HIT = 44;

/** 카드의 부드러운 그림자 (iOS 는 shadow*, Android 는 elevation) */
export const CARD_SHADOW: ViewStyle = {
  shadowColor: "#10161F",
  shadowOpacity: 0.07,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
};

/** 해시·번호처럼 글자 폭을 맞춰 보여 줄 글꼴 (iOS 는 Menlo, Android 는 monospace) */
export const MONO_FONT: string = Platform.select({ ios: "Menlo", default: "monospace" });
