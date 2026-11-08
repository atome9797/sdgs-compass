// 기업 네트워크의 규칙 (순수 함수): 신뢰 실적 · 신뢰 기업 판정 · 업무 의뢰 입력 검사와 상태 바꾸기 · 상호 평가 (state.ts 의 reducer 가 불러요).
// 흐름: 지명 의뢰(requested → 맡기 inProgress / 거절 declined) 또는 공개 모집(open → 응모 → 의뢰한 기업이 골라 inProgress)
// → 맡은 기업이 납품을 알려요(delivered) → 의뢰한 기업이 확인하고 의뢰비를 직접 지급하면 끝(completed) → 서로 평가해요.
// 수수료는 없어요(신뢰 기업의 특전 — fees.ts). 설계와 열린 질문은 docs/network.md.
import {
  WORK_CATEGORIES, type DemoState, type Rating, type RaterRole, type RatingKind, type WorkCategory, type WorkMode, type WorkRequest, type WorkStatus,
} from "./domain";
import { addDays, daysBetween } from "./format";
import { containsContact } from "./post";
import { charCount } from "./proposal";

/** 신뢰 기업의 조건: 약속대로 돈을 낸 거래가 1건 이상 · 받은 평가가 1건 이상이고 평균 ★3.5 이상 · 지급 지연이 없어요 */
export const TRUST_RULE = { minDeals: 1, minRatings: 1, minAverage: 3.5 } as const;
/** 납품(성과 도착)을 알린 뒤 이 날수가 지나도 확인·지급하지 않으면 「지급 지연」이에요 */
export const LATE_AFTER_DAYS = 14;

export const WORK_LIMITS = { title: 60, detail: 400, delivery: 200, application: 120, comment: 80 } as const;
/** 업무 의뢰비 입력 범위(엔) — 데모의 입력 검사용이에요 */
export const WORK_BUDGET_MIN_YEN = 10_000;
export const WORK_BUDGET_MAX_YEN = 10_000_000;
/** 납기: 게재일부터 7~180일 뒤 */
export const WORK_MIN_DAYS = 7;
export const WORK_MAX_DAYS = 180;

export const WORK_STATUSES: readonly WorkStatus[] = ["open", "requested", "inProgress", "delivered", "completed", "declined"];
export const isWorkCategory = (value: unknown): value is WorkCategory => typeof value === "string" && (WORK_CATEGORIES as readonly string[]).includes(value);
export const isWorkStatus = (value: unknown): value is WorkStatus => typeof value === "string" && (WORK_STATUSES as readonly string[]).includes(value);

// ───────── 신뢰 실적 ─────────

export interface TrackRecord {
  /** 최우수상 팀에 지급한 상금 */
  prizesPaid: number;
  /** 확인하고 의뢰비를 지급한 연구 의뢰 */
  researchPaid: number;
  /** 끝난 기업 간 업무 의뢰 (의뢰했거나 맡았거나) */
  workDone: number;
  /** 위 세 가지의 합 */
  deals: number;
  /** 지급 지연: 우리가 의뢰한 연구·업무의 납품이 온 지 14일이 넘었는데 아직 확인·지급하지 않은 것 */
  late: number;
  ratingCount: number;
  /** 받은 평가의 평균 (소수 첫째 자리, 평가가 없으면 null) */
  ratingAverage: number | null;
  trusted: boolean;
  /** 신뢰 기업이 아니면 무엇이 모자란지 (조건 순서대로) */
  missing: ("deals" | "ratings" | "average" | "late")[];
}

/** 받은 평가의 평균 (소수 첫째 자리 반올림) */
export function averageStars(ratings: readonly Pick<Rating, "stars">[]): number | null {
  if (ratings.length === 0) return null;
  return Math.round((ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length) * 10) / 10;
}

export const ratingsFor = (state: DemoState, toRole: Rating["toRole"], toId: string): Rating[] =>
  state.ratings.filter((r) => r.toRole === toRole && r.toId === toId).sort((a, b) => b.createdOn.localeCompare(a.createdOn) || b.id.localeCompare(a.id));

