// F-201 챌린지 출제(B2B): 입력 검사와 새 챌린지 만들기.
import type { Challenge, Participation } from "./domain";
import { addDays } from "./format";
import type { SdgId } from "./sdg";
import { charCount } from "./proposal";

export interface ChallengeDraft {
  title: string;
  summary: string;
  sdgIds: SdgId[];
  prizeYen: number;
  /** 모집 기간(일) */
  days: number;
  participation: Participation;
  internship: boolean;
}

export type ChallengeDraftError = "title_required" | "summary_required" | "sdgs_required" | "prize_invalid" | "days_invalid";

export const MAX_CHALLENGE_SDGS = 3;
/** 기능명세 F-201: 마감일은 최소 7일 이후로 설정해야 해요 */
export const MIN_CHALLENGE_DAYS = 7;
export const MAX_CHALLENGE_DAYS = 90;

export function validateChallengeDraft(draft: ChallengeDraft): ChallengeDraftError[] {
  const errors: ChallengeDraftError[] = [];
  if (charCount(draft.title) === 0) errors.push("title_required");
  if (charCount(draft.summary) === 0) errors.push("summary_required");
  if (draft.sdgIds.length < 1 || draft.sdgIds.length > MAX_CHALLENGE_SDGS) errors.push("sdgs_required");
  if (!Number.isInteger(draft.prizeYen) || draft.prizeYen < 0) errors.push("prize_invalid");
  if (!Number.isInteger(draft.days) || draft.days < MIN_CHALLENGE_DAYS || draft.days > MAX_CHALLENGE_DAYS) errors.push("days_invalid");
  return errors;
}

/** 새 챌린지: 오늘부터 days 일 동안 모집해요 */
export function buildChallenge(draft: ChallengeDraft, ctx: { id: string; companyId: string; today: string; hue: number }): Challenge {
  const title = draft.title.trim();
  const summary = draft.summary.trim();
  return {
    id: ctx.id,
    companyId: ctx.companyId,
    title,
    summary,
    background: summary,
    mission: summary,
    deliverables: [{ ja: "企画書（PDF・PPTX）", ko: "기획서(PDF·PPTX)" }],
    sdgIds: [...new Set(draft.sdgIds)],
    skills: [],
    prizeYen: draft.prizeYen,
    rewards: [...(draft.prizeYen > 0 ? (["prize"] as const) : []), ...(draft.internship ? (["internship"] as const) : [])],
    participation: draft.participation,
    impactPoints: 100,
    opensOn: ctx.today,
    closesOn: addDays(ctx.today, draft.days),
    status: "open",
    applicants: 0,
    hue: ctx.hue,
  };
}
