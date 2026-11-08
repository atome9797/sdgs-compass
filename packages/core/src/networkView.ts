// 기업 네트워크 화면용 데이터(뷰 모델): 기업 화면 /b2b/network/* 과 평가 부품(학생 · 연구자 · 기업 화면)이 그대로 그리면 되는 글자·숫자.
// 규칙(신뢰 실적 · 입력 검사 · 상태 바꾸기 · 평가)은 network.ts, 문구는 messages/network.ts 에 있어요.
import { WORK_CATEGORIES, type Company, type DemoState, type Rating, type RaterRole, type WorkCategory, type WorkMode, type WorkRequest, type WorkStatus } from "./domain";
import { dDayLabel, daysBetween, formatDate, formatYen } from "./format";
import { pick, type Locale } from "./i18n";
import { translate, type MessageKey } from "./messages";
import {
  canApply, canRate, canRequestTo, hasApplied, isOurWork, isTrusted, isWorkForUs, myRatingOf, ratingsFor, trackRecord, TRUST_RULE, WORK_BUDGET_MAX_YEN, WORK_BUDGET_MIN_YEN,
  WORK_LIMITS, WORK_MAX_DAYS, WORK_MIN_DAYS, type RatingError, type ShortTextError, type TrackRecord, type WorkDraftError,
} from "./network";

export const workCategoryLabel = (category: WorkCategory, locale: Locale): string => translate(`network.category.${category}`, locale);
export const workStatusLabel = (status: WorkStatus, locale: Locale): string => translate(`network.status.${status}`, locale);

export type NetworkTone = "info" | "success" | "warning" | "danger" | undefined;
export const WORK_STATUS_TONE: Record<WorkStatus, NetworkTone> = { open: "success", requested: "warning", inProgress: "info", delivered: "warning", completed: undefined, declined: "danger" };

/** 별 다섯 개로: 4 → 「★★★★☆」 (반올림) */
export function starsText(stars: number): string {
  const n = Math.max(0, Math.min(5, Math.round(stars)));
  return "★".repeat(n) + "☆".repeat(5 - n);
}

// ───────── 신뢰 ─────────

export interface TrustVM {
  trusted: boolean;
  badge: string;
  /** 「★4.6（評価 12件）」 · 「まだ評価はありません」 */
  ratingLabel: string;
  ratingAverage: number | null;
  /** 「取引 3件（賞金 1・研究 1・企業間 1）」 */
  dealsLabel: string;
  dealsShort: string;
  deals: number;
  /** 지급 지연이 있으면 「支払いの遅れ 1件」 */
  lateLabel: string | null;
  /** 신뢰 기업이 아니면 모자란 것들 (조건 순서) */
  missingLabels: string[];
}

export function trustVM(record: TrackRecord, locale: Locale): TrustVM {
  const average = TRUST_RULE.minAverage.toFixed(1);
  return {
    trusted: record.trusted,
    badge: translate(record.trusted ? "network.trusted" : "network.notTrusted", locale),
    ratingLabel: record.ratingAverage === null ? translate("network.noRatings", locale) : translate("network.ratingAverage", locale, { average: record.ratingAverage.toFixed(1), count: record.ratingCount }),
    ratingAverage: record.ratingAverage,
    dealsLabel: translate("network.deals", locale, { deals: record.deals, prize: record.prizesPaid, research: record.researchPaid, work: record.workDone }),
    dealsShort: translate("network.dealsShort", locale, { deals: record.deals }),
    deals: record.deals,
    lateLabel: record.late > 0 ? translate("network.late", locale, { late: record.late }) : null,
    missingLabels: record.missing.map((m) => translate(`network.missing.${m}`, locale, { average })),
  };
}

export const ruleText = (locale: Locale): string =>
  translate("network.rule", locale, { deals: TRUST_RULE.minDeals, ratings: TRUST_RULE.minRatings, average: TRUST_RULE.minAverage.toFixed(1) });

// ───────── 평가 ─────────

export interface RatingVM {
  id: string;
  stars: number;
  starsText: string;
  /** 스크린 리더용 「5段階中4」 대신 「★4」 */
  starsLabel: string;
  comment: string;
  /** 「グリーンリテール株式会社・企業間の依頼・2026年10月1日」 */
  line: string;
}

