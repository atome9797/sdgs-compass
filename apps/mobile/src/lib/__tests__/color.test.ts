// "#RRGGBB" 에 투명도를 붙이는 도우미.
import { tint } from "../color";

test("투명도를 두 자리 16진수로 붙여요", () => {
  expect(tint("#2F5E50", 1, "x")).toBe("#2F5E50ff");
  expect(tint("#2F5E50", 0, "x")).toBe("#2F5E5000");
  expect(tint("#2F5E50", 0.5, "x")).toBe("#2F5E5080");
});

test("범위를 벗어나거나 숫자가 아닌 투명도는 0~1 로 맞춰요", () => {
  expect(tint("#2F5E50", 2, "x")).toBe("#2F5E50ff");
  expect(tint("#2F5E50", -1, "x")).toBe("#2F5E5000");
  expect(tint("#2F5E50", Number.NaN, "x")).toBe("#2F5E5000");
});

test("모양이 맞지 않는 색은 대체 값을 그대로 돌려줘요", () => {
  expect(tint("#fff", 0.5, "fallback")).toBe("fallback");
  expect(tint("red", 0.5, "fallback")).toBe("fallback");
  expect(tint("#2F5E50ff", 0.5, "fallback")).toBe("fallback");
});
