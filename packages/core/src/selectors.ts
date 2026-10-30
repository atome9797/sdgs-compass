// 화면용 데이터(뷰 모델) 만들기. 상태(DemoState)와 언어(Locale)를 받아 "그대로 그리면 되는" 글자·숫자로 바꿔 줘요.
// 웹·모바일 화면은 이 함수들의 결과만 그려서 두 앱의 표시 내용이 늘 같고, 계산·번역 실수는 core 테스트가 잡아요.
import { deriveActivities, showableActivities, type ShowableActivity } from "./activities";
import { CERT_CRITERIA, criterionOf, evaluateCertification, type CertUnit, type EsgCategory } from "./certification";
import { certificateFromActivity, certificateIdAt, qrPayload, verifyCode, type Certificate } from "./certificate";
import type { Activity, ActivityKind, AwardKind, Candidate, Challenge, ChallengeStatus, CertCriterionId, Company, DemoState, OfficialChannel, PostKind, Proposal, ProposalStatus, Review, Role, ScoutKind, ScoutStatus, SkillId, SocialPost } from "./domain";
import { summarizeMatches, splitMatchFee } from "./fees";
import { dDayLabel, daysBetween, formatBytes, formatDate, formatDateShort, formatDateTime, formatNumber, formatPeople, formatPoints, formatYen } from "./format";
import { computeBadges, computeImpactIndex, BADGE_EMOJI, levelProgress, levelOf, type BadgeCode } from "./impact";
import { pick, type Locale } from "./i18n";
import { awardLabel, challengeStatusLabel, participationLabel, proposalStatusLabel, rewardLabel, scoutKindLabel, sdgShort, skillLabel } from "./labels";
import { makeT, translate, type TFunction } from "./messages";
import { authorRole, bodyLimit, DEFAULT_OFFICIAL_CHANNEL, defaultPrSdgs, nextOfficialDate, OFFICIAL_CHANNELS, OFFICIAL_SHARE_FEE_YEN, officialChannelFormat, officialChannelLabel, officialChannelName, POST_LIMITS } from "./post";
import { qrMatrix } from "./qr";
import { isOpenFor, recommendChallenges, scoreChallenge, type Reason, type Recommendation } from "./recommend";
import { remainingScouts, SCOUT_DAILY_LIMIT, alreadyScouted, canSendScout } from "./scout";
import { buildShareCard, type CardTemplate, type ShareCard } from "./shareCard";
import { getSdg, sdgTextColor, SDG_IDS, SDGS, type SdgId } from "./sdg";

// ───────── 공통 조각 ─────────

export interface SdgTileVM {
  id: SdgId;
  color: string;
  textColor: string;
  short: string;
  name: string;
}

export function selectSdgTiles(locale: Locale): SdgTileVM[] {
  return SDGS.map((sdg) => ({ id: sdg.id, color: sdg.color, textColor: sdgTextColor(sdg.id), short: sdg.short[locale], name: sdg.name[locale] }));
}

export interface ActivityVM {
  id: string;
  kind: ActivityKind;
  kindLabel: string;
  title: string;
  companyName: string;
  dateLabel: string;
  pointsLabel: string;
  awardLabel: string | null;
  sdgIds: SdgId[];
}

export function activityVM(activity: Activity, locale: Locale): ActivityVM {
  return {
    id: activity.id,
    kind: activity.kind,
    kindLabel: translate(`activity.${activity.kind}`, locale),
    title: pick(activity.title, locale),
    companyName: pick(activity.companyName, locale),
    dateLabel: formatDate(activity.date, locale),
    pointsLabel: translate("activity.points", locale, { points: formatNumber(activity.points) }),
    awardLabel: activity.award ? awardLabel(activity.award, locale) : null,
    sdgIds: activity.sdgIds,
  };
}

function companyOf(state: DemoState, id: string): Company | undefined {
  return state.companies.find((c) => c.id === id);
}

function reasonText(reason: Reason, locale: Locale): string {
  switch (reason.code) {
    case "sdg":
      return translate("reason.sdg", locale, { sdgs: reason.sdgIds.map((id) => sdgShort(id, locale)).join("・") });
    case "skill":
      return translate("reason.skill", locale, { skills: reason.skills.map((s) => skillLabel(s, locale)).join("・") });
    case "deadline":
      return translate("reason.deadline", locale, { days: reason.days });
    case "prize":
      return translate("reason.prize", locale, { amount: formatYen(reason.yen, locale) });
    case "internship":
      return translate("reason.internship", locale);
  }
}

// ───────── 챌린지 카드 ─────────

export interface ChallengeCardVM {
  id: string;
  title: string;
  summary: string;
  companyName: string;
  companyEmoji: string;
  companyAccent: string;
  sdgIds: SdgId[];
  hue: number;
  daysLeft: number;
  dDay: string;
  closesOnLabel: string;
  status: ChallengeStatus;
  statusLabel: string;
  isOpen: boolean;
  prizeLabel: string | null;
  rewardLabels: string[];
  participationLabel: string;
  impactLabel: string;
  applicantsLabel: string;
  bookmarked: boolean;
  /** 내가 제출한 최신 버전 번호 (제출 전이면 null) */
  submittedVersion: number | null;
  /** 매칭률 0~100 (추천 계산을 한 경우만) */
  match: number | null;
  reasons: string[];
}

