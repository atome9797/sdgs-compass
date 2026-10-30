import { describe, expect, it } from "vitest";
import { ALLOWED_EXTENSIONS, charCount, fileExtension, fileFingerprint, LIMITS, makeReceiptNo, validateProposalDraft, type ProposalDraft } from "./proposal";

const TODAY = "2026-10-30";
const CLOSES = "2026-11-12";

const valid = (overrides: Partial<ProposalDraft> = {}): ProposalDraft => ({
  teamName: "클린시사이드",
  title: "紙と海藻由来フィルムの二層包装",
  summary: "プラスチックを使わない二層構造の包装を提案します。",
  videoUrl: "",
  fileName: "plan.pdf",
  fileSizeBytes: 3_000_000,
  ...overrides,
});

describe("기획서 제출 검사", () => {
  it("올바른 입력이면 오류가 없어요", () => {
    expect(validateProposalDraft(valid(), CLOSES, TODAY)).toEqual([]);
  });

  it("마감일 당일까지는 낼 수 있고, 지나면 deadline_passed", () => {
    expect(validateProposalDraft(valid(), TODAY, TODAY)).toEqual([]);
    expect(validateProposalDraft(valid(), "2026-10-29", TODAY)).toEqual(["deadline_passed"]);
  });

  it("필수 항목", () => {
    expect(validateProposalDraft(valid({ teamName: "  " }), CLOSES, TODAY)).toEqual(["team_name_required"]);
    expect(validateProposalDraft(valid({ title: "" }), CLOSES, TODAY)).toEqual(["title_required"]);
    expect(validateProposalDraft(valid({ summary: "" }), CLOSES, TODAY)).toEqual(["summary_required"]);
    expect(validateProposalDraft(valid({ fileName: null, fileSizeBytes: 0 }), CLOSES, TODAY)).toEqual(["file_required"]);
    expect(validateProposalDraft(valid({ fileName: "   " }), CLOSES, TODAY)).toEqual(["file_required"]);
  });

  it("글자 수 제한 (이모지·한자도 1글자)", () => {
    expect(validateProposalDraft(valid({ teamName: "あ".repeat(LIMITS.teamName) }), CLOSES, TODAY)).toEqual([]);
    expect(validateProposalDraft(valid({ teamName: "あ".repeat(LIMITS.teamName + 1) }), CLOSES, TODAY)).toEqual(["team_name_too_long"]);
    expect(validateProposalDraft(valid({ title: "🌊".repeat(LIMITS.title) }), CLOSES, TODAY)).toEqual([]);
    expect(validateProposalDraft(valid({ title: "🌊".repeat(LIMITS.title + 1) }), CLOSES, TODAY)).toEqual(["title_too_long"]);
    expect(validateProposalDraft(valid({ summary: "海".repeat(LIMITS.summary) }), CLOSES, TODAY)).toEqual([]);
    expect(validateProposalDraft(valid({ summary: "海".repeat(LIMITS.summary + 1) }), CLOSES, TODAY)).toEqual(["summary_too_long"]);
    expect(charCount("  🌊a  ")).toBe(2);
  });

  it("파일 형식은 PDF·PPTX 만, 크기는 50MB 까지", () => {
    expect(ALLOWED_EXTENSIONS).toEqual(["pdf", "pptx"]);
    expect(validateProposalDraft(valid({ fileName: "PLAN.PDF" }), CLOSES, TODAY)).toEqual([]);
    expect(validateProposalDraft(valid({ fileName: "deck.pptx" }), CLOSES, TODAY)).toEqual([]);
    expect(validateProposalDraft(valid({ fileName: "plan.docx" }), CLOSES, TODAY)).toEqual(["file_type"]);
    expect(validateProposalDraft(valid({ fileName: "plan" }), CLOSES, TODAY)).toEqual(["file_type"]);
    expect(validateProposalDraft(valid({ fileSizeBytes: LIMITS.fileBytes }), CLOSES, TODAY)).toEqual([]);
    expect(validateProposalDraft(valid({ fileSizeBytes: LIMITS.fileBytes + 1 }), CLOSES, TODAY)).toEqual(["file_too_large"]);
    expect(fileExtension("a.b.PPTX")).toBe("pptx");
  });

  it("영상 URL 은 비어 있거나 https 주소", () => {
    expect(validateProposalDraft(valid({ videoUrl: "https://youtu.be/abc123" }), CLOSES, TODAY)).toEqual([]);
    expect(validateProposalDraft(valid({ videoUrl: "  " }), CLOSES, TODAY)).toEqual([]);
    for (const bad of ["http://example.com/v", "https://localhost", "ftp://x.com", "youtu.be/abc", "https://exa mple.com"]) {
      expect(validateProposalDraft(valid({ videoUrl: bad }), CLOSES, TODAY), bad).toEqual(["video_url_invalid"]);
    }
  });

  it("여러 오류는 화면의 입력 순서대로 알려줘요", () => {
    const errors = validateProposalDraft(valid({ teamName: "", title: "", summary: "", fileName: null }), "2026-10-01", TODAY);
    expect(errors).toEqual(["deadline_passed", "team_name_required", "file_required", "title_required", "summary_required"]);
  });
});

describe("수령증·파일 지문", () => {
  it("수령증 번호 형식 SC-YYYYMMDD-NNNN", () => {
    expect(makeReceiptNo("2026-11-14T10:00", 7)).toBe("SC-20261114-0007");
    expect(makeReceiptNo("2026-11-14", 12345)).toBe("SC-20261114-12345");
  });

  it("파일 지문은 64자리 16진수이고, 내용이나 버전이 다르면 달라요", () => {
    const a = fileFingerprint(valid(), 1);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(fileFingerprint(valid(), 1)).toBe(a);
    expect(fileFingerprint(valid(), 2)).not.toBe(a);
    expect(fileFingerprint(valid({ title: "다른 제목" }), 1)).not.toBe(a);
    expect(fileFingerprint(valid({ title: "  " + valid().title + "  " }), 1)).toBe(a);
  });
});
