// 기획서 제출 4단계(팀 → 파일 → 제목·요약 → 확인): 단계 이동, 단계별 오류, core 검사와 맞물리는지.
import { MESSAGES } from "@sdgs-compass/core/messages";
import { LIMITS, validateProposalDraft } from "@sdgs-compass/core/proposal";
import {
  canAdvance,
  emptyProposalFields,
  errorsForStep,
  firstInvalidStep,
  nextStep,
  prefilledFields,
  previousStep,
  PROPOSAL_ERROR_KEY,
  STEP_LABEL_KEY,
  stepIndex,
  SUBMIT_STEPS,
  toProposalDraft,
} from "../proposalForm";
import { SAMPLE_FILES, findSampleFile } from "../sampleFiles";

const OPEN = { closesOn: "2026-11-11", today: "2026-10-30" };

function sample(id: string) {
  const file = findSampleFile(id);
  if (!file) throw new Error(`no sample ${id}`);
  return file;
}

test("단계 순서와 이동 (양 끝에서는 멈춰요)", () => {
  expect(SUBMIT_STEPS).toEqual(["team", "file", "summary", "confirm"]);
  expect(SUBMIT_STEPS.map(stepIndex)).toEqual([0, 1, 2, 3]);
  expect(nextStep("team")).toBe("file");
  expect(nextStep("summary")).toBe("confirm");
  expect(nextStep("confirm")).toBe("confirm");
  expect(previousStep("confirm")).toBe("summary");
  expect(previousStep("team")).toBe("team");
});

test("단계 이름과 오류마다 문구가 있어요", () => {
  const keys = Object.keys(MESSAGES);
  for (const key of [...Object.values(STEP_LABEL_KEY), ...Object.values(PROPOSAL_ERROR_KEY)]) expect(keys).toContain(key);
  expect(Object.keys(PROPOSAL_ERROR_KEY)).toHaveLength(11);
});

test("비어 있는 입력: 오류가 단계마다 나뉘어 보이고, 가장 앞 단계부터 안내해요", () => {
  const errors = validateProposalDraft(toProposalDraft(emptyProposalFields()), OPEN.closesOn, OPEN.today);
  expect(errors).toEqual(["team_name_required", "file_required", "title_required", "summary_required"]);
  expect(errorsForStep("team", errors)).toEqual(["team_name_required"]);
  expect(errorsForStep("file", errors)).toEqual(["file_required"]);
  expect(errorsForStep("summary", errors)).toEqual(["title_required", "summary_required"]);
  expect(errorsForStep("confirm", errors)).toEqual(errors);
  expect(canAdvance("team", errors)).toBe(false);
  expect(firstInvalidStep(errors)).toBe("team");
});

test("앞 단계를 채우면 다음 오류 단계로 넘어가요", () => {
  const fields = { ...emptyProposalFields(), teamName: "Mina" };
  const errors = validateProposalDraft(toProposalDraft(fields), OPEN.closesOn, OPEN.today);
  expect(canAdvance("team", errors)).toBe(true);
  expect(firstInvalidStep(errors)).toBe("file");
});

test("형식이 틀린 파일(docx)과 너무 큰 파일은 파일 단계 오류", () => {
  const base = { ...emptyProposalFields(), teamName: "Mina", title: "제목", summary: "요약" };
  const wrongType = validateProposalDraft(toProposalDraft({ ...base, file: sample("memo-docx") }), OPEN.closesOn, OPEN.today);
  expect(wrongType).toEqual(["file_type"]);
  expect(firstInvalidStep(wrongType)).toBe("file");
  const tooLarge = validateProposalDraft(toProposalDraft({ ...base, file: { id: "big", fileName: "big.pdf", sizeBytes: LIMITS.fileBytes + 1 } }), OPEN.closesOn, OPEN.today);
  expect(tooLarge).toEqual(["file_too_large"]);
});

test("견본 파일(PDF)과 동영상 주소 오류", () => {
  const ok = { ...emptyProposalFields(), teamName: "Mina", title: "제목", summary: "요약", file: sample("plan-pdf") };
  expect(validateProposalDraft(toProposalDraft(ok), OPEN.closesOn, OPEN.today)).toEqual([]);
  const badVideo = validateProposalDraft(toProposalDraft({ ...ok, videoUrl: "not a url" }), OPEN.closesOn, OPEN.today);
  expect(badVideo).toEqual(["video_url_invalid"]);
  expect(firstInvalidStep(badVideo)).toBe("summary");
  expect(validateProposalDraft(toProposalDraft({ ...ok, videoUrl: "https://example.com/pitch" }), OPEN.closesOn, OPEN.today)).toEqual([]);
  expect(firstInvalidStep([])).toBeNull();
});

test("마감이 지났으면 어느 칸의 문제도 아니라서 확인 단계에서 알려줘요", () => {
  const ok = { ...emptyProposalFields(), teamName: "Mina", title: "제목", summary: "요약", file: sample("plan-pdf") };
  const errors = validateProposalDraft(toProposalDraft(ok), "2026-10-01", OPEN.today);
  expect(errors).toEqual(["deadline_passed"]);
  expect(firstInvalidStep(errors)).toBe("confirm");
  expect(canAdvance("team", errors)).toBe(true);
});

test("core 에 넘기는 값: 파일이 없으면 이름 null·크기 0", () => {
  expect(toProposalDraft(emptyProposalFields())).toEqual({ teamName: "", title: "", summary: "", videoUrl: "", fileName: null, fileSizeBytes: 0 });
  const withFile = toProposalDraft({ ...emptyProposalFields(), file: SAMPLE_FILES[0] });
  expect(withFile.fileName).toBe(SAMPLE_FILES[0].fileName);
  expect(withFile.fileSizeBytes).toBe(SAMPLE_FILES[0].sizeBytes);
});

test("다시 제출할 때는 지난 입력을 채우되 파일은 새로 골라요", () => {
  expect(prefilledFields(undefined)).toEqual(emptyProposalFields());
  const filled = prefilledFields({ teamName: "Mina", title: "t", summary: "s", videoUrl: "https://example.com" });
  expect(filled).toEqual({ teamName: "Mina", title: "t", summary: "s", videoUrl: "https://example.com", file: null });
});
