// 상금의 규칙 (순수 함수, 2026-11-08 직접 지급 모델 — 설계는 docs/fees.md).
// 기업은 과제에 상금을 걸고(약속), 최우수상이 정해지면 그 팀에 직접 지급해요. 운영사는 상금을 맡지 않고 수수료만 따로 받아요(fees.ts).
// 학생 화면의 「受け取った賞金」은 받은 상금과, 흑자 뒤 운영사가 내는 학생 특별상(운영 환원)의 기록이에요 — 잔액·출금은 없어요.
import { awardActivityId } from "./activities";
import type { AwardKind, Challenge, DemoState, PrizePayment, Proposal, QuestReward, WalletEntry } from "./domain";

/** 과제의 상금(prizeYen)을 받는 상: 최우수상(grand) — 과제당 1팀 */
export const PRIZE_AWARD: AwardKind = "grand";
/** 운영 환원(학생 특별상): 기 말에 남겨 둘 운전자금 개월 수 (그 기 경비 + 매출원가의 N/12). 사용자 결정(2026-11-01) */
export const RETURN_RESERVE_MONTHS = 3;

export interface WalletTotals {
  prizeYen: number;
  returnYen: number;
  totalYen: number;
}

/** 받은 금액의 합계 (상금 · 특별상) */
export function walletTotals(entries: readonly WalletEntry[]): WalletTotals {
  let prizeYen = 0;
  let returnYen = 0;
  for (const entry of entries) {
    if (entry.kind === "prize") prizeYen += entry.amountYen;
    else returnYen += entry.amountYen;
  }
  return { prizeYen, returnYen, totalYen: prizeYen + returnYen };
}

/**
 * 금액 입력을 숫자로 읽어요: 앞뒤 공백·쉼표·「円」「엔」「¥」는 무시하고 전각 숫자도 받아요 ("１２,０００円" → 12000).
 * 숫자가 아니거나 정수가 아니면 null (0·음수는 숫자로 돌려주고 각 폼의 검사가 거절해요)
 */
export function parseYenInput(raw: string): number | null {
  const ascii = raw.replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0)).replace(/[，,\s　]/g, "");
  const body = ascii.replace(/^[¥￥]/, "").replace(/(円|엔)$/, "");
  if (!/^-?\d+$/.test(body)) return null;
  const n = Number(body);
  return Number.isSafeInteger(n) ? n : null;
}

/**
 * 운영 환원(학생 특별상) 총액 = max(0, min(그 기 경상이익, 기말 자금(환원 전) − 운전자금 N개월분)).
 * 운전자금 N개월분 = 그 기 (경비 + 매출원가) × N / 12 (엔 미만 버림). DB reward_return_rounds 의 생성 열과 같은 계산이에요(04_parity.sql).
 * 수지 시뮬레이션(운영자 화면, adminFinance.ts)의 「学生への還元」도 같은 규칙이에요.
 */
export function returnPoolYen(input: { ordinaryProfitYen: number; periodCostsYen: number; periodEndCashYen: number; reserveMonths?: number }): { reserveYen: number; poolYen: number } {
  const months = input.reserveMonths ?? RETURN_RESERVE_MONTHS;
  const reserveYen = Math.floor((input.periodCostsYen * months) / 12);
  return { reserveYen, poolYen: Math.max(0, Math.min(input.ordinaryProfitYen, input.periodEndCashYen - reserveYen)) };
}

// ───────── 데모 상태를 바꾸는 조각 (state.ts 의 reducer 가 불러요) ─────────

/** 과제를 낼 때 상금을 걸어요 (상금이 0엔이면 없어요). 돈은 이때 오가지 않아요 */
export function promisePrize(challenge: Challenge, today: string): PrizePayment | null {
  if (!(challenge.prizeYen > 0)) return null;
  return { challengeId: challenge.id, companyId: challenge.companyId, amountYen: challenge.prizeYen, status: "promised", promisedOn: today, paidOn: null, proposalId: null };
}

/**
 * 최우수상이 정해지면 그 과제의 상금을 수상 팀에 지급한 것으로 기록해요(promised → paid — 실서비스에서는 기업이 직접 송금하고 학생이 받았음을 확인해요).
 * 이미 지급했거나 수상 없이 끝났으면 그대로. 수상 팀이 이 데모의 학생(내 기획서)이면 「受け取った賞金」에 한 줄 더해요.
 */
export function payPrize(state: DemoState, proposal: Proposal, award: AwardKind): DemoState {
  if (award !== PRIZE_AWARD) return state;
  const payment = state.prizePayments.find((p) => p.challengeId === proposal.challengeId);
  const challenge = state.challenges.find((c) => c.id === proposal.challengeId);
  // 표창 전(promised)이거나, 이 기획서의 팀이 고르는 중(choosing, #47)일 때만
  const payable = payment && (payment.status === "promised" || (payment.status === "choosing" && payment.proposalId === proposal.id));
  if (!payment || !payable || !challenge) return state;
  const paid: PrizePayment = { ...payment, status: "paid", paidOn: state.today, proposalId: proposal.id };
  const prizePayments = state.prizePayments.map((p) => (p === payment ? paid : p));
  if (!proposal.mine) return { ...state, prizePayments };
  const entry: WalletEntry = {
    id: `w${state.seq}`,
    studentId: state.me.id,
    kind: "prize",
    amountYen: payment.amountYen,
    date: state.today,
    source: { kind: "prize", challengeId: challenge.id, activityId: awardActivityId(proposal.id), companyId: challenge.companyId, title: challenge.title, award },
  };
  return { ...state, seq: state.seq + 1, prizePayments, wallet: { entries: [...state.wallet.entries, entry] } };
}

