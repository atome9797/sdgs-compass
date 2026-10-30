import { describe, expect, it } from "vitest";
import {
  bandCenters,
  isolatedIndices,
  labelsFit,
  lastIndex,
  layoutGroupedBars,
  linePath,
  nearestIndex,
  niceScale,
  pickAnchoredTickIndices,
  pickTickIndices,
  placeMarkerLabels,
  roundedBarPath,
  scaleLinear,
  seriesExtent,
  textWidth,
  tooltipLeft,
} from "./adminChart";

describe("niceScale: 읽기 좋은 눈금", () => {
  it("간격은 1·2·5 × 10^n 중 어림 간격에 가장 가까운 것, 범위를 모두 덮어요", () => {
    expect(niceScale(0, 97)).toEqual({ min: 0, max: 100, step: 20, ticks: [0, 20, 40, 60, 80, 100] });
    expect(niceScale(0, 1000)).toEqual({ min: 0, max: 1000, step: 200, ticks: [0, 200, 400, 600, 800, 1000] });
    expect(niceScale(812, 1604)).toEqual({ min: 800, max: 1800, step: 200, ticks: [800, 1000, 1200, 1400, 1600, 1800] });
    for (const [lo, hi] of [[0, 97], [3, 8], [812, 1604], [-111, 305], [0.011, 0.071], [120_000, 4_700_000]] as const) {
      const scale = niceScale(lo, hi);
      expect(scale.min, `${lo}~${hi}`).toBeLessThanOrEqual(lo);
      expect(scale.max, `${lo}~${hi}`).toBeGreaterThanOrEqual(hi);
      expect(scale.ticks[0]).toBe(scale.min);
      expect(scale.ticks.at(-1)).toBe(scale.max);
    }
  });

  it("작은 소수도 부동소수점 찌꺼기 없이", () => {
    expect(niceScale(0, 1).ticks).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1]);
    expect(niceScale(0.011, 0.071).ticks).toEqual([0, 0.02, 0.04, 0.06, 0.08]);
  });

  it("음수가 있으면 0 을 지나가는 눈금이 나와요", () => {
    const scale = niceScale(-111, 305);
    expect(scale).toEqual({ min: -200, max: 400, step: 100, ticks: [-200, -100, 0, 100, 200, 300, 400] });
    expect(scale.ticks).toContain(0);
  });

  it("값이 하나뿐이면 조금 벌리고, 0 이면 0~1", () => {
    expect(niceScale(0, 0).ticks).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1]);
    const single = niceScale(5, 5);
    expect(single.min).toBeLessThan(5);
    expect(single.max).toBeGreaterThan(5);
  });

  it("integer 면 간격이 1 보다 작아지지 않아요 (건수 축)", () => {
    expect(niceScale(0, 0, 5, true).ticks).toEqual([0, 1]);
    expect(niceScale(0, 4, 5, true).ticks).toEqual([0, 1, 2, 3, 4]);
    expect(niceScale(0, 9, 5, true).ticks).toEqual([0, 2, 4, 6, 8, 10]);
    for (const tick of niceScale(0, 3, 5, true).ticks) expect(Number.isInteger(tick)).toBe(true);
  });

  it("거꾸로 준 범위나 이상한 값도 깨지지 않아요", () => {
    expect(niceScale(100, 0).ticks).toEqual(niceScale(0, 100).ticks);
    expect(niceScale(NaN, 5).ticks).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1]);
    expect(niceScale(0, Infinity).max).toBe(1);
  });
});

describe("값 → 좌표", () => {
  it("scaleLinear: 위아래가 뒤집힌 범위(y 축)도 돼요", () => {
    const y = scaleLinear([0, 100], [200, 0]);
    expect(y(0)).toBe(200);
    expect(y(100)).toBe(0);
    expect(y(25)).toBe(150);
    // 범위가 한 점이면 가운데
    expect(scaleLinear([5, 5], [0, 100])(5)).toBe(50);
  });

  it("seriesExtent: null 을 건너뛰고, includeZero 면 0 을 품어요", () => {
    const series = [{ values: [null, 3, 9] }, { values: [5, null, null] }];
    expect(seriesExtent(series)).toEqual([3, 9]);
    expect(seriesExtent(series, true)).toEqual([0, 9]);
    expect(seriesExtent([{ values: [-4, -2] }], true)).toEqual([-4, 0]);
    expect(seriesExtent([{ values: [null, null] }])).toBeNull();
    expect(seriesExtent([])).toBeNull();
  });

  it("bandCenters: 같은 폭 칸의 가운데", () => {
    expect(bandCenters(4, 0, 100)).toEqual([12.5, 37.5, 62.5, 87.5]);
    expect(bandCenters(0, 0, 100)).toEqual([]);
  });

  it("nearestIndex / lastIndex", () => {
    expect(nearestIndex([10, 30, 50], 34)).toBe(1);
    expect(nearestIndex([10, 30, 50], 1000)).toBe(2);
    expect(nearestIndex([10, 30, 50], -5)).toBe(0);
    expect(nearestIndex([], 5)).toBe(-1);
    expect(lastIndex([1, null, 3, null])).toBe(2);
    expect(lastIndex([null, null])).toBe(-1);
    expect(lastIndex([])).toBe(-1);
  });
});

