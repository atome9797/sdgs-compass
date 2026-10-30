// 맨 처음 화면(언어 선택)에서 미리 강조해 보여 줄 언어를 기기 설정에서 알아내요.
// 선택을 대신하지는 않아요 — 사람이 직접 누르기 전에는 언어가 정해지지 않아요.
import { detectLocale, type Locale } from "@sdgs-compass/core/i18n";

/** 기기의 언어 태그를 돌려주는 함수 (테스트에서 바꿔 끼워요) */
export type LocaleResolver = () => string | undefined;

const intlResolver: LocaleResolver = () => Intl.DateTimeFormat().resolvedOptions().locale;

/** 기기 언어 태그 목록 (예: ["ko-KR"]). 알아낼 수 없으면 빈 목록 */
export function deviceLanguages(resolve: LocaleResolver = intlResolver): string[] {
  try {
    const tag = resolve();
    return tag ? [tag] : [];
  } catch {
    return [];
  }
}

/** ko 로 시작하면 ko, ja 로 시작하면 ja, 그 밖·알 수 없음은 기본값(ja) */
export function detectDeviceLocale(resolve: LocaleResolver = intlResolver): Locale {
  return detectLocale(deviceLanguages(resolve));
}
