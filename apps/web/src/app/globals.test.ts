import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CHART_COLORS, COLORS, FONT_SIZE, MARK_COLORS, PHONE_WIDTH, RADIUS, SPACE } from "@sdgs-compass/core/theme";

// globals.css 의 :root 값이 core 의 theme.ts(웹·모바일 공용 디자인 토큰)와 같은지 확인해요.
function readCss(file = "globals.css"): string {
  for (const candidate of [path.join(process.cwd(), "src/app", file), path.join(process.cwd(), "apps/web/src/app", file)]) {
    if (existsSync(candidate)) return readFileSync(candidate, "utf8");
  }
  throw new Error(`${file} 를 찾을 수 없어요`);
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

  it("SDGs 실천 마크의 별 색(--mark-star · --mark-star-soft)이 core 의 MARK_COLORS 와 같아요 (#35)", () => {
    expect(norm(vars.get("--mark-star") ?? "")).toBe(norm(MARK_COLORS.star));
    expect(norm(vars.get("--mark-star-soft") ?? "")).toBe(norm(MARK_COLORS.starSoft));
  });

  it("마크 단추(.cmark)는 누르는 곳 44px · 인쇄해도 별 색이 남아요 (#35)", () => {
    expect(css).toMatch(/\.cmark\s*\{[^}]*min-height:\s*var\(--tap\)/);
    expect(css).toMatch(/@media print\s*\{[\s\S]*\.stars[^{]*\{[^}]*print-color-adjust:\s*exact/);
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

  it("운영자 화면 그래프 색(--adm-c1~c4)이 core 의 CHART_COLORS 와 같은 순서·값이에요", () => {
    const admin = readCss("admin.css").replace(/\/\*[\s\S]*?\*\//g, "");
    CHART_COLORS.forEach((hex, i) => {
      const m = new RegExp(`--adm-c${i + 1}:\\s*([^;]+);`).exec(admin);
      expect(norm(m?.[1] ?? "")).toBe(norm(hex));
    });
  });

  it("예전 색(쨍한 파랑·분홍)이 남아 있지 않아요", () => {
    for (const file of ["globals.css", "admin.css"]) {
      const text = readCss(file).toLowerCase();
      for (const old of ["#1d6fb8", "#154e84", "#d9468a", "29, 111, 184", "#0f3f6c", "#a62c69", "#fce7f1"]) expect(text.includes(old), `${file}: ${old}`).toBe(false);
    }
  });
});
