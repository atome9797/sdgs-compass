// 검색 화면으로 넘기는 경로 매개변수(질의·SDGs·다시 열기용 nonce)와 읽기.
import { parseSearchParams, searchParamsOf } from "../searchParams";

test("넘길 값: 빈 값은 빼고, 질의는 앞뒤 공백을 지워요", () => {
  expect(searchParamsOf({}, "7")).toEqual({ n: "7" });
  expect(searchParamsOf({ query: "   " }, "7")).toEqual({ n: "7" });
  expect(searchParamsOf({ query: "  플라스틱 ", sdgIds: [14, 12] }, "7")).toEqual({ n: "7", q: "플라스틱", sdg: "14,12" });
  expect(searchParamsOf({ sdgIds: [] }, "1")).toEqual({ n: "1" });
});

test("읽기: 모르는 SDGs 번호와 중복은 버려요", () => {
  expect(parseSearchParams({ q: "a", sdg: "14,12,14,99,abc,0,17", n: "3" })).toEqual({ query: "a", sdgIds: [14, 12, 17], nonce: "3" });
});

test("읽기: 배열이면 첫 값, 없으면 빈 값", () => {
  expect(parseSearchParams({ q: ["x", "y"], sdg: ["5"], n: ["9"] })).toEqual({ query: "x", sdgIds: [5], nonce: "9" });
  expect(parseSearchParams({})).toEqual({ query: "", sdgIds: [], nonce: "" });
  expect(parseSearchParams({ q: undefined, sdg: undefined })).toEqual({ query: "", sdgIds: [], nonce: "" });
});

test("만든 값을 다시 읽으면 같은 요청", () => {
  const params = searchParamsOf({ query: "해양", sdgIds: [14, 12] }, "5");
  expect(parseSearchParams(params)).toEqual({ query: "해양", sdgIds: [14, 12], nonce: "5" });
});
