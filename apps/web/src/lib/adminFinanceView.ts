// 운영자 화면 ③ 수지·자금의 화면용 도우미(순수 함수): 월 가로축 · 비교할 값 · 표시선 · 연간 표의 행 · 이름과 번호 짓기.
// React 가 없어서 시험으로 못 박아요. 계산 자체는 core 의 adminFinance.ts, 문장은 adminFinanceText.ts.
import {
  ceilCompanies,
  defaultPeriodLabel,
  MAX_NAME_LENGTH,
  MONTHS_PER_PERIOD,
  monthPosition,
  type FinanceResult,
  type FinanceScenario,
  type PeriodResult,
  type PeriodReturn,
  type SensitivityParam,
} from "@sdgs-compass/core/adminFinance";
import { formatNumber } from "@sdgs-compass/core/format";
import type { Locale } from "@sdgs-compass/core/i18n";
import { translate, type MessageKey } from "@sdgs-compass/core/messages";

// ───────── 월 가로축 ─────────
export interface MonthAxis {
  /** 가로축 이름표 (위치마다 하나, 짧게): 0번 = "開始", n번 = "n か月" */
  labels: string[];
  /** 말풍선·표에 쓰는 이름: "第2期の1か月目（開始から13か月）" */
  titles: string[];
}

/** 시나리오 하나의 월 축. 0번 위치가 시작 시점이고, 1~(12×기 수)번이 달이에요 */
export function monthAxis(scenario: FinanceScenario, locale: Locale): MonthAxis {
  const months = scenario.periods.length * MONTHS_PER_PERIOD;
  const labels = [translate("admin.finance.axis.start", locale)];
  const titles = [translate("admin.finance.when.start", locale)];
  for (let month = 1; month <= months; month += 1) {
    const { period, month: inPeriod } = monthPosition(month);
    labels.push(translate("admin.finance.monthShort", locale, { n: month }));
    titles.push(translate("admin.finance.tip.month", locale, { period: scenario.periods[period - 1]?.label ?? defaultPeriodLabel(period, locale), n: inPeriod, total: month }));
  }
  return { labels, titles };
}

/** 두 시나리오를 겹치는 그래프의 축: 시나리오마다 기 이름이 달라도 틀리지 않게 "開始から15か月"만 써요 */
export function plainMonthAxis(periods: number, locale: Locale): MonthAxis {
  const months = periods * MONTHS_PER_PERIOD;
  const labels = [translate("admin.finance.axis.start", locale)];
  const titles = [translate("admin.finance.when.start", locale)];
  for (let month = 1; month <= months; month += 1) {
    labels.push(translate("admin.finance.monthShort", locale, { n: month }));
    titles.push(translate("admin.finance.tip.total", locale, { total: month }));
  }
  return { labels, titles };
}

// ───────── 월별 값 (그래프의 한 줄) ─────────
export type FinanceMetric = "cumulativeProfit" | "cash" | "monthlyProfit" | "companies" | "cumulativeReturn";
export const FINANCE_METRICS: readonly FinanceMetric[] = ["cumulativeProfit", "cash", "monthlyProfit", "companies", "cumulativeReturn"];

export const FINANCE_METRIC_LABEL: Record<FinanceMetric, MessageKey> = {
  cumulativeProfit: "admin.finance.series.cumulative",
  cash: "admin.finance.series.cash",
  monthlyProfit: "admin.finance.series.monthlyProfit",
  companies: "admin.finance.series.companies",
  cumulativeReturn: "admin.finance.series.cumulativeReturn",
};

/** 돈이 아닌 값(기업 수)은 눈금·설명이 달라요 */
export const isMoneyMetric = (metric: FinanceMetric): boolean => metric !== "companies";

/**
 * 월 축(0 = 시작 시점, 1~12×기 수 = 달)에 맞춘 값 한 줄. 돈은 엔 단위 그대로예요(그래프가 만 엔으로 보여 줘요).
 * 월 경상이익은 "시작 시점"에는 값이 없어서 null (선이 그 자리에서 시작해요).
 */
export function metricValues(result: FinanceResult, metric: FinanceMetric): (number | null)[] {
  const first = metric === "cumulativeProfit" || metric === "cumulativeReturn" ? 0 : metric === "cash" ? result.start.cashYen : metric === "companies" ? result.start.companies : null;
  const rest = result.months.map((month) => {
    switch (metric) {
      case "cumulativeProfit":
        return month.cumulativeProfitYen;
      case "cash":
        return month.cashYen;
      case "monthlyProfit":
        return month.profitYen;
      case "companies":
        return month.companies;
      case "cumulativeReturn":
        return month.cumulativeReturnYen;
    }
  });
  return [first, ...rest];
}

/** 값이 모자란 쪽(기 수가 적은 시나리오)은 끝을 null 로 채워서 같은 축에 겹쳐요 */
export function padValues(values: readonly (number | null)[], length: number): (number | null)[] {
  return Array.from({ length }, (_, index) => values[index] ?? null);
}

// ───────── 표시선 ─────────
export interface AxisMarker {
  index: number;
  label: string;
}

