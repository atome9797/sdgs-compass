// 퀘스트 전투 화면(#38)의 화면 모델 — 턴제 RPG 처럼, 위에 과제 몬스터 · 아래에 용사 팀 · 메시지 창 · 명령 4개(たたかう · スキル · しらべる · にげる).
// 메시지 창에는 노벨 게임처럼 이름표(누가 말하는지)가 있고(#41), 처음에 의뢰한 기업이 몬스터의 정체 = 과제를 쉬운 말로 알려 줘요.
// 「しらべる」를 고르면 기업에게 선택지로 물어요(무엇이 곤란한지 · 할 일과 낼 것 · 마감과 보상).
// 그림(WebGL)은 웹이 그려요(apps/web/src/lib/battle). 몬스터 · 배경 · HP · 대사 · 선택지 · 스킬 상성(相性)은 여기 한 곳에서 정해요.
// 규칙(#47): 기획서를 내면 몬스터에게 큰 데미지(HP 30%)를 주고 기업의 심사를 기다려요. 기업이 고르면(수상) HP 0 = 「クエスト達成！」 —
// 그 퀘스트의 SDG 마다 스킬을 얻어요(skills.ts — 같은 SDG 의 수상이 쌓이면 스킬 레벨이 올라요). 뽑히지 않고 끝나도 평가 EXP 는 남아요(status.ts).
// 수상한 뒤 학생이 처음 화면을 열 때의 승리 연출 · 보상 고르기는 questClear.ts.
// 「スキル」 명령은 가진 SDG 스킬을 보여 줘요(#45): 이 퀘스트의 SDG 에 들어 있는 스킬이 「相性◎」.
import type { DemoState, FoeKind } from "./domain";
import { foeOf } from "./foe";
import { daysBetween, formatDate, formatYen } from "./format";
import { pick, type Locale } from "./i18n";
import { translate } from "./messages";
import { TEAM_SIZE } from "./proposal";
import { isOpenFor } from "./recommend";
import { getSdg, type SdgId } from "./sdg";
import { heroSkillVM, rewardsLineOf, selectSdgSkills, type SdgSkillVM } from "./selectors";
import { skillSdgIds } from "./skills";
import { reviewExp } from "./status";
import { rewardChosen, rewardPending } from "./wallet";

export type SceneKind = "sea" | "sky" | "field" | "town";

export { DEFAULT_FOE_NAMES, foeOf } from "./foe";

/** 배경: 퀘스트의 SDG 중에 바다(6 · 14)가 있으면 바다, 다음은 하늘(7 · 13), 들판(2 · 15), 그 밖은 거리 */
export function sceneOf(sdgIds: readonly SdgId[]): SceneKind {
  if (sdgIds.some((id) => id === 14 || id === 6)) return "sea";
  if (sdgIds.some((id) => id === 7 || id === 13)) return "sky";
  if (sdgIds.some((id) => id === 2 || id === 15)) return "field";
  return "town";
}

/**
 * open = 도전할 수 있어요 · challenged = 기획서를 냈어요(HP 30%, 심사를 기다려요) · won = 기업이 골랐어요(수상 — HP 0, 퀘스트 달성)
 * · ended = 냈지만 이번에는 뽑히지 않고 끝났어요 · closed = 내지 않았고 접수가 끝났어요
 */
export type BattlePhase = "open" | "challenged" | "won" | "ended" | "closed";

/** 기획서를 낸 뒤 몬스터에게 남는 HP(%) — 기업이 고르면(수상) 0 */
export const HP_AFTER_SUBMIT = 30;

/** 누가 말하는지 — 메시지 창의 이름표(#41). narrator(해설)는 이름표가 없어요 */
export type Speaker = "narrator" | "client" | "hero";

export interface DialogueLine {
  speaker: Speaker;
  /** 줄바꿈(\n)이 들어갈 수 있어요(낼 것 목록) */
  text: string;
}

/** 「しらべる」의 선택지(#41): trouble = 무엇이 곤란한지(배경) · todo = 할 일과 낼 것 · reward = 마감과 보상 */
export type TopicId = "trouble" | "todo" | "reward";

export interface LookTopicVM {
  id: TopicId;
  /** 선택지의 말(용사가 묻는 말) */
  label: string;
  /** 고르면 의뢰한 기업이 차례로 하는 말 */
  lines: DialogueLine[];
}

