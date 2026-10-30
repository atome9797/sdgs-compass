// 운영자 화면 ② SNS 지표: 주 1회 각 SNS 분석 화면의 숫자를 붙여 넣고(수동 입력 · CSV), 추이와 최신 주 비교를 계산해요.
// 외부 SNS 에 연결하지 않아요(API 연동은 하지 않는 데모) — 사람이 옮겨 적은 숫자를 다루는 순수 함수만 있어요. 설계는 docs/admin.md.
import { formatPercent, formatPointDelta, formatSignedPercent } from "./adminFormat";
import { addDays, daysBetween, formatNumber } from "./format";
import type { MessageKey } from "./messages";

// ───────── 모양 ─────────
export const SNS_CHANNELS = ["x", "instagram", "facebook", "youtube"] as const;
export type SnsChannel = (typeof SNS_CHANNELS)[number];

/** 브랜드 이름은 번역하지 않아요 (CSV 의 channel 값과 같은 이름) */
export const SNS_CHANNEL_NAME: Record<SnsChannel, string> = { x: "X", instagram: "Instagram", facebook: "Facebook", youtube: "YouTube" };

export function isSnsChannel(value: unknown): value is SnsChannel {
  return SNS_CHANNELS.some((channel) => channel === value);
}

/** 한 주·한 SNS 의 숫자 한 줄 (YouTube 는 followers = 구독자 수, reach = 조회수로 넣어요) */
export interface SnsRow {
  /** 월요일 (YYYY-MM-DD) */
  weekStart: string;
  channel: SnsChannel;
  /** 0 이상의 정수 */
  followers: number;
  /** 0 이상의 정수 */
  reach: number;
  /** 0~1, 모르면 null */
  engagementRate: number | null;
  /** 0 이상의 정수 */
  linkClicks: number;
}

export const SNS_METRICS = ["followers", "reach", "engagementRate", "linkClicks"] as const;
export type SnsMetric = (typeof SNS_METRICS)[number];

export const SNS_METRIC_LABEL: Record<SnsMetric, MessageKey> = {
  followers: "admin.sns.metric.followers",
  reach: "admin.sns.metric.reach",
  engagementRate: "admin.sns.metric.engagementRate",
  linkClicks: "admin.sns.metric.linkClicks",
};

/** 값이 너무 커서 오타일 때를 막는 상한 (1조) */
const MAX_COUNT = 1_000_000_000_000;

