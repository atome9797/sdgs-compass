// #25 リワード残高(데모): 샘플 데이터 · 본인 확인 · 출금 신청 · 수상 시 상금 송금 · 기업의 예치 현황 · 날짜 옮기기 · 저장/불러오기
import { describe, expect, it } from "vitest";
import type { ChallengeDraft } from "@sdgs-compass/core/challenge";
import type { DemoState } from "@sdgs-compass/core/domain";
import type { ProposalDraft } from "@sdgs-compass/core/proposal";
import { reducer, rebaseState, type Action } from "@sdgs-compass/core/state";
import { walletBalance } from "@sdgs-compass/core/wallet";
import { checkWithdrawal, prizeNotice, selectPrizeDeposits, selectWallet } from "@sdgs-compass/core/walletView";
import { createInitialState, DEMO_STUDENT_ID } from "./seed";
import { isDemoState, loadState, memoryStorage, parseState, serializeState, STORAGE_KEYS } from "./storage";

const TODAY = "2026-11-01";
const AT = "2026-11-01T10:00";
const initial = createInitialState(TODAY);
const run = (state: DemoState, ...actions: Action[]) => actions.reduce(reducer, state);
const balance = (state: DemoState) => walletBalance(state.wallet.entries);
const verified = run(initial, { type: "verifyKyc", at: AT });

describe("샘플 데이터 (모두 가상)", () => {
  it("Mina: 수상 실적(h-5b 優秀賞)에 이어진 기업 상금 ¥30,000 + 운영 환원(샘플) ¥1,500, 출금 0건, 본인 확인 전", () => {
    expect(initial.wallet.kyc).toBe("none");
    expect(initial.wallet.entries.map((e) => [e.kind, e.amountYen])).toEqual([["prize", 30_000], ["return", 1_500]]);
    expect(initial.wallet.entries.every((e) => e.studentId === DEMO_STUDENT_ID)).toBe(true);
    const prize = initial.wallet.entries[0].source;
    expect(prize).toMatchObject({ kind: "prize", activityId: "h-5b", companyId: "co-minato", award: "excellence" });
    expect(initial.history.find((a) => a.id === "h-5b")).toMatchObject({ kind: "award", award: "excellence" });
    expect(balance(initial)).toBe(31_500);
  });

  it("상금이 걸린 과제는 모두 예치 기록이 있어요: 진행 중은 예치 중, 끝난 과제는 송금(ch-old1)·반환(ch-old2)", () => {
    const withPrize = initial.challenges.filter((c) => c.prizeYen > 0);
    expect(initial.prizeDeposits.map((d) => d.challengeId).sort()).toEqual(withPrize.map((c) => c.id).sort());
    for (const d of initial.prizeDeposits) {
      const c = withPrize.find((x) => x.id === d.challengeId)!;
      expect(d.amountYen).toBe(c.prizeYen);
      expect(d.companyId).toBe(c.companyId);
      expect(d.status).toBe(c.id === "ch-old1" ? "paid" : c.id === "ch-old2" ? "refunded" : "deposited");
      expect(d.settledOn === null).toBe(d.status === "deposited");
    }
  });
});

