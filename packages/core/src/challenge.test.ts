import { describe, expect, it } from "vitest";
import { buildChallenge, MAX_CHALLENGE_DAYS, MAX_CHALLENGE_SDGS, MIN_CHALLENGE_DAYS, validateChallengeDraft, type ChallengeDraft } from "./challenge";

const draft = (overrides: Partial<ChallengeDraft> = {}): ChallengeDraft => ({
  title: "海のごみを減らす企画",
  summary: "漁港の清掃につながるアイデアを募集します。",
  sdgIds: [14, 12],
  prizeYen: 50_000,
  days: 14,
  participation: "both",
  internship: true,
  ...overrides,
});

describe("챌린지 출제 검사", () => {
  it("올바른 입력", () => {
    expect(validateChallengeDraft(draft())).toEqual([]);
    expect(MAX_CHALLENGE_SDGS).toBe(3);
    expect(MIN_CHALLENGE_DAYS).toBe(7);
    expect(MAX_CHALLENGE_DAYS).toBe(90);
  });

  it("오류 종류", () => {
    expect(validateChallengeDraft(draft({ title: " " }))).toEqual(["title_required"]);
    expect(validateChallengeDraft(draft({ summary: "" }))).toEqual(["summary_required"]);
    expect(validateChallengeDraft(draft({ sdgIds: [] }))).toEqual(["sdgs_required"]);
    expect(validateChallengeDraft(draft({ sdgIds: [1, 2, 3, 4] }))).toEqual(["sdgs_required"]);
    expect(validateChallengeDraft(draft({ prizeYen: -1 }))).toEqual(["prize_invalid"]);
    expect(validateChallengeDraft(draft({ prizeYen: 1.5 }))).toEqual(["prize_invalid"]);
    expect(validateChallengeDraft(draft({ prizeYen: 0 }))).toEqual([]);
    expect(validateChallengeDraft(draft({ days: 0 }))).toEqual(["days_invalid"]);
    expect(validateChallengeDraft(draft({ days: 6 }))).toEqual(["days_invalid"]);
    expect(validateChallengeDraft(draft({ days: 7 }))).toEqual([]);
    expect(validateChallengeDraft(draft({ days: 91 }))).toEqual(["days_invalid"]);
    expect(validateChallengeDraft(draft({ days: 90 }))).toEqual([]);
  });
});

describe("새 챌린지 만들기", () => {
  const ctx = { id: "ch100", companyId: "co-1", today: "2026-10-30", hue: 123 };

  it("오늘부터 days 일 동안 모집해요", () => {
    const c = buildChallenge(draft({ title: "  제목  ", days: 14 }), ctx);
    expect(c.title).toBe("제목");
    expect(c.opensOn).toBe("2026-10-30");
    expect(c.closesOn).toBe("2026-11-13");
    expect(c.status).toBe("open");
    expect(c.applicants).toBe(0);
    expect(c.id).toBe("ch100");
    expect(c.companyId).toBe("co-1");
  });

  it("상금이 있으면 prize, 인턴십을 체크하면 internship 보상이 붙어요", () => {
    expect(buildChallenge(draft({ prizeYen: 1, internship: false }), ctx).rewards).toEqual(["prize"]);
    expect(buildChallenge(draft({ prizeYen: 0, internship: true }), ctx).rewards).toEqual(["internship"]);
    expect(buildChallenge(draft({ prizeYen: 1, internship: true }), ctx).rewards).toEqual(["prize", "internship"]);
    expect(buildChallenge(draft({ prizeYen: 0, internship: false }), ctx).rewards).toEqual([]);
  });

  it("SDGs 중복은 하나로", () => {
    expect(buildChallenge(draft({ sdgIds: [14, 14, 12] }), ctx).sdgIds).toEqual([14, 12]);
  });
});