export type MarkerKind = "turnaround" | "cashShort" | "studentReturn";

/**
 * 월 그래프의 세로 표시선: 흑자 전환(첫 달부터면 생략)과 자금 부족(시작 시점부터면 0번 위치), 학생 환원의 시작(첫 환원 기의 마지막 달).
 * kinds 로 어느 것만 그릴지 고를 수 있어요 (월 경상이익 그래프에는 흑자 전환만)
 */
export function financeMarkers(result: FinanceResult, locale: Locale, kinds: readonly MarkerKind[] = ["turnaround", "cashShort", "studentReturn"]): AxisMarker[] {
  const markers: AxisMarker[] = [];
  const { profitTurnaroundMonth, cashShortMonth } = result.milestones;
  // 첫 달부터 흑자면 표시선이 축 맨 앞에 붙어서 읽기 어려워요 — 요약 문장이 알려 줘요
  if (kinds.includes("turnaround") && profitTurnaroundMonth !== null && profitTurnaroundMonth > 1) markers.push({ index: profitTurnaroundMonth, label: translate("admin.finance.marker.turnaround", locale) });
  if (kinds.includes("cashShort") && cashShortMonth !== null) markers.push({ index: cashShortMonth, label: translate("admin.finance.marker.cashShort", locale) });
  const firstReturn = result.studentReturn?.firstPeriodIndex ?? null;
  if (kinds.includes("studentReturn") && firstReturn !== null) markers.push({ index: (firstReturn + 1) * MONTHS_PER_PERIOD, label: translate("admin.finance.marker.return", locale) });
  return markers;
}

// ───────── 기별 막대그래프 · 연간 표 ─────────
export interface PeriodColumns {
  categories: string[];
  sales: number[];
  /** 비용 = 매출원가 + 경비 */
  cost: number[];
  profit: number[];
  /** 기별 학생 환원액 (규칙이 꺼져 있으면 null — 막대를 그리지 않아요) */
  studentReturn: number[] | null;
}

export function periodColumns(result: FinanceResult): PeriodColumns {
  return {
    categories: result.periods.map((period) => period.label),
    sales: result.periods.map((period) => period.salesYen),
    cost: result.periods.map((period) => period.costOfRevenueYen + period.costsYen),
    profit: result.periods.map((period) => period.profitYen),
    studentReturn: result.studentReturn ? result.studentReturn.periods.map((item) => item.returnYen) : null,
  };
}

export type AnnualRowId = "companies" | "matches" | "fee" | "ad" | "sales" | "cogs" | "costs" | "profit" | "cashBeforeReturn" | "returnReserve" | "studentReturn" | "donation" | "breakEven";

export interface AnnualRow {
  id: AnnualRowId;
  label: MessageKey;
  /** 이름표의 자리표시자 값 (예: 운전자금의 개월 수) */
  labelParams?: Record<string, string | number>;
  /** count = 개수(곳·건), money = 엔 (화면에서는 만 엔) */
  kind: "count" | "money";
  /** 기마다의 값. 손익분기를 넘길 수 없는 기는 null */
  values: (number | null)[];
  /** 전체 기간 합계 (더해도 뜻이 없는 행은 null) */
  total: number | null;
  /** 굵게 보여 줄 행 (매출 합계 · 경상이익) */
  strong: boolean;
}

/**
 * 연간 요약 표의 행: 위에서 아래로 읽으면 기업 수 → 건수 → 매출 → 비용 → 이익 → (학생 환원: 기말 자금 · 남길 운전자금 · 환원액) → 참고(기부액 · 손익분기).
 * 학생 환원 행은 규칙이 켜져 있을 때만 있어요.
 */
export function annualRows(result: FinanceResult): AnnualRow[] {
  const money = (id: AnnualRowId, label: MessageKey, pick: (period: PeriodResult) => number, strong = false): AnnualRow => ({
    id,
    label,
    kind: "money",
    values: result.periods.map(pick),
    total: result.periods.reduce((sum, period) => sum + pick(period), 0),
    strong,
  });
  return [
    { id: "companies", label: "admin.finance.annual.companies", kind: "count", values: result.periods.map((p) => p.companiesEnd), total: null, strong: false },
    { id: "matches", label: "admin.finance.annual.matches", kind: "count", values: result.periods.map((p) => p.matches), total: result.periods.reduce((sum, p) => sum + p.matches, 0), strong: false },
    money("fee", "admin.finance.annual.fee", (p) => p.feeRevenueYen),
    money("ad", "admin.finance.annual.ad", (p) => p.adRevenueYen),
    money("sales", "admin.finance.annual.sales", (p) => p.salesYen, true),
    money("cogs", "admin.finance.annual.cogs", (p) => p.costOfRevenueYen),
    money("costs", "admin.finance.annual.costs", (p) => p.costsYen),
    money("profit", "admin.finance.annual.profit", (p) => p.profitYen, true),
    ...returnRows(result),
    money("donation", "admin.finance.annual.donation", (p) => p.donationYen),
    // 손익분기는 "몇 사 이상"으로 올려서 보여 줘요 (12.0000001 같은 꼬리는 ceilCompanies 가 무시)
    { id: "breakEven", label: "admin.finance.annual.breakEven", kind: "count", values: result.periods.map((p) => (p.breakEvenCompanies === null ? null : ceilCompanies(p.breakEvenCompanies))), total: null, strong: false },
  ];
}

