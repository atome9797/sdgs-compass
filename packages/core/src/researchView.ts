// 연구 의뢰 화면용 데이터(뷰 모델): 연구자(대학원생) 화면 /lab/* 과 기업 화면 /b2b/research/* 이 그대로 그리면 되는 글자·숫자.
// 규칙(입력 검사·상태 바꾸기)은 research.ts, 문구는 messages/research.ts 에 있어요.
import { RESEARCH_FIELDS, type DemoState, type ResearcherProfile, type ResearchField, type ResearchRequest, type ResearchRequestStatus } from "./domain";
import { PLATFORM_FEE_MIN_YEN, platformFeeFor } from "./fees";
import { daysBetween, dDayLabel, formatBytes, formatDate, formatDateTime, formatYen } from "./format";
import { pick, type Locale } from "./i18n";
import { proposalStatusLabel } from "./labels";
import { translate } from "./messages";
import {
  isAcceptable, isMyResearch, isOurResearch, isResearchField, RESEARCH_FEE_MAX_YEN, RESEARCH_FEE_MIN_YEN, RESEARCH_LIMITS, RESEARCH_MAX_DAYS, RESEARCH_MIN_DAYS,
  RESEARCH_STATUSES, researchableProposals, researchRequestsFor, researchTotals, type ResearchDraftError, type ResearchResultError,
} from "./research";

export const researchStatusLabel = (status: ResearchRequestStatus, locale: Locale): string => translate(`research.status.${status}`, locale);
export const researchFieldLabel = (field: ResearchField, locale: Locale): string => translate(`research.field.${field}`, locale);
export const degreeLabel = (profile: Pick<ResearcherProfile, "degree" | "year">, locale: Locale): string => translate(`research.degree.${profile.degree}`, locale, { year: profile.year });

export type ResearchTone = "info" | "success" | "warning" | undefined;
/** 상태 칩의 색: 모집 중 = 초록, 연구 중 = 파랑, 확인 대기 = 노랑(기업이 할 일이 있어요), 완료 = 회색 */
export const RESEARCH_STATUS_TONE: Record<ResearchRequestStatus, ResearchTone> = { open: "success", inProgress: "info", delivered: "warning", completed: undefined };

export const researchFlow = (locale: Locale): string[] => [1, 2, 3, 4, 5].map((n) => translate(`research.flow.${n as 1 | 2 | 3 | 4 | 5}`, locale));

/** 기업이 돈을 내는 때(상금 · 연구 의뢰비 — 상대에게 직접, 수수료 10%는 따로)와 무료인 것(인턴 채용 · 기업 간 업무 의뢰), 돈을 맡지 않는다는 한 줄 */
export function researchPayTimings(locale: Locale): { items: string[]; note: string } {
  const min = formatYen(PLATFORM_FEE_MIN_YEN, locale);
  return {
    items: [
      translate("research.pay.prize", locale, { min }),
      translate("research.pay.match", locale),
      translate("research.pay.research", locale, { min }),
      translate("research.pay.network", locale),
    ],
    note: translate("research.pay.note", locale),
  };
}

// ───────── 카드 · 상세 ─────────

export interface ResearchCardVM {
  id: string;
  title: string;
  /** 의뢰한 기업 · 맡은 연구자 (아직 없으면 null) — 끝난 뒤 서로 평가할 때 써요 */
  companyId: string;
  researcherId: string | null;
  companyName: string;
  companyEmoji: string;
  companyAccent: string;
  status: ResearchRequestStatus;
  statusLabel: string;
  statusTone: ResearchTone;
  feeLabel: string;
  /** 운영 수수료(의뢰비의 10%, 최저 ¥9,000) — 기업이 의뢰비와 따로 내요 */
  platformFeeLabel: string;
  /** 「2026年12月20日まで」 */
  dueLabel: string;
  /** D-40 · D-DAY · 「納期を過ぎています」 — 성과가 이미 도착했거나 끝난 의뢰는 null */
  dDay: string | null;
  overdue: boolean;
  fieldLabels: string[];
  /** 「漁港に…」（チーム名） */
  ideaLabel: string;
  /** 데모의 연구자(나)가 맡은 의뢰 */
  mine: boolean;
  /** 데모의 우리 회사가 낸 의뢰 */
  ours: boolean;
}

export interface ResearchStepVM {
  status: ResearchRequestStatus;
  label: string;
  state: "done" | "current" | "todo";
}

