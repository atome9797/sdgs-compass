// 운영자 화면 ① 이용 현황: 데모 상태(DemoState)를 운영자가 보기 좋은 숫자로 집계해요. React·DOM 이 없는 순수 함수라 시험으로 값을 못 박아요.
// 지어내지 않아요: 날짜가 있는 기록(글·기획서·스카우트·팀원 모집·매칭·활동 기록)만 기간(7/30/90일)으로 묶고,
// 날짜가 없거나 의미 있게 나눌 수 없는 것(학생 수, 챌린지 상태 …)은 "지금 값"으로만 보여 줘요. 설계는 docs/admin.md.
import { showableActivities } from "./activities";
import type { ChallengeStatus, DemoState, OfficialChannel, PrPost, ProposalStatus, ScoutStatus } from "./domain";
import { summarizeMatches } from "./fees";
import { addDays, daysBetween, formatDateShort, formatYen } from "./format";
import type { Locale, Text } from "./i18n";
import { sdgName } from "./labels";
import { translate, type MessageKey } from "./messages";
import { DEFAULT_OFFICIAL_CHANNEL, isOfficialChannel, OFFICIAL_CHANNELS } from "./post";
import { SDG_IDS, type SdgId } from "./sdg";

// ───────── 기간 ─────────
export const USAGE_RANGES = [7, 30, 90] as const;
export type UsageRange = (typeof USAGE_RANGES)[number];
export const DEFAULT_USAGE_RANGE: UsageRange = 30;

export function isUsageRange(value: unknown): value is UsageRange {
  return USAGE_RANGES.some((range) => range === value);
}

/** 구간 하나의 날수: 7일은 하루씩, 30일은 5일씩, 90일은 10일씩 (모두 나누어떨어져서 기간이 정확히 맞아요) */
export const USAGE_BUCKET_DAYS: Record<UsageRange, number> = { 7: 1, 30: 5, 90: 10 };

export const USAGE_RANGE_LABEL: Record<UsageRange, MessageKey> = {
  7: "admin.usage.range.7",
  30: "admin.usage.range.30",
  90: "admin.usage.range.90",
};

/** 구간 길이를 말로: 1 → "1日" / 5 → "5日" / 10 → "10日" */
export const USAGE_UNIT_LABEL: Record<number, MessageKey> = {
  1: "admin.usage.unit.1",
  5: "admin.usage.unit.5",
  10: "admin.usage.unit.10",
};

// ───────── 날짜가 있는 기록 ─────────
export const USAGE_EVENT_KINDS = ["posts", "proposals", "scouts", "teamPosts", "matches", "activities"] as const;
export type UsageEventKind = (typeof USAGE_EVENT_KINDS)[number];

export const USAGE_EVENT_LABEL: Record<UsageEventKind, MessageKey> = {
  posts: "admin.usage.event.posts",
  proposals: "admin.usage.event.proposals",
  scouts: "admin.usage.event.scouts",
  teamPosts: "admin.usage.event.teamPosts",
  matches: "admin.usage.event.matches",
  activities: "admin.usage.event.activities",
};

/**
 * 날짜(YYYY-MM-DD)가 있는 기록만 모아요. 활동 기록(activities)은 데모 학생의 "앱을 쓰기 전의 기록"(history)이에요 —
 * 내가 데모에서 올린 제출은 기획서(proposals)에 이미 있어서, 두 번 세지 않으려고 파생 활동(deriveActivities)은 쓰지 않아요.
 */
export function usageEventDates(state: DemoState): Record<UsageEventKind, string[]> {
  const day = (iso: string) => iso.slice(0, 10);
  return {
    posts: state.posts.map((post) => day(post.createdAt)),
    proposals: state.proposals.map((proposal) => day(proposal.submittedAt)),
    scouts: state.scouts.map((scout) => day(scout.sentAt)),
    teamPosts: state.teamPosts.map((post) => day(post.createdOn)),
    matches: state.matches.map((match) => day(match.matchedOn)),
    activities: state.history.map((activity) => day(activity.date)),
  };
}

export interface UsageBucket {
  /** 구간의 첫 날 / 마지막 날 */
  start: string;
  end: string;
  counts: Record<UsageEventKind, number>;
  total: number;
}

