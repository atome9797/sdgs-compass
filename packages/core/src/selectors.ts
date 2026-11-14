// 화면용 데이터(뷰 모델) 만들기. 상태(DemoState)와 언어(Locale)를 받아 "그대로 그리면 되는" 글자·숫자로 바꿔 줘요.
// 웹·모바일 화면은 이 함수들의 결과만 그려서 두 앱의 표시 내용이 늘 같고, 계산·번역 실수는 core 테스트가 잡아요.
import { deriveActivities, showableActivities, type ShowableActivity } from "./activities";
import {
  CERT_CRITERIA, CERT_MAX_STARS, CERT_POINTS_PER_STAR_STEP, CERT_STAR_STEP, certStarIcons, certStarsOf, criterionOf, evaluateCertification, formatStars, type CertUnit,
  type EsgCategory, type StarIcon,
} from "./certification";
import { certificateFromActivity, certificateIdAt, qrPayload, verifyCode, type Certificate } from "./certificate";
import type {
  Activity, ActivityKind, AwardKind, Candidate, Challenge, ChallengeStatus, CertCriterionId, Company, DemoState, FoeKind, HeroSkill, OfficialChannel, OfficialShare, PostKind, Proposal, ProposalStatus,
  QuestReward, Review, Role, ScoutKind, ScoutStatus, SkillId, SocialPost,
} from "./domain";
import { feeItems, PLATFORM_FEE_MIN_YEN, summarizeFees, type FeeKind } from "./fees";
import { foeOf } from "./foe";
import { dDayLabel, daysBetween, formatBytes, formatDate, formatDateShort, formatDateTime, formatMonthDayWeekday, formatPeople, formatYen } from "./format";
import { computeBadges, computeImpactIndex, BADGE_EMOJI, REVIEW_SCORE_MAX, type BadgeCode } from "./impact";
import { SDG_EMBLEMS, type SkillEffectKind } from "./emblems";
import { pick, type Locale } from "./i18n";
import { awardLabel, challengeStatusLabel, participationLabel, proposalStatusLabel, rewardLabel, scoutKindLabel, sdgLabel, sdgShort, skillLabel } from "./labels";
import { makeT, translate, type TFunction } from "./messages";
import {
  authorRole, bodyLimit, DEFAULT_OFFICIAL_CHANNEL, defaultPrSdgs, OFFICIAL_CHANNELS, OFFICIAL_SHARE_FEE_YEN, OFFICIAL_SHARE_MONTHLY_LIMIT, OFFICIAL_SHARE_WINDOW_DAYS,
  officialChannelFormat, officialChannelLabel, officialChannelName, officialDateChoices, officialShareLink, officialUsageByMonth, POST_LIMITS,
} from "./post";
import { TEAM_SIZE } from "./proposal";
import { qrMatrix } from "./qr";
import { isOpenFor, recommendChallenges, scoreChallenge, type Reason, type Recommendation } from "./recommend";
import { remainingScouts, SCOUT_DAILY_LIMIT, alreadyScouted, canSendScout } from "./scout";
import { buildShareCard, type CardTemplate, type ShareCard } from "./shareCard";
import { AWARD_STARS, sdgSkills, skillLevel, skillSdgIds, sortSkills } from "./skills";
import { computeSdgExp, reviewExp, statusLevel, statusLevelUps, topStatusSdgs } from "./status";
import { rewardChosen, rewardPending } from "./wallet";
import { getSdg, sdgTextColor, SDG_IDS, SDGS, type SdgId } from "./sdg";
import { COLORS } from "./theme";

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

/** 개수가 붙은 SDG 타일·칩 (#29): 홈의 17개 타일과 검색 화면의 SDG 칩. 과제 만들기·인재 검색·글쓰기의 고르는 칩에는 개수가 없어요(SdgTileVM) */
export interface SdgCountTileVM extends SdgTileVM {
  /** 이 목표가 붙은 모집 중 과제 수 — 이 목표 하나로 검색했을 때 나오는 모집 중 카드 수와 같아요 */
  openCount: number;
  /** 숫자 뒤의 작은 단위 (件 / 개) */
  unit: string;
  /** 스크린 리더용 이름: 「目標14 海の豊かさを守ろう・募集中の課題 2件」 */
  label: string;
}

export interface ActivityVM {
  id: string;
  kind: ActivityKind;
  kindLabel: string;
  title: string;
  companyName: string;
  dateLabel: string;
  awardLabel: string | null;
  sdgIds: SdgId[];
}

/** 실적 한 줄 — 포인트 숫자는 보여 주지 않아요(실적은 레벨로만 보여요) */
export function activityVM(activity: Activity, locale: Locale): ActivityVM {
  return {
    id: activity.id,
    kind: activity.kind,
    kindLabel: translate(`activity.${activity.kind}`, locale),
    title: pick(activity.title, locale),
    companyName: pick(activity.companyName, locale),
    dateLabel: formatDate(activity.date, locale),
    awardLabel: activity.award ? awardLabel(activity.award, locale) : null,
    sdgIds: activity.sdgIds,
  };
}

function companyOf(state: DemoState, id: string): Company | undefined {
  return state.companies.find((c) => c.id === id);
}

// ───────── SDGs 실천 마크 (#35) ─────────

/** 회사 이름 옆에 붙는 SDGs 실천 마크. 未取得(별 0)이면 만들지 않아요(null → 화면에 아무것도 안 보여요) */
export interface CertMarkVM {
  /** 0.5 ~ 5.0 */
  stars: number;
  /** "SDGs取組みマーク" / "SDGs 실천 마크" — 별 옆에 늘 함께 써요(사용자 평점으로 읽히지 않게) */
  name: string;
  /** "★4.5" */
  starsLabel: string;
  /** 스크린 리더 이름: "SDGs取組みマーク 5段階中4.5" / "SDGs 실천 마크 5단계 중 4.5" */
  accessibilityLabel: string;
  /** 별 그림 5칸 (가득·반·빈) */
  icons: StarIcon[];
  /** 누르면 보이는 안내: 독자 기준이고 국가·자치체·유엔의 인증이 아님 (esg.disclaimer = CERT_DISCLAIMER) */
  disclaimer: string;
  /** 누르면 보이는 기준 한 줄: 10점마다 ★0.5, 100점이면 ★5.0 */
  rule: string;
}

/** 마크 이름 + 숫자 (스크린 리더 이름). 별이 0 이면 「未取得」 */
export function certMarkA11yLabel(stars: number, locale: Locale): string {
  const name = translate("esg.certTitle", locale);
  return stars > 0 ? translate("mark.a11y", locale, { name, max: CERT_MAX_STARS, stars: formatStars(stars) }) : translate("mark.a11yNone", locale, { name });
}

export function certMarkVM(stars: number, locale: Locale): CertMarkVM | null {
  if (!(stars > 0)) return null;
  return {
    stars,
    name: translate("esg.certTitle", locale),
    starsLabel: translate("mark.stars", locale, { stars: formatStars(stars) }),
    accessibilityLabel: certMarkA11yLabel(stars, locale),
    icons: certStarIcons(stars),
    disclaimer: translate("esg.disclaimer", locale),
    rule: translate("mark.rule", locale, { points: CERT_POINTS_PER_STAR_STEP, step: formatStars(CERT_STAR_STEP), max: formatStars(CERT_MAX_STARS) }),
  };
}

/** 회사의 마크 달성도: 데모의 우리 회사는 ESG 화면의 입력(state.cert)에서, 다른 회사는 샘플 값(Company.certScore). 마크가 없으면 null */
export function companyCertScore(state: DemoState, companyId: string): number | null {
  if (companyId === state.myCompanyId) return evaluateCertification(state.cert).total;
  return companyOf(state, companyId)?.certScore ?? null;
}

/** 회사 이름 옆의 마크 (未取得·마크 없음이면 null) */
export function selectCompanyMark(state: DemoState, companyId: string, locale: Locale): CertMarkVM | null {
  const score = companyCertScore(state, companyId);
  return score === null ? null : certMarkVM(certStarsOf(score), locale);
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
  /** 회사 이름 옆의 SDGs 실천 마크 (#35, 未取得이면 null) */
  companyMark: CertMarkVM | null;
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
  /** 「海の幸ギフトセット（定価 ¥5,000 相当）」 — 상품 보상(報酬アイテム, #37)이 걸린 퀘스트만 (없으면 null) */
  rewardItemLabel: string | null;
  participationLabel: string;
  /** 「3〜5人チーム」 — 응모는 한 팀 3~5명(대학생 · 대학원생) */
  teamRuleLabel: string;
  impactLabel: string;
  applicantsLabel: string;
  bookmarked: boolean;
  /** 내가 제출한 최신 버전 번호 (제출 전이면 null) */
  submittedVersion: number | null;
  /** 의뢰서의 도장(#47): 기획서를 냈으면 「挑戦中」, 기업이 골랐으면(수상) 「達成」, 아니면 null */
  stamp: "challenged" | "won" | null;
  /** 도장의 글자 */
  stampLabel: string | null;
  /** 매칭률 0~100 (추천 계산을 한 경우만) */
  match: number | null;
  reasons: string[];
  /** 의뢰서(#39)의 과제 몬스터(전투 화면과 같아요) — 색은 대표 SDG 색. about = 몬스터의 정체(쉬운 말, 없으면 null) */
  foe: { name: string; kind: FoeKind; color: string; about: string | null };
  /** 의뢰서의 「課題」(#41): 과제를 쉬운 말로 — 몬스터의 정체, 없으면 퀘스트의 요약 */
  problem: string;
  /** 의뢰서의 「報酬」 한 줄: 「賞金 ¥100,000 ／ 🎁 みなとの干物ギフトセット ／ インターン」 (없으면 null) */
  rewardsLine: string | null;
}

