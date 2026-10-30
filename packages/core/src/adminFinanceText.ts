// 운영자 화면 ③ 수지·자금 시뮬레이션의 "말로 풀어 쓰기": 계산 결과(adminFinance.ts)를 요약 문장으로, JSON·입력 칸의 오류를 사람이 읽는 문구로 바꿔요.
// React·DOM 이 없는 순수 함수라 문장을 시험으로 못 박아요. 문구 사전은 messages/adminFinance.ts.
// 정직하게 쓰는 것이 원칙이에요: 표시한 기간 안에서 일어나지 않는 일은 "오지 않는다"가 아니라 "표시한 기간(○기) 안에서는 …"이라고 써요.
import { ceilCompanies, defaultPeriodLabel, monthPosition, type FieldSpec, type FinanceIssue, type FinanceIssueCode, type FinanceResult, type FinanceScenario, type NumberFieldError } from "./adminFinance";
import { formatManYen } from "./adminFormat";
import { formatNumber } from "./format";
import type { Locale } from "./i18n";
import { translate, type MessageKey } from "./messages";

/** 월 번호를 말로: 0 → "開始時点", 13 → "第2期の1か月目" (기 이름은 시나리오에 적은 것 그대로) */
export function monthText(scenario: FinanceScenario, month: number, locale: Locale): string {
  if (month <= 0) return translate("admin.finance.when.start", locale);
  const { period, month: monthInPeriod } = monthPosition(month);
  const label = scenario.periods[period - 1]?.label ?? defaultPeriodLabel(period, locale);
  return translate("admin.finance.when.month", locale, { period: label, n: monthInPeriod });
}

/** 월 경상이익이 흑자로 돌아서는 때 */
export function turnaroundSentence(scenario: FinanceScenario, result: FinanceResult, locale: Locale): string {
  const month = result.milestones.profitTurnaroundMonth;
  if (month === null) return translate("admin.finance.summary.turnaroundNever", locale, { periods: scenario.periods.length });
  if (month === 1) return translate("admin.finance.summary.turnaroundFirst", locale);
  return translate("admin.finance.summary.turnaround", locale, { when: monthText(scenario, month, locale) });
}

/** 누적 손익이 플러스가 되는 때 */
export function cumulativeSentence(scenario: FinanceScenario, result: FinanceResult, locale: Locale): string {
  const month = result.milestones.cumulativeBreakEvenMonth;
  if (month === null) return translate("admin.finance.summary.cumulativeNever", locale, { periods: scenario.periods.length });
  if (month === 1) return translate("admin.finance.summary.cumulativeFirst", locale);
  return translate("admin.finance.summary.cumulative", locale, { when: monthText(scenario, month, locale) });
}

/** 자금이 모자라는 때 (모자라지 않으면 가장 적었던 잔액을 알려요) */
export function cashSentence(scenario: FinanceScenario, result: FinanceResult, locale: Locale): string {
  const { cashShortMonth, lowestCash } = result.milestones;
  if (cashShortMonth === 0) return translate("admin.finance.summary.cashShortStart", locale);
  if (cashShortMonth !== null) return translate("admin.finance.summary.cashShort", locale, { when: monthText(scenario, cashShortMonth, locale) });
  return translate("admin.finance.summary.cashOk", locale, {
    periods: scenario.periods.length,
    when: monthText(scenario, lowestCash.month, locale),
    amount: formatManYen(lowestCash.yen, locale),
  });
}

/** 기마다의 손익분기 기업 수("第1期 15社・第2期 なし …"). 늘려도 못 넘는 기(1사당 공헌이익이 0 이하)는 "なし" */
export function breakEvenSentence(scenario: FinanceScenario, result: FinanceResult, locale: Locale): string {
  const items = result.periods.map((period, index) => {
    const label = scenario.periods[index]?.label ?? period.label;
    if (period.breakEvenCompanies === null) return translate("admin.finance.summary.breakEvenNone", locale, { label });
    return translate("admin.finance.summary.breakEvenItem", locale, { label, n: formatNumber(ceilCompanies(period.breakEvenCompanies)) });
  });
  return translate("admin.finance.summary.breakEven", locale, { list: items.join(translate("admin.finance.summary.breakEvenSep", locale)) });
}

export function finalSentence(result: FinanceResult, locale: Locale): string {
  return translate("admin.finance.summary.final", locale, {
    profit: formatManYen(result.finalCumulativeProfitYen, locale),
    cash: formatManYen(result.finalCashYen, locale),
  });
}

/** 결과 요약 다섯 줄: 흑자 전환 · 누적 플러스 · 자금 · 손익분기 기업 수 · 마지막 달의 값 */
export function financeSummary(scenario: FinanceScenario, result: FinanceResult, locale: Locale): string[] {
  return [
    turnaroundSentence(scenario, result, locale),
    cumulativeSentence(scenario, result, locale),
    cashSentence(scenario, result, locale),
    breakEvenSentence(scenario, result, locale),
    finalSentence(result, locale),
  ];
}

/** 겹쳐 비교할 때 시나리오마다 한 줄로: 흑자 전환 + 자금 */
export function compareSentence(scenario: FinanceScenario, result: FinanceResult, locale: Locale): string {
  return `${turnaroundSentence(scenario, result, locale)}${locale === "ja" ? "" : " "}${cashSentence(scenario, result, locale)}`;
}

// ───────── 오류 문구 ─────────
const ISSUE_REASON_KEY: Record<FinanceIssueCode, MessageKey> = {
  not_json: "admin.finance.reason.not_json",
  not_object: "admin.finance.reason.not_object",
  schema_version: "admin.finance.reason.schema_version",
  missing: "admin.finance.reason.missing",
  not_number: "admin.finance.reason.not_number",
  not_integer: "admin.finance.reason.not_integer",
  out_of_range: "admin.finance.reason.out_of_range",
  not_string: "admin.finance.reason.not_string",
  empty_string: "admin.finance.reason.empty_string",
  too_long: "admin.finance.reason.too_long",
  not_array: "admin.finance.reason.not_array",
  periods_count: "admin.finance.reason.periods_count",
  too_many_costs: "admin.finance.reason.too_many_costs",
};

/** JSON 의 틀린 곳 하나를 "periods[1].matchRate：0以上1以下で指定してください" 처럼 (위치는 JSON 경로 그대로, 이유는 말로) */
export function issueText(issue: FinanceIssue, locale: Locale): string {
  const reason = translate(ISSUE_REASON_KEY[issue.code], locale, {
    min: formatNumber(issue.min ?? 0),
    max: formatNumber(issue.max ?? 0),
  });
  const where = issue.path === "" ? translate("admin.finance.json.whole", locale) : issue.path;
  return translate("admin.finance.json.issue", locale, { where, reason });
}

const FIELD_ERROR_KEY: Record<NumberFieldError, MessageKey> = {
  empty: "admin.finance.error.empty",
  not_number: "admin.finance.error.not_number",
  not_integer: "admin.finance.error.not_integer",
  out_of_range: "admin.finance.error.out_of_range",
};

/** 입력 칸의 오류 문구. 범위는 칸의 규칙(spec)에서 가져와요 (퍼센트 칸은 0~100) */
export function fieldErrorText(error: NumberFieldError, spec: FieldSpec, locale: Locale): string {
  return translate(FIELD_ERROR_KEY[error], locale, { min: formatNumber(spec.min), max: formatNumber(spec.max) });
}
