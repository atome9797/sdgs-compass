// 상금 (2026-11-08 직접 지급 모델): 샘플 데이터 · 학생의 「受け取った賞金」 · 수상 시 상금 지급 기록 · 기업의 지급 현황과 수수료 · 날짜 옮기기 · 저장/불러오기 · 이전 모양에서 이어 쓰기
import { describe, expect, it } from "vitest";
import type { ChallengeDraft } from "@sdgs-compass/core/challenge";
import type { DemoState } from "@sdgs-compass/core/domain";
import type { ProposalDraft } from "@sdgs-compass/core/proposal";
import { reducer, rebaseState, type Action } from "@sdgs-compass/core/state";
import { walletTotals } from "@sdgs-compass/core/wallet";
import { prizeNotice, selectPrizePayments, selectWallet } from "@sdgs-compass/core/walletView";
import { createInitialState, DEMO_STUDENT_ID } from "./seed";
import { isDemoState, loadState, memoryStorage, parseState, serializeState, STORAGE_KEYS } from "./storage";

const TODAY = "2026-11-01";
const AT = "2026-11-01T10:00";
const initial = createInitialState(TODAY);
const run = (state: DemoState, ...actions: Action[]) => actions.reduce(reducer, state);
const total = (state: DemoState) => walletTotals(state.wallet.entries).totalYen;

describe("샘플 데이터 (모두 가상)", () => {
  it("Mina: 수상 실적(h-5b 優秀賞)에 이어진 기업 상금 ¥30,000 + 운영사 특별상(샘플) ¥1,500 — 잔액·출금은 없어요", () => {
    expect(Object.keys(initial.wallet)).toEqual(["entries"]);
    expect(initial.wallet.entries.map((e) => [e.kind, e.amountYen])).toEqual([["prize", 30_000], ["return", 1_500]]);
    expect(initial.wallet.entries.every((e) => e.studentId === DEMO_STUDENT_ID)).toBe(true);
    const prize = initial.wallet.entries[0].source;
    expect(prize).toMatchObject({ kind: "prize", activityId: "h-5b", companyId: "co-minato", award: "excellence" });
    expect(initial.history.find((a) => a.id === "h-5b")).toMatchObject({ kind: "award", award: "excellence" });
    expect(total(initial)).toBe(31_500);
  });

  it("상금이 걸린 과제는 모두 지급 기록이 있어요: 진행 중은 표창 전, 끝난 과제는 지급(ch-old1)·최우수상 없음(ch-old2)", () => {
    const withPrize = initial.challenges.filter((c) => c.prizeYen > 0);
    expect(initial.prizePayments.map((p) => p.challengeId).sort()).toEqual(withPrize.map((c) => c.id).sort());
    for (const p of initial.prizePayments) {
      const c = withPrize.find((x) => x.id === p.challengeId)!;
      expect(p.amountYen).toBe(c.prizeYen);
      expect(p.companyId).toBe(c.companyId);
      expect(p.promisedOn).toBe(c.opensOn);
      expect(p.status).toBe(c.id === "ch-old1" ? "paid" : c.id === "ch-old2" ? "noWinner" : "promised");
      expect(p.paidOn === null).toBe(p.status !== "paid");
    }
  });

  it("채택(인턴)은 무료라서 지난 채택 기록에 돈이 없어요", () => {
    for (const m of initial.matches) expect(Object.keys(m).sort()).toEqual(["challengeId", "companyId", "id", "matchedOn", "proposalId"]);
  });
});

