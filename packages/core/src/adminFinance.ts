// 운영자 화면 ③ 수지·자금 시뮬레이션의 계산. 기(期)별 숫자(기업 수 · 프로젝트 수 · 성사율 · 수수료 · 광고 단가 · 경비 …)를 넣으면
// 연 합계 · 월별 곡선 · 흑자 전환 시점 · 자금 잔액 · 손익분기 기업 수를 계산해요. React·DOM 이 없는 순수 함수예요.
// 계획 검토용 시산이에요: 세금 · 감가상각 · 운전자금 · 매출 시차는 다루지 않고, 경상이익을 그대로 현금 흐름으로 봐요. 가정은 docs/admin.md.
import type { Locale } from "./i18n";

export const MIN_PERIODS = 1;
export const MAX_PERIODS = 5;
export const MONTHS_PER_PERIOD = 12;
export const MAX_COST_ROWS = 30;
export const MAX_NAME_LENGTH = 60;
export const MAX_PERIOD_LABEL_LENGTH = 20;
export const MAX_COST_LABEL_LENGTH = 40;
/** 가져오는 JSON 글자 수 상한 (손으로 쓴 시나리오는 몇 KB 예요) */
export const MAX_JSON_LENGTH = 500_000;
/** 월별 값이 이만큼(엔) 이하로 모자라는 것은 0 으로 봐요 (부동소수 꼬리) */
const TOLERANCE_YEN = 0.5;

// ───────── 모양 ─────────
export interface FinanceCost {
  label: string;
  yen: number;
}

/** 한 기(期)의 가정. 금액은 엔 (소수 가능), 비율은 0~1 */
export interface FinancePeriod {
  label: string;
  /** 기말 참가 기업 수 (정수) */
  companiesEnd: number;
  /** 기업 1사당 연간 프로젝트 수 */
  projectsPerCompany: number;
  /** 프로젝트 중 매칭이 성사되는 비율 (0~1) */
  matchRate: number;
  /** 성사 1건당 수수료(엔) */
  feePerMatchYen: number;
  /** 수수료 중 기부하는 비율 (0~1) — 나머지가 운영 수익 */
  donationRate: number;
  /** 기업 1사당 연간 광고·게재 수입(엔, 소수 가능) */
  adRevenuePerCompanyYen: number;
  /** 매출원가(엔, 연간) */
  costOfRevenueYen: number;
  /** 경비 행 (인건비 · 임대료 …, 연간) */
  costs: FinanceCost[];
}

export interface FinanceFunding {
  equityYen: number;
  borrowingYen: number;
  /** 시작할 때 한 번 쓰는 비품·설비 지출 */
  capexYen: number;
  /** 한 기에 갚는 금액 (월 균등, 차입금을 넘겨서 갚지는 않아요) */
  repaymentYenPerPeriod: number;
}

/**
 * 학생 환원 규칙(선택): 각 기 말에 운전자금(그 기 경비 + 매출원가의 reserveMonths 개월분)을 남기고,
 * 그 기 경상이익 중 남는 금액 전부를 학생에게 환원했다고 보고 자금에서 빼요. 없으면(꺼짐) 환원하지 않아요.
 * 실제 배분 기준·세금은 이 시산 밖이에요(docs/admin.md).
 */
export interface FinanceStudentReturn {
  /** 남겨 둘 운전자금이 몇 개월분인지 (0~24 정수) */
  reserveMonths: number;
}

export interface FinanceScenario {
  schemaVersion: 1;
  name: string;
  periods: FinancePeriod[];
  /** 첫 기가 시작될 때의 기업 수 */
  startCompanies: number;
  funding: FinanceFunding;
  /** 학생 환원 규칙. 없으면 환원하지 않아요 (옛 JSON 은 이 항목이 없어요 — schemaVersion 은 1 그대로) */
  studentReturn?: FinanceStudentReturn;
}

/** 학생 환원을 켤 때의 기본값: 운전자금 3개월분을 남겨요 */
export const DEFAULT_RESERVE_MONTHS = 3;

// ───────── 입력 범위 (JSON 검사와 입력 폼이 같은 표를 써요) ─────────
export interface FieldSpec {
  min: number;
  max: number;
  integer?: boolean;
}

const YEN: FieldSpec = { min: 0, max: 1_000_000_000_000 };
const COMPANIES: FieldSpec = { min: 0, max: 1_000_000, integer: true };
const RATE: FieldSpec = { min: 0, max: 1 };

export const FINANCE_FIELD_SPEC = {
  companiesEnd: COMPANIES,
  startCompanies: COMPANIES,
  projectsPerCompany: { min: 0, max: 1000 } as FieldSpec,
  matchRate: RATE,
  donationRate: RATE,
  feePerMatchYen: YEN,
  adRevenuePerCompanyYen: YEN,
  costOfRevenueYen: YEN,
  costYen: YEN,
  equityYen: YEN,
  borrowingYen: YEN,
  capexYen: YEN,
  repaymentYenPerPeriod: YEN,
  reserveMonths: { min: 0, max: 24, integer: true } as FieldSpec,
} as const satisfies Record<string, FieldSpec>;