export interface ResearchResultVM {
  summary: string;
  fileName: string;
  fileSizeLabel: string;
  sha256: string;
  submittedLabel: string;
}

export interface ResearchDetailVM extends ResearchCardVM {
  detail: string;
  deliverable: string;
  postedLabel: string;
  /** 아이디어가 나온 과제의 이름 (데모에 과제가 없으면 null) */
  challengeTitle: string | null;
  ideaTitle: string;
  teamName: string;
  /** 「Sora・サンプル大学大学院 …・修士1年」 (아직 없으면 null) */
  researcherLabel: string | null;
  acceptedLabel: string | null;
  completedLabel: string | null;
  result: ResearchResultVM | null;
  steps: ResearchStepVM[];
  /** 맡기 전에 보여 주는 거래 조건: 의뢰비 · 기한 · 지급 · 운영 수수료(기업이 따로 내요) */
  terms: { label: string; value: string }[];
  /** 연구자 화면: 맡을 수 있어요 (모집 중 · 기한 전) */
  canAccept: boolean;
  /** 연구자 화면: 모집 중이지만 기한이 지났어요 */
  expired: boolean;
  /** 연구자 화면: 성과를 보낼 수 있어요 (내가 맡은 연구 중 의뢰) */
  canSubmit: boolean;
  /** 연구자 화면: 다른 연구자가 맡은 의뢰 */
  takenByOther: boolean;
  /** 기업 화면: 성과를 확인하고 완료할 수 있어요 (우리 회사 의뢰 · 확인 대기) */
  canComplete: boolean;
}

/** 한 줄로 이어 쓸 때의 구분: 일본어는 「・」, 한국어는 「 · 」 (한국어에 일본어 가운뎃점을 쓰지 않아요) */
const SEP: Record<Locale, string> = { ja: "・", ko: " · " };

/** ja 「Sora・サンプル大学大学院 環境科学研究科・修士1年」 / ko 「Sora · 샘플대학교 대학원 환경과학연구과 · 석사 1년차」 */
export function researcherLine(profile: ResearcherProfile, locale: Locale): string {
  return [profile.name, pick(profile.affiliation, locale), degreeLabel(profile, locale)].join(SEP[locale]);
}

function cardVM(state: DemoState, request: ResearchRequest, locale: Locale): ResearchCardVM {
  const company = state.companies.find((c) => c.id === request.companyId);
  const daysLeft = daysBetween(state.today, request.dueOn);
  const waiting = request.status === "open" || request.status === "inProgress";
  return {
    id: request.id,
    title: pick(request.title, locale),
    companyId: request.companyId,
    researcherId: request.researcherId,
    companyName: company ? pick(company.name, locale) : "—",
    companyEmoji: company?.emoji ?? "🏢",
    companyAccent: company?.accent ?? "#6B7C75",
    status: request.status,
    statusLabel: researchStatusLabel(request.status, locale),
    statusTone: RESEARCH_STATUS_TONE[request.status],
    feeLabel: formatYen(request.feeYen, locale),
    platformFeeLabel: formatYen(platformFeeFor(request.feeYen), locale),
    dueLabel: translate("research.dueOn", locale, { date: formatDate(request.dueOn, locale) }),
    dDay: waiting ? (daysLeft < 0 ? translate("research.overdue", locale) : dDayLabel(daysLeft, locale)) : null,
    overdue: waiting && daysLeft < 0,
    fieldLabels: request.fields.map((f) => researchFieldLabel(f, locale)),
    ideaLabel: translate("research.ideaLine", locale, { title: request.origin.ideaTitle, team: request.origin.teamName }),
    mine: isMyResearch(state, request),
    ours: isOurResearch(state, request),
  };
}

function stepsOf(status: ResearchRequestStatus, locale: Locale): ResearchStepVM[] {
  const at = RESEARCH_STATUSES.indexOf(status);
  return RESEARCH_STATUSES.map((s, i) => ({
    status: s,
    label: researchStatusLabel(s, locale),
    state: i < at || status === "completed" ? "done" : i === at ? "current" : "todo",
  }));
}