export interface UsageTimeline {
  range: UsageRange;
  unitDays: number;
  /** 기간의 첫 날 ~ 기준일 */
  from: string;
  to: string;
  buckets: UsageBucket[];
  /** 기간 내 합계 */
  totals: Record<UsageEventKind, number>;
  total: number;
  /** 움직임이 가장 많았던 구간 (같으면 더 최근 구간, 전부 0 이면 null) */
  busiest: UsageBucket | null;
}

const emptyCounts = (): Record<UsageEventKind, number> => ({ posts: 0, proposals: 0, scouts: 0, teamPosts: 0, matches: 0, activities: 0 });

/** 기준일에서 거꾸로 range 일을 구간으로 나눠 세요. 기간 밖(너무 옛날이거나 기준일 이후)의 기록은 세지 않아요. */
export function buildUsageTimeline(dates: Record<UsageEventKind, readonly string[]>, today: string, range: UsageRange): UsageTimeline {
  const unitDays = USAGE_BUCKET_DAYS[range];
  const from = addDays(today, -(range - 1));
  const buckets: UsageBucket[] = [];
  for (let i = 0; i < range / unitDays; i++) {
    const start = addDays(from, i * unitDays);
    buckets.push({ start, end: addDays(start, unitDays - 1), counts: emptyCounts(), total: 0 });
  }
  const totals = emptyCounts();
  for (const kind of USAGE_EVENT_KINDS) {
    for (const date of dates[kind]) {
      const offset = daysBetween(from, date);
      if (offset < 0 || offset >= range) continue;
      const bucket = buckets[Math.floor(offset / unitDays)];
      bucket.counts[kind] += 1;
      bucket.total += 1;
      totals[kind] += 1;
    }
  }
  let busiest: UsageBucket | null = null;
  for (const bucket of buckets) {
    if (bucket.total > 0 && (busiest === null || bucket.total >= busiest.total)) busiest = bucket;
  }
  const total = USAGE_EVENT_KINDS.reduce((sum, kind) => sum + totals[kind], 0);
  return { range, unitDays, from, to: today, buckets, totals, total, busiest };
}

/** 한 종류의 구간별 숫자 (스파크라인용) */
export function timelineSeries(timeline: UsageTimeline, kind: UsageEventKind): number[] {
  return timeline.buckets.map((bucket) => bucket.counts[kind]);
}

/** 구간의 이름표: 하루짜리는 날짜 하나, 그 이상은 첫 날 ("10/26") */
export function bucketLabel(bucket: UsageBucket): string {
  return formatDateShort(bucket.start);
}

// ───────── 지금 값 ─────────
export interface UsageTotals {
  /** 데모 학생(나) + 인재 풀의 학생 */
  students: number;
  scoutableStudents: number;
  companies: number;
  verifiedCompanies: number;
  challenges: number;
  challengesByStatus: Record<ChallengeStatus, number>;
  /** 챌린지에 모인 응모자 합계 (챌린지의 applicants) */
  applicants: number;
  proposals: number;
  proposalsByStatus: Record<ProposalStatus, number>;
  /** 기획서의 수상 + 데모 학생의 과거 활동 기록의 수상 */
  awards: number;
  /** 발급할 수 있는 증명서 (데모 학생의 참가·제출·수상 활동마다 1장) */
  certificates: number;
  scouts: number;
  scoutsByStatus: Record<ScoutStatus, number>;
  matches: number;
  feeYen: number;
  donationYen: number;
  teamPosts: number;
  posts: number;
  bragPosts: number;
  prPosts: number;
  likes: number;
  /** 공식 SNS 게시를 신청한 홍보 글 */
  officialShares: number;
  /** 공식 SNS 게시 신청을 채널별로 센 값 (신청이 없는 채널도 0 으로 있어요. 화면에 보이는 순서는 post.ts 의 OFFICIAL_CHANNELS) */
  officialByChannel: Record<OfficialChannel, number>;
}

/** 공식 SNS 게시 신청을 채널별로 세요. 채널이 비었거나 모르는 값이면(채널 선택이 생기기 전의 옛 데이터) 기본 채널로 세서 합계가 맞게 해요 */
function countOfficialByChannel(prPosts: readonly PrPost[]): Record<OfficialChannel, number> {
  const counts = Object.fromEntries(OFFICIAL_CHANNELS.map((channel) => [channel, 0])) as Record<OfficialChannel, number>;
  for (const post of prPosts) {
    if (post.official === null) continue;
    const channel: OfficialChannel = isOfficialChannel(post.official.channel) ? post.official.channel : DEFAULT_OFFICIAL_CHANNEL;
    counts[channel] += 1;
  }
  return counts;
}

