// F-301 기획서 제출: 입력 검사, 제출 수령증 번호, 파일 지문(F-302 버전 관리에 쓰는 SHA-256).
import { daysBetween } from "./format";
import { sha256Hex } from "./hash";

export const LIMITS = {
  teamName: 30,
  title: 60,
  summary: 300,
  fileBytes: 50 * 1024 * 1024,
} as const;

export const ALLOWED_EXTENSIONS = ["pdf", "pptx"] as const;

export interface ProposalDraft {
  teamName: string;
  title: string;
  summary: string;
  /** 빈 문자열이면 없음 */
  videoUrl: string;
  /** 선택한 파일 이름 (없으면 null) */
  fileName: string | null;
  fileSizeBytes: number;
}

export type ProposalError =
  | "team_name_required"
  | "team_name_too_long"
  | "title_required"
  | "title_too_long"
  | "summary_required"
  | "summary_too_long"
  | "file_required"
  | "file_type"
  | "file_too_large"
  | "video_url_invalid"
  | "deadline_passed";

/** 글자 수 (이모지·한자도 1글자로 세요) */
export function charCount(text: string): number {
  return [...text.trim()].length;
}

export function fileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot < 0 ? "" : fileName.slice(dot + 1).toLowerCase();
}

/** 빈 배열이면 제출할 수 있어요. 순서는 화면의 입력 순서와 같아요. */
export function validateProposalDraft(draft: ProposalDraft, closesOn: string, today: string): ProposalError[] {
  const errors: ProposalError[] = [];
  if (daysBetween(today, closesOn) < 0) errors.push("deadline_passed");

  const team = charCount(draft.teamName);
  if (team === 0) errors.push("team_name_required");
  else if (team > LIMITS.teamName) errors.push("team_name_too_long");

  if (draft.fileName === null || draft.fileName.trim() === "") errors.push("file_required");
  else if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(fileExtension(draft.fileName))) errors.push("file_type");
  else if (draft.fileSizeBytes > LIMITS.fileBytes) errors.push("file_too_large");

  const title = charCount(draft.title);
  if (title === 0) errors.push("title_required");
  else if (title > LIMITS.title) errors.push("title_too_long");

  const summary = charCount(draft.summary);
  if (summary === 0) errors.push("summary_required");
  else if (summary > LIMITS.summary) errors.push("summary_too_long");

  const video = draft.videoUrl.trim();
  if (video !== "" && !/^https:\/\/[^\s/]+\.[^\s/]+(\/\S*)?$/i.test(video)) errors.push("video_url_invalid");
  return errors;
}

/** 제출 수령증 번호: SC-20261114-0007 */
export function makeReceiptNo(date: string, seq: number): string {
  return `SC-${date.slice(0, 10).replaceAll("-", "")}-${String(seq).padStart(4, "0")}`;
}

/** 파일 지문: 실제 파일 내용 대신 데모에서는 이름·크기·제목·요약·버전으로 SHA-256 을 만들어요 (실서비스는 파일 내용의 해시) */
export function fileFingerprint(draft: ProposalDraft, version: number): string {
  return sha256Hex([draft.fileName ?? "", draft.fileSizeBytes, draft.title.trim(), draft.summary.trim(), `v${version}`].join("|"));
}