// ───────── 날짜(월요일) ─────────
function isRealDate(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

/** "2026-10-26" · "2026/10/26" · "2026-1-5" 를 "YYYY-MM-DD" 로. 없는 날짜(2026-02-30)는 null */
export function normalizeDate(text: string): string | null {
  const match = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(text.trim());
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (!isRealDate(y, m, d)) return null;
  return `${match[1]}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** 0=일요일 … 6=토요일 */
function weekdayOf(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export const isMonday = (iso: string): boolean => weekdayOf(iso) === 1;

/** 그 날이 속한 주의 월요일 (월요일이면 그 날) */
export function mondayOf(iso: string): string {
  return addDays(iso, -((weekdayOf(iso) + 6) % 7));
}

// ───────── 값 한 칸 읽기 (CSV 와 입력 폼이 같은 규칙을 써요) ─────────
/** "1234" · "1,234" → 1234. 0 이상의 정수만 */
export function parseCount(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed) && !/^\d{1,3}(,\d{3})+$/.test(trimmed)) return null;
  const value = Number(trimmed.replace(/,/g, ""));
  return Number.isSafeInteger(value) && value <= MAX_COUNT ? value : null;
}

/** CSV 의 참여율: 빈칸 → null(모름) · "0.032" → 0.032 · "3.2%" → 0.032. 0~1(0~100%) 밖이거나 "3.2" 처럼 헷갈리는 값은 읽지 않아요 */
export function parseRate(text: string): { value: number | null } | null {
  const trimmed = text.trim();
  if (trimmed === "") return { value: null };
  const percent = /^(\d+(?:\.\d+)?)\s*%$/.exec(trimmed);
  if (percent) {
    const value = Number(percent[1]) / 100;
    return value <= 1 ? { value: roundRate(value) } : null;
  }
  if (/^(?:\d+\.?\d*|\.\d+)$/.test(trimmed)) {
    const value = Number(trimmed);
    return value <= 1 ? { value: roundRate(value) } : null;
  }
  return null;
}

/** 입력 폼의 참여율(％): "3.2" → 0.032. 빈칸은 null, 0~100 밖은 읽지 않아요 */
export function parseRatePercent(text: string): { value: number | null } | null {
  const trimmed = text.trim().replace(/%$/, "").trim();
  if (trimmed === "") return { value: null };
  if (!/^(?:\d+\.?\d*|\.\d+)$/.test(trimmed)) return null;
  const percent = Number(trimmed);
  return percent <= 100 ? { value: roundRate(percent / 100) } : null;
}

/** 0.1+0.2 같은 부동소수 꼬리를 없애요 (소수 6자리) */
const roundRate = (value: number): number => Math.round(value * 1e6) / 1e6;

const CHANNEL_ALIASES: Record<string, SnsChannel> = {
  x: "x",
  twitter: "x",
  instagram: "instagram",
  ig: "instagram",
  facebook: "facebook",
  fb: "facebook",
  youtube: "youtube",
  yt: "youtube",
};

export function parseChannel(text: string): SnsChannel | null {
  return CHANNEL_ALIASES[text.trim().toLowerCase()] ?? null;
}

// ───────── CSV 읽기 ─────────
export const SNS_CSV_HEADER = "week,channel,followers,reach,engagement_rate,link_clicks";
/** 한 번에 가져올 수 있는 데이터 행 수 (4채널 × 5년이 넘으면 오타나 다른 파일일 가능성이 커요) */
export const SNS_CSV_MAX_ROWS = 2000;

export type SnsCsvReason =
  | "header_missing"
  | "empty"
  | "too_many_rows"
  | "columns"
  | "bad_date"
  | "not_monday"
  | "bad_channel"
  | "bad_followers"
  | "bad_reach"
  | "bad_link_clicks"
  | "bad_engagement_rate"
  | "duplicate_in_file";

export const SNS_CSV_REASON_KEY: Record<SnsCsvReason, MessageKey> = {
  header_missing: "admin.sns.csv.reason.header_missing",
  empty: "admin.sns.csv.reason.empty",
  too_many_rows: "admin.sns.csv.reason.too_many_rows",
  columns: "admin.sns.csv.reason.columns",
  bad_date: "admin.sns.csv.reason.bad_date",
  not_monday: "admin.sns.csv.reason.not_monday",
  bad_channel: "admin.sns.csv.reason.bad_channel",
  bad_followers: "admin.sns.csv.reason.bad_followers",
  bad_reach: "admin.sns.csv.reason.bad_reach",
  bad_link_clicks: "admin.sns.csv.reason.bad_link_clicks",
  bad_engagement_rate: "admin.sns.csv.reason.bad_engagement_rate",
  duplicate_in_file: "admin.sns.csv.reason.duplicate_in_file",
};

export interface SnsCsvIssue {
  /** 파일의 줄 번호 (1부터, 머리글이 1줄). 따옴표 안에서 줄바꿈이 있는 칸은 그 행이 시작한 줄 */
  line: number;
  reason: SnsCsvReason;
}

export interface SnsCsvResult {
  /** 읽은 행 (파일 순서). 같은 주·같은 SNS 가 겹치면 뒤의 행만 남아요 */
  rows: SnsRow[];
  /** 읽지 못한 행 — 나머지 행은 그대로 가져와요 */
  errors: SnsCsvIssue[];
  /** 읽었지만 알려 줄 것 (겹친 행 등) */
  warnings: SnsCsvIssue[];
}

interface CsvRecord {
  line: number;
  fields: string[];
}

/** 쉼표 · 탭 · 세미콜론 중 머리글 줄에 가장 많이 나온 것 (표 계산 소프트에서 복사하면 탭이에요). 따옴표 안은 세지 않아요 */
function detectDelimiter(text: string): string {
  const counts: Record<string, number> = { ",": 0, "\t": 0, ";": 0 };
  let inQuotes = false;
  let seenContent = false;
  for (const ch of text) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && (ch === "\n" || ch === "\r")) {
      if (seenContent) break;
    } else if (!inQuotes) {
      if (ch.trim() !== "" || ch === "\t") seenContent = true;
      if (ch in counts) counts[ch] += 1;
    }
  }
  let best = ",";
  for (const candidate of ["\t", ";"]) if (counts[candidate] > counts[best]) best = candidate;
  return best;
}

/** 따옴표 안의 쉼표·줄바꿈·"" 를 지키는 CSV 나누기 (CRLF · LF · CR 모두). 완전히 빈 줄은 건너뛰어요 */
function splitCsv(text: string, delimiter: string): CsvRecord[] {
  const records: CsvRecord[] = [];
  let fields: string[] = [];
  let field = "";
  let inQuotes = false;
  let fieldStarted = false;
  let line = 1;
  let recordLine = 1;
  const endField = () => {
    fields.push(field);
    field = "";
    fieldStarted = false;
  };
  const endRecord = () => {
    endField();
    if (fields.some((f) => f.trim() !== "")) records.push({ line: recordLine, fields });
    fields = [];
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else {
        if (ch === "\n") line += 1;
        field += ch;
      }
      continue;
    }
    if (ch === '"' && !fieldStarted) {
      inQuotes = true;
      fieldStarted = true;
    } else if (ch === delimiter) {
      endField();
    } else if (ch === "\r" || ch === "\n") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      endRecord();
      line += 1;
      recordLine = line;
    } else {
      field += ch;
      fieldStarted = true;
    }
  }
  if (field !== "" || fields.length > 0 || fieldStarted) endRecord();
  return records;
}

const normalizeHeader = (name: string): string => name.trim().toLowerCase().replace(/[\s-]+/g, "_");

/**
 * SNS 지표 CSV 를 읽어요. 틀린 행은 줄 번호와 이유를 돌려주고 나머지는 그대로 가져와요.
 * - UTF-8 BOM · CRLF · 따옴표 · 쉼표/탭/세미콜론 구분 · 열 순서 자유(머리글 이름으로 찾아요) · 모르는 열은 무시
 * - week 는 월요일 (2026-10-26 · 2026/10/26), channel 은 x/twitter · instagram/ig · facebook/fb · youtube/yt (대소문자 무관)
 */
export function parseSnsCsv(text: string): SnsCsvResult {
  const result: SnsCsvResult = { rows: [], errors: [], warnings: [] };
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const records = splitCsv(source, detectDelimiter(source));
  if (records.length === 0) {
    result.errors.push({ line: 1, reason: "empty" });
    return result;
  }
  const header = records[0].fields.map(normalizeHeader);
  const column = (name: string) => header.indexOf(name);
  const index = {
    week: column("week"),
    channel: column("channel"),
    followers: column("followers"),
    reach: column("reach"),
    rate: column("engagement_rate"),
    clicks: column("link_clicks"),
  };
  if (index.week < 0 || index.channel < 0 || index.followers < 0 || index.reach < 0 || index.clicks < 0) {
    result.errors.push({ line: records[0].line, reason: "header_missing" });
    return result;
  }
  const body = records.slice(1);
  if (body.length === 0) {
    result.errors.push({ line: records[0].line, reason: "empty" });
    return result;
  }
  if (body.length > SNS_CSV_MAX_ROWS) {
    result.errors.push({ line: body[SNS_CSV_MAX_ROWS].line, reason: "too_many_rows" });
    return result;
  }
  const seen = new Map<string, { at: number; line: number }>();
  for (const record of body) {
    const fail = (reason: SnsCsvReason) => result.errors.push({ line: record.line, reason });
    if (record.fields.length !== header.length) {
      fail("columns");
      continue;
    }
    const cell = (i: number) => (i < 0 ? "" : record.fields[i]);
    const weekStart = normalizeDate(cell(index.week));
    if (weekStart === null) {
      fail("bad_date");
      continue;
    }
    if (!isMonday(weekStart)) {
      fail("not_monday");
      continue;
    }
    const channel = parseChannel(cell(index.channel));
    if (channel === null) {
      fail("bad_channel");
      continue;
    }
    const followers = parseCount(cell(index.followers));
    if (followers === null) {
      fail("bad_followers");
      continue;
    }
    const reach = parseCount(cell(index.reach));
    if (reach === null) {
      fail("bad_reach");
      continue;
    }
    const linkClicks = parseCount(cell(index.clicks));
    if (linkClicks === null) {
      fail("bad_link_clicks");
      continue;
    }
    const rate = parseRate(cell(index.rate));
    if (rate === null) {
      fail("bad_engagement_rate");
      continue;
    }
    const row: SnsRow = { weekStart, channel, followers, reach, engagementRate: rate.value, linkClicks };
    const key = `${weekStart}|${channel}`;
    const earlier = seen.get(key);
    if (earlier) {
      result.warnings.push({ line: earlier.line, reason: "duplicate_in_file" });
      result.rows[earlier.at] = row;
      seen.set(key, { at: earlier.at, line: record.line });
    } else {
      seen.set(key, { at: result.rows.length, line: record.line });
      result.rows.push(row);
    }
  }
  return result;
}

// ───────── CSV 쓰기 ─────────
const rateText = (rate: number | null): string => (rate === null ? "" : String(roundRate(rate)));

/** 행들을 CSV 로 (UTF-8 BOM + CRLF — 엑셀에서 바로 열려요). 값에 쉼표·따옴표가 없어서 따옴표는 필요 없어요 */
export function serializeSnsCsv(rows: readonly SnsRow[]): string {
  const lines = [SNS_CSV_HEADER, ...sortSnsRows(rows).map((r) => [r.weekStart, r.channel, r.followers, r.reach, rateText(r.engagementRate), r.linkClicks].join(","))];
  return `﻿${lines.join("\r\n")}\r\n`;
}

// ───────── 정렬 · 합치기 ─────────
/** 주 오름차순, 같은 주는 SNS 순서(X · Instagram · Facebook · YouTube) */
export function sortSnsRows(rows: readonly SnsRow[]): SnsRow[] {
  return [...rows].sort((a, b) => a.weekStart.localeCompare(b.weekStart) || SNS_CHANNELS.indexOf(a.channel) - SNS_CHANNELS.indexOf(b.channel));
}

const rowKey = (row: Pick<SnsRow, "weekStart" | "channel">): string => `${row.weekStart}|${row.channel}`;
const sameValues = (a: SnsRow, b: SnsRow): boolean =>
  a.followers === b.followers && a.reach === b.reach && a.engagementRate === b.engagementRate && a.linkClicks === b.linkClicks;

export interface SnsImportPlan {
  /** 합친 결과 (정렬됨) */
  rows: SnsRow[];
  added: number;
  /** 값이 달라서 덮어쓰는 행 — 0 보다 크면 사용자에게 확인을 받아요 */
  replaced: number;
  /** 이미 같은 값이라 바뀌지 않는 행 */
  unchanged: number;
}

/** 같은 (주, SNS)는 새 값으로 덮어써요. 실제로 값이 바뀌는 행만 replaced 로 세요 */
export function planSnsImport(existing: readonly SnsRow[], incoming: readonly SnsRow[]): SnsImportPlan {
  const map = new Map(existing.map((row) => [rowKey(row), row]));
  let added = 0;
  let replaced = 0;
  let unchanged = 0;
  for (const row of incoming) {
    const before = map.get(rowKey(row));
    if (!before) added += 1;
    else if (sameValues(before, row)) unchanged += 1;
    else replaced += 1;
    map.set(rowKey(row), row);
  }
  return { rows: sortSnsRows([...map.values()]), added, replaced, unchanged };
}

/** 한 행 지우기 */
export function removeSnsRow(rows: readonly SnsRow[], target: Pick<SnsRow, "weekStart" | "channel">): SnsRow[] {
  return rows.filter((row) => rowKey(row) !== rowKey(target));
}

// ───────── 수동 입력 ─────────
/** 입력 폼의 글자 그대로 (숫자도 문자열) */
export interface SnsDraft {
  weekStart: string;
  channel: string;
  followers: string;
  reach: string;
  /** 퍼센트로 (예: "3.2") */
  engagementPercent: string;
  linkClicks: string;
}

export type SnsDraftField = "weekStart" | "channel" | "followers" | "reach" | "engagementPercent" | "linkClicks";
/** week = 월요일 날짜가 아님 · count = 0 이상의 정수가 아님 · rate = 0~100 이 아님 · channel = 목록에 없는 SNS (선택 상자라 보통은 나오지 않아요) */
export type SnsDraftError = "week" | "count" | "rate" | "channel";

export const SNS_DRAFT_ERROR_KEY: Record<SnsDraftError, MessageKey> = {
  week: "admin.sns.error.week",
  count: "admin.sns.error.count",
  rate: "admin.sns.error.rate",
  channel: "admin.sns.csv.reason.bad_channel",
};

export type SnsDraftResult = { ok: true; row: SnsRow } | { ok: false; errors: Partial<Record<SnsDraftField, SnsDraftError>> };

export function validateSnsDraft(draft: SnsDraft): SnsDraftResult {
  const errors: Partial<Record<SnsDraftField, SnsDraftError>> = {};
  const weekStart = normalizeDate(draft.weekStart);
  if (weekStart === null || !isMonday(weekStart)) errors.weekStart = "week";
  const channel = parseChannel(draft.channel);
  if (channel === null) errors.channel = "channel";
  const followers = parseCount(draft.followers);
  if (followers === null) errors.followers = "count";
  const reach = parseCount(draft.reach);
  if (reach === null) errors.reach = "count";
  const linkClicks = parseCount(draft.linkClicks);
  if (linkClicks === null) errors.linkClicks = "count";
  const rate = parseRatePercent(draft.engagementPercent);
  if (rate === null) errors.engagementPercent = "rate";
  if (Object.keys(errors).length > 0 || weekStart === null || channel === null || followers === null || reach === null || linkClicks === null || rate === null) {
    return { ok: false, errors };
  }
  return { ok: true, row: { weekStart, channel, followers, reach, engagementRate: rate.value, linkClicks } };
}

// ───────── 저장된 값 검사 ─────────
/** 브라우저에 저장된 값(JSON)에서 올바른 행만 걸러요. 깨진 행은 조용히 버려요 (저장소가 오래됐거나 직접 고쳤을 때) */
export function sanitizeSnsRows(value: unknown): SnsRow[] {
  if (!Array.isArray(value)) return [];
  const count = (v: unknown): number | null => (typeof v === "number" && Number.isSafeInteger(v) && v >= 0 && v <= MAX_COUNT ? v : null);
  const rows: SnsRow[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const r = item as Record<string, unknown>;
    const weekStart = typeof r.weekStart === "string" ? normalizeDate(r.weekStart) : null;
    const channel = isSnsChannel(r.channel) ? r.channel : null;
    const followers = count(r.followers);
    const reach = count(r.reach);
    const linkClicks = count(r.linkClicks);
    let engagementRate: number | null = null;
    if (r.engagementRate !== null && r.engagementRate !== undefined) {
      if (typeof r.engagementRate !== "number" || !(r.engagementRate >= 0 && r.engagementRate <= 1)) continue;
      engagementRate = r.engagementRate;
    }
    if (weekStart === null || !isMonday(weekStart) || channel === null || followers === null || reach === null || linkClicks === null) continue;
    rows.push({ weekStart, channel, followers, reach, engagementRate, linkClicks });
  }
  return planSnsImport([], rows).rows;
}

// ───────── 추이 ─────────
/** 그래프에 그리는 최대 주 수 (1년). 더 오래된 주는 표(CSV)에만 있어요 */
export const SNS_CHART_MAX_WEEKS = 52;

/** 가장 오래된 주 ~ 가장 최근 주를 빈 주 없이 이어서 (빠진 주는 그래프에서 끊긴 선으로 보여요) */
export function snsChartWeeks(rows: readonly SnsRow[], maxWeeks: number = SNS_CHART_MAX_WEEKS): string[] {
  if (rows.length === 0) return [];
  const weeks = rows.map((row) => row.weekStart).sort();
  const first = weeks[0];
  const last = weeks[weeks.length - 1];
  const count = Math.min(daysBetween(first, last) / 7 + 1, maxWeeks);
  const start = addDays(last, -7 * (count - 1));
  return Array.from({ length: count }, (_, i) => addDays(start, 7 * i));
}

export interface SnsChartSeries {
  channel: SnsChannel;
  /** weeks 와 같은 길이. 그 주 입력이 없으면 null */
  values: (number | null)[];
}

/** 지표 하나의 SNS 별 계열. 그 기간에 값이 하나도 없는 SNS 는 빼요 (예: 참여율을 비워 둔 SNS) */
export function snsChartSeries(rows: readonly SnsRow[], metric: SnsMetric, weeks: readonly string[]): SnsChartSeries[] {
  const byKey = new Map(rows.map((row) => [rowKey(row), row]));
  const series: SnsChartSeries[] = [];
  for (const channel of SNS_CHANNELS) {
    const values = weeks.map((week) => byKey.get(`${week}|${channel}`)?.[metric] ?? null);
    if (values.some((v) => v !== null)) series.push({ channel, values });
  }
  return series;
}

// ───────── 최신 주 비교 ─────────
export function snsLatestWeek(rows: readonly SnsRow[]): string | null {
  return rows.length === 0 ? null : rows.map((row) => row.weekStart).sort().at(-1) ?? null;
}

export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** 늘고 준 정도. 건수 지표는 비율(ratio), 참여율은 퍼센트포인트(points) */
export interface SnsDelta {
  kind: "ratio" | "points";
  /** ratio: 0.042 = +4.2% / points: 0.002 = +0.2pt */
  amount: number;
  /** 건수 지표의 늘어난 개수 (참여율은 amount 와 같아요) */
  abs: number;
}

export function snsDelta(metric: SnsMetric, value: number | null, base: number | null): SnsDelta | null {
  if (value === null || base === null) return null;
  if (metric === "engagementRate") return { kind: "points", amount: value - base, abs: value - base };
  if (base === 0) return value === 0 ? { kind: "ratio", amount: 0, abs: 0 } : null;
  return { kind: "ratio", amount: value / base - 1, abs: value - base };
}

/** 증감을 짧은 글자로: "+4.2%" · "+0.2pt" · 계산할 수 없으면 "-" */
export function formatSnsDelta(delta: SnsDelta | null): string {
  if (delta === null) return "-";
  return delta.kind === "points" ? formatPointDelta(delta.amount) : formatSignedPercent(delta.amount);
}

/** 지표 값을 글자로: 건수는 쉼표, 참여율은 % (모르면 "-") */
export function formatSnsValue(metric: SnsMetric, value: number | null): string {
  if (value === null) return "-";
  return metric === "engagementRate" ? formatPercent(value) : formatNumber(value);
}

export interface SnsComparisonCell {
  /** 최신 주의 값 (그 주 입력이 없으면 null) */
  value: number | null;
  /** 바로 앞 주의 값 */
  prev: number | null;
  /** 최신 주 앞의 4주 가운데 입력이 있는 주의 중앙값 (2주 미만이면 null) */
  median4: number | null;
  vsPrev: SnsDelta | null;
  vsMedian: SnsDelta | null;
}

export interface SnsComparisonRow {
  channel: SnsChannel;
  /** 최신 주에 입력이 있는지 */
  hasLatest: boolean;
  cells: Record<SnsMetric, SnsComparisonCell>;
}

export interface SnsComparison {
  latestWeek: string | null;
  rows: SnsComparisonRow[];
}

/** 최신 주를 바로 앞 주 · 앞 4주의 중앙값과 비교해요. 입력이 한 번이라도 있는 SNS 만 나와요 */
export function compareLatestWeek(rows: readonly SnsRow[]): SnsComparison {
  const latestWeek = snsLatestWeek(rows);
  if (latestWeek === null) return { latestWeek, rows: [] };
  const byKey = new Map(rows.map((row) => [rowKey(row), row]));
  const result: SnsComparisonRow[] = [];
  for (const channel of SNS_CHANNELS) {
    if (!rows.some((row) => row.channel === channel)) continue;
    const latest = byKey.get(`${latestWeek}|${channel}`) ?? null;
    const prevRow = byKey.get(`${addDays(latestWeek, -7)}|${channel}`) ?? null;
    const before = [1, 2, 3, 4].flatMap((n) => {
      const row = byKey.get(`${addDays(latestWeek, -7 * n)}|${channel}`);
      return row ? [row] : [];
    });
    const cells = {} as Record<SnsMetric, SnsComparisonCell>;
    for (const metric of SNS_METRICS) {
      const value = latest ? latest[metric] : null;
      const prev = prevRow ? prevRow[metric] : null;
      const pool = before.flatMap((row) => (row[metric] === null ? [] : [row[metric] as number]));
      const median4 = pool.length >= 2 ? median(pool) : null;
      cells[metric] = { value, prev, median4, vsPrev: snsDelta(metric, value, prev), vsMedian: snsDelta(metric, value, median4) };
    }
    result.push({ channel, hasLatest: latest !== null, cells });
  }
  return { latestWeek, rows: result };
}

// ───────── 샘플(가상) ─────────
interface SampleColumn {
  followers: number[];
  reach: number[];
  rate: number[];
  clicks: number[];
}

/** 4채널 × 8주. 모두 가상의 값이에요 (실제 계정과 무관 — 시연에서 그래프가 보이게 하려는 모양만). 7번째 주에 캠페인으로 오른 것으로 */
const SAMPLE: Record<SnsChannel, SampleColumn> = {
  x: {
    followers: [812, 826, 839, 861, 874, 903, 951, 978],
    reach: [5200, 5600, 5100, 6400, 6100, 7900, 11800, 9200],
    rate: [0.021, 0.024, 0.019, 0.027, 0.025, 0.031, 0.044, 0.033],
    clicks: [38, 44, 35, 58, 51, 77, 140, 96],
  },
  instagram: {
    followers: [1290, 1322, 1349, 1391, 1428, 1475, 1560, 1604],
    reach: [8100, 8600, 9200, 9900, 10400, 12100, 17800, 14300],
    rate: [0.036, 0.038, 0.035, 0.041, 0.04, 0.045, 0.058, 0.049],
    clicks: [52, 60, 55, 72, 70, 96, 188, 133],
  },
  facebook: {
    followers: [538, 541, 545, 548, 553, 556, 561, 567],
    reach: [2100, 1900, 2300, 2000, 2200, 2600, 3100, 2700],
    rate: [0.012, 0.011, 0.013, 0.012, 0.014, 0.015, 0.019, 0.016],
    clicks: [21, 18, 24, 19, 22, 30, 41, 33],
  },
  youtube: {
    followers: [262, 266, 273, 277, 285, 291, 306, 318],
    reach: [1450, 1320, 1710, 1580, 1890, 2040, 3350, 2480],
    rate: [0.052, 0.049, 0.057, 0.054, 0.06, 0.058, 0.071, 0.063],
    clicks: [16, 14, 22, 19, 26, 29, 61, 38],
  },
};

export const SAMPLE_WEEKS = 8;

/** 기준일이 속한 주를 마지막으로 하는 가상 샘플 4채널 × 8주 (정렬됨) */
export function sampleSnsRows(today: string): SnsRow[] {
  const lastWeek = mondayOf(today);
  const rows: SnsRow[] = [];
  for (let w = 0; w < SAMPLE_WEEKS; w++) {
    const weekStart = addDays(lastWeek, -7 * (SAMPLE_WEEKS - 1 - w));
    for (const channel of SNS_CHANNELS) {
      const column = SAMPLE[channel];
      rows.push({ weekStart, channel, followers: column.followers[w], reach: column.reach[w], engagementRate: column.rate[w], linkClicks: column.clicks[w] });
    }
  }
  return sortSnsRows(rows);
}

/** 내려받는 견본 CSV: 머리글 + 가상 샘플의 가장 최근 주 (4행) */
export function snsTemplateCsv(today: string): string {
  const rows = sampleSnsRows(today);
  const last = rows[rows.length - 1].weekStart;
  return serializeSnsCsv(rows.filter((row) => row.weekStart === last));
}
