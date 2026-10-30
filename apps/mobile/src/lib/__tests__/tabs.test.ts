// 아래 탭 정의(학생 5개 / 기업 5개): 이름이 겹치지 않고 문구가 모두 있어요.
import { MESSAGES } from "@sdgs-compass/core/messages";
import { B2B_TABS, B2C_TABS, TAB_BAR_HEIGHT } from "../tabs";

test("학생·개인 탭", () => {
  expect(B2C_TABS.map((tab) => tab.name)).toEqual(["index", "search", "impact", "messages", "settings"]);
});

test("기업·단체 탭", () => {
  expect(B2B_TABS.map((tab) => tab.name)).toEqual(["index", "applicants", "talent", "esg", "settings"]);
});

test("탭마다 두 언어 문구와 아이콘(이모지)이 있고, 한 묶음 안에서 이름이 겹치지 않아요", () => {
  for (const tabs of [B2C_TABS, B2B_TABS]) {
    expect(new Set(tabs.map((tab) => tab.name)).size).toBe(tabs.length);
    for (const tab of tabs) {
      expect(Object.keys(MESSAGES)).toContain(tab.labelKey);
      expect(tab.emoji.length).toBeGreaterThan(0);
    }
  }
});

/** 12px 글자 기준으로 대략 몇 글자 폭인지: 한글·일본어·전각은 1, 영문·숫자·공백은 0.55 */
function displayUnits(text: string): number {
  return Array.from(text).reduce((sum, char) => sum + (/[\u3000-\u9fff\uac00-\ud7af\uff00-\uffef]/.test(char) ? 1 : 0.55), 0);
}

test("탭 이름은 한 줄에 들어가도록 짧아요 (휴대폰 폭 360dp ÷ 5칸 = 72dp ≈ 6글자)", () => {
  for (const tab of [...B2C_TABS, ...B2B_TABS]) {
    for (const locale of ["ja", "ko"] as const) {
      expect(displayUnits(MESSAGES[tab.labelKey][locale])).toBeLessThanOrEqual(6);
    }
  }
  expect(displayUnits("ダッシュボード")).toBeGreaterThan(6);
  expect(B2B_TABS[0].labelKey).toBe("mobile.tabDashboard");
  expect(TAB_BAR_HEIGHT).toBeGreaterThanOrEqual(49);
});
