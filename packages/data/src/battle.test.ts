import { describe, expect, it } from "vitest";
import { DEFAULT_FOE_NAMES, foeOf, sceneOf, selectBattle, splitSentences, type BattleVM, type TopicId } from "@sdgs-compass/core/battle";
import type { DemoState } from "@sdgs-compass/core/domain";
import { pick } from "@sdgs-compass/core/i18n";
import type { ProposalDraft } from "@sdgs-compass/core/proposal";
import { selectHome, selectSearch } from "@sdgs-compass/core/selectors";
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

const topic = (vm: BattleVM, id: TopicId) => vm.look.topics.find((c) => c.id === id)!;
/** 「누가: 말」 한 줄씩 — 이름표까지 함께 확인해요 */
const said = (lines: readonly { speaker: string; text: string }[]) => lines.map((line) => `${line.speaker}: ${line.text}`);

describe("퀘스트 전투 화면 (#38)", () => {
  it("몬스터: 샘플 퀘스트는 저마다의 몬스터(정체 = 과제를 쉬운 말로, #41), 새 퀘스트는 대표 SDG 로 고른 기본 몬스터", () => {
    const plastic = initial.challenges.find((c) => c.id === "ch-plastic")!;
    expect(foeOf(plastic)).toEqual({
      kind: "jelly",
      name: { ja: "プラごみクラゲ", ko: "플라스틱 해파리" },
      about: { ja: "商品の包装から出るプラスチックごみ", ko: "상품 포장에서 나오는 플라스틱 쓰레기" },
    });
    expect(foeOf({ sdgIds: [7, 13] })).toEqual({ kind: "smog", name: DEFAULT_FOE_NAMES.smog });
    expect(foeOf({ sdgIds: [8] }).kind).toBe("bird");
    expect(foeOf({ sdgIds: [] }).kind).toBe("wall");
    // 모든 열린 샘플 퀘스트에 몬스터 · 몬스터의 정체 · 스킬 이름이 있어요
    for (const c of initial.challenges.filter((x) => x.status === "open")) {
      expect(c.foe?.about, c.id).toBeDefined();
      expect(c.skillName, c.id).toBeDefined();
    }
  });

  it("배경: 바다 → 하늘 → 들판 → 거리 순으로, 퀘스트의 SDG 에 있으면 그 배경", () => {
    expect(sceneOf([12, 14])).toBe("sea");
    expect(sceneOf([13, 2])).toBe("sky");
    expect(sceneOf([12, 2, 15])).toBe("field");
    expect(sceneOf([11, 8])).toBe("town");
  });

  it("도전 전: HP 100 · 등장 → 의뢰한 기업의 부탁 → 몬스터의 정체(과제) · 「たたかう」는 제출 화면으로 · 이름표는 해설 · 기업 · 용사", () => {
    const vm = selectBattle(initial, "ch-plastic", "ja")!;
    expect(vm.phase).toBe("open");
    expect(vm.scene).toBe("sea");
    expect(vm.foe).toMatchObject({ name: "プラごみクラゲ", kind: "jelly", sdgIds: [14, 12], sdgLabel: "SDG 14・12", color: "#0A97D9", hpPercent: 100, defeated: false });
    expect(vm.speakers).toEqual({ client: { name: "みなと海洋フーズ株式会社", emoji: "🐟" }, hero: { name: "勇者 Mina" } });
    expect(said(vm.intro)).toEqual([
      "narrator: プラごみクラゲが あらわれた！",
      "client: 勇者さま、助けてください！",
      "client: プラごみクラゲの正体は、商品の包装から出るプラスチックごみです。",
    ]);
    expect(said([vm.ask])).toEqual(["narrator: 勇者Mina、どうしますか？"]);
    expect(vm.fight.go).toBe("submit");
    expect(said(vm.fight.lines)).toEqual(["narrator: 勇者Minaの チームは クエストに いどんだ！", "narrator: 企画書の提出画面へ進みます。"]);
    expect(said(vm.run)).toEqual(["narrator: 勇者Minaは うまく にげきれた！"]);
    expect(vm.hero).toEqual({ name: "勇者 Mina", skillsLabel: "スキル 2", skillSdgIds: [14, 12, 11, 10] });
    // 「プラごみ削減アイデア」(SDG 14・12)은 이 퀘스트와 상성◎, 「多言語の防災マップ」(SDG 11・10)은 새 분야
    expect(vm.skills.map((s) => [s.name, s.match])).toEqual([
      ["プラごみ削減アイデア", true],
      ["多言語の防災マップ", false],
    ]);
    // 기술(#42): 퀘스트와 겹치는 SDG(14)의 「大波そうじ」, 겹치지 않으면 스킬의 대표 SDG(11)의 「まちおこし」
    expect(said(vm.skills[0].lines)).toEqual(["narrator: 勇者Minaの「プラごみ削減アイデア」！", "narrator: 大波そうじ！ SDG 14の 経験が いきる！ このクエストと 相性ばつぐんだ！"]);
    // 목표의 공식 이름도 함께(기술 이름만으로는 무슨 목표인지 모를 수 있어서)
    expect(vm.skills[0].move).toEqual({ sdgId: 14, name: "大波そうじ", effect: "wave", color: "#0A97D9", goal: "海の豊かさを守ろう" });
    expect(vm.skills[1].move).toMatchObject({ sdgId: 11, name: "まちおこし", effect: "town" });
    expect(vm.skills[1].lines[1].text).toBe("まちおこし！ はじめての 分野だ。新しい スキルを おぼえる チャンス！");
    expect(said([vm.skillPick])).toEqual(["narrator: どの スキルを つかう？"]);
    const ko = selectBattle(initial, "ch-plastic", "ko")!;
    expect(said(ko.intro)[2]).toBe("client: 플라스틱 해파리의 정체는 바로 상품 포장에서 나오는 플라스틱 쓰레기!");
    expect(ko.fight.lines[0].text).toBe("용사 Mina의 팀이 퀘스트에 도전했다!");
  });

  it("기획서를 내면 HP 0 = 「クエスト達成！」, 기업이 고마워하고, 마감 전이면 다시 낼 수 있어요", () => {
    const vm = selectBattle(submitAndAward(initial, "ch-plastic", null), "ch-plastic", "ja")!;
    expect(vm.phase).toBe("cleared");
    expect(vm.foe).toMatchObject({ hpPercent: 0, defeated: true, hpAria: "プラごみクラゲの のこりHP 0%" });
    expect(said(vm.intro)).toEqual(["narrator: プラごみクラゲを やっつけた！ クエスト達成！", "client: 企画書をありがとうございます！ 審査の結果を、少しお待ちください。"]);
    expect(vm.fight).toEqual({ lines: [{ speaker: "narrator", text: "クエスト達成ずみ！ 締切までは 企画書を 出しなおせる。" }], go: "submit" });
  });

  it("수상하면 그 퀘스트의 SDG 번호가 붙은 스킬을 「おぼえた！」 · 상품 보상도 「手に入れた！」", () => {
    const state = submitAndAward(initial, "ch-plastic", "excellence");
    expect(state.skills).toHaveLength(3);
    const vm = selectBattle(state, "ch-plastic", "ja")!;
    expect(said(vm.intro)).toEqual([
      "narrator: プラごみクラゲを やっつけた！ クエスト達成！",
      "narrator: スキル「エコ包装デザイン」（SDG 14）をおぼえた！",
      "narrator: 報酬アイテム「みなとの干物ギフトセット」を 手に入れた！",
    ]);
    expect(vm.hero.skillsLabel).toBe("スキル 3");
    const ko = selectBattle(state, "ch-plastic", "ko")!;
    expect(ko.intro.map((line) => line.text)).toEqual(["플라스틱 해파리 격파! 퀘스트 달성!", "스킬 「친환경 포장 디자인」(SDG 14)을 배웠다!", "보상 아이템 「미나토 건어물 선물 세트」 획득!"]);
  });

  it("내지 않은 채로 접수가 끝난 퀘스트: 「たたかう」는 어디로도 가지 않고, 마감은 「…でした」", () => {
    const vm = selectBattle(initial, "ch-bottle", "ja")!;
    expect(vm.phase).toBe("closed");
    expect(vm.fight.go).toBeNull();
    expect(said(vm.intro)).toEqual([
      "narrator: つかいすてボトルが あらわれた！",
      "client: つかいすてボトルの正体は、イベントで捨てられる、使い捨てのペットボトルです。",
      "narrator: このクエストの 受付は 終わっている…",
    ]);
    expect(topic(vm, "reward").lines[0].text).toMatch(/^締切は.+でした。受付は、もう終わっています。$/);
    expect(selectBattle(initial, "없음", "ja")).toBeNull();
  });

  it("몬스터의 정체가 적혀 있지 않은 퀘스트는 요약을 그대로 말해요", () => {
    const old = initial.challenges.find((c) => c.foe === undefined)!;
    const vm = selectBattle(initial, old.id, "ko")!;
    expect(said(vm.intro)[1]).toBe(`client: ${pick(old.summary, "ko")}`);
  });

  it("스킬이 없는 용사: 「まだ スキルが ない！」", () => {
    const vm = selectBattle({ ...initial, skills: [] }, "ch-solar", "ja")!;
    expect(vm.skills).toEqual([]);
    expect(vm.skillPick).toEqual({ speaker: "narrator", text: "まだ スキルが ない！ クエストで 受賞すると スキルを おぼえる。" });
    expect(vm.hero.skillsLabel).toBe("スキル 0");
  });
});