export function summarizeTotals(state: DemoState): UsageTotals {
  const students = [state.me, ...state.talent];
  const fees = summarizeMatches(state.matches);
  const challengesByStatus: Record<ChallengeStatus, number> = { open: 0, judging: 0, closed: 0 };
  for (const challenge of state.challenges) challengesByStatus[challenge.status] += 1;
  const proposalsByStatus: Record<ProposalStatus, number> = { submitted: 0, reviewed: 0, awarded: 0, adopted: 0 };
  for (const proposal of state.proposals) proposalsByStatus[proposal.status] += 1;
  const scoutsByStatus: Record<ScoutStatus, number> = { sent: 0, read: 0, accepted: 0, declined: 0 };
  for (const scout of state.scouts) scoutsByStatus[scout.status] += 1;
  const bragPosts = state.posts.filter((post) => post.kind === "brag").length;
  const prPosts = state.posts.filter((post): post is PrPost => post.kind === "pr");
  return {
    students: students.length,
    scoutableStudents: students.filter((student) => student.scoutable).length,
    companies: state.companies.length,
    verifiedCompanies: state.companies.filter((company) => company.verified).length,
    challenges: state.challenges.length,
    challengesByStatus,
    applicants: state.challenges.reduce((sum, challenge) => sum + challenge.applicants, 0),
    proposals: state.proposals.length,
    proposalsByStatus,
    awards: state.proposals.filter((proposal) => proposal.award !== null).length + state.history.filter((activity) => activity.kind === "award").length,
    certificates: showableActivities(state).length,
    scouts: state.scouts.length,
    scoutsByStatus,
    matches: fees.count,
    feeYen: fees.feeYen,
    donationYen: fees.donationYen,
    teamPosts: state.teamPosts.length,
    posts: state.posts.length,
    bragPosts,
    prPosts: prPosts.length,
    likes: state.posts.reduce((sum, post) => sum + post.likes, 0),
    officialShares: prPosts.filter((post) => post.official !== null).length,
    officialByChannel: countOfficialByChannel(prPosts),
  };
}

// ───────── SDGs 별 ─────────
export interface SdgUsage {
  sdgId: SdgId;
  /** 이 SDGs 가 붙은 챌린지의 응모자 합계 (SDGs 가 여러 개 붙은 챌린지는 각각에 세요) */
  applicants: number;
  challenges: number;
  /** 관심 SDGs 에 이 목표를 고른 학생 수 */
  interests: number;
}

/** 17개 목표 전부를 응모자가 많은 순(같으면 챌린지 수 → 관심 학생 수 → 번호 순)으로 */
export function summarizeSdgs(state: DemoState): SdgUsage[] {
  const students = [state.me, ...state.talent];
  const rows: SdgUsage[] = SDG_IDS.map((sdgId) => ({
    sdgId,
    applicants: state.challenges.filter((challenge) => challenge.sdgIds.includes(sdgId)).reduce((sum, challenge) => sum + challenge.applicants, 0),
    challenges: state.challenges.filter((challenge) => challenge.sdgIds.includes(sdgId)).length,
    interests: students.filter((student) => student.sdgInterests.includes(sdgId)).length,
  }));
  return rows.sort((a, b) => b.applicants - a.applicants || b.challenges - a.challenges || b.interests - a.interests || a.sdgId - b.sdgId);
}

// ───────── 챌린지별 ─────────
export interface ChallengeUsageRow {
  id: string;
  title: Text;
  companyName: Text;
  status: ChallengeStatus;
  applicants: number;
  /** 제출된 기획서 수 */
  proposals: number;
  closesOn: string;
}

const STATUS_ORDER: Record<ChallengeStatus, number> = { open: 0, judging: 1, closed: 2 };

