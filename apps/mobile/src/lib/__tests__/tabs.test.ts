// 아래 탭 정의(학생 6개 / 기업 6개, 피드는 둘째): 이름이 겹치지 않고 문구가 모두 있고, 좁은 휴대폰에서도 이름이 한 줄에 들어가요.
import { MESSAGES } from "@sdgs-compass/core/messages";
import { B2B_TABS, B2C_TABS, TAB_BAR_HEIGHT, TAB_LABEL_MIN_SCALE, TAB_LABEL_SIZE } from "../tabs";

test("학생·개인 탭 (피드는 홈 다음)", () => {
  expect(B2C_TABS.map((tab) => tab.name)).toEqual(["index", "feed", "search", "impact", "messages", "settings"]);
});

test("기업·단체 탭 (피드는 대시보드 다음)", () => {
  expect(B2B_TABS.map((tab) => tab.name)).toEqual(["index", "feed", "applicants", "talent", "esg", "settings"]);
});

test("학생·기업 모두 피드 탭은 같은 이름·문구·아이콘이에요 (SNS 피드는 두 계정이 함께 쓰는 곳)", () => {
  const feeds = [B2C_TABS, B2B_TABS].map((tabs) => tabs.find((tab) => tab.name === "feed"));
  expect(feeds[0]).toEqual(feeds[1]);
  expect(feeds[0]?.labelKey).toBe("nav.feed");
  expect(feeds[0]?.emoji).toBe("📰");
});

test("탭마다 두 언어 문구와 아이콘(이모지)이 있고, 한 묶음 안에서 이름이 겹치지 않아요", () => {
  for (const tabs of [B2C_TABS, B2B_TABS]) {
    expect(new Set(tabs.map((tab) => tab.name)).size).toBe(tabs.length);
    expect(new Set(tabs.map((tab) => tab.emoji)).size).toBe(tabs.length);
    for (const tab of tabs) {
      expect(Object.keys(MESSAGES)).toContain(tab.labelKey);
      expect(tab.emoji.length).toBeGreaterThan(0);
    }
  }
});

test("두 묶음의 탭 개수가 같아서 계정을 바꿔도 탭 막대 칸 폭이 같아요", () => {
  expect(B2C_TABS).toHaveLength(6);
  expect(B2B_TABS).toHaveLength(B2C_TABS.length);
});

/** 글자 크기 1 기준으로 대략 몇 글자 폭인지: 한글·일본어·전각은 1, 영문·숫자·공백은 0.55 */
function displayUnits(text: string): number {
  return Array.from(text).reduce((sum, char) => sum + (/[　-鿿가-힯＀-￯]/.test(char) ? 1 : 0.55), 0);
}

/** 가장 좁게 잡는 휴대폰 폭(dp)과 한 칸 안에서 양옆에 남겨 둘 여백 합 */
const NARROWEST_PHONE_WIDTH = 320;
const CELL_PADDING = 8;

test("탭 이름은 6칸으로 나눈 가장 좁은 폭(320dp ÷ 6)에서도 줄어든 글자로 한 줄에 들어가요", () => {
  const cell = NARROWEST_PHONE_WIDTH / B2C_TABS.length - CELL_PADDING;
  for (const tab of [...B2C_TABS, ...B2B_TABS]) {
    for (const locale of ["ja", "ko"] as const) {
      const shrunkWidth = displayUnits(MESSAGES[tab.labelKey][locale]) * TAB_LABEL_SIZE * TAB_LABEL_MIN_SCALE;
      expect(shrunkWidth).toBeLessThanOrEqual(cell);
    }
  }
});

test("탭 이름 글자 크기는 줄어들 수 있는 범위가 정해져 있어요 (너무 작아지면 읽을 수 없어요)", () => {
  expect(TAB_LABEL_SIZE).toBeGreaterThanOrEqual(10);
  expect(TAB_LABEL_MIN_SCALE).toBeGreaterThan(0);
  expect(TAB_LABEL_MIN_SCALE).toBeLessThan(1);
  // 줄어든 뒤에도 7.5dp 보다는 커야 해요
  expect(TAB_LABEL_SIZE * TAB_LABEL_MIN_SCALE).toBeGreaterThanOrEqual(7.5);
});

test("긴 이름(기업 대시보드의 일본어 원문)은 줄어도 안 들어가므로 짧은 문구를 따로 써요", () => {
  expect(displayUnits("ダッシュボード") * TAB_LABEL_SIZE * TAB_LABEL_MIN_SCALE).toBeGreaterThan(NARROWEST_PHONE_WIDTH / B2B_TABS.length - CELL_PADDING);
  expect(B2B_TABS[0].labelKey).toBe("mobile.tabDashboard");
  expect(TAB_BAR_HEIGHT).toBeGreaterThanOrEqual(49);
});