// ───────── 반올림 ─────────
/**
 * 엑셀 ROUND(x, 0) 처럼 반올림해요(.5 는 올림). 부동소수 꼬리(3.4999999999999996 은 사실 3.5)는
 * 유효숫자 15자리로 정리한 뒤 반올림해서 3.5 → 4 로 맞춰요. 연 매칭 건수가 이 규칙을 써요.
 */
export function roundHalfUp(x: number): number {
  if (!Number.isFinite(x)) return 0;
  const cleaned = Number(x.toPrecision(15));
  return cleaned >= 0 ? Math.round(cleaned) : -Math.round(-cleaned);
}

/** 연 매칭 건수 = ROUND(기말 기업 수 × 기업당 프로젝트 수 × 성사율). 건수는 정수예요 */
export function annualMatches(companiesEnd: number, projectsPerCompany: number, matchRate: number): number {
  return roundHalfUp(companiesEnd * projectsPerCompany * matchRate);
}

// ───────── 계산 결과 ─────────
export interface PeriodResult {
  label: string;
  companiesEnd: number;
  /** 연 매칭 건수 (정수로 반올림) */
  matches: number;
  /** 수수료 매출 = 건수 × 건당 수수료 × (1 − 기부 비율) */
  feeRevenueYen: number;
  /** 기부액 = 건수 × 건당 수수료 × 기부 비율 (매출이 아니에요 — 참고) */
  donationYen: number;
  /** 광고 매출 = 기말 기업 수 × 단가 */
  adRevenueYen: number;
  salesYen: number;
  costOfRevenueYen: number;
  /** 경비 합계 */
  costsYen: number;
  /** 경상이익 = 매출 − 매출원가 − 경비 */
  profitYen: number;
  /** 기업 1사당 연간 공헌이익 = 성사율 × 프로젝트 수 × 수수료 × (1 − 기부 비율) + 광고 단가 (건수 반올림은 하지 않아요) */
  contributionPerCompanyYen: number;
  /** 손익분기 기업 수 = (경비 + 매출원가) ÷ 1사당 공헌이익. 공헌이익이 0 이하라서 늘려도 못 넘는 경우 null (소수 — 화면에서는 올려서 보여요) */
  breakEvenCompanies: number | null;
}

export interface FinanceMonth {
  /** 1 ~ 12 × 기 수 (시작 시점은 0 이고 start 에 있어요) */
  month: number;
  /** 0부터 */
  periodIndex: number;
  /** 1~12 */
  monthInPeriod: number;
  /** 월말 기업 수 (기 사이를 직선으로 이은 값, 소수) */
  companies: number;
  salesYen: number;
  costOfRevenueYen: number;
  costsYen: number;
  profitYen: number;
  cumulativeProfitYen: number;
  /** 이 달에 학생에게 환원한 금액 (환원은 기의 마지막 달에만, 규칙이 꺼져 있으면 늘 0) */
  studentReturnYen: number;
  /** 이 달까지의 누적 환원액 */
  cumulativeReturnYen: number;
  /** 월말 자금 잔액 = 자기자금 + 차입금 − 비품 + 누적 손익 − 누적 상환 − 누적 환원 */
  cashYen: number;
}

/** 한 기의 학생 환원 계산 (기 말에 한 번) */
export interface PeriodReturn {
  /** 기말 자금(환원 전) */
  cashBeforeYen: number;
  /** 남겨 둘 운전자금 = reserveMonths × (경비 + 매출원가) ÷ 12 */
  reserveYen: number;
  /** 환원액 = max(0, min(그 기 경상이익, 기말 자금 − 운전자금)) */
  returnYen: number;
}

export interface StudentReturnResult {
  reserveMonths: number;
  /** 기마다 (periods 와 같은 순서) */
  periods: PeriodReturn[];
  /** 표시한 기간의 환원 합계 */
  totalYen: number;
  /** 처음 환원하는 기 (0부터). 표시한 기간에 없으면 null */
  firstPeriodIndex: number | null;
}

export interface FinanceMilestones {
  /** 월 경상이익이 0 이상이 되어 그 뒤로 계속 0 이상인 첫 달 (1부터). 끝까지 못 가면 null. 1 이면 처음부터 흑자 */
  profitTurnaroundMonth: number | null;
  /** 누적 손익이 0 이상이 되어 그 뒤로 계속 0 이상인 첫 달 */
  cumulativeBreakEvenMonth: number | null;
  /** 자금 잔액이 처음 0 미만이 되는 달. 0 이면 시작 시점부터 부족(조달액 < 비품 지출). 안 모자라면 null */
  cashShortMonth: number | null;
  /** 가장 잔액이 적은 때 (month 0 = 시작 시점) */
  lowestCash: { month: number; yen: number };
}