/** 모집 중(마감이 가까운 순) → 심사 중 → 마감(최근 마감 순) */
export function summarizeChallenges(state: DemoState): ChallengeUsageRow[] {
  const rows = state.challenges.map<ChallengeUsageRow>((challenge) => ({
    id: challenge.id,
    title: challenge.title,
    companyName: state.companies.find((company) => company.id === challenge.companyId)?.name ?? "",
    status: challenge.status,
    applicants: challenge.applicants,
    proposals: state.proposals.filter((proposal) => proposal.challengeId === challenge.id).length,
    closesOn: challenge.closesOn,
  }));
  return rows.sort((a, b) => {
    if (a.status !== b.status) return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    const byDate = a.status === "closed" ? b.closesOn.localeCompare(a.closesOn) : a.closesOn.localeCompare(b.closesOn);
    return byDate || a.id.localeCompare(b.id);
  });
}

// ───────── 한 번에 ─────────
export interface UsageSummary {
  asOf: string;
  totals: UsageTotals;
  timeline: UsageTimeline;
  /** 17개 목표 전부 (응모자 많은 순) */
  sdgs: SdgUsage[];
  /** 기획서 상태별 (제출 → 심사 완료 → 수상 → 채택 순) */
  proposalStatus: { status: ProposalStatus; count: number }[];
  challenges: ChallengeUsageRow[];
}

export const PROPOSAL_STATUS_ORDER: readonly ProposalStatus[] = ["submitted", "reviewed", "awarded", "adopted"];

export function summarizeUsage(state: DemoState, range: UsageRange = DEFAULT_USAGE_RANGE): UsageSummary {
  const totals = summarizeTotals(state);
  return {
    asOf: state.today,
    totals,
    timeline: buildUsageTimeline(usageEventDates(state), state.today, range),
    sdgs: summarizeSdgs(state),
    proposalStatus: PROPOSAL_STATUS_ORDER.map((status) => ({ status, count: totals.proposalsByStatus[status] })),
    challenges: summarizeChallenges(state),
  };
}

// ───────── 한 줄 읽기 ─────────
/**
 * 지금 값(기간과 상관없는 합계)에서 읽히는 사실만 문장으로 (해석을 덧붙여 지어내지 않아요). 값이 0 인 항목은 말하지 않아요.
 * 기간을 바꿔도 달라지지 않는 문장들이라, 화면에서는 기간 선택 위쪽에 둬요.
 */
export function usageCurrentInsights(summary: UsageSummary, locale: Locale): string[] {
  const { totals } = summary;
  const lines: string[] = [];
  const top = summary.sdgs[0];
  if (top && top.applicants > 0) lines.push(translate("admin.usage.insight.topSdg", locale, { name: sdgName(top.sdgId, locale), n: top.applicants }));
  lines.push(translate("admin.usage.insight.challenges", locale, { open: totals.challengesByStatus.open, applicants: totals.applicants }));
  if (totals.posts > 0) {
    lines.push(translate("admin.usage.insight.feed", locale, { posts: totals.posts, brag: totals.bragPosts, pr: totals.prPosts, likes: totals.likes }));
  }
  if (totals.matches > 0) {
    lines.push(
      translate("admin.usage.insight.matches", locale, {
        matches: totals.matches,
        fee: formatYen(totals.feeYen, locale),
        donation: formatYen(totals.donationYen, locale),
      }),
    );
  }
  if (totals.scouts > 0) {
    lines.push(translate("admin.usage.insight.scouts", locale, { total: totals.scouts, accepted: totals.scoutsByStatus.accepted, read: totals.scoutsByStatus.read }));
  }
  if (totals.officialShares > 0) lines.push(translate("admin.usage.insight.official", locale, { n: totals.officialShares }));
  return lines;
}

/** 고른 기간 안에서 가장 움직임이 많았던 구간 한 줄 (기간 안에 움직임이 없으면 null). 기간을 바꾸면 달라져요 */
export function usagePeriodInsight(summary: UsageSummary, locale: Locale): string | null {
  const { timeline } = summary;
  if (!timeline.busiest) return null;
  return translate("admin.usage.insight.busy", locale, {
    range: translate(USAGE_RANGE_LABEL[timeline.range], locale),
    label: bucketLabel(timeline.busiest),
    n: timeline.busiest.total,
  });
}

/** 위 두 가지를 이어 붙인 전체 (지금 값 문장 → 기간 문장 순서) */
export function usageInsights(summary: UsageSummary, locale: Locale): string[] {
  const period = usagePeriodInsight(summary, locale);
  return period === null ? usageCurrentInsights(summary, locale) : [...usageCurrentInsights(summary, locale), period];
}