function raterName(state: DemoState, rating: Rating, locale: Locale): string {
  if (rating.fromRole === "company") {
    const company = state.companies.find((c) => c.id === rating.fromId);
    return company ? pick(company.name, locale) : rating.fromId;
  }
  if (rating.fromRole === "researcher") return rating.fromId === state.researcher.id ? state.researcher.name : translate("rating.from.researcher", locale);
  return rating.fromId === state.me.id ? state.me.nickname : translate("rating.from.student", locale);
}

export function ratingVM(state: DemoState, rating: Rating, locale: Locale): RatingVM {
  return {
    id: rating.id,
    stars: rating.stars,
    starsText: starsText(rating.stars),
    starsLabel: translate("rating.star", locale, { n: rating.stars }),
    comment: pick(rating.comment, locale),
    line: translate("rating.line", locale, { from: raterName(state, rating, locale), kind: translate(`rating.kind.${rating.kind}`, locale), date: formatDate(rating.createdOn, locale) }),
  };
}

/** 평가 부품의 상태: 이미 남긴 평가(mine) 또는 지금 남길 수 있는지(canRate) */
export interface RatingSlotVM {
  canRate: boolean;
  mine: RatingVM | null;
}

export function ratingSlot(state: DemoState, role: RaterRole, target: { kind: Rating["kind"]; refId: string; toRole: Rating["toRole"]; toId: string }, locale: Locale): RatingSlotVM {
  const mine = myRatingOf(state, role, target.kind, target.refId);
  return { canRate: mine === null && canRate(state, role, target), mine: mine ? ratingVM(state, mine, locale) : null };
}

/** 이 거래에서 상대가 지금 계정(우리 회사 · 연구자)에 남긴 평가 (없으면 null) */
export function ratingReceived(state: DemoState, role: "company" | "researcher", kind: Rating["kind"], refId: string, locale: Locale): RatingVM | null {
  const toId = role === "company" ? state.myCompanyId : state.researcher.id;
  const rating = state.ratings.find((r) => r.kind === kind && r.refId === refId && r.toRole === role && r.toId === toId);
  return rating ? ratingVM(state, rating, locale) : null;
}

// ───────── 기업 카드 ─────────

export interface NetworkCompanyVM {
  id: string;
  name: string;
  emoji: string;
  accent: string;
  industry: string;
  region: string;
  about: string;
  offers: { id: WorkCategory; label: string }[];
  offerNote: string;
  trust: TrustVM;
  /** 우리 회사가 이 기업에 지명 의뢰를 낼 수 있어요 (둘 다 신뢰 기업) */
  canRequest: boolean;
  isUs: boolean;
}

export function companyVM(state: DemoState, company: Company, locale: Locale): NetworkCompanyVM {
  const offerNote = pick(company.offerNote, locale);
  return {
    id: company.id,
    name: pick(company.name, locale),
    emoji: company.emoji,
    accent: company.accent,
    industry: pick(company.industry, locale),
    region: pick(company.region, locale),
    about: pick(company.about, locale),
    offers: company.offers.map((id) => ({ id, label: workCategoryLabel(id, locale) })),
    offerNote: offerNote === "" ? "" : translate("network.offerNote", locale, { note: offerNote }),
    trust: trustVM(trackRecord(state, company.id), locale),
    canRequest: isTrusted(state, state.myCompanyId) && canRequestTo(state, company.id),
    isUs: company.id === state.myCompanyId,
  };
}

// ───────── 의뢰 카드 · 상세 ─────────

/** 우리 회사와의 관계: 의뢰했어요 · 받았어요 · 응모했어요 · 관계없어요 */
export type WorkRelation = "from" | "to" | "applicant" | "other";
/** 우리 회사가 지금 할 일 */
export type WorkTodo = "respond" | "choose" | "deliver" | "complete" | "rate" | null;

