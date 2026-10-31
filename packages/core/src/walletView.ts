// #25 リワード残高(데모)의 화면 모델: 학생의 잔액·내역·본인 확인·출금 폼, 기업의 상금 예치 현황과 응모자 화면의 송금 안내.
// 웹·모바일이 같은 결과를 그려요. 규칙(잔액·출금 검사·송금)은 wallet.ts 에 있어요.
import type { DemoState, PrizeDeposit, PrizeDepositStatus, WalletEntry, WalletEntryKind } from "./domain";
import { formatDate, formatYen } from "./format";
import { pick, type Locale } from "./i18n";
import { awardLabel } from "./labels";
import { makeT, translate, type MessageKey } from "./messages";
import { validateWithdrawal, walletTotals, WITHDRAWAL_MAX_YEN, type WithdrawalError } from "./wallet";

export const WALLET_KIND_EMOJI: Record<WalletEntryKind, string> = { prize: "🏆", return: "🤝", withdrawal: "🏦" };

export interface WalletEntryVM {
  id: string;
  kind: WalletEntryKind;
  emoji: string;
  kindLabel: string;
  /** 어디서 온 돈인지 (상금: 기업「과제」상 / 환원: 회차 이름 / 출금: 은행 계좌로) */
  title: string;
  dateLabel: string;
  /** 입금은 "+¥30,000", 출금은 "−¥10,000" */
  amountLabel: string;
  credit: boolean;
  /** 출금 신청 중이면 「申請中（デモ）」 */
  statusLabel: string | null;
}

export interface WalletVM {
  balanceYen: number;
  balanceLabel: string;
  totalsLabel: string;
  kycVerified: boolean;
  kycLabel: string;
  maxLabel: string;
  entries: WalletEntryVM[];
  /** 고지 ①~④ (順番どおり) */
  notices: { registration: string; kyc: string; tax: string; level: string };
}

/** 고지 ①~④ — 학생의 잔액 화면에 늘 보여요 */
export function walletNotices(locale: Locale): WalletVM["notices"] {
  return {
    registration: translate("wallet.notice.registration", locale),
    kyc: translate("wallet.notice.kyc", locale),
    tax: translate("wallet.notice.tax", locale),
    level: translate("wallet.notice.level", locale),
  };
}

function entryTitle(state: DemoState, entry: WalletEntry, locale: Locale): string {
  const source = entry.source;
  if (source?.kind === "prize") {
    const company = state.companies.find((c) => c.id === source.companyId);
    return translate("wallet.prizeTitle", locale, { company: company ? pick(company.name, locale) : "", title: pick(source.title, locale), award: awardLabel(source.award, locale) });
  }
  if (source?.kind === "return") return pick(source.round, locale);
  return translate("wallet.toBank", locale);
}

export function walletEntryVM(state: DemoState, entry: WalletEntry, locale: Locale): WalletEntryVM {
  const credit = entry.kind !== "withdrawal";
  return {
    id: entry.id,
    kind: entry.kind,
    emoji: WALLET_KIND_EMOJI[entry.kind],
    kindLabel: translate(`wallet.kind.${entry.kind}`, locale),
    title: entryTitle(state, entry, locale),
    dateLabel: formatDate(entry.date, locale),
    amountLabel: `${credit ? "+" : "−"}${formatYen(entry.amountYen, locale)}`,
    credit,
    statusLabel: entry.status === "requested" ? translate("wallet.status.requested", locale) : null,
  };
}

/** 원장 항목을 최신순으로 (같은 날이면 나중에 생긴 것이 위) */
function newestFirst(entries: readonly WalletEntry[]): WalletEntry[] {
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => b.entry.date.localeCompare(a.entry.date) || b.index - a.index)
    .map(({ entry }) => entry);
}

export function selectWallet(state: DemoState, locale: Locale): WalletVM {
  const t = makeT(locale);
  const totals = walletTotals(state.wallet.entries);
  const yen = (n: number) => formatYen(n, locale);
  return {
    balanceYen: totals.balanceYen,
    balanceLabel: yen(totals.balanceYen),
    totalsLabel: t("wallet.totals", { received: yen(totals.prizeYen + totals.returnYen), prize: yen(totals.prizeYen), ret: yen(totals.returnYen), withdrawn: yen(totals.withdrawnYen) }),
    kycVerified: state.wallet.kyc === "verified",
    kycLabel: state.wallet.kyc === "verified" && state.wallet.kycVerifiedOn ? t("wallet.kyc.verified", { date: formatDate(state.wallet.kycVerifiedOn, locale) }) : t("wallet.kyc.none"),
    maxLabel: yen(WITHDRAWAL_MAX_YEN),
    entries: newestFirst(state.wallet.entries).map((entry) => walletEntryVM(state, entry, locale)),
    notices: walletNotices(locale),
  };
}