// ───────── 이전 リワード残高 설계 (레거시) ─────────
// 운영사가 상금을 맡아 학생 잔액으로 보내고 출금하게 하던 설계(2026-11-01~07)의 출금 한도예요. 앱은 출금을 하지 않아요.
// DB(db/schema.sql 의 withdrawal_requests CHECK)가 아직 이 설계라서 DB 대조표(scripts/gen-db-reference.ts)만 써요 — DB 를 옮길 때 지워요(docs/fees.md).

/** (레거시) 출금 1회 상한 */
export const WITHDRAWAL_MAX_YEN = 1_000_000;
/** (레거시) 출금 1회 하한 */
export const WITHDRAWAL_MIN_YEN = 1;

/** #47 이 상으로 받을 수 있는 보상: 상금은 최우수상(과제당 1팀)이고 상금이 걸려 있을 때, 상품은 상품이 걸려 있으면 어느 상이든 */
export function rewardOptionsFor(challenge: Pick<Challenge, "prizeYen" | "rewardItem">, award: AwardKind): QuestReward[] {
  const options: QuestReward[] = [];
  if (award === PRIZE_AWARD && challenge.prizeYen > 0) options.push("prize");
  if (challenge.rewardItem) options.push("item");
  return options;
}

/** #47 상금과 상품이 둘 다 걸린 퀘스트의 최우수상: 수상 팀이 고를 때까지 상금을 「고르는 중(choosing)」으로 두어요(돈은 아직 오가지 않아요) */
export function holdPrize(state: DemoState, proposal: Proposal): DemoState {
  const payment = state.prizePayments.find((p) => p.challengeId === proposal.challengeId);
  if (!payment || payment.status !== "promised") return state;
  const held: PrizePayment = { ...payment, status: "choosing", proposalId: proposal.id };
  return { ...state, prizePayments: state.prizePayments.map((p) => (p === payment ? held : p)) };
}

/** #47 고르는 중이던 상금을 다시 표창 전으로(기업이 상을 최우수상이 아닌 것으로 고친 경우) */
export function releasePrize(state: DemoState, proposal: Proposal): DemoState {
  const payment = state.prizePayments.find((p) => p.challengeId === proposal.challengeId && p.status === "choosing" && p.proposalId === proposal.id);
  if (!payment) return state;
  return { ...state, prizePayments: state.prizePayments.map((p) => (p === payment ? { ...p, status: "promised", proposalId: null } : p)) };
}

/** #47 수상 팀이 보상을 골랐어요: 상금이면 지급(받은 상금에 한 줄), 상품이면 상금은 지급하지 않아요(itemChosen — 상금 수수료도 없어요) */
export function settlePrizeChoice(state: DemoState, proposal: Proposal, reward: QuestReward): DemoState {
  if (reward === "prize") return payPrize(state, proposal, PRIZE_AWARD);
  const payment = state.prizePayments.find((p) => p.challengeId === proposal.challengeId && p.status === "choosing" && p.proposalId === proposal.id);
  if (!payment) return state;
  return { ...state, prizePayments: state.prizePayments.map((p) => (p === payment ? { ...p, status: "itemChosen" } : p)) };
}

/** #47 받은 보상: 고른 것 → 이미 지급된 상금(#47 전의 최우수상) → 받을 수 있는 것이 하나뿐이면 그것. 고를 것이 남았으면 null */
export function rewardChosen(state: Pick<DemoState, "prizePayments" | "challenges">, proposal: Proposal): QuestReward | null {
  if (proposal.rewardChoice) return proposal.rewardChoice;
  if (state.prizePayments.some((p) => p.challengeId === proposal.challengeId && p.status === "paid" && p.proposalId === proposal.id)) return "prize";
  const challenge = state.challenges.find((c) => c.id === proposal.challengeId);
  if (!challenge || !proposal.award) return null;
  const options = rewardOptionsFor(challenge, proposal.award);
  return options.length === 1 ? (options[0] ?? null) : null;
}

/** #47 상금과 상품 중에서 아직 고르지 않았는지 — 마이 Impact 카드의 「報酬を えらぶ」 */
export function rewardPending(state: Pick<DemoState, "prizePayments" | "challenges">, proposal: Proposal): boolean {
  const challenge = state.challenges.find((c) => c.id === proposal.challengeId);
  if (!proposal.mine || !proposal.award || !challenge) return false;
  return rewardOptionsFor(challenge, proposal.award).length > 1 && rewardChosen(state, proposal) === null;
}
