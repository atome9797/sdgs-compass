import { describe, expect, it } from "vitest";
import type { WalletEntry } from "./domain";
import { parseYenInput, PRIZE_AWARD, promisePrize, RETURN_RESERVE_MONTHS, returnPoolYen, walletTotals, WITHDRAWAL_MAX_YEN, WITHDRAWAL_MIN_YEN } from "./wallet";

const entry = (kind: WalletEntry["kind"], amountYen: number, id = `${kind}-${amountYen}`): WalletEntry => ({
  id,
  studentId: "stu",
  kind,
  amountYen,
  date: "2026-11-01",
  source: kind === "return" ? { kind: "return", round: "第4期" } : { kind: "prize", challengeId: "ch", activityId: null, companyId: "co", title: "課題", award: "grand" },
});

describe("받은 상금의 합계 (운영사는 돈을 맡지 않아서 잔액·출금은 없어요)", () => {
  it("합계 = 기업 상금 + 운영사 특별상", () => {
    expect(walletTotals([entry("prize", 30_000), entry("return", 1_500)])).toEqual({ prizeYen: 30_000, returnYen: 1_500, totalYen: 31_500 });
    expect(walletTotals([])).toEqual({ prizeYen: 0, returnYen: 0, totalYen: 0 });
  });

  it("상수: 상금은 최우수상, 운전자금 3개월분 (출금 한도는 DB 대조용 레거시)", () => {
    expect(PRIZE_AWARD).toBe("grand");
    expect(RETURN_RESERVE_MONTHS).toBe(3);
    expect([WITHDRAWAL_MIN_YEN, WITHDRAWAL_MAX_YEN]).toEqual([1, 1_000_000]);
  });
});

describe("상금 걸기 (돈은 오가지 않아요)", () => {
  const challenge = { id: "ch-x", companyId: "co-x", prizeYen: 100_000 } as Parameters<typeof promisePrize>[0];
  it("상금이 있으면 「표창 전」으로 걸어요", () => {
    expect(promisePrize(challenge, "2026-11-08")).toEqual({ challengeId: "ch-x", companyId: "co-x", amountYen: 100_000, status: "promised", promisedOn: "2026-11-08", paidOn: null, proposalId: null });
  });
  it("상금이 0엔이면 없어요", () => {
    expect(promisePrize({ ...challenge, prizeYen: 0 }, "2026-11-08")).toBeNull();
  });
});

describe("금액 입력 읽기", () => {
  it("쉼표·공백·円·엔·¥·전각 숫자를 받아요", () => {
    expect(parseYenInput("10000")).toBe(10_000);
    expect(parseYenInput(" 12,000円 ")).toBe(12_000);
    expect(parseYenInput("１２，０００円")).toBe(12_000);
    expect(parseYenInput("¥5,000")).toBe(5_000);
    expect(parseYenInput("3000엔")).toBe(3_000);
    expect(parseYenInput("0")).toBe(0);
    expect(parseYenInput("-5")).toBe(-5);
  });

  it("숫자가 아니거나 소수·지수·빈 글자는 null", () => {
    for (const raw of ["", "  ", "abc", "1.5", "1e4", "10,000ドル", "１万", "99999999999999999999"]) expect(parseYenInput(raw), raw).toBeNull();
  });
});

describe("운영 환원 총액 = max(0, min(경상이익, 기말 자금 − 운전자금 3개월분))", () => {
  const costs = 6_000_000; // 그 기 경비 + 매출원가(가상) → 3개월분 1,500,000
  it("기말 자금이 운전자금에 못 미치면 0 (이익이 나도)", () => {
    expect(returnPoolYen({ ordinaryProfitYen: 800_000, periodCostsYen: costs, periodEndCashYen: 1_200_000 })).toEqual({ reserveYen: 1_500_000, poolYen: 0 });
  });
  it("적자면 0", () => {
    expect(returnPoolYen({ ordinaryProfitYen: -200_000, periodCostsYen: costs, periodEndCashYen: 9_000_000 }).poolYen).toBe(0);
  });
  it("자금 − 적립이 이익보다 작으면 그만큼만 (부분 환원)", () => {
    expect(returnPoolYen({ ordinaryProfitYen: 900_000, periodCostsYen: costs, periodEndCashYen: 1_800_000 }).poolYen).toBe(300_000);
  });
  it("자금이 넉넉하면 이익 전부 (전액 환원)", () => {
    expect(returnPoolYen({ ordinaryProfitYen: 900_000, periodCostsYen: costs, periodEndCashYen: 5_000_000 }).poolYen).toBe(900_000);
  });
  it("운전자금 개월 수를 바꿀 수 있고(0이면 적립 없음), 엔 미만은 버려요", () => {
    expect(returnPoolYen({ ordinaryProfitYen: 900_000, periodCostsYen: costs, periodEndCashYen: 500_000, reserveMonths: 0 })).toEqual({ reserveYen: 0, poolYen: 500_000 });
    expect(returnPoolYen({ ordinaryProfitYen: 10, periodCostsYen: 7, periodEndCashYen: 100 }).reserveYen).toBe(1); // 7 × 3 / 12 = 1.75 → 1
  });
});
