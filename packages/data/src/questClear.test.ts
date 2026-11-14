// #47 퀘스트 달성: 기업이 내 기획서를 고르면(수상) 다음에 학생 화면을 열 때 승리 연출 → 「クエスト達成！」 창 → 보상(상금 또는 상품) 고르기
import { describe, expect, it } from "vitest";
import type { DemoState } from "@sdgs-compass/core/domain";
import { feeItems, summarizeFees } from "@sdgs-compass/core/fees";
import { pendingCelebration, selectQuestClear } from "@sdgs-compass/core/questClear";
import type { ProposalDraft } from "@sdgs-compass/core/proposal";
import { reducer, type Action } from "@sdgs-compass/core/state";
import { prizeNotice, selectPrizePayments, selectWallet } from "@sdgs-compass/core/walletView";
import { rewardChosen, rewardOptionsFor, rewardPending } from "@sdgs-compass/core/wallet";
import { createInitialState } from "./seed";
import { isDemoState, parseState, serializeState } from "./storage";

const TODAY = "2026-10-30";
const AT = "2026-10-30T10:00";
const initial = createInitialState(TODAY);
const run = (state: DemoState, ...actions: Action[]) => actions.reduce(reducer, state);
const draft: ProposalDraft = { teamName: "Mina & Rin", title: "海藻フィルム", summary: "要約です", videoUrl: "", fileName: "plan.pdf", fileSizeBytes: 1000 };
const submitted = run(initial, { type: "submitProposal", challengeId: "ch-plastic", draft, at: AT });
const mineId = submitted.proposals.find((p) => p.mine)!.id;
const reviewed = run(submitted, { type: "reviewProposal", proposalId: mineId, review: { creativity: 4, feasibility: 4, sdgContribution: 5, comment: "" }, at: "2026-10-30T11:00" });
const grand = run(reviewed, { type: "awardProposal", proposalId: mineId, award: "grand" });
const payment = (state: DemoState) => state.prizePayments.find((p) => p.challengeId === "ch-plastic")!;
const mine = (state: DemoState) => state.proposals.find((p) => p.id === mineId)!;
const fees = (state: DemoState) => summarizeFees(feeItems(state)).feeYen;