export interface FinanceResult {
  periods: PeriodResult[];
  months: FinanceMonth[];
  /** 시작 시점 (month 0): 기업 수 · 자금 잔액 = 자기자금 + 차입금 − 비품 */
  start: { companies: number; cashYen: number };
  milestones: FinanceMilestones;
  /** studentReturnYen: 표시한 기간의 학생 환원 합계 (규칙이 꺼져 있으면 0) */
  totals: { salesYen: number; profitYen: number; studentReturnYen: number };
  /** 학생 환원 규칙의 계산. 규칙이 꺼져 있으면 null */
  studentReturn: StudentReturnResult | null;
  /** 마지막 달의 자금 잔액(환원 뒤) */
  finalCashYen: number;
  /** 마지막 달의 누적 손익(환원과 무관 — 흑자 전환·손익분기도 환원 전 이익으로 계산해요) */
  finalCumulativeProfitYen: number;
}

export function evaluatePeriod(p: FinancePeriod): PeriodResult {
  const matches = annualMatches(p.companiesEnd, p.projectsPerCompany, p.matchRate);
  const feeRevenueYen = matches * p.feePerMatchYen * (1 - p.donationRate);
  const donationYen = matches * p.feePerMatchYen * p.donationRate;
  const adRevenueYen = p.companiesEnd * p.adRevenuePerCompanyYen;
  const salesYen = feeRevenueYen + adRevenueYen;
  const costsYen = p.costs.reduce((sum, cost) => sum + cost.yen, 0);
  const contributionPerCompanyYen = p.matchRate * p.projectsPerCompany * p.feePerMatchYen * (1 - p.donationRate) + p.adRevenuePerCompanyYen;
  const fixedYen = costsYen + p.costOfRevenueYen;
  let breakEvenCompanies: number | null;
  if (fixedYen <= 0) breakEvenCompanies = 0;
  else if (contributionPerCompanyYen <= 0) breakEvenCompanies = null;
  else breakEvenCompanies = fixedYen / contributionPerCompanyYen;
  return {
    label: p.label,
    companiesEnd: p.companiesEnd,
    matches,
    feeRevenueYen,
    donationYen,
    adRevenueYen,
    salesYen,
    costOfRevenueYen: p.costOfRevenueYen,
    costsYen,
    profitYen: salesYen - p.costOfRevenueYen - costsYen,
    contributionPerCompanyYen,
    breakEvenCompanies,
  };
}

/** 끝까지 조건을 계속 만족하는 가장 이른 위치(0부터). 마지막 값이 조건을 어기면 -1 */
function firstSustained(values: readonly number[], ok: (value: number) => boolean): number {
  let start = -1;
  for (let i = values.length - 1; i >= 0; i--) {
    if (!ok(values[i])) break;
    start = i;
  }
  return start;
}

/**
 * 학생 환원액(기 말): 운전자금(reserveMonths × (경비 + 매출원가) ÷ 12)을 남기고, 그 기 경상이익 중 남는 금액 전부.
 * 적자인 기·자금이 운전자금에 못 미치는 기는 0. 지난 기의 이익·조달금은 환원하지 않아요(그 기 이익이 상한).
 */
export function periodReturnYen(profitYen: number, cashBeforeYen: number, reserveYen: number): number {
  if (profitYen <= 0) return 0;
  const amount = Math.min(profitYen, cashBeforeYen - reserveYen);
  return amount > TOLERANCE_YEN ? amount : 0;
}

/** 남겨 둘 운전자금 = reserveMonths × (그 기 경비 + 매출원가) ÷ 12 */
export function returnReserveYen(period: Pick<PeriodResult, "costsYen" | "costOfRevenueYen">, reserveMonths: number): number {
  return (reserveMonths * (period.costsYen + period.costOfRevenueYen)) / MONTHS_PER_PERIOD;
}

/**
 * 월별 곡선(가정): 기업 수는 기 사이를 직선으로 이어 월말 값을 만들고, 그 기의 연 매출·매출원가를 월별 기업 수의 비율로 나눠요
 * (합계는 그대로, 기업이 늘면 매출도 점점 느는 모양). 경비는 12 등분이에요.
 * 학생 환원 규칙이 있으면 기의 마지막 달에 환원액을 자금에서 빼요(손익·흑자 전환·손익분기에는 넣지 않아요).
 */
