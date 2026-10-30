"use client";

// 꺾은선 그래프(SVG 직접 그리기): 여러 계열, 빠진 값(null)에서는 선이 끊겨요, 0 선, 세로 표시선(예: 흑자 전환), 점선 계열(비교용).
// 값은 마우스·손가락으로 가리키거나 키보드 좌우 화살표로 확인할 수 있고, 같은 값이 표(표로 보기)에도 있어요.
// 규칙(dataviz): 선 2px · 끝 점 r=4 + 표면색 2px 고리 · 격자는 가는 실선 · 계열이 2개 이상이면 범례 · 끝 값만 골라서 직접 표시(겹치면 생략).
import { useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { isolatedIndices, labelsFit, lastIndex, linePath, nearestIndex, niceScale, pickAnchoredTickIndices, pickTickIndices, placeMarkerLabels, scaleLinear, seriesExtent, textWidth, tooltipLeft, type Point } from "@/lib/adminChart";
import { useAdmin } from "@/lib/adminSession";
import { ChartFrame, ChartTooltip, type LegendItem, type TipRow } from "./ChartFrame";
import { useChartWidth } from "./useChartWidth";

export interface LineSeries {
  id: string;
  label: string;
  /** CSS 색 (예: var(--adm-c1)). 같은 대상(SNS·시나리오)은 어느 그래프에서나 같은 색이에요 */
  color: string;
  /** x 위치마다 하나. 값이 없으면 null (선이 끊겨요) */
  values: readonly (number | null)[];
  dashed?: boolean;
}

export interface LineMarker {
  /** x 위치 번호 */
  index: number;
  label: string;
}

interface LineChartProps {
  title: string;
  hint?: string;
  /** 그래프를 한 문장으로 (화면 낭독기가 읽는 설명) */
  summary: string;
  /** 가로축 이름표 (위치마다 하나, 짧게) */
  xLabels: readonly string[];
  /** 말풍선·표에 쓰는 긴 이름 (없으면 xLabels) */
  xTitles?: readonly string[];
  /** 표의 첫 칸 머리글 (예: "週") */
  xHeader: string;
  series: readonly LineSeries[];
  formatTick: (value: number) => string;
  formatValue: (value: number) => string;
  height?: number;
  /** 0 을 꼭 포함할지 (돈·건수는 보통 true, 팔로워처럼 큰 수에서 조금 움직이는 값은 false) */
  includeZero?: boolean;
  /** 눈금을 정수로만 (건수 축) */
  integerTicks?: boolean;
  markers?: readonly LineMarker[];
  /** 가로축 이름표를 "처음(0번)부터 같은 간격"으로 붙일지 (월 축처럼 시작이 의미 있을 때). 기본은 가장 최근(마지막)을 기준으로 끝에서부터 */
  anchorTicks?: boolean;
  actions?: ReactNode;
}

const FONT = 11;
const BOTTOM = 26;
const MARKER_ROW = 14;

/** 표시선 이름표의 글자 바닥 y: 0 번째 줄이 그림 바로 위, 겹치는 이름표는 한 줄씩 위로 */
const markerBaseline = (plotTop: number, row: number): number => plotTop - 6 - row * MARKER_ROW;

export function LineChart({
  title,
  hint,
  summary,
  xLabels,
  xTitles,
  xHeader,
  series,
  formatTick,
  formatValue,
  height = 232,
  includeZero = false,
  integerTicks = false,
  markers: markersProp = [],
  anchorTicks = false,
  actions,
}: LineChartProps) {
  const { t } = useAdmin();
  const { ref, width } = useChartWidth();
  const [active, setActive] = useState<number | null>(null);

  const count = xLabels.length;
  // 범위 밖의 표시선은 그리지 않아요 (좌표가 NaN 이 되는 걸 막아요)
  const markers = markersProp.filter((marker) => marker.index >= 0 && marker.index < count);
  const extent = seriesExtent(series, includeZero);
  const legend: LegendItem[] = series.map((s) => ({ id: s.id, label: s.label, color: s.color, dashed: s.dashed }));
  const titleAt = (index: number): string => xTitles?.[index] ?? xLabels[index] ?? "";
  const table = {
    head: [xHeader, ...series.map((s) => s.label)],
    rows: xLabels.map((_, index) => [titleAt(index), ...series.map((s) => (s.values[index] == null ? "-" : formatValue(s.values[index] as number)))]),
  };

  if (extent === null || count === 0) {
    return (
      <ChartFrame title={title} hint={hint} legend={legend} table={table} actions={actions}>
        <p className="empty">{t("admin.chart.noData")}</p>
      </ChartFrame>
    );
  }

  // ── 좌표 계산 ──
  const scale = niceScale(extent[0], extent[1], 5, integerTicks);
  const tickTexts = scale.ticks.map(formatTick);
  const left = Math.ceil(Math.max(...tickTexts.map((text) => textWidth(text, FONT)))) + 14;
  const markerRows = markers.length === 0 ? 0 : markers.length === 1 ? 1 : 2;
  const top = 10 + markerRows * MARKER_ROW;
  const plotBottom = height - BOTTOM;
  const y = scaleLinear([scale.min, scale.max], [plotBottom, top]);

  // 끝 값: 계열이 4개 이하이고 위아래로 겹치지 않을 때만 직접 적어요 (겹치면 범례·말풍선·표가 대신해요)
  const ends = series.flatMap((s) => {
    const index = lastIndex(s.values);
    return index < 0 ? [] : [{ series: s, index, value: s.values[index] as number }];
  });
  const endLabelsOn = series.length <= 4 && ends.length > 0 && labelsFit(ends.map((e) => y(e.value)), 14);
  const right = endLabelsOn ? Math.ceil(Math.max(...ends.map((e) => textWidth(formatValue(e.value), FONT)))) + 20 : 14;

  const plotRight = Math.max(left + 10, width - right);
  const xs = xLabels.map((_, index) => (count === 1 ? (left + plotRight) / 2 : left + (index * (plotRight - left)) / (count - 1)));
  const xTickWidth = Math.max(...xLabels.map((label) => textWidth(label, FONT))) + 14;
  const xTickIndices = (anchorTicks ? pickAnchoredTickIndices : pickTickIndices)(count, Math.floor((plotRight - left) / xTickWidth));

  const pointsOf = (s: LineSeries): (Point | null)[] => s.values.map((value, index) => (value === null || value === undefined ? null : { x: xs[index], y: y(value) }));
  const markerPlaces = placeMarkerLabels(
    markers.map((m) => ({ x: xs[m.index] ?? 0, text: m.label })),
    width - 4,
    FONT,
  );

  // ── 가리키기(마우스·손가락)와 키보드 ──
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const index = nearestIndex(xs, event.clientX - rect.left);
    if (index >= 0) setActive(index);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = count - 1;
    if (event.key === "ArrowRight") setActive((current) => (current === null ? last : Math.min(last, current + 1)));
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
      return { id: s.id, color: s.color, dashed: s.dashed, label: s.label, value: value === null || value === undefined ? "-" : formatValue(value) };
    });
    const tipWidth = Math.min(width - 8, Math.max(textWidth(titleAt(activeIndex), 12), ...rows.map((row) => textWidth(row.value, 13) + textWidth(row.label, 12) + 40)) + 24);
    tooltip = <ChartTooltip title={titleAt(activeIndex)} rows={rows} left={tooltipLeft(xs[activeIndex], tipWidth, width)} />;
  }

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
          // 키보드로 들어왔을 때만 (마우스 클릭의 포커스에는 말풍선을 띄우지 않아요)
          if (event.currentTarget.matches(":focus-visible")) setActive((current) => current ?? count - 1);
        }}
        onBlur={() => setActive(null)}
      >
        {width > 0 ? (
          <svg className="adm-svg" width={width} height={height} role="img" aria-label={summary}>
            {/* 격자와 세로축 이름표 */}
            {scale.ticks.map((tick, i) => (
              <g key={tick}>
                <line className="adm-grid" x1={left} x2={plotRight} y1={y(tick)} y2={y(tick)} />
                <text className="adm-tick" x={left - 8} y={y(tick)} dy="0.32em" textAnchor="end">
                  {tickTexts[i]}
                </text>
              </g>
            ))}
            {/* 0 선: 값이 0 을 오가면 눈에 띄게, 아니면 맨 아래 선을 기준선으로 */}
            {scale.min < 0 && scale.max > 0 ? <line className="adm-zero" x1={left} x2={plotRight} y1={y(0)} y2={y(0)} /> : <line className="adm-axis" x1={left} x2={plotRight} y1={plotBottom} y2={plotBottom} />}
            {/* 가로축 이름표 */}
            {xTickIndices.map((index) => {
              const half = textWidth(xLabels[index], FONT) / 2;
              const x = Math.min(Math.max(xs[index], half + 2), width - half - 2);
              return (
                <text key={index} className="adm-tick" x={x} y={plotBottom + 17} textAnchor="middle">
                  {xLabels[index]}
                </text>
              );
            })}
            {/* 세로 표시선: 이름표가 있는 줄에서 시작해요 */}
            {markers.map((marker, i) => (
              <line key={`${marker.label}-${i}`} className="adm-marker" x1={xs[marker.index]} x2={xs[marker.index]} y1={markerBaseline(top, Math.min(markerPlaces[i].row, markerRows - 1)) - 9} y2={plotBottom} />
            ))}
            {/* 선 */}
            {series.map((s) => (
              <path key={s.id} d={linePath(pointsOf(s))} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={s.dashed ? "6 4" : undefined} />
            ))}
            {/* 선이 닿지 않는 외톨이 점 */}
            {series.flatMap((s) =>
              isolatedIndices(s.values).map((index) => <circle key={`${s.id}-${index}`} cx={xs[index]} cy={y(s.values[index] as number)} r={4} fill={s.color} stroke="var(--card)" strokeWidth={2} />),
            )}
            {/* 끝 점과 끝 값 */}
            {ends.map((end) => (
              <g key={end.series.id}>
                <circle cx={xs[end.index]} cy={y(end.value)} r={4} fill={end.series.color} stroke="var(--card)" strokeWidth={2} />
                {endLabelsOn ? (
                  <text className="adm-end" x={xs[end.index] + 9} y={y(end.value)} dy="0.32em">
                    {formatValue(end.value)}
                  </text>
                ) : null}
              </g>
            ))}
            {/* 가리킨 자리: 세로선과 계열마다 점 */}
            {activeIndex !== null ? (
              <g>
                <line className="adm-cross" x1={xs[activeIndex]} x2={xs[activeIndex]} y1={top} y2={plotBottom} />
                {series.map((s) => {
                  const value = s.values[activeIndex];
                  return value === null || value === undefined ? null : <circle key={s.id} cx={xs[activeIndex]} cy={y(value)} r={4} fill={s.color} stroke="var(--card)" strokeWidth={2} />;
                })}
              </g>
            ) : null}
            {/* 표시선 이름표 (글자 둘레를 표면색으로 둘러서 선 위에서도 읽혀요) */}
            {markers.map((marker, i) => {
              const place = markerPlaces[i];
              const row = Math.min(place.row, Math.max(0, markerRows - 1));
              const x = xs[marker.index] + (place.anchor === "start" ? 6 : -6);
              return (
                <text key={`label-${marker.label}-${i}`} className="adm-marker-label" x={x} y={markerBaseline(top, row)} textAnchor={place.anchor}>
                  {marker.label}
                </text>
              );
            })}
          </svg>
        ) : null}
        {tooltip}
      </div>
    </ChartFrame>
  );
}