describe("학생 화면 「受け取った賞金」", () => {
  it("합계·내역(최신순)·고지 ①~③", () => {
    const vm = selectWallet(initial, "ja");
    expect(vm.totalLabel).toBe("¥31,500");
    expect(vm.totalsLabel).toBe("賞金 ¥30,000・特別賞 ¥1,500");
    expect(vm.entries.map((e) => e.id)).toEqual(["w-2", "w-1"]);
    expect(vm.entries[1]).toMatchObject({ kindLabel: "企業の賞金", title: "みなと海洋フーズ株式会社「プラスチックごみ削減ハッカソン」優秀賞", amountLabel: "+¥30,000", companyId: "co-minato" });
    expect(vm.entries[0]).toMatchObject({ kindLabel: "運営からの特別賞", title: "運営からの特別賞（サンプル）", amountLabel: "+¥1,500", companyId: null });
    expect(vm.notices).toEqual({
      direct: "賞金は企業から受賞チームへ直接、満額で支払われます。当社はお金を預かりません（当社の手数料は企業が別に支払います）。",
      tax: "賞金・特別賞は所得として課税される場合があります（確定申告が必要なことがあります）。留学生の方は、受け取る前に在留資格（資格外活動許可）を確認してください。",
      level: "インパクトレベルは換金できません。賞金の記録とは別のものです。",
    });
  });

  it("한국어", () => {
    const vm = selectWallet(initial, "ko");
    expect(vm.totalLabel).toBe("31,500엔");
    expect(vm.entries[1].kindLabel).toBe("기업 상금");
    expect(vm.entries[0].title).toBe("운영사 특별상(샘플)");
    expect(vm.notices.level).toBe("임팩트 레벨은 돈으로 바꿀 수 없어요. 상금 기록과는 별개예요.");
  });
});

describe("기업: 상금을 걸고 → 최우수상 팀에 직접 지급 (수수료 10%는 따로)", () => {
  it("대시보드: 우리 회사(みなと) 표창 전 ¥220,000 · 지급 ¥30,000, 행마다 수수료", () => {
    const vm = selectPrizePayments(initial, "ja");
    expect([vm.promisedLabel, vm.paidLabel]).toEqual(["¥220,000", "¥30,000"]);
    expect(vm.rows.map((r) => r.status)).toEqual(["promised", "promised", "promised", "paid", "noWinner"]);
    expect(vm.rows.find((r) => r.challengeId === "ch-old1")).toMatchObject({ statusLabel: "支払い済み", feeLabel: "¥9,000" });
    expect(vm.rows.find((r) => r.challengeId === "ch-old2")).toMatchObject({ statusLabel: "最優秀賞なし", feeLabel: "—" });
  });

  it("다른 학생의 기획서(pb-1)에 최우수상 → 지급으로 기록되고, 내 기록은 그대로", () => {
    expect(prizeNotice(initial, "ch-bottle", "ja")?.text).toBe(
      "最優秀賞を決めたら、賞金 ¥50,000 を受賞チームへ直接お支払いください（満額が学生に届きます）。手数料 ¥9,000 は当社から別にご請求します。",
    );
    const next = run(initial, { type: "awardProposal", proposalId: "pb-1", award: "grand" });
    expect(next.prizePayments.find((p) => p.challengeId === "ch-bottle")).toMatchObject({ status: "paid", proposalId: "pb-1", paidOn: TODAY });
    expect(next.wallet).toBe(initial.wallet);
    expect(prizeNotice(next, "ch-bottle", "ja")).toEqual({ status: "paid", text: "賞金 ¥50,000 を「ボトルフレンズ」へ支払い済みとして記録しました（デモ）。手数料 ¥9,000" });
    expect(prizeNotice(next, "ch-bottle", "ko")?.text).toBe("상금 50,000엔을 「ボトルフレンズ」에 지급한 것으로 기록했어요(데모). 수수료 9,000엔");
    const dash = selectPrizePayments(next, "ja");
    expect([dash.promisedLabel, dash.paidLabel]).toEqual(["¥170,000", "¥80,000"]);
  });

  it("우수상·특별상은 지급하지 않고, 최우수상을 또 정해도 두 번 기록하지 않아요", () => {
    const excellence = run(initial, { type: "awardProposal", proposalId: "pb-2", award: "excellence" });
    expect(excellence.prizePayments).toBe(initial.prizePayments);
    const first = run(initial, { type: "awardProposal", proposalId: "pb-1", award: "grand" });
    const second = run(first, { type: "awardProposal", proposalId: "pb-2", award: "grand" });
    expect(second.prizePayments).toBe(first.prizePayments);
    const changed = run(first, { type: "awardProposal", proposalId: "pb-1", award: "special" });
    expect(changed.prizePayments.find((p) => p.challengeId === "ch-bottle")?.status).toBe("paid");
  });

  it("샘플의 끝난 과제: 받은 기획서가 목록에 없으면 팀 이름 없이, 최우수상 없음은 그 안내", () => {
    expect(prizeNotice(initial, "ch-old1", "ja")?.text).toBe("賞金 ¥30,000 は受賞チームへ支払い済みです。手数料 ¥9,000");
    expect(prizeNotice(initial, "ch-old2", "ja")?.text).toBe("最優秀賞なしで終わったため、賞金 ¥30,000 の支払いと手数料はありません");
    expect(prizeNotice(initial, null, "ja")).toBeNull();
    expect(prizeNotice(initial, "없음", "ja")).toBeNull();
  });
});

