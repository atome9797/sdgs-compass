// 학생용 신청 요약(#22): 대학의 활동 장려 제도 등에 신청할 때 "활동 기록 자료"로 붙이는 A4 한 장의 화면 모델.
// 앱은 장학금을 주지 않고 대학·단체와 제휴하지 않았어요. 대학이 이 자료를 받아 주는지는 각 대학이 정해요 —
// 그래서 고지 문장(NOTE_KEYS)을 언제나 함께 내보내고, 웹은 인쇄·PDF, 모바일은 글로 공유해요.
// 계산은 기존 것을 그대로 써요: 활동 목록(deriveActivities) · Impact(selectImpact) · 증명서 번호(showableActivities 의 순서 — 증명서 화면과 같은 번호).
import { deriveActivities, showableActivities } from "./activities";
import { certificateFromActivity } from "./certificate";
import type { Activity, DemoState } from "./domain";
import { formatDate, formatNumber, formatPoints } from "./format";
import type { Locale } from "./i18n";
import { sdgLabel } from "./labels";
import { makeT, type MessageKey } from "./messages";
import type { SdgId } from "./sdg";
import { activityVM, certificateVM, selectImpact, type ActivityVM } from "./selectors";

// ───────── 기간 ─────────

/** 기간 프리셋: 전체 / 최근 1년 / 최근 6개월 */
export const SUMMARY_PERIODS = ["all", "year", "half"] as const;
export type SummaryPeriod = (typeof SUMMARY_PERIODS)[number];
export const DEFAULT_SUMMARY_PERIOD: SummaryPeriod = "all";
const PERIOD_MONTHS: Record<Exclude<SummaryPeriod, "all">, number> = { year: 12, half: 6 };

export function isSummaryPeriod(value: unknown): value is SummaryPeriod {
  return typeof value === "string" && (SUMMARY_PERIODS as readonly string[]).includes(value);
}

/** 주소의 ?period= 값 → 프리셋 (모르는 값·빈 값은 기본값) */
export function parseSummaryPeriod(raw: string | null | undefined): SummaryPeriod {
  const value = (raw ?? "").trim().toLowerCase();
  return isSummaryPeriod(value) ? value : DEFAULT_SUMMARY_PERIOD;
}

/**
 * 날짜(YYYY-MM-DD)에서 N개월 전의 같은 날. 그 달에 그 날이 없으면 그 달의 마지막 날이에요
 * (2026-03-31 의 1개월 전 = 2026-02-28). 기간은 이 날을 포함해요.
 */
export function monthsBefore(iso: string, months: number): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const total = y * 12 + (m - 1) - months;
  const year = Math.floor(total / 12);
  const month = total - year * 12 + 1;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = Math.min(d, lastDay);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** 기간의 시작일(포함). 전체 기간이면 null */
export function periodStart(today: string, period: SummaryPeriod): string | null {
  return period === "all" ? null : monthsBefore(today, PERIOD_MONTHS[period]);
}

/** 활동 날짜가 기간 안인가요? (시작일 포함. 끝은 따로 자르지 않아요 — 활동은 오늘까지만 생겨요) */
export function inSummaryPeriod(date: string, today: string, period: SummaryPeriod): boolean {
  const start = periodStart(today, period);
  return start === null || date.slice(0, 10) >= start;
}

// ───────── 화면 모델 ─────────

/** A4 한 장에 들어가도록 표에 보이는 줄 수를 정해요 (나머지는 "ほか n件") */
export const SUMMARY_MAX_ACTIVITIES = 10;
export const SUMMARY_MAX_CERTIFICATES = 4;

/** 늘 함께 보이는 고지 문장 (순서대로) */
export const SUMMARY_NOTE_KEYS = ["summary.note.record", "summary.note.check", "summary.note.partner", "summary.note.qr", "summary.note.sample"] as const satisfies readonly MessageKey[];

export type SummaryStatKey = "participations" | "submissions" | "awards" | "points";

export interface SummaryStatVM {
  key: SummaryStatKey;
  label: string;
  value: string;
}

