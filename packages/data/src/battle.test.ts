import { describe, expect, it } from "vitest";
import { DEFAULT_FOE_NAMES, foeOf, sceneOf, selectBattle } from "@sdgs-compass/core/battle";
import type { DemoState } from "@sdgs-compass/core/domain";
import type { ProposalDraft } from "@sdgs-compass/core/proposal";
import { selectHome } from "@sdgs-compass/core/selectors";
import { reducer } from "@sdgs-compass/core/state";
import { createInitialState } from "./seed";

const TODAY = "2026-10-30";
const AT = `${TODAY}T10:00`;
const initial = createInitialState(TODAY);
const draft: ProposalDraft = { teamName: "勇者団", teamSize: 3, seminar: "", title: "包装を変える", summary: "要約です", fileName: "plan.pdf", fileSizeBytes: 1000, videoUrl: "" };

function submitAndAward(state: DemoState, challengeId: string, award: "grand" | "excellence" | "special" | null): DemoState {
  let next = reducer(state, { type: "submitProposal", challengeId, draft, at: AT });
  const id = next.proposals.find((p) => p.mine && p.challengeId === challengeId)!.id;
  if (award === null) return next;
  next = reducer(next, { type: "reviewProposal", proposalId: id, review: { creativity: 5, feasibility: 4, sdgContribution: 5, comment: "" }, at: AT });
  return reducer(next, { type: "awardProposal", proposalId: id, award });
}

describe("퀘스트 전투 화면 (#38)", () => {
  it("몬스터: 샘플 퀘스트는 저마다의 몬스터, 새 퀘스트는 대표 SDG 로 고른 기본 몬스터", () => {
    const plastic = initial.challenges.find((c) => c.id === "ch-plastic")!;
    expect(foeOf(plastic)).toEqual({ kind: "jelly", name: { ja: "プラごみクラゲ", ko: "플라스틱 해파리" } });
    expect(foeOf({ sdgIds: [7, 13] })).toEqual({ kind: "smog", name: DEFAULT_FOE_NAMES.smog });
    expect(foeOf({ sdgIds: [8] }).kind).toBe("bird");
    expect(foeOf({ sdgIds: [] }).kind).toBe("wall");
    // 모든 열린 샘플 퀘스트에 몬스터와 스킬 이름이 있어요
    for (const c of initial.challenges.filter((x) => x.status === "open")) {
      expect(c.foe, c.id).toBeDefined();
      expect(c.skillName, c.id).toBeDefined();
    }
  });

  it("배경: 바다 → 하늘 → 들판 → 거리 순으로, 퀘스트의 SDG 에 있으면 그 배경", () => {
    expect(sceneOf([12, 14])).toBe("sea");
    expect(sceneOf([13, 2])).toBe("sky");
    expect(sceneOf([12, 2, 15])).toBe("field");
    expect(sceneOf([11, 8])).toBe("town");
  });

  it("도전 전: HP 100 · 등장 → 의뢰 · 「たたかう」는 제출 화면으로 · 상성이 좋은 스킬부터", () => {
    const vm = selectBattle(initial, "ch-plastic", "ja")!;
    expect(vm.phase).toBe("open");
    expect(vm.scene).toBe("sea");
    expect(vm.foe).toMatchObject({ name: "プラごみクラゲ", kind: "jelly", sdgIds: [14, 12], sdgLabel: "SDG 14・12", color: "#0A97D9", hpPercent: 100, defeated: false });
    expect(vm.intro).toEqual(["プラごみクラゲが あらわれた！", "みなと海洋フーズ株式会社「勇者さま、助けてください！」"]);
    expect(vm.ask).toBe("勇者Mina、どうしますか？");
    expect(vm.fight).toEqual({ lines: ["勇者Minaの パーティは クエストに いどんだ！", "企画書の提出画面へ進みます。"], go: "submit" });
    expect(vm.hero).toEqual({ name: "勇者 Mina", skillsLabel: "スキル 2", skillSdgIds: [14, 12, 11, 10] });
    // 「プラごみ削減アイデア」(SDG 14・12)은 이 퀘스트와 상성◎, 「多言語の防災マップ」(SDG 11・10)은 새 분야
    expect(vm.skills.map((s) => [s.name, s.match])).toEqual([
      ["プラごみ削減アイデア", true],
      ["多言語の防災マップ", false],
    ]);
    expect(vm.skills[0].lines).toEqual(["勇者Minaの「プラごみ削減アイデア」！", "SDG 14の 経験が いきる！ このクエストと 相性ばつぐんだ！"]);
    expect(vm.skills[1].lines[1]).toBe("はじめての 分野だ。新しい スキルを おぼえる チャンス！");
    expect(vm.look[0]).toBe("みなと海洋フーズ株式会社からの 依頼：「海洋プラスチックを減らす新しい包装アイデア」");
    expect(vm.look[1]).toContain("🎁 みなとの干物ギフトセット");
    expect(vm.skillPick).toBe("どの スキルを つかう？");
  });

  it("기획서를 내면 HP 0 = 「クエスト達成！」, 마감 전이면 다시 낼 수 있어요", () => {
    const vm = selectBattle(submitAndAward(initial, "ch-plastic", null), "ch-plastic", "ja")!;
    expect(vm.phase).toBe("cleared");
    expect(vm.foe).toMatchObject({ hpPercent: 0, defeated: true, hpAria: "プラごみクラゲの のこりHP 0%" });
    expect(vm.intro).toEqual(["プラごみクラゲを やっつけた！ クエスト達成！", "企業の 審査を 待っています。"]);
    expect(vm.fight).toEqual({ lines: ["クエスト達成ずみ！ 締切までは 企画書を 出しなおせる。"], go: "submit" });
  });

  it("수상하면 그 퀘스트의 SDG 번호가 붙은 스킬을 「おぼえた！」 · 상품 보상도 「手に入れた！」", () => {
    const state = submitAndAward(initial, "ch-plastic", "excellence");
    expect(state.skills).toHaveLength(3);
    const vm = selectBattle(state, "ch-plastic", "ja")!;
    expect(vm.intro).toEqual(["プラごみクラゲを やっつけた！ クエスト達成！", "スキル「エコ包装デザイン」（SDG 14）をおぼえた！", "報酬アイテム「みなとの干物ギフトセット」を 手に入れた！"]);
    expect(vm.hero.skillsLabel).toBe("スキル 3");
    const ko = selectBattle(state, "ch-plastic", "ko")!;
    expect(ko.intro).toEqual(["플라스틱 해파리 격파! 퀘스트 달성!", "스킬 「친환경 포장 디자인」(SDG 14)을 배웠다!", "보상 아이템 「미나토 건어물 선물 세트」 획득!"]);
  });

  it("내지 않은 채로 접수가 끝난 퀘스트: 「たたかう」는 어디로도 가지 않아요", () => {
    const closed = initial.challenges.find((c) => c.status === "closed")!;
    const vm = selectBattle(initial, closed.id, "ko")!;
    expect(vm.phase).toBe("closed");
    expect(vm.fight.go).toBeNull();
    expect(vm.intro[1]).toBe("이 퀘스트의 접수는 끝났다…");
    expect(selectBattle(initial, "없음", "ja")).toBeNull();
  });

  it("스킬이 없는 용사: 「まだ スキルが ない！」", () => {
    const vm = selectBattle({ ...initial, skills: [] }, "ch-solar", "ja")!;
    expect(vm.skills).toEqual([]);
    expect(vm.skillPick).toBe("まだ スキルが ない！ クエストで 受賞すると スキルを おぼえる。");
    expect(vm.hero.skillsLabel).toBe("スキル 0");
  });
});