export interface WorkCardVM {
  id: string;
  title: string;
  category: WorkCategory;
  categoryLabel: string;
  mode: WorkMode;
  modeLabel: string;
  status: WorkStatus;
  statusLabel: string;
  statusTone: NetworkTone;
  fromId: string;
  fromName: string;
  fromEmoji: string;
  fromAccent: string;
  toName: string | null;
  /** 「みなと海洋フーズ → さくらパック工業」 (공개 모집에서 고르기 전이면 「→（応募から選びます）」) */
  partiesLabel: string;
  budgetLabel: string;
  dueLabel: string;
  dDay: string | null;
  overdue: boolean;
  /** 공개 모집의 응모 수 (지명이면 null) */
  applicationsLabel: string | null;
  relation: WorkRelation;
  todo: WorkTodo;
  todoLabel: string | null;
}

const companyName = (state: DemoState, id: string | null, locale: Locale): string | null => {
  if (id === null) return null;
  const c = state.companies.find((x) => x.id === id);
  return c ? pick(c.name, locale) : id;
};

function relationOf(state: DemoState, work: WorkRequest): WorkRelation {
  if (isOurWork(state, work)) return "from";
  if (isWorkForUs(state, work)) return "to";
  if (hasApplied(state, work)) return "applicant";
  return "other";
}

function todoOf(state: DemoState, work: WorkRequest): WorkTodo {
  const ours = isOurWork(state, work);
  const forUs = isWorkForUs(state, work);
  if (forUs && work.status === "requested") return "respond";
  if (ours && work.status === "open" && work.applications.length > 0) return "choose";
  if (forUs && work.status === "inProgress") return "deliver";
  if (ours && work.status === "delivered") return "complete";
  if ((ours || forUs) && work.status === "completed") {
    const other = ours ? work.toCompanyId : work.fromCompanyId;
    if (other !== null && canRate(state, "company", { kind: "work", refId: work.id, toRole: "company", toId: other })) return "rate";
  }
  return null;
}

export function workCardVM(state: DemoState, work: WorkRequest, locale: Locale): WorkCardVM {
  const from = state.companies.find((c) => c.id === work.fromCompanyId);
  const fromName = from ? pick(from.name, locale) : work.fromCompanyId;
  const toName = companyName(state, work.toCompanyId, locale);
  const finished = work.status === "delivered" || work.status === "completed" || work.status === "declined";
  const left = daysBetween(state.today, work.dueOn);
  const todo = todoOf(state, work);
  return {
    id: work.id,
    title: pick(work.title, locale),
    category: work.category,
    categoryLabel: workCategoryLabel(work.category, locale),
    mode: work.mode,
    modeLabel: translate(`network.mode.${work.mode}`, locale),
    status: work.status,
    statusLabel: workStatusLabel(work.status, locale),
    statusTone: WORK_STATUS_TONE[work.status],
    fromId: work.fromCompanyId,
    fromName,
    fromEmoji: from?.emoji ?? "🏢",
    fromAccent: from?.accent ?? "#2F5E50",
    toName,
    partiesLabel: translate("network.fromTo", locale, { from: fromName, to: toName ?? translate("network.notChosen", locale) }),
    budgetLabel: formatYen(work.budgetYen, locale),
    dueLabel: translate("network.dueOn", locale, { date: formatDate(work.dueOn, locale) }),
    dDay: finished ? null : left < 0 ? translate("network.overdue", locale) : dDayLabel(left, locale),
    overdue: !finished && left < 0,
    applicationsLabel: work.mode === "open" ? translate("network.applications", locale, { count: work.applications.length }) : null,
    relation: relationOf(state, work),
    todo,
    todoLabel: todo ? translate(`network.action.${todo}`, locale) : null,
  };
}

export interface WorkPartyVM {
  id: string;
  name: string;
  emoji: string;
  accent: string;
  trust: TrustVM;
}

export interface WorkApplicationVM extends WorkPartyVM {
  message: string;
  appliedLabel: string;
  canChoose: boolean;
}

export interface WorkStepVM {
  key: "start" | "inProgress" | "delivered" | "completed";
  label: string;
  state: "done" | "current" | "todo";
}