/** 기업 한 곳의 신뢰 실적 (오늘 기준) */
export function trackRecord(state: DemoState, companyId: string): TrackRecord {
  const prizesPaid = state.prizePayments.filter((p) => p.companyId === companyId && p.status === "paid").length;
  const research = state.researchRequests.filter((r) => r.companyId === companyId);
  const researchPaid = research.filter((r) => r.status === "completed").length;
  const work = state.workRequests.filter((w) => w.fromCompanyId === companyId || w.toCompanyId === companyId);
  const workDone = work.filter((w) => w.status === "completed").length;
  const overdue = (on: string | null) => on !== null && daysBetween(on, state.today) > LATE_AFTER_DAYS;
  const late =
    research.filter((r) => r.status === "delivered" && overdue(r.result ? r.result.submittedAt.slice(0, 10) : null)).length +
    work.filter((w) => w.fromCompanyId === companyId && w.status === "delivered" && overdue(w.deliveredOn)).length;
  const received = ratingsFor(state, "company", companyId);
  const ratingAverage = averageStars(received);
  const deals = prizesPaid + researchPaid + workDone;
  const missing: TrackRecord["missing"] = [];
  if (deals < TRUST_RULE.minDeals) missing.push("deals");
  if (received.length < TRUST_RULE.minRatings) missing.push("ratings");
  else if ((ratingAverage ?? 0) < TRUST_RULE.minAverage) missing.push("average");
  if (late > 0) missing.push("late");
  return { prizesPaid, researchPaid, workDone, deals, late, ratingCount: received.length, ratingAverage, trusted: missing.length === 0, missing };
}

export const isTrusted = (state: DemoState, companyId: string): boolean => trackRecord(state, companyId).trusted;

// ───────── 누구의 의뢰인가요 ─────────

export const isOurWork = (state: DemoState, work: WorkRequest): boolean => work.fromCompanyId === state.myCompanyId;
export const isWorkForUs = (state: DemoState, work: WorkRequest): boolean => work.toCompanyId === state.myCompanyId;
export const hasApplied = (state: DemoState, work: WorkRequest): boolean => work.applications.some((a) => a.companyId === state.myCompanyId);

/** 우리 회사가 응모할 수 있나요: 다른 기업의 공개 모집 · 납기 전 · 아직 응모하지 않았고 · 우리가 신뢰 기업 */
export function canApply(state: DemoState, work: WorkRequest): boolean {
  return work.status === "open" && !isOurWork(state, work) && !hasApplied(state, work) && work.dueOn >= state.today && isTrusted(state, state.myCompanyId);
}

/** 지명할 수 있는 기업: 우리 회사가 아닌 신뢰 기업 */
export const canRequestTo = (state: DemoState, companyId: string): boolean =>
  companyId !== state.myCompanyId && state.companies.some((c) => c.id === companyId) && isTrusted(state, companyId);

// ───────── 입력 검사 ─────────

export interface WorkDraft {
  mode: WorkMode;
  /** 지명 의뢰의 상대 (공개 모집이면 null) */
  toCompanyId: string | null;
  category: string;
  title: string;
  detail: string;
  budgetYen: number;
  days: number;
}

export type WorkDraftError =
  | "not_trusted" | "to_invalid" | "category_invalid" | "title_required" | "title_too_long" | "detail_required" | "detail_too_long" | "budget_invalid" | "days_invalid" | "contact_info";

/** 의뢰를 낼 수 있는지 (처음 걸린 것부터가 아니라 모든 문제를 돌려줘요) */
export function validateWorkDraft(state: DemoState, draft: WorkDraft): WorkDraftError[] {
  const errors: WorkDraftError[] = [];
  if (!isTrusted(state, state.myCompanyId)) errors.push("not_trusted");
  if (draft.mode === "direct" ? draft.toCompanyId === null || !canRequestTo(state, draft.toCompanyId) : draft.mode !== "open" || draft.toCompanyId !== null) errors.push("to_invalid");
  if (!isWorkCategory(draft.category)) errors.push("category_invalid");
  const title = draft.title.trim();
  const detail = draft.detail.trim();
  if (title === "") errors.push("title_required");
  else if (charCount(title) > WORK_LIMITS.title) errors.push("title_too_long");
  if (detail === "") errors.push("detail_required");
  else if (charCount(detail) > WORK_LIMITS.detail) errors.push("detail_too_long");
  if (!Number.isSafeInteger(draft.budgetYen) || draft.budgetYen < WORK_BUDGET_MIN_YEN || draft.budgetYen > WORK_BUDGET_MAX_YEN) errors.push("budget_invalid");
  if (!Number.isInteger(draft.days) || draft.days < WORK_MIN_DAYS || draft.days > WORK_MAX_DAYS) errors.push("days_invalid");
  if (containsContact(title) || containsContact(detail)) errors.push("contact_info");
  return errors;
}