/** 출금 폼의 오류 문구 (검사 결과가 null 이면 null) */
export function withdrawalErrorText(error: WithdrawalError | null, state: DemoState, locale: Locale): string | null {
  if (error === null) return null;
  const params = { balance: formatYen(walletTotals(state.wallet.entries).balanceYen, locale), max: formatYen(WITHDRAWAL_MAX_YEN, locale) };
  return translate(`wallet.error.${error}`, locale, params);
}

/** 화면에서 바로 쓰는 검사: 입력값(숫자 또는 null) → 오류 문구 */
export function checkWithdrawal(state: DemoState, amountYen: number | null, locale: Locale): string | null {
  return withdrawalErrorText(validateWithdrawal(state.wallet, amountYen), state, locale);
}

// ───────── 기업 화면 ─────────

export const prizeStatusLabel = (status: PrizeDepositStatus, locale: Locale): string => translate(`prize.status.${status}`, locale);

export interface PrizeRowVM {
  challengeId: string;
  title: string;
  amountLabel: string;
  status: PrizeDepositStatus;
  statusLabel: string;
  /** 예치한 날, 또는 송금·반환한 날 */
  dateLabel: string;
}

export interface PrizeDepositsVM {
  depositedLabel: string;
  paidLabel: string;
  refundedLabel: string;
  rows: PrizeRowVM[];
  note: string;
  refundNote: string;
}

/** 기업 대시보드: 우리 회사가 맡긴 상금 (預け入れ中 · 送金済み · 返金) */
export function selectPrizeDeposits(state: DemoState, locale: Locale): PrizeDepositsVM {
  const mine = state.prizeDeposits.filter((d) => d.companyId === state.myCompanyId);
  const sum = (status: PrizeDepositStatus) => mine.filter((d) => d.status === status).reduce((total, d) => total + d.amountYen, 0);
  const order: Record<PrizeDepositStatus, number> = { deposited: 0, paid: 1, refunded: 2 };
  return {
    depositedLabel: formatYen(sum("deposited"), locale),
    paidLabel: formatYen(sum("paid"), locale),
    refundedLabel: formatYen(sum("refunded"), locale),
    rows: mine
      .slice()
      .sort((a, b) => order[a.status] - order[b.status] || (b.settledOn ?? b.depositedOn).localeCompare(a.settledOn ?? a.depositedOn) || a.challengeId.localeCompare(b.challengeId))
      .map((d) => {
        const challenge = state.challenges.find((c) => c.id === d.challengeId);
        return {
          challengeId: d.challengeId,
          title: challenge ? pick(challenge.title, locale) : d.challengeId,
          amountLabel: formatYen(d.amountYen, locale),
          status: d.status,
          statusLabel: prizeStatusLabel(d.status, locale),
          dateLabel: formatDate(d.settledOn ?? d.depositedOn, locale),
        };
      }),
    note: translate("prize.companyNote", locale),
    refundNote: translate("prize.refundNote", locale),
  };
}

export interface PrizeNoticeVM {
  status: PrizeDepositStatus;
  text: string;
}

/** 응모자 화면: 고른 과제의 상금이 지금 어떤 상태인지 (상금이 없으면 null) */
export function prizeNotice(state: DemoState, challengeId: string | null, locale: Locale): PrizeNoticeVM | null {
  const deposit: PrizeDeposit | undefined = challengeId ? state.prizeDeposits.find((d) => d.challengeId === challengeId) : undefined;
  if (!deposit) return null;
  const amount = formatYen(deposit.amountYen, locale);
  const team = deposit.proposalId ? state.proposals.find((p) => p.id === deposit.proposalId)?.teamName : undefined;
  // 샘플의 끝난 과제처럼 받은 기획서가 목록에 없으면 팀 이름 없이 알려요
  const key: MessageKey = deposit.status === "paid" && !team ? "prize.applicants.paidWinner" : `prize.applicants.${deposit.status}`;
  return { status: deposit.status, text: translate(key, locale, { amount, team: team ?? "" }) };
}