describe("학생: 본인 확인 → 출금 신청", () => {
  it("본인 확인 전에는 출금 신청이 아무것도 바꾸지 않아요", () => {
    expect(run(initial, { type: "requestWithdrawal", amountYen: 1_000, at: AT })).toBe(initial);
    expect(checkWithdrawal(initial, 1_000, "ja")).toBe("先に本人確認を完了してください");
  });

  it("본인 확인(데모 버튼)은 날짜를 남기고, 두 번 눌러도 그대로예요", () => {
    expect(verified.wallet).toMatchObject({ kyc: "verified", kycVerifiedOn: TODAY });
    expect(run(verified, { type: "verifyKyc", at: "2026-11-05T09:00" })).toBe(verified);
    expect(selectWallet(verified, "ja").kycLabel).toBe("完了（2026年11月1日）");
  });

  it("출금 신청: 잔액에서 바로 빠지고 「申請中（デモ）」로 남아요", () => {
    const next = run(verified, { type: "requestWithdrawal", amountYen: 10_000, at: AT });
    expect(balance(next)).toBe(21_500);
    const added = next.wallet.entries[next.wallet.entries.length - 1];
    expect(added).toMatchObject({ kind: "withdrawal", amountYen: 10_000, date: TODAY, status: "requested", source: null, studentId: DEMO_STUDENT_ID });
    expect(next.seq).toBe(verified.seq + 1);
    const vm = selectWallet(next, "ja");
    expect(vm.entries[0]).toMatchObject({ kindLabel: "出金", title: "銀行口座へ", amountLabel: "−¥10,000", statusLabel: "申請中（デモ）", credit: false });
    expect(vm.balanceLabel).toBe("¥21,500");
  });

  it("잔액을 넘거나 0엔·소수·100만 엔 초과면 바뀌지 않아요 (오류 문구는 ja·ko)", () => {
    for (const amountYen of [31_501, 0, -1, 2.5, 1_000_001]) expect(run(verified, { type: "requestWithdrawal", amountYen, at: AT })).toBe(verified);
    expect(checkWithdrawal(verified, 31_501, "ja")).toBe("残高（¥31,500）を超えています");
    expect(checkWithdrawal(verified, 31_501, "ko")).toBe("잔액(31,500엔)을 넘었어요");
    expect(checkWithdrawal(verified, null, "ja")).toBe("1円以上の金額を数字で入力してください");
    expect(checkWithdrawal(verified, 1_000_001, "ja")).toBe("1回に出金できるのは¥1,000,000までです");
    expect(checkWithdrawal(verified, 31_500, "ja")).toBeNull();
  });

  it("잔액이 100만 엔을 넘어도 1회 출금은 100만 엔까지", () => {
    const rich: DemoState = { ...verified, wallet: { ...verified.wallet, entries: [...verified.wallet.entries, { ...verified.wallet.entries[0], id: "w-big", amountYen: 2_000_000 }] } };
    expect(run(rich, { type: "requestWithdrawal", amountYen: 1_000_001, at: AT })).toBe(rich);
    const once = run(rich, { type: "requestWithdrawal", amountYen: 1_000_000, at: AT });
    expect(balance(once)).toBe(2_031_500 - 1_000_000);
  });
});

describe("학생 화면 모델", () => {
  it("잔액·합계·내역(최신순)·고지 ①~④", () => {
    const vm = selectWallet(initial, "ja");
    expect(vm.balanceLabel).toBe("¥31,500");
    expect(vm.totalsLabel).toBe("受け取り ¥31,500（賞金 ¥30,000・還元 ¥1,500）／出金 ¥0");
    expect(vm.entries.map((e) => e.id)).toEqual(["w-2", "w-1"]);
    expect(vm.entries[1]).toMatchObject({ kindLabel: "企業の賞金", title: "みなと海洋フーズ株式会社「プラスチックごみ削減ハッカソン」優秀賞", amountLabel: "+¥30,000", statusLabel: null });
    expect(vm.entries[0]).toMatchObject({ kindLabel: "運営からの還元", title: "運営からの還元（サンプル）", amountLabel: "+¥1,500" });
    expect(vm.notices).toEqual({
      registration: "リワード残高は、当社が第二種資金移動業の登録を受けた後に提供する予定の機能です（デモ）。",
      kyc: "出金には本人確認が必要です。1回100万円まで。",
      tax: "賞金・還元は所得として課税される場合があります（確定申告が必要なことがあります）。留学生の方は、受け取る前に在留資格（資格外活動許可）を確認してください。",
      level: "インパクトレベルは換金できません。リワード残高とは別のものです。",
    });
    expect(vm.kycVerified).toBe(false);
    expect(vm.maxLabel).toBe("¥1,000,000");
  });

  it("한국어", () => {
    const vm = selectWallet(initial, "ko");
    expect(vm.balanceLabel).toBe("31,500엔");
    expect(vm.entries[1].kindLabel).toBe("기업 상금");
    expect(vm.entries[0].title).toBe("운영 환원(샘플)");
    expect(vm.notices.level).toBe("임팩트 레벨은 돈으로 바꿀 수 없어요. 보상 잔액과는 별개예요.");
  });
});