export type ShortTextError = "required" | "too_long" | "contact_info";

/** 응모 한 줄 · 납품 메모 · 평가 한 줄: 비우지 않고 · 글자 수 안 · 연락처 없이 */
export function validateShortText(text: string, max: number): ShortTextError | null {
  const trimmed = text.trim();
  if (trimmed === "") return "required";
  if (charCount(trimmed) > max) return "too_long";
  if (containsContact(trimmed)) return "contact_info";
  return null;
}

export const nextWorkId = (state: DemoState): string => `wr${state.seq}`;

// ───────── 상태 바꾸기 (조건이 맞지 않으면 그대로 돌려줘요) ─────────

const replace = (state: DemoState, next: WorkRequest): DemoState => ({ ...state, workRequests: state.workRequests.map((w) => (w.id === next.id ? next : w)) });
const find = (state: DemoState, id: string) => state.workRequests.find((w) => w.id === id);

/** 우리 회사가 업무를 의뢰해요 (지명이면 requested, 공개 모집이면 open) */
export function postWorkRequest(state: DemoState, draft: WorkDraft, at: string): DemoState {
  if (validateWorkDraft(state, draft).length > 0) return state;
  const today = at.slice(0, 10);
  const work: WorkRequest = {
    id: nextWorkId(state),
    mode: draft.mode,
    fromCompanyId: state.myCompanyId,
    toCompanyId: draft.mode === "direct" ? draft.toCompanyId : null,
    category: draft.category as WorkCategory,
    title: draft.title.trim(),
    detail: draft.detail.trim(),
    budgetYen: draft.budgetYen,
    postedOn: today,
    dueOn: addDays(today, draft.days),
    status: draft.mode === "direct" ? "requested" : "open",
    applications: [],
    acceptedOn: null,
    deliveredOn: null,
    deliveryNote: null,
    completedOn: null,
  };
  return { ...state, seq: state.seq + 1, workRequests: [work, ...state.workRequests] };
}

/** 지명받은 의뢰를 맡거나(진행 중) 거절해요 — 우리 회사가 받은 의뢰 · 확인 중일 때만 */
export function respondWorkRequest(state: DemoState, id: string, accept: boolean, at: string): DemoState {
  const work = find(state, id);
  if (!work || !isWorkForUs(state, work) || work.status !== "requested") return state;
  return replace(state, accept ? { ...work, status: "inProgress", acceptedOn: at.slice(0, 10) } : { ...work, status: "declined" });
}

/** 다른 기업의 공개 모집에 응모해요 (한 줄) */
export function applyWorkRequest(state: DemoState, id: string, message: string, at: string): DemoState {
  const work = find(state, id);
  if (!work || !canApply(state, work) || validateShortText(message, WORK_LIMITS.application) !== null) return state;
  return replace(state, { ...work, applications: [...work.applications, { companyId: state.myCompanyId, message: message.trim(), appliedOn: at.slice(0, 10) }] });
}

/** 우리 회사의 공개 모집에 응모한 기업 중 한 곳에 맡겨요 */
export function chooseWorkApplicant(state: DemoState, id: string, companyId: string, at: string): DemoState {
  const work = find(state, id);
  if (!work || !isOurWork(state, work) || work.status !== "open" || !work.applications.some((a) => a.companyId === companyId)) return state;
  return replace(state, { ...work, toCompanyId: companyId, status: "inProgress", acceptedOn: at.slice(0, 10) });
}

/** 우리 회사가 맡은 의뢰의 납품을 알려요 (한 줄) */
export function deliverWork(state: DemoState, id: string, note: string, at: string): DemoState {
  const work = find(state, id);
  if (!work || !isWorkForUs(state, work) || work.status !== "inProgress" || validateShortText(note, WORK_LIMITS.delivery) !== null) return state;
  return replace(state, { ...work, status: "delivered", deliveredOn: at.slice(0, 10), deliveryNote: note.trim() });
}

