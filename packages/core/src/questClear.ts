// 퀘스트 달성 연출(#47): 기업이 내 기획서를 고르면(수상) 학생이 다음에 화면을 열 때 뜨는 팝업의 화면 모델.
// ① 승리 연출: 이번 수상으로 얻은(레벨이 오른) SDG 스킬 → 가진 다른 스킬 순서로 기술을 쓰고, 마지막에 과제 몬스터를 쓰러뜨려요(전투 화면과 같은 무대).
// ② 「クエスト達成！」 창: 퀘스트 · 기업 · 상 · 얻은 스킬(SDG 가 여러 개면 모두, #45) · 기업 평가로 받은 EXP.
// ③ 보상: 상금과 상품이 둘 다 걸린 퀘스트의 최우수상이면 하나를 골라요(바꿀 수 없어요). 하나만 걸려 있으면 「受け取る」.
// 한 번 본 연출은 다시 저절로 뜨지 않아요(Proposal.celebrated). 고르지 않은 보상은 마이 Impact 의 카드에서 이 창을 다시 열어 골라요.
import { deriveActivities } from "./activities";
import { HP_AFTER_SUBMIT, selectBattle, type BattleVM, type DialogueLine } from "./battle";
import type { DemoState, Proposal, QuestReward } from "./domain";
import type { SkillEffectKind } from "./emblems";
import { formatYen } from "./format";
import { pick, type Locale } from "./i18n";
import { awardLabel } from "./labels";
import { translate } from "./messages";
import { heroSkillVM, selectSdgSkills } from "./selectors";
import { AWARD_STARS } from "./skills";
import { getSdg, type SdgId } from "./sdg";
import { computeSdgExp, reviewExp, statusLevelUps } from "./status";
import { rewardChosen, rewardOptionsFor } from "./wallet";

/** 승리 연출에서 가진 다른 스킬은 몇 개까지 쓰는지(이번 수상의 스킬은 모두) */
export const VICTORY_EXTRA_SKILLS = 2;

export interface VictoryStepVM {
  /** 메시지 창의 한 줄 */
  line: DialogueLine;
  /** 이 줄에서 쓰는 스킬의 효과(#42) — 없으면 말만 */
  skill: { sdgId: SdgId; color: string; effect: SkillEffectKind; fresh: boolean } | null;
}

export interface RewardOptionVM {
  kind: QuestReward;
  icon: string;
  /** 「賞金 30,000円」 · 「みなとの干物ギフトセット」 */
  label: string;
  /** 「企業から直接お振込み（運営はお金を預かりません）」 · 「定価相当 4,800円・みなと海洋フーズ株式会社から届きます」 */
  detail: string;
}

export interface QuestRewardVM {
  options: RewardOptionVM[];
  /** 둘 중 하나를 고르는지 — 아니면 「受け取る」 하나 */
  choose: boolean;
  /** 「報酬を ひとつ えらんでください」 */
  prompt: string;
  /** 「どちらか ひとつです。あとから かえられません。」 */
  note: string;
  /** 「この報酬に決める」 · 「受け取る」 */
  confirmLabel: string;
  chosen: QuestReward | null;
  /** 「賞金 30,000円を 受け取りました」 */
  chosenLabel: string | null;
}

export interface QuestClearVM {
  proposalId: string;
  challengeId: string;
  /** 연출을 아직 안 봤으면 true — 봤고 보상만 남았으면 false(창만 열어요) */
  fresh: boolean;
  /** 연출의 무대: 몬스터는 아직 서 있고(HP 30%) 마지막에 쓰러져요 */
  battle: BattleVM;
  steps: VictoryStepVM[];
  /** 마지막 줄: 「プラごみクラゲを やっつけた！」 */
  finish: DialogueLine;
  /** 「クエスト達成！」 */
  title: string;
  questTitle: string;
  companyName: string;
  /** 「最優秀賞」 */
  awardLabel: string;
  stars: 1 | 2 | 3;
  /** 이 수상으로 스킬을 얻은 SDG(퀘스트의 SDG 모두) */
  learnedSdgIds: SdgId[];
  /** 「SDG 12のスキルをおぼえた！」 · 「SDG 14のスキルがレベルアップ！（Lv.2）」 */
  learnedLines: string[];
  /** 「評価で EXP +130（SDG 14・12）」 (평가가 없으면 null) */
  expLabel: string | null;
  statusLevelUps: string[];
  reward: QuestRewardVM | null;
  skipLabel: string;
  laterLabel: string;
  closeLabel: string;
  /** 화면 읽기 프로그램용 한 줄: 「クエスト達成！ 海洋プラスチック… 最優秀賞」 */
  ariaLabel: string;
}

/** 연출을 아직 안 본 내 수상(가장 최근 수상부터) — 학생 화면을 열면 저절로 떠요 */
export function pendingCelebration(state: Pick<DemoState, "proposals">): Proposal | null {
  const list = state.proposals.filter((p) => p.mine && p.award !== null && !p.celebrated);
  return list.sort((a, b) => (b.review?.reviewedAt ?? b.submittedAt).localeCompare(a.review?.reviewedAt ?? a.submittedAt))[0] ?? null;
}

