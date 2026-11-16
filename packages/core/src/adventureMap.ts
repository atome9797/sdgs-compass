// 홈의 「모험 지도」 바탕(#57) — 오른쪽 위 장식: 나침반(방위표) · 점선 항로 · 보물 표시(×) · 물결.
// 이 앱만의 픽셀 그림이에요(어떤 작품의 지도도 본뜨지 않았어요). 반투명 먹색이라 아래의 모눈이 비치고, 위에 놓인 글자를 가리지 않아요.
// 웹과 앱이 같은 그림(PNG)을 써요: 웹은 components/MapDecor(CSS 배경 · pixelated), 앱은 components/MapDecor(6배 PNG).
// 양피지 색 · 모눈의 색은 theme.ts 의 MAP_COLORS, 모눈 간격은 MAP_GRID 예요(웹 CSS · 앱의 선이 같은 간격).
import { PixelCanvas, type PixelImage } from "./pixels";
import { MAP_COLORS } from "./theme";

/** 모눈 한 칸의 크기(웹 px · 앱 dp) */
export const MAP_GRID = 24;

/** 장식 그림의 픽셀 수(w × h)와 보여 줄 배율(한 픽셀 = scale px) — 화면에서는 160 × 88 */
export const MAP_DECOR = { w: 80, h: 44, scale: 2 } as const;

/** 나침반의 가운데 · 고리의 반지름 · 큰 바늘(동서남북)의 길이 · 작은 바늘(대각선)의 길이 */
export const COMPASS = { x: 62, y: 18, ring: 12, point: 17, minor: 9 } as const;

/** 보물 표시(×, 6 × 5)의 왼쪽 위 */
export const TREASURE = { x: 4, y: 34 } as const;

/** #RRGGBB + 불투명도(0~1) → #RRGGBBAA */
function withAlpha(hex: string, a: number): string {
  return `${hex}${Math.round(a * 255).toString(16).padStart(2, "0").toUpperCase()}`;
}

/** 장식에 쓰는 색(모두 MAP_COLORS 의 ink · route 에 투명도만 다르게) */
export const DECOR_COLORS = {
  inkStrong: withAlpha(MAP_COLORS.ink, 0.5),
  ink: withAlpha(MAP_COLORS.ink, 0.3),
  inkSoft: withAlpha(MAP_COLORS.ink, 0.18),
  route: withAlpha(MAP_COLORS.route, 0.7),
  treasure: withAlpha(MAP_COLORS.route, 0.85),
} as const;

/** 물결 무늬(7 × 2) */
const WAVE = [".##..##", "#..##.."];
/** 나침반 위쪽의 「N」(4 × 5) */
const LETTER_N = ["#..#", "##.#", "#.##", "#..#", "#..#"];

function glyph(canvas: PixelCanvas, rows: readonly string[], x: number, y: number, hex: string): void {
  rows.forEach((row, j) => [...row].forEach((c, i) => c === "#" && canvas.set(x + i, y + j, hex)));
}

/** 나침반: 고리 두 겹 + 동서남북의 큰 바늘(한쪽은 진하게, 한쪽은 옅게 — 돌려도 같은 모양) + 대각선의 작은 바늘 */
function drawCompass(canvas: PixelCanvas): void {
  const { x: cx, y: cy, ring, point, minor } = COMPASS;
  for (let y = cy - ring - 1; y <= cy + ring + 1; y++) {
    for (let x = cx - ring - 1; x <= cx + ring + 1; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (Math.abs(d - ring) <= 0.5) canvas.set(x, y, DECOR_COLORS.inkSoft);
      else if (Math.abs(d - (ring - 4)) <= 0.5 && (x + y) % 2 === 0) canvas.set(x, y, DECOR_COLORS.inkSoft);
    }
  }
  // 대각선의 작은 바늘(먼저 그리고, 큰 바늘이 위에 겹쳐요)
  for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const) {
    for (let t = 1; t <= minor; t++) canvas.set(cx + sx * t, cy + sy * t, DECOR_COLORS.ink);
    for (let t = 1; t <= Math.floor(minor / 2); t++) canvas.set(cx + sx * t + sx, cy + sy * t, DECOR_COLORS.inkSoft);
  }
  // 큰 바늘: 방향(dx, dy)으로 뻗고, 옆(px, py = 방향을 90° 돌린 쪽)으로 폭이 줄어들어요
  for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]] as const) {
    const [px, py] = [-dy, dx];
    for (let t = 1; t <= point; t++) {
      const half = Math.round(3 * (1 - t / point));
      for (let s = -half; s <= half; s++) {
        canvas.set(cx + dx * t + px * s, cy + dy * t + py * s, s > 0 ? DECOR_COLORS.ink : DECOR_COLORS.inkStrong);
      }
    }
  }
  canvas.set(cx, cy, DECOR_COLORS.inkStrong);
  glyph(canvas, LETTER_N, cx + 4, cy - point - 1, DECOR_COLORS.inkStrong);
}

/** 점선 항로: 나침반의 왼쪽 아래에서 보물 표시까지 곡선(2칸 그리고 2칸 비우기) */
function drawRoute(canvas: PixelCanvas): void {
  const p0 = { x: COMPASS.x - 11, y: COMPASS.y + 11 };
  const p1 = { x: 32, y: 47 };
  const p2 = { x: TREASURE.x + 9, y: TREASURE.y + 2 };
  const points: Array<[number, number]> = [];
  for (let i = 0; i <= 400; i++) {
    const t = i / 400;
    const u = 1 - t;
    const x = Math.round(u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x);
    const y = Math.round(u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y);
    const last = points[points.length - 1];
    if (!last || last[0] !== x || last[1] !== y) points.push([x, y]);
  }
  points.forEach(([x, y], i) => {
    if (i % 4 < 2) canvas.set(x, y, DECOR_COLORS.route);
  });
}

/** 보물 표시(×): 두 칸 굵기의 엑스 */
function drawTreasure(canvas: PixelCanvas): void {
  for (let i = 0; i < 5; i++) {
    canvas.set(TREASURE.x + i, TREASURE.y + i, DECOR_COLORS.treasure);
    canvas.set(TREASURE.x + i + 1, TREASURE.y + i, DECOR_COLORS.treasure);
    canvas.set(TREASURE.x + 4 - i, TREASURE.y + i, DECOR_COLORS.treasure);
    canvas.set(TREASURE.x + 5 - i, TREASURE.y + i, DECOR_COLORS.treasure);
  }
}

/** 오른쪽 위 장식 그림(80 × 44, 바탕은 투명) — 늘 같은 그림이에요 */
export function mapDecor(): PixelImage {
  const canvas = new PixelCanvas(MAP_DECOR.w, MAP_DECOR.h);
  glyph(canvas, WAVE, 22, 9, DECOR_COLORS.inkSoft);
  glyph(canvas, WAVE, 30, 22, DECOR_COLORS.inkSoft);
  glyph(canvas, WAVE, 40, 3, DECOR_COLORS.inkSoft);
  drawRoute(canvas);
  drawTreasure(canvas);
  drawCompass(canvas);
  return canvas.image();
}