describe("긴 글을 문장마다 나누기 (#41 메시지 창 한 장에 한 문장)", () => {
  it("일본어는 「。！？」, 한국어는 뒤에 빈칸이 있는 「. ! ?」에서 나눠요", () => {
    expect(splitSentences("当社は出荷しています。清掃でも見つかります。")).toEqual(["当社は出荷しています。", "清掃でも見つかります。"]);
    expect(splitSentences("저희는 출하해요. 청소에서도 발견돼요.")).toEqual(["저희는 출하해요.", "청소에서도 발견돼요."]);
  });

  it("숫자의 점에서는 나누지 않고, 닫는 괄호는 앞 문장에 붙여요", () => {
    expect(splitSentences("약 1.5배로 늘었어요. 좋아요!")).toEqual(["약 1.5배로 늘었어요.", "좋아요!"]);
    expect(splitSentences("「助けて！」と言われました。")).toEqual(["「助けて！」", "と言われました。"]);
    expect(splitSentences("  끝에 점이 없어도 남아요 ")).toEqual(["끝에 점이 없어도 남아요"]);
  });
});

describe("「しらべる」 — 의뢰한 기업에게 선택지로 묻기 (#41)", () => {
  it("기업이 「何でも聞いてください！」, 선택지는 무엇이 곤란한지 · 할 일 · 마감과 보상", () => {
    const vm = selectBattle(initial, "ch-plastic", "ja")!;
    expect(said(vm.look.lines)).toEqual(["client: 何でも聞いてください！"]);
    expect(vm.look.topics.map((c) => [c.id, c.label])).toEqual([
      ["trouble", "何に困っているんですか？"],
      ["todo", "何をすればいいですか？"],
      ["reward", "締切と報酬は？"],
    ]);
  });

  it("「何に困っているんですか？」: 기업이 배경을 한 문장씩 말해요", () => {
    const vm = selectBattle(initial, "ch-plastic", "ja")!;
    expect(said(topic(vm, "trouble").lines)).toEqual([
      "client: 当社は年間約120万個の水産加工品を出荷しており、包装由来のプラスチックごみが課題です。",
      "client: 漁港周辺の清掃活動でも、包装ごみが多く見つかっています。",
    ]);
  });

  it("「何をすればいいですか？」: 할 일 → 낼 것(목록) → 팀 인원과 기간", () => {
    const vm = selectBattle(initial, "ch-plastic", "ja")!;
    expect(said(topic(vm, "todo").lines)).toEqual([
      "client: コストを大きく増やさずに、環境への負担を下げる「包装・回収・啓発」のアイデアを提案してください。",
      "client: 出してほしいもの：\n・企画書・発表資料（PDF・PPTX、10枚以内）\n・効果の試算（減らせるプラスチックの量など）\n・（任意）イメージ動画のURL",
      "client: 1チーム3〜5人（大学生・大学院生）で挑戦できます。期間の目安は1〜2か月です。",
    ]);
  });

  it("「締切と報酬は？」: 마감일과 남은 날, 보상 한 줄(의뢰서와 같아요)", () => {
    const vm = selectBattle(initial, "ch-plastic", "ja")!;
    const card = selectHome(initial, "ja").recommended.find((c) => c.id === "ch-plastic")!;
    expect(said(topic(vm, "reward").lines)).toEqual([
      `client: 締切は${card.closesOnLabel}です（あと${card.daysLeft}日）。`,
      `client: お礼として、${card.rewardsLine} をご用意しています。`,
    ]);
    const ko = selectBattle(initial, "ch-plastic", "ko")!;
    expect(said(topic(ko, "reward").lines)[1]).toBe("client: 사례로 드릴 것: 상금 100,000엔 / 🎁 미나토 건어물 선물 세트 / 인턴십");
  });
});

