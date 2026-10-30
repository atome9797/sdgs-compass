// ESG 화면 도우미: 0/1 스위치 항목, 만점 목표 문구 값, 영역별 달성도 막대 비율.
import { categoryRatio, isFlagItem, targetParams } from "../esg";

test("0/1 로 답하는 항목(unit = flag)만 스위치 항목", () => {
  expect(isFlagItem({ unit: "flag" })).toBe(true);
  expect(isFlagItem({ unit: "percent" })).toBe(false);
});

test("만점 목표 문구 값: 스위치 항목은 안내하지 않아요", () => {
  expect(targetParams({ unit: "flag", unitLabel: "", target: 1 })).toBeNull();
  expect(targetParams({ unit: "yen", unitLabel: "円", target: 300000 })).toEqual({ target: "300,000", unit: "円" });
});

test("달성도 0~100 → 막대 비율 0~1", () => {
  expect(categoryRatio(0)).toBe(0);
  expect(categoryRatio(50)).toBe(0.5);
  expect(categoryRatio(100)).toBe(1);
  expect(categoryRatio(140)).toBe(1);
  expect(categoryRatio(-5)).toBe(0);
  expect(categoryRatio(Number.NaN)).toBe(0);
});
