// 첫 화면에서 미리 강조할 언어: 기기 언어를 읽되 고르는 건 사람이 해요.
import { DEFAULT_LOCALE } from "@sdgs-compass/core/i18n";
import { detectDeviceLocale, deviceLanguages } from "../language";

test("기기 언어 태그 → 언어", () => {
  expect(detectDeviceLocale(() => "ko-KR")).toBe("ko");
  expect(detectDeviceLocale(() => "ja-JP")).toBe("ja");
  expect(detectDeviceLocale(() => "KO")).toBe("ko");
});

test("모르는 언어·알 수 없음·오류는 기본 언어", () => {
  expect(detectDeviceLocale(() => "en-US")).toBe(DEFAULT_LOCALE);
  expect(detectDeviceLocale(() => undefined)).toBe(DEFAULT_LOCALE);
  expect(
    detectDeviceLocale(() => {
      throw new Error("no intl");
    }),
  ).toBe(DEFAULT_LOCALE);
});

test("언어 태그 목록", () => {
  expect(deviceLanguages(() => "ko-KR")).toEqual(["ko-KR"]);
  expect(deviceLanguages(() => undefined)).toEqual([]);
  expect(
    deviceLanguages(() => {
      throw new Error("boom");
    }),
  ).toEqual([]);
  expect(deviceLanguages().length).toBeLessThanOrEqual(1);
});
