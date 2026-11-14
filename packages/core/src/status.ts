// 용사의 스테이터스(#45): SDGs 17개 항목마다 경험치(EXP)가 쌓여 그 항목의 레벨이 올라요.
// EXP 의 재료는 기업의 평가 점수예요 — 상을 받지 못해도 평가를 받으면, 그 퀘스트의 SDG 항목마다 「세 항목의 합계 × 10」이 쌓여요.
// 수상은 스테이터스가 아니라 스킬에 반영해요(skills.ts — 같은 SDG 의 수상이 쌓이면 그 SDG 의 스킬 레벨이 올라요).
// 화면의 레벨은 이 항목별 레벨과 스킬 레벨뿐이에요(용사 전체의 레벨은 없어요).
// Impact Index(impact.ts — 포인트 · 배지 · DB 의 impact_level)와는 따로 계산해요. 그쪽 규칙은 DB 와 맞춘 그대로 둬요.
import type { Activity, Review } from "./domain";
import { REVIEW_SCORE_MAX } from "./impact";
import { SDG_IDS, type SdgId } from "./sdg";

export type ReviewScores = Pick<Review, "creativity" | "feasibility" | "sdgContribution">;

/** 평가 1점 = EXP 10 */
export const EXP_PER_REVIEW_POINT = 10;
/** 평가 한 번으로 한 항목에 들어가는 최대 EXP (세 항목 모두 만점 15점 × 10) */
export const REVIEW_EXP_MAX = REVIEW_SCORE_MAX * 3 * EXP_PER_REVIEW_POINT;
/** 레벨 i+1 이 시작되는 EXP(Lv.1 ~ Lv.10) — 레벨이 오를수록 다음 레벨까지 필요한 EXP 가 늘어요 */
export const STATUS_LEVEL_EXP = [0, 100, 200, 350, 500, 700, 900, 1150, 1400, 1700] as const;
export const STATUS_MAX_LEVEL = STATUS_LEVEL_EXP.length;

/** 기업 평가 한 번으로 받는 EXP: (창의성 + 실현 가능성 + SDGs 기여도) × 10. 평가가 없으면 0 */
export function reviewExp(scores: ReviewScores | null | undefined): number {
  if (!scores) return 0;
  return (scores.creativity + scores.feasibility + scores.sdgContribution) * EXP_PER_REVIEW_POINT;
}

export interface StatusLevel {
  level: number;
  /** 다음 레벨이 시작되는 EXP (최고 레벨이면 null) */
  nextAt: number | null;
  /** 다음 레벨까지 남은 EXP (최고 레벨이면 0) */
  remaining: number;
  /** 지금 레벨 안에서 채운 정도 0~1 (최고 레벨이면 1) */
  ratio: number;
}

export function statusLevel(exp: number): StatusLevel {
  let level = 1;
  STATUS_LEVEL_EXP.forEach((start, index) => {
    if (exp >= start) level = index + 1;
  });
  if (level >= STATUS_MAX_LEVEL) return { level: STATUS_MAX_LEVEL, nextAt: null, remaining: 0, ratio: 1 };
  const start = STATUS_LEVEL_EXP[level - 1];
  const nextAt = STATUS_LEVEL_EXP[level];
  return { level, nextAt, remaining: nextAt - exp, ratio: (exp - start) / (nextAt - start) };
}

/** SDG 항목마다의 EXP: 기업이 평가한 실적(제출)마다, 그 퀘스트의 SDG 에 평가 EXP 를 더해요(참가 · 수상 · 공유만으로는 늘지 않아요) */
export function computeSdgExp(activities: readonly Activity[]): Record<SdgId, number> {
  const exp = {} as Record<SdgId, number>;
  for (const id of SDG_IDS) exp[id] = 0;
  for (const activity of activities) {
    const gained = reviewExp(activity.scores);
    if (gained === 0) continue;
    for (const id of new Set(activity.sdgIds)) exp[id] += gained;
  }
  return exp;
}

/** EXP 가 높은 항목 최대 3개(「得意」) — EXP 가 0 인 항목은 빼고, 같으면 번호 순 */
export function topStatusSdgs(exp: Record<SdgId, number>): SdgId[] {
  return [...SDG_IDS].filter((id) => exp[id] > 0).sort((a, b) => exp[b] - exp[a] || a - b).slice(0, 3);
}

/** 평가 하나(gained EXP)로 레벨이 오른 항목: 그 평가를 빼면 몇 레벨이었는지와 비교해요 */
export function statusLevelUps(exp: Record<SdgId, number>, sdgIds: readonly SdgId[], gained: number): { sdgId: SdgId; level: number }[] {
  if (gained <= 0) return [];
  const ups: { sdgId: SdgId; level: number }[] = [];
  for (const id of new Set(sdgIds)) {
    const after = statusLevel(exp[id]).level;
    if (after > statusLevel(Math.max(0, exp[id] - gained)).level) ups.push({ sdgId: id, level: after });
  }
  return ups;
}