describe("x 축 이름표", () => {
  it("pickAnchoredTickIndices: 0 에서 시작해 마지막 번호의 약수 간격으로 (36개월 → 0·6·12 …)", () => {
    expect(pickAnchoredTickIndices(37, 7)).toEqual([0, 6, 12, 18, 24, 30, 36]);
    expect(pickAnchoredTickIndices(37, 8)).toEqual([0, 6, 12, 18, 24, 30, 36]);
    expect(pickAnchoredTickIndices(37, 13)).toEqual([0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36]);
    expect(pickAnchoredTickIndices(25, 7)).toEqual([0, 4, 8, 12, 16, 20, 24]);
    expect(pickAnchoredTickIndices(13, 7)).toEqual([0, 2, 4, 6, 8, 10, 12]);
    expect(pickAnchoredTickIndices(61, 7)).toEqual([0, 10, 20, 30, 40, 50, 60]);
    // 자리가 모자라면 처음과 끝만, 점이 적으면 모두
    expect(pickAnchoredTickIndices(37, 2)).toEqual([0, 36]);
    expect(pickAnchoredTickIndices(37, 1)).toEqual([0, 36]);
    expect(pickAnchoredTickIndices(3, 10)).toEqual([0, 1, 2]);
    expect(pickAnchoredTickIndices(2, 5)).toEqual([0, 1]);
    expect(pickAnchoredTickIndices(1, 4)).toEqual([0]);
    expect(pickAnchoredTickIndices(0, 4)).toEqual([]);
    // 약수가 없는 개수(마지막 번호가 소수)여도 처음과 끝은 빠지지 않아요
    expect(pickAnchoredTickIndices(8, 3)).toEqual([0, 7]);
    for (const [count, max] of [[37, 5], [37, 9], [25, 3], [13, 4], [100, 6]] as const) {
      const picked = pickAnchoredTickIndices(count, max);
      expect(picked[0]).toBe(0);
      expect(picked[picked.length - 1]).toBe(count - 1);
      expect(picked.length).toBeLessThanOrEqual(Math.max(2, max));
      const step = picked[1] - picked[0];
      expect(picked.every((value, i) => value === i * step)).toBe(true);
    }
  });

  it("pickTickIndices: 마지막 점을 꼭 포함하고, 같은 간격으로 골라요", () => {
    expect(pickTickIndices(8, 4)).toEqual([1, 3, 5, 7]);
    expect(pickTickIndices(7, 4)).toEqual([0, 2, 4, 6]);
    expect(pickTickIndices(3, 10)).toEqual([0, 1, 2]);
    expect(pickTickIndices(1, 4)).toEqual([0]);
    expect(pickTickIndices(0, 4)).toEqual([]);
    expect(pickTickIndices(60, 7)).toEqual([5, 14, 23, 32, 41, 50, 59]);
    for (const [count, max] of [[52, 6], [9, 3], [30, 30], [12, 1]] as const) {
      const picked = pickTickIndices(count, max);
      expect(picked.at(-1)).toBe(count - 1);
      expect(picked.length).toBeLessThanOrEqual(Math.max(1, max));
    }
  });

  it("textWidth: 한글·한자·가나는 글자 크기만큼, 영문·숫자는 더 좁게", () => {
    expect(textWidth("黒字転換", 11)).toBe(44);
    expect(textWidth("흑자", 10)).toBe(20);
    expect(textWidth("1,234", 10)).toBeCloseTo(30, 5);
    expect(textWidth("", 11)).toBe(0);
    expect(textWidth("a b", 10)).toBeCloseTo(15, 5);
  });
});

