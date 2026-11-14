// 퀘스트 전투 화면(#38)의 화면 모델 — 턴제 RPG 처럼, 위에 과제 몬스터 · 아래에 용사 파티 · 메시지 창 · 명령 4개(たたかう · スキル · しらべる · にげる).
// 그림(WebGL)은 웹이 그려요(apps/web/src/lib/battle). 몬스터 · 배경 · HP · 문구 · 스킬 상성(相性)은 여기 한 곳에서 정해요.
// 규칙: 기획서를 내면 몬스터의 HP 가 0 = 「クエスト達成！」(수령증과 같은 때). 수상하면 그 퀘스트의 SDG 번호가 붙은 스킬을 얻어요(skills.ts).
import type { Challenge, DemoState, FoeKind, QuestFoe } from "./domain";
import { pick, type Locale, type LocalizedText } from "./i18n";
import { translate } from "./messages";
import { isOpenFor } from "./recommend";
import { getSdg, type SdgId } from "./sdg";
import { heroSkillVM, pleaOf, type HeroSkillVM } from "./selectors";
import { skillMatches, skillSdgIds, sortSkills } from "./skills";

export type SceneKind = "sea" | "sky" | "field" | "town";

/** 퀘스트에 몬스터(foe)가 없을 때(데모에서 기업이 새로 낸 퀘스트 등) 대표 SDG 로 고르는 모양 */
const FOE_BY_SDG: Record<SdgId, FoeKind> = {
  1: "ghost", 2: "ghost", 3: "ghost", 4: "wall", 5: "wall", 6: "jelly", 7: "smog", 8: "bird", 9: "bird",
  10: "wall", 11: "bird", 12: "bottle", 13: "smog", 14: "jelly", 15: "ghost", 16: "wall", 17: "wall",
};

/** 모양마다의 기본 이름 */
export const DEFAULT_FOE_NAMES: Record<FoeKind, LocalizedText> = {
  jelly: { ja: "プラごみクラゲ", ko: "플라스틱 해파리" },
  bottle: { ja: "つかいすてボトル", ko: "일회용 페트병" },
  smog: { ja: "くろけむり", ko: "검은 연기" },
  ghost: { ja: "もったいないの影", ko: "아까운 그림자" },
  wall: { ja: "みえない壁", ko: "보이지 않는 벽" },
  bird: { ja: "カンコドリ", ko: "썰렁새" },
};

export function foeOf(challenge: Pick<Challenge, "foe" | "sdgIds">): QuestFoe {
  if (challenge.foe) return challenge.foe;
  const kind = FOE_BY_SDG[challenge.sdgIds[0] ?? 17];
  return { kind, name: DEFAULT_FOE_NAMES[kind] };
}

/** 배경: 퀘스트의 SDG 중에 바다(6 · 14)가 있으면 바다, 다음은 하늘(7 · 13), 들판(2 · 15), 그 밖은 거리 */
export function sceneOf(sdgIds: readonly SdgId[]): SceneKind {
  if (sdgIds.some((id) => id === 14 || id === 6)) return "sea";
  if (sdgIds.some((id) => id === 7 || id === 13)) return "sky";
  if (sdgIds.some((id) => id === 2 || id === 15)) return "field";
  return "town";
}

/** open = 도전할 수 있어요 · cleared = 기획서를 냈어요(HP 0) · closed = 내지 않았고 접수가 끝났어요 */
export type BattlePhase = "open" | "cleared" | "closed";

export interface BattleSkillVM extends HeroSkillVM {
  /** 이 퀘스트와 SDG 가 하나라도 겹치는지 (相性◎) */
  match: boolean;
  /** 고르면 메시지 창에 차례로 나오는 말 */
  lines: string[];
}

export interface BattleVM {
  challengeId: string;
  phase: BattlePhase;
  scene: SceneKind;
  foe: {
    name: string;
    kind: FoeKind;
    sdgIds: SdgId[];
    /** 「SDG 14・12」 */
    sdgLabel: string;
    /** 대표 SDG 의 색 — 몬스터의 무늬 · 기술 효과의 색 */
    color: string;
    hpPercent: number;
    hpAria: string;
    defeated: boolean;
  };
  hero: { name: string; skillsLabel: string; skillSdgIds: SdgId[] };
  /** 캔버스 그림의 대체 글 */
  sceneAlt: string;
  /** 처음 들어오면 메시지 창에 차례로 나오는 말 (마지막에 ask) */
  intro: string[];
  ask: string;
  /** たたかう: 메시지와, 메시지가 끝나면 갈 곳(submit = 기획서 제출 화면) */
  fight: { lines: string[]; go: "submit" | null };
  look: string[];
  run: string[];
  /** スキル 을 고르면 나오는 말 (스킬이 없으면 「まだ スキルが ない！…」) */
  skillPick: string;
  skills: BattleSkillVM[];
  hpHint: string;
}