export function simulate(scenario: FinanceScenario): FinanceResult {
  const { funding } = scenario;
  const periods = scenario.periods.map(evaluatePeriod);
  const openingCash = funding.equityYen + funding.borrowingYen - funding.capexYen;
  const reserveMonths = scenario.studentReturn ? scenario.studentReturn.reserveMonths : null;
  const months: FinanceMonth[] = [];
  const periodReturns: PeriodReturn[] = [];
  let previousEnd = scenario.startCompanies;
  let cumulativeProfit = 0;
  let cumulativeRepayment = 0;
  let cumulativeReturn = 0;
  periods.forEach((period, periodIndex) => {
    const end = period.companiesEnd;
    const companies = Array.from({ length: MONTHS_PER_PERIOD }, (_, i) => (i === MONTHS_PER_PERIOD - 1 ? end : previousEnd + ((end - previousEnd) * (i + 1)) / MONTHS_PER_PERIOD));
    const total = companies.reduce((sum, c) => sum + c, 0);
    for (let i = 0; i < MONTHS_PER_PERIOD; i++) {
      const weight = total > 0 ? companies[i] / total : 1 / MONTHS_PER_PERIOD;
      const salesYen = period.salesYen * weight;
      const costOfRevenueYen = period.costOfRevenueYen * weight;
      const costsYen = period.costsYen / MONTHS_PER_PERIOD;
      const profitYen = salesYen - costOfRevenueYen - costsYen;
      cumulativeProfit += profitYen;
      const repayment = Math.max(0, Math.min(funding.repaymentYenPerPeriod / MONTHS_PER_PERIOD, funding.borrowingYen - cumulativeRepayment));
      cumulativeRepayment += repayment;
      const cashBefore = openingCash + cumulativeProfit - cumulativeRepayment - cumulativeReturn;
      // 기의 마지막 달에 환원해요 (규칙이 꺼져 있으면 건너뛰어요)
      let studentReturnYen = 0;
      if (reserveMonths !== null && i === MONTHS_PER_PERIOD - 1) {
        const reserveYen = returnReserveYen(period, reserveMonths);
        studentReturnYen = periodReturnYen(period.profitYen, cashBefore, reserveYen);
        periodReturns.push({ cashBeforeYen: cashBefore, reserveYen, returnYen: studentReturnYen });
      }
      cumulativeReturn += studentReturnYen;
      months.push({
        month: periodIndex * MONTHS_PER_PERIOD + i + 1,
        periodIndex,
        monthInPeriod: i + 1,
        companies: companies[i],
        salesYen,
        costOfRevenueYen,
        costsYen,
        profitYen,
        cumulativeProfitYen: cumulativeProfit,
        studentReturnYen,
        cumulativeReturnYen: cumulativeReturn,
        cashYen: cashBefore - studentReturnYen,
      });
    }
    previousEnd = end;
  });

  const monthAt = (index: number): number | null => (index < 0 ? null : months[index].month);
  const profitTurnaroundMonth = monthAt(firstSustained(months.map((m) => m.profitYen), (v) => v >= -TOLERANCE_YEN));
  const cumulativeBreakEvenMonth = monthAt(firstSustained(months.map((m) => m.cumulativeProfitYen), (v) => v >= -TOLERANCE_YEN));
  let cashShortMonth: number | null = null;
  if (openingCash < -TOLERANCE_YEN) cashShortMonth = 0;
  else cashShortMonth = monthAt(months.findIndex((m) => m.cashYen < -TOLERANCE_YEN));
  let lowestCash = { month: 0, yen: openingCash };
  for (const m of months) if (m.cashYen < lowestCash.yen) lowestCash = { month: m.month, yen: m.cashYen };
  const last = months[months.length - 1];
  let studentReturn: StudentReturnResult | null = null;
  if (reserveMonths !== null) {
    const firstIndex = periodReturns.findIndex((item) => item.returnYen > 0);
    studentReturn = {
      reserveMonths,
      periods: periodReturns,
      totalYen: cumulativeReturn,
      firstPeriodIndex: firstIndex < 0 ? null : firstIndex,
    };
  }
  return {
    periods,
    months,
    start: { companies: scenario.startCompanies, cashYen: openingCash },
    milestones: { profitTurnaroundMonth, cumulativeBreakEvenMonth, cashShortMonth, lowestCash },
    totals: { salesYen: periods.reduce((sum, p) => sum + p.salesYen, 0), profitYen: periods.reduce((sum, p) => sum + p.profitYen, 0), studentReturnYen: cumulativeReturn },
    studentReturn,
    finalCashYen: last ? last.cashYen : openingCash,
    finalCumulativeProfitYen: last ? last.cumulativeProfitYen : 0,
  };
}

/** 표시 위치: 13 → { period: 2, month: 1 } (period 는 1부터) */
export function monthPosition(month: number): { period: number; month: number } {
  return { period: Math.floor((month - 1) / MONTHS_PER_PERIOD) + 1, month: ((month - 1) % MONTHS_PER_PERIOD) + 1 };
}

/** 손익분기 기업 수를 "몇 사 이상"으로: 12.0000001 같은 꼬리는 무시하고 올려요 */
export function ceilCompanies(value: number): number {
  return Math.ceil(Number(value.toPrecision(12)));
}

// ───────── 민감도 ─────────
export const SENSITIVITY_PARAMS = ["matchRate", "feePerMatchYen", "adRevenuePerCompanyYen"] as const;
export type SensitivityParam = (typeof SENSITIVITY_PARAMS)[number];
/** 모든 기의 값을 이 비율만큼 바꿔 봐요 (−30% ~ +30%) */
export const SENSITIVITY_FACTORS = [-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3] as const;

export interface SensitivityRow {
  factor: number;
  profitTurnaroundMonth: number | null;
  cashShortMonth: number | null;
  lastPeriodProfitYen: number;
  finalCashYen: number;
  /** 표시한 기간의 학생 환원 합계 (규칙이 꺼져 있으면 0) */
  totalReturnYen: number;
}

