import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, detectLocale, interpolate, isLocale, localeFromQuery, LOCALE_NAMES, LOCALES, pick, placeholdersOf } from "./i18n";

describe("locale", () => {
  it("일본어와 한국어 두 가지예요", () => {
    expect(LOCALES).toEqual(["ja", "ko"]);
    expect(LOCALE_NAMES).toEqual({ ja: "日本語", ko: "한국어" });
    expect(DEFAULT_LOCALE).toBe("ja");
  });

  it("isLocale", () => {
    expect(isLocale("ja")).toBe(true);
    expect(isLocale("ko")).toBe(true);
    expect(isLocale("en")).toBe(false);
    expect(isLocale(null)).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });

  it("기기 언어 목록에서 처음 강조할 언어를 정해요 (선택을 대신하지는 않아요)", () => {
    expect(detectLocale(["ko-KR", "en"])).toBe("ko");
    expect(detectLocale(["ja-JP"])).toBe("ja");
    expect(detectLocale(["en-US", "ko"])).toBe("ko");
    expect(detectLocale(["en-US", "fr"])).toBe("ja");
    expect(detectLocale([])).toBe("ja");
    expect(detectLocale(null)).toBe("ja");
    expect(detectLocale(undefined)).toBe("ja");
    expect(detectLocale(["KO"])).toBe("ko");
  });
});

describe("pick", () => {
  it("문자열은 그대로, 두 언어 문구는 지금 언어의 글을 꺼내요", () => {
    expect(pick("Mina", "ja")).toBe("Mina");
    expect(pick("Mina", "ko")).toBe("Mina");
    expect(pick({ ja: "こんにちは", ko: "안녕하세요" }, "ja")).toBe("こんにちは");
    expect(pick({ ja: "こんにちは", ko: "안녕하세요" }, "ko")).toBe("안녕하세요");
  });
});

describe("interpolate / placeholdersOf", () => {
  it("{자리표시자}를 값으로 바꿔요", () => {
    expect(interpolate("{a}님 {b}pt", { a: "Mina", b: 1480 })).toBe("Mina님 1480pt");
    expect(interpolate("{a} と {a}", { a: "x" })).toBe("x と x");
  });

  it("값이 없으면 자리표시자를 그대로 둬요", () => {
    expect(interpolate("{a} {b}", { a: 1 })).toBe("1 {b}");
    expect(interpolate("고정 문구")).toBe("고정 문구");
  });

  it("자리표시자 이름 목록(중복 없이, 정렬)", () => {
    expect(placeholdersOf("{b} {a} {b}")).toEqual(["a", "b"]);
    expect(placeholdersOf("없음")).toEqual([]);
  });
});

describe("localeFromQuery (#20 ?lang=)", () => {
  it("lang 값이 ja·ko 면 그 언어 (대소문자·앞뒤 공백 무시)", () => {
    expect(localeFromQuery("?lang=ja")).toBe("ja");
    expect(localeFromQuery("lang=ko")).toBe("ko");
    expect(localeFromQuery("?lang=KO")).toBe("ko");
    expect(localeFromQuery("?lang=%20ja%20")).toBe("ja");
    expect(localeFromQuery("?lang=%6Aa")).toBe("ja");
  });
  it("다른 쿼리와 섞여 있어도 lang 만 봐요 · 여러 번이면 첫 값", () => {
    expect(localeFromQuery("?utm_source=qr&lang=ja")).toBe("ja");
    expect(localeFromQuery("?lang=ja&lang=ko")).toBe("ja");
    expect(localeFromQuery("?language=ko&lang=ja")).toBe("ja");
  });
  it("없거나 모르는 값·깨진 인코딩이면 null (예외 없이)", () => {
    expect(localeFromQuery("")).toBeNull();
    expect(localeFromQuery(null)).toBeNull();
    expect(localeFromQuery(undefined)).toBeNull();
    expect(localeFromQuery("?")).toBeNull();
    expect(localeFromQuery("?lang=")).toBeNull();
    expect(localeFromQuery("?lang")).toBeNull();
    expect(localeFromQuery("?lang=en")).toBeNull();
    expect(localeFromQuery("?lang=<script>")).toBeNull();
    expect(localeFromQuery("?lang=%E0%A4%A")).toBeNull();
    expect(localeFromQuery("?LANG=ja")).toBeNull();
  });
});
