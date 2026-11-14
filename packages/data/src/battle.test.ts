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
    // #45 스킬은 SDG 마다: 샘플의 수상 2건(SDG 14・12 · 11・10) → SDG 스킬 4개
    expect(vm.hero).toEqual({ name: "勇者 Mina", skillsLabel: "スキル 4", skillSdgIds: [14, 12, 11, 10] });
    // 이 퀘스트의 SDG(14 · 12)에 들어 있는 스킬이 상성◎ — 먼저 보여요
    expect(vm.skills.map((s) => [s.sdgId, s.match])).toEqual([
      [14, true],
      [12, true],
      [11, false],
      [10, false],
    ]);
    expect(said(vm.skills[0].lines)).toEqual(["narrator: 勇者Minaの SDG 14スキル（Lv.1）！", "narrator: SDG 14の 経験が いきる！ このクエストと 相性ばつぐんだ！"]);
    // 목표의 공식 이름 · 레벨 · 이 스킬이 된 수상 · 효과 모양(#42)
    expect(vm.skills[0]).toMatchObject({ sdgId: 14, goal: "海の豊かさを守ろう", level: 1, levelLabel: "スキルLv.1", recordsLabel: "プラごみ削減アイデア", effect: "wave", color: "#0A97D9" });
    expect(vm.skills[2]).toMatchObject({ sdgId: 11, effect: "town", recordsLabel: "多言語の防災マップ" });
    expect(vm.skills[2].lines[1].text).toBe("はじめての 分野だ。新しい スキルを おぼえる チャンス！");
    expect(said([vm.skillPick])).toEqual(["narrator: どの スキルを つかう？"]);
    const ko = selectBattle(initial, "ch-plastic", "ko")!;
    expect(said(ko.intro)[2]).toBe("client: 플라스틱 해파리의 정체는 바로 상품 포장에서 나오는 플라스틱 쓰레기!");
    expect(ko.fight.lines[0].text).toBe("용사 Mina의 팀이 퀘스트에 도전했다!");
  });

  it("기획서를 내면 큰 데미지(HP 30%) — 기업이 고마워하고, 평가를 받으면 EXP, 마감 전이면 다시 낼 수 있어요 (#47)", () => {
    const submitted = submitAndAward(initial, "ch-plastic", null);
    const vm = selectBattle(submitted, "ch-plastic", "ja")!;
    expect(vm.phase).toBe("challenged");
    expect(vm.foe).toMatchObject({ hpPercent: 30, defeated: false, hpAria: "プラごみクラゲの のこりHP 30%" });
    expect(said(vm.intro)).toEqual(["narrator: 勇者Minaの 企画書！ プラごみクラゲに 大ダメージ！", "client: 企画書をありがとうございます！ 審査の結果を、少しお待ちください。"]);
    expect(vm.fight).toEqual({ lines: [{ speaker: "narrator", text: "企画書で こうげきずみ！ 締切までは 出しなおせる。" }], go: "submit" });
    // 기업이 평가하면(수상 전) EXP 한 줄
    const id = submitted.proposals.find((p) => p.mine)!.id;
    const reviewed = reducer(submitted, { type: "reviewProposal", proposalId: id, review: { creativity: 4, feasibility: 4, sdgContribution: 5, comment: "" }, at: AT });
    expect(said(selectBattle(reviewed, "ch-plastic", "ja")!.intro)[2]).toBe("narrator: 企業の 評価で EXP +130（SDG 14・12）！ あとは えらばれるのを 待とう。");
    // 뽑히지 않고 끝나면(접수 끝 · 수상 없음) 몬스터는 달아나고 EXP 는 남아요
    const ended = { ...reviewed, challenges: reviewed.challenges.map((c) => (c.id === "ch-plastic" ? { ...c, status: "closed" as const } : c)) };
    const endedVm = selectBattle(ended, "ch-plastic", "ko")!;
    expect(endedVm.phase).toBe("ended");
    expect(endedVm.intro.map((line) => line.text)).toEqual(["플라스틱 해파리 퇴각… 이번에는 뽑히지 않았다.", "그래도 경험은 남는다! 기업의 평가로 EXP +130 (SDG 14, 12)"]);
  });

  it("기업이 고르면(수상) HP 0 = 「クエスト達成！」 — 상금과 상품이 둘 다 걸린 최우수상은 보상을 고르라고 해요 (#47)", () => {
    const won = submitAndAward(initial, "ch-plastic", "grand");
    const vm = selectBattle(won, "ch-plastic", "ja")!;
    expect(vm.phase).toBe("won");
    expect(vm.foe).toMatchObject({ hpPercent: 0, defeated: true });
    expect(said(vm.intro).at(-1)).toBe("narrator: 報酬を えらぼう！（マイImpactの カードから）");
    expect(vm.fight).toEqual({ lines: [{ speaker: "narrator", text: "クエスト達成ずみ！ つぎの クエストを さがそう。" }], go: null });
    const id = won.proposals.find((p) => p.mine)!.id;
    const prize = reducer(won, { type: "chooseReward", proposalId: id, reward: "prize" });
    expect(said(selectBattle(prize, "ch-plastic", "ja")!.intro).at(-1)).toBe("narrator: 賞金 ¥100,000を 手に入れた！");
  });

  it("수상하면 그 퀘스트의 SDG 마다 스킬을 얻어요 — 이미 있는 SDG 는 레벨 업 · 상품 보상도 「手に入れた！」", () => {
    const state = submitAndAward(initial, "ch-plastic", "excellence");
    expect(state.skills).toHaveLength(3);
    const vm = selectBattle(state, "ch-plastic", "ja")!;
    expect(said(vm.intro)).toEqual([
      "narrator: プラごみクラゲを やっつけた！ クエスト達成！",
      "narrator: SDG 14のスキルがレベルアップ！（Lv.2）",
      "narrator: SDG 12のスキルがレベルアップ！（Lv.2）",
      "narrator: 報酬アイテム「みなとの干物ギフトセット」を 手に入れた！",
    ]);
    expect(vm.hero.skillsLabel).toBe("スキル 4");
    expect(vm.skills.slice(0, 2).map((s) => [s.sdgId, s.levelLabel, s.recordsLabel])).toEqual([
      [14, "スキルLv.2", "エコ包装デザイン・プラごみ削減アイデア"],
      [12, "スキルLv.2", "エコ包装デザイン・プラごみ削減アイデア"],
    ]);
    const ko = selectBattle(state, "ch-plastic", "ko")!;
    expect(ko.intro.map((line) => line.text)).toEqual(["플라스틱 해파리 격파! 퀘스트 달성!", "SDG 14 스킬 레벨 업! Lv.2", "SDG 12 스킬 레벨 업! Lv.2", "보상 아이템 「미나토 건어물 선물 세트」 획득!"]);
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
