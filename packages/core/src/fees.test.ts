import { describe, expect, it } from "vitest";
import { DONATION_RATIO, MATCH_FEE_YEN, splitMatchFee, summarizeMatches } from "./fees";

describe("중개 수수료와 기부", () => {
  it("1건 ¥30,000 중 50% 를 기업 이름으로 기부해요", () => {
    expect(MATCH_FEE_YEN).toBe(30_000);
    expect(DONATION_RATIO).toBe(0.5);
    expect(splitMatchFee()).toEqual({ feeYen: 30_000, donationYen: 15_000, revenueYen: 15_000 });
  });

  it("나눈 합계는 항상 수수료와 같아요 (홀수 금액도)", () => {
    for (const fee of [0, 1, 999, 30_001, 45_555]) {
      const split = splitMatchFee(fee);
      expect(split.donationYen + split.revenueYen).toBe(fee);
      expect(split.donationYen).toBe(Math.floor(fee / 2));
    }
  });

  it("여러 건 합계", () => {
    expect(summarizeMatches([])).toEqual({ count: 0, feeYen: 0, donationYen: 0, revenueYen: 0 });
    const two = summarizeMatches([splitMatchFee(), splitMatchFee()]);
    expect(two).toEqual({ count: 2, feeYen: 60_000, donationYen: 30_000, revenueYen: 30_000 });
  });
});
