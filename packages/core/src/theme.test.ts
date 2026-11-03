import { describe, expect, it } from "vitest";
import { CHART_COLORS, COLORS, coverColors, ESG_COLORS, PHONE_WIDTH, RADIUS, SDG_TILE_TINT, SPACE, tint } from "./theme";
import { SDGS } from "./sdg";
import { pointsAttr, radarPolygon, radarRing, radarVertex, segmentsOf } from "./radar";

function luminance(hex: string): number {
  const channel = (start: number) => {
    const v = parseInt(hex.slice(start, start + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe("디자인 토큰", () => {
  it("색은 모두 #RRGGBB (또는 rgba)이에요", () => {
    for (const [name, value] of Object.entries(COLORS)) expect(value, name).toMatch(/^(#[0-9A-Fa-f]{6}|rgba\(.+\))$/);
  });

  it("읽기 쉬운 대비(WCAG AA 4.5:1)를 지켜요", () => {
    expect(contrast(COLORS.text, COLORS.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(COLORS.text, COLORS.card)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(COLORS.textMuted, COLORS.card)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(COLORS.onPrimary, COLORS.primary)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(COLORS.primary, COLORS.card)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(COLORS.success, COLORS.successSoft)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(COLORS.danger, COLORS.dangerSoft)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(COLORS.warning, COLORS.warningSoft)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(COLORS.primaryDark, COLORS.primarySoft)).toBeGreaterThanOrEqual(4.5);
  });

  it("간격·둥글기는 작은 것부터 커져요", () => {
    const sorted = (o: Record<string, number>) => Object.values(o).every((v, i, a) => i === 0 || v > a[i - 1]);
    expect(sorted(SPACE)).toBe(true);
    expect(sorted(RADIUS)).toBe(true);
    expect(PHONE_WIDTH).toBe(430);
  });

  it("표지 색: hue 하나로 두 색이 나오고 범위를 벗어나도 안전해요 (채도는 차분하게 30% 안팎)", () => {
    expect(coverColors(200)).toEqual({ from: "hsl(200, 30%, 47%)", to: "hsl(224, 28%, 33%)" });
    expect(coverColors(345).to).toBe("hsl(9, 28%, 33%)");
    expect(coverColors(-10).from).toBe("hsl(350, 30%, 47%)");
    expect(coverColors(725).from).toBe("hsl(5, 30%, 47%)");
  });

  it("tint: 흰색과 섞은 옅은 색(#RRGGBB)을 만들고, 이상한 값에도 안전해요", () => {
    expect(tint("#2F5E50", 1)).toBe("#2F5E50");
    expect(tint("#2F5E50", 0)).toBe("#FFFFFF");
    expect(tint("#000000", 0.5)).toBe("#808080");
    expect(tint("#0a97d9", 0.16)).toBe("#D8EEF9");
    expect(tint("#2F5E50", 2)).toBe("#2F5E50");
    expect(tint("#2F5E50", -1)).toBe("#FFFFFF");
    expect(tint("#2F5E50", Number.NaN)).toBe("#FFFFFF");
    expect(tint("hsl(200, 30%, 47%)", 0.5)).toBe("hsl(200, 30%, 47%)");
    // SDG 타일 바탕(16%) 위의 본문 글자는 어느 목표 색이든 4.5:1 이상
    for (const hex of ["#FCC30B", "#E5243B", "#19486A", "#56C02B"]) expect(contrast(COLORS.text, tint(hex, 0.16))).toBeGreaterThanOrEqual(4.5);
  });

  it("홈 SDG 타일(#29): 17색 모두 바탕 위 숫자·이름(본문)과 목표 번호(textMuted), 0건 타일의 더 옅은 바탕 위 흐린 글자가 4.5:1 이상", () => {
    expect(SDG_TILE_TINT.zero).toBeLessThan(SDG_TILE_TINT.base);
    expect(SDG_TILE_TINT.zeroBar).toBeLessThan(1);
    for (const sdg of SDGS) {
      const base = tint(sdg.color, SDG_TILE_TINT.base);
      const zero = tint(sdg.color, SDG_TILE_TINT.zero);
      expect([sdg.id, contrast(COLORS.text, base) >= 4.5, contrast(COLORS.textMuted, base) >= 4.5, contrast(COLORS.textMuted, zero) >= 4.5]).toEqual([sdg.id, true, true, true]);
    }
  });

  it("그래프 색: 차분한 4색이 서로 다르고, ESG 막대는 그중에서 골라 흰 카드와 3:1 이상이에요", () => {
    expect(CHART_COLORS).toHaveLength(4);
    for (const hex of CHART_COLORS) expect(hex).toMatch(/^#[0-9A-F]{6}$/);
    expect(new Set(CHART_COLORS).size).toBe(4);
    expect(Object.keys(ESG_COLORS)).toEqual(["E", "S", "G"]);
    for (const hex of Object.values(ESG_COLORS)) {
      expect(CHART_COLORS).toContain(hex);
      expect(contrast(hex, COLORS.card)).toBeGreaterThanOrEqual(3);
    }
    // 메인 색(초록)과 사회(S) 막대가 헷갈리지 않게 — 예전엔 S 가 메인 색이었어요
    expect(ESG_COLORS.S).not.toBe(COLORS.primary);
  });
});

describe("레이더 차트 좌표", () => {
  const near = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(1e-9);

  it("0번 축은 위쪽, 시계 방향으로 돌아요", () => {
    const [top, right, bottom, left] = [0, 1, 2, 3].map((i) => radarVertex(i, 4, 100, 150, 150));
    near(top.x, 150); near(top.y, 50);
    near(right.x, 250); near(right.y, 150);
    near(bottom.x, 150); near(bottom.y, 250);
    near(left.x, 50); near(left.y, 150);
  });

  it("값에 비례해서 안쪽으로 들어와요 (0~max 밖은 잘라요)", () => {
    const [a, b, c] = radarPolygon([100, 50, 250], 100, 80, 0, 0);
    near(a.y, -80);
    near(Math.hypot(b.x, b.y), 40);
    near(Math.hypot(c.x, c.y), 80);
    near(radarPolygon([-5], 100, 80, 0, 0)[0].y, 0);
  });

  it("격자와 SVG points", () => {
    const ring = radarRing(17, 0.5, 100, 0, 0);
    expect(ring).toHaveLength(17);
    for (const p of ring) near(Math.hypot(p.x, p.y), 50);
    expect(pointsAttr([{ x: 1, y: 2.345 }, { x: 3.1, y: 4 }])).toBe("1.00,2.35 3.10,4.00");
  });

  it("선분: 정사각형 네 변 (닫힘 여부)", () => {
    const square = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
    const closed = segmentsOf(square);
    expect(closed).toHaveLength(4);
    for (const s of closed) near(s.length, 10);
    expect(closed.map((s) => Math.round(s.angleDeg))).toEqual([0, 90, 180, -90]);
    near(closed[0].cx, 5); near(closed[0].cy, 0);
    expect(segmentsOf(square, false)).toHaveLength(3);
    expect(segmentsOf([{ x: 0, y: 0 }])).toHaveLength(1);
  });
});
