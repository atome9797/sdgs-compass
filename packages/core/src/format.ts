// 날짜·금액·글자 수 표시. Intl 에 기대지 않고 직접 만들어서 Node·브라우저·Hermes(React Native)에서 똑같이 나와요.
// 날짜는 "YYYY-MM-DD", 날짜+시각은 "YYYY-MM-DDTHH:mm" (시간대 없이 기기의 현지 시각) 문자열로 다뤄요.
import type { Locale } from "./i18n";

const pad2 = (n: number) => String(n).padStart(2, "0");

function parseDate(iso: string): { y: number; m: number; d: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) throw new Error(`날짜 형식이 아니에요: ${iso}`);
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

/** Date → "YYYY-MM-DD" (기기의 현지 날짜) */
export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Date → "YYYY-MM-DDTHH:mm" (기기의 현지 시각) */
export function toIsoDateTime(date: Date): string {
  return `${toIsoDate(date)}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/** 두 날짜 사이의 날수 (to - from). 시각은 무시해요. */
export function daysBetween(fromIso: string, toIso: string): number {
  const a = parseDate(fromIso);
  const b = parseDate(toIso);
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86_400_000);
}

/** 날짜에 날수를 더해요 (음수 가능) */
export function addDays(iso: string, days: number): string {
  const { y, m, d } = parseDate(iso);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${pad2(t.getUTCMonth() + 1)}-${pad2(t.getUTCDate())}`;
}

/** 2026-11-19 → ja "2026年11月19日" / ko "2026년 11월 19일" */
export function formatDate(iso: string, locale: Locale): string {
  const { y, m, d } = parseDate(iso);
  return locale === "ja" ? `${y}年${m}月${d}日` : `${y}년 ${m}월 ${d}일`;
}

/** 2026-11-19 → "11/19" */
export function formatDateShort(iso: string): string {
  const { m, d } = parseDate(iso);
  return `${m}/${d}`;
}

/** 2026-11-19T14:30 → ja "2026年11月19日 14:30" */
export function formatDateTime(isoDateTime: string, locale: Locale): string {
  const time = /T(\d{2}:\d{2})/.exec(isoDateTime)?.[1];
  return time ? `${formatDate(isoDateTime, locale)} ${time}` : formatDate(isoDateTime, locale);
}

/** 1234567 → "1,234,567" */
export function formatNumber(n: number): string {
  const sign = n < 0 ? "-" : "";
  const digits = String(Math.round(Math.abs(n)));
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** 30000 → ja "¥30,000" / ko "30,000엔" */
export function formatYen(amount: number, locale: Locale): string {
  return locale === "ja" ? `¥${formatNumber(amount)}` : `${formatNumber(amount)}엔`;
}

/** 150 → ja "150名" / ko "150명" */
export function formatPeople(count: number, locale: Locale): string {
  return locale === "ja" ? `${formatNumber(count)}名` : `${formatNumber(count)}명`;
}

/** 1480 → "1,480 pt" */
export function formatPoints(points: number): string {
  return `${formatNumber(points)} pt`;
}

/** 2516582 → "2.4MB" */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/** 남은 날수 → "D-5" / "D-DAY" / (지난 경우) ja "締切済み" ko "마감" */
export function dDayLabel(daysLeft: number, locale: Locale): string {
  if (daysLeft > 0) return `D-${daysLeft}`;
  if (daysLeft === 0) return "D-DAY";
  return locale === "ja" ? "締切済み" : "마감";
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