describe("선", () => {
  it("linePath: 빠진 값(null)에서 선을 끊어요", () => {
    expect(linePath([{ x: 0, y: 1 }, { x: 10, y: 2.345 }, null, { x: 30, y: 3 }, { x: 40, y: 4 }])).toBe("M0 1L10 2.3M30 3L40 4");
    expect(linePath([null, null])).toBe("");
    expect(linePath([])).toBe("");
  });

  it("isolatedIndices: 앞뒤가 비어서 선이 닿지 않는 점", () => {
    expect(isolatedIndices([1, null, 3, 4, null, 6])).toEqual([0, 5]);
    expect(isolatedIndices([null, 2, null])).toEqual([1]);
    expect(isolatedIndices([1, 2, 3])).toEqual([]);
    expect(isolatedIndices([5])).toEqual([0]);
    expect(isolatedIndices([])).toEqual([]);
  });

  it("labelsFit: 끝 글자들이 겹치는지", () => {
    expect(labelsFit([10, 40, 80], 14)).toBe(true);
    expect(labelsFit([80, 10, 20], 14)).toBe(false);
    expect(labelsFit([10], 14)).toBe(true);
    expect(labelsFit([], 14)).toBe(true);
  });
});

describe("막대", () => {
  it("layoutGroupedBars: 막대는 24px 을 넘지 않고, 칸의 70%까지만 써요", () => {
    const wide = layoutGroupedBars(200, 3);
    expect(wide.barWidth).toBe(24);
    expect(wide.groupWidth).toBe(76);
    expect(wide.offset).toBe(62);
    const narrow = layoutGroupedBars(66, 3);
    expect(narrow.barWidth).toBeLessThan(24);
    expect(narrow.groupWidth).toBeLessThanOrEqual(66 * 0.7 + 1e-9);
    expect(narrow.offset).toBeGreaterThan(0);
    expect(layoutGroupedBars(200, 1).barWidth).toBe(24);
    // 아주 좁아도 1px 은 있어요
    expect(layoutGroupedBars(2, 5).barWidth).toBeGreaterThanOrEqual(1);
  });

  it("roundedBarPath: 값 쪽 끝만 둥글고, 기준선 쪽은 네모", () => {
    // 위로 자라는 막대: 기준선 y=100, 끝 y=40
    expect(roundedBarPath(10, 20, 100, 40, 4)).toBe("M10 100V44A4 4 0 0 1 14 40H26A4 4 0 0 1 30 44V100Z");
    // 아래로 자라는 막대(음수)
    expect(roundedBarPath(10, 20, 100, 160, 4)).toBe("M10 100V156A4 4 0 0 0 14 160H26A4 4 0 0 0 30 156V100Z");
    // 값이 0 이면 그리지 않아요
    expect(roundedBarPath(10, 20, 100, 100)).toBe("");
    expect(roundedBarPath(10, 0, 100, 40)).toBe("");
  });

  it("roundedBarPath: 아주 짧은 막대도 1px 은 보이고, 둥글기는 높이·폭을 넘지 않아요", () => {
    expect(roundedBarPath(10, 20, 100, 99.8, 4)).toBe("M10 100V100A1 1 0 0 1 11 99H29A1 1 0 0 1 30 100V100Z");
    expect(roundedBarPath(0, 4, 100, 50, 4)).toContain("A2 2 0 0 1");
  });
});

describe("말풍선 · 표시선 이름표", () => {
  it("tooltipLeft: 기준 오른쪽에 두고, 넘치면 왼쪽으로 뒤집고, 영역 밖으로 나가지 않아요", () => {
    expect(tooltipLeft(100, 120, 300)).toBe(112);
    expect(tooltipLeft(250, 120, 300)).toBe(118);
    expect(tooltipLeft(10, 400, 300)).toBe(0);
    expect(tooltipLeft(0, 120, 300)).toBe(12);
  });

  it("placeMarkerLabels: 겹치면 다음 줄로 내리고, 오른쪽 끝에 닿으면 선의 왼쪽에 써요", () => {
    const places = placeMarkerLabels(
      [
        { x: 100, text: "黒字転換" },
        { x: 110, text: "資金不足" },
        { x: 300, text: "abc" },
      ],
      320,
    );
    expect(places).toEqual([
      { row: 0, anchor: "start" },
      { row: 1, anchor: "start" },
      { row: 0, anchor: "end" },
    ]);
  });

  it("placeMarkerLabels: 입력 순서와 같은 순서로 돌려줘요 (x 순서가 달라도)", () => {
    const places = placeMarkerLabels(
      [
        { x: 200, text: "後" },
        { x: 20, text: "先" },
      ],
      320,
    );
    expect(places).toHaveLength(2);
    expect(places[0]).toEqual({ row: 0, anchor: "start" });
    expect(places[1]).toEqual({ row: 0, anchor: "start" });
    expect(placeMarkerLabels([], 320)).toEqual([]);
  });
});