describe("보상(#47): 상금은 최우수상만, 상품은 어느 상이든 — 둘 다 걸린 최우수상은 하나를 골라요", () => {
  it("받을 수 있는 보상", () => {
    const plastic = initial.challenges.find((c) => c.id === "ch-plastic")!;
    expect(rewardOptionsFor(plastic, "grand")).toEqual(["prize", "item"]);
    expect(rewardOptionsFor(plastic, "excellence")).toEqual(["item"]);
    expect(rewardOptionsFor({ prizeYen: 80_000, rewardItem: undefined }, "grand")).toEqual(["prize"]);
    expect(rewardOptionsFor({ prizeYen: 0, rewardItem: undefined }, "special")).toEqual([]);
  });

  it("최우수상이 정해져도 학생이 고를 때까지 상금은 「受賞チームが選択中」(돈은 아직 오가지 않아요)", () => {
    expect(payment(submitted).status).toBe("promised");
    expect(payment(grand)).toMatchObject({ status: "choosing", proposalId: mineId, paidOn: null });
    expect(grand.wallet.entries).toEqual(submitted.wallet.entries);
    expect(rewardChosen(grand, mine(grand))).toBeNull();
    expect(rewardPending(grand, mine(grand))).toBe(true);
    const row = selectPrizePayments(grand, "ja").rows.find((r) => r.challengeId === "ch-plastic")!;
    expect(row.statusLabel).toBe("受賞チームが選択中");
    expect(prizeNotice(grand, "ch-plastic", "ja")?.text).toContain("賞金 ¥100,000 か商品かを選んでいます");
  });

  it("상금을 고르면 지급 · 받은 상금에 한 줄 · 수수료가 생겨요", () => {
    const prize = run(grand, { type: "chooseReward", proposalId: mineId, reward: "prize" });
    expect(mine(prize)).toMatchObject({ rewardChoice: "prize", celebrated: true });
    expect(payment(prize)).toMatchObject({ status: "paid", proposalId: mineId, paidOn: TODAY });
    expect(prize.wallet.entries).toHaveLength(grand.wallet.entries.length + 1);
    expect(selectWallet(prize, "ja").totalLabel).not.toBe(selectWallet(grand, "ja").totalLabel);
    expect(fees(prize)).toBeGreaterThan(fees(grand));
    expect(rewardPending(prize, mine(prize))).toBe(false);
  });

  it("상품을 고르면 상금은 지급하지 않아요(「商品を選択（賞金なし）」 · 수수료도 없어요)", () => {
    const item = run(grand, { type: "chooseReward", proposalId: mineId, reward: "item" });
    expect(mine(item).rewardChoice).toBe("item");
    expect(payment(item)).toMatchObject({ status: "itemChosen", paidOn: null });
    expect(item.wallet.entries).toEqual(grand.wallet.entries);
    expect(fees(item)).toBe(fees(grand));
    const row = selectPrizePayments(item, "ko").rows.find((r) => r.challengeId === "ch-plastic")!;
    expect([row.statusLabel, row.feeLabel]).toEqual(["상품 선택(상금 없음)", "—"]);
    expect(prizeNotice(item, "ch-plastic", "ja")?.text).toBe("最優秀賞の「Mina & Rin」は商品を選びました。賞金 ¥100,000 の支払いと手数料はありません。商品をお届けください。");
  });

  it("한 번 고르면 바꿀 수 없고, 받을 수 없는 보상은 고를 수 없어요", () => {
    const item = run(grand, { type: "chooseReward", proposalId: mineId, reward: "item" });
    expect(run(item, { type: "chooseReward", proposalId: mineId, reward: "prize" })).toBe(item);
    const excellence = run(reviewed, { type: "awardProposal", proposalId: mineId, award: "excellence" });
    expect(run(excellence, { type: "chooseReward", proposalId: mineId, reward: "prize" })).toBe(excellence);
    expect(run(submitted, { type: "chooseReward", proposalId: mineId, reward: "item" })).toBe(submitted);
  });

  it("우수상(상품만): 고를 것 없이 상품, 상금은 표창 전 그대로 · 최우수상을 우수상으로 고치면 상금도 표창 전으로", () => {
    const excellence = run(reviewed, { type: "awardProposal", proposalId: mineId, award: "excellence" });
    expect(rewardChosen(excellence, mine(excellence))).toBe("item");
    expect(rewardPending(excellence, mine(excellence))).toBe(false);
    expect(payment(excellence).status).toBe("promised");
    const changed = run(grand, { type: "awardProposal", proposalId: mineId, award: "excellence" });
    expect(payment(changed)).toMatchObject({ status: "promised", proposalId: null });
  });

  it("저장했다 불러와도 고르는 중 · 상품 선택 상태가 그대로예요", () => {
    for (const state of [grand, run(grand, { type: "chooseReward", proposalId: mineId, reward: "item" })]) {
      expect(isDemoState(JSON.parse(serializeState(state)))).toBe(true);
      expect(parseState(serializeState(state))?.prizePayments).toEqual(state.prizePayments);
    }
  });
});