describe("처음부터 끝까지: 기업이 상금을 걸고 출제 → 학생 제출 → 최우수상 → 내 기록", () => {
  const challengeDraft: ChallengeDraft = { title: "朝市のごみを減らすアイデア", summary: "朝市で出る容器ごみを減らす企画を募集します。", sdgIds: [12, 14], prizeYen: 140_000, days: 30, participation: "both", internship: false };
  const proposalDraft: ProposalDraft = { teamName: "Mina", title: "朝市マイ容器デー", summary: "マイ容器を持参した人に朝市の割引券を渡す企画です。", videoUrl: "", fileName: "plan.pdf", fileSizeBytes: 1_200_000 };

  it("상금 걸기 → 지급 기록 → 받은 기록 (수수료는 상금의 10%)", () => {
    const created = run(initial, { type: "createChallenge", draft: challengeDraft });
    const challenge = created.challenges[0];
    expect(created.prizePayments[created.prizePayments.length - 1]).toEqual({ challengeId: challenge.id, companyId: "co-minato", amountYen: 140_000, status: "promised", promisedOn: TODAY, paidOn: null, proposalId: null });
    expect(selectPrizePayments(created, "ja").promisedLabel).toBe("¥360,000");

    const submitted = run(created, { type: "submitProposal", challengeId: challenge.id, draft: proposalDraft, at: AT });
    const mine = submitted.proposals.find((p) => p.challengeId === challenge.id && p.mine)!;
    const awarded = run(submitted, { type: "awardProposal", proposalId: mine.id, award: "grand" });
    expect(total(awarded)).toBe(31_500 + 140_000);
    const entry = awarded.wallet.entries[awarded.wallet.entries.length - 1];
    expect(entry).toMatchObject({ kind: "prize", amountYen: 140_000, date: TODAY, source: { kind: "prize", challengeId: challenge.id, activityId: `act-${mine.id}-award`, companyId: "co-minato", award: "grand" } });
    expect(selectWallet(awarded, "ja").entries[0].title).toBe("みなと海洋フーズ株式会社「朝市のごみを減らすアイデア」最優秀賞");
    expect(prizeNotice(awarded, challenge.id, "ja")?.text).toBe("賞金 ¥140,000 を「Mina」へ支払い済みとして記録しました（デモ）。手数料 ¥14,000");
  });

  it("상금 0엔 과제는 상금 기록이 없어요", () => {
    const created = run(initial, { type: "createChallenge", draft: { ...challengeDraft, prizeYen: 0 } });
    expect(created.prizePayments).toBe(initial.prizePayments);
  });
});

