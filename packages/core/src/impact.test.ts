import { describe, expect, it } from "vitest";
import type { Activity } from "./domain";
import { AWARD_POINTS, computeBadges, computeImpactIndex, levelOf, levelProgress, LEVEL_THRESHOLDS, reviewBonus, SDG_SATURATION } from "./impact";
import { SDG_IDS } from "./sdg";

const activity = (overrides: Partial<Activity> = {}): Activity => ({
  id: "a1", kind: "submission", title: "t", companyName: "c", sdgIds: [14], date: "2026-10-01", points: 100, ...overrides,
});

describe("레벨", () => {
  it("경계값", () => {
    expect(LEVEL_THRESHOLDS).toEqual([0, 300, 700, 1500, 2500]);
    expect(levelOf(0)).toBe(1);
    expect(levelOf(299)).toBe(1);
    expect(levelOf(300)).toBe(2);
    expect(levelOf(699)).toBe(2);
    expect(levelOf(700)).toBe(3);
    expect(levelOf(1499)).toBe(3);
    expect(levelOf(1500)).toBe(4);
    expect(levelOf(2499)).toBe(4);
    expect(levelOf(2500)).toBe(5);
    expect(levelOf(99999)).toBe(5);
  });

  it("다음 레벨까지 남은 포인트와 진행률", () => {
    const p = levelProgress(1476);
    expect(p.level).toBe(3);
    expect(p.next).toBe(4);
    expect(p.remaining).toBe(24);
    expect(p.ratio).toBeCloseTo((1476 - 700) / 800, 5);
    const top = levelProgress(3000);
    expect(top).toEqual({ level: 5, next: null, remaining: 0, ratio: 1 });
    expect(levelProgress(0).ratio).toBe(0);
  });
});

describe("심사 보너스", () => {
  it("평균 점수에 비례 (최대 80)", () => {
    expect(reviewBonus(undefined)).toBe(0);
    expect(reviewBonus({ creativity: 5, feasibility: 5, sdgContribution: 5 })).toBe(80);
    expect(reviewBonus({ creativity: 4, feasibility: 4, sdgContribution: 4 })).toBe(64);
    expect(reviewBonus({ creativity: 1, feasibility: 1, sdgContribution: 1 })).toBe(16);
    expect(reviewBonus({ creativity: 4, feasibility: 3, sdgContribution: 4 })).toBe(59);
  });
});

describe("Impact Index", () => {
  it("활동이 없으면 모두 0", () => {
    const index = computeImpactIndex([]);
    expect(index.totalPoints).toBe(0);
    expect(index.level).toBe(1);
    expect(index.topSdgs).toEqual([]);
    for (const id of SDG_IDS) expect(index.perSdg[id]).toBe(0);
  });

  it("같은 활동 안에서 SDG 가 겹쳐도 한 번만 세요", () => {
    const index = computeImpactIndex([activity({ sdgIds: [14, 14, 12], points: SDG_SATURATION })]);
    expect(index.rawPerSdg[14]).toBe(SDG_SATURATION);
    expect(index.rawPerSdg[12]).toBe(SDG_SATURATION);
    expect(index.perSdg[14]).toBe(63);
    expect(index.totalPoints).toBe(SDG_SATURATION);
  });

  it("점수는 0~100 이고, 상위 3개는 점수 순(같으면 번호 순)", () => {
    const index = computeImpactIndex([
      activity({ sdgIds: [14], points: 900 }),
      activity({ sdgIds: [12], points: 300 }),
      activity({ sdgIds: [13], points: 300 }),
      activity({ sdgIds: [4], points: 50 }),
    ]);
    for (const id of SDG_IDS) {
      expect(index.perSdg[id]).toBeGreaterThanOrEqual(0);
      expect(index.perSdg[id]).toBeLessThanOrEqual(100);
    }
    expect(index.topSdgs).toEqual([14, 12, 13]);
  });

  it("포인트가 늘면 점수도 늘지만 100 을 넘지 않아요", () => {
    const small = computeImpactIndex([activity({ points: 100 })]).perSdg[14];
    const big = computeImpactIndex([activity({ points: 5000 })]).perSdg[14];
    expect(big).toBeGreaterThan(small);
    expect(big).toBeLessThanOrEqual(100);
  });
});

describe("배지", () => {
  it("조건별로 얻어요", () => {
    expect(computeBadges([])).toEqual([]);
    expect(computeBadges([activity({ kind: "share", sdgIds: [] })])).toEqual([]);
    expect(computeBadges([activity()])).toEqual(["firstStep"]);

    const three = [activity({ id: "1" }), activity({ id: "2" }), activity({ id: "3" })];
    expect(computeBadges(three)).toContain("challenger");

    const award = [activity(), activity({ id: "x", kind: "award", award: "special", points: AWARD_POINTS.special })];
    expect(computeBadges(award)).toContain("winner");

    const five = [activity({ sdgIds: [1, 2, 3, 4, 5] })];
    expect(computeBadges(five)).toContain("multiSdg");

    expect(computeBadges([activity({ sdgIds: [14], points: 200 })])).toContain("ocean");
    expect(computeBadges([activity({ sdgIds: [14], points: 199 })])).not.toContain("ocean");

    const shares = [1, 2, 3].map((n) => activity({ id: `s${n}`, kind: "share", sdgIds: [], points: 10 }));
    expect(computeBadges(shares)).toContain("sharer");
    expect(computeBadges(shares.slice(0, 2))).not.toContain("sharer");
  });
});
