// 응모자 심사 입력(창의성·실현 가능성·SDGs 기여도 1~5점 + 코멘트)과 시상 종류.
import { AWARD_KINDS, DEFAULT_AWARD, REVIEW_DEFAULT, REVIEW_MAX, REVIEW_MIN, reviewFormFrom, toReviewInput } from "../reviewForm";

test("아직 심사하지 않았으면 기본 점수로 시작", () => {
  expect(reviewFormFrom(null)).toEqual({ creativity: REVIEW_DEFAULT, feasibility: REVIEW_DEFAULT, sdgContribution: REVIEW_DEFAULT, comment: "" });
  expect(REVIEW_DEFAULT).toBeGreaterThanOrEqual(REVIEW_MIN);
  expect(REVIEW_DEFAULT).toBeLessThanOrEqual(REVIEW_MAX);
});

test("이미 심사했으면 그 점수와 코멘트로 (범위를 벗어난 값은 맞춰요)", () => {
  const form = reviewFormFrom({ creativity: 4, feasibility: 9, sdgContribution: 0, comment: "좋아요", reviewedAt: "2026-10-30T10:00" });
  expect(form).toEqual({ creativity: 4, feasibility: REVIEW_MAX, sdgContribution: REVIEW_MIN, comment: "좋아요" });
});

test("저장할 값: 점수는 1~5 정수", () => {
  expect(toReviewInput({ creativity: 2.6, feasibility: 7, sdgContribution: -3, comment: "c" })).toEqual({ creativity: 3, feasibility: 5, sdgContribution: 1, comment: "c" });
});

test("시상 종류", () => {
  expect(AWARD_KINDS).toEqual(["grand", "excellence", "special"]);
  expect(AWARD_KINDS).toContain(DEFAULT_AWARD);
});
