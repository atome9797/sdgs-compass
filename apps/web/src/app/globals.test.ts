import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { COLORS, FONT_SIZE, PHONE_WIDTH, RADIUS, SPACE } from "@sdgs-compass/core/theme";

// globals.css 의 :root 값이 core 의 theme.ts(웹·모바일 공용 디자인 토큰)와 같은지 확인해요.
function readCss(): string {
  for (const candidate of [path.join(process.cwd(), "src/app/globals.css"), path.join(process.cwd(), "apps/web/src/app/globals.css")]) {
    if (existsSync(candidate)) return readFileSync(candidate, "utf8");
  }
  throw new Error("globals.css 를 찾을 수 없어요");
}

/** ":root { ... }" 블록의 "--이름: 값;" 들 (주석 제외) */
function rootVars(css: string): Map<string, string> {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const block = /:root\s*\{([\s\S]*?)\n\}/.exec(withoutComments);
  if (!block) throw new Error(":root 블록이 없어요");
  const vars = new Map<string, string>();
  for (const m of block[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) vars.set(m[1], m[2].trim());
  return vars;
}

const kebab = (name: string) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const norm = (value: string) => value.replace(/\s+/g, "").toLowerCase();

describe("globals.css 와 theme.ts 의 토큰", () => {
  const css = readCss();
  const vars = rootVars(css);

  it("색 토큰이 같아요", () => {
    for (const [key, value] of Object.entries(COLORS)) {
      expect(vars.has(`--${kebab(key)}`)).toBe(true);
      expect(norm(vars.get(`--${kebab(key)}`) ?? "")).toBe(norm(value));
    }
  });

  it("모서리 둥글기·간격·글자 크기·휴대폰 폭이 같아요", () => {
    for (const [key, value] of Object.entries(RADIUS)) expect(vars.get(`--radius-${key}`)).toBe(`${value}px`);
    for (const [key, value] of Object.entries(SPACE)) expect(vars.get(`--space-${key}`)).toBe(`${value}px`);
    for (const [key, value] of Object.entries(FONT_SIZE)) expect(vars.get(`--fs-${key}`)).toBe(`${value}px`);
    expect(vars.get("--phone-width")).toBe(`${PHONE_WIDTH}px`);
  });

  it("누르는 곳의 최소 크기는 44px 이고, 키보드 포커스 표시가 있어요", () => {
    expect(vars.get("--tap")).toBe("44px");
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline:\s*3px solid var\(--primary\)/);
    for (const selector of [".btn--sm", ".chip", ".seg__btn", ".role-pill", ".tab"]) {
      const rule = new RegExp(`${selector.replace(".", "\\.")}\\s*\\{[^}]*min-height:\\s*(var\\(--tap\\)|[5-9]\\d+px)`).exec(css);
      expect(rule).not.toBeNull();
    }
  });

  it("Tailwind 같은 외부 CSS 를 끌어오지 않아요", () => {
    expect(css).not.toMatch(/@import|@tailwind|@apply/);
  });
});