/** 보상을 한 줄로: 상금 → 상품(🎁) → 그 밖의 특전 (의뢰 창 · 의뢰서 · 퀘스트 상세의 대화가 같이 써요) */
export function rewardsLineOf(challenge: Challenge, locale: Locale): string | null {
  const parts = [
    challenge.prizeYen > 0 ? `${rewardLabel("prize", locale)} ${formatYen(challenge.prizeYen, locale)}` : null,
    challenge.rewardItem ? `🎁 ${pick(challenge.rewardItem.name, locale)}` : null,
    ...challenge.rewards.filter((r) => r !== "prize").map((r) => rewardLabel(r, locale)),
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(locale === "ja" ? " ／ " : " / ") : null;
}

/** 과제를 쉬운 말로(#41): 몬스터의 정체(foe.about), 없으면 퀘스트의 요약 — 의뢰서의 「課題」와 퀘스트 상세의 첫 대화가 같이 써요 */
export function problemOf(challenge: Challenge, locale: Locale): string {
  const about = foeOf(challenge).about;
  return about ? pick(about, locale) : pick(challenge.summary, locale);
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
    companyAccent: company?.accent ?? COLORS.primary,
    companyMark: selectCompanyMark(state, challenge.companyId, locale),
    sdgIds: challenge.sdgIds,
    hue: challenge.hue,
    daysLeft,
    dDay: dDayLabel(daysLeft, locale),
    closesOnLabel: formatDate(challenge.closesOn, locale),
    status: challenge.status,
    statusLabel: challengeStatusLabel(challenge.status, locale),
    isOpen: isOpenFor(challenge, state.today),
    prizeLabel: challenge.prizeYen > 0 ? formatYen(challenge.prizeYen, locale) : null,
    // 상품 보상이 걸린 퀘스트는 특전 목록 끝에 「報酬アイテム」을 더해요 — 카드의 태그와 상세의 特典 에 그대로 보여요(#37)
    rewardLabels: [...challenge.rewards.map((r) => rewardLabel(r, locale)), ...(challenge.rewardItem ? [`🎁 ${translate("challenge.rewardItem", locale)}`] : [])],
    rewardItemLabel: challenge.rewardItem
      ? translate("challenge.rewardItemValue", locale, { name: pick(challenge.rewardItem.name, locale), amount: formatYen(challenge.rewardItem.retailYen, locale) })
      : null,
    participationLabel: participationLabel(challenge.participation, locale),
    teamRuleLabel: translate("challenge.teamRule", locale, { min: TEAM_SIZE.min, max: TEAM_SIZE.max }),
    // 실적은 포인트 숫자로 보여 주지 않아요 — 참가·수상이 임팩트 레벨에 반영된다는 것만
    impactLabel: translate("challenge.impactValue", locale),
    applicantsLabel: translate("challenge.applicants", locale, { count: formatPeople(challenge.applicants, locale) }),
    bookmarked: state.bookmarks.includes(challenge.id),
    submittedVersion: mine ? mine.versions.length : null,
    stamp: mine ? (mine.award ? "won" : "challenged") : null,
    stampLabel: mine ? translate(mine.award ? "scroll.cleared" : "scroll.challenged", locale) : null,
    match: rec.score,
    reasons: rec.reasons.map((r) => reasonText(r, locale)),
    foe: (() => {
      const foe = foeOf(challenge);
      return { name: pick(foe.name, locale), kind: foe.kind, color: getSdg(challenge.sdgIds[0] ?? 17).color, about: foe.about ? pick(foe.about, locale) : null };
    })(),
    problem: problemOf(challenge, locale),
    rewardsLine: rewardsLineOf(challenge, locale),
  };
}

// ───────── 홈(SCR-01)·검색 ─────────

/**
 * 홈 맨 위의 의뢰 창(#37): 기업(NPC · 의뢰인)이 용사(학생)에게 말을 거는 게임 대화 상자.
 * 추천 1순위(모집 중) 퀘스트로 만들고, 누르면 그 퀘스트 상세로 가요. 모집 중인 퀘스트가 없으면 null.
 */
export interface PleaVM {
  challengeId: string;
  companyEmoji: string;
  /** 「みなと海洋フーズ株式会社からの依頼」 */
  from: string;
  /** 「勇者さま、助けてください！「…」に挑戦してくれる勇者を探しています。」 */
  line: string;
  /** 「報酬：賞金 ¥100,000 ／ 🎁 みなとの干物ギフトセット ／ インターン」 (보상이 하나도 없으면 null) */
  rewards: string | null;
}

export function pleaOf(state: DemoState, challenge: Challenge, locale: Locale): PleaVM {
  const company = companyOf(state, challenge.companyId);
  const rewards = rewardsLineOf(challenge, locale);
  return {
    challengeId: challenge.id,
    companyEmoji: company?.emoji ?? "🏢",
    from: translate("home.pleaFrom", locale, { company: company ? pick(company.name, locale) : "" }),
    line: translate("home.pleaLine", locale, { quest: pick(challenge.title, locale) }),
    rewards: rewards ? translate("home.pleaReward", locale, { rewards }) : null,
  };
}

export interface HomeVM {
  nickname: string;
  /** 의뢰 창 (#37) */
  plea: PleaVM | null;
  sdgTiles: SdgCountTileVM[];
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
  const first = recs.map((rec) => rec.challenge).find((c) => isOpenFor(c, state.today));
  const plea = first ? pleaOf(state, first, locale) : null;
  return { nickname: state.me.nickname, plea, sdgTiles: selectSdgCountTiles(state, locale), recommended, soon, activities };
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

/** 검색 조건: 검색어(needle, 이미 소문자·앞뒤 공백 없음)가 들어 있고, 고른 목표 중 하나라도 겹치면 나와요. 목표별 개수도 이 조건으로 세요 */
function matchesSearch(state: DemoState, challenge: Challenge, needle: string, sdgIds: readonly SdgId[]): boolean {
  if (needle !== "" && !searchText(state, challenge).includes(needle)) return false;
  return sdgIds.length === 0 || challenge.sdgIds.some((id) => sdgIds.includes(id));
}

export function selectSearch(state: DemoState, locale: Locale, q: SearchQuery): ChallengeCardVM[] {
  const needle = q.query.trim().toLowerCase();
  return state.challenges
    .filter((c) => matchesSearch(state, c, needle, q.sdgIds))
    .map((c) => challengeCard(state, c, locale))
    .sort((a, b) => Number(b.isOpen) - Number(a.isOpen) || (b.match ?? 0) - (a.match ?? 0) || a.id.localeCompare(b.id));
}

/**
 * 목표별 「모집 중」 과제 수 (#29). 그 목표 하나로 검색했을 때(selectSearch) 나오는 카드 중 모집 중(isOpen)인 것의 수와 같아요 —
 * 같은 조건(matchesSearch)과 같은 모집 중 판정(isOpenFor: 상태가 모집 중이고 마감일이 지나지 않음)을 써요.
 * 검색어를 주면 그 검색어로도 걸러요(검색 화면의 칩 옆 숫자). 홈은 검색어 없이 불러요.
 */
export function selectSdgOpenCounts(state: DemoState, query = ""): Record<SdgId, number> {
  const needle = query.trim().toLowerCase();
  const open = state.challenges.filter((c) => isOpenFor(c, state.today));
  const counts = {} as Record<SdgId, number>;
  for (const id of SDG_IDS) counts[id] = open.filter((c) => matchesSearch(state, c, needle, [id])).length;
  return counts;
}

/** 개수가 붙은 17개 타일·칩. 홈 타일은 query 없이, 검색 화면의 칩은 지금 검색어로 불러요 */
export function selectSdgCountTiles(state: DemoState, locale: Locale, query = ""): SdgCountTileVM[] {
  const counts = selectSdgOpenCounts(state, query);
  const unit = translate("home.sdgUnit", locale);
  return selectSdgTiles(locale).map((tile) => ({
    ...tile,
    openCount: counts[tile.id],
    unit,
    label: translate("home.sdgOpenLabel", locale, { goal: sdgLabel(tile.id, locale), count: counts[tile.id] }),
  }));
}

/** 검색 결과 줄. 마감·심사 중 과제가 섞여 있으면 「うち募集中 n件」도 붙여서, 홈 타일의 숫자(모집 중)와 맞춰 볼 수 있게 해요 */
export function searchResultsLabel(results: readonly ChallengeCardVM[], locale: Locale): string {
  const open = results.filter((card) => card.isOpen).length;
  return open === results.length ? translate("search.results", locale, { count: results.length }) : translate("search.resultsWithOpen", locale, { count: results.length, open });
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
  company: { name: string; industry: string; region: string; about: string; verified: boolean; emoji: string; accent: string; mark: CertMarkVM | null };
  skills: string[];
  background: string;
  mission: string;
  deliverables: string[];
  /** 응모 조건: 팀(3~5명 · 대학생 · 대학원생) · 권장 기간(1~2개월 + 이 과제의 모집 기간) · 수업 · 세미나 */
  conditions: { label: string; value: string }[];
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
      authorLabel: translate("team.author", locale, { name: p.authorName, skills: p.authorSkills }),
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
      accent: company?.accent ?? COLORS.primary,
      mark: card.companyMark,
    },
    skills: challenge.skills.map((s) => skillLabel(s, locale)),
    background: pick(challenge.background, locale),
    mission: pick(challenge.mission, locale),
    deliverables: challenge.deliverables.map((d) => pick(d, locale)),
    conditions: [
      { label: translate("challenge.cond.team", locale), value: translate("challenge.cond.teamValue", locale, { min: TEAM_SIZE.min, max: TEAM_SIZE.max }) },
      { label: translate("challenge.cond.period", locale), value: translate("challenge.cond.periodValue", locale, { days: daysBetween(challenge.opensOn, challenge.closesOn) }) },
      { label: translate("challenge.cond.seminar", locale), value: translate("challenge.cond.seminarValue", locale) },
    ],
    opensOnLabel: formatDate(challenge.opensOn, locale),
    teamPosts: posts,
    canApply: card.isOpen,
    hasSubmitted: card.submittedVersion !== null,
  };
}

