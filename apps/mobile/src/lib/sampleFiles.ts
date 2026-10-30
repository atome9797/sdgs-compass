// 기획서 제출(SCR-03)의 "파일 선택": 데모라서 실제 파일 선택기 대신 견본 파일 세 개 중에서 골라요.
// 마지막 하나는 일부러 형식이 틀린 파일이에요 — 선택하면 검사 오류가 어떻게 나오는지 볼 수 있어요.
import { ALLOWED_EXTENSIONS, fileExtension, LIMITS } from "@sdgs-compass/core/proposal";

export interface SampleFile {
  id: string;
  fileName: string;
  sizeBytes: number;
}

export const SAMPLE_FILES: readonly SampleFile[] = [
  { id: "plan-pdf", fileName: "SDGs_plan_v1.pdf", sizeBytes: 2_516_582 },
  { id: "deck-pptx", fileName: "SDGs_pitch_deck.pptx", sizeBytes: 8_912_896 },
  { id: "memo-docx", fileName: "memo.docx", sizeBytes: 312_320 },
];

/** 제출 입력(ProposalDraft)에 들어가는 파일 부분 */
export function draftFile(sample: SampleFile): { fileName: string; fileSizeBytes: number } {
  return { fileName: sample.fileName, fileSizeBytes: sample.sizeBytes };
}

export function findSampleFile(id: string): SampleFile | undefined {
  return SAMPLE_FILES.find((sample) => sample.id === id);
}

/** 제출할 수 있는 형식·크기인지 (PDF·PPTX, 50MB 이하) */
export function isSubmittable(sample: SampleFile): boolean {
  return (ALLOWED_EXTENSIONS as readonly string[]).includes(fileExtension(sample.fileName)) && sample.sizeBytes <= LIMITS.fileBytes;
}
