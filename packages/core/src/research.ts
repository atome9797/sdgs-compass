// 연구 의뢰의 규칙 (순수 함수): 의뢰할 수 있는 아이디어 · 입력 검사 · 성과 파일 지문 · 상태 바꾸기(state.ts 의 reducer 가 불러요).
// 흐름: 기업이 표창·채택한 학생 아이디어를 실현하려고 연구를 의뢰(open) → 대학원생 연구자가 맡아요(inProgress) → 성과를 보내요(delivered)
// → 기업이 확인하면 끝(completed)이고, 의뢰비는 기업이 연구자에게 직접 지급해요(데모는 기록만 — 운영사가 돈을 맡지 않아요).
// 운영 수수료와 「의뢰를 받는 방법」은 대학원생 설문 뒤에 정해요(docs/research.md). 그래서 수수료 금액은 여기에 없어요.
import { RESEARCH_FIELDS, type DemoState, type Proposal, type ResearchField, type ResearchRequest, type ResearchRequestStatus, type ResearchResult } from "./domain";
import { addDays, daysBetween } from "./format";
import { sha256Hex } from "./hash";
import { containsContact } from "./post";
import { charCount, fileExtension } from "./proposal";

export const RESEARCH_LIMITS = {
  title: 60,
  detail: 400,
  deliverable: 100,
  maxFields: 3,
  resultSummary: 400,
  fileBytes: 50 * 1024 * 1024,
} as const;

/** 의뢰비 입력 범위(엔) — 데모의 입력 검사용이에요. 실제 기준은 대학원생 설문 뒤에 정해요 */
export const RESEARCH_FEE_MIN_YEN = 10_000;
export const RESEARCH_FEE_MAX_YEN = 1_000_000;
/** 성과를 보내는 기한: 게재일부터 7~180일 뒤 */
export const RESEARCH_MIN_DAYS = 7;
export const RESEARCH_MAX_DAYS = 180;
/** 성과 파일로 받을 수 있는 형식 */
export const RESULT_EXTENSIONS = ["pdf", "pptx", "docx", "xlsx", "csv", "zip"] as const;

/** 화면에 늘어놓는 상태 순서 (진행 단계와 같아요) */
export const RESEARCH_STATUSES: readonly ResearchRequestStatus[] = ["open", "inProgress", "delivered", "completed"];

export const isResearchField = (value: unknown): value is ResearchField => typeof value === "string" && (RESEARCH_FIELDS as readonly string[]).includes(value);
export const isResearchStatus = (value: unknown): value is ResearchRequestStatus => typeof value === "string" && (RESEARCH_STATUSES as readonly string[]).includes(value);

/** 모르는 분야와 겹치는 분야를 빼요 (고른 순서는 그대로) */
export function uniqueFields(fields: readonly string[]): ResearchField[] {
  const out: ResearchField[] = [];
  for (const field of fields) if (isResearchField(field) && !out.includes(field)) out.push(field);
  return out;
}

// ───────── 누구의 의뢰인가요 ─────────

/** 데모의 연구자(researcher)가 맡은 의뢰인가요 */
export const isMyResearch = (state: DemoState, request: ResearchRequest): boolean => request.researcherId !== null && request.researcherId === state.researcher.id;
/** 데모의 우리 회사(myCompanyId)가 낸 의뢰인가요 */
export const isOurResearch = (state: DemoState, request: ResearchRequest): boolean => request.companyId === state.myCompanyId;

/** 연구를 의뢰할 수 있는 아이디어: 우리 회사 과제에서 표창(awarded)·채택(adopted)된 기획서 */
export function researchableProposals(state: DemoState): Proposal[] {
  const ours = new Set(state.challenges.filter((c) => c.companyId === state.myCompanyId).map((c) => c.id));
  return state.proposals.filter((p) => ours.has(p.challengeId) && (p.status === "awarded" || p.status === "adopted"));
}

/** 이 기획서(아이디어)에서 나온 연구 의뢰들 */
export function researchRequestsFor(state: DemoState, proposalId: string): ResearchRequest[] {
  return state.researchRequests.filter((r) => r.origin.proposalId === proposalId);
}

