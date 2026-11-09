// F-301 기획서 제출: 입력 검사, 제출 수령증 번호, 파일 지문(F-302 버전 관리에 쓰는 SHA-256).
// 응모는 한 팀 3~5명(대학생 · 대학원생)이에요. 대학 수업 · 세미나에서 준비한 팀은 세미나 · 수업 이름(지도 교수)을 적을 수 있고,
// 기업의 응모자 화면에 「ゼミで参加」로 보여요(적지 않아도 응모할 수 있어요).
import { containsContact } from "./contact";
import { daysBetween } from "./format";
import { sha256Hex } from "./hash";

export const LIMITS = {
  teamName: 30,
  /** 세미나 · 수업 이름(지도 교수) */
  seminar: 40,
  title: 60,
  summary: 300,
  fileBytes: 50 * 1024 * 1024,
} as const;

/** 한 팀의 인원: 3~5명(대학생 · 대학원생). 고르지 않은 초안(모바일 앱 등)은 3명으로 봐요 */
export const TEAM_SIZE = { min: 3, max: 5, default: 3 } as const;
/** 인원 선택지: 3 · 4 · 5 */
export const TEAM_SIZES: readonly number[] = Array.from({ length: TEAM_SIZE.max - TEAM_SIZE.min + 1 }, (_, i) => TEAM_SIZE.min + i);

export function isTeamSize(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= TEAM_SIZE.min && value <= TEAM_SIZE.max;
}

export const ALLOWED_EXTENSIONS = ["pdf", "pptx"] as const;

export interface ProposalDraft {
  teamName: string;
  /** 팀 인원(3~5). 없으면 TEAM_SIZE.default — 모바일 앱의 제출 화면에는 아직 이 입력이 없어요 */
  teamSize?: number;
  /** 세미나 · 수업 이름(지도 교수). 비어 있거나 없으면 세미나 없이 응모 */
  seminar?: string;
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
  | "team_size_invalid"
  | "seminar_too_long"
  | "seminar_contact"
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
  if (!isTeamSize(draft.teamSize ?? TEAM_SIZE.default)) errors.push("team_size_invalid");
  const seminar = draft.seminar ?? "";
  if (charCount(seminar) > LIMITS.seminar) errors.push("seminar_too_long");
  else if (containsContact(seminar)) errors.push("seminar_contact");

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

/** 기획서에 저장하는 팀 정보: 앞뒤 공백을 지우고, 인원이 없으면 3명 */
export function teamOf(draft: ProposalDraft): { teamName: string; teamSize: number; seminar: string } {
  return { teamName: draft.teamName.trim(), teamSize: draft.teamSize ?? TEAM_SIZE.default, seminar: (draft.seminar ?? "").trim() };
}

/** 제출 수령증 번호: SC-20261114-0007 */
export function makeReceiptNo(date: string, seq: number): string {
  return `SC-${date.slice(0, 10).replaceAll("-", "")}-${String(seq).padStart(4, "0")}`;
}

/** 파일 지문: 실제 파일 내용 대신 데모에서는 이름·크기·제목·요약·버전으로 SHA-256 을 만들어요 (실서비스는 파일 내용의 해시) */
export function fileFingerprint(draft: ProposalDraft, version: number): string {
  return sha256Hex([draft.fileName ?? "", draft.fileSizeBytes, draft.title.trim(), draft.summary.trim(), `v${version}`].join("|"));
}
