// 운영자 화면(admin*)이 쓰는 숫자 표기. format.ts 에 없는 것만 여기에 둬요 (Intl 에 기대지 않아서 Node·브라우저에서 똑같이 나와요).
import { formatNumber } from "./format";
import type { Locale } from "./i18n";

/** 사람이 보기 좋은 "만 단위" 숫자: 소수 첫째 자리까지, 1,000 이상이면 정수. 2010000 → "201", 2016000 → "201.6", -1110000 → "-111", 12345678 → "1,235" */
export function formatMan(yen: number): string {
  const value = yen / 10_000;
  if (!Number.isFinite(value)) return "-";
  if (Math.abs(value) >= 1000) return formatNumber(value);
  const rounded = Math.round(value * 10) / 10;
  // -0 도 "0" 으로 보여요
  if (rounded === 0) return "0";
  return `${rounded < 0 ? "-" : ""}${Math.abs(rounded)}`;
}

/** 2010000 → ja "201万円" / ko "201만 엔" */
export function formatManYen(yen: number, locale: Locale): string {
  return locale === "ja" ? `${formatMan(yen)}万円` : `${formatMan(yen)}만 엔`;
}

/** 0.0834 → "8.3%" (digits 로 소수 자릿수를 정해요) */
export function formatPercent(ratio: number, digits = 1): string {
  if (!Number.isFinite(ratio)) return "-";
  const text = (ratio * 100).toFixed(digits);
  return `${Object.is(Number(text), -0) ? (0).toFixed(digits) : text}%`;
}

/** 0.042 → "+4.2%", -0.031 → "-3.1%", 0 → "0.0%" (늘었는지 줄었는지 부호로 알려요) */
export function formatSignedPercent(ratio: number, digits = 1): string {
  if (!Number.isFinite(ratio)) return "-";
  const text = (ratio * 100).toFixed(digits);
  const n = Number(text);
  if (n === 0) return `${(0).toFixed(digits)}%`;
  return `${n > 0 ? "+" : ""}${text}%`;
}

/** 비율끼리의 차이를 퍼센트포인트로: 0.032 - 0.030 → "+0.2pt" */
export function formatPointDelta(diffRatio: number, digits = 1): string {
  if (!Number.isFinite(diffRatio)) return "-";
  const text = (diffRatio * 100).toFixed(digits);
  const n = Number(text);
  if (n === 0) return `${(0).toFixed(digits)}pt`;
  return `${n > 0 ? "+" : ""}${text}pt`;
}

/** 부호가 있는 정수 차이: 12 → "+12", -3 → "-3", 0 → "0" */
export function formatSignedNumber(n: number): string {
  if (!Number.isFinite(n)) return "-";
  const rounded = Math.round(n);
  if (rounded === 0) return "0";
  return `${rounded > 0 ? "+" : ""}${formatNumber(rounded)}`;
}

/** 그래프 눈금용 짧은 숫자: 10,000 미만은 그대로, 그 이상은 12K / 1.2M (한 축에서는 한 가지 스타일로) */
export function formatCompact(n: number): string {
  if (!Number.isFinite(n)) return "-";
  const abs = Math.abs(n);
  if (abs < 10_000) return formatNumber(n);
  const trim = (value: number) => String(Math.round(value * 10) / 10);
  if (abs < 1_000_000) return `${n < 0 ? "-" : ""}${trim(abs / 1000)}K`;
  return `${n < 0 ? "-" : ""}${trim(abs / 1_000_000)}M`;
}
