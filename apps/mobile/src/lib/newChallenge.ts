// 기업(B2B)의 "신규 챌린지 출제" 입력 모음 (F-201): 기본값·모집 기간 범위·SDGs 고르기·입력 → ChallengeDraft 변환.
// 검사(validateChallengeDraft)는 core 에 있고, 여기서는 입력 칸 쪽 규칙만 둬요.
import {
  MAX_CHALLENGE_DAYS,
  MAX_CHALLENGE_SDGS,
  MIN_CHALLENGE_DAYS,
  type ChallengeDraft,
  type ChallengeDraftError,
} from "@sdgs-compass/core/challenge";
import type { Participation } from "@sdgs-compass/core/domain";
import type { MessageKey } from "@sdgs-compass/core/messages";
import type { SdgId } from "@sdgs-compass/core/sdg";
import { clampInt, parseCount } from "./forms";

/** 모집 기간 기본값(일). 기능명세 F-201: 마감일은 최소 7일 이후 → 기본값은 그보다 넉넉하게 */
export const DEFAULT_CHALLENGE_DAYS = 14;

/** 모집 기간 빠른 선택 (양 끝은 core 의 최소·최대) */
export const DAY_PRESETS: readonly number[] = [MIN_CHALLENGE_DAYS, DEFAULT_CHALLENGE_DAYS, 30, 60, MAX_CHALLENGE_DAYS];

export const PARTICIPATION_OPTIONS: readonly Participation[] = ["both", "individual", "team"];

/** 모집 기간을 core 가 허용하는 범위(MIN_CHALLENGE_DAYS~MAX_CHALLENGE_DAYS) 안의 정수로 */
export function clampDays(days: number): number {
  if (!Number.isFinite(days)) return DEFAULT_CHALLENGE_DAYS;
  return clampInt(days, MIN_CHALLENGE_DAYS, MAX_CHALLENGE_DAYS);
}

/** SDGs 를 켜고 꺼요. 이미 max 개를 골랐으면 새로 켜지 않아요 */
export function toggleSdg(selected: readonly SdgId[], id: SdgId, max: number = MAX_CHALLENGE_SDGS): SdgId[] {
  if (selected.includes(id)) return selected.filter((value) => value !== id);
  if (selected.length >= max) return [...selected];
  return [...selected, id];
}

export interface NewChallengeForm {
  title: string;
  summary: string;
  sdgIds: SdgId[];
  /** 입력 중인 상금 글자 (숫자만) */
  prizeText: string;
  days: number;
  participation: Participation;
  internship: boolean;
}

export function emptyChallengeForm(): NewChallengeForm {
  return { title: "", summary: "", sdgIds: [], prizeText: "100000", days: DEFAULT_CHALLENGE_DAYS, participation: "both", internship: true };
}

/** 입력 → core 의 ChallengeDraft (검사는 validateChallengeDraft 가 해요) */
export function toChallengeDraft(form: NewChallengeForm): ChallengeDraft {
  return {
    title: form.title,
    summary: form.summary,
    sdgIds: form.sdgIds,
    prizeYen: parseCount(form.prizeText),
    days: form.days,
    participation: form.participation,
    internship: form.internship,
  };
}

/** 검사 오류 → 문구 키 */
export const CHALLENGE_ERROR_KEY: Record<ChallengeDraftError, MessageKey> = {
  title_required: "new.error.title_required",
  summary_required: "new.error.summary_required",
  sdgs_required: "new.error.sdgs_required",
  prize_invalid: "new.error.prize_invalid",
  days_invalid: "new.error.days_invalid",
};