/** 「スキル」 명령의 스킬 하나 = SDG 하나의 스킬(#45) — 공식 이름 · 레벨 · 효과 모양(#42) · 색은 SdgSkillVM 그대로 */
export interface BattleSkillVM extends SdgSkillVM {
  /** 이 퀘스트의 SDG 에 들어 있는지 (相性◎) */
  match: boolean;
  /** 고르면 메시지 창에 차례로 나오는 말 */
  lines: DialogueLine[];
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
  /** 이름표: 의뢰한 기업(이모지 + 회사 이름) · 용사 */
  speakers: { client: { name: string; emoji: string }; hero: { name: string } };
  /** 캔버스 그림의 대체 글 */
  sceneAlt: string;
  /** 처음 들어오면 메시지 창에 차례로 나오는 말 (그다음 ask) */
  intro: DialogueLine[];
  /** 명령을 기다리는 말: 「勇者Mina、どうしますか？」 */
  ask: DialogueLine;
  /** たたかう: 메시지와, 메시지가 끝나면 갈 곳(submit = 기획서 제출 화면) */
  fight: { lines: DialogueLine[]; go: "submit" | null };
  /** しらべる(#41): 의뢰한 기업이 「何でも聞いてください！」 하고, 용사는 선택지로 물어요 */
  look: { lines: DialogueLine[]; topics: LookTopicVM[] };
  run: DialogueLine[];
  /** スキル 을 고르면 나오는 말 (스킬이 없으면 「まだ スキルが ない！…」) */
  skillPick: DialogueLine;
  skills: BattleSkillVM[];
  hpHint: string;
}

/**
 * 긴 글을 문장마다 나눠요(메시지 창 한 장에 한 문장). 일본어는 「。！？」, 한국어는 뒤에 빈칸이 있는 「. ! ?」 —
 * 「1.5배」 같은 숫자의 점에서는 나누지 않고, 문장 끝의 닫는 괄호(」』）)는 앞 문장에 붙여요.
 */