/** 한 항목을 모든 기에서 (1 + factor) 배로. 성사율은 100% 를 넘지 않게 잘라요 */
export function scaleScenario(scenario: FinanceScenario, param: SensitivityParam, factor: number): FinanceScenario {
  return {
    ...scenario,
    periods: scenario.periods.map((period) => {
      const scaled = period[param] * (1 + factor);
      return { ...period, [param]: param === "matchRate" ? Math.min(1, Math.max(0, scaled)) : Math.max(0, scaled) };
    }),
  };
}

export function sensitivity(scenario: FinanceScenario, param: SensitivityParam): SensitivityRow[] {
  return SENSITIVITY_FACTORS.map((factor) => {
    const result = simulate(scaleScenario(scenario, param, factor));
    const lastPeriod = result.periods[result.periods.length - 1];
    return {
      factor,
      profitTurnaroundMonth: result.milestones.profitTurnaroundMonth,
      cashShortMonth: result.milestones.cashShortMonth,
      lastPeriodProfitYen: lastPeriod ? lastPeriod.profitYen : 0,
      finalCashYen: result.finalCashYen,
      totalReturnYen: result.totals.studentReturnYen,
    };
  });
}

// ───────── 인건비 계산기 ─────────
export interface LaborInput {
  people: number;
  hourlyYen: number;
  hoursPerWeek: number;
  weeksPerYear: number;
}

/** 인원 × 시급 × 주당 시간 × 연간 주수 (엔, 반올림). 값이 이상하면(음수 · 주 53 이상 · 주 168시간 초과 · 숫자 아님) null */
export function laborCostYen(input: LaborInput): number | null {
  const { people, hourlyYen, hoursPerWeek, weeksPerYear } = input;
  const all = [people, hourlyYen, hoursPerWeek, weeksPerYear];
  if (!all.every((v) => Number.isFinite(v) && v >= 0)) return null;
  if (weeksPerYear > 53 || hoursPerWeek > 168 || people > FINANCE_FIELD_SPEC.companiesEnd.max || hourlyYen > 1_000_000) return null;
  return Math.round(people * hourlyYen * hoursPerWeek * weeksPerYear);
}

// ───────── 입력 칸 읽기 (JSON 과 같은 범위 표) ─────────
export type NumberFieldError = "empty" | "not_number" | "not_integer" | "out_of_range";
export type NumberFieldResult = { ok: true; value: number } | { ok: false; error: NumberFieldError };

/** 전각 숫자·기호(１２，３４５．６)를 반각으로 — 일본어 입력기로 쳐도 읽혀요 */
function toHalfWidth(text: string): string {
  return text
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[，、]/g, ",")
    .replace(/[．。]/g, ".")
    .replace(/[－−ー]/g, "-")
    .replace(/[％]/g, "%");
}

/** "1,200,000" · "35294.12" · "１２０" 를 숫자로. 범위(spec)를 벗어나면 이유를 돌려줘요 */
export function parseFieldNumber(text: string, spec: FieldSpec): NumberFieldResult {
  const trimmed = toHalfWidth(text).trim();
  if (trimmed === "") return { ok: false, error: "empty" };
  const plain = /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(trimmed) ? trimmed.replace(/,/g, "") : trimmed;
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(plain)) return { ok: false, error: "not_number" };
  const value = Number(plain);
  if (!Number.isFinite(value)) return { ok: false, error: "not_number" };
  if (spec.integer && !Number.isInteger(value)) return { ok: false, error: "not_integer" };
  if (value < spec.min || value > spec.max) return { ok: false, error: "out_of_range" };
  return { ok: true, value };
}

/** 비율 칸은 퍼센트로 입력해요: "8" → 0.08, "7.5%" → 0.075 */
export function parseFieldPercent(text: string): NumberFieldResult {
  const result = parseFieldNumber(toHalfWidth(text).trim().replace(/%$/, ""), { min: 0, max: 100 });
  if (!result.ok) return result;
  return { ok: true, value: Math.round(result.value * 1e4) / 1e6 };
}

/** 0.075 → "7.5" (입력 칸에 보여 줄 퍼센트 글자) */
export function ratioToPercentText(ratio: number): string {
  return String(Math.round(ratio * 1e6) / 1e4);
}

/** 금액·수를 입력 칸에 보여 줄 글자 (소수 6자리까지, 꼬리 0 은 없애요) */
export function numberToFieldText(value: number): string {
  return String(Math.round(value * 1e6) / 1e6);
}

// ───────── 시나리오 JSON ─────────
export type FinanceIssueCode =
  | "not_json"
  | "not_object"
  | "schema_version"
  | "missing"
  | "not_number"
  | "not_integer"
  | "out_of_range"
  | "not_string"
  | "empty_string"
  | "too_long"
  | "not_array"
  | "periods_count"
  | "too_many_costs";

export interface FinanceIssue {
  code: FinanceIssueCode;
  /** 예: "periods[1].matchRate" · 전체가 문제이면 "" */
  path: string;
  min?: number;
  max?: number;
}