export function challengeCard(state: DemoState, challenge: Challenge, locale: Locale, recommendation?: Recommendation): ChallengeCardVM {
  const company = companyOf(state, challenge.companyId);
  const daysLeft = daysBetween(state.today, challenge.closesOn);
  const mine = state.proposals.find((p) => p.challengeId === challenge.id && p.mine);
  const rec = recommendation ?? scoreChallenge(state.me, challenge, state.today);
  return {
    id: challenge.id,
    title: pick(challenge.title, locale),
    summary: pick(challenge.summary, locale),
    companyName: company ? pick(company.name, locale) : "",
    companyEmoji: company?.emoji ?? "🏢",
    companyAccent: company?.accent ?? "#1D6FB8",
    sdgIds: challenge.sdgIds,
    hue: challenge.hue,
    daysLeft,
    dDay: dDayLabel(daysLeft, locale),
    closesOnLabel: formatDate(challenge.closesOn, locale),
    status: challenge.status,
    statusLabel: challengeStatusLabel(challenge.status, locale),
    isOpen: isOpenFor(challenge, state.today),
    prizeLabel: challenge.prizeYen > 0 ? formatYen(challenge.prizeYen, locale) : null,
    rewardLabels: challenge.rewards.map((r) => rewardLabel(r, locale)),
    participationLabel: participationLabel(challenge.participation, locale),
    impactLabel: `+${formatNumber(challenge.impactPoints)} pt`,
    applicantsLabel: translate("challenge.applicants", locale, { count: formatPeople(challenge.applicants, locale) }),
    bookmarked: state.bookmarks.includes(challenge.id),
    submittedVersion: mine ? mine.versions.length : null,
    match: rec.score,
    reasons: rec.reasons.map((r) => reasonText(r, locale)),
  };
}

// ───────── 홈(SCR-01)·검색 ─────────

export interface HomeVM {
  nickname: string;
  sdgTiles: SdgTileVM[];
  recommended: ChallengeCardVM[];
  soon: ChallengeCardVM[];
  activities: ActivityVM[];
}

export function selectHome(state: DemoState, locale: Locale): HomeVM {
  const recs = recommendChallenges({ profile: state.me, challenges: state.challenges, today: state.today, limit: 5 });
  const recommended = recs.map((rec) => challengeCard(state, rec.challenge, locale, rec));
  const soon = state.challenges
    .filter((c) => isOpenFor(c, state.today))
    .sort((a, b) => a.closesOn.localeCompare(b.closesOn) || a.id.localeCompare(b.id))
    .slice(0, 3)
    .map((c) => challengeCard(state, c, locale));
  const activities = deriveActivities(state).filter((a) => a.kind !== "share").slice(0, 3).map((a) => activityVM(a, locale));
  return { nickname: state.me.nickname, sdgTiles: selectSdgTiles(locale), recommended, soon, activities };
}

function searchText(state: DemoState, challenge: Challenge): string {
  const company = companyOf(state, challenge.companyId);
  const parts = [challenge.title, challenge.summary, company?.name ?? ""];
  return parts.flatMap((t) => (typeof t === "string" ? [t] : [t.ja, t.ko])).join(" ").toLowerCase();
}

export interface SearchQuery {
  query: string;
  sdgIds: readonly SdgId[];
}

export function selectSearch(state: DemoState, locale: Locale, q: SearchQuery): ChallengeCardVM[] {
  const needle = q.query.trim().toLowerCase();
  return state.challenges
    .filter((c) => (needle === "" ? true : searchText(state, c).includes(needle)))
    .filter((c) => (q.sdgIds.length === 0 ? true : c.sdgIds.some((id) => q.sdgIds.includes(id))))
    .map((c) => challengeCard(state, c, locale))
    .sort((a, b) => Number(b.isOpen) - Number(a.isOpen) || (b.match ?? 0) - (a.match ?? 0) || a.id.localeCompare(b.id));
}

// ───────── 챌린지 상세(SCR-02) ─────────

export interface TeamPostVM {
  id: string;
  authorLabel: string;
  title: string;
  body: string;
  roles: string[];
  sdgIds: SdgId[];
  dateLabel: string;
  requestsLabel: string;
  mine: boolean;
  requestedByMe: boolean;
  canRequest: boolean;
}

export interface ChallengeDetailVM {
  card: ChallengeCardVM;
  company: { name: string; industry: string; region: string; about: string; verified: boolean; emoji: string; accent: string };
  skills: string[];
  background: string;
  mission: string;
  deliverables: string[];
  opensOnLabel: string;
  teamPosts: TeamPostVM[];
  canApply: boolean;
  /** 마감 전에 이미 제출했다면 "再提出" 단추를 보여 줘요 */
  hasSubmitted: boolean;
}

export function selectChallengeDetail(state: DemoState, id: string, locale: Locale): ChallengeDetailVM | null {
  const challenge = state.challenges.find((c) => c.id === id);
  if (!challenge) return null;
  const company = companyOf(state, challenge.companyId);
  const card = challengeCard(state, challenge, locale);
  const posts: TeamPostVM[] = state.teamPosts
    .filter((p) => p.challengeId === id)
    .map((p) => ({
      id: p.id,
      authorLabel: translate("team.author", locale, { name: p.authorName, level: p.authorLevel }),
      title: pick(p.title, locale),
      body: pick(p.body, locale),
      roles: p.rolesWanted.map((r) => skillLabel(r, locale)),
      sdgIds: p.sdgIds,
      dateLabel: formatDate(p.createdOn, locale),
      requestsLabel: translate("team.requestsCount", locale, { count: p.requests }),
      mine: p.mine,
      requestedByMe: p.requestedByMe,
      canRequest: !p.mine && !p.requestedByMe,
    }));
  return {
    card,
    company: {
      name: company ? pick(company.name, locale) : "",
      industry: company ? pick(company.industry, locale) : "",
      region: company ? pick(company.region, locale) : "",
      about: company ? pick(company.about, locale) : "",
      verified: company?.verified ?? false,
      emoji: company?.emoji ?? "🏢",
      accent: company?.accent ?? "#1D6FB8",
    },
    skills: challenge.skills.map((s) => skillLabel(s, locale)),
    background: pick(challenge.background, locale),
    mission: pick(challenge.mission, locale),
    deliverables: challenge.deliverables.map((d) => pick(d, locale)),
    opensOnLabel: formatDate(challenge.opensOn, locale),
    teamPosts: posts,
    canApply: card.isOpen,
    hasSubmitted: card.submittedVersion !== null,
  };
}

// ───────── 제출 수령증(SCR-03) ─────────