/** 연구자가 지금 맡을 수 있나요: 모집 중이고 기한이 지나지 않았어요 */
export const isAcceptable = (request: ResearchRequest, today: string): boolean => request.status === "open" && daysBetween(today, request.dueOn) >= 0;

/** reducer 가 새 의뢰에 붙이는 id — 화면이 게재 뒤 그 의뢰를 강조할 때 써요 */
export const nextResearchId = (state: DemoState): string => `rr${state.seq}`;

// ───────── 의뢰 입력 검사 (기업) ─────────

export interface ResearchDraft {
  /** 출발점 아이디어(표창·채택된 기획서)의 id */
  proposalId: string;
  title: string;
  detail: string;
  deliverable: string;
  fields: readonly string[];
  /** 숫자가 아니면 NaN */
  feeYen: number;
  /** 게재일부터 기한까지의 날수 */
  days: number;
}

export type ResearchDraftError =
  | "origin_invalid"
  | "title_required"
  | "title_too_long"
  | "detail_required"
  | "detail_too_long"
  | "deliverable_required"
  | "deliverable_too_long"
  | "fields_required"
  | "fields_too_many"
  | "fee_invalid"
  | "days_invalid"
  | "contact_info";

/** 빈 배열이면 게재할 수 있어요. 순서는 화면의 입력 순서와 같아요 */
export function validateResearchDraft(draft: ResearchDraft, state: DemoState): ResearchDraftError[] {
  const errors: ResearchDraftError[] = [];
  if (!researchableProposals(state).some((p) => p.id === draft.proposalId)) errors.push("origin_invalid");

  const title = charCount(draft.title);
  if (title === 0) errors.push("title_required");
  else if (title > RESEARCH_LIMITS.title) errors.push("title_too_long");

  const detail = charCount(draft.detail);
  if (detail === 0) errors.push("detail_required");
  else if (detail > RESEARCH_LIMITS.detail) errors.push("detail_too_long");

  const deliverable = charCount(draft.deliverable);
  if (deliverable === 0) errors.push("deliverable_required");
  else if (deliverable > RESEARCH_LIMITS.deliverable) errors.push("deliverable_too_long");

  const fields = uniqueFields(draft.fields);
  if (fields.length === 0) errors.push("fields_required");
  else if (fields.length > RESEARCH_LIMITS.maxFields) errors.push("fields_too_many");

  if (!Number.isSafeInteger(draft.feeYen) || draft.feeYen < RESEARCH_FEE_MIN_YEN || draft.feeYen > RESEARCH_FEE_MAX_YEN) errors.push("fee_invalid");
  if (!Number.isInteger(draft.days) || draft.days < RESEARCH_MIN_DAYS || draft.days > RESEARCH_MAX_DAYS) errors.push("days_invalid");
  // 연락처는 의뢰 글에 쓰지 않아요 (SNS 글과 같은 검출 규칙 — post.ts 의 containsContact)
  if ([draft.title, draft.detail, draft.deliverable].some((text) => containsContact(text))) errors.push("contact_info");
  return errors;
}

// ───────── 성과 입력 검사 (연구자) ─────────

export interface ResearchResultDraft {
  summary: string;
  /** 고른 파일 이름 (없으면 null) */
  fileName: string | null;
  fileSizeBytes: number;
}

export type ResearchResultError = "summary_required" | "summary_too_long" | "file_required" | "file_type" | "file_too_large";

export function validateResearchResult(draft: ResearchResultDraft): ResearchResultError[] {
  const errors: ResearchResultError[] = [];
  const summary = charCount(draft.summary);
  if (summary === 0) errors.push("summary_required");
  else if (summary > RESEARCH_LIMITS.resultSummary) errors.push("summary_too_long");
  if (draft.fileName === null || draft.fileName.trim() === "") errors.push("file_required");
  else if (!(RESULT_EXTENSIONS as readonly string[]).includes(fileExtension(draft.fileName))) errors.push("file_type");
  else if (!(draft.fileSizeBytes >= 0) || draft.fileSizeBytes > RESEARCH_LIMITS.fileBytes) errors.push("file_too_large");
  return errors;
}