export type ScenarioParseResult = { ok: true; scenario: FinanceScenario } | { ok: false; issues: FinanceIssue[] };

type Json = Record<string, unknown>;
const isObject = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value);

function readNumber(source: Json, key: string, path: string, spec: FieldSpec, issues: FinanceIssue[], fallback?: number): number | null {
  const at = path === "" ? key : `${path}.${key}`;
  const value = source[key];
  if (value === undefined) {
    if (fallback !== undefined) return fallback;
    issues.push({ code: "missing", path: at });
    return null;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    issues.push({ code: "not_number", path: at });
    return null;
  }
  if (spec.integer && !Number.isInteger(value)) {
    issues.push({ code: "not_integer", path: at });
    return null;
  }
  if (value < spec.min || value > spec.max) {
    issues.push({ code: "out_of_range", path: at, min: spec.min, max: spec.max });
    return null;
  }
  return value;
}

function readString(source: Json, key: string, path: string, maxLength: number, issues: FinanceIssue[]): string | null {
  const at = path === "" ? key : `${path}.${key}`;
  const value = source[key];
  if (value === undefined) {
    issues.push({ code: "missing", path: at });
    return null;
  }
  if (typeof value !== "string") {
    issues.push({ code: "not_string", path: at });
    return null;
  }
  const trimmed = value.trim();
  if (trimmed === "") {
    issues.push({ code: "empty_string", path: at });
    return null;
  }
  if (trimmed.length > maxLength) {
    issues.push({ code: "too_long", path: at, max: maxLength });
    return null;
  }
  return trimmed;
}

/** 이미 읽은 JSON 값(객체)을 검사해서 시나리오로. 모르는 키는 무시하고, 틀린 곳은 모두 모아서 알려요 */
export function validateScenario(value: unknown): ScenarioParseResult {
  const issues: FinanceIssue[] = [];
  if (!isObject(value)) return { ok: false, issues: [{ code: "not_object", path: "" }] };
  if (value.schemaVersion === undefined) issues.push({ code: "missing", path: "schemaVersion" });
  else if (value.schemaVersion !== 1) issues.push({ code: "schema_version", path: "schemaVersion" });

  const name = readString(value, "name", "", MAX_NAME_LENGTH, issues);
  const startCompanies = readNumber(value, "startCompanies", "", FINANCE_FIELD_SPEC.startCompanies, issues, 0);

  const periods: FinancePeriod[] = [];
  const rawPeriods = value.periods;
  if (rawPeriods === undefined) issues.push({ code: "missing", path: "periods" });
  else if (!Array.isArray(rawPeriods)) issues.push({ code: "not_array", path: "periods" });
  else if (rawPeriods.length < MIN_PERIODS || rawPeriods.length > MAX_PERIODS) issues.push({ code: "periods_count", path: "periods", min: MIN_PERIODS, max: MAX_PERIODS });
  else {
    rawPeriods.forEach((raw: unknown, i: number) => {
      const path = `periods[${i}]`;
      if (!isObject(raw)) {
        issues.push({ code: "not_object", path });
        return;
      }
      const before = issues.length;
      const label = readString(raw, "label", path, MAX_PERIOD_LABEL_LENGTH, issues);
      const companiesEnd = readNumber(raw, "companiesEnd", path, FINANCE_FIELD_SPEC.companiesEnd, issues);
      const projectsPerCompany = readNumber(raw, "projectsPerCompany", path, FINANCE_FIELD_SPEC.projectsPerCompany, issues);
      const matchRate = readNumber(raw, "matchRate", path, FINANCE_FIELD_SPEC.matchRate, issues);
      const feePerMatchYen = readNumber(raw, "feePerMatchYen", path, FINANCE_FIELD_SPEC.feePerMatchYen, issues);
      const donationRate = readNumber(raw, "donationRate", path, FINANCE_FIELD_SPEC.donationRate, issues);
      const adRevenuePerCompanyYen = readNumber(raw, "adRevenuePerCompanyYen", path, FINANCE_FIELD_SPEC.adRevenuePerCompanyYen, issues);
      const costOfRevenueYen = readNumber(raw, "costOfRevenueYen", path, FINANCE_FIELD_SPEC.costOfRevenueYen, issues, 0);
      const costs: FinanceCost[] = [];
      if (raw.costs === undefined) issues.push({ code: "missing", path: `${path}.costs` });
      else if (!Array.isArray(raw.costs)) issues.push({ code: "not_array", path: `${path}.costs` });
      else if (raw.costs.length > MAX_COST_ROWS) issues.push({ code: "too_many_costs", path: `${path}.costs`, max: MAX_COST_ROWS });
      else {
        raw.costs.forEach((rawCost: unknown, j: number) => {
          const costPath = `${path}.costs[${j}]`;
          if (!isObject(rawCost)) {
            issues.push({ code: "not_object", path: costPath });
            return;
          }
          const costLabel = readString(rawCost, "label", costPath, MAX_COST_LABEL_LENGTH, issues);
          const yen = readNumber(rawCost, "yen", costPath, FINANCE_FIELD_SPEC.costYen, issues);
          if (costLabel !== null && yen !== null) costs.push({ label: costLabel, yen });
        });
      }
      if (
        issues.length === before &&
        label !== null &&
        companiesEnd !== null &&
        projectsPerCompany !== null &&
        matchRate !== null &&
        feePerMatchYen !== null &&
        donationRate !== null &&
        adRevenuePerCompanyYen !== null &&
        costOfRevenueYen !== null
      ) {
        periods.push({ label, companiesEnd, projectsPerCompany, matchRate, feePerMatchYen, donationRate, adRevenuePerCompanyYen, costOfRevenueYen, costs });
      }
    });
  }

  let funding: FinanceFunding | null = null;
  if (value.funding === undefined) issues.push({ code: "missing", path: "funding" });
  else if (!isObject(value.funding)) issues.push({ code: "not_object", path: "funding" });
  else {
    const before = issues.length;
    const equityYen = readNumber(value.funding, "equityYen", "funding", FINANCE_FIELD_SPEC.equityYen, issues);
    const borrowingYen = readNumber(value.funding, "borrowingYen", "funding", FINANCE_FIELD_SPEC.borrowingYen, issues);
    const capexYen = readNumber(value.funding, "capexYen", "funding", FINANCE_FIELD_SPEC.capexYen, issues);
    const repaymentYenPerPeriod = readNumber(value.funding, "repaymentYenPerPeriod", "funding", FINANCE_FIELD_SPEC.repaymentYenPerPeriod, issues, 0);
    if (issues.length === before && equityYen !== null && borrowingYen !== null && capexYen !== null && repaymentYenPerPeriod !== null) {
      funding = { equityYen, borrowingYen, capexYen, repaymentYenPerPeriod };
    }
  }

  // 학생 환원(선택): 없거나 null 이면 꺼짐. 객체이면 reserveMonths(없으면 기본 3)를 읽어요
  let studentReturn: FinanceStudentReturn | null = null;
  const rawReturn = value.studentReturn;
  if (rawReturn !== undefined && rawReturn !== null) {
    if (!isObject(rawReturn)) issues.push({ code: "not_object", path: "studentReturn" });
    else {
      const reserveMonths = readNumber(rawReturn, "reserveMonths", "studentReturn", FINANCE_FIELD_SPEC.reserveMonths, issues, DEFAULT_RESERVE_MONTHS);
      if (reserveMonths !== null) studentReturn = { reserveMonths };
    }
  }

  if (issues.length > 0 || name === null || startCompanies === null || funding === null) return { ok: false, issues };
  const scenario: FinanceScenario = { schemaVersion: 1, name, periods, startCompanies, funding };
  if (studentReturn) scenario.studentReturn = studentReturn;
  return { ok: true, scenario };
}