describe("퀘스트 달성 연출(#47)", () => {
  it("수상한 내 기획서가 있으면 다음에 학생 화면을 열 때 저절로 떠요 — 제출만 했거나 다른 팀의 수상은 아니에요", () => {
    expect(pendingCelebration(initial)).toBeNull();
    expect(pendingCelebration(reviewed)).toBeNull();
    expect(pendingCelebration(run(submitted, { type: "awardProposal", proposalId: "pp-1", award: "grand" }))).toBeNull();
    expect(pendingCelebration(grand)?.id).toBe(mineId);
    expect(selectQuestClear(initial, "ja")).toBeNull();
  });

  it("승리 연출: 기업이 골랐다 → 이번 수상의 SDG 스킬(14 · 12 레벨 업) → 가진 스킬(11 · 10) → 몬스터를 쓰러뜨려요", () => {
    const vm = selectQuestClear(grand, "ja")!;
    expect(vm).toMatchObject({ proposalId: mineId, challengeId: "ch-plastic", fresh: true, title: "クエスト達成！", awardLabel: "最優秀賞", stars: 3 });
    // 연출의 무대는 아직 서 있는 몬스터(HP 30%) — 마지막에 쓰러져요
    expect(vm.battle.foe).toMatchObject({ defeated: false, hpPercent: 30 });
    expect(vm.steps.map((step) => step.line.text)).toEqual([
      "みなと海洋フーズ株式会社が 勇者Minaの 企画書を えらんだ！",
      "パワーアップ！ SDG 14スキル（Lv.2）！",
      "パワーアップ！ SDG 12スキル（Lv.2）！",
      "つづけて SDG 11スキル（Lv.1）！",
      "つづけて SDG 10スキル（Lv.1）！",
    ]);
    expect(vm.steps.map((step) => step.skill && [step.skill.sdgId, step.skill.effect, step.skill.fresh])).toEqual([null, [14, "wave", true], [12, "cycle", true], [11, "town", false], [10, "bridge", false]]);
    expect(vm.finish.text).toBe("プラごみクラゲを やっつけた！");
    expect(vm.learnedSdgIds).toEqual([14, 12]);
    expect(vm.learnedLines).toEqual(["SDG 14のスキルがレベルアップ！（Lv.2）", "SDG 12のスキルがレベルアップ！（Lv.2）"]);
    expect(vm.expLabel).toBe("企業の評価で EXP +130（SDG 14・12）");
    expect(vm.statusLevelUps).toEqual(["14 海の豊かさを守ろう Lv.3にアップ！", "12 つくる責任 つかう責任 Lv.3にアップ！"]);
  });

  it("처음 받는 SDG 의 스킬은 「あたらしい スキル！」", () => {
    const solarSubmitted = run(initial, { type: "submitProposal", challengeId: "ch-solar", draft, at: AT });
    const id = solarSubmitted.proposals.find((p) => p.mine && p.challengeId === "ch-solar")!.id;
    const vm = selectQuestClear(run(solarSubmitted, { type: "awardProposal", proposalId: id, award: "special" }), "ko")!;
    expect(vm.steps[1].line.text).toBe("새 스킬! SDG 7 스킬(Lv.1)!");
    expect(vm.learnedLines).toEqual(["SDG 7, 13 스킬을 배웠다!"]);
    // 평가 없이 표창만 했으면 EXP 줄이 없어요
    expect(vm.expLabel).toBeNull();
  });

  it("보상 고르기: 상금 · 상품 두 장 → 고른 뒤에는 받은 줄", () => {
    const vm = selectQuestClear(grand, "ja")!;
    expect(vm.reward).toMatchObject({ choose: true, chosen: null, chosenLabel: null, prompt: "報酬を ひとつ えらんでください", confirmLabel: "この報酬に決める" });
    expect(vm.reward!.options.map((o) => [o.kind, o.icon, o.label])).toEqual([
      ["prize", "💴", "賞金 ¥100,000"],
      ["item", "🎁", "みなとの干物ギフトセット"],
    ]);
    expect(vm.reward!.note).toBe("どちらか ひとつです。あとから かえられません。");
    const prize = run(grand, { type: "chooseReward", proposalId: mineId, reward: "prize" });
    // 고르면 「봤어요」도 함께 — 저절로 다시 뜨지 않고, 카드에서 열면 창만(fresh = false)
    expect(selectQuestClear(prize, "ja")).toBeNull();
    const again = selectQuestClear(prize, "ja", mineId)!;
    expect(again.fresh).toBe(false);
    expect(again.reward).toMatchObject({ chosen: "prize", chosenLabel: "賞金 ¥100,000を 受け取りました（企業から 直接 振り込まれます）" });
    const item = selectQuestClear(run(grand, { type: "chooseReward", proposalId: mineId, reward: "item" }), "ko", mineId)!;
    expect(item.reward?.chosenLabel).toBe("「미나토 건어물 선물 세트」 선택 완료(미나토 해양푸드(주)에서 보내요)");
  });

  it("상품만 걸린 상(우수상)은 고를 것 없이 받은 줄 · 보상이 없는 상은 보상 칸이 없어요", () => {
    const excellence = run(reviewed, { type: "awardProposal", proposalId: mineId, award: "excellence" });
    expect(selectQuestClear(excellence, "ja")!.reward).toMatchObject({ choose: false, chosen: "item", chosenLabel: "「みなとの干物ギフトセット」を 手に入れた！（みなと海洋フーズ株式会社から 届きます）" });
    const solarSubmitted = run(initial, { type: "submitProposal", challengeId: "ch-solar", draft, at: AT });
    const id = solarSubmitted.proposals.find((p) => p.mine && p.challengeId === "ch-solar")!.id;
    const solar = run(solarSubmitted, { type: "awardProposal", proposalId: id, award: "special" });
    const solarChallenge = solar.challenges.find((c) => c.id === "ch-solar")!;
    if (!solarChallenge.rewardItem) expect(selectQuestClear(solar, "ja")!.reward).toBeNull();
  });

  it("「봤어요」(celebrateQuest): 다시 저절로 뜨지 않아요 — 고르지 않은 보상은 남아요", () => {
    const seen = run(grand, { type: "celebrateQuest", proposalId: mineId });
    expect(mine(seen).celebrated).toBe(true);
    expect(pendingCelebration(seen)).toBeNull();
    expect(rewardPending(seen, mine(seen))).toBe(true);
    expect(selectQuestClear(seen, "ja", mineId)?.fresh).toBe(false);
    // 수상하지 않은 기획서 · 남의 기획서는 바뀌지 않아요
    expect(run(reviewed, { type: "celebrateQuest", proposalId: mineId })).toBe(reviewed);
    expect(run(seen, { type: "celebrateQuest", proposalId: mineId })).toBe(seen);
  });
});
