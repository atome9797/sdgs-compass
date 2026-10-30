// 운영자 화면 그래프의 계산 부분(눈금·좌표·경로·배치). 그리는 일은 components/charts/ 가 하고, 여기는 브라우저 없이 시험해요.
// 그래프는 SVG 를 직접 그려요(새 라이브러리 없이). 규칙은 dataviz 스킬을 따라요: 선 2px, 막대 ≤24px·데이터 쪽 끝만 4px 둥글게, 격자는 가는 실선.

/** 읽기 좋은 눈금 */
export interface NiceScale {
  min: number;
  max: number;
  step: number;
  ticks: number[];
}

/** 부동소수점 찌꺼기(0.30000000000000004)를 걷어내요 */
const clean = (n: number): number => Number(n.toPrecision(12));

/**
 * 값의 범위(minValue~maxValue)를 덮는 눈금: 간격은 1·2·5 × 10^n 중에서 골라요.
 * target 은 눈금 개수의 목표(대략), integer 면 간격이 1 보다 작아지지 않아요(건수 같은 정수 축).
 */
export function niceScale(minValue: number, maxValue: number, target = 5, integer = false): NiceScale {
  let min = Math.min(minValue, maxValue);
  let max = Math.max(minValue, maxValue);
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    min = 0;
    max = 1;
  }
  if (min === max) {
    // 값이 하나뿐이면 위아래로 조금 벌려요 (0 이면 0~1)
    if (min === 0) max = 1;
    else {
      const pad = Math.abs(min) * 0.1;
      min -= pad;
      max += pad;
    }
  }
  const rough = (max - min) / Math.max(1, target - 1);
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const fraction = rough / pow;
  // 어림 간격에 가장 가까운 1·2·5·10 (올림이 아니라 반올림이라 눈금이 너무 성기지 않아요)
  let step = (fraction < 1.5 ? 1 : fraction < 3 ? 2 : fraction < 7 ? 5 : 10) * pow;
  if (integer && step < 1) step = 1;
  step = clean(step);
  const niceMin = clean(Math.floor(min / step + 1e-9) * step);
  const niceMax = clean(Math.ceil(max / step - 1e-9) * step);
  const ticks: number[] = [];
  for (let i = 0; ; i++) {
    const value = clean(niceMin + i * step);
    if (value > niceMax + step / 2 || i > 100) break;
    ticks.push(value);
  }
  return { min: niceMin, max: niceMax, step, ticks };
}

/** 값 → 화면 좌표로 바꾸는 함수 (domain 의 두 값이 같으면 range 의 가운데) */
export function scaleLinear(domain: readonly [number, number], range: readonly [number, number]): (value: number) => number {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  if (d0 === d1) return () => (r0 + r1) / 2;
  return (value) => r0 + ((value - d0) / (d1 - d0)) * (r1 - r0);
}

/** 계열들의 값 범위 (null 은 건너뛰어요). 값이 하나도 없으면 null. includeZero 면 0 을 꼭 포함해요 */
export function seriesExtent(series: readonly { values: readonly (number | null)[] }[], includeZero = false): [number, number] | null {
  let min = Infinity;
  let max = -Infinity;
  for (const s of series) {
    for (const v of s.values) {
      if (v === null || !Number.isFinite(v)) continue;
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  if (min === Infinity) return null;
  if (includeZero) {
    min = Math.min(min, 0);
    max = Math.max(max, 0);
  }
  return [min, max];
}

/** 눈금 이름을 붙일 위치: count 개 중 최대 maxLabels 개를, 항상 마지막(가장 최근)을 포함하도록 끝에서부터 같은 간격으로 */
export function pickTickIndices(count: number, maxLabels: number): number[] {
  if (count <= 0) return [];
  const limit = Math.max(1, Math.floor(maxLabels));
  const step = Math.max(1, Math.ceil(count / limit));
  const indices: number[] = [];
  for (let i = count - 1; i >= 0; i -= step) indices.push(i);
  return indices.reverse();
}

/** positions(오름차순) 가운데 x 에 가장 가까운 위치의 번호 (비어 있으면 -1) */
export function nearestIndex(positions: readonly number[], x: number): number {
  let best = -1;
  let bestDistance = Infinity;
  positions.forEach((position, index) => {
    const distance = Math.abs(position - x);
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });
  return best;
}

export interface Point {
  x: number;
  y: number;
}

const fixed = (n: number): string => String(Number(n.toFixed(1)));

/** 꺾은선 경로. null(빠진 값)을 만나면 선을 끊고 다음 점에서 새로 시작해요 */
export function linePath(points: readonly (Point | null)[]): string {
  let path = "";
  let pen = false;
  for (const point of points) {
    if (point === null) {
      pen = false;
      continue;
    }
    path += `${pen ? "L" : "M"}${fixed(point.x)} ${fixed(point.y)}`;
    pen = true;
  }
  return path;
}

/** 앞뒤가 모두 빠진 값(또는 끝)이라 선이 닿지 않는 외톨이 점의 번호 — 선 대신 점으로 보여 줘야 해요 */
export function isolatedIndices(values: readonly (number | null)[]): number[] {
  const result: number[] = [];
  values.forEach((value, i) => {
    if (value === null) return;
    if ((i === 0 || values[i - 1] === null) && (i === values.length - 1 || values[i + 1] === null)) result.push(i);
  });
  return result;
}

/** 마지막으로 값이 있는 번호 (없으면 -1) */
export function lastIndex(values: readonly (number | null)[]): number {
  for (let i = values.length - 1; i >= 0; i--) if (values[i] !== null) return i;
  return -1;
}

/** 위아래로 놓인 글자들이 서로 겹치지 않는지: 좌표(ys)를 정렬했을 때 이웃 간격이 모두 minGap 이상 */
export function labelsFit(ys: readonly number[], minGap: number): boolean {
  const sorted = [...ys].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) if (sorted[i] - sorted[i - 1] < minGap) return false;
  return true;
}

/**
 * 글자 폭 어림 (px): 한글·가나·한자는 글자 크기만큼, 그 밖은 0.6배. 정확한 측정이 아니라 칸을 비워 두는 데 써요(브라우저 없이 시험하려고).
 * 전각 기호(U+FF00~)도 넓게 쳐요.
 */
export function textWidth(text: string, fontSize = 11): number {
  let width = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    width += code >= 0x2e80 ? fontSize : code === 0x20 ? fontSize * 0.3 : fontSize * 0.6;
  }
  return width;
}

