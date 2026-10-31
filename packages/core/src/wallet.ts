// #25 リワード残高(데모)의 규칙 (순수 함수).
// 기업이 과제에 건 상금(과제를 낼 때 운영사에 예치 → 최우수상 팀에 송금)과 운영 환원을 학생의 잔액(엔)으로 받고, 본인 확인 뒤 은행 계좌로 출금 신청해요.
// 운영사가 第二種資金移動業 등록을 받은 뒤에 제공할 기능이라, 데모는 화면과 규칙만 보여 주고 실제 송금·본인 확인(eKYC)은 하지 않아요.
// 설계·법적 근거는 docs/rewards.md, DB 는 db/schema.sql 의 wallet_* · prize_deposits · reward_return_* 표 (db/tests/07_wallet.sql 이 같은 규칙을 시험해요).
import { awardActivityId } from "./activities";
import type { AwardKind, Challenge, DemoState, PrizeDeposit, Proposal, Wallet, WalletEntry, WalletEntryKind } from "./domain";

/** 출금 1회 상한: 第二種資金移動業은 1회 송금액 100만 엔 이하 (DB withdrawal_requests 의 CHECK 와 같아요) */
export const WITHDRAWAL_MAX_YEN = 1_000_000;
/** 출금 1회 하한 (1엔 이상) */
export const WITHDRAWAL_MIN_YEN = 1;
/** 과제의 상금(prizeYen)을 받는 상: 최우수상(grand) — 과제당 1팀 (DB 도 과제당 grand 는 1건, awards_one_grand_per_challenge) */
export const PRIZE_AWARD: AwardKind = "grand";
/** 운영 환원: 기 말에 남겨 둘 운전자금 개월 수 (그 기 경비 + 매출원가의 N/12). 사용자 결정(2026-11-01) */
export const RETURN_RESERVE_MONTHS = 3;

export const isCredit = (kind: WalletEntryKind): boolean => kind !== "withdrawal";

export interface WalletTotals {
  prizeYen: number;
  returnYen: number;
  /** 출금(신청 중 포함) 합계 — 신청하면 바로 잔액에서 빠져요 */
  withdrawnYen: number;
  balanceYen: number;
}

/** 합계와 잔액 (잔액 = 입금 − 출금) */
export function walletTotals(entries: readonly WalletEntry[]): WalletTotals {
  let prizeYen = 0;
  let returnYen = 0;
  let withdrawnYen = 0;
  for (const entry of entries) {
    if (entry.kind === "prize") prizeYen += entry.amountYen;
    else if (entry.kind === "return") returnYen += entry.amountYen;
    else withdrawnYen += entry.amountYen;
  }
  return { prizeYen, returnYen, withdrawnYen, balanceYen: prizeYen + returnYen - withdrawnYen };
}

export const walletBalance = (entries: readonly WalletEntry[]): number => walletTotals(entries).balanceYen;

/**
 * 출금 금액 입력을 숫자로 읽어요: 앞뒤 공백·쉼표·「円」「엔」「¥」는 무시하고 전각 숫자도 받아요 ("１２,０００円" → 12000).
 * 숫자가 아니거나 정수가 아니면 null (0·음수는 숫자로 돌려주고 validateWithdrawal 이 거절해요)
 */
export function parseYenInput(raw: string): number | null {
  const ascii = raw.replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0)).replace(/[，,\s　]/g, "");
  const body = ascii.replace(/^[¥￥]/, "").replace(/(円|엔)$/, "");
  if (!/^-?\d+$/.test(body)) return null;
  const n = Number(body);
  return Number.isSafeInteger(n) ? n : null;
}

export type WithdrawalError = "kyc_required" | "invalid_amount" | "over_limit" | "over_balance";

/** 출금 신청을 받을 수 있는지: 본인 확인 완료 → 1엔 이상의 정수 → 1회 100만 엔 이하 → 잔액 이하 (처음 걸린 이유 하나를 돌려줘요, 통과하면 null) */
export function validateWithdrawal(wallet: Wallet, amountYen: number | null): WithdrawalError | null {
  if (wallet.kyc !== "verified") return "kyc_required";
  if (amountYen === null || !Number.isSafeInteger(amountYen) || amountYen < WITHDRAWAL_MIN_YEN) return "invalid_amount";
  if (amountYen > WITHDRAWAL_MAX_YEN) return "over_limit";
  if (amountYen > walletBalance(wallet.entries)) return "over_balance";
  return null;
}

