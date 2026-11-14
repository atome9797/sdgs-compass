// 용사의 스킬(#38 · #45): 스킬은 수상 경력이에요. 퀘스트에서 수상하면 그 퀘스트의 SDG 마다 스킬을 얻어요
// (SDG 가 2개 이상 겹친 퀘스트면 그 SDG 의 스킬을 모두). 같은 SDG 의 수상이 쌓일수록 그 SDG 의 스킬 레벨이 올라요(레벨 = 그 SDG 가 붙은 수상의 수).
// 저장은 수상 1건 = 기록 1개(domain.ts 의 HeroSkill — 수상한 때의 이름 · 퀘스트 · 기업 · SDG 번호를 그대로 적어 둔 스냅샷)이고, SDG 별 스킬과 레벨은 이 기록에서 계산해요.
// 저장: 기업이 표창하면 reducer(awardProposal)가 syncSkills 로 하나 더하고, 예전에 저장한 상태는 불러올 때 같은 함수로 채워요.
// SDGs 17항목의 스테이터스(EXP)는 따로예요 — 기업의 평가 점수로 쌓여요(status.ts).
import { deriveActivities, type ActivitySource } from "./activities";
import type { Activity, AwardKind, DemoState, HeroSkill } from "./domain";
import type { Text } from "./i18n";
import type { SdgId } from "./sdg";

/** 상의 세기 (최우수상이 가장 커요) — 화면의 ★ 수와 같은 날 스킬의 순서 */
export const AWARD_STARS: Record<AwardKind, 1 | 2 | 3> = { grand: 3, excellence: 2, special: 1 };

export const skillIdFor = (activityId: string): string => `skill-${activityId}`;

type AwardActivity = Activity & { kind: "award"; award: AwardKind };

export function isAwardActivity(activity: Activity): activity is AwardActivity {
  return activity.kind === "award" && activity.award !== undefined;
}

/** 수상 활동 1건 → 스킬 1개. 스킬 이름이 없으면 수상한 퀘스트(활동) 이름을 그대로 써요 */
export function skillFromAward(activity: AwardActivity, skillName?: Text): HeroSkill {
  return {
    id: skillIdFor(activity.id),
    name: skillName ?? activity.title,
    sdgIds: [...activity.sdgIds],
    award: activity.award,
    questTitle: activity.title,
    companyName: activity.companyName,
    learnedOn: activity.date,
    activityId: activity.id,
    ...(activity.proposalId ? { proposalId: activity.proposalId } : {}),
  };
}

type SkillSource = ActivitySource & Pick<DemoState, "skills">;

/**
 * 수상 기록과 스킬을 맞춰요: 스킬이 없는 수상(이 앱에서 방금 받은 상 · 예전에 저장한 상태)에는 스킬을 만들고,
 * 같은 수상의 상 종류가 바뀌었으면(기업이 고친 경우) 그 스킬의 상만 고쳐요. 이름 · 날짜는 처음 그대로(스냅샷).
 * 바뀐 것이 없으면 같은 상태 객체를 그대로 돌려줘요.
 */
export function syncSkills<S extends SkillSource>(state: S): S {
  const byActivity = new Map(state.skills.map((skill) => [skill.activityId, skill]));
  let changed = false;
  const added: HeroSkill[] = [];
  const updated = new Map<string, HeroSkill>();
  for (const activity of deriveActivities(state)) {
    if (!isAwardActivity(activity)) continue;
    const existing = byActivity.get(activity.id);
    if (existing) {
      if (existing.award !== activity.award) {
        updated.set(existing.id, { ...existing, award: activity.award });
        changed = true;
      }
      continue;
    }
    const proposal = activity.proposalId ? state.proposals.find((p) => p.id === activity.proposalId) : undefined;
    const challenge = proposal ? state.challenges.find((c) => c.id === proposal.challengeId) : undefined;
    added.push(skillFromAward(activity, challenge?.skillName));
    changed = true;
  }
  if (!changed) return state;
  return { ...state, skills: [...added, ...state.skills.map((skill) => updated.get(skill.id) ?? skill)] };
}

/** 화면에 보여 줄 순서: 최근 것부터, 같은 날이면 상이 큰 것부터 */
export function sortSkills(skills: readonly HeroSkill[]): HeroSkill[] {
  return [...skills].sort((a, b) => b.learnedOn.localeCompare(a.learnedOn) || AWARD_STARS[b.award] - AWARD_STARS[a.award] || a.id.localeCompare(b.id));
}

/** 수상 기록의 SDG 가 퀘스트의 SDG 와 하나라도 겹치는지 */
export function skillMatches(skill: Pick<HeroSkill, "sdgIds">, questSdgIds: readonly SdgId[]): boolean {
  return skill.sdgIds.some((id) => questSdgIds.includes(id));
}

/** SDG 하나의 스킬: 레벨 = 그 SDG 가 붙은 수상의 수, records = 그 수상 기록(최근 것부터) */
export interface SdgSkill {
  sdgId: SdgId;
  level: number;
  records: HeroSkill[];
}

/**
 * 가진 스킬을 SDG 마다(#45): 레벨이 높은 것부터, 같으면 최근 수상에 먼저 나온 SDG 부터(같은 수상 안에서는 퀘스트의 SDG 순서).
 * 수상 1건이 SDG 2개짜리 퀘스트면 두 SDG 의 스킬에 모두 들어가요.
 */
export function sdgSkills(skills: readonly HeroSkill[]): SdgSkill[] {
  const bySdg = new Map<SdgId, HeroSkill[]>();
  for (const skill of sortSkills(skills)) {
    for (const id of new Set(skill.sdgIds)) bySdg.set(id, [...(bySdg.get(id) ?? []), skill]);
  }
  return [...bySdg.entries()].map(([sdgId, records]) => ({ sdgId, level: records.length, records })).sort((a, b) => b.level - a.level);
}

/** SDG 하나의 스킬 레벨. upTo(YYYY-MM-DD)를 주면 그날까지 받은 상만 세요(그 수상으로 몇 레벨이 됐는지) */
export function skillLevel(skills: readonly HeroSkill[], sdgId: SdgId, upTo?: string): number {
  return skills.filter((skill) => skill.sdgIds.includes(sdgId) && (upTo === undefined || skill.learnedOn <= upTo)).length;
}

/** 가진 스킬의 SDG 번호(겹치지 않게, sdgSkills 의 순서) — 전투 화면의 망토 색 · 카드뉴스 */
export function skillSdgIds(skills: readonly HeroSkill[]): SdgId[] {
  return sdgSkills(skills).map((skill) => skill.sdgId);
}
