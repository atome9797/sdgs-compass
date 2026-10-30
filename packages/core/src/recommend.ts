// F-202 AI 추천 피드 (데모용 규칙 기반): 관심 SDGs(우선순위)·스킬 태그·마감 임박도·상금으로 매칭률(0~100)을 계산해요.
// 실서비스에서는 같은 입력/출력 모양으로 추천 모델(서버)이 이 함수를 대신해요.
import type { Challenge, SkillId, StudentProfile } from "./domain";
import { daysBetween } from "./format";
import type { SdgId } from "./sdg";

export type Reason =
  | { code: "sdg"; sdgIds: SdgId[] }
  | { code: "skill"; skills: SkillId[] }
  | { code: "deadline"; days: number }
  | { code: "prize"; yen: number }
  | { code: "internship" };

export interface Recommendation {
  challenge: Challenge;
  /** 매칭률 0~100 (정수) */
  score: number;
  reasons: Reason[];
}

export interface RecommendInput {
  profile: Pick<StudentProfile, "sdgInterests" | "skills">;
  challenges: readonly Challenge[];
  /** "YYYY-MM-DD" */
  today: string;
  limit?: number;
}

/** 관심 SDGs 의 우선순위 가중치: 1순위 1.0, 2순위 0.88, … 5순위 0.52 */
export function interestWeight(interests: readonly SdgId[], sdgId: SdgId): number {
  const index = interests.indexOf(sdgId);
  return index < 0 ? 0 : 1 - 0.12 * index;
}

function urgency(daysLeft: number): number {
  if (daysLeft <= 3) return 1;
  if (daysLeft <= 7) return 0.8;
  if (daysLeft <= 14) return 0.5;
  if (daysLeft <= 30) return 0.25;
  return 0.1;
}

/** 이 챌린지가 지금 응모할 수 있는지 (모집 중이고 마감일이 오늘 이후) */
export function isOpenFor(challenge: Challenge, today: string): boolean {
  return challenge.status === "open" && daysBetween(today, challenge.closesOn) >= 0;
}

export function scoreChallenge(profile: RecommendInput["profile"], challenge: Challenge, today: string): Recommendation {
  const daysLeft = daysBetween(today, challenge.closesOn);

  const matchedSdgs = challenge.sdgIds.filter((id) => interestWeight(profile.sdgInterests, id) > 0);
  const sdgSum = matchedSdgs.reduce((sum, id) => sum + interestWeight(profile.sdgInterests, id), 0);
  const sdgScore = challenge.sdgIds.length === 0 ? 0 : Math.min(1, sdgSum / Math.min(2, challenge.sdgIds.length));

  const matchedSkills = challenge.skills.filter((skill) => profile.skills.includes(skill));
  const skillScore = challenge.skills.length === 0 ? 0 : Math.min(1, matchedSkills.length / Math.min(3, challenge.skills.length));

  const prizeScore = Math.min(1, challenge.prizeYen / 300_000);
  const raw = 0.55 * sdgScore + 0.25 * skillScore + 0.12 * urgency(daysLeft) + 0.08 * prizeScore;
  const score = Math.max(1, Math.min(99, Math.round(raw * 100)));

  const reasons: Reason[] = [];
  if (matchedSdgs.length > 0) reasons.push({ code: "sdg", sdgIds: matchedSdgs });
  if (matchedSkills.length > 0) reasons.push({ code: "skill", skills: matchedSkills });
  if (daysLeft >= 0 && daysLeft <= 7) reasons.push({ code: "deadline", days: daysLeft });
  if (challenge.prizeYen >= 100_000) reasons.push({ code: "prize", yen: challenge.prizeYen });
  if (challenge.rewards.includes("internship")) reasons.push({ code: "internship" });
  return { challenge, score, reasons };
}

/** 응모할 수 있는 챌린지만 매칭률 높은 순(같으면 마감이 빠른 순, 그다음 id 순)으로 */
export function recommendChallenges(input: RecommendInput): Recommendation[] {
  const list = input.challenges
    .filter((challenge) => isOpenFor(challenge, input.today))
    .map((challenge) => scoreChallenge(input.profile, challenge, input.today))
    .sort((a, b) => b.score - a.score || a.challenge.closesOn.localeCompare(b.challenge.closesOn) || a.challenge.id.localeCompare(b.challenge.id));
  return input.limit === undefined ? list : list.slice(0, input.limit);
}
