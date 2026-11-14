import { describe, expect, it } from "vitest";
import type { Activity } from "./domain";
import { SDG_IDS } from "./sdg";
import { computeSdgExp, REVIEW_EXP_MAX, reviewExp, STATUS_LEVEL_EXP, STATUS_MAX_LEVEL, statusLevel, statusLevelUps, topStatusSdgs } from "./status";

const act = (id: string, kind: Activity["kind"], sdgIds: Activity["sdgIds"], scores?: Activity["scores"]): Activity => ({
  id,
  kind,
  title: { ja: "クエスト", ko: "퀘스트" },
  companyName: { ja: "会社", ko: "회사" },
  sdgIds,
  date: "2026-10-01",
  points: 100,
  ...(scores ? { scores } : {}),
});

describe("스테이터스(#45): 기업의 평가 점수가 SDG 항목의 EXP 가 돼요", () => {
  it("평가 EXP = 세 항목의 합계 × 10 (최대 150) · 평가가 없으면 0", () => {
    expect(reviewExp({ creativity: 4, feasibility: 4, sdgContribution: 5 })).toBe(130);
    expect(reviewExp({ creativity: 5, feasibility: 5, sdgContribution: 5 })).toBe(REVIEW_EXP_MAX);
    expect(REVIEW_EXP_MAX).toBe(150);
    expect(reviewExp({ creativity: 1, feasibility: 1, sdgContribution: 1 })).toBe(30);
    expect(reviewExp(undefined)).toBe(0);
    expect(reviewExp(null)).toBe(0);
  });

  it("평가받은 실적마다 그 퀘스트의 SDG 에 더해요 — 참가 · 수상 · 공유만으로는 늘지 않아요(상을 못 받아도 평가만큼은 들어가요)", () => {
    const exp = computeSdgExp([
      act("s1", "submission", [14, 12], { creativity: 4, feasibility: 4, sdgContribution: 3 }),
      act("s2", "submission", [14, 14, 8], { creativity: 5, feasibility: 4, sdgContribution: 5 }),
      act("a1", "award", [14, 12]),
      act("p1", "participation", [11]),
      act("x1", "share", []),
    ]);
    expect(exp[14]).toBe(110 + 140);
    expect(exp[12]).toBe(110);
    expect(exp[8]).toBe(140);
    expect(exp[11]).toBe(0);
    expect(Object.keys(exp)).toHaveLength(17);
    expect(topStatusSdgs(exp)).toEqual([14, 8, 12]);
    const none = computeSdgExp([]);
    for (const id of SDG_IDS) expect(none[id]).toBe(0);
    expect(topStatusSdgs(none)).toEqual([]);
  });

  it("레벨: Lv.1 은 0, 레벨이 오를수록 다음까지의 EXP 가 늘고, Lv.10 이 최고", () => {
    expect(STATUS_MAX_LEVEL).toBe(10);
    for (let i = 1; i < STATUS_LEVEL_EXP.length; i++) expect(STATUS_LEVEL_EXP[i] - STATUS_LEVEL_EXP[i - 1]).toBeGreaterThanOrEqual(i === 1 ? 100 : STATUS_LEVEL_EXP[i - 1] - STATUS_LEVEL_EXP[i - 2]);
    expect(statusLevel(0)).toEqual({ level: 1, nextAt: 100, remaining: 100, ratio: 0 });
    expect(statusLevel(110)).toEqual({ level: 2, nextAt: 200, remaining: 90, ratio: 0.1 });
    expect(statusLevel(200).level).toBe(3);
    expect(statusLevel(1699)).toMatchObject({ level: 9, nextAt: 1700, remaining: 1 });
    expect(statusLevel(1700)).toEqual({ level: 10, nextAt: null, remaining: 0, ratio: 1 });
    expect(statusLevel(99999).level).toBe(10);
  });

  it("평가 하나로 레벨이 오른 항목만 알려요", () => {
    const exp = computeSdgExp([
      act("old", "submission", [14, 12], { creativity: 4, feasibility: 4, sdgContribution: 3 }),
      act("new", "submission", [14, 7], { creativity: 5, feasibility: 4, sdgContribution: 5 }),
    ]);
    // 14: 110 → 250(Lv.2 → Lv.3), 7: 0 → 140(Lv.1 → Lv.2)
    expect(statusLevelUps(exp, [14, 7], 140)).toEqual([
      { sdgId: 14, level: 3 },
      { sdgId: 7, level: 2 },
    ]);
    expect(statusLevelUps(exp, [12], 0)).toEqual([]);
  });
});