export interface ReceiptVM {
  challengeTitle: string;
  teamName: string;
  title: string;
  summary: string;
  receiptNo: string;
  submittedAtLabel: string;
  version: number;
  fileName: string;
  fileSizeLabel: string;
  sha256: string;
}

export function selectReceipt(state: DemoState, challengeId: string, locale: Locale): ReceiptVM | null {
  const proposal = state.proposals.find((p) => p.challengeId === challengeId && p.mine);
  const challenge = state.challenges.find((c) => c.id === challengeId);
  if (!proposal || !challenge) return null;
  const latest = proposal.versions[proposal.versions.length - 1];
  return {
    challengeTitle: pick(challenge.title, locale),
    teamName: proposal.teamName,
    title: proposal.title,
    summary: proposal.summary,
    receiptNo: proposal.receiptNo,
    submittedAtLabel: formatDateTime(latest.submittedAt, locale),
    version: latest.no,
    fileName: latest.fileName,
    fileSizeLabel: formatBytes(latest.fileSizeBytes),
    sha256: latest.sha256,
  };
}

// ───────── 마이 포트폴리오(SCR-04) ─────────

export interface BadgeVM {
  code: BadgeCode;
  emoji: string;
  name: string;
  desc: string;
}

export interface ImpactVM {
  nickname: string;
  university: string;
  faculty: string;
  level: number;
  levelLabel: string;
  totalPoints: number;
  totalLabel: string;
  /** 현재 레벨 안에서의 진행률 0~1 */
  progressRatio: number;
  nextLevelLabel: string;
  perSdg: { id: SdgId; score: number; color: string; short: string }[];
  topSdgs: { id: SdgId; name: string; score: number }[];
  badges: BadgeVM[];
  activities: ActivityVM[];
  scoutable: boolean;
  scoutNote: string;
}

export function badgeVM(code: BadgeCode, locale: Locale): BadgeVM {
  return { code, emoji: BADGE_EMOJI[code], name: translate(`badge.${code}.name`, locale), desc: translate(`badge.${code}.desc`, locale) };
}

export function selectImpact(state: DemoState, locale: Locale): ImpactVM {
  const activities = deriveActivities(state);
  const index = computeImpactIndex(activities);
  const progress = levelProgress(index.totalPoints);
  const t = makeT(locale);
  const levelName = (level: number) => translate(`level.${level as 1 | 2 | 3 | 4 | 5}`, locale);
  return {
    nickname: state.me.nickname,
    university: pick(state.me.university, locale),
    faculty: pick(state.me.faculty, locale),
    level: index.level,
    levelLabel: t("level.label", { level: index.level, name: levelName(index.level) }),
    totalPoints: index.totalPoints,
    totalLabel: formatPoints(index.totalPoints),
    progressRatio: progress.ratio,
    nextLevelLabel:
      progress.next === null
        ? t("impact.maxLevel")
        : t("impact.nextLevel", { level: progress.next, points: formatPoints(progress.remaining) }),
    perSdg: SDG_IDS.map((id) => ({ id, score: index.perSdg[id], color: getSdg(id).color, short: sdgShort(id, locale) })),
    topSdgs: index.topSdgs.map((id) => ({ id, name: getSdg(id).name[locale], score: index.perSdg[id] })),
    badges: computeBadges(activities).map((code) => badgeVM(code, locale)),
    activities: activities.map((a) => activityVM(a, locale)),
    scoutable: state.me.scoutable,
    scoutNote: t(state.me.scoutable ? "impact.profileScoutOn" : "impact.profileScoutOff"),
  };
}

// ───────── 디지털 증명서 ─────────

export interface CertificateVM {
  cert: Certificate;
  kindLabel: string;
  holder: string;
  challengeTitle: string;
  companyName: string;
  awardLabel: string | null;
  issuedOnLabel: string;
  pointsLabel: string;
  sdgIds: SdgId[];
  code: string;
  /** QR 모듈 행렬 (true = 어두운 칸) */
  qr: boolean[][];
}

export function certificateVM(cert: Certificate, locale: Locale): CertificateVM {
  return {
    cert,
    kindLabel: translate(cert.kind === "award" ? "cert.kindAward" : "cert.kindParticipation", locale),
    holder: cert.holder,
    challengeTitle: pick(cert.challengeTitle, locale),
    companyName: pick(cert.companyName, locale),
    awardLabel: cert.award ? awardLabel(cert.award, locale) : null,
    issuedOnLabel: formatDate(cert.issuedOn, locale),
    pointsLabel: formatPoints(cert.points),
    sdgIds: cert.sdgIds,
    code: verifyCode(cert.hash),
    qr: qrMatrix(qrPayload(cert)),
  };
}

/** 발급할 수 있는 증명서 목록 (수상 → 참가·제출 순으로, 최근 것부터) */
export function selectCertificates(state: DemoState, locale: Locale): CertificateVM[] {
  return showableActivities(state).flatMap((activity, index) => {
    const cert = certificateFromActivity(activity, state.me.nickname, index);
    return cert ? [certificateVM(cert, locale)] : [];
  });
}

/** 위·변조 테스트(데모)용: 내용을 한 군데 바꾼 사본 (해시는 그대로라서 verifyCertificate 가 false 를 돌려줘요) */
export function tamperedCopy(cert: Certificate): Certificate {
  return { ...cert, points: cert.points + 100 };
}

// ───────── SNS 카드뉴스(SCR-05) ─────────

export interface ShareVM {
  options: { id: string; label: string }[];
  selectedId: string | null;
  card: ShareCard | null;
}

export function selectShare(state: DemoState, locale: Locale, template: CardTemplate, activityId: string | null): ShareVM {
  const ordered = showableActivities(state);
  const options = ordered.map((a) => ({ id: a.id, label: `${a.award ? `🏆 ${awardLabel(a.award, locale)} · ` : ""}${pick(a.title, locale)}` }));
  const selected = ordered.find((a) => a.id === activityId) ?? ordered[0] ?? null;
  if (!selected) return { options, selectedId: null, card: null };
  const all = deriveActivities(state);
  const card = buildShareCard({
    nickname: state.me.nickname,
    activity: selected,
    index: computeImpactIndex(all),
    participationCount: all.filter((a) => a.kind === "participation" || a.kind === "submission").length,
    awardCount: all.filter((a) => a.kind === "award").length,
    template,
    locale,
  });
  return { options, selectedId: selected.id, card };
}