// ───────── 제출 수령증(SCR-03) ─────────

export interface ReceiptVM {
  /** 과제를 낸 기업 — 어느 기업의 어느 과제에 냈는지 수령증에서 바로 보이게(#28) */
  companyName: string;
  challengeTitle: string;
  teamName: string;
  /** 「4人」·「4명」 */
  teamSizeLabel: string;
  /** 세미나 · 수업 이름(지도 교수). 없으면 빈 문자열 */
  seminar: string;
  title: string;
  summary: string;
  receiptNo: string;
  submittedAtLabel: string;
  version: number;
  /** 「第1版」·「1차 제출」 (#34 — 맨 글자 v1 은 레벨로 읽혀서 쓰지 않아요) */
  versionLabel: string;
  fileName: string;
  fileSizeLabel: string;
  sha256: string;
}

export function selectReceipt(state: DemoState, challengeId: string, locale: Locale): ReceiptVM | null {
  const proposal = state.proposals.find((p) => p.challengeId === challengeId && p.mine);
  const challenge = state.challenges.find((c) => c.id === challengeId);
  if (!proposal || !challenge) return null;
  const latest = proposal.versions[proposal.versions.length - 1];
  const company = companyOf(state, challenge.companyId);
  return {
    companyName: company ? pick(company.name, locale) : "",
    challengeTitle: pick(challenge.title, locale),
    teamName: proposal.teamName,
    teamSizeLabel: translate("submit.teamSizeOption", locale, { count: proposal.teamSize }),
    seminar: proposal.seminar,
    title: proposal.title,
    summary: proposal.summary,
    receiptNo: proposal.receiptNo,
    submittedAtLabel: formatDateTime(latest.submittedAt, locale),
    version: latest.no,
    versionLabel: translate("proposal.version", locale, { version: latest.no }),
    fileName: latest.fileName,
    fileSizeLabel: formatBytes(latest.fileSizeBytes),
    sha256: latest.sha256,
  };
}

// ───────── 응모 중인 과제(SCR-04 맨 위, #28) ─────────

/** 기업 심사의 세 항목 — 기업 심사 화면(review.*)과 같은 이름·순서예요 */
export type ReviewItemKey = "creativity" | "feasibility" | "sdgContribution";
export const REVIEW_ITEMS: readonly ReviewItemKey[] = ["creativity", "feasibility", "sdgContribution"];

/** 심사 결과의 한 항목 (#30) */
export interface ReviewScoreVM {
  key: ReviewItemKey;
  /** 「創造性」 — 기업 심사 화면과 같은 문구 키(review.creativity …) */
  label: string;
  /** 1~5 */
  value: number;
  /** 만점 (REVIEW_SCORE_MAX = 5) */
  max: number;
  /** 「4/5」 */
  valueLabel: string;
  /** 가장 낮은 항목이 이것 하나뿐이면 true (= 「次に伸ばすポイント」) */
  lowest: boolean;
}

/**
 * 내 기획서에 기업이 낸 결과 (#30): 심사(점수·코멘트)했거나 표창했으면 「応募中の課題」 카드에 보여요.
 * 점수는 상을 받지 못해도 그 퀘스트의 SDG 항목에 EXP 로 들어가요(#45 — status.ts 의 reviewExp) — 그 숫자와 오른 레벨을 학생이 볼 수 있게 해요.
 */
export interface ApplicationReviewVM {
  /** 「企業からの審査結果」 */
  title: string;
  /** 점수 3개(5점 만점). 점수를 매기지 않고 표창만 했으면 빈 배열 */
  scores: ReviewScoreVM[];
  /** 평균(1~5, 소수 첫째 자리 — 기업 응모자 화면의 「総合」과 같은 값). 점수가 없으면 null */
  average: number | null;
  /** 「総合 4.0/5.0」 */
  averageLabel: string | null;
  /** 기업 코멘트 (비어 있으면 null) */
  comment: string | null;
  /** 「みなと海洋フーズ株式会社のコメント」 (코멘트가 없으면 null) */
  commentBy: string | null;
  /** 이 평가로 SDG 항목마다 받은 EXP = reviewExp(점수) (0~REVIEW_EXP_MAX, 점수가 없으면 0) */
  exp: number;
  /** 「EXP +130（SDG 14・12）」 (점수가 없으면 null) */
  expLabel: string | null;
  /** 이 평가로 레벨이 오른 스테이터스 항목: 「14 海の豊かさを守ろう Lv.3にアップ！」 */
  statusLevelUps: string[];
  /** 가장 낮은 항목이 하나뿐일 때만 「次に伸ばすポイント：実現可能性」 (같은 점수로 여럿이 가장 낮으면 null) */
  improveLabel: string | null;
  award: AwardKind | null;
  /** 「最優秀賞を受賞」 */
  awardLabel: string | null;
  /** 받은 보상이 상품일 때 「報酬アイテム「…」を手に入れた！（…から届きます）」 (#37 · #47 — 상금을 골랐거나 아직 고르지 않았으면 null) */
  rewardItemLabel: string | null;
  /** 받은 보상이 상금일 때 「賞金 30,000円を受け取りました（企業から直接お振込み）」 (#47) */
  prizeLabel: string | null;
  /** 상금과 상품 중에서 아직 고르지 않았으면 true — 카드에 「報酬を えらぶ」 (#47) */
  rewardPending: boolean;
  /** 수상해서 얻은 스킬(#38 · #45): 「SDG 14・12の スキルを おぼえた！」 · 「SDG 14の スキルが レベルアップ！（Lv.2）」 (수상이 아니면 null) */
  skillLearned: HeroSkillVM | null;
  /** 스크린 리더용 요약: 「企業からの審査結果：創造性 4/5・実現可能性 3/5・SDGs貢献度 5/5、総合 4.0/5.0。EXP +120（SDG 14・12）」 */
  summary: string;
}

/** applicationReview 에 넘기는 덧붙임 — 상품 보상 · 수상 기록 · EXP 가 들어간 SDG 와 지금의 EXP(레벨이 올랐는지) */
export interface ReviewExtras {
  rewardItemName?: string;
  /** 받은 보상(#47 — wallet.ts 의 rewardChosen) */
  rewardChoice?: QuestReward | null;
  /** 상금과 상품 중에서 아직 고르지 않았는지(#47) */
  rewardPending?: boolean;
  /** 「30,000円」 */
  prizeAmount?: string;
  /** 이 기획서의 수상 기록(있으면 「…スキルを おぼえた！」) */
  skill?: HeroSkill;
  /** 가진 수상 기록 전체 — 스킬 레벨을 세요 */
  allSkills?: readonly HeroSkill[];
  /** 퀘스트의 SDG(EXP 가 들어간 곳) */
  sdgIds?: readonly SdgId[];
  /** 지금의 SDG 별 EXP(computeSdgExp) — 이 평가로 레벨이 올랐는지 봐요 */
  statusExp?: Record<SdgId, number>;
}

