// 화면 문구 사전: 모든 문구는 { ja, ko } 한 쌍. 키는 "영역.이름" 형식이고, 존재하지 않는 키는 타입 오류가 나요.
// 새 문구는 영역별 파일(messages/*.ts)에 더하세요. 웹·모바일 전용 문구는 extraWeb.ts / extraMobile.ts 에.
import { interpolate, type Locale, type LocalizedText, type MessageParams } from "./i18n";
import { b2b } from "./messages/b2b";
import { b2c } from "./messages/b2c";
import { common } from "./messages/common";
import { extraMobile } from "./messages/extraMobile";
import { extraWeb } from "./messages/extraWeb";
import { feed } from "./messages/feed";
import { settings } from "./messages/settings";

export const MESSAGES = { ...common, ...b2c, ...b2b, ...feed, ...settings, ...extraWeb, ...extraMobile } as const;
export type MessageKey = keyof typeof MESSAGES;

/** 사전에서 문구를 꺼내 {자리표시자}를 채워요 */
export function translate(key: MessageKey, locale: Locale, params?: MessageParams): string {
  return interpolate(MESSAGES[key][locale], params);
}

/** 키를 미리 정해 두는 번역 함수 (화면에서 const t = makeT(locale) 로 써요) */
export type TFunction = (key: MessageKey, params?: MessageParams) => string;
export function makeT(locale: Locale): TFunction {
  return (key, params) => translate(key, locale, params);
}

/**
 * 맨 처음 화면(언어 선택)의 문구. 아직 언어를 고르기 전이라 두 언어를 함께 보여 줘요.
 * 사전(MESSAGES)과 달리 한 화면에 ja·ko 가 같이 나와요.
 */
export const LANGUAGE_PICKER = {
  title: { ja: "言語を選択", ko: "언어 선택" },
  subtitle: { ja: "アプリで使う言語を選んでください", ko: "앱에서 사용할 언어를 선택하세요" },
  note: { ja: "あとから設定で変更できます", ko: "나중에 설정에서 변경할 수 있어요" },
} as const satisfies Record<string, LocalizedText>;
