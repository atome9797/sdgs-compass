"use client";

// 세로 막대 그래프(묶음 막대, SVG 직접 그리기): 칸(예: 기)마다 계열별 막대. 0 에서 자라고, 음수(적자)는 아래로 자라요.
// 규칙(dataviz): 막대 폭 ≤24px · 값 쪽 끝만 4px 둥글게(기준선 쪽은 네모) · 막대 사이 2px 틈 · 값은 이야기의 주인공 계열의 끝에만(들어가지 않으면 생략 — 말풍선·표에 있어요).
import { useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { bandCenters, layoutGroupedBars, nearestIndex, niceScale, roundedBarPath, scaleLinear, seriesExtent, textWidth, tooltipLeft } from "@/lib/adminChart";
import { useAdmin } from "@/lib/adminSession";
import { ChartFrame, ChartTooltip, type LegendItem, type TipRow } from "./ChartFrame";
import { useChartWidth } from "./useChartWidth";

export interface ColumnSeries {
  id: string;
  label: string;
  color: string;
  values: readonly (number | null)[];
}

interface ColumnChartProps {
  title: string;
  hint?: string;
  summary: string;
  /** 칸 이름 (짧게) */
  categories: readonly string[];
  /** 표의 첫 칸 머리글 */
  categoryHeader: string;
  series: readonly ColumnSeries[];
  formatTick: (value: number) => string;
  formatValue: (value: number) => string;
  /** 막대 끝에 값을 적을 계열 (한 계열만 — 이야기의 주인공) */
  labelSeriesId?: string;
  height?: number;
  integerTicks?: boolean;
  actions?: ReactNode;
}

const FONT = 11;
const BOTTOM = 26;
const TOP = 18;
const GAP = 2;

export function ColumnChart({ title, hint, summary, categories, categoryHeader, series, formatTick, formatValue, labelSeriesId, height = 232, integerTicks = false, actions }: ColumnChartProps) {
  const { t } = useAdmin();
  const { ref, width } = useChartWidth();
  const [active, setActive] = useState<number | null>(null);

  const count = categories.length;
  const extent = seriesExtent(series, true);
  const legend: LegendItem[] = series.map((s) => ({ id: s.id, label: s.label, color: s.color, shape: "box" }));
  const table = {
    head: [categoryHeader, ...series.map((s) => s.label)],
    rows: categories.map((category, index) => [category, ...series.map((s) => (s.values[index] == null ? "-" : formatValue(s.values[index] as number)))]),
  };

  if (extent === null || count === 0) {
    return (
      <ChartFrame title={title} hint={hint} legend={legend} table={table} actions={actions}>
        <p className="empty">{t("admin.chart.noData")}</p>
      </ChartFrame>
    );
  }

  const scale = niceScale(extent[0], extent[1], 5, integerTicks);
  const tickTexts = scale.ticks.map(formatTick);
  const left = Math.ceil(Math.max(...tickTexts.map((text) => textWidth(text, FONT)))) + 14;
  const right = 14;
  const plotRight = Math.max(left + 10, width - right);
  const plotBottom = height - BOTTOM;
  const y = scaleLinear([scale.min, scale.max], [plotBottom, TOP]);
  const baseline = y(0);

  const centers = bandCenters(count, left, plotRight);
  const bandWidth = (plotRight - left) / count;
  const layout = layoutGroupedBars(bandWidth, series.length);

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const index = nearestIndex(centers, event.clientX - rect.left);
    if (index >= 0) setActive(index);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = count - 1;
    if (event.key === "ArrowRight") setActive((current) => (current === null ? 0 : Math.min(last, current + 1)));
    else if (event.key === "ArrowLeft") setActive((current) => (current === null ? last : Math.max(0, current - 1)));
    else if (event.key === "Home") setActive(0);
    else if (event.key === "End") setActive(last);
    else if (event.key === "Escape") setActive(null);
    else return;
    event.preventDefault();
  };

  const activeIndex = active !== null && active < count ? active : null;
  let tooltip: ReactNode = null;
  if (activeIndex !== null) {
    const rows: TipRow[] = series.map((s) => {
      const value = s.values[activeIndex];
      return { id: s.id, color: s.color, shape: "box", label: s.label, value: value === null || value === undefined ? "-" : formatValue(value) };
    });
    const tipWidth = Math.min(width - 8, Math.max(textWidth(categories[activeIndex], 12), ...rows.map((row) => textWidth(row.value, 13) + textWidth(row.label, 12) + 40)) + 24);
    tooltip = <ChartTooltip title={categories[activeIndex]} rows={rows} left={tooltipLeft(centers[activeIndex], tipWidth, width)} />;
  }

  // 막대 끝 값: 주인공 계열의 모든 값이 칸 폭 안에 들어갈 때만 적어요
  const labelSeries = series.find((s) => s.id === labelSeriesId);
  const labelTexts = labelSeries ? labelSeries.values.map((value) => (value === null || value === undefined ? "" : formatValue(value))) : [];
  const labelsOn = labelSeries !== undefined && labelTexts.every((text) => textWidth(text, FONT) <= bandWidth - 6);

  return (
    <ChartFrame title={title} hint={hint} legend={legend} table={table} actions={actions}>
      <div
        ref={ref}
        className="adm-plot"
        style={{ height }}
        role="group"
        aria-label={`${title}. ${t("admin.chart.keyboardHint")}`}
        tabIndex={0}
        onPointerMove={onPointerMove}
        onPointerDown={onPointerMove}
        onPointerLeave={() => setActive(null)}
        onKeyDown={onKeyDown}
        onFocus={(event) => {
          if (event.currentTarget.matches(":focus-visible")) setActive((current) => current ?? 0);
        }}
        onBlur={() => setActive(null)}
      >
        {width > 0 ? (
          <svg className="adm-svg" width={width} height={height} role="img" aria-label={summary}>
            {/* 가리킨 칸의 바탕 */}
            {activeIndex !== null ? <rect className="adm-wash" x={centers[activeIndex] - bandWidth / 2} y={TOP - 6} width={bandWidth} height={plotBottom - TOP + 6} /> : null}
            {scale.ticks.map((tick, i) => (
              <g key={tick}>
                <line className="adm-grid" x1={left} x2={plotRight} y1={y(tick)} y2={y(tick)} />
                <text className="adm-tick" x={left - 8} y={y(tick)} dy="0.32em" textAnchor="end">
                  {tickTexts[i]}
                </text>
              </g>
            ))}
            <line className="adm-zero" x1={left} x2={plotRight} y1={baseline} y2={baseline} />
            {categories.map((category, index) => (
              <text key={`${category}-${index}`} className="adm-tick" x={centers[index]} y={plotBottom + 17} textAnchor="middle">
                {category}
              </text>
            ))}
            {series.map((s, seriesIndex) =>
              s.values.map((value, index) => {
                if (value === null || value === undefined || value === 0) return null;
                const x = centers[index] - bandWidth / 2 + layout.offset + seriesIndex * (layout.barWidth + GAP);
                const dim = activeIndex !== null && activeIndex !== index;
                return <path key={`${s.id}-${index}`} d={roundedBarPath(x, layout.barWidth, baseline, y(value), 4)} fill={s.color} opacity={dim ? 0.45 : 1} />;
              }),
            )}
            {labelsOn && labelSeries
              ? labelSeries.values.map((value, index) => {
                  if (value === null || value === undefined) return null;
                  const seriesIndex = series.indexOf(labelSeries);
                  const x = centers[index] - bandWidth / 2 + layout.offset + seriesIndex * (layout.barWidth + GAP) + layout.barWidth / 2;
                  const labelY = value >= 0 ? y(value) - 6 : y(value) + 15;
                  return (
                    <text key={`label-${index}`} className="adm-value" x={x} y={labelY} textAnchor="middle">
                      {labelTexts[index]}
                    </text>
                  );
                })
              : null}
          </svg>
        ) : null}
        {tooltip}
      </div>
    </ChartFrame>
  );
}
