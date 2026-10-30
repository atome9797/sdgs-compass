// 중개 수수료와 기부: 매칭 성립 1건당 ¥30,000 이고, 그중 50% 는 기업 이름으로 SDGs 활동에 기부해요(나머지가 운영 수익).
// 기부 내역을 기업 화면에서 투명하게 보여 줘서, 플랫폼을 거치지 않는 직접 계약(중간 생략)보다 신뢰와 명분을 주는 구조예요.
import type { Match } from "./domain";

export const MATCH_FEE_YEN = 30_000;
export const DONATION_RATIO = 0.5;

export interface FeeSplit {
  feeYen: number;
  donationYen: number;
  revenueYen: number;
}

/** 수수료를 기부와 운영 수익으로 나눠요 (기부 = 내림, 나머지 = 수익 → 합계는 항상 수수료와 같아요) */
export function splitMatchFee(feeYen: number = MATCH_FEE_YEN): FeeSplit {
  const donationYen = Math.floor(feeYen * DONATION_RATIO);
  return { feeYen, donationYen, revenueYen: feeYen - donationYen };
}

export interface FeeSummary extends FeeSplit {
  count: number;
}

export function summarizeMatches(matches: readonly Pick<Match, "feeYen" | "donationYen">[]): FeeSummary {
  const feeYen = matches.reduce((sum, m) => sum + m.feeYen, 0);
  const donationYen = matches.reduce((sum, m) => sum + m.donationYen, 0);
  return { count: matches.length, feeYen, donationYen, revenueYen: feeYen - donationYen };
}