/** 내 기획서 하나의 심사 결과 화면 모델. 기업이 아직 아무 결과도 내지 않았으면 null (#30) */
export function applicationReview(proposal: Proposal, companyName: string, locale: Locale, extras: ReviewExtras = {}): ApplicationReviewVM | null {
  const { rewardItemName, rewardChoice = null, prizeAmount, skill, allSkills, sdgIds = [], statusExp } = extras;
  const review = proposal.review;
  if (!review && !proposal.award) return null;
  const title = translate("impact.reviewTitle", locale);
  const scores: ReviewScoreVM[] = [];
  if (review) {
    const lowest = Math.min(...REVIEW_ITEMS.map((key) => review[key]));
    const lowestKeys = REVIEW_ITEMS.filter((key) => review[key] === lowest);
    for (const key of REVIEW_ITEMS) {
      scores.push({
        key,
        label: translate(`review.${key}`, locale),
        value: review[key],
        max: REVIEW_SCORE_MAX,
        valueLabel: translate("impact.reviewScore", locale, { score: review[key], max: REVIEW_SCORE_MAX }),
        lowest: lowestKeys.length === 1 && lowestKeys[0] === key,
      });
    }
  }
  const average = averageScore(review);
  const averageLabel = average === null ? null : translate("applicants.average", locale, { score: average.toFixed(1) });
  const exp = reviewExp(review);
  const sdgList = sdgIds.join(locale === "ja" ? "・" : ", ");
  const expLabel = review ? translate(sdgIds.length > 0 ? "impact.reviewExp" : "impact.reviewExpPlain", locale, { exp, sdgs: sdgList }) : null;
  const levelUps = review && statusExp ? statusLevelUps(statusExp, sdgIds, exp) : [];
  const statusUps = levelUps.map((up) => translate("impact.reviewLevelUp", locale, { id: up.sdgId, name: pick(getSdg(up.sdgId).name, locale), level: up.level }));
  const weakest = scores.find((score) => score.lowest);
  const improveLabel = weakest ? translate("impact.reviewImprove", locale, { item: weakest.label }) : null;
  const comment = review && review.comment.trim() !== "" ? review.comment.trim() : null;
  const awardText = proposal.award ? translate("impact.reviewAward", locale, { award: awardLabel(proposal.award, locale) }) : null;
  // 요약: 점수·평균·반영 포인트 → 다음에 키울 점 → 수상 (문장 끝은 언어마다: 。 / .)
  const head = average !== null && averageLabel && expLabel
    ? translate("impact.reviewSummary", locale, { title, scores: scores.map((score) => `${score.label} ${score.valueLabel}`).join("・"), average: averageLabel, exp: expLabel })
    : title;
  const learned = proposal.award && skill ? heroSkillVM(skill, locale, allSkills ?? [skill]) : null;
  // 요약: 점수·평균·EXP → 오른 레벨 → 다음에 키울 점 → 수상 → 얻은 스킬 (문장 끝은 언어마다: 。 / .)
  const strip = (text: string) => text.replace(/[！!。.]+$/u, "");
  const summary = [head, ...statusUps.map(strip), improveLabel, awardText, ...(learned ? learned.learnedLines.map(strip) : [])]
    .filter((part): part is string => part !== null)
    .map((part) => (locale === "ja" ? `${part}。` : `${part}.`))
    .join(locale === "ja" ? "" : " ");
  return {
    title,
    scores,
    average,
    averageLabel,
    comment,
    commentBy: comment ? translate("impact.reviewCommentBy", locale, { company: companyName }) : null,
    exp,
    expLabel,
    statusLevelUps: statusUps,
    improveLabel,
    award: proposal.award,
    awardLabel: awardText,
    rewardItemLabel: proposal.award && rewardItemName && rewardChoice === "item" ? translate("impact.rewardItemWon", locale, { item: rewardItemName, company: companyName }) : null,
    prizeLabel: proposal.award && prizeAmount && rewardChoice === "prize" ? translate("impact.prizeWon", locale, { amount: prizeAmount }) : null,
    rewardPending: extras.rewardPending ?? false,
    skillLearned: learned,
    summary,
  };
}

/** 내가 기획서를 낸 과제 중 아직 결과가 나오지 않은 것(모집 중·심사 중) 한 건 */
export interface ApplicationVM {
  challengeId: string;
  companyName: string;
  challengeTitle: string;
  status: ChallengeStatus;
  /** 「募集中」·「審査中」 */
  statusLabel: string;
  /** 모집 중이면 「締切 2026年11月11日（D-12）」, 심사 중이면 null (마감이 지났으니까요) */
  deadlineLabel: string | null;
  /** 최신 버전 번호 (다시 내면 올라가요) */
  version: number;
  /** 「提出済み（第2版）」·「2차 제출 완료」 (#34) */
  versionLabel: string;
  /** 최신 버전을 낸 시각 "YYYY-MM-DDTHH:mm" (정렬용) */
  submittedAt: string;
  sdgIds: SdgId[];
  /** 기업이 심사·표창했으면 그 결과 (#30). 아직이면 null — 카드에는 지금처럼 상태만 보여요 */
  review: ApplicationReviewVM | null;
  /** 내 기획서 id (#47 — 「報酬を えらぶ」로 퀘스트 달성 창을 다시 열 때) */
  proposalId: string;
}

/**
 * 마이 임팩트 맨 위의 「応募中の課題」: 내 기획서(mine) 중 과제가 모집 중·심사 중인 것을 최근에 낸 순서로.
 * 마감(closed)된 과제는 결과가 나온 것이라 여기서 빠지고 참여 실적에만 남아요. 처음 상태(샘플)에는 내 기획서가 없어서 빈 목록이에요.
 */
export function selectApplications(state: DemoState, locale: Locale): ApplicationVM[] {
  const rows: ApplicationVM[] = [];
  const statusExp = computeSdgExp(deriveActivities(state));
  for (const proposal of state.proposals) {
    if (!proposal.mine) continue;
    const challenge = state.challenges.find((c) => c.id === proposal.challengeId);
    if (!challenge || challenge.status === "closed") continue;
    const latest = proposal.versions[proposal.versions.length - 1];
    if (!latest) continue;
    const company = companyOf(state, challenge.companyId);
    const companyName = company ? pick(company.name, locale) : "";
    rows.push({
      challengeId: challenge.id,
      companyName,
      challengeTitle: pick(challenge.title, locale),
      status: challenge.status,
      statusLabel: challengeStatusLabel(challenge.status, locale),
      deadlineLabel:
        challenge.status === "open"
          ? translate("impact.applicationDeadline", locale, {
              date: formatDate(challenge.closesOn, locale),
              dday: dDayLabel(daysBetween(state.today, challenge.closesOn), locale),
            })
          : null,
      version: latest.no,
      versionLabel: translate("challenge.submitted", locale, { version: latest.no }),
      submittedAt: latest.submittedAt,
      sdgIds: challenge.sdgIds,
      proposalId: proposal.id,
      review: applicationReview(proposal, companyName, locale, {
        rewardItemName: challenge.rewardItem ? pick(challenge.rewardItem.name, locale) : undefined,
        rewardChoice: rewardChosen(state, proposal),
        rewardPending: rewardPending(state, proposal),
        prizeAmount: challenge.prizeYen > 0 ? formatYen(challenge.prizeYen, locale) : undefined,
        skill: state.skills.find((skill) => skill.proposalId === proposal.id),
        allSkills: state.skills,
        sdgIds: challenge.sdgIds,
        statusExp,
      }),
    });
  }
  // 최근에 낸 것이 위로 (같은 시각이면 과제 id 순서로 고정)
  return rows.sort((a, b) => (a.submittedAt === b.submittedAt ? a.challengeId.localeCompare(b.challengeId) : a.submittedAt < b.submittedAt ? 1 : -1));
}

// ───────── 마이 포트폴리오(SCR-04) ─────────

export interface BadgeVM {
  code: BadgeCode;
  emoji: string;
  name: string;
  desc: string;
}

/** 스테이터스 창의 한 줄(#43 · #45): SDG 항목 하나의 EXP 와 레벨 */
export interface SdgStatVM {
  id: SdgId;
  /** 목표의 공식 이름: 「海の豊かさを守ろう」 */
  name: string;
  /** 짧은 이름: 「海」 */
  short: string;
  /** 기업 평가로 쌓인 EXP */
  exp: number;
  level: number;
  /** 「Lv.2」 */
  levelLabel: string;
  /** 「EXP 110」 */
  expLabel: string;
  /** 「次まで 90」 · 최고 레벨이면 「MAX」 */
  nextLabel: string;
  /** 지금 레벨 안에서 채운 정도 0~100 (막대) */
  progress: number;
  /** 최고 레벨(Lv.10) */
  max: boolean;
  color: string;
  textColor: string;
  /** EXP 가 가장 높은 3개 — 「得意」 */
  top: boolean;
  /** 화면 읽기 프로그램용: 「目標14 海の豊かさを守ろう レベル2 経験値110、次のレベルまで90（得意）」 */
  ariaLabel: string;
}

export interface ImpactVM {
  nickname: string;
  university: string;
  faculty: string;
  /** 내부 점수(정렬용) — 화면에는 숫자로 보여 주지 않아요 */
  totalPoints: number;
  /** 스킬(#45): 수상으로 얻은 SDG 마다의 스킬과 레벨(레벨이 높은 것부터) */
  sdgSkills: SdgSkillVM[];
  /** 스킬이 된 수상 기록(최근 것부터) */
  skills: HeroSkillVM[];
  /** 「スキル 4」 = SDG 스킬의 수 */
  skillCountLabel: string;
  /** 「クエストで受賞すると、…スキルのレベルが上がります。」 */
  skillsHint: string;
  /** 스테이터스 창(#43 · #45): 17개 항목을 번호 순으로 — 공식 이름 · Lv · EXP(기업 평가로 쌓여요) · EXP 가 가장 높은 3개는 「得意」 */
  stats: SdgStatVM[];
  badges: BadgeVM[];
  activities: ActivityVM[];
  /** 스카우트 수신 설정(포인트·스킬과 관계없는 학생의 선택) — 화면은 스킬과 떨어진 줄에 보여요 */
  scoutable: boolean;
  /** 「スカウトの受け取り：オン」 */
  scoutStatus: string;
  /** 「企業の人材検索にあなたのプロフィールが表示されます」 */
  scoutNote: string;
}

/** 학생의 스카우트 수신 설정 화면 모델(설정 화면의 스위치와 Impact 화면의 한 줄이 같은 문구를 써요) */
export interface ScoutSettingVM {
  enabled: boolean;
  status: string;
  note: string;
}

export function selectScoutSetting(state: DemoState, locale: Locale): ScoutSettingVM {
  const t = makeT(locale);
  const enabled = state.me.scoutable;
  return {
    enabled,
    status: t(enabled ? "impact.scoutStatusOn" : "impact.scoutStatusOff"),
    note: t(enabled ? "impact.profileScoutOn" : "impact.profileScoutOff"),
  };
}