export interface SummarySdgVM {
  id: SdgId;
  label: string;
  /** 이 SDG 가 붙은 활동 수 */
  count: number;
  countLabel: string;
}

export interface SummaryCertificateVM {
  id: string;
  kindLabel: string;
  title: string;
  companyName: string;
  awardLabel: string | null;
  issuedOnLabel: string;
  code: string;
  codeLabel: string;
  qrLabel: string;
  /** QR 모듈 행렬 (true = 어두운 칸) — 표시용 데모 */
  qr: boolean[][];
}

export interface ApplicationSummaryVM {
  period: SummaryPeriod;
  periodOptions: { id: SummaryPeriod; label: string; selected: boolean }[];
  docTitle: string;
  createdOnLabel: string;
  rangeLabel: string;
  holder: { name: string; affiliation: string; levelLabel: string; totalLabel: string };
  stats: SummaryStatVM[];
  /** 표에 보이는 활동 (최근 것부터, 최대 SUMMARY_MAX_ACTIVITIES) */
  activities: ActivityVM[];
  activitiesTotal: number;
  moreActivitiesLabel: string | null;
  /** 많이 관련된 SDG 부터 */
  sdgs: SummarySdgVM[];
  /** 수상 → 참가·제출 순 (증명서 화면과 같은 번호), 최대 SUMMARY_MAX_CERTIFICATES */
  certificates: SummaryCertificateVM[];
  certificatesTotal: number;
  moreCertificatesLabel: string | null;
  notes: string[];
  /** 기간 안에 활동이 하나도 없어요 */
  empty: boolean;
  /** 모바일 "글로 공유"에 쓰는 글 */
  shareText: string;
}

type ListedActivity = Activity & { kind: Exclude<Activity["kind"], "share"> };
const isListed = (activity: Activity): activity is ListedActivity => activity.kind !== "share";

