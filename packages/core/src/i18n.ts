// 일본어(ja)·한국어(ko) 두 언어를 다루는 가장 기본 도구. 화면 문구 사전은 messages.ts 에 있어요.
// 앱은 처음 열 때 언어를 고르게 하고(첫 화면), 설정에서 언제든 바꿀 수 있어요. 고른 값은 각 앱이 저장해요(data/prefs.ts).

export const LOCALES = ["ja", "ko"] as const;
export type Locale = (typeof LOCALES)[number];

/** 아직 고르지 않았을 때 첫 화면에서 미리 강조해 보여 줄 기본값 (선택을 강제하지는 않아요) */
export const DEFAULT_LOCALE: Locale = "ja";

/** 각 언어가 자기 이름으로 적은 이름 (언어 선택 단추에 써요) */
export const LOCALE_NAMES: Record<Locale, string> = { ja: "日本語", ko: "한국어" };

/** 두 언어 문구 한 쌍 */
export interface LocalizedText {
  readonly ja: string;
  readonly ko: string;
}

/** 사람이 직접 적은 글(한 가지 언어, 두 언어에 그대로 보임)이거나, 두 언어 문구 한 쌍 */
export type Text = string | LocalizedText;

export function isLocale(value: unknown): value is Locale {
  return value === "ja" || value === "ko";
}

/** Text 에서 지금 언어의 글을 꺼내요 */
export function pick(text: Text, locale: Locale): string {
  return typeof text === "string" ? text : text[locale];
}

/**
 * 기기·브라우저의 언어 목록(예: navigator.languages)에서 첫 화면에서 미리 강조할 언어를 정해요.
 * ko 로 시작하면 ko, ja 로 시작하면 ja, 그 밖에는 기본값(ja). 선택을 대신하지는 않아요.
 */
export function detectLocale(languages: readonly string[] | null | undefined): Locale {
  for (const lang of languages ?? []) {
    const lower = lang.toLowerCase();
    if (lower.startsWith("ko")) return "ko";
    if (lower.startsWith("ja")) return "ja";
  }
  return DEFAULT_LOCALE;
}

/**
 * 주소의 쿼리(예: location.search 의 "?lang=ja")에서 언어를 읽어요(#20 — QR 로 열면 일본어로 바로 시작).
 * 이름이 정확히 `lang` 인 첫 값만 보고, 값은 대소문자를 가리지 않아요. ja·ko 가 아니거나 읽을 수 없으면 null.
 * URLSearchParams 에 기대지 않고 직접 나눠요(앱·서버 어디서든 같은 결과, 깨진 %인코딩도 예외 없이 null).
 */
export function localeFromQuery(search: string | null | undefined): Locale | null {
  if (!search) return null;
  const query = search.startsWith("?") ? search.slice(1) : search;
  for (const part of query.split("&")) {
    const eq = part.indexOf("=");
    const rawName = eq === -1 ? part : part.slice(0, eq);
    let name: string;
    let value: string;
    try {
      name = decodeURIComponent(rawName.replace(/\+/g, " "));
      value = eq === -1 ? "" : decodeURIComponent(part.slice(eq + 1).replace(/\+/g, " "));
    } catch {
      if (rawName === "lang") return null;
      continue;
    }
    if (name !== "lang") continue;
    const lower = value.trim().toLowerCase();
    return isLocale(lower) ? lower : null;
  }
  return null;
}

export type MessageParams = Record<string, string | number>;

/** "{name}" 자리를 값으로 바꿔요. 값이 없으면 자리표시자를 그대로 둬요. */
export function interpolate(template: string, params?: MessageParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => (key in params ? String(params[key]) : whole));
}

/** 문구 안의 {자리표시자} 이름 목록 (두 언어가 같은 자리표시자를 쓰는지 테스트가 확인해요) */
export function placeholdersOf(template: string): string[] {
  const names = new Set<string>();
  for (const match of template.matchAll(/\{(\w+)\}/g)) names.add(match[1]);
  return [...names].sort();
}
