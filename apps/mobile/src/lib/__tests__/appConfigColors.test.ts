// app.config.ts 의 색(앱 바탕 · 안드로이드 아이콘 바탕 · 스플래시)이 core 디자인 토큰과 같은지 확인해요.
// 설정 파일은 앱 코드를 불러오지 않아서 색을 글자로 적어 두는데, 팔레트를 바꿀 때 여기만 옛 색으로 남지 않게 해요.
import { COLORS } from "@sdgs-compass/core/theme";
import config from "../../../app.config";

/** plugins 의 ["expo-splash-screen", { backgroundColor }] 에서 색을 꺼내요 (플러그인 항목 타입이 튜플 합집합이라 unknown 으로 받아서 좁혀요) */
function splashBackground(): unknown {
  for (const plugin of (config.plugins ?? []) as unknown[]) {
    if (Array.isArray(plugin) && plugin[0] === "expo-splash-screen") return (plugin[1] as { backgroundColor?: unknown } | undefined)?.backgroundColor;
  }
  return undefined;
}

test("앱 바탕색 = COLORS.bg", () => {
  expect(config.backgroundColor).toBe(COLORS.bg);
});

test("안드로이드 아이콘 바탕 · 스플래시 = COLORS.primary", () => {
  expect(config.android?.adaptiveIcon?.backgroundColor).toBe(COLORS.primary);
  expect(splashBackground()).toBe(COLORS.primary);
});
