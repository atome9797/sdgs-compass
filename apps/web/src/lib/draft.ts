// 기획서 제출 화면(4단계)의 입력 모으기: 파일 → 초안 변환, 단계별 오류 나누기. 순수 함수라서 브라우저 없이 테스트해요.
// 파일은 이름·크기만 읽어요(내용은 읽거나 보내지 않아요 — 데모에서 지문은 이름·크기·제목·요약으로 만들어요).
import type { ProposalDraft, ProposalError } from "@sdgs-compass/core/proposal";

export interface PickedFile {
  name: string;
  size: number;
}

/** "샘플 기획서를 첨부" 단추용 가짜 파일 (실제 파일은 없고 이름·크기만 있어요) */
export const SAMPLE_FILES: readonly PickedFile[] = [
  { name: "SDGs-proposal-sample.pdf", size: 2_516_582 },
  { name: "SDGs-proposal-sample.pptx", size: 4_404_019 },
];

/** <input type=file> 의 File 에서 이름·크기만 꺼내요 */
export function pickFileInfo(file: { name: string; size: number }): PickedFile {
  return { name: file.name, size: file.size };
}

export interface DraftFields {
  teamName: string;
  title: string;
  summary: string;
  videoUrl: string;
  file: PickedFile | null;
}

export function emptyDraftFields(): DraftFields {
  return { teamName: "", title: "", summary: "", videoUrl: "", file: null };
}

/** 화면의 입력값 → core 의 ProposalDraft (검사·제출에 그대로 써요) */
export function toProposalDraft(fields: DraftFields): ProposalDraft {
  return {
    teamName: fields.teamName,
    title: fields.title,
    summary: fields.summary,
    videoUrl: fields.videoUrl,
    fileName: fields.file ? fields.file.name : null,
    fileSizeBytes: fields.file ? fields.file.size : 0,
  };
}

export type SubmitStep = 1 | 2 | 3 | 4;
export const SUBMIT_STEPS: readonly SubmitStep[] = [1, 2, 3, 4];

/** 각 입력 단계(1~3)에서 보여 줄 오류. 4단계(확인)에는 전체를 보여 줘요. deadline_passed 는 어느 단계에서나 보여요. */
const STEP_ERRORS: Record<1 | 2 | 3, readonly ProposalError[]> = {
  1: ["team_name_required", "team_name_too_long"],
  2: ["file_required", "file_type", "file_too_large"],
  3: ["title_required", "title_too_long", "summary_required", "summary_too_long", "video_url_invalid"],
};

export function errorsForStep(step: SubmitStep, errors: readonly ProposalError[]): ProposalError[] {
  if (step === 4) return [...errors];
  return errors.filter((code) => code === "deadline_passed" || STEP_ERRORS[step].includes(code));
}

/** 오류가 있는 가장 앞 단계 (deadline_passed 만 있으면 null, 오류가 없어도 null) */
export function firstInvalidStep(errors: readonly ProposalError[]): 1 | 2 | 3 | null {
  for (const step of [1, 2, 3] as const) {
    if (errors.some((code) => STEP_ERRORS[step].includes(code))) return step;
  }
  return null;
}

/** 다음 단계로 넘어가도 되는지: 그 단계의 오류(마감 지남 제외)가 없을 때 */
export function canLeaveStep(step: 1 | 2 | 3, errors: readonly ProposalError[]): boolean {
  return !errors.some((code) => STEP_ERRORS[step].includes(code));
}