// ───────── 메시지(스카우트 수신) ─────────

export interface InboxItemVM {
  id: string;
  title: string;
  companyName: string;
  companyEmoji: string;
  companyAccent: string;
  kindLabel: string;
  message: string;
  dateLabel: string;
  status: ScoutStatus;
  unread: boolean;
  canRespond: boolean;
  statusLabel: string | null;
}

export interface InboxVM {
  items: InboxItemVM[];
  unreadCount: number;
}

export function selectInbox(state: DemoState, locale: Locale): InboxVM {
  const items = state.scouts
    .filter((s) => s.studentId === state.me.id)
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt))
    .map((s): InboxItemVM => {
      const company = companyOf(state, s.companyId);
      const name = company ? pick(company.name, locale) : "";
      return {
        id: s.id,
        title: translate("inbox.scoutFrom", locale, { company: name }),
        companyName: name,
        companyEmoji: company?.emoji ?? "🏢",
        companyAccent: company?.accent ?? "#1D6FB8",
        kindLabel: scoutKindLabel(s.kind as ScoutKind, locale),
        message: pick(s.message, locale),
        dateLabel: formatDate(s.sentAt, locale),
        status: s.status,
        unread: s.status === "sent",
        canRespond: s.status === "sent" || s.status === "read",
        statusLabel: s.status === "accepted" ? translate("inbox.accepted", locale) : s.status === "declined" ? translate("inbox.declined", locale) : null,
      };
    });
  return { items, unreadCount: items.filter((i) => i.unread).length };
}

// ───────── B2B 대시보드(SCR-06) ─────────

export interface KpiVM {
  id: "open" | "applicants" | "pending" | "matches" | "donation";
  label: string;
  value: string;
}

export interface FeeVM {
  perMatch: { gross: string; donation: string; revenue: string };
  totals: { count: number; gross: string; donation: string; revenue: string };
  rows: { id: string; title: string; dateLabel: string; feeLabel: string; donationLabel: string; recipient: string }[];
  note: string;
}

export interface B2bDashboardVM {
  companyName: string;
  companyEmoji: string;
  companyAccent: string;
  welcome: string;
  kpis: KpiVM[];
  challenges: ChallengeCardVM[];
  fee: FeeVM;
}

export function selectFees(state: DemoState, locale: Locale): FeeVM {
  const mine = state.matches.filter((m) => m.companyId === state.myCompanyId);
  const total = summarizeMatches(mine);
  const split = splitMatchFee();
  return {
    perMatch: { gross: formatYen(split.feeYen, locale), donation: formatYen(split.donationYen, locale), revenue: formatYen(split.revenueYen, locale) },
    totals: { count: total.count, gross: formatYen(total.feeYen, locale), donation: formatYen(total.donationYen, locale), revenue: formatYen(total.revenueYen, locale) },
    rows: mine
      .slice()
      .sort((a, b) => b.matchedOn.localeCompare(a.matchedOn))
      .map((m) => {
        const challenge = state.challenges.find((c) => c.id === m.challengeId);
        return {
          id: m.id,
          title: challenge ? pick(challenge.title, locale) : m.challengeId,
          dateLabel: formatDate(m.matchedOn, locale),
          feeLabel: formatYen(m.feeYen, locale),
          donationLabel: formatYen(m.donationYen, locale),
          recipient: pick(m.recipient, locale),
        };
      }),
    note: translate("fee.note", locale),
  };
}

export function selectB2bDashboard(state: DemoState, locale: Locale): B2bDashboardVM {
  const t = makeT(locale);
  const company = companyOf(state, state.myCompanyId);
  const mine = state.challenges.filter((c) => c.companyId === state.myCompanyId);
  const mineIds = new Set(mine.map((c) => c.id));
  const pending = state.proposals.filter((p) => mineIds.has(p.challengeId) && p.status === "submitted").length;
  const matches = state.matches.filter((m) => m.companyId === state.myCompanyId);
  const total = summarizeMatches(matches);
  const name = company ? pick(company.name, locale) : "";
  return {
    companyName: name,
    companyEmoji: company?.emoji ?? "🏢",
    companyAccent: company?.accent ?? "#1D6FB8",
    welcome: t("b2b.welcome", { company: name }),
    kpis: [
      { id: "open", label: t("b2b.kpiOpen"), value: String(mine.filter((c) => isOpenFor(c, state.today)).length) },
      { id: "applicants", label: t("b2b.kpiApplicants"), value: formatPeople(mine.reduce((sum, c) => sum + c.applicants, 0), locale) },
      { id: "pending", label: t("b2b.kpiPending"), value: String(pending) },
      { id: "matches", label: t("b2b.kpiMatches"), value: String(total.count) },
      { id: "donation", label: t("b2b.kpiDonation"), value: formatYen(total.donationYen, locale) },
    ],
    challenges: mine
      .map((c) => challengeCard(state, c, locale))
      .sort((a, b) => Number(b.isOpen) - Number(a.isOpen) || a.daysLeft - b.daysLeft || a.id.localeCompare(b.id)),
    fee: selectFees(state, locale),
  };
}

// ───────── 응모자·심사 ─────────

export interface ApplicantVM {
  id: string;
  teamName: string;
  title: string;
  summary: string;
  versionLabel: string;
  submittedLabel: string;
  receiptNo: string;
  fileName: string;
  videoUrl: string;
  mine: boolean;
  status: ProposalStatus;
  statusLabel: string;
  review: Review | null;
  /** 심사 평균(1~5, 소수 첫째 자리). 심사 전이면 null */
  average: number | null;
  scoreLabel: string;
  award: AwardKind | null;
  awardLabel: string | null;
  adopted: boolean;
}