function detailVM(state: DemoState, request: ResearchRequest, locale: Locale): ResearchDetailVM {
  const card = cardVM(state, request, locale);
  const challenge = request.origin.challengeId ? state.challenges.find((c) => c.id === request.origin.challengeId) : undefined;
  const researcherLabel =
    request.researcherId === null ? null : request.researcherId === state.researcher.id ? researcherLine(state.researcher, locale) : translate("research.otherResearcher", locale);
  const result = request.result;
  return {
    ...card,
    detail: pick(request.detail, locale),
    deliverable: pick(request.deliverable, locale),
    postedLabel: formatDate(request.postedOn, locale),
    challengeTitle: challenge ? pick(challenge.title, locale) : null,
    ideaTitle: request.origin.ideaTitle,
    teamName: request.origin.teamName,
    researcherLabel,
    acceptedLabel: request.acceptedOn ? formatDate(request.acceptedOn, locale) : null,
    completedLabel: request.completedOn ? formatDate(request.completedOn, locale) : null,
    result: result
      ? { summary: result.summary, fileName: result.fileName, fileSizeLabel: formatBytes(result.fileSizeBytes), sha256: result.sha256, submittedLabel: formatDateTime(result.submittedAt, locale) }
      : null,
    steps: stepsOf(request.status, locale),
    terms: [
      { label: translate("research.fee", locale), value: card.feeLabel },
      { label: translate("research.due", locale), value: card.dueLabel },
      { label: translate("research.payment", locale), value: translate("research.paymentValue", locale) },
      { label: translate("research.platformFee", locale), value: translate("research.platformFeeValue", locale, { fee: card.platformFeeLabel, min: formatYen(PLATFORM_FEE_MIN_YEN, locale) }) },
    ],
    canAccept: isAcceptable(request, state.today),
    expired: request.status === "open" && !isAcceptable(request, state.today),
    canSubmit: request.status === "inProgress" && card.mine,
    takenByOther: request.status !== "open" && !card.mine,
    canComplete: request.status === "delivered" && card.ours,
  };
}

/** 의뢰 상세 (연구자·기업 화면 공용). 없는 id 면 null */
export function selectResearchDetail(state: DemoState, id: string | null, locale: Locale): ResearchDetailVM | null {
  const request = id ? state.researchRequests.find((r) => r.id === id) : undefined;
  return request ? detailVM(state, request, locale) : null;
}

// ───────── 연구자 홈 (/lab/) ─────────

export type ResearchFieldFilter = ResearchField | "all";

/** 주소의 ?field= 를 읽어요 (모르는 값이면 전체) */
export const parseResearchFieldFilter = (raw: string | null | undefined): ResearchFieldFilter => (isResearchField(raw) ? raw : "all");

export interface LabProfileVM {
  name: string;
  affiliation: string;
  degreeLabel: string;
  fieldLabels: string[];
  bio: string;
  line: string;
}

export function selectLabProfile(state: DemoState, locale: Locale): LabProfileVM {
  const profile = state.researcher;
  return {
    name: profile.name,
    affiliation: pick(profile.affiliation, locale),
    degreeLabel: degreeLabel(profile, locale),
    fieldLabels: profile.fields.map((f) => researchFieldLabel(f, locale)),
    bio: pick(profile.bio, locale),
    line: researcherLine(profile, locale),
  };
}

export interface LabHomeVM {
  profile: LabProfileVM;
  filter: ResearchFieldFilter;
  /** 분야 칩: 전체 + 6분야, 숫자는 지금 맡을 수 있는 의뢰 수 */
  filters: { id: ResearchFieldFilter; label: string; count: number }[];
  /** 지금 맡을 수 있는 의뢰 (새로 올라온 순) */
  open: ResearchCardVM[];
  emptyLabel: string;
  /** 내가 연구 중인 의뢰 수와 「研究中の依頼 1件」 */
  activeCount: number;
  activeLabel: string;
}

const byPostedDesc = (a: ResearchRequest, b: ResearchRequest): number => b.postedOn.localeCompare(a.postedOn) || a.id.localeCompare(b.id);

export function selectLabHome(state: DemoState, locale: Locale, filter: ResearchFieldFilter = "all"): LabHomeVM {
  const acceptable = state.researchRequests.filter((r) => isAcceptable(r, state.today)).sort(byPostedDesc);
  const matches = (r: ResearchRequest, f: ResearchFieldFilter) => f === "all" || r.fields.includes(f);
  const activeCount = state.researchRequests.filter((r) => r.status === "inProgress" && isMyResearch(state, r)).length;
  return {
    profile: selectLabProfile(state, locale),
    filter,
    filters: (["all", ...RESEARCH_FIELDS] as ResearchFieldFilter[]).map((id) => ({
      id,
      label: id === "all" ? translate("lab.filter.all", locale) : researchFieldLabel(id, locale),
      count: acceptable.filter((r) => matches(r, id)).length,
    })),
    open: acceptable.filter((r) => matches(r, filter)).map((r) => cardVM(state, r, locale)),
    emptyLabel: translate(filter === "all" ? "lab.openEmpty" : "lab.openEmptyField", locale),
    activeCount,
    activeLabel: translate("lab.mineLink", locale, { count: activeCount }),
  };
}

