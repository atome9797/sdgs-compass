import { describe, expect, it } from "vitest";
import type { Wallet, WalletEntry } from "./domain";
import { parseYenInput, PRIZE_AWARD, RETURN_RESERVE_MONTHS, returnPoolYen, validateWithdrawal, walletBalance, walletTotals, WITHDRAWAL_MAX_YEN } from "./wallet";

const entry = (kind: WalletEntry["kind"], amountYen: number, id = `${kind}-${amountYen}`): WalletEntry => ({
  id,
  studentId: "stu",
  kind,
  amountYen,
  date: "2026-11-01",
  source: kind === "withdrawal" ? null : kind === "return" ? { kind: "return", round: "第4期" } : { kind: "prize", challengeId: "ch", activityId: null, companyId: "co", title: "課題", award: "grand" },
  status: kind === "withdrawal" ? "requested" : "completed",
});
const wallet = (entries: WalletEntry[], kyc: Wallet["kyc"] = "verified"): Wallet => ({ kyc, kycVerifiedOn: kyc === "verified" ? "2026-11-01" : null, entries });

describe("リワード残高의 잔액", () => {
  it("잔액 = 입금(상금·환원) − 출금(신청 중 포함)", () => {
    const entries = [entry("prize", 30_000), entry("return", 1_500), entry("withdrawal", 10_000)];
    expect(walletTotals(entries)).toEqual({ prizeYen: 30_000, returnYen: 1_500, withdrawnYen: 10_000, balanceYen: 21_500 });
    expect(walletBalance([])).toBe(0);
  });

  it("상수: 출금 1회 100만 엔(第二種), 상금은 최우수상, 운전자금 3개월분", () => {
    expect(WITHDRAWAL_MAX_YEN).toBe(1_000_000);
    expect(PRIZE_AWARD).toBe("grand");
    expect(RETURN_RESERVE_MONTHS).toBe(3);
  });
});

describe("출금 금액 입력 읽기", () => {
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

describe("출금 검사 (본인 확인 → 금액 → 1회 상한 → 잔액)", () => {
  const rich = wallet([entry("prize", 1_500_000)]);
  it("본인 확인 전에는 어떤 금액도 안 돼요", () => {
    expect(validateWithdrawal(wallet([entry("prize", 30_000)], "none"), 1_000)).toBe("kyc_required");
  });
  it("1엔 이상의 정수만", () => {
    for (const amount of [null, 0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) expect(validateWithdrawal(rich, amount), String(amount)).toBe("invalid_amount");
    expect(validateWithdrawal(rich, 1)).toBeNull();
  });
  it("1회 100만 엔까지 (잔액이 많아도)", () => {
    expect(validateWithdrawal(rich, 1_000_000)).toBeNull();
    expect(validateWithdrawal(rich, 1_000_001)).toBe("over_limit");
  });
  it("잔액을 넘으면 안 돼요 (신청 중인 출금도 잔액에서 빠져요)", () => {
    const w = wallet([entry("prize", 30_000), entry("withdrawal", 20_000)]);
    expect(validateWithdrawal(w, 10_000)).toBeNull();
    expect(validateWithdrawal(w, 10_001)).toBe("over_balance");
    expect(validateWithdrawal(wallet([]), 1)).toBe("over_balance");
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