export interface WorkDetailVM extends WorkCardVM {
  detail: string;
  postedLabel: string;
  acceptedLabel: string | null;
  deliveredLabel: string | null;
  deliveryNote: string | null;
  completedLabel: string | null;
  from: WorkPartyVM;
  to: WorkPartyVM | null;
  steps: WorkStepVM[];
  terms: { label: string; value: string }[];
  applications: WorkApplicationVM[];
  can: { respond: boolean; apply: boolean; choose: boolean; deliver: boolean; complete: boolean };
  /** 우리 회사가 평가할 상대 (끝난 의뢰의 당사자일 때) */
  rateTarget: { toId: string; name: string } | null;
  rating: RatingSlotVM | null;
  /** 상대가 우리 회사에 남긴 평가 */
  theirRating: RatingVM | null;
  /** 상태에 따라 기다리는 중인 한 줄 (할 일이 없을 때) */
  waitingLabel: string | null;
}

function partyVM(state: DemoState, id: string, locale: Locale): WorkPartyVM {
  const c = state.companies.find((x) => x.id === id);
  return { id, name: c ? pick(c.name, locale) : id, emoji: c?.emoji ?? "🏢", accent: c?.accent ?? "#2F5E50", trust: trustVM(trackRecord(state, id), locale) };
}

function stepsOf(status: WorkStatus, locale: Locale, mode: WorkMode): WorkStepVM[] {
  const order: WorkStepVM["key"][] = ["start", "inProgress", "delivered", "completed"];
  const index: Record<WorkStatus, number> = { open: 0, requested: 0, declined: 0, inProgress: 1, delivered: 2, completed: 3 };
  const at = index[status];
  const labels: Record<WorkStepVM["key"], string> = {
    start: workStatusLabel(mode === "open" ? "open" : "requested", locale),
    inProgress: workStatusLabel("inProgress", locale),
    delivered: workStatusLabel("delivered", locale),
    completed: workStatusLabel("completed", locale),
  };
  return order.map((key, i) => ({ key, label: labels[key], state: status === "completed" || i < at ? "done" : i === at ? "current" : "todo" }));
}

/** 의뢰 상세 (없는 id 면 null) */
export function selectWorkRequest(state: DemoState, id: string | null, locale: Locale): WorkDetailVM | null {
  const work = id ? state.workRequests.find((w) => w.id === id) : undefined;
  if (!work) return null;
  const card = workCardVM(state, work, locale);
  const ours = isOurWork(state, work);
  const forUs = isWorkForUs(state, work);
  const other = ours ? work.toCompanyId : forUs ? work.fromCompanyId : null;
  const rateTarget = work.status === "completed" && other !== null ? { toId: other, name: companyName(state, other, locale) ?? other } : null;
  const theirs = other !== null ? state.ratings.find((r) => r.kind === "work" && r.refId === work.id && r.fromRole === "company" && r.fromId === other && r.toId === state.myCompanyId) : undefined;
  const can = {
    respond: forUs && work.status === "requested",
    apply: canApply(state, work),
    choose: ours && work.status === "open" && work.applications.length > 0,
    deliver: forUs && work.status === "inProgress",
    complete: ours && work.status === "delivered",
  };
  let waitingLabel: string | null = null;
  if (ours && work.status === "requested") waitingLabel = translate("network.waiting.requested", locale);
  else if (ours && work.status === "inProgress") waitingLabel = translate("network.waiting.inProgress", locale);
  else if (forUs && work.status === "delivered") waitingLabel = translate("network.waiting.delivered", locale);
  else if (!ours && !forUs && hasApplied(state, work) && work.status === "open") waitingLabel = translate("network.waiting.applied", locale);
  else if (work.status === "declined") waitingLabel = translate("network.declinedNote", locale);
  return {
    ...card,
    detail: pick(work.detail, locale),
    postedLabel: formatDate(work.postedOn, locale),
    acceptedLabel: work.acceptedOn ? formatDate(work.acceptedOn, locale) : null,
    deliveredLabel: work.deliveredOn ? formatDate(work.deliveredOn, locale) : null,
    deliveryNote: work.deliveryNote ? pick(work.deliveryNote, locale) : null,
    completedLabel: work.completedOn ? formatDate(work.completedOn, locale) : null,
    from: partyVM(state, work.fromCompanyId, locale),
    to: work.toCompanyId ? partyVM(state, work.toCompanyId, locale) : null,
    steps: stepsOf(work.status, locale, work.mode),
    terms: [
      { label: translate("network.budget", locale), value: card.budgetLabel },
      { label: translate("network.due", locale), value: card.dueLabel },
      { label: translate("network.payment", locale), value: translate("network.paymentValue", locale) },
      { label: translate("network.platformFee", locale), value: translate("network.platformFeeValue", locale) },
    ],
    applications: work.applications.map((a) => ({
      ...partyVM(state, a.companyId, locale),
      message: pick(a.message, locale),
      appliedLabel: formatDate(a.appliedOn, locale),
      canChoose: can.choose,
    })),
    can,
    rateTarget: rateTarget && (ours || forUs) ? rateTarget : null,
    rating: rateTarget && (ours || forUs) ? ratingSlot(state, "company", { kind: "work", refId: work.id, toRole: "company", toId: rateTarget.toId }, locale) : null,
    theirRating: theirs ? ratingVM(state, theirs, locale) : null,
    waitingLabel,
  };
}

