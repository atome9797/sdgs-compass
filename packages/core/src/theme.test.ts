import { describe, expect, it } from "vitest";
import { COLORS, coverColors, PHONE_WIDTH, RADIUS, SPACE } from "./theme";
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

  it("표지 색: hue 하나로 두 색이 나오고 범위를 벗어나도 안전해요", () => {
    expect(coverColors(200)).toEqual({ from: "hsl(200, 72%, 52%)", to: "hsl(232, 68%, 38%)" });
    expect(coverColors(345).to).toBe("hsl(17, 68%, 38%)");
    expect(coverColors(-10).from).toBe("hsl(350, 72%, 52%)");
    expect(coverColors(725).from).toBe("hsl(5, 72%, 52%)");
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