/**
 * 운영 환원 총액 = max(0, min(그 기 경상이익, 기말 자금(환원 전) − 운전자금 N개월분)).
 * 운전자금 N개월분 = 그 기 (경비 + 매출원가) × N / 12 (엔 미만 버림). DB reward_return_rounds 의 생성 열과 같은 계산이에요(04_parity.sql).
 * 수지 시뮬레이션(운영자 화면, adminFinance.ts)의 「学生への還元」도 같은 규칙이에요.
 */
export function returnPoolYen(input: { ordinaryProfitYen: number; periodCostsYen: number; periodEndCashYen: number; reserveMonths?: number }): { reserveYen: number; poolYen: number } {
  const months = input.reserveMonths ?? RETURN_RESERVE_MONTHS;
  const reserveYen = Math.floor((input.periodCostsYen * months) / 12);
  return { reserveYen, poolYen: Math.max(0, Math.min(input.ordinaryProfitYen, input.periodEndCashYen - reserveYen)) };
}

// ───────── 데모 상태를 바꾸는 조각 (state.ts 의 reducer 가 불러요) ─────────

/** 과제를 낼 때 상금을 예치해요 (상금이 0엔이면 예치도 없어요) */
export function depositFor(challenge: Challenge, today: string): PrizeDeposit | null {
  if (!(challenge.prizeYen > 0)) return null;
  return { challengeId: challenge.id, companyId: challenge.companyId, amountYen: challenge.prizeYen, status: "deposited", depositedOn: today, settledOn: null, proposalId: null };
}

/**
 * 최우수상이 정해지면 그 과제에 맡긴 상금을 수상 팀에 보내요(deposited → paid). 이미 보냈거나 반환했으면 그대로(한 번 보낸 돈은 되돌리지 않아요).
 * 수상 팀이 이 데모의 학생(내 기획서)이면 내 リワード残高에 입금돼요. 다른 학생의 잔액은 이 데모에 없어서 예치 기록만 바뀌어요.
 */
export function settlePrize(state: DemoState, proposal: Proposal, award: AwardKind): DemoState {
  if (award !== PRIZE_AWARD) return state;
  const deposit = state.prizeDeposits.find((d) => d.challengeId === proposal.challengeId);
  const challenge = state.challenges.find((c) => c.id === proposal.challengeId);
  if (!deposit || deposit.status !== "deposited" || !challenge) return state;
  const paid: PrizeDeposit = { ...deposit, status: "paid", settledOn: state.today, proposalId: proposal.id };
  const prizeDeposits = state.prizeDeposits.map((d) => (d === deposit ? paid : d));
  if (!proposal.mine) return { ...state, prizeDeposits };
  const entry: WalletEntry = {
    id: `w${state.seq}`,
    studentId: state.me.id,
    kind: "prize",
    amountYen: deposit.amountYen,
    date: state.today,
    source: { kind: "prize", challengeId: challenge.id, activityId: awardActivityId(proposal.id), companyId: challenge.companyId, title: challenge.title, award },
    status: "completed",
  };
  return { ...state, seq: state.seq + 1, prizeDeposits, wallet: { ...state.wallet, entries: [...state.wallet.entries, entry] } };
}

/** 본인 확인 완료(데모 버튼). 이미 끝났으면 그대로 */
export function verifyKyc(state: DemoState, at: string): DemoState {
  if (state.wallet.kyc === "verified") return state;
  return { ...state, wallet: { ...state.wallet, kyc: "verified", kycVerifiedOn: at.slice(0, 10) } };
}

/** 출금 신청: 검사(validateWithdrawal)를 통과하면 원장에 출금(신청 중)을 더해요. 통과하지 못하면 그대로 */
export function requestWithdrawal(state: DemoState, amountYen: number, at: string): DemoState {
  if (validateWithdrawal(state.wallet, amountYen) !== null) return state;
  const entry: WalletEntry = { id: `w${state.seq}`, studentId: state.me.id, kind: "withdrawal", amountYen, date: at.slice(0, 10), source: null, status: "requested" };
  return { ...state, seq: state.seq + 1, wallet: { ...state.wallet, entries: [...state.wallet.entries, entry] } };
}