/** 퀘스트 달성 창. proposalId 를 주면 그 수상, 없으면 아직 안 본 수상(없으면 null) */
export function selectQuestClear(state: DemoState, locale: Locale, proposalId?: string): QuestClearVM | null {
  const proposal = proposalId ? state.proposals.find((p) => p.id === proposalId && p.mine && p.award !== null) : pendingCelebration(state);
  if (!proposal?.award) return null;
  const challenge = state.challenges.find((c) => c.id === proposal.challengeId);
  const battle = challenge ? selectBattle(state, challenge.id, locale) : null;
  if (!challenge || !battle) return null;
  const t = (key: Parameters<typeof translate>[0], params?: Parameters<typeof translate>[2]) => translate(key, locale, params);
  const company = state.companies.find((c) => c.id === challenge.companyId);
  const companyName = company ? pick(company.name, locale) : "";
  const name = state.me.nickname;
  const sep = locale === "ja" ? "・" : ", ";

  // ── 승리 연출: 이번 수상의 SDG 스킬(새로 · 레벨 업) → 가진 다른 스킬(레벨이 높은 것부터 몇 개) ──
  const record = state.skills.find((skill) => skill.proposalId === proposal.id);
  const gained = [...new Set(record?.sdgIds ?? challenge.sdgIds)];
  const owned = selectSdgSkills(state, locale);
  const steps: VictoryStepVM[] = [{ line: { speaker: "narrator", text: t("clear.chosen", { company: companyName, name }) }, skill: null }];
  for (const sdgId of gained) {
    const skill = owned.find((s) => s.sdgId === sdgId);
    if (!skill) continue;
    const fresh = skill.level === 1;
    steps.push({
      line: { speaker: "narrator", text: t(fresh ? "clear.skillNew" : "clear.skillUp", { sdg: sdgId, level: skill.level }) },
      skill: { sdgId, color: skill.color, effect: skill.effect, fresh: true },
    });
  }
  for (const skill of owned.filter((s) => !gained.includes(s.sdgId)).slice(0, VICTORY_EXTRA_SKILLS)) {
    steps.push({ line: { speaker: "narrator", text: t("clear.skillHeld", { sdg: skill.sdgId, level: skill.level }) }, skill: { sdgId: skill.sdgId, color: skill.color, effect: skill.effect, fresh: false } });
  }
  const stage: BattleVM = {
    ...battle,
    foe: { ...battle.foe, defeated: false, hpPercent: HP_AFTER_SUBMIT, hpAria: t("battle.hpAria", { foe: battle.foe.name, percent: HP_AFTER_SUBMIT }) },
  };

  // ── 창: 얻은 스킬 · 평가 EXP ──
  const learned = record ? heroSkillVM(record, locale, state.skills) : null;
  const exp = reviewExp(proposal.review);
  const statusExp = computeSdgExp(deriveActivities(state));
  const ups = exp > 0 ? statusLevelUps(statusExp, challenge.sdgIds, exp) : [];

  // ── 보상 ──
  const kinds = rewardOptionsFor(challenge, proposal.award);
  const options: RewardOptionVM[] = kinds.map((kind) =>
    kind === "prize"
      ? { kind, icon: "💴", label: t("clear.reward.prize", { amount: formatYen(challenge.prizeYen, locale) }), detail: t("clear.reward.prizeDetail") }
      : {
          kind,
          icon: "🎁",
          label: challenge.rewardItem ? pick(challenge.rewardItem.name, locale) : "",
          detail: t("clear.reward.itemDetail", { yen: formatYen(challenge.rewardItem?.retailYen ?? 0, locale), company: companyName }),
        },
  );
  const chosen = rewardChosen(state, proposal);
  const chosenOption = options.find((o) => o.kind === chosen);
  const choose = options.length > 1;
  const reward: QuestRewardVM | null =
    options.length === 0
      ? null
      : {
          options,
          choose,
          prompt: t(choose ? "clear.reward.prompt" : "clear.reward.single"),
          note: t(choose ? "clear.reward.noteChoose" : "clear.reward.noteSingle"),
          confirmLabel: t(choose ? "clear.reward.confirm" : "clear.reward.receive"),
          chosen,
          chosenLabel: chosenOption
            ? t(chosenOption.kind === "prize" ? "clear.reward.chosenPrize" : choose ? "clear.reward.chosenItem" : "clear.reward.gotItem", { label: chosenOption.label, company: companyName })
            : null,
        };

  const title = t("clear.title");
  const award = awardLabel(proposal.award, locale);
  const questTitle = pick(challenge.title, locale);
  return {
    proposalId: proposal.id,
    challengeId: challenge.id,
    fresh: !proposal.celebrated,
    battle: stage,
    steps,
    finish: { speaker: "narrator", text: t("clear.finish", { foe: battle.foe.name }) },
    title,
    questTitle,
    companyName,
    awardLabel: award,
    stars: AWARD_STARS[proposal.award],
    learnedSdgIds: gained,
    learnedLines: learned?.learnedLines ?? [],
    expLabel: exp > 0 ? t("clear.exp", { exp, sdgs: challenge.sdgIds.join(sep) }) : null,
    statusLevelUps: ups.map((up) => t("impact.reviewLevelUp", { id: up.sdgId, name: pick(getSdg(up.sdgId).name, locale), level: up.level })),
    reward,
    skipLabel: t("clear.skip"),
    laterLabel: t("clear.later"),
    closeLabel: t("clear.close"),
    ariaLabel: t("clear.aria", { title, quest: questTitle, award }),
  };
}
