"use client";

// 가로 막대 순위표(HTML·CSS): 이름 · 막대 · 막대 끝의 값. 값이 모두 막대 끝에 적혀 있어서 말풍선이 없어도 읽혀요.
// 규칙(dataviz): 막대 두께 ≤24px · 값 쪽 끝만 4px 둥글게 · 계열이 하나면 한 색(값이 클수록 진해지는 색은 쓰지 않아요). 순서가 있는 항목만 단계색(color 를 행마다 줘요).
import type { ReactNode } from "react";
import { ChartFrame, type TableView } from "./ChartFrame";

export interface HBarRow {
  id: string;
  label: string;
  value: number;
  /** 막대 끝에 적을 글자 (없으면 formatValue) */
  display?: string;
  /** CSS 색 (없으면 color) */
  color?: string;
}

interface HBarChartProps {
  title: string;
  hint?: string;
  /** 한 문장 설명 (화면 낭독기용) */
  summary: string;
  rows: readonly HBarRow[];
  formatValue: (value: number) => string;
  /** 기본 막대 색 */
  color?: string;
  /** 그래프의 값 대신 쓸 표 (없으면 이름·값 두 칸) */
  table?: TableView;
  valueHeader: string;
  nameHeader: string;
  emptyText: string;
  actions?: ReactNode;
}

/** 가장 긴 막대가 차지하는 칸의 비율 (끝에 값 글자를 적을 자리를 남겨요) */
const MAX_SHARE = 78;

export function HBarChart({ title, hint, summary, rows, formatValue, color = "var(--adm-c1)", table, valueHeader, nameHeader, emptyText, actions }: HBarChartProps) {
  const max = Math.max(0, ...rows.map((row) => row.value));
  const view: TableView = table ?? { head: [nameHeader, valueHeader], rows: rows.map((row) => [row.label, row.display ?? formatValue(row.value)]) };
  return (
    <ChartFrame title={title} hint={hint} table={view} actions={actions}>
      {rows.length === 0 ? (
        <p className="empty">{emptyText}</p>
      ) : (
        <div className="adm-hbars" role="img" aria-label={summary}>
          {rows.map((row) => (
            <div key={row.id} className="adm-hbar">
              <span className="adm-hbar__label">{row.label}</span>
              <span className="adm-hbar__track">
                <span className="adm-hbar__fill" style={{ width: `${max === 0 ? 0 : (row.value / max) * MAX_SHARE}%`, background: row.color ?? color }} />
                <span className="adm-hbar__value">{row.display ?? formatValue(row.value)}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </ChartFrame>
  );
}
