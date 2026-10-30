// 화면 묶음(언어 선택 → 유형 선택 → 학생/기업)과 경로 가드 규칙.
import { areaOfPath, GATE_HREF, gateFor, isB2bPath, otherRole, redirectFor, redirectForPath } from "../routes";

test("저장된 언어·유형으로 보여 줄 화면 묶음을 정해요", () => {
  expect(gateFor(null, null)).toBe("language");
  expect(gateFor(null, "b2c")).toBe("language");
  expect(gateFor("ja", null)).toBe("role");
  expect(gateFor("ko", null)).toBe("role");
  expect(gateFor("ja", "b2c")).toBe("b2c");
  expect(gateFor("ko", "b2b")).toBe("b2b");
});

test("데모 초기화 직후(languageForced)에는 언어가 저장돼 있어도 언어 선택부터", () => {
  expect(gateFor("ko", "b2b", true)).toBe("language");
  expect(gateFor("ja", null, true)).toBe("language");
  expect(gateFor("ja", "b2c", false)).toBe("b2c");
});

test("묶음마다 처음 열 경로", () => {
  expect(GATE_HREF).toEqual({ language: "/language", role: "/role", b2c: "/", b2b: "/b2b" });
});

test("유형 바꾸기", () => {
  expect(otherRole("b2c")).toBe("b2b");
  expect(otherRole("b2b")).toBe("b2c");
});

test("기업(B2B) 경로 판별: /b2b 와 /b2b/… 만 (이름이 비슷한 경로는 아님)", () => {
  expect(isB2bPath("/b2b")).toBe(true);
  expect(isB2bPath("/b2b/talent")).toBe(true);
  expect(isB2bPath("/b2b/applicants?id=ch-1")).toBe(true);
  expect(isB2bPath("/b2bx")).toBe(false);
  expect(isB2bPath("/")).toBe(false);
  expect(isB2bPath("/challenge/b2b")).toBe(false);
});

test("경로가 속한 화면 묶음", () => {
  expect(areaOfPath("/language")).toBe("language");
  expect(areaOfPath("/role")).toBe("role");
  expect(areaOfPath("/b2b/new")).toBe("b2b");
  expect(areaOfPath("/")).toBe("b2c");
  expect(areaOfPath("/impact")).toBe("b2c");
  expect(areaOfPath("/challenge/ch-plastic")).toBe("b2c");
});

test("역할이 맞지 않는 화면은 그 역할의 첫 화면으로 보내요", () => {
  expect(redirectFor("b2c", "b2c")).toBeNull();
  expect(redirectFor("b2b", "b2b")).toBeNull();
  expect(redirectFor("b2c", "b2b")).toBe("/");
  expect(redirectFor("b2b", "b2c")).toBe("/b2b");
  expect(redirectFor("language", "b2c")).toBe("/language");
  expect(redirectFor("role", "b2b")).toBe("/role");
});

test("경로로 판단하는 같은 규칙", () => {
  expect(redirectForPath("b2c", "/b2b/esg")).toBe("/");
  expect(redirectForPath("b2b", "/impact")).toBe("/b2b");
  expect(redirectForPath("b2b", "/b2b/talent")).toBeNull();
  expect(redirectForPath("b2c", "/certificate/SC-C-0001")).toBeNull();
});