export function splitSentences(text: string): string[] {
  const chars = Array.from(text.trim());
  const out: string[] = [];
  let buf = "";
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    buf += ch;
    const next = chars[i + 1];
    const endJa = ch === "。" || ch === "！" || ch === "？";
    const endKo = (ch === "." || ch === "!" || ch === "?") && (next === undefined || next === " " || next === "\n");
    if (!endJa && !endKo) continue;
    while (i + 1 < chars.length && "」』）)".includes(chars[i + 1])) buf += chars[++i];
    if (buf.trim()) out.push(buf.trim());
    buf = "";
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

const said = (speaker: Speaker) => (text: string): DialogueLine => ({ speaker, text });
const client = said("client");
const narrator = said("narrator");

export function selectBattle(state: DemoState, challengeId: string, locale: Locale): BattleVM | null {
  const challenge = state.challenges.find((c) => c.id === challengeId);
  if (!challenge) return null;
  const t = (key: Parameters<typeof translate>[0], params?: Parameters<typeof translate>[2]) => translate(key, locale, params);
  const company = state.companies.find((c) => c.id === challenge.companyId);
  const companyName = company ? pick(company.name, locale) : "";
  const proposal = state.proposals.find((p) => p.mine && p.challengeId === challenge.id);
  const open = isOpenFor(challenge, state.today);
  const phase: BattlePhase = proposal ? (proposal.award ? "won" : challenge.status === "closed" ? "ended" : "challenged") : open ? "open" : "closed";
  const foe = foeOf(challenge);
  const foeName = pick(foe.name, locale);
  const name = state.me.nickname;
  const mainSdg = challenge.sdgIds[0] ?? 17;
  const hpPercent = phase === "won" ? 0 : phase === "challenged" || phase === "ended" ? HP_AFTER_SUBMIT : 100;
  const learned = proposal ? state.skills.find((skill) => skill.proposalId === proposal.id) : undefined;
  // 기업의 평가로 받은 EXP(#45 — 상과 관계없이)
  const exp = proposal ? reviewExp(proposal.review) : 0;
  const expLine = (key: "battle.reviewedExp" | "battle.endedExp") => (exp > 0 ? [narrator(t(key, { exp, sdgs: challenge.sdgIds.join(locale === "ja" ? "・" : ", ") }))] : []);
  // 받은 보상(#47): 받은 상금 · 상품, 상금과 상품 중에서 아직 고르지 않았으면 고르라고
  const rewardLines: DialogueLine[] = [];
  if (proposal?.award) {
    const choice = rewardChosen(state, proposal);
    if (choice === "prize") rewardLines.push(narrator(t("battle.clearedPrize", { amount: formatYen(challenge.prizeYen, locale) })));
    else if (choice === "item" && challenge.rewardItem) rewardLines.push(narrator(t("battle.clearedItem", { item: pick(challenge.rewardItem.name, locale) })));
    else if (rewardPending(state, proposal)) rewardLines.push(narrator(t("battle.rewardPending")));
  }

  // 몬스터의 정체 = 과제를 쉬운 말로(#41). 정체가 적혀 있지 않은 퀘스트(기업이 새로 낸 퀘스트 등)는 요약을 그대로 말해요
  const identity = foe.about ? client(t("battle.identity", { foe: foeName, about: pick(foe.about, locale) })) : client(pick(challenge.summary, locale));
  const intro: DialogueLine[] =
    phase === "open"
      ? [narrator(t("battle.appear", { foe: foeName })), client(t("battle.help")), identity]
      : phase === "closed"
        ? [narrator(t("battle.appear", { foe: foeName })), identity, narrator(t("battle.fight.closed"))]
        : phase === "challenged"
          ? [narrator(t("battle.attacked", { name, foe: foeName })), client(t("battle.clearedWait")), ...expLine("battle.reviewedExp")]
          : phase === "ended"
            ? [narrator(t("battle.ended", { foe: foeName })), ...expLine("battle.endedExp")]
            : [narrator(t("battle.cleared", { foe: foeName })), ...(learned ? heroSkillVM(learned, locale, state.skills).learnedLines.map(narrator) : []), ...rewardLines];

  const fight =
    phase === "open"
      ? { lines: [narrator(t("battle.fight.go", { name })), narrator(t("battle.fight.goHint"))], go: "submit" as const }
      : phase === "challenged"
        ? open
          ? { lines: [narrator(t("battle.fight.again"))], go: "submit" as const }
          : { lines: [narrator(t("battle.fight.done"))], go: null }
        : phase === "won"
          ? { lines: [narrator(t("battle.fight.won"))], go: null }
          : { lines: [narrator(t("battle.fight.closed"))], go: null };

  // ── しらべる: 의뢰한 기업에게 묻는 선택지 ──
  const deliverables = challenge.deliverables.map((item) => `・${pick(item, locale)}`);
  const daysLeft = daysBetween(state.today, challenge.closesOn);
  const date = formatDate(challenge.closesOn, locale);
  const rewards = rewardsLineOf(challenge, locale);
  const topics: LookTopicVM[] = [
    { id: "trouble", label: t("battle.topic.trouble"), lines: splitSentences(pick(challenge.background, locale)).map(client) },
    {
      id: "todo",
      label: t("battle.topic.todo"),
      lines: [
        ...splitSentences(pick(challenge.mission, locale)).map(client),
        ...(deliverables.length > 0 ? [client(`${t("battle.todo.deliverables")}\n${deliverables.join("\n")}`)] : []),
        client(t("battle.todo.team", { min: TEAM_SIZE.min, max: TEAM_SIZE.max })),
      ],
    },
    {
      id: "reward",
      label: t("battle.topic.reward"),
      lines: [
        client(!open ? t("battle.reward.closed", { date }) : daysLeft <= 0 ? t("battle.reward.today", { date }) : t("battle.reward.deadline", { date, days: daysLeft })),
        client(rewards ? t("battle.reward.items", { rewards }) : t("battle.reward.none")),
      ],
    },
  ];

  const skills: BattleSkillVM[] = selectSdgSkills(state, locale).map((skill) => {
    const match = challenge.sdgIds.includes(skill.sdgId);
    return {
      ...skill,
      match,
      lines: [narrator(t("battle.skill.use", { name, sdg: skill.sdgId, level: skill.level })), narrator(match ? t("battle.skill.good", { sdg: skill.sdgId }) : t("battle.skill.new"))],
    };
  });
  // 상성이 좋은 스킬을 먼저 (같으면 레벨이 높은 것부터 — sdgSkills 의 순서)
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
      defeated: phase === "won",
    },
    hero: { name: t("battle.heroName", { name }), skillsLabel: t("battle.heroSkills", { count: skills.length }), skillSdgIds: skillSdgIds(state.skills) },
    speakers: { client: { name: companyName, emoji: company?.emoji ?? "🏢" }, hero: { name: t("battle.heroName", { name }) } },
    sceneAlt: t("battle.sceneAlt", { foe: foeName, name }),
    intro,
    ask: narrator(t("battle.ask", { name })),
    fight,
    look: { lines: [client(t("battle.look.prompt"))], topics },
    run: [narrator(t("battle.run", { name }))],
    skillPick: narrator(skills.length > 0 ? t("battle.skill.pick") : t("battle.skill.none")),
    skills,
    hpHint: t("battle.hpHint"),
  };
}
