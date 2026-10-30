// 숫자 입력칸 도우미.
import { clampInt, digitsOnly, parseCount } from "../forms";

test("숫자만 남겨요 (기호·글자·공백은 버림)", () => {
  expect(digitsOnly("¥1,200")).toBe("1200");
  expect(digitsOnly("ab80000x")).toBe("80000");
  expect(digitsOnly(" 1 2 3 ")).toBe("123");
  expect(digitsOnly("")).toBe("");
  expect(digitsOnly("円")).toBe("");
});

test("자릿수 제한: 기본 10자리, 지정하면 그만큼", () => {
  expect(digitsOnly("12345678901234")).toBe("1234567890");
  expect(digitsOnly("12345", 3)).toBe("123");
});

test("숫자 글자 → 정수 (비어 있거나 숫자가 없으면 0)", () => {
  expect(parseCount("")).toBe(0);
  expect(parseCount("abc")).toBe(0);
  expect(parseCount("000150")).toBe(150);
  expect(parseCount("1,200円")).toBe(1200);
});

test("범위 안으로 맞춰요 (반올림 후)", () => {
  expect(clampInt(3, 1, 5)).toBe(3);
  expect(clampInt(0, 1, 5)).toBe(1);
  expect(clampInt(9, 1, 5)).toBe(5);
  expect(clampInt(2.6, 1, 5)).toBe(3);
  expect(clampInt(-4, 1, 5)).toBe(1);
});
