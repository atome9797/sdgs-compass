"use client";

// 아주 작은 막대 그래프(스파크라인): 구간별 건수의 모양만 보여 줘요. 값은 옆의 합계와 "표로 보기"에 있어서 화면 낭독기에는 숨겨요.
// 규칙(dataviz): 막대 ≤24px · 값 쪽 끝 4px 둥글게 · 평소 막대는 눈에 덜 띄는 색, 가장 최근 구간만 강조색.
import { bandCenters, layoutGroupedBars, roundedBarPath } from "@/lib/adminChart";
import { useChartWidth } from "./useChartWidth";

export function Sparkline({ values, height = 36, highlightLast = true }: { values: readonly number[]; height?: number; highlightLast?: boolean }) {
  const { ref, width } = useChartWidth();
  const max = Math.max(1, ...values);
  const baseline = height - 2;
  const plotTop = 2;
  const centers = bandCenters(values.length, 0, width);
  const band = values.length === 0 ? 0 : width / values.length;
  const layout = layoutGroupedBars(band, 1);
  return (
    <div ref={ref} className="adm-sparkline" style={{ height }} aria-hidden="true">
      {width > 0 ? (
        <svg className="adm-svg" width={width} height={height}>
          <line className="adm-axis" x1={0} x2={width} y1={baseline + 0.5} y2={baseline + 0.5} />
          {values.map((value, index) => {
            if (value <= 0) return null;
            const last = highlightLast && index === values.length - 1;
            return <path key={index} d={roundedBarPath(centers[index] - layout.barWidth / 2, layout.barWidth, baseline, baseline - (value / max) * (baseline - plotTop), 4)} fill={last ? "var(--adm-c1)" : "var(--adm-muted-bar)"} />;
          })}
        </svg>
      ) : null}
    </div>
  );
}