export function badgeVM(code: BadgeCode, locale: Locale): BadgeVM {
  return { code, emoji: BADGE_EMOJI[code], name: translate(`badge.${code}.name`, locale), desc: translate(`badge.${code}.desc`, locale) };
}

/** 수상 기록 1개의 화면 모델(#38 · #45): 이 수상으로 퀘스트의 SDG 마다 스킬을 얻었어요. 대표 SDG(첫 번째)의 색 · ★ 은 상의 세기(최우수상 ★★★) */
export interface HeroSkillVM {
  id: string;
  name: string;
  sdgIds: SdgId[];
  sdgId: SdgId;
  color: string;
  textColor: string;
  awardLabel: string;
  stars: 1 | 2 | 3;
  /** 「優秀賞・みなと海洋フーズ・2026/10/17」 */
  metaLabel: string;
  /** 「受賞したクエスト：…」 */
  questLabel: string;
  /** 화면 읽기 프로그램용 한 줄 */
  ariaLabel: string;
  /** 이 수상으로 얻은 것: 「SDG 14・12の スキルを おぼえた！」 · 이미 있던 SDG 는 「SDG 14の スキルが レベルアップ！（Lv.2）」 */
  learnedLines: string[];
  /** learnedLines 를 한 줄로 */
  learnedLabel: string;
  activityId: string;
  proposalId: string | null;
}

/** 수상 기록 1개. all = 가진 기록 전체(이 수상 때 SDG 마다 몇 레벨이 됐는지 세요) */
export function heroSkillVM(skill: HeroSkill, locale: Locale, all: readonly HeroSkill[] = [skill]): HeroSkillVM {
  const name = pick(skill.name, locale);
  const sdgId = skill.sdgIds[0] ?? 17;
  const award = awardLabel(skill.award, locale);
  const sep = locale === "ja" ? "・" : ", ";
  const levels = [...new Set(skill.sdgIds)].map((id) => ({ id, level: Math.max(1, skillLevel(all, id, skill.learnedOn)) }));
  const fresh = levels.filter((entry) => entry.level === 1).map((entry) => entry.id);
  const learnedLines = [
    ...(fresh.length > 0 ? [translate("impact.skillLearnedNew", locale, { sdgs: fresh.join(sep) })] : []),
    ...levels.filter((entry) => entry.level > 1).map((entry) => translate("impact.skillLevelUp", locale, { sdg: entry.id, level: entry.level })),
  ];
  return {
    id: skill.id,
    name,
    sdgIds: skill.sdgIds,
    sdgId,
    color: getSdg(sdgId).color,
    textColor: sdgTextColor(sdgId),
    awardLabel: award,
    stars: AWARD_STARS[skill.award],
    metaLabel: translate("impact.skillMeta", locale, { award, company: pick(skill.companyName, locale), date: formatDate(skill.learnedOn, locale) }),
    questLabel: translate("impact.skillQuest", locale, { quest: pick(skill.questTitle, locale) }),
    ariaLabel: translate("impact.skillAria", locale, { skill: name, sdgs: skill.sdgIds.join(sep), award }),
    learnedLines,
    learnedLabel: learnedLines.join(locale === "ja" ? "" : " "),
    activityId: skill.activityId,
    proposalId: skill.proposalId ?? null,
  };
}

export function selectSkills(state: Pick<DemoState, "skills">, locale: Locale): HeroSkillVM[] {
  return sortSkills(state.skills).map((skill) => heroSkillVM(skill, locale, state.skills));
}

/** SDG 하나의 스킬(#45): 그 SDG 가 붙은 퀘스트에서 받은 상이 쌓여 레벨이 올라요 */
export interface SdgSkillVM {
  sdgId: SdgId;
  /** 목표의 공식 이름: 「海の豊かさを守ろう」 */
  goal: string;
  short: string;
  color: string;
  textColor: string;
  /** = 그 SDG 가 붙은 수상의 수 */
  level: number;
  /** 「スキルLv.2」 */
  levelLabel: string;
  /** 「受賞 2件」 */
  countLabel: string;
  /** 이 스킬이 된 수상의 이름(최근 것부터): 「エコ包装デザイン・プラごみ削減アイデア」 */
  recordsLabel: string;
  /** 전투에서 쓸 때의 효과 모양(#42 — 14 는 큰 파도) */
  effect: SkillEffectKind;
  /** 「SDG 14 海の豊かさを守ろうのスキル、レベル2、受賞2件」 */
  ariaLabel: string;
}

export function selectSdgSkills(state: Pick<DemoState, "skills">, locale: Locale): SdgSkillVM[] {
  return sdgSkills(state.skills).map((entry) => {
    const goal = pick(getSdg(entry.sdgId).name, locale);
    return {
      sdgId: entry.sdgId,
      goal,
      short: sdgShort(entry.sdgId, locale),
      color: getSdg(entry.sdgId).color,
      textColor: sdgTextColor(entry.sdgId),
      level: entry.level,
      levelLabel: translate("impact.skillLevel", locale, { level: entry.level }),
      countLabel: translate("impact.skillRecordCount", locale, { count: entry.records.length }),
      recordsLabel: entry.records.map((record) => pick(record.name, locale)).join(locale === "ja" ? "・" : ", "),
      effect: SDG_EMBLEMS[entry.sdgId].effect,
      ariaLabel: translate("impact.sdgSkillAria", locale, { id: entry.sdgId, goal, level: entry.level, count: entry.records.length }),
    };
  });
}

export function selectImpact(state: DemoState, locale: Locale): ImpactVM {
  const activities = deriveActivities(state);
  const index = computeImpactIndex(activities);
  const exp = computeSdgExp(activities);
  const top = topStatusSdgs(exp);
  const t = makeT(locale);
  const skills = selectSkills(state, locale);
  const owned = selectSdgSkills(state, locale);
  return {
    nickname: state.me.nickname,
    university: pick(state.me.university, locale),
    faculty: pick(state.me.faculty, locale),
    totalPoints: index.totalPoints,
    sdgSkills: owned,
    skills,
    skillCountLabel: t("impact.skillCount", { count: owned.length }),
    skillsHint: t("impact.skillsHint"),
    stats: SDG_IDS.map((id) => {
      const name = getSdg(id).name[locale];
      const level = statusLevel(exp[id]);
      const max = level.nextAt === null;
      const isTop = top.includes(id);
      const aria = t("impact.statAria", { id, name, level: level.level, exp: exp[id], next: max ? t("impact.statAriaMax") : t("impact.statAriaNext", { remaining: level.remaining }) });
      return {
        id,
        name,
        short: sdgShort(id, locale),
        exp: exp[id],
        level: level.level,
        levelLabel: t("impact.statLevel", { level: level.level }),
        expLabel: t("impact.statExp", { exp: exp[id] }),
        nextLabel: max ? t("impact.statMax") : t("impact.statNext", { next: level.remaining }),
        progress: Math.round(level.ratio * 100),
        max,
        color: getSdg(id).color,
        textColor: sdgTextColor(id),
        top: isTop,
        ariaLabel: isTop ? t("impact.statAriaTop", { label: aria }) : aria,
      };
    }),
    badges: computeBadges(activities).map((code) => badgeVM(code, locale)),
    activities: activities.map((a) => activityVM(a, locale)),
    ...scoutFields(state, locale),
  };
}

