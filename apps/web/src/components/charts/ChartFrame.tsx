"use client";

// 그래프 한 장의 틀: 제목 · (있으면) 안내 · 범례 · 그래프 · "표로 보기".
// 표는 그래프와 같은 숫자를 글자로 보여 주는 짝이에요(마우스·화면 낭독기 없이도 모든 값에 닿도록 — 말풍선은 거들 뿐 값을 가두지 않아요).
import { useId, useState, type ReactNode } from "react";
import { useAdmin } from "@/lib/adminSession";

export interface LegendItem {
  id: string;
  label: string;
  /** CSS 색 (예: var(--adm-c1)) */
  color: string;
  dashed?: boolean;
  /** line = 선(기본) / box = 막대 */
  shape?: "line" | "box";
}

export interface TableView {
  head: readonly string[];
  /** 첫 칸은 행 이름(머리글 칸), 나머지는 숫자 */
  rows: readonly (readonly string[])[];
}

/** 짧은 선(또는 네모) 모양의 색 표시. 글자는 글자색 그대로 두고 이 표시가 계열을 알려 줘요 */
export function Key({ color, dashed = false, shape = "line" }: { color: string; dashed?: boolean; shape?: "line" | "box" }) {
  const className = ["adm-key", shape === "box" ? "adm-key--box" : "", dashed ? "adm-key--dashed" : ""].filter(Boolean).join(" ");
  return <span className={className} style={{ color }} aria-hidden="true" />;
}

export interface TipRow {
  id: string;
  color: string;
  dashed?: boolean;
  shape?: "line" | "box";
  label: string;
  value: string;
}

/** 마우스·손가락·키보드로 가리킨 자리의 값 (값이 먼저, 이름은 뒤에). 클릭을 가로채지 않아요 */
export function ChartTooltip({ title, rows, left, top = 6 }: { title: string; rows: readonly TipRow[]; left: number; top?: number }) {
  return (
    <div className="adm-tip" style={{ left, top }} aria-hidden="true">
      <p className="adm-tip__title">{title}</p>
      <ul className="adm-tip__rows">
        {rows.map((row) => (
          <li key={row.id} className="adm-tip__row">
            <Key color={row.color} dashed={row.dashed} shape={row.shape} />
            <strong className="adm-tip__value">{row.value}</strong>
            <span className="adm-tip__label">{row.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface ChartFrameProps {
  title: string;
  hint?: string;
  /** 2개 이상일 때만 범례를 그려요 (계열이 하나면 제목이 곧 이름이에요) */
  legend?: readonly LegendItem[];
  table: TableView;
  /** 제목 줄 오른쪽에 둘 것 (예: "サンプルデータ（仮想）" 표시) */
  actions?: ReactNode;
  children: ReactNode;
}

export function ChartFrame({ title, hint, legend, table, actions, children }: ChartFrameProps) {
  const { t } = useAdmin();
  const [open, setOpen] = useState(false);
  const tableId = useId();
  return (
    <figure className="card card--pad adm-chart">
      <div className="adm-chart__head">
        <figcaption className="adm-chart__title">{title}</figcaption>
        <div className="adm-chart__actions">
          {actions}
          <button type="button" className="btn btn--ghost btn--sm" aria-expanded={open} aria-controls={tableId} onClick={() => setOpen((value) => !value)}>
            {t("admin.tableToggle")}
          </button>
        </div>
      </div>
      {hint ? <p className="adm-chart__hint">{hint}</p> : null}
      {legend && legend.length >= 2 ? (
        <ul className="adm-legend" aria-label={t("admin.chart.legend")}>
          {legend.map((item) => (
            <li key={item.id} className="adm-legend__item">
              <Key color={item.color} dashed={item.dashed} shape={item.shape} />
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {children}
      <div id={tableId} hidden={!open}>
        <div className="table-wrap adm-table-wrap" role="region" aria-label={title} tabIndex={0}>
          <table className="table adm-table">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr>
                {table.head.map((cell, index) => (
                  <th key={index} scope="col" className={index > 0 ? "num" : undefined}>
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) =>
                    cellIndex === 0 ? (
                      <th key={cellIndex} scope="row">
                        {cell}
                      </th>
                    ) : (
                      <td key={cellIndex} className="num">
                        {cell}
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </figure>
  );
}