/** 성과 파일 지문: 데모에서는 의뢰 id·파일 이름·크기·요약으로 SHA-256 을 만들어요 (실서비스는 파일 내용의 해시) */
export function resultFingerprint(requestId: string, draft: ResearchResultDraft): string {
  return sha256Hex(`${requestId}|${(draft.fileName ?? "").trim()}|${draft.fileSizeBytes}|${draft.summary.trim()}`);
}

// ───────── 합계 ─────────

export interface ResearchTotals {
  open: number;
  inProgress: number;
  delivered: number;
  completed: number;
  /** 완료된 의뢰의 의뢰비 합계 (연구자: 받은 금액, 기업: 지급한 금액) */
  completedYen: number;
}

export function researchTotals(requests: readonly ResearchRequest[]): ResearchTotals {
  const totals: ResearchTotals = { open: 0, inProgress: 0, delivered: 0, completed: 0, completedYen: 0 };
  for (const request of requests) {
    totals[request.status] += 1;
    if (request.status === "completed") totals.completedYen += request.feeYen;
  }
  return totals;
}

// ───────── 데모 상태를 바꾸는 조각 (state.ts 의 reducer 가 불러요) ─────────

function updateRequest(state: DemoState, id: string, change: Partial<ResearchRequest>): DemoState {
  return { ...state, researchRequests: state.researchRequests.map((r) => (r.id === id ? { ...r, ...change } : r)) };
}

/** 기업(우리 회사)이 연구 의뢰를 게재해요. 입력 검사를 통과하지 못하면 그대로예요 */
export function postResearchRequest(state: DemoState, draft: ResearchDraft, at: string): DemoState {
  if (validateResearchDraft(draft, state).length > 0) return state;
  const proposal = state.proposals.find((p) => p.id === draft.proposalId);
  if (!proposal) return state;
  const postedOn = at.slice(0, 10);
  const request: ResearchRequest = {
    id: nextResearchId(state),
    companyId: state.myCompanyId,
    origin: { proposalId: proposal.id, challengeId: proposal.challengeId, ideaTitle: proposal.title, teamName: proposal.teamName },
    title: draft.title.trim(),
    detail: draft.detail.trim(),
    deliverable: draft.deliverable.trim(),
    fields: uniqueFields(draft.fields),
    feeYen: draft.feeYen,
    postedOn,
    dueOn: addDays(postedOn, draft.days),
    status: "open",
    researcherId: null,
    acceptedOn: null,
    result: null,
    completedOn: null,
  };
  return { ...state, seq: state.seq + 1, researchRequests: [request, ...state.researchRequests] };
}

/** 연구자가 모집 중인 의뢰를 맡아요 (데모: 누르면 바로 담당. 실서비스에서 고르는 방법은 설문 뒤에 정해요) */
export function acceptResearchRequest(state: DemoState, requestId: string, at: string): DemoState {
  const request = state.researchRequests.find((r) => r.id === requestId);
  if (!request || !isAcceptable(request, state.today)) return state;
  return updateRequest(state, request.id, { status: "inProgress", researcherId: state.researcher.id, acceptedOn: at.slice(0, 10) });
}

/** 맡은 연구자가 성과(요약 + 파일)를 보내요 */
export function submitResearchResult(state: DemoState, requestId: string, draft: ResearchResultDraft, at: string): DemoState {
  const request = state.researchRequests.find((r) => r.id === requestId);
  if (!request || request.status !== "inProgress" || !isMyResearch(state, request)) return state;
  if (validateResearchResult(draft).length > 0) return state;
  const result: ResearchResult = {
    summary: draft.summary.trim(),
    fileName: (draft.fileName ?? "").trim(),
    fileSizeBytes: draft.fileSizeBytes,
    sha256: resultFingerprint(request.id, draft),
    submittedAt: at,
  };
  return updateRequest(state, request.id, { status: "delivered", result });
}

/** 의뢰한 기업이 성과를 확인하고 완료로 해요 — 의뢰비는 기업이 연구자에게 직접 지급(데모는 기록만) */
export function completeResearchRequest(state: DemoState, requestId: string, at: string): DemoState {
  const request = state.researchRequests.find((r) => r.id === requestId);
  if (!request || request.status !== "delivered" || !isOurResearch(state, request)) return state;
  return updateRequest(state, request.id, { status: "completed", completedOn: at.slice(0, 10) });
}