// ───────── 연구자의 내 연구 (/lab/mine/) ─────────

export type MineGroup = "inProgress" | "delivered" | "completed";

export interface LabMineVM {
  kpis: { id: MineGroup | "received"; label: string; value: string }[];
  groups: { status: MineGroup; title: string; items: ResearchCardVM[] }[];
  emptyLabel: string;
  note: string;
}

export function selectLabMine(state: DemoState, locale: Locale): LabMineVM {
  const mine = state.researchRequests.filter((r) => isMyResearch(state, r));
  const totals = researchTotals(mine);
  const sorters: Record<MineGroup, (a: ResearchRequest, b: ResearchRequest) => number> = {
    // 기한이 가까운 것부터
    inProgress: (a, b) => a.dueOn.localeCompare(b.dueOn) || a.id.localeCompare(b.id),
    // 최근에 보낸 것부터
    delivered: (a, b) => (b.result?.submittedAt ?? "").localeCompare(a.result?.submittedAt ?? "") || a.id.localeCompare(b.id),
    completed: (a, b) => (b.completedOn ?? "").localeCompare(a.completedOn ?? "") || a.id.localeCompare(b.id),
  };
  const groups: MineGroup[] = ["inProgress", "delivered", "completed"];
  return {
    kpis: [
      { id: "inProgress", label: researchStatusLabel("inProgress", locale), value: String(totals.inProgress) },
      { id: "delivered", label: researchStatusLabel("delivered", locale), value: String(totals.delivered) },
      { id: "completed", label: researchStatusLabel("completed", locale), value: String(totals.completed) },
      { id: "received", label: translate("lab.mine.received", locale), value: formatYen(totals.completedYen, locale) },
    ],
    groups: groups.map((status) => ({
      status,
      title: translate(`lab.mine.group.${status}`, locale),
      items: mine.filter((r) => r.status === status).sort(sorters[status]).map((r) => cardVM(state, r, locale)),
    })),
    emptyLabel: translate("lab.mine.empty", locale),
    note: translate("lab.mine.note", locale),
  };
}

// ───────── 기업의 연구 의뢰 (/b2b/research/) ─────────

export interface B2bResearchVM {
  kpis: { id: ResearchRequestStatus | "paid"; label: string; value: string }[];
  /** 우리 회사의 의뢰: 확인 대기 → 연구 중 → 모집 중 → 완료 순 (같은 상태는 새로 낸 순) */
  requests: ResearchDetailVM[];
  /** 의뢰할 수 있는 아이디어(표창·채택)가 있나요 */
  canCreate: boolean;
  emptyLabel: string;
  feeNote: string;
  /** 대시보드 한 줄: 「募集中 1件・研究中 0件・確認待ち 1件」 */
  summary: string;
  /** 대시보드에서 강조: 기업이 할 일(확인 대기)이 있어요 */
  needsAction: number;
}

const B2B_ORDER: Record<ResearchRequestStatus, number> = { delivered: 0, inProgress: 1, open: 2, completed: 3 };

export function selectB2bResearch(state: DemoState, locale: Locale): B2bResearchVM {
  const ours = state.researchRequests.filter((r) => isOurResearch(state, r)).sort((a, b) => B2B_ORDER[a.status] - B2B_ORDER[b.status] || byPostedDesc(a, b));
  const totals = researchTotals(ours);
  return {
    kpis: [
      ...RESEARCH_STATUSES.map((status) => ({ id: status, label: researchStatusLabel(status, locale), value: String(totals[status]) })),
      { id: "paid" as const, label: translate("research.b2b.paid", locale), value: formatYen(totals.completedYen, locale) },
    ],
    requests: ours.map((r) => detailVM(state, r, locale)),
    canCreate: researchableProposals(state).length > 0,
    emptyLabel: translate("research.b2b.empty", locale),
    feeNote: translate("research.b2b.feeNote", locale, { min: formatYen(PLATFORM_FEE_MIN_YEN, locale) }),
    summary: translate("research.b2b.summary", locale, { open: totals.open, active: totals.inProgress, delivered: totals.delivered }),
    needsAction: totals.delivered,
  };
}