export interface ApplicantsVM {
  challengeOptions: { id: string; title: string; statusLabel: string }[];
  selectedId: string | null;
  selected: ChallengeCardVM | null;
  applicants: ApplicantVM[];
  feeNote: string;
}

export function averageScore(review: Review | null): number | null {
  if (!review) return null;
  return Math.round(((review.creativity + review.feasibility + review.sdgContribution) / 3) * 10) / 10;
}

export function applicantVM(p: Proposal, locale: Locale): ApplicantVM {
  const latest = p.versions[p.versions.length - 1];
  const average = averageScore(p.review);
  return {
    id: p.id,
    teamName: p.teamName,
    title: p.title,
    summary: p.summary,
    versionLabel: translate("applicants.version", locale, { version: latest.no }),
    submittedLabel: formatDateTime(latest.submittedAt, locale),
    receiptNo: p.receiptNo,
    fileName: latest.fileName,
    videoUrl: p.videoUrl,
    mine: p.mine,
    status: p.status,
    statusLabel: proposalStatusLabel(p.status, locale),
    review: p.review,
    average,
    scoreLabel: average === null ? translate("applicants.notReviewed", locale) : translate("applicants.average", locale, { score: average.toFixed(1) }),
    award: p.award,
    awardLabel: p.award ? awardLabel(p.award, locale) : null,
    adopted: p.status === "adopted",
  };
}

export function selectApplicants(state: DemoState, locale: Locale, challengeId: string | null): ApplicantsVM {
  const mine = state.challenges.filter((c) => c.companyId === state.myCompanyId);
  const withProposals = mine.filter((c) => state.proposals.some((p) => p.challengeId === c.id));
  const optionSource = [...withProposals, ...mine.filter((c) => !withProposals.includes(c))];
  const selectedChallenge = optionSource.find((c) => c.id === challengeId) ?? withProposals[0] ?? mine[0] ?? null;
  const split = splitMatchFee();
  return {
    challengeOptions: optionSource.map((c) => ({ id: c.id, title: pick(c.title, locale), statusLabel: challengeStatusLabel(c.status, locale) })),
    selectedId: selectedChallenge?.id ?? null,
    selected: selectedChallenge ? challengeCard(state, selectedChallenge, locale) : null,
    applicants: selectedChallenge
      ? state.proposals
          .filter((p) => p.challengeId === selectedChallenge.id)
          .map((p) => applicantVM(p, locale))
          .sort((a, b) => (b.average ?? -1) - (a.average ?? -1) || a.id.localeCompare(b.id))
      : [],
    feeNote: translate("review.feeNote", locale, { fee: formatYen(split.feeYen, locale), donation: formatYen(split.donationYen, locale) }),
  };
}

// ───────── 인재 스카우트 ─────────

export interface CandidateVM {
  id: string;
  nickname: string;
  university: string;
  faculty: string;
  levelLabel: string;
  points: number;
  pointsLabel: string;
  awardsLabel: string;
  skills: string[];
  sdgIds: SdgId[];
  bio: string;
  scoutable: boolean;
  alreadySent: boolean;
  canScout: boolean;
  suggestedMessage: string;
  /** 데모의 학생 계정(내가 학생 화면에서 보는 나) */
  isDemoStudent: boolean;
}

export interface TalentVM {
  candidates: CandidateVM[];
  remaining: number;
  limit: number;
  quotaLabel: string;
}

function candidateVM(state: DemoState, c: Candidate, isDemoStudent: boolean, locale: Locale): CandidateVM {
  const sent = alreadyScouted(state.scouts, state.myCompanyId, c.id);
  const topSdg = c.sdgInterests[0];
  const levelName = translate(`level.${levelOf(c.points)}`, locale);
  return {
    id: c.id,
    nickname: c.nickname,
    university: pick(c.university, locale),
    faculty: pick(c.faculty, locale),
    levelLabel: translate("level.label", locale, { level: levelOf(c.points), name: levelName }),
    points: c.points,
    pointsLabel: formatPoints(c.points),
    awardsLabel: translate("talent.awards", locale, { count: c.awards }),
    skills: c.skills.map((s) => skillLabel(s, locale)),
    sdgIds: c.sdgInterests,
    bio: pick(c.bio, locale),
    scoutable: c.scoutable,
    alreadySent: sent,
    canScout: c.scoutable && canSendScout(state.scouts, state.myCompanyId, c.id, state.today),
    suggestedMessage: translate("talent.template", locale, { name: c.nickname, sdg: topSdg ? sdgShort(topSdg, locale) : "SDGs" }),
    isDemoStudent,
  };
}

/** 인재 검색 대상: 샘플 학생들 + 학생 화면의 나(그래야 기업 화면에서 보낸 스카우트가 학생 화면의 메시지로 와요) */
export function allCandidates(state: DemoState): { candidate: Candidate; isDemoStudent: boolean }[] {
  const activities = deriveActivities(state);
  const me: Candidate = {
    id: state.me.id,
    nickname: state.me.nickname,
    university: state.me.university,
    faculty: state.me.faculty,
    skills: state.me.skills,
    sdgInterests: state.me.sdgInterests,
    points: activities.reduce((sum, a) => sum + a.points, 0),
    awards: activities.filter((a) => a.kind === "award").length,
    scoutable: state.me.scoutable,
    bio: state.me.bio,
  };
  return [...state.talent.map((candidate) => ({ candidate, isDemoStudent: false })), { candidate: me, isDemoStudent: true }];
}

