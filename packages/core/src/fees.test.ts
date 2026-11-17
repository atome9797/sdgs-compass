import { describe, expect, it } from "vitest";
import { makeUsageState } from "./adminFixtures";
import { DONATION_RATIO, feeItems, MATCH_FEE_YEN, PLATFORM_FEE_MIN_YEN, PLATFORM_FEE_RATE, platformFeeFor, splitMatchFee, summarizeFees } from "./fees";
import { translate } from "./messages";

describe("운영 수수료 = 상금·연구 의뢰비의 10% (최저 ¥6,000)", () => {
  it("요율과 최저액", () => {
    expect(PLATFORM_FEE_RATE).toBe(0.1);
    expect(PLATFORM_FEE_MIN_YEN).toBe(6_000);
  });

  it("10% 가 최저액보다 작으면 최저액, 크면 10% (엔 미만 버림)", () => {
    expect(platformFeeFor(30_000)).toBe(6_000);
    expect(platformFeeFor(50_000)).toBe(6_000);
    expect(platformFeeFor(60_000)).toBe(6_000);
    expect(platformFeeFor(80_000)).toBe(8_000);
    expect(platformFeeFor(90_000)).toBe(9_000);
    expect(platformFeeFor(100_000)).toBe(10_000);
    expect(platformFeeFor(123_456)).toBe(12_345);
    expect(platformFeeFor(1_000_000)).toBe(100_000);
  });

  it("0엔 이하·숫자가 아니면 수수료도 0엔", () => {
    for (const base of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) expect(platformFeeFor(base), String(base)).toBe(0);
  });

  it("최저액을 글자로 쓴 안내 문구 3개도 PLATFORM_FEE_MIN_YEN 과 같아요 (2026-11-17 ¥9,000 → ¥6,000)", () => {
    const min = String(PLATFORM_FEE_MIN_YEN).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    for (const key of ["wallet.about.prize", "prize.newNote", "prize.companyNote"] as const) {
      expect(translate(key, "ja"), key).toContain(`最低${min}円`);
      expect(translate(key, "ko"), key).toContain(`최저 ${min}엔`);
    }
  });
});

describe("수수료의 근거가 된 거래 (지급한 상금 + 완료한 연구 의뢰)", () => {
  const base = makeUsageState();
  const state = {
    ...base,
    prizePayments: [
      { challengeId: "chA", companyId: "co1", amountYen: 100_000, status: "paid" as const, promisedOn: "2026-09-01", paidOn: "2026-10-01", proposalId: null },
      { challengeId: "chB", companyId: "co1", amountYen: 50_000, status: "promised" as const, promisedOn: "2026-10-20", paidOn: null, proposalId: null },
      { challengeId: "chC", companyId: "co2", amountYen: 200_000, status: "noWinner" as const, promisedOn: "2026-08-01", paidOn: null, proposalId: null },
    ],
    researchRequests: [
      { ...researchStub("rr1", "co1", 80_000), status: "completed" as const, completedOn: "2026-10-15" },
      { ...researchStub("rr2", "co1", 60_000), status: "delivered" as const, completedOn: null },
    ],
  };

  it("지급한 상금과 완료한 연구만, 최신 순", () => {
    const items = feeItems(state, "co1");
    expect(items.map((i) => [i.id, i.baseYen, i.feeYen, i.date])).toEqual([
      ["research:rr1", 80_000, 8_000, "2026-10-15"],
      ["prize:chA", 100_000, 10_000, "2026-10-01"],
    ]);
    expect(summarizeFees(items)).toEqual({ count: 2, baseYen: 180_000, feeYen: 18_000 });
  });

  it("회사를 비우면 모든 기업 것 (운영자 화면)", () => {
    expect(feeItems(state).length).toBe(2);
    expect(feeItems(state, "co2")).toEqual([]);
  });

  it("상금 대신 상품을 고른 최우수상(#51): 상금액으로 수수료, 직접 간 돈의 합에는 넣지 않아요", () => {
    const withItem = {
      ...state,
      prizePayments: [
        ...state.prizePayments,
        { challengeId: "chD", companyId: "co1", amountYen: 150_000, status: "itemChosen" as const, promisedOn: "2026-09-10", paidOn: "2026-10-25", proposalId: null },
      ],
    };
    const items = feeItems(withItem, "co1");
    expect(items.map((i) => [i.id, i.kind, i.baseYen, i.feeYen, i.date])).toEqual([
      ["prize:chD", "prizeItem", 150_000, 15_000, "2026-10-25"],
      ["research:rr1", "research", 80_000, 8_000, "2026-10-15"],
      ["prize:chA", "prize", 100_000, 10_000, "2026-10-01"],
    ]);
    expect(summarizeFees(items)).toEqual({ count: 3, baseYen: 180_000, feeYen: 33_000 });
  });
});

describe("(레거시) 이전 채택 수수료 — DB 대조용", () => {
  it("1건 ¥30,000 중 50% 를 기부로 나누던 규칙이 그대로예요", () => {
    expect(MATCH_FEE_YEN).toBe(30_000);
    expect(DONATION_RATIO).toBe(0.5);
    expect(splitMatchFee()).toEqual({ feeYen: 30_000, donationYen: 15_000, revenueYen: 15_000 });
    for (const fee of [0, 1, 999, 30_001]) expect(splitMatchFee(fee).donationYen + splitMatchFee(fee).revenueYen).toBe(fee);
  });
});

function researchStub(id: string, companyId: string, feeYen: number) {
  return {
    id,
    companyId,
    origin: { proposalId: null, challengeId: null, ideaTitle: "idea", teamName: "team" },
    title: "研究",
    detail: "detail",
    deliverable: "report",
    fields: ["data" as const],
    feeYen,
    postedOn: "2026-09-20",
    dueOn: "2026-11-20",
    researcherId: "res1",
    acceptedOn: "2026-09-22",
    result: { summary: "s", fileName: "r.pdf", fileSizeBytes: 1, sha256: "x", submittedAt: "2026-10-10T10:00" },
  };
}