function scoutFields(state: DemoState, locale: Locale): Pick<ImpactVM, "scoutable" | "scoutStatus" | "scoutNote"> {
  const scout = selectScoutSetting(state, locale);
  return { scoutable: scout.enabled, scoutStatus: scout.status, scoutNote: scout.note };
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

/**
 * 위·변조 테스트(데모)용: 눈에 보이는 내용(수상 등급)을 바꾼 사본 — 참가·우수상 증명서를 「最優秀賞」으로 꾸미는 위조를 흉내 내요
 * (이미 최우수상이면 「優秀賞」으로). 해시는 그대로라서 verifyCertificate 가 false 를 돌려줘요.
 */
export function tamperedCopy(cert: Certificate): Certificate {
  return { ...cert, kind: "award", award: cert.award === "grand" ? "excellence" : "grand" };
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
  // 수상한 퀘스트에 상품 보상이 걸려 있으면 카드와 공유 글에 「◯◯提供」 표시와 함께 넣어요(#37)
  const proposal = selected.proposalId ? state.proposals.find((p) => p.id === selected.proposalId) : undefined;
  // #47 상품을 받은 수상만(상금을 골랐으면 상품은 없어요)
  const rewardItem = proposal && rewardChosen(state, proposal) === "item" ? state.challenges.find((c) => c.id === proposal.challengeId)?.rewardItem : undefined;
  const card = buildShareCard({
    nickname: state.me.nickname,
    activity: selected,
    rewardItemName: rewardItem ? pick(rewardItem.name, locale) : undefined,
    participationCount: all.filter((a) => a.kind === "participation" || a.kind === "submission").length,
    skillCount: sdgSkills(state.skills).length,
    skillSdgIds: skillSdgIds(state.skills),
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
        companyAccent: company?.accent ?? COLORS.primary,
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

export type KpiId = "open" | "applicants" | "pending" | "matches" | "fees";
/** 대시보드 안에서 숫자 카드가 가리키는 칸 (#33): 課題の管理 · お支払い（手数料） */
export type DashboardSection = "challenges" | "fees";
/** 숫자 카드를 누르면 가는 곳 (#33): 대시보드의 칸, 또는 상태 필터가 켜진 응모자 화면(모든 과제) */
export type KpiTarget = { kind: "section"; section: DashboardSection } | { kind: "applicants"; filter: ApplicantFilter };

export const KPI_TARGETS: Record<KpiId, KpiTarget> = {
  open: { kind: "section", section: "challenges" },
  applicants: { kind: "applicants", filter: "all" },
  pending: { kind: "applicants", filter: "submitted" },
  matches: { kind: "applicants", filter: "adopted" },
  fees: { kind: "section", section: "fees" },
};

export interface KpiVM {
  id: KpiId;
  label: string;
  value: string;
  /** 누르면 가는 곳 (#33) */
  target: KpiTarget;
  /** 스크린 리더용 이름: 「審査待ち 7（審査待ちの応募者を見る）」 — 숫자와 어디로 가는지가 함께 들어가요 */
  actionLabel: string;
}

/** 대시보드 「お支払い（手数料）」: 수수료 규칙 · 무료인 것 · 합계 · 수수료가 생긴 거래(상금 지급 · 연구 완료) */
export interface FeeVM {
  /** 상금·연구 의뢰비의 10%(최저 ¥9,000)를 기업이 따로 낸다는 한 줄 */
  rule: string;
  /** 무료인 것(인턴 채용 · 기업 간 업무 의뢰)과 기부(임의) 한 줄 */
  free: string;
  totals: { count: number; base: string; fee: string };
  rows: { id: string; kind: FeeKind; kindLabel: string; title: string; dateLabel: string; baseLabel: string; feeLabel: string }[];
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
  const items = feeItems(state, state.myCompanyId);
  const total = summarizeFees(items);
  return {
    rule: translate("fee.rule", locale, { min: formatYen(PLATFORM_FEE_MIN_YEN, locale) }),
    free: translate("fee.free", locale),
    totals: { count: total.count, base: formatYen(total.baseYen, locale), fee: formatYen(total.feeYen, locale) },
    rows: items.map((item) => ({
      id: item.id,
      kind: item.kind,
      kindLabel: translate(`fee.kind.${item.kind}`, locale),
      title: pick(item.title, locale),
      dateLabel: formatDate(item.date, locale),
      baseLabel: formatYen(item.baseYen, locale),
      feeLabel: formatYen(item.feeYen, locale),
    })),
    note: translate("fee.note", locale),
  };
}

export function selectB2bDashboard(state: DemoState, locale: Locale): B2bDashboardVM {
  const t = makeT(locale);
  const company = companyOf(state, state.myCompanyId);
  const mine = state.challenges.filter((c) => c.companyId === state.myCompanyId);
  const mineIds = new Set(mine.map((c) => c.id));
  const pending = state.proposals.filter((p) => mineIds.has(p.challengeId) && p.status === "submitted").length;
  const matches = state.matches.filter((m) => m.companyId === state.myCompanyId).length;
  const fees = summarizeFees(feeItems(state, state.myCompanyId));
  const name = company ? pick(company.name, locale) : "";
  const kpi = (id: KpiId, label: string, value: string): KpiVM => ({ id, label, value, target: KPI_TARGETS[id], actionLabel: t("b2b.kpiAction", { label, value, go: t(`b2b.kpiGo.${id}`) }) });
  return {
    companyName: name,
    companyEmoji: company?.emoji ?? "🏢",
    companyAccent: company?.accent ?? COLORS.primary,
    welcome: t("b2b.welcome", { company: name }),
    kpis: [
      kpi("open", t("b2b.kpiOpen"), String(mine.filter((c) => isOpenFor(c, state.today)).length)),
      kpi("applicants", t("b2b.kpiApplicants"), formatPeople(mine.reduce((sum, c) => sum + c.applicants, 0), locale)),
      kpi("pending", t("b2b.kpiPending"), String(pending)),
      kpi("matches", t("b2b.kpiMatches"), String(matches)),
      kpi("fees", t("b2b.kpiFees"), formatYen(fees.feeYen, locale)),
    ],
    challenges: mine
      .map((c) => challengeCard(state, c, locale))
      .sort((a, b) => Number(b.isOpen) - Number(a.isOpen) || a.daysLeft - b.daysLeft || a.id.localeCompare(b.id)),
    fee: selectFees(state, locale),
  };
}

// ───────── 응모자·심사 ─────────

/** 응모자 화면의 상태 필터 (#33): 전체 · 審査待ち(submitted) · 審査済み · 受賞 · 採用 — 기획서 상태(ProposalStatus) 하나에 하나씩 맞아요 */
export type ApplicantFilter = "all" | ProposalStatus;
export const APPLICANT_FILTERS: readonly ApplicantFilter[] = ["all", "submitted", "reviewed", "awarded", "adopted"];
/** 응모자 화면에서 「すべての課題」를 고른 값 (과제 id 와 겹치지 않아요 — 과제 id 는 ch-… 꼴) */
export const ALL_CHALLENGES = "all";

/** 주소의 ?status= 값을 필터로 읽어요 (모르는 값·빈 값은 전체) */
export function parseApplicantFilter(raw: string | null | undefined): ApplicantFilter {
  return APPLICANT_FILTERS.find((filter) => filter === raw) ?? "all";
}

export interface ApplicantVM {
  id: string;
  /** 이 기획서가 응모한 과제 — 「すべての課題」로 볼 때 카드에 과제 이름이 붙고, 홍보 글 링크도 이 과제로 열려요 */
  challengeId: string;
  /** 「課題：海洋プラスチックを減らす新しい包装アイデア」 */
  challengeLabel: string;
  teamName: string;
  teamSize: number;
  /** 「チーム：クリーンシーサイド（4人）」 */
  teamLabel: string;
  /** 세미나 · 수업 이름(지도 교수). 없으면 빈 문자열 — 있으면 카드에 「ゼミで参加」 표시 */
  seminar: string;
  /** 「ゼミ・授業：海洋環境ゼミ（指導：山田先生）」 (세미나가 없으면 null) */
  seminarLabel: string | null;
  title: string;
  summary: string;
  /** 「第1版」·「1차 제출」 — 제출 버전(다시 내면 올라가요). 레벨(Lv.n)과 헷갈리지 않게 맨 글자 v1 은 쓰지 않아요 (#34) */
  versionLabel: string;
  /** 버전 칩의 스크린 리더 이름: 「提出された企画書の第1版」 */
  versionA11y: string;
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
  /** 맨 앞은 「すべての課題」(id = ALL_CHALLENGES, all = true), 그다음 응모가 있는 과제부터 */
  challengeOptions: { id: string; title: string; statusLabel: string; all: boolean }[];
  /** 고른 과제 id, 또는 ALL_CHALLENGES */
  selectedId: string | null;
  /** 고른 과제 (「すべての課題」면 null) */
  selected: ChallengeCardVM | null;
  /** 「すべての課題」를 보고 있어요 */
  allChallenges: boolean;
  filter: ApplicantFilter;
  /** 상태 필터 칩: 이름과 (고른 범위 안의) 건수 — 건수를 더하면 전체와 같아요 */
  filters: { id: ApplicantFilter; label: string; count: number }[];
  /** 필터에 맞는 응모 (+ 방금 손댄 응모 keep), 점수 높은 순 */
  applicants: ApplicantVM[];
  /** 대시보드 숫자(샘플 응모자 수·지난 매칭)와 이 목록의 수가 다를 때 그 이유 한 줄 (같으면 null) */
  countNote: string | null;
  /** 필터 때문에 목록이 비었을 때의 안내 (응모가 하나도 없으면 applicants.empty) */
  emptyLabel: string;
  feeNote: string;
}

export function averageScore(review: Review | null): number | null {
  if (!review) return null;
  return Math.round(((review.creativity + review.feasibility + review.sdgContribution) / 3) * 10) / 10;
}

export function applicantVM(p: Proposal, locale: Locale, challengeTitle = ""): ApplicantVM {
  const latest = p.versions[p.versions.length - 1];
  const average = averageScore(p.review);
  return {
    id: p.id,
    challengeId: p.challengeId,
    challengeLabel: translate("applicants.challenge", locale, { title: challengeTitle }),
    teamName: p.teamName,
    teamSize: p.teamSize,
    teamLabel: translate("applicants.teamWithSize", locale, { name: p.teamName, size: p.teamSize }),
    seminar: p.seminar,
    seminarLabel: p.seminar === "" ? null : translate("applicants.seminar", locale, { name: p.seminar }),
    title: p.title,
    summary: p.summary,
    versionLabel: translate("proposal.version", locale, { version: latest.no }),
    versionA11y: translate("proposal.versionA11y", locale, { version: latest.no }),
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

/**
 * 응모자·심사 화면. challengeId 는 과제 id 또는 ALL_CHALLENGES(모든 과제를 한꺼번에 — 대시보드 숫자 카드가 여기로 와요, #33), 모르는 값·null 이면 응모가 있는 첫 과제.
 * filter 는 상태 필터, keep 은 필터에 맞지 않아도 남겨 둘 응모 id — 「審査待ち」로 보다가 심사를 저장해도 그 카드가 목록에서 갑자기 사라지지 않게 화면이 넘겨요.
 */
export function selectApplicants(state: DemoState, locale: Locale, challengeId: string | null, filter: ApplicantFilter = "all", keep: readonly string[] = []): ApplicantsVM {
  const t = makeT(locale);
  const mine = state.challenges.filter((c) => c.companyId === state.myCompanyId);
  const withProposals = mine.filter((c) => state.proposals.some((p) => p.challengeId === c.id));
  const optionSource = [...withProposals, ...mine.filter((c) => !withProposals.includes(c))];
  const allChallenges = challengeId === ALL_CHALLENGES && mine.length > 0;
  const selectedChallenge = allChallenges ? null : (optionSource.find((c) => c.id === challengeId) ?? withProposals[0] ?? mine[0] ?? null);
  const scope = allChallenges ? mine : selectedChallenge ? [selectedChallenge] : [];
  const scopeIds = new Set(scope.map((c) => c.id));
  const titles = new Map(mine.map((c) => [c.id, pick(c.title, locale)]));
  const inScope = state.proposals.filter((p) => scopeIds.has(p.challengeId));
  const count = (id: ApplicantFilter) => (id === "all" ? inScope.length : inScope.filter((p) => p.status === id).length);
  const shown = inScope
    .filter((p) => filter === "all" || p.status === filter || keep.includes(p.id))
    .map((p) => applicantVM(p, locale, titles.get(p.challengeId) ?? ""))
    // 점수 높은 순(심사 전은 맨 뒤). 점수가 같으면 데모의 「あなたの提出」(학생 화면에서 낸 기획서)를 먼저 — 시연 D5 에서 처음 보이는 「審査」가 D2 에서 낸 그 기획서예요
    .sort((a, b) => (b.average ?? -1) - (a.average ?? -1) || Number(b.mine) - Number(a.mine) || a.id.localeCompare(b.id));
  // 대시보드의 「総応募者数」는 과제마다 적힌 응모자 수(샘플 포함)의 합이고, 「マッチング成立」은 지난 매칭 기록까지 세요.
  // 이 화면은 기획서가 있는 응모만 보여서 수가 다를 수 있어요 → 다를 때만 이유를 한 줄로 밝혀요 (#33)
  const people = scope.reduce((sum, c) => sum + c.applicants, 0);
  const matches = state.matches.filter((m) => m.companyId === state.myCompanyId).length;
  let countNote: string | null = null;
  if (filter === "all" && scope.length > 0 && people !== inScope.length) {
    countNote = t("applicants.countNote", { people: formatPeople(people, locale), count: inScope.length });
  } else if (filter === "adopted" && allChallenges && matches !== count("adopted")) {
    countNote = t("applicants.matchNote", { matches, count: count("adopted") });
  }
  return {
    challengeOptions: [
      ...(mine.length > 0 ? [{ id: ALL_CHALLENGES, title: t("applicants.allChallenges"), statusLabel: t("applicants.allChallengesHint", { count: mine.length }), all: true }] : []),
      ...optionSource.map((c) => ({ id: c.id, title: pick(c.title, locale), statusLabel: challengeStatusLabel(c.status, locale), all: false })),
    ],
    selectedId: allChallenges ? ALL_CHALLENGES : (selectedChallenge?.id ?? null),
    selected: selectedChallenge ? challengeCard(state, selectedChallenge, locale) : null,
    allChallenges,
    filter,
    filters: APPLICANT_FILTERS.map((id) => ({ id, label: t(`applicants.filter.${id}`), count: count(id) })),
    applicants: shown,
    countNote,
    // 응모가 하나도 없으면 「応募はまだありません」, 응모자 수(샘플)만 있고 기획서가 없으면 「表示できる企画書はありません」, 필터에 맞는 것이 없으면 「この条件の…」
    emptyLabel: inScope.length > 0 ? t("applicants.filterEmpty") : people > 0 ? t("applicants.noProposals") : t("applicants.empty"),
    feeNote: translate("review.feeNote", locale, { min: formatYen(PLATFORM_FEE_MIN_YEN, locale) }),
  };
}

// ───────── 인재 스카우트 ─────────

export interface CandidateVM {
  id: string;
  nickname: string;
  university: string;
  faculty: string;
  /** #38 스킬 수(= 수상 수) — 기업 화면에도 포인트 숫자 대신 「スキル 2」로 보여요 */
  skillsLabel: string;
  /** 내부 점수(정렬의 마지막 기준) — 화면에는 숫자로 보여 주지 않아요 */
  points: number;
  awards: number;
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
  return {
    id: c.id,
    nickname: c.nickname,
    university: pick(c.university, locale),
    faculty: pick(c.faculty, locale),
    skillsLabel: translate("talent.skills", locale, { count: c.awards }),
    points: c.points,
    awards: c.awards,
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
    // 스킬 = 수상 (#38) — 저장된 스킬 수와 같아요
    awards: Math.max(state.skills.length, activities.filter((a) => a.kind === "award").length),
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
    // 스카우트할 수 있는 사람 → 데모 학생(나) → 스킬(수상) 수 → 내부 점수 → 이름 순
    .sort(
      (a, b) =>
        Number(b.canScout) - Number(a.canScout) ||
        Number(b.isDemoStudent) - Number(a.isDemoStudent) ||
        b.awards - a.awards ||
        b.points - a.points ||
        a.nickname.localeCompare(b.nickname),
    );
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
  /** 실천 마크의 별 수: 0(未取得) · 0.5 ~ 5.0 (#35) */
  stars: number;
  /** "★2.5" / 별 0 이면 "未取得" */
  starsLabel: string;
  /** 별 그림 5칸 (가득·반·빈) — 숫자(starsLabel)와 늘 함께 보여요 */
  starIcons: StarIcon[];
  /** 별 그림의 스크린 리더 이름: "SDGs取組みマーク 5段階中2.5" / "SDGs取組みマーク 未取得" */
  markLabel: string;
  scoreLabel: string;
  /** "次の★3.0まであと 7点" — ★5.0 이면 "最高の★5.0です" */
  nextLabel: string;
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
  const paid = summarizeFees(feeItems(state, state.myCompanyId));
  const starsLabel = result.stars > 0 ? t("mark.stars", { stars: formatStars(result.stars) }) : t("esg.certNone");
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
    stars: result.stars,
    starsLabel,
    starIcons: certStarIcons(result.stars),
    markLabel: certMarkA11yLabel(result.stars, locale),
    scoreLabel: t("esg.certScore", { score: result.total }),
    nextLabel:
      result.pointsToNext === null || result.nextStars === null
        ? t("esg.certMax", { stars: formatStars(result.stars) })
        : t("esg.certNext", { stars: formatStars(result.nextStars), points: result.pointsToNext }),
    items,
    byCategory: [
      { key: "E", label: t("esg.e"), score: result.byCategory.E },
      { key: "S", label: t("esg.s"), score: result.byCategory.S },
      { key: "G", label: t("esg.g"), score: result.byCategory.G },
    ],
    highlights: [
      t("esg.hlChallenges", { count: mine.length }),
      t("esg.hlApplicants", { count: formatPeople(mine.reduce((sum, c) => sum + c.applicants, 0), locale) }),
      t("esg.hlPaid", { amount: formatYen(paid.baseYen, locale) }),
      t("esg.hlCert", { mark: starsLabel }),
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
  /** 홍보 글: 회사 이름 옆의 SDGs 실천 마크 (#35 — 未取得·자랑 글은 null) */
  companyMark: CertMarkVM | null;
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
  /**
   * 공식 SNS 게시 신청 — 보는 사람에 따라 달라요: 글을 쓴 회사(기업 화면·우리 회사 글)는 예정이면 날짜·게시료, 게시됨이면 링크.
   * 그 밖의 사람(학생·다른 기업)은 예정이면 null(아무것도 안 보임), 게시됨이면 「公式SNSでも紹介中」 + 링크.
   */
  official: PostOfficialVM | null;
  /** 공유·복사로 내보낼 글 (홍보 글은 맨 앞에 [PR] 이 붙어요) */
  shareText: string;
}

/** 글 카드에 보이는 공식 SNS 게시 신청 */
export interface PostOfficialVM {
  /** author = 글을 쓴 회사가 보는 안내, public = 그 밖의 사람(학생·다른 기업)이 보는 안내 (게시된 뒤에만 있어요) */
  audience: OfficialAudience;
  status: OfficialShare["status"];
  /** author·예정 "公式SNS掲載予定 · Instagram · 11/5" / author·게시됨 "公式SNSに掲載済み · Instagram" / public·게시됨 "公式SNSでも紹介中 · Instagram" */
  label: string;
  /** "掲載料 ¥3,000（サンプル）" — 글을 쓴 회사가 보는 예정 안내에만 있어요 */
  feeLabel: string | null;
  /** 게시된 뒤의 링크: 게시글 주소 → 없으면 그 채널의 공식 계정 주소(OFFICIAL_ACCOUNT_URLS). 둘 다 없으면 null — 채널 이름만 보여요 */
  link: { url: string; label: string } | null;
  channel: OfficialChannel;
  /** 채널 이름: "X" / "Instagram" / "Facebook" (한국어는 인스타그램·페이스북) */
  channelName: string;
  /** 채널 이름 + 올라가는 모양: "X ポスト" / "Instagram フィード投稿" / "Facebook ページ投稿" */
  channelLabel: string;
}

export type OfficialAudience = "author" | "public";

/**
 * 공식 SNS 게시 신청을 보는 사람에 맞게 (#31): 예정일·게시료는 글을 쓴 회사에게만 보이고,
 * 다른 사람에게는 실제로 게시된 뒤에만 「公式SNSでも紹介中 · Instagram」과 링크가 보여요(예정이면 null).
 * 링크 글자는 게시글 주소가 있고 쓴 회사가 보면 「投稿を見る」, 그 밖에는 「公式SNSで見る」(공식 계정으로 이어질 때 포함)예요.
 */
export function officialShareVM(share: OfficialShare, audience: OfficialAudience, locale: Locale): PostOfficialVM | null {
  if (audience === "public" && share.status !== "posted") return null;
  const channelName = officialChannelName(share.channel, locale);
  const url = officialShareLink(share);
  const label =
    share.status === "scheduled"
      ? translate("feed.officialScheduled", locale, { channel: channelName, date: formatDateShort(share.on) })
      : translate(audience === "author" ? "feed.officialPostedMine" : "feed.officialPosted", locale, { channel: channelName });
  return {
    audience,
    status: share.status,
    label,
    feeLabel: audience === "author" && share.status === "scheduled" ? translate("feed.officialFee", locale, { fee: formatYen(share.feeYen, locale) }) : null,
    link: url === null ? null : { url, label: translate(audience === "author" && share.postUrl !== null ? "feed.officialViewPost" : "feed.officialViewOnSns", locale) },
    channel: share.channel,
    channelName,
    channelLabel: officialChannelLabel(share.channel, locale),
  };
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
      authorMeta: translate("feed.skills", locale, { count: post.authorSkills }),
      avatar: [...post.authorName][0]?.toUpperCase() ?? "?",
      avatarColor: null,
      verified: false,
      companyMark: null,
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
    companyMark: selectCompanyMark(state, post.companyId, locale),
    title,
    achievement: null,
    challenge: challenge ? { id: challenge.id, title: pick(challenge.title, locale) } : null,
    // 글을 쓴 회사 = 기업 화면이고 우리 회사의 글 (DB 에서는 그 기업의 담당자)
    official: post.official ? officialShareVM(post.official, role === "b2b" && post.companyId === state.myCompanyId ? "author" : "public", locale) : null,
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
  /** 글쓴이로 보이는 모습 (미리보기·머리말에 써요). mark = 홍보 글의 회사 이름 옆 SDGs 실천 마크 (#35 — 자랑 글·未取得은 null) */
  author: { name: string; meta: string; avatar: string; avatarColor: string | null; verified: boolean; mark: CertMarkVM | null };
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
  /** 홍보 글의 공식 SNS 게시 신청: 고를 수 있는 채널과 날짜(회사당 월 4회 · 내일 ~ 30일 뒤) */
  official: {
    feeYen: number;
    feeLabel: string;
    /** "1社につき月4回まで（すべてのSNSの合計）。掲載日は明日から30日後までの中から選べます（掲載料 ¥3,000・サンプル）" */
    hint: string;
    /** 채널 선택지 (화면 순서: X · Instagram · Facebook) */
    channels: OfficialChannelOptionVM[];
    /** 처음 골라 두는 채널 */
    defaultChannel: OfficialChannel;
    /** 한 회사가 한 달에 신청할 수 있는 횟수 (OFFICIAL_SHARE_MONTHLY_LIMIT) */
    limit: number;
    /** 게시 날짜 선택지: 내일부터 30일 뒤까지 하루씩 (한도를 다 쓴 달의 날짜도 available = false 로 들어 있어요) */
    dates: OfficialDateOptionVM[];
    /** 처음 골라 두는 날짜 = 고를 수 있는 가장 빠른 날. 고를 날이 없으면 null */
    defaultDate: string | null;
    /** 고를 날이 하나도 없을 때의 이유 (그때는 신청 스위치를 꺼 둬요). 고를 날이 있으면 null */
    unavailableReason: string | null;
    /** 기간 안에서 한도를 다 쓴 달마다 한 줄: "12月は掲載枠（月4回）を使い切ったため選べません" */
    fullMonthNotes: string[];
  };
}

/** 글쓰기의 채널 선택지 한 줄: 이름 · 올라가는 모양 */
export interface OfficialChannelOptionVM {
  id: OfficialChannel;
  /** "X" / "Instagram" / "Facebook" */
  name: string;
  /** "ポスト" / "ストーリー" / "ページ投稿" */
  format: string;
  /** 이름 + 모양: "Instagram ストーリー" (읽어 주는 글·미리보기에 써요) */
  label: string;
}

/** 게시 날짜 선택지 하루치 */
export interface OfficialDateOptionVM {
  /** YYYY-MM-DD */
  date: string;
  /** "10月31日（土）" / "10월 31일(토)" */
  label: string;
  /** 고를 수 있는지 — 그 달의 한도를 다 썼으면 false */
  available: boolean;
  /** 그 날이 속한 달 YYYY-MM */
  month: string;
  /** 그 달에 남은 횟수 (이번 신청 전) */
  remaining: number;
  /** "10月の残り 3/4回" — 고른 날짜가 속한 달의 남은 횟수 */
  remainingLabel: string;
}

/** "2026-11" → 11 */
const monthNumber = (month: string) => Number(month.slice(5, 7));

/** 날짜 고르기(◀ 날짜 ▶)의 지금 상태: 고른 날의 선택지와, 이전·다음으로 갈 수 있는 날 (고를 수 있는 날만 — 한도를 다 쓴 달은 건너뛰어요) */
export interface OfficialDateNav {
  /** 지금 고른 날의 선택지 (고른 날이 없거나 목록에 없으면 null) */
  option: OfficialDateOptionVM | null;
  prev: string | null;
  next: string | null;
  /** 지금 고른 날이 가장 빠른 날(처음 골라 두는 날)인지 — 그러면 「最短の日に戻す」는 할 일이 없어요 */
  atEarliest: boolean;
}

/** 웹·앱 글쓰기의 날짜 고르기가 함께 써요 */
export function officialDateNav(official: Pick<ComposerVM["official"], "dates" | "defaultDate">, date: string | null): OfficialDateNav {
  const available = official.dates.filter((d) => d.available);
  const option = official.dates.find((d) => d.date === date) ?? null;
  const before = date === null ? [] : available.filter((d) => d.date < date);
  return {
    option,
    prev: before.length > 0 ? before[before.length - 1].date : null,
    next: date === null ? null : (available.find((d) => d.date > date)?.date ?? null),
    atEarliest: date === official.defaultDate,
  };
}

export function selectComposer(state: DemoState, locale: Locale, kind: PostKind, preset: PostPreset = {}): ComposerVM {
  const t = makeT(locale);
  const company = companyOf(state, state.myCompanyId);
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
  const channels: OfficialChannelOptionVM[] = OFFICIAL_CHANNELS.map((id) => ({
    id,
    name: officialChannelName(id, locale),
    format: officialChannelFormat(id, locale),
    label: officialChannelLabel(id, locale),
  }));
  // 게시 날짜: 우리 회사가 달마다 쓴 횟수로 30일치 선택지를 만들어요 (다른 회사의 신청은 상관없어요 — 하루 제한이 없어요)
  const limit = OFFICIAL_SHARE_MONTHLY_LIMIT;
  const dates: OfficialDateOptionVM[] = officialDateChoices(officialUsageByMonth(state.posts, state.myCompanyId), state.today).map((choice) => ({
    date: choice.date,
    label: formatMonthDayWeekday(choice.date, locale),
    available: choice.available,
    month: choice.month,
    remaining: choice.remaining,
    remainingLabel: t("post.officialRemaining", { month: monthNumber(choice.month), remaining: choice.remaining, limit }),
  }));
  const defaultDate = dates.find((d) => d.available)?.date ?? null;
  const fullMonths = [...new Set(dates.filter((d) => !d.available).map((d) => d.month))];

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
        ? { name: state.me.nickname, meta: t("feed.skills", { count: state.skills.length }), avatar: [...state.me.nickname][0]?.toUpperCase() ?? "?", avatarColor: null, verified: false, mark: null }
        : {
            name: company ? pick(company.name, locale) : "",
            meta: company ? pick(company.industry, locale) : "",
            avatar: company?.emoji ?? "🏢",
            avatarColor: company?.accent ?? null,
            verified: company?.verified ?? false,
            mark: selectCompanyMark(state, state.myCompanyId, locale),
          },
    activities,
    selectedActivityId,
    challenges,
    selectedChallengeId: selectedChallenge?.id ?? null,
    defaultSdgIds: defaultPrSdgs(company?.sdgIds ?? [], selectedChallenge?.sdgIds ?? null),
    companySdgIds,
    official: {
      feeYen: OFFICIAL_SHARE_FEE_YEN,
      feeLabel: formatYen(OFFICIAL_SHARE_FEE_YEN, locale),
      hint: t("post.officialHint", { fee: formatYen(OFFICIAL_SHARE_FEE_YEN, locale), limit, days: OFFICIAL_SHARE_WINDOW_DAYS }),
      channels,
      defaultChannel: DEFAULT_OFFICIAL_CHANNEL,
      limit,
      dates,
      defaultDate,
      unavailableReason: defaultDate === null ? t("post.officialNoDate", { days: OFFICIAL_SHARE_WINDOW_DAYS, limit }) : null,
      fullMonthNotes: fullMonths.map((month) => t("post.officialMonthFull", { month: monthNumber(month), limit })),
    },
  };
}

export { CERT_CRITERIA };
export type { SkillId };
