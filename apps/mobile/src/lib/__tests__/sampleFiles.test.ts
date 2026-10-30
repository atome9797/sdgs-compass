// 견본 파일 3개: PDF·PPTX 는 제출 가능, 마지막 docx 는 일부러 형식 오류.
import { draftFile, findSampleFile, isSubmittable, SAMPLE_FILES } from "../sampleFiles";

test("견본 파일 세 개", () => {
  expect(SAMPLE_FILES.map((file) => file.id)).toEqual(["plan-pdf", "deck-pptx", "memo-docx"]);
  expect(new Set(SAMPLE_FILES.map((file) => file.fileName)).size).toBe(3);
});

test("제출 가능한 형식·크기인지", () => {
  expect(SAMPLE_FILES.map(isSubmittable)).toEqual([true, true, false]);
  expect(isSubmittable({ id: "x", fileName: "BIG.PDF", sizeBytes: 50 * 1024 * 1024 })).toBe(true);
  expect(isSubmittable({ id: "x", fileName: "big.pdf", sizeBytes: 50 * 1024 * 1024 + 1 })).toBe(false);
});

test("id 로 찾고, 제출 입력용 파일 부분으로 바꿔요", () => {
  expect(findSampleFile("deck-pptx")?.fileName).toBe("SDGs_pitch_deck.pptx");
  expect(findSampleFile("nope")).toBeUndefined();
  expect(draftFile(SAMPLE_FILES[0])).toEqual({ fileName: SAMPLE_FILES[0].fileName, fileSizeBytes: SAMPLE_FILES[0].sizeBytes });
});
