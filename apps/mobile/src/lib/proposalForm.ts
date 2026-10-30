// 기획서 제출(SCR-03)의 4단계(팀 → 파일 → 요약 → 최종 확인)와 검사 오류 정리.
// 검사 자체(validateProposalDraft)는 core 에 있고, 여기서는 "어느 단계의 오류인지"와 문구 키만 정해요.
import type { MessageKey } from "@sdgs-compass/core/messages";
import type { ProposalDraft, ProposalError } from "@sdgs-compass/core/proposal";
import { draftFile, type SampleFile } from "./sampleFiles";

export const SUBMIT_STEPS = ["team", "file", "summary", "confirm"] as const;
export type SubmitStep = (typeof SUBMIT_STEPS)[number];

/** 단계 이름의 문구 키 (b2c.ts 의 submit.step*) */
export const STEP_LABEL_KEY: Record<SubmitStep, MessageKey> = {
  team: "submit.stepTeam",
  file: "submit.stepFile",
  summary: "submit.stepSummary",
  confirm: "submit.stepConfirm",
};

/** 마지막(confirm) 단계가 아닌 단계에서 보여 줄 오류 */
const STEP_ERRORS: Record<Exclude<SubmitStep, "confirm">, readonly ProposalError[]> = {
  team: ["team_name_required", "team_name_too_long"],
  file: ["file_required", "file_type", "file_too_large"],
  summary: ["title_required", "title_too_long", "summary_required", "summary_too_long", "video_url_invalid"],
};

/** 이 단계에서 보여 줄 오류 (confirm 은 전부) */
export function errorsForStep(step: SubmitStep, all: readonly ProposalError[]): ProposalError[] {
  if (step === "confirm") return [...all];
  return all.filter((error) => STEP_ERRORS[step].includes(error));
}

/** 오류가 남아 있는 가장 앞 단계 (없으면 null). deadline_passed 처럼 어느 칸 문제도 아닌 오류는 confirm 에서 보여요 */
export function firstInvalidStep(all: readonly ProposalError[]): SubmitStep | null {
  for (const step of ["team", "file", "summary"] as const) {
    if (errorsForStep(step, all).length > 0) return step;
  }
  return all.length > 0 ? "confirm" : null;
}

/** 다음 단계로 넘어갈 수 있는지 (그 단계의 오류가 없을 때) */
export function canAdvance(step: SubmitStep, all: readonly ProposalError[]): boolean {
  return errorsForStep(step, all).length === 0;
}

/** 검사 오류 → 문구 키 */
export const PROPOSAL_ERROR_KEY: Record<ProposalError, MessageKey> = {
  team_name_required: "submit.error.team_name_required",
  team_name_too_long: "submit.error.team_name_too_long",
  title_required: "submit.error.title_required",
  title_too_long: "submit.error.title_too_long",
  summary_required: "submit.error.summary_required",
  summary_too_long: "submit.error.summary_too_long",
  file_required: "submit.error.file_required",
  file_type: "submit.error.file_type",
  file_too_large: "submit.error.file_too_large",
  video_url_invalid: "submit.error.video_url_invalid",
  deadline_passed: "submit.error.deadline_passed",
};

// ───────── 입력 모음 ─────────

/** 제출 화면의 입력 칸들 (파일은 견본 파일 중 하나를 골라요 — 데모라서 실제 파일 선택기는 쓰지 않아요) */
export interface ProposalFields {
  teamName: string;
  title: string;
  summary: string;
  videoUrl: string;
  file: SampleFile | null;
}

export function emptyProposalFields(): ProposalFields {
  return { teamName: "", title: "", summary: "", videoUrl: "", file: null };
}

/** 이미 제출한 응모를 다시 제출할 때는 지난번 입력을 미리 채워 둬요 (파일은 새로 골라야 해요) */
export function prefilledFields(previous: { teamName: string; title: string; summary: string; videoUrl: string } | undefined): ProposalFields {
  if (!previous) return emptyProposalFields();
  return { ...emptyProposalFields(), teamName: previous.teamName, title: previous.title, summary: previous.summary, videoUrl: previous.videoUrl };
}

/** 입력 → core 의 ProposalDraft (검사·제출에 그대로 써요) */
export function toProposalDraft(fields: ProposalFields): ProposalDraft {
  return {
    teamName: fields.teamName,
    title: fields.title,
    summary: fields.summary,
    videoUrl: fields.videoUrl,
    ...(fields.file ? draftFile(fields.file) : { fileName: null, fileSizeBytes: 0 }),
  };
}

/** 단계 순서 안의 위치 (0부터) */
export function stepIndex(step: SubmitStep): number {
  return SUBMIT_STEPS.indexOf(step);
}

export function nextStep(step: SubmitStep): SubmitStep {
  return SUBMIT_STEPS[Math.min(SUBMIT_STEPS.length - 1, stepIndex(step) + 1)];
}

export function previousStep(step: SubmitStep): SubmitStep {
  return SUBMIT_STEPS[Math.max(0, stepIndex(step) - 1)];
}