// ───────── 네트워크 첫 화면 ─────────

export type NetworkTab = "find" | "open" | "mine";
export const NETWORK_TABS: readonly NetworkTab[] = ["find", "open", "mine"];
export type NetworkSort = "rating" | "deals";
export const NETWORK_SORTS: readonly NetworkSort[] = ["rating", "deals"];

export const parseNetworkTab = (raw: string | null | undefined): NetworkTab => (NETWORK_TABS as readonly string[]).includes(raw ?? "") ? (raw as NetworkTab) : "find";
export const parseNetworkSort = (raw: string | null | undefined): NetworkSort => (raw === "deals" ? "deals" : "rating");
export const parseWorkCategory = (raw: string | null | undefined): WorkCategory | null => ((WORK_CATEGORIES as readonly string[]).includes(raw ?? "") ? (raw as WorkCategory) : null);

export interface NetworkQuery {
  tab: NetworkTab;
  category: WorkCategory | null;
  sort: NetworkSort;
  query: string;
}

export interface NetworkHomeVM {
  tab: NetworkTab;
  tabs: { id: NetworkTab; label: string; count: number }[];
  us: NetworkCompanyVM;
  usText: string;
  rule: string;
  // 찾기
  category: WorkCategory | null;
  categories: { id: WorkCategory | null; label: string; count: number }[];
  sort: NetworkSort;
  sorts: { id: NetworkSort; label: string }[];
  query: string;
  foundLabel: string;
  companies: NetworkCompanyVM[];
  notYet: { id: string; name: string; emoji: string; accent: string; reasons: string }[];
  // 공개 모집
  openRequests: WorkCardVM[];
  canPost: boolean;
  // 주고받기
  groups: { id: "received" | "sent" | "applied"; title: string; items: WorkCardVM[] }[];
  todoCount: number;
}

const normalize = (text: string) => text.toLowerCase().replace(/\s+/g, "");

function matchesQuery(vm: NetworkCompanyVM, query: string): boolean {
  if (query === "") return true;
  const needle = normalize(query);
  return [vm.name, vm.industry, vm.region, vm.offerNote, ...vm.offers.map((o) => o.label)].some((text) => normalize(text).includes(needle));
}

const byNewest = (a: WorkRequest, b: WorkRequest) => b.postedOn.localeCompare(a.postedOn) || b.id.localeCompare(a.id);