describe("기업: 상금 예치 → 최우수상이면 송금", () => {
  it("대시보드: 우리 회사(みなと) 예치 중 ¥220,000 · 송금 ¥30,000 · 반환 ¥30,000", () => {
    const vm = selectPrizeDeposits(initial, "ja");
    expect([vm.depositedLabel, vm.paidLabel, vm.refundedLabel]).toEqual(["¥220,000", "¥30,000", "¥30,000"]);
    expect(vm.rows.map((r) => r.status)).toEqual(["deposited", "deposited", "deposited", "paid", "refunded"]);
    expect(vm.rows.find((r) => r.challengeId === "ch-old2")?.statusLabel).toBe("返金済み（企業へ）");
  });

  it("다른 학생의 기획서(pb-1)에 최우수상 → 예치가 송금으로 바뀌고, 내 잔액은 그대로", () => {
    expect(prizeNotice(initial, "ch-bottle", "ja")?.text).toBe("最優秀賞を決めると、預け入れた賞金 ¥50,000 を受賞者のリワード残高へ送金します（デモ）");
    const next = run(initial, { type: "awardProposal", proposalId: "pb-1", award: "grand" });
    expect(next.prizeDeposits.find((d) => d.challengeId === "ch-bottle")).toMatchObject({ status: "paid", proposalId: "pb-1", settledOn: TODAY });
    expect(next.wallet).toBe(initial.wallet);
    expect(prizeNotice(next, "ch-bottle", "ja")).toEqual({ status: "paid", text: "賞金 ¥50,000 を「ボトルフレンズ」のリワード残高へ送金しました（デモ）" });
    expect(prizeNotice(next, "ch-bottle", "ko")?.text).toBe("상금 50,000엔을 「ボトルフレンズ」의 보상 잔액으로 보냈어요(데모)");
    const dash = selectPrizeDeposits(next, "ja");
    expect([dash.depositedLabel, dash.paidLabel]).toEqual(["¥170,000", "¥80,000"]);
  });

  it("우수상·특별상은 송금하지 않고, 최우수상을 또 정해도 두 번 보내지 않아요 (한 번 보낸 돈은 되돌리지 않아요)", () => {
    const excellence = run(initial, { type: "awardProposal", proposalId: "pb-2", award: "excellence" });
    expect(excellence.prizeDeposits).toBe(initial.prizeDeposits);
    const first = run(initial, { type: "awardProposal", proposalId: "pb-1", award: "grand" });
    const second = run(first, { type: "awardProposal", proposalId: "pb-2", award: "grand" });
    expect(second.prizeDeposits).toBe(first.prizeDeposits);
    const changed = run(first, { type: "awardProposal", proposalId: "pb-1", award: "special" });
    expect(changed.prizeDeposits.find((d) => d.challengeId === "ch-bottle")?.status).toBe("paid");
  });

  it("샘플의 끝난 과제: 받은 기획서가 목록에 없으면 팀 이름 없이, 반환은 반환 안내", () => {
    expect(prizeNotice(initial, "ch-old1", "ja")?.text).toBe("賞金 ¥30,000 を受賞者のリワード残高へ送金しました（デモ）");
    expect(prizeNotice(initial, "ch-old2", "ja")?.text).toBe("賞金 ¥30,000 は企業へ返金しました");
    expect(prizeNotice(initial, null, "ja")).toBeNull();
    expect(prizeNotice(initial, "없음", "ja")).toBeNull();
  });
});

describe("처음부터 끝까지: 기업이 상금을 걸고 출제 → 학생 제출 → 최우수상 → 내 잔액 → 출금 신청", () => {
  const challengeDraft: ChallengeDraft = { title: "朝市のごみを減らすアイデア", summary: "朝市で出る容器ごみを減らす企画を募集します。", sdgIds: [12, 14], prizeYen: 40_000, days: 30, participation: "both", internship: false };
  const proposalDraft: ProposalDraft = { teamName: "Mina", title: "朝市マイ容器デー", summary: "マイ容器を持参した人に朝市の割引券を渡す企画です。", videoUrl: "", fileName: "plan.pdf", fileSizeBytes: 1_200_000 };

  it("예치 → 송금 → 잔액 → 출금", () => {
    const created = run(initial, { type: "createChallenge", draft: challengeDraft });
    const challenge = created.challenges[0];
    expect(created.prizeDeposits[created.prizeDeposits.length - 1]).toEqual({ challengeId: challenge.id, companyId: "co-minato", amountYen: 40_000, status: "deposited", depositedOn: TODAY, settledOn: null, proposalId: null });
    expect(selectPrizeDeposits(created, "ja").depositedLabel).toBe("¥260,000");

    const submitted = run(created, { type: "submitProposal", challengeId: challenge.id, draft: proposalDraft, at: AT });
    const mine = submitted.proposals.find((p) => p.challengeId === challenge.id && p.mine)!;
    const awarded = run(submitted, { type: "awardProposal", proposalId: mine.id, award: "grand" });
    expect(balance(awarded)).toBe(31_500 + 40_000);
    const entry = awarded.wallet.entries[awarded.wallet.entries.length - 1];
    expect(entry).toMatchObject({ kind: "prize", amountYen: 40_000, date: TODAY, status: "completed", source: { kind: "prize", challengeId: challenge.id, activityId: `act-${mine.id}-award`, companyId: "co-minato", award: "grand" } });
    expect(selectWallet(awarded, "ja").entries[0].title).toBe("みなと海洋フーズ株式会社「朝市のごみを減らすアイデア」最優秀賞");

    const out = run(awarded, { type: "verifyKyc", at: AT }, { type: "requestWithdrawal", amountYen: 71_500, at: AT });
    expect(balance(out)).toBe(0);
    expect(run(out, { type: "requestWithdrawal", amountYen: 1, at: AT })).toBe(out);
  });

  it("상금 0엔 과제는 예치하지 않아요", () => {
    const created = run(initial, { type: "createChallenge", draft: { ...challengeDraft, prizeYen: 0 } });
    expect(created.prizeDeposits).toBe(initial.prizeDeposits);
  });
});

