// 상금의 화면 모델 (2026-11-08 직접 지급 모델): 학생의 「受け取った賞金」(받은 상금·특별상의 기록), 기업 대시보드의 상금 지급 현황, 응모자 화면의 지급 안내.
// 웹·모바일이 같은 결과를 그려요. 규칙은 wallet.ts(상금)와 fees.ts(수수료)에 있어요.
import type { DemoState, PrizePayment, PrizePaymentStatus, WalletEntry, WalletEntryKind } from "./domain";
import { platformFeeFor } from "./fees";
import { formatDate, formatYen } from "./format";
import { pick, type Locale } from "./i18n";
import { awardLabel } from "./labels";
import { makeT, translate, type MessageKey } from "./messages";
import { prizeRefOf } from "./network";
import { walletTotals } from "./wallet";

export const WALLET_KIND_EMOJI: Record<WalletEntryKind, string> = { prize: "🏆", return: "🤝" };

export interface WalletEntryVM {
  id: string;
  kind: WalletEntryKind;
  emoji: string;
  kindLabel: string;
  /** 어디서 온 돈인지 (상금: 기업「과제」상 / 특별상: 회차 이름) */
  title: string;
  dateLabel: string;
  /** "+¥30,000" */
  amountLabel: string;
  /** 상금을 지급한 기업 (특별상이면 null) — 받은 뒤 그 기업을 평가할 때 써요 */
  companyId: string | null;
  /** 그 평가의 대상 거래(network.ts prizeRefOf: 과제 id · 활동 id · 기록 id), 특별상이면 null */
  ratingRef: string | null;
}

export interface WalletVM {
  totalYen: number;
  totalLabel: string;
  totalsLabel: string;
  entries: WalletEntryVM[];
  /** 고지 ①~③ (順番どおり) */
  notices: { direct: string; tax: string; skills: string };
}

/** 고지 ①~③ — 학생의 「受け取った賞金」 화면에 늘 보여요 */
export function walletNotices(locale: Locale): WalletVM["notices"] {
  return {
    direct: translate("wallet.notice.direct", locale),
    tax: translate("wallet.notice.tax", locale),
    skills: translate("wallet.notice.skills", locale),
  };
}

function entryTitle(state: DemoState, entry: WalletEntry, locale: Locale): string {
  const source = entry.source;
  if (source.kind === "prize") {
    const company = state.companies.find((c) => c.id === source.companyId);
    return translate("wallet.prizeTitle", locale, { company: company ? pick(company.name, locale) : "", title: pick(source.title, locale), award: awardLabel(source.award, locale) });
  }
  return pick(source.round, locale);
}

export function walletEntryVM(state: DemoState, entry: WalletEntry, locale: Locale): WalletEntryVM {
  return {
    id: entry.id,
    kind: entry.kind,
    emoji: WALLET_KIND_EMOJI[entry.kind],
    kindLabel: translate(`wallet.kind.${entry.kind}`, locale),
    title: entryTitle(state, entry, locale),
    dateLabel: formatDate(entry.date, locale),
    amountLabel: `+${formatYen(entry.amountYen, locale)}`,
    companyId: entry.source.kind === "prize" ? entry.source.companyId : null,
    ratingRef: entry.source.kind === "prize" ? prizeRefOf(entry.source, entry.id) : null,
  };
}

/** 최신순 (같은 날이면 나중에 생긴 것이 위) */
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
    totalYen: totals.totalYen,
    totalLabel: yen(totals.totalYen),
    totalsLabel: t("wallet.totals", { prize: yen(totals.prizeYen), ret: yen(totals.returnYen) }),
    entries: newestFirst(state.wallet.entries).map((entry) => walletEntryVM(state, entry, locale)),
    notices: walletNotices(locale),
  };
}

// ───────── 기업 화면 ─────────

export const prizeStatusLabel = (status: PrizePaymentStatus, locale: Locale): string => translate(`prize.status.${status}`, locale);

export interface PrizeRowVM {
  challengeId: string;
  title: string;
  amountLabel: string;
  /** 지급했거나 지급할 때의 수수료 (상금의 10%, 최저 ¥9,000) */
  feeLabel: string;
  status: PrizePaymentStatus;
  statusLabel: string;
  /** 상금을 건 날, 또는 지급한 날 */
  dateLabel: string;
}

export interface PrizePaymentsVM {
  promisedLabel: string;
  paidLabel: string;
  rows: PrizeRowVM[];
  note: string;
}

/** 기업 대시보드: 우리 회사가 건 상금 (表彰待ち · 支払い済み · 最優秀賞なし) */
export function selectPrizePayments(state: DemoState, locale: Locale): PrizePaymentsVM {
  const mine = state.prizePayments.filter((p) => p.companyId === state.myCompanyId);
  const sum = (status: PrizePaymentStatus) => mine.filter((p) => p.status === status).reduce((total, p) => total + p.amountYen, 0);
  const order: Record<PrizePaymentStatus, number> = { promised: 0, choosing: 1, paid: 2, itemChosen: 3, noWinner: 4 };
  return {
    // 아직 지급하지 않은 상금 = 표창 전 + 수상 팀이 고르는 중(#47)
    promisedLabel: formatYen(sum("promised") + sum("choosing"), locale),
    paidLabel: formatYen(sum("paid"), locale),
    rows: mine
      .slice()
      .sort((a, b) => order[a.status] - order[b.status] || (b.paidOn ?? b.promisedOn).localeCompare(a.paidOn ?? a.promisedOn) || a.challengeId.localeCompare(b.challengeId))
      .map((p) => {
        const challenge = state.challenges.find((c) => c.id === p.challengeId);
        return {
          challengeId: p.challengeId,
          title: challenge ? pick(challenge.title, locale) : p.challengeId,
          amountLabel: formatYen(p.amountYen, locale),
          // 상금을 지급하지 않는 경우(최우수상 없음 · 상품을 고름, #47)는 수수료도 없어요
          feeLabel: p.status === "noWinner" || p.status === "itemChosen" ? "—" : formatYen(platformFeeFor(p.amountYen), locale),
          status: p.status,
          statusLabel: prizeStatusLabel(p.status, locale),
          dateLabel: formatDate(p.paidOn ?? p.promisedOn, locale),
        };
      }),
    note: translate("prize.companyNote", locale),
  };
}

export interface PrizeNoticeVM {
  status: PrizePaymentStatus;
  text: string;
}

/** 응모자 화면: 고른 과제의 상금을 어떻게 지급하는지 / 지급했는지 (상금이 없으면 null) */
export function prizeNotice(state: DemoState, challengeId: string | null, locale: Locale): PrizeNoticeVM | null {
  const payment: PrizePayment | undefined = challengeId ? state.prizePayments.find((p) => p.challengeId === challengeId) : undefined;
  if (!payment) return null;
  const amount = formatYen(payment.amountYen, locale);
  const fee = formatYen(platformFeeFor(payment.amountYen), locale);
  const team = payment.proposalId ? state.proposals.find((p) => p.id === payment.proposalId)?.teamName : undefined;
  // 샘플의 끝난 과제처럼 받은 기획서가 목록에 없으면 팀 이름 없이 알려요
  const key: MessageKey = payment.status === "paid" && !team ? "prize.applicants.paidWinner" : `prize.applicants.${payment.status}`;
  return { status: payment.status, text: translate(key, locale, { amount, fee, team: team ?? "" }) };
}
