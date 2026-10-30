// 기업 화면의 스카우트 제안(F-602): 제안 종류와 보낼 수 있는지 판단.
import type { ScoutKind } from "@sdgs-compass/core/domain";
import type { MessageKey } from "@sdgs-compass/core/messages";
import type { CandidateVM } from "@sdgs-compass/core/selectors";

export const SCOUT_KINDS: readonly ScoutKind[] = ["internship", "offer", "interview"];
export const DEFAULT_SCOUT_KIND: ScoutKind = "internship";

/** 제안 종류 → 문구 키 */
export const SCOUT_KIND_KEY: Record<ScoutKind, MessageKey> = {
  internship: "talent.kindInternship",
  offer: "talent.kindOffer",
  interview: "talent.kindInterview",
};

/** 후보 카드에서 보여 줄 상태 */
export type CandidateState = "canScout" | "alreadySent" | "notScoutable" | "limit";

/**
 * 후보 한 명의 상태. 스카우트를 받지 않거나(notScoutable) 이미 보냈거나(alreadySent) 오늘 한도를 다 썼으면(limit) 보낼 수 없어요.
 * (core 의 canScout 은 이 셋을 모두 반영한 값이라, 보낼 수 없는 이유만 여기서 가려내요.)
 */
export function candidateState(candidate: Pick<CandidateVM, "scoutable" | "alreadySent" | "canScout">): CandidateState {
  if (!candidate.scoutable) return "notScoutable";
  if (candidate.alreadySent) return "alreadySent";
  if (!candidate.canScout) return "limit";
  return "canScout";
}