/** JSON 글자를 읽어요 (UTF-8 BOM 허용). 읽을 수 없으면 not_json */
export function parseScenarioJson(text: string): ScenarioParseResult {
  if (text.length > MAX_JSON_LENGTH) return { ok: false, issues: [{ code: "too_long", path: "", max: MAX_JSON_LENGTH }] };
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    return { ok: false, issues: [{ code: "not_json", path: "" }] };
  }
  return validateScenario(value);
}

/** 보기 좋게 들여쓴 JSON (키 순서가 늘 같아요) */
export function serializeScenarioJson(scenario: FinanceScenario): string {
  const body = {
    schemaVersion: 1,
    name: scenario.name,
    periods: scenario.periods.map((p) => ({
      label: p.label,
      companiesEnd: p.companiesEnd,
      projectsPerCompany: p.projectsPerCompany,
      matchRate: p.matchRate,
      feePerMatchYen: p.feePerMatchYen,
      donationRate: p.donationRate,
      adRevenuePerCompanyYen: p.adRevenuePerCompanyYen,
      costOfRevenueYen: p.costOfRevenueYen,
      costs: p.costs.map((c) => ({ label: c.label, yen: c.yen })),
    })),
    startCompanies: scenario.startCompanies,
    funding: {
      equityYen: scenario.funding.equityYen,
      borrowingYen: scenario.funding.borrowingYen,
      capexYen: scenario.funding.capexYen,
      repaymentYenPerPeriod: scenario.funding.repaymentYenPerPeriod,
    },
    // 학생 환원은 켜져 있을 때만 적어요 (꺼진 시나리오의 JSON 은 옛 모양 그대로)
    ...(scenario.studentReturn ? { studentReturn: { reserveMonths: scenario.studentReturn.reserveMonths } } : {}),
  };
  return `${JSON.stringify(body, null, 2)}\n`;
}

/** 학생 환원 규칙을 켜거나(운전자금 reserveMonths 개월분) 꺼요(null). 끄면 항목 자체를 없애요 */
export function withStudentReturn(scenario: FinanceScenario, reserveMonths: number | null): FinanceScenario {
  const next: FinanceScenario = { schemaVersion: 1, name: scenario.name, periods: scenario.periods, startCompanies: scenario.startCompanies, funding: scenario.funding };
  if (reserveMonths !== null) next.studentReturn = { reserveMonths };
  return next;
}

