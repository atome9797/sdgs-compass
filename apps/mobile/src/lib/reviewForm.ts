// 기업 화면의 심사(F-303) 입력: 3항목 1~5점 + 코멘트, 그리고 시상 종류. 저장·시상·채택 자체는 core 의 reducer 가 해요.
import type { AwardKind, Review } from "@sdgs-compass/core/domain";
import { clampInt } from "./forms";

export const REVIEW_MIN = 1;
export const REVIEW_MAX = 5;
/** 아직 심사하지 않은 응모의 시작 점수 */
export const REVIEW_DEFAULT = 3;

export const AWARD_KINDS: readonly AwardKind[] = ["grand", "excellence", "special"];
/** 시상 종류를 고르는 칸의 시작 값 */
export const DEFAULT_AWARD: AwardKind = "excellence";

export interface ReviewFormState {
  creativity: number;
  feasibility: number;
  sdgContribution: number;
  comment: string;
}

/** 이미 심사한 응모면 그 점수로, 아니면 기본 점수로 시작해요 */
export function reviewFormFrom(review: Review | null): ReviewFormState {
  if (!review) return { creativity: REVIEW_DEFAULT, feasibility: REVIEW_DEFAULT, sdgContribution: REVIEW_DEFAULT, comment: "" };
  return {
    creativity: clampInt(review.creativity, REVIEW_MIN, REVIEW_MAX),
    feasibility: clampInt(review.feasibility, REVIEW_MIN, REVIEW_MAX),
    sdgContribution: clampInt(review.sdgContribution, REVIEW_MIN, REVIEW_MAX),
    comment: review.comment,
  };
}

/** reviewProposal 동작에 넣는 값 (점수는 1~5 정수로 맞춰요) */
export function toReviewInput(form: ReviewFormState): Omit<Review, "reviewedAt"> {
  return {
    creativity: clampInt(form.creativity, REVIEW_MIN, REVIEW_MAX),
    feasibility: clampInt(form.feasibility, REVIEW_MIN, REVIEW_MAX),
    sdgContribution: clampInt(form.sdgContribution, REVIEW_MIN, REVIEW_MAX),
    comment: form.comment,
  };
}