export function selectNetworkHome(state: DemoState, locale: Locale, q: NetworkQuery): NetworkHomeVM {
  const usCompany = state.companies.find((c) => c.id === state.myCompanyId);
  const us = usCompany ? companyVM(state, usCompany, locale) : companyVM(state, { ...state.companies[0], id: state.myCompanyId }, locale);
  const others = state.companies.filter((c) => c.id !== state.myCompanyId).map((c) => companyVM(state, c, locale));
  const trusted = others.filter((c) => c.trust.trusted);
  const query = q.query.trim();
  const inQuery = trusted.filter((c) => matchesQuery(c, query));
  const shown = inQuery
    .filter((c) => q.category === null || c.offers.some((o) => o.id === q.category))
    .sort((a, b) =>
      q.sort === "deals"
        ? b.trust.deals - a.trust.deals || (b.trust.ratingAverage ?? 0) - (a.trust.ratingAverage ?? 0) || a.id.localeCompare(b.id)
        : (b.trust.ratingAverage ?? 0) - (a.trust.ratingAverage ?? 0) || b.trust.deals - a.trust.deals || a.id.localeCompare(b.id),
    );
  const openRequests = state.workRequests.filter((w) => w.status === "open" && !isOurWork(state, w)).sort(byNewest).map((w) => workCardVM(state, w, locale));
  const received = state.workRequests.filter((w) => isWorkForUs(state, w)).sort(byNewest).map((w) => workCardVM(state, w, locale));
  const sent = state.workRequests.filter((w) => isOurWork(state, w)).sort(byNewest).map((w) => workCardVM(state, w, locale));
  const applied = state.workRequests.filter((w) => !isOurWork(state, w) && !isWorkForUs(state, w) && hasApplied(state, w)).sort(byNewest).map((w) => workCardVM(state, w, locale));
  const mine = [...received, ...sent, ...applied];
  // 할 일이 있는 것을 먼저
  const todoFirst = (list: WorkCardVM[]) => [...list.filter((w) => w.todo !== null), ...list.filter((w) => w.todo === null)];
  return {
    tab: q.tab,
    tabs: [
      { id: "find", label: translate("network.tab.find", locale), count: trusted.length },
      { id: "open", label: translate("network.tab.open", locale), count: openRequests.length },
      { id: "mine", label: translate("network.tab.mine", locale), count: mine.length },
    ],
    us,
    usText: us.trust.trusted ? translate("network.usTrusted", locale) : translate("network.usNotTrusted", locale, { missing: us.trust.missingLabels.join(locale === "ja" ? "・" : " · ") }),
    rule: ruleText(locale),
    category: q.category,
    categories: [
      { id: null, label: translate("network.filter.all", locale), count: inQuery.length },
      ...WORK_CATEGORIES.map((id) => ({ id, label: workCategoryLabel(id, locale), count: inQuery.filter((c) => c.offers.some((o) => o.id === id)).length })),
    ],
    sort: q.sort,
    sorts: NETWORK_SORTS.map((id) => ({ id, label: translate(`network.sort.${id}`, locale) })),
    query,
    foundLabel: translate("network.found", locale, { count: shown.length }),
    companies: shown,
    notYet: others
      .filter((c) => !c.trust.trusted)
      .map((c) => ({ id: c.id, name: c.name, emoji: c.emoji, accent: c.accent, reasons: c.trust.missingLabels.join(locale === "ja" ? "・" : " · ") })),
    openRequests,
    canPost: us.trust.trusted,
    groups: [
      { id: "received", title: translate("network.mine.received", locale), items: todoFirst(received) },
      { id: "sent", title: translate("network.mine.sent", locale), items: todoFirst(sent) },
      { id: "applied", title: translate("network.mine.applied", locale), items: applied },
    ],
    todoCount: mine.filter((w) => w.todo !== null).length,
  };
}

// ───────── 기업 프로필 ─────────

export interface NetworkProfileVM {
  company: NetworkCompanyVM;
  record: { label: string; value: string }[];
  ratings: RatingVM[];
}

export function selectNetworkProfile(state: DemoState, id: string | null, locale: Locale): NetworkProfileVM | null {
  const company = id ? state.companies.find((c) => c.id === id) : undefined;
  if (!company) return null;
  const record = trackRecord(state, company.id);
  const count = (n: number) => translate("network.record.count", locale, { count: n });
  return {
    company: companyVM(state, company, locale),
    record: [
      { label: translate("network.record.prize", locale), value: count(record.prizesPaid) },
      { label: translate("network.record.research", locale), value: count(record.researchPaid) },
      { label: translate("network.record.work", locale), value: count(record.workDone) },
      { label: translate("network.record.late", locale), value: count(record.late) },
    ],
    ratings: ratingsFor(state, "company", company.id).map((r) => ratingVM(state, r, locale)),
  };
}