export function selectTalent(state: DemoState, locale: Locale, q: SearchQuery): TalentVM {
  const needle = q.query.trim().toLowerCase();
  const candidates = allCandidates(state)
    .filter(({ candidate }) => {
      if (q.sdgIds.length > 0 && !candidate.sdgInterests.some((id) => q.sdgIds.includes(id))) return false;
      if (needle === "") return true;
      const hay = [
        candidate.nickname,
        ...(typeof candidate.university === "string" ? [candidate.university] : [candidate.university.ja, candidate.university.ko]),
        ...candidate.skills.flatMap((s) => [skillLabel(s, "ja"), skillLabel(s, "ko")]),
        ...candidate.sdgInterests.flatMap((id) => [sdgShort(id, "ja"), sdgShort(id, "ko")]),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    })
    .map(({ candidate, isDemoStudent }) => candidateVM(state, candidate, isDemoStudent, locale))
    .sort((a, b) => Number(b.canScout) - Number(a.canScout) || Number(b.isDemoStudent) - Number(a.isDemoStudent) || b.points - a.points || a.nickname.localeCompare(b.nickname));
  const remaining = remainingScouts(state.scouts, state.myCompanyId, state.today);
  return {
    candidates,
    remaining,
    limit: SCOUT_DAILY_LIMIT,
    quotaLabel: translate("talent.quota", locale, { remaining, limit: SCOUT_DAILY_LIMIT }),
  };
}

// ───────── ESG 리포트·인증마크 ─────────

export interface CertItemVM {
  id: CertCriterionId;
  label: string;
  unit: CertUnit;
  unitLabel: string;
  value: number;
  evidence: boolean;
  pointsLabel: string;
  /** 입력 칸에 허용되는 최댓값과 만점 기준값 */
  inputMax: number;
  target: number;
}

export interface EsgVM {
  total: number;
  level: number;
  levelLabel: string;
  scoreLabel: string;
  nextLabel: string | null;
  items: CertItemVM[];
  byCategory: { key: EsgCategory; label: string; score: number }[];
  highlights: string[];
  generated: boolean;
  generatedLabel: string;
  needEvidence: boolean;
  disclaimer: string;
}

const CERT_LABEL_KEY: Record<CertCriterionId, "esg.qEcoPackage" | "esg.qRenewable" | "esg.qDonation" | "esg.qWomenManagers" | "esg.qVolunteer" | "esg.qDisclosure"> = {
  ecoPackage: "esg.qEcoPackage",
  renewable: "esg.qRenewable",
  donation: "esg.qDonation",
  womenManagers: "esg.qWomenManagers",
  volunteer: "esg.qVolunteer",
  disclosure: "esg.qDisclosure",
};

const UNIT_KEY: Record<CertUnit, "esg.unitPercent" | "esg.unitYen" | "esg.unitHours" | "esg.unitFlag"> = {
  percent: "esg.unitPercent",
  yen: "esg.unitYen",
  hours: "esg.unitHours",
  flag: "esg.unitFlag",
};

export function selectEsg(state: DemoState, locale: Locale): EsgVM {
  const t: TFunction = makeT(locale);
  const result = evaluateCertification(state.cert);
  const mine = state.challenges.filter((c) => c.companyId === state.myCompanyId);
  const matches = summarizeMatches(state.matches.filter((m) => m.companyId === state.myCompanyId));
  const levelLabel = t(`esg.certLevel${result.level}`);
  const items: CertItemVM[] = result.items.map((item) => {
    const criterion = criterionOf(item.id);
    return {
      id: item.id,
      label: t(CERT_LABEL_KEY[item.id]),
      unit: item.unit,
      unitLabel: t(UNIT_KEY[item.unit]),
      value: item.value,
      evidence: item.evidence,
      pointsLabel: t("esg.itemPoints", { points: item.points, max: item.max }),
      inputMax: criterion.max,
      target: criterion.target,
    };
  });
  return {
    total: result.total,
    level: result.level,
    levelLabel,
    scoreLabel: t("esg.certScore", { score: result.total }),
    nextLabel: result.pointsToNext === null ? null : t("esg.certNext", { points: result.pointsToNext }),
    items,
    byCategory: [
      { key: "E", label: t("esg.e"), score: result.byCategory.E },
      { key: "S", label: t("esg.s"), score: result.byCategory.S },
      { key: "G", label: t("esg.g"), score: result.byCategory.G },
    ],
    highlights: [
      t("esg.hlChallenges", { count: mine.length }),
      t("esg.hlApplicants", { count: formatPeople(mine.reduce((sum, c) => sum + c.applicants, 0), locale) }),
      t("esg.hlDonation", { amount: formatYen(matches.donationYen, locale) }),
      t("esg.hlCert", { level: levelLabel }),
    ],
    generated: state.esgGeneratedOn !== null,
    generatedLabel: state.esgGeneratedOn ? t("esg.generated", { date: formatDate(state.esgGeneratedOn, locale) }) : t("esg.notGenerated"),
    needEvidence: result.missingEvidence.length > 0,
    disclaimer: t("esg.disclaimer"),
  };
}

// ───────── SNS 피드 (F-503 학생 자랑 글 · F-504 기업 홍보 글, 설계: docs/sns-feed.md) ─────────

export type FeedFilter = "all" | "pr" | "brag";
export const FEED_FILTERS: readonly FeedFilter[] = ["all", "pr", "brag"];

export interface PostAchievementVM {
  /** 수상 / 기획서 제출 / 참가 */
  kindLabel: string;
  title: string;
  companyName: string;
  awardLabel: string | null;
  sdgIds: SdgId[];
  /** 증명서 화면의 번호 (내 실적에 붙인 글일 때만, 아니면 null) */
  certificateId: string | null;
}

export interface PostVM {
  id: string;
  kind: PostKind;
  /** "PR"(광고 표시, 홍보 글에 항상) 또는 "실적/자랑" */
  chipLabel: string;
  authorName: string;
  /** 자랑 글은 "Lv.3", 홍보 글은 업종 */
  authorMeta: string;
  /** 홍보 글은 기업 이모지, 자랑 글은 닉네임의 첫 글자 */
  avatar: string;
  /** 홍보 글은 기업 색, 자랑 글은 null (화면 기본색) */
  avatarColor: string | null;
  /** 홍보 글의 기업 인증 ✓ */
  verified: boolean;
  title: string | null;
  body: string;
  sdgIds: SdgId[];
  dateLabel: string;
  likes: number;
  /** 지금 화면의 계정(학생/기업)이 좋아요를 눌렀는지 */
  likedByMe: boolean;
  /** 지금 화면의 계정이 쓴 글인지 */
  mine: boolean;
  /** 내 글에는 좋아요를 누를 수 없어요 */
  canLike: boolean;
  /** 내 글만 지울 수 있어요 */
  canDelete: boolean;
  achievement: PostAchievementVM | null;
  /** 홍보 글에 연결된 챌린지 (챌린지 상세로 이어져요) */
  challenge: { id: string; title: string } | null;
  /** 공식 SNS 게시 신청: "공식 SNS 게시 예정 · X · 11/19", "게시료 ¥3,000(샘플)" */
  official: PostOfficialVM | null;
  /** 공유·복사로 내보낼 글 (홍보 글은 맨 앞에 [PR] 이 붙어요) */
  shareText: string;
}

/** 글 카드에 보이는 공식 SNS 게시 신청 */
export interface PostOfficialVM {
  /** "공식 SNS 게시 예정 · X · 11/19" */
  label: string;
  /** "게시료 ¥3,000(샘플)" */
  feeLabel: string;
  channel: OfficialChannel;
  /** 채널 이름: "X" / "Instagram" / "Facebook" (한국어는 인스타그램·페이스북) */
  channelName: string;
  /** 채널 이름 + 올라가는 모양: "X ポスト" / "Instagram ストーリー" / "Facebook ページ投稿" */
  channelLabel: string;
}

export interface FeedVM {
  filter: FeedFilter;
  filters: { id: FeedFilter; label: string; count: number }[];
  posts: PostVM[];
}

function hashtagsOf(sdgIds: readonly SdgId[], locale: Locale): string {
  return [translate("share.hashtags", locale), ...sdgIds.map((id) => `#SDGs${id}`)].join(" ");
}

function postVM(state: DemoState, post: SocialPost, locale: Locale, role: Role, showable: readonly ShowableActivity[]): PostVM {
  // 데모에는 학생·기업 두 계정이 있어서, "내 글"은 지금 화면의 계정이 쓴 글만이에요
  const mine = post.mine && authorRole(post.kind) === role;
  const base = {
    id: post.id,
    kind: post.kind,
    body: pick(post.body, locale),
    sdgIds: post.sdgIds,
    dateLabel: formatDateTime(post.createdAt, locale),
    likes: post.likes,
    likedByMe: post.likedBy.includes(role),
    mine,
    canLike: !mine,
    canDelete: mine,
  };
  const tags = hashtagsOf(post.sdgIds, locale);

  if (post.kind === "brag") {
    const a = post.achievement;
    const index = a.activityId === null ? -1 : showable.findIndex((x) => x.id === a.activityId);
    const award = a.award ? awardLabel(a.award, locale) : null;
    const achievement: PostAchievementVM = {
      kindLabel: translate(`activity.${a.kind}`, locale),
      title: pick(a.title, locale),
      companyName: pick(a.companyName, locale),
      awardLabel: award,
      sdgIds: a.sdgIds,
      certificateId: index >= 0 ? certificateIdAt(index) : null,
    };
    return {
      ...base,
      chipLabel: translate("feed.chip.brag", locale),
      authorName: post.authorName,
      authorMeta: translate("feed.level", locale, { level: post.authorLevel }),
      avatar: [...post.authorName][0]?.toUpperCase() ?? "?",
      avatarColor: null,
      verified: false,
      title: null,
      achievement,
      challenge: null,
      official: null,
      shareText: [base.body, `${achievement.title} · ${achievement.companyName}${award ? ` · ${award}` : ""}`, tags].join("\n"),
    };
  }

  const company = companyOf(state, post.companyId);
  const challenge = post.challengeId ? state.challenges.find((c) => c.id === post.challengeId) : undefined;
  const title = pick(post.title, locale);
  const companyName = company ? pick(company.name, locale) : "";
  return {
    ...base,
    chipLabel: translate("feed.chip.pr", locale),
    authorName: companyName,
    authorMeta: company ? pick(company.industry, locale) : "",
    avatar: company?.emoji ?? "🏢",
    avatarColor: company?.accent ?? null,
    verified: company?.verified ?? false,
    title,
    achievement: null,
    challenge: challenge ? { id: challenge.id, title: pick(challenge.title, locale) } : null,
    official: post.official
      ? {
          label: translate("feed.officialScheduled", locale, { channel: officialChannelName(post.official.channel, locale), date: formatDateShort(post.official.on) }),
          feeLabel: translate("feed.officialFee", locale, { fee: formatYen(post.official.feeYen, locale) }),
          channel: post.official.channel,
          channelName: officialChannelName(post.official.channel, locale),
          channelLabel: officialChannelLabel(post.official.channel, locale),
        }
      : null,
    shareText: [translate("feed.sharePr", locale, { title }), base.body, `${companyName} ${tags}`].join("\n"),
  };
}

/** 피드 목록: 최신순이고, 전체 / 기업 홍보 / 학생 자랑 으로 걸러 볼 수 있어요 */
export function selectFeed(state: DemoState, locale: Locale, role: Role, filter: FeedFilter = "all"): FeedVM {
  const showable = showableActivities(state);
  const sorted = [...state.posts].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
  const count = (kind: PostKind) => state.posts.filter((p) => p.kind === kind).length;
  return {
    filter,
    filters: [
      { id: "all", label: translate("feed.filter.all", locale), count: state.posts.length },
      { id: "pr", label: translate("feed.filter.pr", locale), count: count("pr") },
      { id: "brag", label: translate("feed.filter.brag", locale), count: count("brag") },
    ],
    posts: sorted.filter((p) => filter === "all" || p.kind === filter).map((p) => postVM(state, p, locale, role, showable)),
  };
}

/** 글쓰기 화면을 다른 화면에서 열 때 미리 채워 둘 값 (카드뉴스 화면 → 실적, 응모자 화면 → 챌린지) */
export interface PostPreset {
  activityId?: string | null;
  challengeId?: string | null;
}

export interface ComposerVM {
  kind: PostKind;
  title: string;
  privacyNote: string;
  bodyPlaceholder: string;
  bodyLimit: number;
  titleLimit: number;
  maxSdgs: number;
  /** 글쓴이로 보이는 모습 (미리보기·머리말에 써요) */
  author: { name: string; meta: string; avatar: string; avatarColor: string | null; verified: boolean };
  /** 자랑 글: 고를 수 있는 내 실적(수상 → 제출·참가 순)과, 처음 선택된 것 */
  activities: { id: string; label: string; sdgIds: SdgId[] }[];
  selectedActivityId: string | null;
  /** 홍보 글: 연결할 수 있는 우리 회사 챌린지와, 미리 고른 것(없으면 null) */
  challenges: { id: string; title: string; sdgIds: SdgId[] }[];
  selectedChallengeId: string | null;
  /** 홍보 글의 SDGs 기본값: 고른 챌린지의 SDGs → 챌린지가 없으면 기업의 SDGs */
  defaultSdgIds: SdgId[];
  /** 챌린지를 연결하지 않았을 때의 기본 SDGs (기업의 SDGs, 최대 3개) */
  companySdgIds: SdgId[];
  /** 홍보 글의 공식 SNS 게시 신청 안내: 고를 수 있는 채널과, 지금 신청하면 채널마다 배정될 날짜 */
  official: {
    feeYen: number;
    feeLabel: string;
    hint: string;
    /** 채널 선택지 (화면 순서: X · Instagram · Facebook) */
    channels: OfficialChannelOptionVM[];
    /** 처음 골라 두는 채널 */
    defaultChannel: OfficialChannel;
  };
}

/** 글쓰기의 채널 선택지 한 줄: 이름 · 올라가는 모양 · 지금 신청하면 이 채널에서 배정될 날짜 */
export interface OfficialChannelOptionVM {
  id: OfficialChannel;
  /** "X" / "Instagram" / "Facebook" */
  name: string;
  /** "ポスト" / "ストーリー" / "ページ投稿" */
  format: string;
  /** 이름 + 모양: "Instagram ストーリー" (읽어 주는 글·미리보기에 써요) */
  label: string;
  /** 이 채널에서 내일부터 가장 빠른 빈 날짜 (YYYY-MM-DD) */
  nextDate: string;
  /** "게시 예정일: 2026年11月2日" */
  nextDateLabel: string;
}

export function selectComposer(state: DemoState, locale: Locale, kind: PostKind, preset: PostPreset = {}): ComposerVM {
  const t = makeT(locale);
  const company = companyOf(state, state.myCompanyId);
  const points = deriveActivities(state).reduce((sum, a) => sum + a.points, 0);

  const activities = showableActivities(state).map((a) => ({
    id: a.id,
    label: `${a.award ? `🏆 ${awardLabel(a.award, locale)} · ` : ""}${pick(a.title, locale)}`,
    sdgIds: a.sdgIds.slice(0, POST_LIMITS.maxSdgs),
  }));
  const selectedActivityId = activities.find((a) => a.id === preset.activityId)?.id ?? activities[0]?.id ?? null;

  const open = state.challenges.filter((c) => c.companyId === state.myCompanyId && c.status === "open");
  const others = state.challenges.filter((c) => c.companyId === state.myCompanyId && c.status !== "open");
  const challenges = [...open, ...others].map((c) => ({ id: c.id, title: pick(c.title, locale), sdgIds: c.sdgIds.slice(0, POST_LIMITS.maxSdgs) }));
  const selectedChallenge = challenges.find((c) => c.id === preset.challengeId) ?? null;
  const companySdgIds = defaultPrSdgs(company?.sdgIds ?? [], null);
  const channels: OfficialChannelOptionVM[] = OFFICIAL_CHANNELS.map((id) => {
    const nextDate = nextOfficialDate(state.posts, state.today, id);
    return {
      id,
      name: officialChannelName(id, locale),
      format: officialChannelFormat(id, locale),
      label: officialChannelLabel(id, locale),
      nextDate,
      nextDateLabel: t("post.officialDate", { date: formatDate(nextDate, locale) }),
    };
  });

  return {
    kind,
    title: t(kind === "brag" ? "post.title.brag" : "post.title.pr"),
    privacyNote: t(kind === "brag" ? "post.privacy.brag" : "post.privacy.pr"),
    bodyPlaceholder: t(kind === "brag" ? "post.bodyPlaceholder.brag" : "post.bodyPlaceholder.pr"),
    bodyLimit: bodyLimit(kind),
    titleLimit: POST_LIMITS.prTitle,
    maxSdgs: POST_LIMITS.maxSdgs,
    author:
      kind === "brag"
        ? { name: state.me.nickname, meta: t("feed.level", { level: levelOf(points) }), avatar: [...state.me.nickname][0]?.toUpperCase() ?? "?", avatarColor: null, verified: false }
        : { name: company ? pick(company.name, locale) : "", meta: company ? pick(company.industry, locale) : "", avatar: company?.emoji ?? "🏢", avatarColor: company?.accent ?? null, verified: company?.verified ?? false },
    activities,
    selectedActivityId,
    challenges,
    selectedChallengeId: selectedChallenge?.id ?? null,
    defaultSdgIds: defaultPrSdgs(company?.sdgIds ?? [], selectedChallenge?.sdgIds ?? null),
    companySdgIds,
    official: {
      feeYen: OFFICIAL_SHARE_FEE_YEN,
      feeLabel: formatYen(OFFICIAL_SHARE_FEE_YEN, locale),
      hint: t("post.officialHint", { fee: formatYen(OFFICIAL_SHARE_FEE_YEN, locale) }),
      channels,
      defaultChannel: DEFAULT_OFFICIAL_CHANNEL,
    },
  };
}

export { CERT_CRITERIA };
export type { SkillId };