/** 우리 회사가 의뢰한 일의 납품을 확인하고 끝내요 — 의뢰비는 맡은 기업에 직접 지급(데모는 기록만) */
export function completeWork(state: DemoState, id: string, at: string): DemoState {
  const work = find(state, id);
  if (!work || !isOurWork(state, work) || work.status !== "delivered") return state;
  return replace(state, { ...work, status: "completed", completedOn: at.slice(0, 10) });
}

// ───────── 상호 평가 ─────────

export interface RatingDraft {
  kind: RatingKind;
  refId: string;
  /** 평가받는 쪽 */
  toRole: Rating["toRole"];
  toId: string;
  stars: number;
  comment: string;
}

/** 지금 계정(fromRole)이 평가할 수 있는 거래인지: 끝난 거래의 당사자이고, 상대가 맞고, 아직 평가하지 않았어요 */
export function canRate(state: DemoState, fromRole: RaterRole, draft: Pick<RatingDraft, "kind" | "refId" | "toRole" | "toId">): boolean {
  const fromId = raterId(state, fromRole);
  if (state.ratings.some((r) => r.kind === draft.kind && r.refId === draft.refId && r.fromRole === fromRole && r.fromId === fromId)) return false;
  if (draft.kind === "prize") {
    // 학생(나)이 받은 상금 → 지급한 기업
    return (
      fromRole === "student" && draft.toRole === "company" &&
      state.wallet.entries.some((e) => e.source.kind === "prize" && e.source.companyId === draft.toId && prizeRefOf(e.source, e.id) === draft.refId)
    );
  }
  if (draft.kind === "research") {
    const r = state.researchRequests.find((x) => x.id === draft.refId);
    if (!r || r.status !== "completed") return false;
    if (fromRole === "researcher") return r.researcherId === fromId && draft.toRole === "company" && draft.toId === r.companyId;
    if (fromRole === "company") return r.companyId === fromId && draft.toRole === "researcher" && draft.toId === r.researcherId;
    return false;
  }
  const w = state.workRequests.find((x) => x.id === draft.refId);
  if (!w || w.status !== "completed" || fromRole !== "company" || draft.toRole !== "company") return false;
  return (w.fromCompanyId === fromId && draft.toId === w.toCompanyId) || (w.toCompanyId === fromId && draft.toId === w.fromCompanyId);
}

/** 평가하는 계정의 id: 학생 = me, 연구자 = researcher, 기업 = 우리 회사 */
export function raterId(state: DemoState, role: RaterRole): string {
  return role === "student" ? state.me.id : role === "researcher" ? state.researcher.id : state.myCompanyId;
}

/** 받은 상금의 평가 대상(refId): 과제 id, 과제가 없는 지난 실적은 활동 id, 그것도 없으면 기록 id */
export function prizeRefOf(source: { challengeId: string | null; activityId: string | null }, entryId: string): string {
  return source.challengeId ?? source.activityId ?? entryId;
}

export type RatingError = "not_allowed" | "stars_invalid" | ShortTextError;

export function validateRating(state: DemoState, fromRole: RaterRole, draft: RatingDraft): RatingError | null {
  if (!canRate(state, fromRole, draft)) return "not_allowed";
  if (!Number.isInteger(draft.stars) || draft.stars < 1 || draft.stars > 5) return "stars_invalid";
  return validateShortText(draft.comment, WORK_LIMITS.comment);
}

/** 평가를 남겨요 (한 거래에 한 번) */
export function rate(state: DemoState, fromRole: RaterRole, draft: RatingDraft, at: string): DemoState {
  if (validateRating(state, fromRole, draft) !== null) return state;
  const rating: Rating = {
    id: `ra${state.seq}`,
    kind: draft.kind,
    refId: draft.refId,
    fromRole,
    fromId: raterId(state, fromRole),
    toRole: draft.toRole,
    toId: draft.toId,
    stars: draft.stars,
    comment: draft.comment.trim(),
    createdOn: at.slice(0, 10),
  };
  return { ...state, seq: state.seq + 1, ratings: [rating, ...state.ratings] };
}

/** 이 거래에 지금 계정이 남긴 평가 (없으면 null) */
export function myRatingOf(state: DemoState, fromRole: RaterRole, kind: RatingKind, refId: string): Rating | null {
  const fromId = raterId(state, fromRole);
  return state.ratings.find((r) => r.kind === kind && r.refId === refId && r.fromRole === fromRole && r.fromId === fromId) ?? null;
}