describe("퀘스트 의뢰서 (#39) — 목록 카드의 토벌 대상 · 보상 한 줄", () => {
  it("카드에 전투 화면과 같은 몬스터(이름 · 모양 · 대표 SDG 색)가 붙어요", () => {
    const home = selectHome(initial, "ja");
    for (const card of [...home.recommended, ...home.soon]) {
      const challenge = initial.challenges.find((c) => c.id === card.id)!;
      expect(card.foe.kind, card.id).toBe(foeOf(challenge).kind);
      expect(card.foe.name, card.id).toBe(selectBattle(initial, card.id, "ja")!.foe.name);
      expect(card.foe.color, card.id).toBe(selectBattle(initial, card.id, "ja")!.foe.color);
    }
  });

  it("보상 한 줄: 상금 → 상품 → 그 밖의 특전, 의뢰 창의 보상 줄과 같아요", () => {
    const card = selectHome(initial, "ja").recommended.find((c) => c.id === "ch-plastic")!;
    expect(card.rewardsLine).toBe("賞金 ¥100,000 ／ 🎁 みなとの干物ギフトセット ／ インターン");
    const plea = selectHome(initial, "ja").plea!;
    expect(plea.rewards).toBe(`報酬：${card.rewardsLine}`);
    const ko = selectHome(initial, "ko").recommended.find((c) => c.id === "ch-plastic")!;
    expect(ko.rewardsLine).toBe("상금 100,000엔 / 🎁 미나토 건어물 선물 세트 / 인턴십");
  });
});