// ───────── 새 시나리오 · 편집 ─────────
export const defaultPeriodLabel = (n: number, locale: Locale): string => (locale === "ja" ? `第${n}期` : `제${n}기`);

const blankPeriod = (n: number, locale: Locale): FinancePeriod => ({
  label: defaultPeriodLabel(n, locale),
  companiesEnd: 0,
  projectsPerCompany: 0,
  matchRate: 0,
  feePerMatchYen: 0,
  donationRate: 0,
  adRevenuePerCompanyYen: 0,
  costOfRevenueYen: 0,
  costs: [],
});

/** 빈 시나리오: 3기, 모든 값이 0 (여기서부터 입력해요) */
export function blankScenario(name: string, locale: Locale): FinanceScenario {
  return {
    schemaVersion: 1,
    name,
    periods: [1, 2, 3].map((n) => blankPeriod(n, locale)),
    startCompanies: 0,
    funding: { equityYen: 0, borrowingYen: 0, capexYen: 0, repaymentYenPerPeriod: 0 },
  };
}

/** 마지막 기를 복사해서 한 기를 더해요 (최대 MAX_PERIODS) */
export function addPeriod(scenario: FinanceScenario, locale: Locale): FinanceScenario {
  if (scenario.periods.length >= MAX_PERIODS) return scenario;
  const last = scenario.periods[scenario.periods.length - 1];
  const next: FinancePeriod = last
    ? { ...last, label: defaultPeriodLabel(scenario.periods.length + 1, locale), costs: last.costs.map((c) => ({ ...c })) }
    : blankPeriod(1, locale);
  return { ...scenario, periods: [...scenario.periods, next] };
}

/** 한 기를 빼요 (최소 MIN_PERIODS 는 남겨요) */
export function removePeriod(scenario: FinanceScenario, index: number): FinanceScenario {
  if (scenario.periods.length <= MIN_PERIODS || index < 0 || index >= scenario.periods.length) return scenario;
  return { ...scenario, periods: scenario.periods.filter((_, i) => i !== index) };
}

// ───────── 샘플 시나리오(가상) ─────────
/**
 * 화면에 들어 있는 유일한 시나리오: 이름도 값도 지어낸 가상의 것이에요(실제 계획과 무관).
 * 3기에 걸쳐 기업이 늘고, 3기 중반에 월 경상이익이 흑자로 돌아서는 모양을 보여 줘요.
 */
export function sampleScenario(locale: Locale): FinanceScenario {
  const ja = locale === "ja";
  return {
    schemaVersion: 1,
    name: ja ? "サンプルシナリオ（仮想の値）" : "샘플 시나리오(가상 값)",
    periods: [
      {
        label: defaultPeriodLabel(1, locale),
        companiesEnd: 12,
        projectsPerCompany: 15,
        matchRate: 0.1,
        feePerMatchYen: 30000,
        donationRate: 0.5,
        adRevenuePerCompanyYen: 40000,
        costOfRevenueYen: 0,
        costs: [
          { label: ja ? "人件費" : "인건비", yen: 2400000 },
          { label: ja ? "家賃・サーバーなど" : "임대료·서버 등", yen: 600000 },
        ],
      },
      {
        label: defaultPeriodLabel(2, locale),
        companiesEnd: 40,
        projectsPerCompany: 15,
        matchRate: 0.11,
        feePerMatchYen: 30000,
        donationRate: 0.5,
        adRevenuePerCompanyYen: 40000,
        costOfRevenueYen: 0,
        costs: [
          { label: ja ? "人件費" : "인건비", yen: 3200000 },
          { label: ja ? "家賃・サーバーなど" : "임대료·서버 등", yen: 700000 },
          { label: ja ? "広告宣伝費" : "광고 선전비", yen: 400000 },
        ],
      },
      {
        label: defaultPeriodLabel(3, locale),
        companiesEnd: 100,
        projectsPerCompany: 16,
        matchRate: 0.12,
        feePerMatchYen: 30000,
        donationRate: 0.5,
        adRevenuePerCompanyYen: 40000,
        costOfRevenueYen: 0,
        costs: [
          { label: ja ? "人件費" : "인건비", yen: 4200000 },
          { label: ja ? "家賃・サーバーなど" : "임대료·서버 등", yen: 900000 },
          { label: ja ? "広告宣伝費" : "광고 선전비", yen: 600000 },
        ],
      },
    ],
    startCompanies: 0,
    funding: { equityYen: 3000000, borrowingYen: 6000000, capexYen: 1000000, repaymentYenPerPeriod: 0 },
    // 3기에 흑자가 되면, 운전자금 3개월분을 남기고 남는 이익을 학생에게 환원하는 모양을 보여 줘요
    studentReturn: { reserveMonths: DEFAULT_RESERVE_MONTHS },
  };
}
