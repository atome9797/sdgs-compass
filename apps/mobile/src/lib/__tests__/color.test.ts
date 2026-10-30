// "#RRGGBB" 에 투명도를 붙이는 도우미.
import { tint } from "../color";

test("투명도를 두 자리 16진수로 붙여요", () => {
  expect(tint("#1D6FB8", 1, "x")).toBe("#1D6FB8ff");
  expect(tint("#1D6FB8", 0, "x")).toBe("#1D6FB800");
  expect(tint("#1D6FB8", 0.5, "x")).toBe("#1D6FB880");
});

test("범위를 벗어나거나 숫자가 아닌 투명도는 0~1 로 맞춰요", () => {
  expect(tint("#1D6FB8", 2, "x")).toBe("#1D6FB8ff");
  expect(tint("#1D6FB8", -1, "x")).toBe("#1D6FB800");
  expect(tint("#1D6FB8", Number.NaN, "x")).toBe("#1D6FB800");
});

test("모양이 맞지 않는 색은 대체 값을 그대로 돌려줘요", () => {
  expect(tint("#fff", 0.5, "fallback")).toBe("fallback");
  expect(tint("red", 0.5, "fallback")).toBe("fallback");
  expect(tint("#1D6FB8ff", 0.5, "fallback")).toBe("fallback");
});
