// 레이더 차트(F-104 Impact Index) 좌표 계산. 웹은 SVG polygon, 모바일은 (SVG 없이) 회전한 선 모양 View 로 같은 좌표를 그려요.
export interface Point {
  x: number;
  y: number;
}

/** n 개의 축 중 index 번째 꼭짓점. 0번은 맨 위, 시계 방향. fraction(0~1)은 반지름에 대한 비율 */
export function radarVertex(index: number, count: number, radius: number, cx: number, cy: number, fraction = 1): Point {
  const angle = -Math.PI / 2 + (2 * Math.PI * index) / count;
  return { x: cx + Math.cos(angle) * radius * fraction, y: cy + Math.sin(angle) * radius * fraction };
}

/** 값(0~max) 목록을 레이더 다각형의 꼭짓점들로 */
export function radarPolygon(values: readonly number[], max: number, radius: number, cx: number, cy: number): Point[] {
  return values.map((value, index) => radarVertex(index, values.length, radius, cx, cy, Math.min(1, Math.max(0, value / max))));
}

/** 격자 한 겹(전체 반지름의 fraction 배) */
export function radarRing(count: number, fraction: number, radius: number, cx: number, cy: number): Point[] {
  return Array.from({ length: count }, (_, i) => radarVertex(i, count, radius, cx, cy, fraction));
}

/** SVG polygon 의 points 속성: "x,y x,y ..." (소수 둘째 자리까지) */
export function pointsAttr(points: readonly Point[]): string {
  return points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
}

export interface Segment {
  /** 선분의 가운데 */
  cx: number;
  cy: number;
  length: number;
  /** 가로 방향 기준 회전각(도) — View 의 transform: [{ rotate: `${angleDeg}deg` }] 에 그대로 써요 */
  angleDeg: number;
}

/** 꼭짓점들을 이은 선분들 (닫힌 도형이면 마지막 점과 처음 점도 이어요) */
export function segmentsOf(points: readonly Point[], closed = true): Segment[] {
  const segments: Segment[] = [];
  const last = closed ? points.length : points.length - 1;
  for (let i = 0; i < last; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    segments.push({
      cx: (a.x + b.x) / 2,
      cy: (a.y + b.y) / 2,
      length: Math.hypot(b.x - a.x, b.y - a.y),
      angleDeg: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
    });
  }
  return segments;
}
