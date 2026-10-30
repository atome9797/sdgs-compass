import { describe, expect, it } from "vitest";
import { makeChallenge, makeProfile } from "./testing/fixtures";
import { interestWeight, isOpenFor, recommendChallenges, scoreChallenge } from "./recommend";

const TODAY = "2026-10-30";

describe("추천 점수", () => {
  it("관심 SDGs 의 우선순위 가중치", () => {
    expect(interestWeight([14, 12, 13], 14)).toBe(1);
    expect(interestWeight([14, 12, 13], 12)).toBeCloseTo(0.88, 5);
    expect(interestWeight([14, 12, 13], 13)).toBeCloseTo(0.76, 5);
    expect(interestWeight([14, 12, 13], 1)).toBe(0);
  });

  it("기준 예시: 매칭률이 69 예요", () => {
    const profile = makeProfile({ sdgInterests: [14, 12, 13], skills: ["design", "marketing"] });
    const challenge = makeChallenge({ sdgIds: [14, 12], skills: ["design", "research", "planning"], prizeYen: 100_000, closesOn: "2026-11-11" });
    const result = scoreChallenge(profile, challenge, TODAY);
    expect(result.score).toBe(69);
    expect(result.reasons.map((r) => r.code)).toEqual(["sdg", "skill", "prize"]);
  });

  it("관심 SDGs 와 겹치면 점수가 올라가고, 우선순위가 높을수록 더 올라가요", () => {
    const profile = makeProfile({ sdgInterests: [14, 12, 13, 4, 17], skills: [] });
    const none = scoreChallenge(profile, makeChallenge({ sdgIds: [1] }), TODAY).score;
    const fifth = scoreChallenge(profile, makeChallenge({ sdgIds: [17] }), TODAY).score;
    const first = scoreChallenge(profile, makeChallenge({ sdgIds: [14] }), TODAY).score;
    expect(first).toBeGreaterThan(fifth);
    expect(fifth).toBeGreaterThan(none);
  });

  it("점수는 항상 1~99 정수예요", () => {
    const profile = makeProfile({ sdgInterests: [14], skills: ["design"] });
    const best = scoreChallenge(profile, makeChallenge({ sdgIds: [14], skills: ["design"], prizeYen: 9_999_999, closesOn: TODAY }), TODAY).score;
    const worst = scoreChallenge(makeProfile({ sdgInterests: [], skills: [] }), makeChallenge({ sdgIds: [1], skills: ["video"], prizeYen: 0, closesOn: "2027-12-31" }), TODAY).score;
    expect(Number.isInteger(best)).toBe(true);
    expect(best).toBeLessThanOrEqual(99);
    expect(worst).toBeGreaterThanOrEqual(1);
  });

  it("추천 이유: 마감 임박·상금·인턴십", () => {
    const profile = makeProfile();
    const urgent = scoreChallenge(profile, makeChallenge({ closesOn: "2026-11-03", prizeYen: 150_000, rewards: ["prize", "internship"] }), TODAY);
    const codes = urgent.reasons.map((r) => r.code);
    expect(codes).toContain("deadline");
    expect(codes).toContain("prize");
    expect(codes).toContain("internship");
    const calm = scoreChallenge(profile, makeChallenge({ closesOn: "2026-12-30", prizeYen: 10_000, rewards: ["prize"] }), TODAY);
    expect(calm.reasons.map((r) => r.code)).not.toContain("deadline");
    expect(calm.reasons.map((r) => r.code)).not.toContain("prize");
  });
});

describe("recommendChallenges", () => {
  const profile = makeProfile({ sdgInterests: [14, 12], skills: ["design"] });

  it("응모할 수 있는 챌린지만 (모집 중이고 마감일이 오늘 이후)", () => {
    const list = [
      makeChallenge({ id: "open" }),
      makeChallenge({ id: "today", closesOn: TODAY }),
      makeChallenge({ id: "expired", closesOn: "2026-10-29" }),
      makeChallenge({ id: "judging", status: "judging" }),
      makeChallenge({ id: "closed", status: "closed" }),
    ];
    const ids = recommendChallenges({ profile, challenges: list, today: TODAY }).map((r) => r.challenge.id);
    expect(ids.sort()).toEqual(["open", "today"]);
    expect(isOpenFor(list[0], TODAY)).toBe(true);
    expect(isOpenFor(list[2], TODAY)).toBe(false);
    expect(isOpenFor(list[1], TODAY)).toBe(true);
  });

  it("매칭률 높은 순 → 마감 빠른 순 → id 순", () => {
    const list = [
      makeChallenge({ id: "b", sdgIds: [1], closesOn: "2026-12-01" }),
      makeChallenge({ id: "a", sdgIds: [1], closesOn: "2026-12-01" }),
      makeChallenge({ id: "top", sdgIds: [14, 12], closesOn: "2026-12-20" }),
      makeChallenge({ id: "early", sdgIds: [1], closesOn: "2026-11-25" }),
    ];
    const result = recommendChallenges({ profile, challenges: list, today: TODAY });
    expect(result[0].challenge.id).toBe("top");
    for (let i = 1; i < result.length; i++) expect(result[i - 1].score).toBeGreaterThanOrEqual(result[i].score);
    const lows = result.filter((r) => r.challenge.id !== "top").map((r) => r.challenge.id);
    expect(lows.indexOf("early")).toBeLessThan(lows.indexOf("a"));
    expect(lows.indexOf("a")).toBeLessThan(lows.indexOf("b"));
  });

  it("limit 만큼만 돌려줘요", () => {
    const list = [makeChallenge({ id: "1" }), makeChallenge({ id: "2" }), makeChallenge({ id: "3" })];
    expect(recommendChallenges({ profile, challenges: list, today: TODAY, limit: 2 })).toHaveLength(2);
    expect(recommendChallenges({ profile, challenges: list, today: TODAY, limit: 0 })).toHaveLength(0);
  });

  it("같은 입력은 같은 결과 (입력을 바꾸지 않아요)", () => {
    const list = [makeChallenge({ id: "x", sdgIds: [12] }), makeChallenge({ id: "y", sdgIds: [14] })];
    const snapshot = JSON.stringify(list);
    const first = recommendChallenges({ profile, challenges: list, today: TODAY });
    const second = recommendChallenges({ profile, challenges: list, today: TODAY });
    expect(first.map((r) => r.challenge.id)).toEqual(second.map((r) => r.challenge.id));
    expect(JSON.stringify(list)).toBe(snapshot);
  });
});
