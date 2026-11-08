// 운영 수수료 (2026-11-08 사용자 결정 — 설계는 docs/fees.md).
// 기업이 내는 상금·연구 의뢰비의 10%(최저 ¥9,000)를 기업에게서 따로 받아요. 상금·의뢰비는 기업이 학생·연구자에게 직접 지급해서
// 받는 사람은 전액을 받고, 운영사는 남의 돈을 맡지 않아요. 인턴 채용(채택)과 기업 간 업무 의뢰는 무료, 기부는 기업이 원할 때만 따로 해요.
// 요율과 최저액은 1건을 운영하는 원가에서 정했어요(계산은 사업계획 쪽 자료 — 이 레포에는 결과만 둬요).
import type { DemoState } from "./domain";
import type { Text } from "./i18n";

/** 수수료율: 상금·연구 의뢰비의 10% */
export const PLATFORM_FEE_RATE = 0.1;
/** 최저 수수료: 작은 상금·의뢰비라도 1건의 운영 원가를 밑돌지 않게 */
export const PLATFORM_FEE_MIN_YEN = 9_000;

/** 금액(상금·의뢰비) 1건의 수수료 = max(최저액, 금액 × 10% 엔 미만 버림). 0엔 이하·숫자가 아니면 수수료도 0엔 */
export function platformFeeFor(baseYen: number): number {
  if (!Number.isFinite(baseYen) || baseYen <= 0) return 0;
  return Math.max(PLATFORM_FEE_MIN_YEN, Math.floor(baseYen * PLATFORM_FEE_RATE));
}

/** 수수료가 생기는 거래: prize = 최우수상 팀에 지급한 상금, research = 완료한 연구 의뢰의 의뢰비 */
export type FeeKind = "prize" | "research";

export interface FeeItem {
  /** 화면의 key: `prize:<과제 id>` / `research:<의뢰 id>` */
  id: string;
  kind: FeeKind;
  /** 수수료를 내는 기업 */
  companyId: string;
  /** 과제 id 또는 연구 의뢰 id */
  refId: string;
  title: Text;
  /** 학생·연구자가 기업에게서 직접 받은 금액(상금·의뢰비) */
  baseYen: number;
  feeYen: number;
  /** 상금을 지급한 날 / 연구를 완료한 날 (YYYY-MM-DD) */
  date: string;
}

/**
 * 기업이 내는 수수료의 근거가 된 거래: 지급한 상금(prizePayments 의 paid) + 완료한 연구 의뢰(completed). 최신 날짜 순.
 * companyId 를 주면 그 기업 것만, 비우면 모든 기업 것(운영자 화면).
 */
export function feeItems(state: DemoState, companyId?: string): FeeItem[] {
  const items: FeeItem[] = [];
  for (const payment of state.prizePayments) {
    if (payment.status !== "paid" || payment.paidOn === null) continue;
    if (companyId !== undefined && payment.companyId !== companyId) continue;
    const challenge = state.challenges.find((c) => c.id === payment.challengeId);
    items.push({
      id: `prize:${payment.challengeId}`,
      kind: "prize",
      companyId: payment.companyId,
      refId: payment.challengeId,
      title: challenge ? challenge.title : payment.challengeId,
      baseYen: payment.amountYen,
      feeYen: platformFeeFor(payment.amountYen),
      date: payment.paidOn,
    });
  }
  for (const request of state.researchRequests) {
    if (request.status !== "completed" || request.completedOn === null) continue;
    if (companyId !== undefined && request.companyId !== companyId) continue;
    items.push({
      id: `research:${request.id}`,
      kind: "research",
      companyId: request.companyId,
      refId: request.id,
      title: request.title,
      baseYen: request.feeYen,
      feeYen: platformFeeFor(request.feeYen),
      date: request.completedOn,
    });
  }
  return items.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}

export interface FeeTotals {
  count: number;
  /** 학생·연구자에게 직접 간 금액의 합 */
  baseYen: number;
  /** 수수료의 합 (운영 수익) */
  feeYen: number;
}

export function summarizeFees(items: readonly Pick<FeeItem, "baseYen" | "feeYen">[]): FeeTotals {
  return { count: items.length, baseYen: items.reduce((sum, i) => sum + i.baseYen, 0), feeYen: items.reduce((sum, i) => sum + i.feeYen, 0) };
}

// ───────── 이전 모델 (레거시) ─────────
// 2026-11-07 까지: 채택(매칭) 1건 ¥30,000, 그중 50% 는 기업 이름의 기부. 앱 화면과 계산에서는 더 쓰지 않아요(채택 = 인턴은 무료).
// DB(db/schema.sql 의 matches 생성 열)가 아직 이 규칙이라서, DB 대조표(scripts/gen-db-reference.ts → db/tests/golden.sql)만 써요.
// DB 를 직접 지급 모델로 옮길 때 함께 지워요 (docs/fees.md 「남은 일」).

export const MATCH_FEE_YEN = 30_000;
export const DONATION_RATIO = 0.5;

export interface FeeSplit {
  feeYen: number;
  donationYen: number;
  revenueYen: number;
}

/** (레거시) 수수료를 기부와 운영 수익으로 나눠요 (기부 = 내림, 나머지 = 수익) */
export function splitMatchFee(feeYen: number = MATCH_FEE_YEN): FeeSplit {
  const donationYen = Math.floor(feeYen * DONATION_RATIO);
  return { feeYen, donationYen, revenueYen: feeYen - donationYen };
}
