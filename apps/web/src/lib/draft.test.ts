import { describe, expect, it } from "vitest";
import { LIMITS, TEAM_SIZE, validateProposalDraft } from "@sdgs-compass/core/proposal";
import { canLeaveStep, emptyDraftFields, errorsForStep, firstInvalidStep, pickFileInfo, SAMPLE_FILES, toProposalDraft, type DraftFields } from "./draft";

const CLOSES = "2026-11-30";
const TODAY = "2026-10-30";
const filled = (over: Partial<DraftFields> = {}): DraftFields => ({ teamName: "SDGsフロンティア", teamSize: 4, seminar: "", title: "バイオ包装プラン", summary: "海のごみを減らす企画です。", videoUrl: "", file: SAMPLE_FILES[0], ...over });
const errorsOf = (fields: DraftFields) => validateProposalDraft(toProposalDraft(fields), CLOSES, TODAY);

describe("파일 → 초안", () => {
  it("파일에서는 이름과 크기만 꺼내요 (내용·경로 등은 읽지 않아요)", () => {
    const real = { name: "plan.pdf", size: 1234, type: "application/pdf", lastModified: 1, webkitRelativePath: "x/plan.pdf" };
    expect(pickFileInfo(real)).toEqual({ name: "plan.pdf", size: 1234 });
  });

  it("빈 입력은 파일 없음(null, 0바이트)으로 바뀌어요", () => {
    expect(toProposalDraft(emptyDraftFields())).toEqual({ teamName: "", teamSize: TEAM_SIZE.default, seminar: "", title: "", summary: "", videoUrl: "", fileName: null, fileSizeBytes: 0 });
  });

  it("팀 인원은 처음부터 3명이 골라져 있고, 인원 · 세미나 이름이 초안에 그대로 들어가요", () => {
    expect(emptyDraftFields().teamSize).toBe(3);
    const draft = toProposalDraft(filled({ teamSize: 5, seminar: "環境経済ゼミ（山田先生）" }));
    expect(draft.teamSize).toBe(5);
    expect(draft.seminar).toBe("環境経済ゼミ（山田先生）");
  });

  it("고른 파일의 이름·크기가 초안에 들어가요", () => {
    const draft = toProposalDraft(filled({ file: { name: "a.pptx", size: 99 } }));
    expect(draft.fileName).toBe("a.pptx");
    expect(draft.fileSizeBytes).toBe(99);
  });

  it("샘플 파일은 모두 검사를 통과해요 (PDF·PPTX, 50MB 이하)", () => {
    for (const file of SAMPLE_FILES) {
      expect(errorsOf(filled({ file }))).toEqual([]);
      expect(file.size).toBeLessThan(LIMITS.fileBytes);
    }
  });
});

describe("단계별 오류", () => {
  it("빈 입력: 팀 → 파일 → 요약 순서로 막혀요", () => {
    let fields = emptyDraftFields();
    expect(firstInvalidStep(errorsOf(fields))).toBe(1);
    fields = { ...fields, teamName: "チームA" };
    expect(firstInvalidStep(errorsOf(fields))).toBe(2);
    fields = { ...fields, file: SAMPLE_FILES[1] };
    expect(firstInvalidStep(errorsOf(fields))).toBe(3);
    fields = { ...fields, title: "題", summary: "要約" };
    expect(firstInvalidStep(errorsOf(fields))).toBeNull();
  });

  it("단계마다 자기 오류만 보여 주고, 마감 지남은 어디서나 보여요", () => {
    const all = ["team_name_required", "file_required", "title_required", "summary_too_long", "video_url_invalid", "deadline_passed"] as const;
    expect(errorsForStep(1, all)).toEqual(["team_name_required", "deadline_passed"]);
    expect(errorsForStep(2, all)).toEqual(["file_required", "deadline_passed"]);
    expect(errorsForStep(3, all)).toEqual(["title_required", "summary_too_long", "video_url_invalid", "deadline_passed"]);
    expect(errorsForStep(4, all)).toEqual([...all]);
  });

  it("팀 인원(3~5명) · 세미나 이름(40자 · 연락처 없음) 오류는 1단계에서 잡혀요", () => {
    for (const teamSize of [2, 6, 3.5]) {
      const errors = errorsOf(filled({ teamSize }));
      expect(errors, String(teamSize)).toEqual(["team_size_invalid"]);
      expect(firstInvalidStep(errors)).toBe(1);
    }
    expect(errorsOf(filled({ seminar: "ゼ".repeat(LIMITS.seminar) }))).toEqual([]);
    const long = errorsOf(filled({ seminar: "ゼ".repeat(LIMITS.seminar + 1) }));
    expect(long).toEqual(["seminar_too_long"]);
    expect(canLeaveStep(1, long)).toBe(false);
    const contact = errorsOf(filled({ seminar: "山田ゼミ teacher@example.ac.jp" }));
    expect(errorsForStep(1, contact)).toEqual(["seminar_contact"]);
    expect(errorsForStep(2, contact)).toEqual([]);
  });

  it("파일 종류·크기 오류는 2단계에서 잡혀요", () => {
    const wrongType = errorsOf(filled({ file: { name: "plan.docx", size: 10 } }));
    expect(wrongType).toContain("file_type");
    expect(firstInvalidStep(wrongType)).toBe(2);
    const tooBig = errorsOf(filled({ file: { name: "plan.pdf", size: LIMITS.fileBytes + 1 } }));
    expect(tooBig).toContain("file_too_large");
    expect(canLeaveStep(2, tooBig)).toBe(false);
  });

  it("요약 글자 수와 동영상 URL 은 3단계에서 잡혀요", () => {
    const long = errorsOf(filled({ summary: "あ".repeat(LIMITS.summary + 1) }));
    expect(long).toContain("summary_too_long");
    expect(firstInvalidStep(long)).toBe(3);
    expect(errorsOf(filled({ videoUrl: "http://example.com" }))).toContain("video_url_invalid");
    expect(errorsOf(filled({ videoUrl: "https://example.com/v" }))).toEqual([]);
  });

  it("마감이 지났으면 단계 오류는 없고 제출만 막혀요", () => {
    const errors = validateProposalDraft(toProposalDraft(filled()), "2026-10-01", TODAY);
    expect(errors).toEqual(["deadline_passed"]);
    expect(firstInvalidStep(errors)).toBeNull();
    expect(canLeaveStep(1, errors)).toBe(true);
  });
});