describe("날짜 옮기기 · 저장 · 초기화", () => {
  it("다른 날 열면 받은 기록·상금 날짜도 같은 날수만큼 옮겨요", () => {
    const later = rebaseState(initial, "2026-11-11");
    expect(later.wallet.entries.map((e) => e.date)).toEqual(["2026-10-15", "2026-11-01"]);
    const old1 = later.prizePayments.find((p) => p.challengeId === "ch-old1")!;
    expect(old1.paidOn).toBe("2026-09-14");
    expect(later.prizePayments.find((p) => p.challengeId === "ch-plastic")?.promisedOn).toBe(later.challenges.find((c) => c.id === "ch-plastic")?.opensOn);
  });

  it("저장했다 불러와도 그대로이고, 모양이 틀리면 버려요", () => {
    const next = run(initial, { type: "awardProposal", proposalId: "pb-1", award: "grand" });
    expect(parseState(serializeState(next))).toEqual(next);
    const bad = (patch: (s: DemoState) => unknown) => parseState(JSON.stringify(patch(next)));
    expect(bad((s) => ({ ...s, wallet: { entries: [{ ...s.wallet.entries[0], amountYen: -1 }] } }))).toBeNull();
    expect(bad((s) => ({ ...s, wallet: { entries: [{ ...s.wallet.entries[0], kind: "gift" }] } }))).toBeNull();
    expect(bad((s) => ({ ...s, wallet: { entries: [{ ...s.wallet.entries[0], source: { kind: "return", round: "x" } }] } }))).toBeNull();
    expect(bad((s) => ({ ...s, prizePayments: [{ ...s.prizePayments[0], status: "lost" }] }))).toBeNull();
    expect(bad((s) => ({ ...s, prizePayments: [{ ...s.prizePayments[0], status: "paid", paidOn: null }] }))).toBeNull();
    expect(bad((s) => ({ ...s, prizePayments: "none" }))).toBeNull();
  });

  it("상금 기록이 생기기 전에 저장된 상태도 버리지 않고 샘플을 채워서 이어 써요 (데모에서 낸 과제에는 상금 기록 없음)", async () => {
    const used = run(initial, { type: "toggleBookmark", challengeId: "ch-solar" }, { type: "createChallenge", draft: { title: "新しい課題", summary: "説明", sdgIds: [4], prizeYen: 10_000, days: 14, participation: "both", internship: false } });
    const { wallet: _w, prizePayments: _p, ...legacy } = used;
    void _w;
    void _p;
    expect(isDemoState(legacy)).toBe(false);
    const kv = memoryStorage({ [STORAGE_KEYS.state]: JSON.stringify(legacy) });
    const loaded = await loadState(kv, "2026-11-03");
    expect(loaded.bookmarks).toContain("ch-solar");
    expect(loaded.wallet).toEqual(createInitialState("2026-11-03").wallet);
    expect(loaded.prizePayments).toEqual(createInitialState("2026-11-03").prizePayments);
    expect(isDemoState(loaded)).toBe(true);
  });

  it("이전 모양(리워드 잔액 · 상금 예치 · 채택 수수료)으로 저장된 상태도 이어 써요", () => {
    const old = {
      ...initial,
      wallet: {
        kyc: "verified",
        kycVerifiedOn: TODAY,
        entries: [
          ...initial.wallet.entries.map((e) => ({ ...e, status: "completed" })),
          { id: "w-out", studentId: DEMO_STUDENT_ID, kind: "withdrawal", amountYen: 500, date: TODAY, source: null, status: "requested" },
        ],
      },
      prizePayments: undefined,
      prizeDeposits: [
        { challengeId: "ch-bottle", companyId: "co-minato", amountYen: 50_000, status: "deposited", depositedOn: "2026-10-01", settledOn: null, proposalId: null },
        { challengeId: "ch-old1", companyId: "co-minato", amountYen: 30_000, status: "paid", depositedOn: "2026-08-01", settledOn: "2026-09-04", proposalId: "pp-old-1" },
        { challengeId: "ch-old2", companyId: "co-minato", amountYen: 30_000, status: "refunded", depositedOn: "2026-07-01", settledOn: "2026-08-07", proposalId: null },
      ],
      matches: initial.matches.map((m) => ({ ...m, feeYen: 30_000, donationYen: 15_000, recipient: { ja: "団体", ko: "단체" } })),
    };
    const loaded = parseState(JSON.stringify(old));
    expect(loaded).not.toBeNull();
    expect(loaded!.wallet).toEqual(initial.wallet);
    expect(loaded!.prizePayments).toEqual([
      { challengeId: "ch-bottle", companyId: "co-minato", amountYen: 50_000, status: "promised", promisedOn: "2026-10-01", paidOn: null, proposalId: null },
      { challengeId: "ch-old1", companyId: "co-minato", amountYen: 30_000, status: "paid", promisedOn: "2026-08-01", paidOn: "2026-09-04", proposalId: "pp-old-1" },
      { challengeId: "ch-old2", companyId: "co-minato", amountYen: 30_000, status: "noWinner", promisedOn: "2026-07-01", paidOn: null, proposalId: null },
    ]);
    expect(loaded!.matches).toEqual(initial.matches);
  });

  it("데모 초기화(처음 상태)로 돌아가면 상금 기록도 처음으로", () => {
    const changed = run(initial, { type: "awardProposal", proposalId: "pb-1", award: "grand" });
    const reset = run(changed, { type: "reset", state: createInitialState(TODAY) });
    expect(reset.wallet).toEqual(initial.wallet);
    expect(reset.prizePayments).toEqual(initial.prizePayments);
  });
});