/** 칸 count 개의 가운데 좌표 (left~right 를 같은 폭으로 나눠요) */
export function bandCenters(count: number, left: number, right: number): number[] {
  if (count <= 0) return [];
  const width = (right - left) / count;
  return Array.from({ length: count }, (_, i) => left + (i + 0.5) * width);
}

export interface GroupLayout {
  barWidth: number;
  groupWidth: number;
  /** 칸의 왼쪽 끝에서 묶음의 왼쪽 끝까지 */
  offset: number;
}

/** 칸 하나(bandWidth)에 막대 seriesCount 개를 묶어 놓는 배치: 막대는 maxBar 를 넘지 않고, 막대 사이는 gap, 칸의 70%까지만 써서 숨 쉴 공간을 둬요 */
export function layoutGroupedBars(bandWidth: number, seriesCount: number, maxBar = 24, gap = 2): GroupLayout {
  const count = Math.max(1, seriesCount);
  const usable = Math.max(1, bandWidth * 0.7 - gap * (count - 1));
  const barWidth = Math.max(1, Math.min(maxBar, usable / count));
  const groupWidth = barWidth * count + gap * (count - 1);
  return { barWidth, groupWidth, offset: (bandWidth - groupWidth) / 2 };
}

/**
 * 막대 하나의 경로: 기준선(yBase)에서 값의 끝(yEnd)까지, 값 쪽 끝만 radius 로 둥글게 하고 기준선 쪽은 네모로 둬요.
 * 값이 0 이 아닌데 너무 얇으면 1px 은 보이게 해요. 위로 자라는 막대(yEnd < yBase)와 아래로 자라는 막대(음수)를 모두 그려요.
 */
export function roundedBarPath(x: number, width: number, yBase: number, yEnd: number, radius = 4): string {
  if (width <= 0 || yBase === yEnd) return "";
  const up = yEnd < yBase;
  const height = Math.max(1, Math.abs(yEnd - yBase));
  const end = up ? yBase - height : yBase + height;
  const r = Math.min(radius, width / 2, height);
  const x1 = fixed(x);
  const x2 = fixed(x + width);
  if (up) {
    return `M${x1} ${fixed(yBase)}V${fixed(end + r)}A${fixed(r)} ${fixed(r)} 0 0 1 ${fixed(x + r)} ${fixed(end)}H${fixed(x + width - r)}A${fixed(r)} ${fixed(r)} 0 0 1 ${x2} ${fixed(end + r)}V${fixed(yBase)}Z`;
  }
  return `M${x1} ${fixed(yBase)}V${fixed(end - r)}A${fixed(r)} ${fixed(r)} 0 0 0 ${fixed(x + r)} ${fixed(end)}H${fixed(x + width - r)}A${fixed(r)} ${fixed(r)} 0 0 0 ${x2} ${fixed(end - r)}V${fixed(yBase)}Z`;
}

/** 말풍선(툴팁)의 왼쪽 위치: 기준 x 의 오른쪽에 두고, 넘치면 왼쪽으로 뒤집어요 (영역 밖으로는 나가지 않아요) */
export function tooltipLeft(x: number, tipWidth: number, areaWidth: number, gap = 12): number {
  const right = x + gap;
  const left = right + tipWidth <= areaWidth ? right : x - gap - tipWidth;
  return Math.max(0, Math.min(left, Math.max(0, areaWidth - tipWidth)));
}

export interface MarkerLabelInput {
  x: number;
  text: string;
}

export interface MarkerLabelPlace {
  /** 몇 번째 줄에 쓸지 (0 이 맨 위) */
  row: number;
  /** start = 선의 오른쪽에 글자가 이어지고, end = 선의 왼쪽에 (오른쪽 끝에 닿을 때) */
  anchor: "start" | "end";
}

/**
 * 세로 표시선들의 이름표 자리: 왼쪽부터 놓되, 앞 이름표와 겹치면 다음 줄로 내려요.
 * 글자가 영역 오른쪽을 넘으면 선의 왼쪽으로 뒤집어요. 입력 순서와 같은 순서로 돌려줘요.
 */
export function placeMarkerLabels(markers: readonly MarkerLabelInput[], areaRight: number, fontSize = 11, pad = 6): MarkerLabelPlace[] {
  const order = markers.map((_, i) => i).sort((a, b) => markers[a].x - markers[b].x);
  const rowEnds: number[] = [];
  const places: MarkerLabelPlace[] = new Array(markers.length);
  for (const index of order) {
    const { x, text } = markers[index];
    const width = textWidth(text, fontSize);
    const flip = x + pad + width > areaRight;
    const from = flip ? x - pad - width : x + pad;
    const to = flip ? x - pad : x + pad + width;
    let row = 0;
    while (row < rowEnds.length && from < rowEnds[row] + 4) row++;
    rowEnds[row] = to;
    places[index] = { row, anchor: flip ? "end" : "start" };
  }
  return places;
}