describe("퀘스트 의뢰서 (#39 · #41) — 목록 카드의 과제 · 몬스터 · 보상 한 줄", () => {
  it("카드에 전투 화면과 같은 몬스터(이름 · 모양 · 대표 SDG 색)가 붙어요", () => {
    const home = selectHome(initial, "ja");
    for (const card of [...home.recommended, ...home.soon]) {
      const challenge = initial.challenges.find((c) => c.id === card.id)!;
      expect(card.foe.kind, card.id).toBe(foeOf(challenge).kind);
      expect(card.foe.name, card.id).toBe(selectBattle(initial, card.id, "ja")!.foe.name);
      expect(card.foe.color, card.id).toBe(selectBattle(initial, card.id, "ja")!.foe.color);
    }
  });

  it("「課題」는 몬스터의 정체(쉬운 말), 없으면 퀘스트의 요약", () => {
    const card = selectHome(initial, "ja").recommended.find((c) => c.id === "ch-plastic")!;
    expect(card.problem).toBe("商品の包装から出るプラスチックごみ");
    expect(card.foe.about).toBe("商品の包装から出るプラスチックごみ");
    const ko = selectHome(initial, "ko").recommended.find((c) => c.id === "ch-plastic")!;
    expect(ko.problem).toBe("상품 포장에서 나오는 플라스틱 쓰레기");
    const old = initial.challenges.find((c) => c.foe === undefined)!;
    const oldCard = selectSearch(initial, "ja", { query: "", sdgIds: [] }).find((c) => c.id === old.id)!;
    expect(oldCard.foe.about).toBeNull();
    expect(oldCard.problem).toBe(pick(old.summary, "ja"));
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