export function selectBattle(state: DemoState, challengeId: string, locale: Locale): BattleVM | null {
  const challenge = state.challenges.find((c) => c.id === challengeId);
  if (!challenge) return null;
  const t = (key: Parameters<typeof translate>[0], params?: Parameters<typeof translate>[2]) => translate(key, locale, params);
  const company = state.companies.find((c) => c.id === challenge.companyId);
  const companyName = company ? pick(company.name, locale) : "";
  const proposal = state.proposals.find((p) => p.mine && p.challengeId === challenge.id);
  const open = isOpenFor(challenge, state.today);
  const phase: BattlePhase = proposal ? "cleared" : open ? "open" : "closed";
  const foe = foeOf(challenge);
  const foeName = pick(foe.name, locale);
  const name = state.me.nickname;
  const mainSdg = challenge.sdgIds[0] ?? 17;
  const hpPercent = phase === "cleared" ? 0 : 100;
  const learned = proposal ? state.skills.find((skill) => skill.proposalId === proposal.id) : undefined;

  const intro =
    phase === "open"
      ? [t("battle.appear", { foe: foeName }), t("battle.plea", { company: companyName })]
      : phase === "closed"
        ? [t("battle.appear", { foe: foeName }), t("battle.fight.closed")]
        : [
            t("battle.cleared", { foe: foeName }),
            learned ? heroSkillVM(learned, locale).learnedLabel : t("battle.clearedWait"),
            ...(learned && challenge.rewardItem ? [t("battle.clearedItem", { item: pick(challenge.rewardItem.name, locale) })] : []),
          ];

  const fight =
    phase === "open"
      ? { lines: [t("battle.fight.go", { name }), t("battle.fight.goHint")], go: "submit" as const }
      : phase === "cleared"
        ? open
          ? { lines: [t("battle.fight.again")], go: "submit" as const }
          : { lines: [t("battle.fight.done")], go: null }
        : { lines: [t("battle.fight.closed")], go: null };

  const plea = pleaOf(state, challenge, locale);
  const skills: BattleSkillVM[] = sortSkills(state.skills).map((skill) => {
    const vm = heroSkillVM(skill, locale);
    const match = skillMatches(skill, challenge.sdgIds);
    const shared = skill.sdgIds.find((id) => challenge.sdgIds.includes(id));
    return {
      ...vm,
      match,
      lines: [t("battle.skill.use", { name, skill: vm.name }), match && shared ? t("battle.skill.good", { sdg: shared }) : t("battle.skill.new")],
    };
  });
  // 상성이 좋은 스킬을 먼저 (같으면 최근 것부터 — sortSkills 의 순서)
  skills.sort((a, b) => Number(b.match) - Number(a.match));

  return {
    challengeId: challenge.id,
    phase,
    scene: sceneOf(challenge.sdgIds),
    foe: {
      name: foeName,
      kind: foe.kind,
      sdgIds: challenge.sdgIds,
      sdgLabel: t("battle.foeSdgs", { ids: challenge.sdgIds.join(locale === "ja" ? "・" : "·") }),
      color: getSdg(mainSdg).color,
      hpPercent,
      hpAria: t("battle.hpAria", { foe: foeName, percent: hpPercent }),
      defeated: phase === "cleared",
    },
    hero: { name: t("battle.heroName", { name }), skillsLabel: t("battle.heroSkills", { count: state.skills.length }), skillSdgIds: skillSdgIds(state.skills) },
    sceneAlt: t("battle.sceneAlt", { foe: foeName, name }),
    intro,
    ask: t("battle.ask", { name }),
    fight,
    look: [t("battle.look", { company: companyName, title: pick(challenge.title, locale) }), ...(plea.rewards ? [plea.rewards] : [])],
    run: [t("battle.run", { name })],
    skillPick: skills.length > 0 ? t("battle.skill.pick") : t("battle.skill.none"),
    skills,
    hpHint: t("battle.hpHint"),
  };
}
