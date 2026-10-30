// F-401 Impact Index 엔진과 F-402 배지 (데모용 규칙 기반).
// 활동(참가·제출·수상·공유)마다 포인트가 쌓이고, 활동이 닿은 SDGs 별로 0~100 점수(레이더 차트)가 나와요.
import type { Activity, AwardKind } from "./domain";
import { SDG_IDS, type SdgId } from "./sdg";

export type Level = 1 | 2 | 3 | 4 | 5;
/** 레벨 i+1 이 시작되는 누적 포인트 */
export const LEVEL_THRESHOLDS = [0, 300, 700, 1500, 2500] as const;

export const PARTICIPATION_POINTS = 50;
export const SHARE_POINTS = 10;
/** 공유로 쌓을 수 있는 최대 횟수 (그 이상 공유해도 포인트는 더 오르지 않아요) */
export const MAX_SHARE_ACTIVITIES = 5;
export const AWARD_POINTS: Record<AwardKind, number> = { grand: 400, excellence: 300, special: 200 };
/** 한 SDG 점수가 약 63점이 되는 누적 포인트 (점수 = 100 × (1 − e^(−포인트/이 값))) */
export const SDG_SATURATION = 300;

/** 심사 점수(1~5)의 평균으로 주는 보너스 포인트 (최대 80) */
export function reviewBonus(scores: { creativity: number; feasibility: number; sdgContribution: number } | undefined): number {
  if (!scores) return 0;
  const avg = (scores.creativity + scores.feasibility + scores.sdgContribution) / 3;
  return Math.round((avg / 5) * 80);
}

export function levelOf(points: number): Level {
  let level: Level = 1;
  LEVEL_THRESHOLDS.forEach((threshold, index) => {
    if (points >= threshold) level = (index + 1) as Level;
  });
  return level;
}

/** 다음 레벨까지 남은 포인트와 현재 레벨 안에서의 진행률(0~1). 최고 레벨이면 next 가 null */
export function levelProgress(points: number): { level: Level; next: Level | null; remaining: number; ratio: number } {
  const level = levelOf(points);
  if (level === 5) return { level, next: null, remaining: 0, ratio: 1 };
  const start = LEVEL_THRESHOLDS[level - 1];
  const end = LEVEL_THRESHOLDS[level];
  return { level, next: (level + 1) as Level, remaining: end - points, ratio: (points - start) / (end - start) };
}

export interface ImpactIndex {
  totalPoints: number;
  level: Level;
  /** SDG 별 0~100 점수 (활동이 없으면 0) */
  perSdg: Record<SdgId, number>;
  /** SDG 별 누적 포인트 */
  rawPerSdg: Record<SdgId, number>;
  /** 점수가 높은 순 최대 3개 (점수가 0보다 큰 것만) */
  topSdgs: SdgId[];
}

export function computeImpactIndex(activities: readonly Activity[]): ImpactIndex {
  const raw = {} as Record<SdgId, number>;
  const perSdg = {} as Record<SdgId, number>;
  for (const id of SDG_IDS) raw[id] = 0;
  let totalPoints = 0;
  for (const activity of activities) {
    totalPoints += activity.points;
    for (const id of new Set(activity.sdgIds)) raw[id] += activity.points;
  }
  for (const id of SDG_IDS) perSdg[id] = Math.round(100 * (1 - Math.exp(-raw[id] / SDG_SATURATION)));
  const topSdgs = [...SDG_IDS].filter((id) => perSdg[id] > 0).sort((a, b) => perSdg[b] - perSdg[a] || a - b).slice(0, 3);
  return { totalPoints, level: levelOf(totalPoints), perSdg, rawPerSdg: raw, topSdgs };
}

export type BadgeCode = "firstStep" | "challenger" | "winner" | "multiSdg" | "ocean" | "sharer";
export const BADGE_CODES: readonly BadgeCode[] = ["firstStep", "challenger", "winner", "multiSdg", "ocean", "sharer"];
export const BADGE_EMOJI: Record<BadgeCode, string> = { firstStep: "🌱", challenger: "👑", winner: "🏆", multiSdg: "🧭", ocean: "🌊", sharer: "📣" };

/** F-402 배지 조건 */
export function computeBadges(activities: readonly Activity[]): BadgeCode[] {
  const index = computeImpactIndex(activities);
  const submissions = activities.filter((a) => a.kind === "submission").length;
  const awards = activities.filter((a) => a.kind === "award").length;
  const shares = activities.filter((a) => a.kind === "share").length;
  const sdgsTouched = new Set(activities.flatMap((a) => a.sdgIds)).size;
  const earned: BadgeCode[] = [];
  if (activities.some((a) => a.kind !== "share")) earned.push("firstStep");
  if (submissions >= 3) earned.push("challenger");
  if (awards >= 1) earned.push("winner");
  if (sdgsTouched >= 5) earned.push("multiSdg");
  if (index.rawPerSdg[14] >= 200) earned.push("ocean");
  if (shares >= 3) earned.push("sharer");
  return earned;
}
