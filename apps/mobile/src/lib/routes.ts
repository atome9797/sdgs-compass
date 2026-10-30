// 어느 화면 묶음을 열지 정하는 순수 함수들 (화면·내비게이션 코드와 따로 둬서 테스트하기 쉬워요).
// 흐름: 언어 선택(맨 처음) → 이용 유형(학생·개인 / 기업·단체) 선택 → 앱. 설정에서 언어·유형을 바꾸면 같은 규칙으로 다시 정해져요.
import type { Role } from "@sdgs-compass/core/domain";
import type { Locale } from "@sdgs-compass/core/i18n";

/** 지금 보여 줄 화면 묶음 */
export type Gate = "language" | "role" | "b2c" | "b2b";

/**
 * 저장된 언어·유형으로 화면 묶음을 정해요.
 * languageForced: "데모 초기화" 뒤처럼, 언어가 저장돼 있어도 언어 선택부터 다시 보여 줄 때
 */
export function gateFor(locale: Locale | null, role: Role | null, languageForced = false): Gate {
  if (locale === null || languageForced) return "language";
  if (role === null) return "role";
  return role;
}

/** 묶음마다 처음 열 경로 (typedRoutes 를 쓰지 않아서 글자로 적어요) */
export const GATE_HREF: Record<Gate, string> = {
  language: "/language",
  role: "/role",
  b2c: "/",
  b2b: "/b2b",
};

export function otherRole(role: Role): Role {
  return role === "b2c" ? "b2b" : "b2c";
}

/** 경로가 기업(B2B) 묶음인지 ("/b2b", "/b2b/talent" …) */
export function isB2bPath(pathname: string): boolean {
  return pathname === "/b2b" || pathname.startsWith("/b2b/");
}

/** 경로가 속한 화면 묶음 (학생·개인 화면은 나머지 전부) */
export function areaOfPath(pathname: string): Gate {
  if (pathname === "/language") return "language";
  if (pathname === "/role") return "role";
  return isB2bPath(pathname) ? "b2b" : "b2c";
}

/**
 * area 묶음 화면이 지금 gate 에서는 열리면 안 될 때(역할이 맞지 않을 때) 보낼 경로. 괜찮으면 null.
 * 예: 학생으로 바꿨는데 기업 화면이 남아 있으면 "/" 로.
 */
export function redirectFor(gate: Gate, area: Gate): string | null {
  return gate === area ? null : GATE_HREF[gate];
}

/** 경로로 판단하는 같은 규칙 */
export function redirectForPath(gate: Gate, pathname: string): string | null {
  return redirectFor(gate, areaOfPath(pathname));
}