// ───────── 새 의뢰 ─────────

export interface WorkFormVM {
  canPost: boolean;
  needTrustText: string | null;
  mode: WorkMode;
  /** 지명 의뢰에서 고를 수 있는 기업 (신뢰 기업, 우리 회사 제외) */
  targets: { id: string; label: string }[];
  /** 주소로 받은 상대 (지명할 수 있으면) */
  toId: string | null;
  categories: { id: WorkCategory; label: string }[];
  limits: typeof WORK_LIMITS;
  budgetMin: number;
  budgetMax: number;
  minDays: number;
  maxDays: number;
  budgetHint: string;
  daysHint: string;
  feeNote: string;
}

export function selectWorkForm(state: DemoState, locale: Locale, requested: { to: string | null; mode: string | null }): WorkFormVM {
  const canPost = isTrusted(state, state.myCompanyId);
  const targets = state.companies
    .filter((c) => canRequestTo(state, c.id))
    .map((c) => {
      const record = trackRecord(state, c.id);
      const rating = record.ratingAverage === null ? "" : ` ★${record.ratingAverage.toFixed(1)}`;
      return { id: c.id, label: `${pick(c.name, locale)}${rating}` };
    });
  const toId = requested.to && targets.some((t) => t.id === requested.to) ? requested.to : null;
  const mode: WorkMode = requested.mode === "open" && toId === null ? "open" : "direct";
  return {
    canPost,
    needTrustText: canPost ? null : translate("network.new.needTrust", locale),
    mode,
    targets,
    toId,
    categories: WORK_CATEGORIES.map((id) => ({ id, label: workCategoryLabel(id, locale) })),
    limits: WORK_LIMITS,
    budgetMin: WORK_BUDGET_MIN_YEN,
    budgetMax: WORK_BUDGET_MAX_YEN,
    minDays: WORK_MIN_DAYS,
    maxDays: WORK_MAX_DAYS,
    budgetHint: translate("network.new.budgetHint", locale, { min: formatYen(WORK_BUDGET_MIN_YEN, locale), max: formatYen(WORK_BUDGET_MAX_YEN, locale) }),
    daysHint: translate("network.new.daysHint", locale, { min: WORK_MIN_DAYS, max: WORK_MAX_DAYS }),
    feeNote: translate("network.feeFree", locale),
  };
}

// ───────── 대시보드 한 줄 ─────────

export function selectNetworkSummary(state: DemoState, locale: Locale): { text: string; todo: number } {
  const received = state.workRequests.filter((w) => isWorkForUs(state, w)).length;
  const sent = state.workRequests.filter((w) => isOurWork(state, w)).length;
  const open = state.workRequests.filter((w) => w.status === "open" && !isOurWork(state, w)).length;
  const todo = state.workRequests.filter((w) => todoOf(state, w) !== null).length;
  return { text: translate("network.dashboard.summary", locale, { received, sent, open }), todo };
}

// ───────── 입력 오류 문장 ─────────

export function workDraftErrorText(error: WorkDraftError, locale: Locale): string {
  const params = {
    max: error === "title_too_long" ? WORK_LIMITS.title : WORK_LIMITS.detail,
    min: error === "budget_invalid" ? formatYen(WORK_BUDGET_MIN_YEN, locale) : WORK_MIN_DAYS,
  };
  if (error === "budget_invalid") return translate("network.error.budget_invalid", locale, { min: formatYen(WORK_BUDGET_MIN_YEN, locale), max: formatYen(WORK_BUDGET_MAX_YEN, locale) });
  if (error === "days_invalid") return translate("network.error.days_invalid", locale, { min: WORK_MIN_DAYS, max: WORK_MAX_DAYS });
  return translate(`network.error.${error}` as MessageKey, locale, params);
}

export const shortTextErrorText = (error: ShortTextError, max: number, locale: Locale): string => translate(`network.text.${error}`, locale, { max });

export function ratingErrorText(error: RatingError, locale: Locale): string {
  if (error === "not_allowed" || error === "stars_invalid") return translate(`rating.error.${error}`, locale);
  return shortTextErrorText(error, WORK_LIMITS.comment, locale);
}