/** 기간 안의 활동으로 신청 요약 한 장을 만들어요 (공유 기록은 신청 자료에 넣지 않아요) */
export function selectApplicationSummary(state: DemoState, locale: Locale, period: SummaryPeriod = DEFAULT_SUMMARY_PERIOD): ApplicationSummaryVM {
  const t = makeT(locale);
  const impact = selectImpact(state, locale);
  const inPeriod = (date: string) => inSummaryPeriod(date, state.today, period);

  const listed = deriveActivities(state).filter(isListed).filter((a) => inPeriod(a.date));
  const count = (kind: ListedActivity["kind"]) => listed.filter((a) => a.kind === kind).length;
  const points = listed.reduce((sum, a) => sum + a.points, 0);
  const countLabel = (n: number) => t("summary.count", { n: formatNumber(n) });

  const stats: SummaryStatVM[] = [
    { key: "participations", label: t("summary.stat.participations"), value: countLabel(count("participation")) },
    { key: "submissions", label: t("summary.stat.submissions"), value: countLabel(count("submission")) },
    { key: "awards", label: t("summary.stat.awards"), value: countLabel(count("award")) },
    { key: "points", label: t("summary.stat.points"), value: formatPoints(points) },
  ];

  // SDG 별: 그 SDG 가 붙은 활동 수(많은 순 → 번호 순)
  const perSdg = new Map<SdgId, number>();
  for (const activity of listed) for (const id of activity.sdgIds) perSdg.set(id, (perSdg.get(id) ?? 0) + 1);
  const sdgs: SummarySdgVM[] = [...perSdg.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .map(([id, n]) => ({ id, label: sdgLabel(id, locale), count: n, countLabel: countLabel(n) }));

  // 증명서: 증명서 화면과 같은 번호가 되도록 "알릴 수 있는 활동 전체"의 순서로 번호를 매긴 뒤 기간으로 걸러요
  const certificates = showableActivities(state).flatMap((activity, index) => {
    if (!inPeriod(activity.date)) return [];
    const cert = certificateFromActivity(activity, state.me.nickname, index);
    if (!cert) return [];
    const vm = certificateVM(cert, locale);
    const item: SummaryCertificateVM = {
      id: cert.id,
      kindLabel: vm.kindLabel,
      title: vm.challengeTitle,
      companyName: vm.companyName,
      awardLabel: vm.awardLabel,
      issuedOnLabel: vm.issuedOnLabel,
      code: vm.code,
      codeLabel: t("summary.certs.code", { code: vm.code }),
      qrLabel: t("summary.certs.qrLabel", { id: cert.id }),
      qr: vm.qr,
    };
    return [item];
  });

  const start = periodStart(state.today, period);
  const to = formatDate(state.today, locale);
  const rangeLabel = start === null ? t("summary.rangeAll", { to }) : t("summary.range", { from: formatDate(start, locale), to });
  const activities = listed.map((a) => activityVM(a, locale));
  const shownActivities = activities.slice(0, SUMMARY_MAX_ACTIVITIES);
  const shownCertificates = certificates.slice(0, SUMMARY_MAX_CERTIFICATES);
  const notes = SUMMARY_NOTE_KEYS.map((key) => t(key));
  const holder = { name: impact.nickname, affiliation: `${impact.university} · ${impact.faculty}`, levelLabel: impact.levelLabel, totalLabel: impact.totalLabel };
  const docTitle = t("summary.docTitle");

  const vm: Omit<ApplicationSummaryVM, "shareText"> = {
    period,
    periodOptions: SUMMARY_PERIODS.map((id) => ({ id, label: t(`summary.period.${id}`), selected: id === period })),
    docTitle,
    createdOnLabel: t("summary.createdOn", { date: to }),
    rangeLabel,
    holder,
    stats,
    activities: shownActivities,
    activitiesTotal: activities.length,
    moreActivitiesLabel: activities.length > shownActivities.length ? t("summary.activities.more", { n: formatNumber(activities.length - shownActivities.length) }) : null,
    sdgs,
    certificates: shownCertificates,
    certificatesTotal: certificates.length,
    moreCertificatesLabel:
      certificates.length > shownCertificates.length ? t("summary.certs.more", { n: formatNumber(certificates.length - shownCertificates.length) }) : null,
    notes,
    empty: listed.length === 0,
  };
  const counts = { participations: count("participation"), submissions: count("submission"), awards: count("award"), points };
  return { ...vm, shareText: summaryShareText(vm, counts, activities, certificates, locale) };
}

/** 모바일 공유용 글: 표의 줄 수 제한 없이 기간 안의 활동·증명서를 모두 적고, 고지 문장으로 끝내요 */
function summaryShareText(
  vm: Omit<ApplicationSummaryVM, "shareText">,
  counts: { participations: number; submissions: number; awards: number; points: number },
  activities: readonly ActivityVM[],
  certificates: readonly SummaryCertificateVM[],
  locale: Locale,
): string {
  const t = makeT(locale);
  const paren = (text: string) => (locale === "ja" ? `（${text}）` : `(${text})`);
  const lines: string[] = [
    vm.docTitle,
    vm.createdOnLabel,
    t("summary.text.holder", { name: vm.holder.name, affiliation: vm.holder.affiliation }),
    t("summary.text.range", { range: vm.rangeLabel }),
    t("summary.text.counts", {
      participations: formatNumber(counts.participations),
      submissions: formatNumber(counts.submissions),
      awards: formatNumber(counts.awards),
      points: formatPoints(counts.points),
    }),
  ];
  if (activities.length > 0) {
    lines.push("", t("summary.text.activities"));
    for (const a of activities) lines.push(`- ${a.dateLabel} ${a.kindLabel}${a.awardLabel ? paren(a.awardLabel) : ""} ${a.title} / ${a.companyName}`);
  } else {
    lines.push("", t("summary.activities.empty"));
  }
  if (certificates.length > 0) {
    lines.push("", t("summary.text.certs"));
    for (const c of certificates) lines.push(`- ${c.id} ${c.kindLabel} ${c.codeLabel}`);
  }
  lines.push("", ...vm.notes.map((note) => `※ ${note}`));
  return lines.join("\n");
}