describe("날짜 옮기기 · 저장 · 초기화", () => {
  it("다른 날 열면 원장·본인 확인·예치 날짜도 같은 날수만큼 옮겨요", () => {
    const later = rebaseState(verified, "2026-11-11");
    expect(later.wallet.kycVerifiedOn).toBe("2026-11-11");
    expect(later.wallet.entries.map((e) => e.date)).toEqual(["2026-10-15", "2026-11-01"]);
    const old1 = later.prizeDeposits.find((d) => d.challengeId === "ch-old1")!;
    expect(old1.settledOn).toBe("2026-09-14");
    expect(later.prizeDeposits.find((d) => d.challengeId === "ch-plastic")?.depositedOn).toBe(later.challenges.find((c) => c.id === "ch-plastic")?.opensOn);
  });

  it("저장했다 불러와도 그대로이고, 원장 모양이 틀리면 버려요", () => {
    const next = run(verified, { type: "requestWithdrawal", amountYen: 500, at: AT });
    expect(parseState(serializeState(next))).toEqual(next);
    const bad = (patch: (s: DemoState) => unknown) => parseState(JSON.stringify(patch(next)));
    expect(bad((s) => ({ ...s, wallet: { ...s.wallet, kyc: "maybe" } }))).toBeNull();
    expect(bad((s) => ({ ...s, wallet: { ...s.wallet, entries: [{ ...s.wallet.entries[0], amountYen: -1 }] } }))).toBeNull();
    expect(bad((s) => ({ ...s, wallet: { ...s.wallet, entries: [{ ...s.wallet.entries[0], kind: "gift" }] } }))).toBeNull();
    expect(bad((s) => ({ ...s, wallet: { ...s.wallet, entries: [{ ...s.wallet.entries[2], source: { kind: "return", round: "x" } }] } }))).toBeNull();
    expect(bad((s) => ({ ...s, prizeDeposits: [{ ...s.prizeDeposits[0], status: "lost" }] }))).toBeNull();
    expect(bad((s) => ({ ...s, prizeDeposits: "none" }))).toBeNull();
  });

  it("リワード残高가 생기기 전에 저장된 상태도 버리지 않고 샘플 잔액·예치를 채워서 이어 써요 (데모에서 낸 과제에는 예치 없음)", async () => {
    const used = run(initial, { type: "toggleBookmark", challengeId: "ch-solar" }, { type: "createChallenge", draft: { title: "新しい課題", summary: "説明", sdgIds: [4], prizeYen: 10_000, days: 14, participation: "both", internship: false } });
    const { wallet: _w, prizeDeposits: _d, ...legacy } = used;
    void _w;
    void _d;
    expect(isDemoState(legacy)).toBe(false);
    const kv = memoryStorage({ [STORAGE_KEYS.state]: JSON.stringify(legacy) });
    const loaded = await loadState(kv, "2026-11-03");
    expect(loaded.bookmarks).toContain("ch-solar");
    expect(loaded.wallet).toEqual(createInitialState("2026-11-03").wallet);
    expect(loaded.prizeDeposits).toEqual(createInitialState("2026-11-03").prizeDeposits);
    expect(isDemoState(loaded)).toBe(true);
  });

  it("데모 초기화(처음 상태)로 돌아가면 잔액·본인 확인도 처음으로", () => {
    const changed = run(verified, { type: "requestWithdrawal", amountYen: 500, at: AT });
    const reset = run(changed, { type: "reset", state: createInitialState(TODAY) });
    expect(reset.wallet).toEqual(initial.wallet);
    expect(reset.prizeDeposits).toEqual(initial.prizeDeposits);
  });
});