/** 학생 환원 세 줄: 기말 자금(환원 전) · 남길 운전자금(N개월분) · 환원액(합계 있음, 굵게). 규칙이 꺼져 있으면 빈 배열 */
function returnRows(result: FinanceResult): AnnualRow[] {
  const info = result.studentReturn;
  if (!info) return [];
  const values = (pick: (item: PeriodReturn) => number) => info.periods.map(pick);
  return [
    { id: "cashBeforeReturn", label: "admin.finance.annual.cashBeforeReturn", kind: "money", values: values((item) => item.cashBeforeYen), total: null, strong: false },
    { id: "returnReserve", label: "admin.finance.annual.returnReserve", labelParams: { months: info.reserveMonths }, kind: "money", values: values((item) => item.reserveYen), total: null, strong: false },
    { id: "studentReturn", label: "admin.finance.annual.studentReturn", kind: "money", values: values((item) => item.returnYen), total: info.totalYen, strong: true },
  ];
}

// ───────── 민감도 ─────────
export const SENSITIVITY_PARAM_LABEL: Record<SensitivityParam, MessageKey> = {
  matchRate: "admin.finance.sens.param.matchRate",
  feePerMatchYen: "admin.finance.sens.param.feePerMatchYen",
  adRevenuePerCompanyYen: "admin.finance.sens.param.adRevenuePerCompanyYen",
};

// ───────── 이름 · 번호 ─────────
/** 글자 수(UTF-16)가 max 를 넘지 않게 앞에서부터 자르되, 이모지 같은 서로게이트 쌍을 반으로 가르지 않아요 */
function clip(text: string, max: number): string {
  let out = "";
  for (const char of text) {
    if (out.length + char.length > max) break;
    out += char;
  }
  return out;
}

/** 이미 있는 이름과 겹치면 " (2)" " (3)" 을 붙여요. 시나리오 이름의 최대 길이(60자)는 넘지 않아요 */
export function uniqueName(base: string, taken: readonly string[]): string {
  const used = new Set(taken);
  const first = clip(base.trim(), MAX_NAME_LENGTH);
  if (!used.has(first)) return first;
  for (let n = 2; ; n += 1) {
    const suffix = ` (${n})`;
    const candidate = `${clip(first, MAX_NAME_LENGTH - suffix.length)}${suffix}`;
    if (!used.has(candidate)) return candidate;
  }
}

/** 복제한 시나리오의 이름: "提出版（コピー）". 이름이 길면 앞을 줄여서 "（コピー）"가 잘리지 않게 해요 */
export function copyName(name: string, locale: Locale, taken: readonly string[]): string {
  const suffix = translate("admin.finance.scenario.copySuffix", locale);
  return uniqueName(`${clip(name, MAX_NAME_LENGTH - suffix.length)}${suffix}`, taken);
}

/** 저장소 안에서만 쓰는 시나리오 번호. now 는 호출하는 쪽(이벤트 처리기)에서 Date.now() 로 넘겨요 */
export function newScenarioId(taken: readonly string[], now: number): string {
  const used = new Set(taken);
  const base = `s${Math.floor(now).toString(36)}`;
  let id = base;
  for (let n = 1; used.has(id); n += 1) id = `${base}-${n}`;
  return id;
}

/** 시나리오를 깊게 복사해요(복제 · 구조 편집용). 기와 경비 행을 새로 만들어서 원본과 객체를 공유하지 않아요 */
export function cloneScenario(scenario: FinanceScenario): FinanceScenario {
  return {
    ...scenario,
    periods: scenario.periods.map((period) => ({ ...period, costs: period.costs.map((cost) => ({ ...cost })) })),
    funding: { ...scenario.funding },
    // 학생 환원은 켜져 있을 때만 복사해요 (꺼진 시나리오에 빈 항목을 만들지 않게)
    ...(scenario.studentReturn ? { studentReturn: { ...scenario.studentReturn } } : {}),
  };
}

// ───────── 숫자 표기 ─────────
/** 소수 첫째 자리까지, 필요 없는 0 은 빼요: 3.5 → "3.5", 12 → "12", 1234.56 → "1,234.6" (월별 기업 수처럼 소수가 나오는 값용 — formatNumber 는 정수로 반올림해요) */
export function formatDecimal(value: number): string {
  if (!Number.isFinite(value)) return "-";
  const rounded = Math.round(value * 10) / 10;
  const [whole = "0", fraction = "0"] = Math.abs(rounded).toFixed(1).split(".");
  const sign = rounded < 0 ? "-" : "";
  return fraction === "0" ? `${sign}${formatNumber(Number(whole))}` : `${sign}${formatNumber(Number(whole))}.${fraction}`;
}