/** 응모자 카드의 「研究依頼 1件」 (그 아이디어에서 나온 의뢰가 없으면 null) */
export function proposalResearchLabel(state: DemoState, proposalId: string, locale: Locale): string | null {
  const count = researchRequestsFor(state, proposalId).length;
  return count === 0 ? null : translate("research.b2b.count", locale, { count });
}

// ───────── 기업의 새 의뢰 (/b2b/research/new/) ─────────

export interface ResearchIdeaOptionVM {
  id: string;
  /** 「紙と海藻由来フィルムの二層包装」（クリーンシーサイド）・受賞 */
  label: string;
  challengeTitle: string;
}

export interface ResearchFormVM {
  ideas: ResearchIdeaOptionVM[];
  /** 주소의 ?proposal= 이 의뢰할 수 있는 아이디어면 그것, 아니면 첫 번째 (없으면 null) */
  selectedId: string | null;
  fields: { id: ResearchField; label: string }[];
  limits: typeof RESEARCH_LIMITS;
  feeMin: number;
  feeMax: number;
  minDays: number;
  maxDays: number;
  fieldsLabel: string;
  feeHint: string;
  daysHint: string;
}

export function selectResearchForm(state: DemoState, locale: Locale, requestedProposalId: string | null): ResearchFormVM {
  const ideas = researchableProposals(state).map((p) => {
    const challenge = state.challenges.find((c) => c.id === p.challengeId);
    return {
      id: p.id,
      label: `${translate("research.ideaLine", locale, { title: p.title, team: p.teamName })}${SEP[locale]}${proposalStatusLabel(p.status, locale)}`,
      challengeTitle: challenge ? pick(challenge.title, locale) : "—",
    };
  });
  const selectedId = ideas.some((i) => i.id === requestedProposalId) ? requestedProposalId : (ideas[0]?.id ?? null);
  return {
    ideas,
    selectedId,
    fields: RESEARCH_FIELDS.map((id) => ({ id, label: researchFieldLabel(id, locale) })),
    limits: RESEARCH_LIMITS,
    feeMin: RESEARCH_FEE_MIN_YEN,
    feeMax: RESEARCH_FEE_MAX_YEN,
    minDays: RESEARCH_MIN_DAYS,
    maxDays: RESEARCH_MAX_DAYS,
    fieldsLabel: translate("research.new.fields", locale, { max: RESEARCH_LIMITS.maxFields }),
    feeHint: translate("research.new.feeHint", locale, { min: formatYen(RESEARCH_FEE_MIN_YEN, locale), max: formatYen(RESEARCH_FEE_MAX_YEN, locale), feeMin: formatYen(PLATFORM_FEE_MIN_YEN, locale) }),
    daysHint: translate("research.new.daysHint", locale, { min: RESEARCH_MIN_DAYS, max: RESEARCH_MAX_DAYS }),
  };
}

// ───────── 입력 오류 문장 ─────────

export function researchDraftErrorText(error: ResearchDraftError, locale: Locale): string {
  switch (error) {
    case "title_too_long":
      return translate("research.error.title_too_long", locale, { max: RESEARCH_LIMITS.title });
    case "detail_too_long":
      return translate("research.error.detail_too_long", locale, { max: RESEARCH_LIMITS.detail });
    case "deliverable_too_long":
      return translate("research.error.deliverable_too_long", locale, { max: RESEARCH_LIMITS.deliverable });
    case "fields_too_many":
      return translate("research.error.fields_too_many", locale, { max: RESEARCH_LIMITS.maxFields });
    case "fee_invalid":
      return translate("research.error.fee_invalid", locale, { min: formatYen(RESEARCH_FEE_MIN_YEN, locale), max: formatYen(RESEARCH_FEE_MAX_YEN, locale) });
    case "days_invalid":
      return translate("research.error.days_invalid", locale, { min: RESEARCH_MIN_DAYS, max: RESEARCH_MAX_DAYS });
    default:
      return translate(`research.error.${error}`, locale);
  }
}

export function researchResultErrorText(error: ResearchResultError, locale: Locale): string {
  if (error === "summary_too_long") return translate("research.resultError.summary_too_long", locale, { max: RESEARCH_LIMITS.resultSummary });
  if (error === "file_too_large") return translate("research.resultError.file_too_large", locale, { max: `${RESEARCH_LIMITS.fileBytes / (1024 * 1024)}MB` });
  return translate(`research.resultError.${error}`, locale);
}
