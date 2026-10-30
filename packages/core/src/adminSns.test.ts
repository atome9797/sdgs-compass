import { describe, expect, it } from "vitest";
import {
  compareLatestWeek,
  formatSnsDelta,
  formatSnsValue,
  isMonday,
  median,
  mondayOf,
  normalizeDate,
  parseCount,
  parseRate,
  parseRatePercent,
  parseSnsCsv,
  planSnsImport,
  removeSnsRow,
  SAMPLE_WEEKS,
  sampleSnsRows,
  sanitizeSnsRows,
  serializeSnsCsv,
  SNS_CHANNELS,
  SNS_CSV_HEADER,
  SNS_CSV_MAX_ROWS,
  snsChartSeries,
  snsChartWeeks,
  snsDelta,
  snsLatestWeek,
  snsTemplateCsv,
  sortSnsRows,
  validateSnsDraft,
  type SnsRow,
} from "./adminSns";
import { daysBetween } from "./format";

const row = (weekStart: string, channel: SnsRow["channel"], followers: number, extra: Partial<SnsRow> = {}): SnsRow => ({
  weekStart,
  channel,
  followers,
  reach: followers * 10,
  engagementRate: 0.03,
  linkClicks: 5,
  ...extra,
});

describe("날짜(월요일)", () => {
  it("normalizeDate: 슬래시·한 자리 달/날도 읽고, 없는 날짜는 거절", () => {
    expect(normalizeDate("2026-10-26")).toBe("2026-10-26");
    expect(normalizeDate(" 2026/10/26 ")).toBe("2026-10-26");
    expect(normalizeDate("2026-1-5")).toBe("2026-01-05");
    expect(normalizeDate("2026-02-30")).toBeNull();
    expect(normalizeDate("2026-13-01")).toBeNull();
    expect(normalizeDate("2025-02-29")).toBeNull();
    expect(normalizeDate("2028-02-29")).toBe("2028-02-29");
    expect(normalizeDate("26-10-26")).toBeNull();
    expect(normalizeDate("")).toBeNull();
  });

  it("isMonday · mondayOf", () => {
    expect(isMonday("2026-10-26")).toBe(true);
    expect(isMonday("2026-10-27")).toBe(false);
    expect(mondayOf("2026-10-26")).toBe("2026-10-26");
    expect(mondayOf("2026-10-31")).toBe("2026-10-26");
    expect(mondayOf("2026-11-01")).toBe("2026-10-26");
    expect(mondayOf("2026-11-02")).toBe("2026-11-02");
    expect(mondayOf("2027-01-01")).toBe("2026-12-28");
  });
});

describe("값 한 칸 읽기", () => {
  it("parseCount: 0 이상의 정수 (쉼표 구분 허용)", () => {
    expect(parseCount("0")).toBe(0);
    expect(parseCount(" 1234 ")).toBe(1234);
    expect(parseCount("1,234")).toBe(1234);
    expect(parseCount("12,34")).toBeNull();
    expect(parseCount("-1")).toBeNull();
    expect(parseCount("1.5")).toBeNull();
    expect(parseCount("")).toBeNull();
    expect(parseCount("abc")).toBeNull();
    expect(parseCount("9999999999999")).toBeNull();
  });

  it("parseRate: 빈칸=모름, 0~1 또는 퍼센트. 3.2 처럼 헷갈리는 값은 거절", () => {
    expect(parseRate("")).toEqual({ value: null });
    expect(parseRate("0.032")).toEqual({ value: 0.032 });
    expect(parseRate("3.2%")).toEqual({ value: 0.032 });
    expect(parseRate("0")).toEqual({ value: 0 });
    expect(parseRate("1")).toEqual({ value: 1 });
    expect(parseRate("100%")).toEqual({ value: 1 });
    expect(parseRate("3.2")).toBeNull();
    expect(parseRate("101%")).toBeNull();
    expect(parseRate("-0.1")).toBeNull();
    expect(parseRate("abc")).toBeNull();
  });

  it("parseRatePercent: 입력 폼은 퍼센트로 받아요", () => {
    expect(parseRatePercent("3.2")).toEqual({ value: 0.032 });
    expect(parseRatePercent(" 3.2 % ")).toEqual({ value: 0.032 });
    expect(parseRatePercent("")).toEqual({ value: null });
    expect(parseRatePercent("100")).toEqual({ value: 1 });
    expect(parseRatePercent("100.1")).toBeNull();
    expect(parseRatePercent("-1")).toBeNull();
    expect(parseRatePercent("x")).toBeNull();
    // 부동소수 꼬리가 남지 않아요 (0.07 * 100 같은 값)
    expect(parseRatePercent("7")).toEqual({ value: 0.07 });
    expect(parseRatePercent("0.1")).toEqual({ value: 0.001 });
  });
});

describe("CSV 읽기", () => {
  it("기본: 머리글 + 행", () => {
    const text = `${SNS_CSV_HEADER}\n2026-10-19,x,812,5200,0.021,38\n2026-10-19,instagram,1290,8100,0.036,52\n`;
    const result = parseSnsCsv(text);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.rows).toEqual([
      { weekStart: "2026-10-19", channel: "x", followers: 812, reach: 5200, engagementRate: 0.021, linkClicks: 38 },
      { weekStart: "2026-10-19", channel: "instagram", followers: 1290, reach: 8100, engagementRate: 0.036, linkClicks: 52 },
    ]);
  });

  it("UTF-8 BOM · CRLF · 마지막 줄바꿈 없음", () => {
    const text = `﻿${SNS_CSV_HEADER}\r\n2026-10-19,x,812,5200,0.021,38\r\n2026-10-26,x,826,5600,,44`;
    const result = parseSnsCsv(text);
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[1].engagementRate).toBeNull();
  });

  it("따옴표: 쉼표가 든 숫자 · 따옴표로 감싼 칸 · 두 번 쓴 따옴표", () => {
    const text = `${SNS_CSV_HEADER}\n"2026-10-19","Instagram","1,290","8,100","3.6%",52\n`;
    const result = parseSnsCsv(text);
    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([{ weekStart: "2026-10-19", channel: "instagram", followers: 1290, reach: 8100, engagementRate: 0.036, linkClicks: 52 }]);
    const quoted = parseSnsCsv(`week,channel,followers,reach,engagement_rate,link_clicks,memo\n2026-10-19,x,1,2,,3,"he said ""hi"", ok"\n`);
    expect(quoted.errors).toEqual([]);
    expect(quoted.rows).toHaveLength(1);
  });

  it("따옴표 안의 줄바꿈이 있어도 뒤 행의 줄 번호가 맞아요", () => {
    const text = `week,channel,followers,reach,engagement_rate,link_clicks,memo\n2026-10-19,x,1,2,,3,"첫째 줄\n둘째 줄"\n2026-10-20,x,1,2,,3,\n`;
    const result = parseSnsCsv(text);
    expect(result.rows).toHaveLength(1);
    // 2행(1줄) 데이터는 2~3줄, 다음 행은 4줄 — 화요일이라 월요일이 아니에요
    expect(result.errors).toEqual([{ line: 4, reason: "not_monday" }]);
  });

  it("표 계산 소프트에서 복사한 탭 구분 · 세미콜론 구분", () => {
    const tab = parseSnsCsv("week\tchannel\tfollowers\treach\tengagement_rate\tlink_clicks\n2026-10-19\tx\t1,234\t5200\t3.2%\t38\n");
    expect(tab.errors).toEqual([]);
    expect(tab.rows).toEqual([{ weekStart: "2026-10-19", channel: "x", followers: 1234, reach: 5200, engagementRate: 0.032, linkClicks: 38 }]);
    const semi = parseSnsCsv("week;channel;followers;reach;engagement_rate;link_clicks\n2026-10-19;facebook;10;20;0.5;3\n");
    expect(semi.errors).toEqual([]);
    expect(semi.rows[0].channel).toBe("facebook");
  });

  it("머리글: 대소문자·공백·열 순서가 달라도 읽고, 모르는 열은 무시", () => {
    const text = "Link Clicks, Reach ,Followers,Channel,WEEK,Engagement Rate,note\n38,5200,812,Twitter,2026/10/19,2.1%,hello\n";
    const result = parseSnsCsv(text);
    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([{ weekStart: "2026-10-19", channel: "x", followers: 812, reach: 5200, engagementRate: 0.021, linkClicks: 38 }]);
  });

  it("참여율 열이 없어도 돼요 (모두 null)", () => {
    const result = parseSnsCsv("week,channel,followers,reach,link_clicks\n2026-10-19,youtube,260,1400,16\n");
    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([{ weekStart: "2026-10-19", channel: "youtube", followers: 260, reach: 1400, engagementRate: null, linkClicks: 16 }]);
  });

  it("SNS 이름 별칭: twitter · ig · fb · yt", () => {
    const text = `${SNS_CSV_HEADER}\n2026-10-19,Twitter,1,1,,1\n2026-10-19,IG,1,1,,1\n2026-10-19,FB,1,1,,1\n2026-10-19,yt,1,1,,1\n`;
    expect(parseSnsCsv(text).rows.map((r) => r.channel)).toEqual(["x", "instagram", "facebook", "youtube"]);
  });

  it("틀린 행은 줄 번호와 이유를 알려 주고 나머지는 가져와요", () => {
    const text = [
      SNS_CSV_HEADER, // 1
      "2026-10-19,x,812,5200,0.021,38", // 2 ok
      "2026-02-30,x,1,1,,1", // 3 없는 날짜
      "", // 4 빈 줄(건너뜀)
      "2026-10-20,x,1,1,,1", // 5 월요일 아님
      "2026-10-19,linkedin,1,1,,1", // 6 모르는 SNS
      "2026-10-19,x,-5,1,,1", // 7 followers
      "2026-10-19,x,1,1.5,,1", // 8 reach
      "2026-10-19,x,1,1,,abc", // 9 link_clicks
      "2026-10-19,x,1,1,3.2,1", // 10 engagement_rate
      "2026-10-19,x,1,1,,1,extra", // 11 열 개수
      "2026-10-26,instagram,1290,8100,,52", // 12 ok
    ].join("\n");
    const result = parseSnsCsv(text);
    expect(result.rows.map((r) => `${r.weekStart}/${r.channel}`)).toEqual(["2026-10-19/x", "2026-10-26/instagram"]);
    expect(result.errors).toEqual([
      { line: 3, reason: "bad_date" },
      { line: 5, reason: "not_monday" },
      { line: 6, reason: "bad_channel" },
      { line: 7, reason: "bad_followers" },
      { line: 8, reason: "bad_reach" },
      { line: 9, reason: "bad_link_clicks" },
      { line: 10, reason: "bad_engagement_rate" },
      { line: 11, reason: "columns" },
    ]);
  });

  it("파일 단위 오류: 머리글 부족 · 데이터 없음 · 행이 너무 많음", () => {
    expect(parseSnsCsv("week,channel,followers\n2026-10-19,x,1\n")).toEqual({ rows: [], errors: [{ line: 1, reason: "header_missing" }], warnings: [] });
    expect(parseSnsCsv(`${SNS_CSV_HEADER}\n`).errors).toEqual([{ line: 1, reason: "empty" }]);
    expect(parseSnsCsv("").errors).toEqual([{ line: 1, reason: "empty" }]);
    expect(parseSnsCsv("\n\n  \n").errors).toEqual([{ line: 1, reason: "empty" }]);
    const many = [SNS_CSV_HEADER, ...Array.from({ length: SNS_CSV_MAX_ROWS + 1 }, () => "2026-10-19,x,1,1,,1")].join("\n");
    const tooMany = parseSnsCsv(many);
    expect(tooMany.rows).toEqual([]);
    expect(tooMany.errors).toHaveLength(1);
    expect(tooMany.errors[0].reason).toBe("too_many_rows");
    const limit = [SNS_CSV_HEADER, ...Array.from({ length: SNS_CSV_MAX_ROWS }, () => "2026-10-19,x,1,1,,1")].join("\n");
    expect(parseSnsCsv(limit).errors).toEqual([]);
  });

  it("같은 주·같은 SNS 가 파일 안에서 겹치면 뒤의 행을 쓰고 알려요", () => {
    const text = `${SNS_CSV_HEADER}\n2026-10-19,x,100,1,,1\n2026-10-19,instagram,200,1,,1\n2026-10-19,x,150,1,,1\n`;
    const result = parseSnsCsv(text);
    expect(result.rows.map((r) => [r.channel, r.followers])).toEqual([
      ["x", 150],
      ["instagram", 200],
    ]);
    expect(result.warnings).toEqual([{ line: 2, reason: "duplicate_in_file" }]);
    expect(result.errors).toEqual([]);
  });

  it("저장했다가 다시 읽으면 같아요 (BOM · CRLF · 머리글)", () => {
    const rows = sampleSnsRows("2026-10-31");
    const csv = serializeSnsCsv(rows);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.slice(1).startsWith(`${SNS_CSV_HEADER}\r\n`)).toBe(true);
    expect(csv.endsWith("\r\n")).toBe(true);
    expect(csv.includes("\n") && csv.split("\n").every((l, i, a) => i === a.length - 1 || l.endsWith("\r"))).toBe(true);
    const back = parseSnsCsv(csv);
    expect(back.errors).toEqual([]);
    expect(back.rows).toEqual(rows);
    // 참여율이 null 인 행도
    const withNull = [row("2026-10-19", "x", 10, { engagementRate: null })];
    expect(parseSnsCsv(serializeSnsCsv(withNull)).rows).toEqual(withNull);
    expect(serializeSnsCsv(withNull)).toContain("2026-10-19,x,10,100,,5\r\n");
  });
});

describe("합치기 · 지우기", () => {
  const base = [row("2026-10-19", "x", 100), row("2026-10-19", "instagram", 200)];

  it("추가 · 덮어쓰기 · 변화 없음을 나눠 세요", () => {
    const plan = planSnsImport(base, [row("2026-10-19", "x", 100), row("2026-10-19", "instagram", 250), row("2026-10-26", "x", 110)]);
    expect(plan).toMatchObject({ added: 1, replaced: 1, unchanged: 1 });
    expect(plan.rows.map((r) => `${r.weekStart}/${r.channel}/${r.followers}`)).toEqual(["2026-10-19/x/100", "2026-10-19/instagram/250", "2026-10-26/x/110"]);
  });

  it("참여율만 달라도 덮어쓰기예요", () => {
    const plan = planSnsImport(base, [row("2026-10-19", "x", 100, { engagementRate: null })]);
    expect(plan).toMatchObject({ added: 0, replaced: 1, unchanged: 0 });
  });

  it("정렬: 주 → SNS 순서(X · Instagram · Facebook · YouTube)", () => {
    const sorted = sortSnsRows([row("2026-10-26", "youtube", 1), row("2026-10-19", "facebook", 1), row("2026-10-26", "x", 1), row("2026-10-19", "x", 1)]);
    expect(sorted.map((r) => `${r.weekStart}/${r.channel}`)).toEqual(["2026-10-19/x", "2026-10-19/facebook", "2026-10-26/x", "2026-10-26/youtube"]);
  });

  it("removeSnsRow: 그 (주, SNS) 한 행만", () => {
    expect(removeSnsRow(base, { weekStart: "2026-10-19", channel: "x" })).toEqual([base[1]]);
    expect(removeSnsRow(base, { weekStart: "2026-10-26", channel: "x" })).toEqual(base);
  });

  it("sanitizeSnsRows: 깨진 행을 버리고 중복·순서를 정리", () => {
    const stored = [
      row("2026-10-26", "x", 5),
      { weekStart: "2026-10-27", channel: "x", followers: 1, reach: 1, engagementRate: null, linkClicks: 1 }, // 월요일 아님
      { weekStart: "2026-10-19", channel: "tiktok", followers: 1, reach: 1, engagementRate: null, linkClicks: 1 },
      { weekStart: "2026-10-19", channel: "x", followers: -1, reach: 1, engagementRate: null, linkClicks: 1 },
      { weekStart: "2026-10-19", channel: "x", followers: 1, reach: 1, engagementRate: 3.2, linkClicks: 1 },
      { weekStart: "2026-10-19", channel: "x", followers: 1.5, reach: 1, engagementRate: null, linkClicks: 1 },
      { weekStart: "2026-10-19", channel: "x", followers: 1, reach: 1, linkClicks: 1 }, // 참여율 없음 = null
      "garbage",
      null,
      row("2026-10-26", "x", 6), // 같은 키 → 뒤가 이겨요
    ];
    const rows = sanitizeSnsRows(stored);
    expect(rows.map((r) => `${r.weekStart}/${r.channel}/${r.followers}/${r.engagementRate}`)).toEqual(["2026-10-19/x/1/null", "2026-10-26/x/6/0.03"]);
    expect(sanitizeSnsRows("nope")).toEqual([]);
    expect(sanitizeSnsRows(null)).toEqual([]);
    expect(sanitizeSnsRows({})).toEqual([]);
  });
});

describe("수동 입력 검사", () => {
  const ok = { weekStart: "2026-10-26", channel: "instagram", followers: "1,604", reach: "14300", engagementPercent: "4.9", linkClicks: "133" };

  it("올바른 입력은 행으로 바뀌어요 (참여율은 퍼센트 → 0~1)", () => {
    expect(validateSnsDraft(ok)).toEqual({ ok: true, row: { weekStart: "2026-10-26", channel: "instagram", followers: 1604, reach: 14300, engagementRate: 0.049, linkClicks: 133 } });
    const blankRate = validateSnsDraft({ ...ok, engagementPercent: "" });
    expect(blankRate.ok && blankRate.row.engagementRate).toBeNull();
  });

  it("틀린 칸마다 이유가 붙어요", () => {
    const bad = validateSnsDraft({ weekStart: "2026-10-27", channel: "tiktok", followers: "-1", reach: "1.5", engagementPercent: "120", linkClicks: "x" });
    expect(bad).toEqual({
      ok: false,
      errors: { weekStart: "week", channel: "channel", followers: "count", reach: "count", engagementPercent: "rate", linkClicks: "count" },
    });
    expect(validateSnsDraft({ ...ok, weekStart: "" })).toEqual({ ok: false, errors: { weekStart: "week" } });
    expect(validateSnsDraft({ ...ok, weekStart: "2026-02-31" })).toEqual({ ok: false, errors: { weekStart: "week" } });
  });
});

describe("추이", () => {
  it("snsChartWeeks: 빠진 주도 이어서, 최대 주 수로 자르기", () => {
    const rows = [row("2026-10-05", "x", 1), row("2026-10-26", "x", 1)];
    expect(snsChartWeeks(rows)).toEqual(["2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26"]);
    expect(snsChartWeeks(rows, 2)).toEqual(["2026-10-19", "2026-10-26"]);
    expect(snsChartWeeks([])).toEqual([]);
    expect(snsChartWeeks([row("2026-10-05", "x", 1)])).toEqual(["2026-10-05"]);
  });

  it("snsChartSeries: 빠진 주는 null, 값이 하나도 없는 SNS 는 뺌", () => {
    const rows = [
      row("2026-10-05", "x", 10),
      row("2026-10-26", "x", 40),
      row("2026-10-05", "youtube", 7, { engagementRate: null }),
      row("2026-10-12", "youtube", 8, { engagementRate: null }),
    ];
    const weeks = snsChartWeeks(rows);
    const followers = snsChartSeries(rows, "followers", weeks);
    expect(followers.map((s) => s.channel)).toEqual(["x", "youtube"]);
    expect(followers[0].values).toEqual([10, null, null, 40]);
    expect(followers[1].values).toEqual([7, 8, null, null]);
    // 참여율을 비워 둔 YouTube 는 참여율 그래프에 없어요
    expect(snsChartSeries(rows, "engagementRate", weeks).map((s) => s.channel)).toEqual(["x"]);
  });
});

describe("최신 주 비교", () => {
  const rows = sampleSnsRows("2026-10-31");
  const comparison = compareLatestWeek(rows);

  it("최신 주는 기준일이 속한 주의 월요일", () => {
    expect(snsLatestWeek(rows)).toBe("2026-10-26");
    expect(comparison.latestWeek).toBe("2026-10-26");
    expect(comparison.rows.map((r) => r.channel)).toEqual([...SNS_CHANNELS]);
    expect(comparison.rows.every((r) => r.hasLatest)).toBe(true);
  });

  it("전주 대비 · 최근 4주 중앙값 대비 (X 로 손으로 계산)", () => {
    const x = comparison.rows[0].cells;
    // 팔로워: 978, 직전 951, 앞 4주(861·874·903·951)의 중앙값 888.5
    expect(x.followers.value).toBe(978);
    expect(x.followers.prev).toBe(951);
    expect(x.followers.median4).toBe(888.5);
    expect(formatSnsDelta(x.followers.vsPrev)).toBe("+2.8%");
    expect(formatSnsDelta(x.followers.vsMedian)).toBe("+10.1%");
    expect(x.followers.vsPrev).toMatchObject({ kind: "ratio", abs: 27 });
    // 참여율은 퍼센트포인트 차이: 3.3% vs 4.4% / 중앙값 2.9%
    expect(formatSnsDelta(x.engagementRate.vsPrev)).toBe("-1.1pt");
    expect(formatSnsDelta(x.engagementRate.vsMedian)).toBe("+0.4pt");
    expect(formatSnsValue("engagementRate", x.engagementRate.value)).toBe("3.3%");
    expect(formatSnsValue("followers", 1604)).toBe("1,604");
    expect(formatSnsValue("reach", null)).toBe("-");
  });

  it("그 주 입력이 없는 SNS · 비교할 주가 없는 경우", () => {
    const partial = [
      row("2026-10-12", "x", 100),
      row("2026-10-19", "x", 110),
      row("2026-10-26", "x", 121),
      row("2026-10-12", "facebook", 50), // 최신 주 입력 없음
      row("2026-10-26", "youtube", 30), // 비교할 주 없음
    ];
    const result = compareLatestWeek(partial);
    expect(result.latestWeek).toBe("2026-10-26");
    const [x, facebook, youtube] = result.rows;
    expect([x.channel, facebook.channel, youtube.channel]).toEqual(["x", "facebook", "youtube"]);
    // X: 직전 110 대비 +10.0%, 앞 4주 입력은 2개(100·110)라 중앙값 105 → +15.2%
    expect(formatSnsDelta(x.cells.followers.vsPrev)).toBe("+10.0%");
    expect(x.cells.followers.median4).toBe(105);
    expect(formatSnsDelta(x.cells.followers.vsMedian)).toBe("+15.2%");
    expect(facebook.hasLatest).toBe(false);
    expect(facebook.cells.followers).toEqual({ value: null, prev: null, median4: null, vsPrev: null, vsMedian: null });
    expect(youtube.hasLatest).toBe(true);
    expect(youtube.cells.followers.vsPrev).toBeNull();
    expect(youtube.cells.followers.vsMedian).toBeNull();
    expect(formatSnsDelta(null)).toBe("-");
  });

  it("중앙값은 앞 4주 가운데 2주 이상 입력이 있어야 해요", () => {
    const result = compareLatestWeek([row("2026-10-19", "x", 100), row("2026-10-26", "x", 120)]);
    expect(result.rows[0].cells.followers.median4).toBeNull();
    expect(formatSnsDelta(result.rows[0].cells.followers.vsPrev)).toBe("+20.0%");
  });

  it("입력이 없으면 비교도 없어요", () => {
    expect(compareLatestWeek([])).toEqual({ latestWeek: null, rows: [] });
    expect(snsLatestWeek([])).toBeNull();
  });

  it("snsDelta: 기준이 0 이면 비율을 계산하지 않아요", () => {
    expect(snsDelta("followers", 5, 0)).toBeNull();
    expect(snsDelta("followers", 0, 0)).toEqual({ kind: "ratio", amount: 0, abs: 0 });
    expect(snsDelta("followers", null, 5)).toBeNull();
    expect(snsDelta("linkClicks", 5, null)).toBeNull();
    expect(formatSnsDelta(snsDelta("followers", 9, 10))).toBe("-10.0%");
  });

  it("median", () => {
    expect(median([])).toBeNull();
    expect(median([3])).toBe(3);
    expect(median([5, 1, 3])).toBe(3);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
});

describe("샘플(가상) · 견본 CSV", () => {
  it("4채널 × 8주, 모두 월요일, 마지막 주는 기준일이 속한 주", () => {
    const rows = sampleSnsRows("2026-10-28");
    expect(rows).toHaveLength(SNS_CHANNELS.length * SAMPLE_WEEKS);
    expect(rows.every((r) => isMonday(r.weekStart))).toBe(true);
    expect(rows[0].weekStart).toBe("2026-09-07");
    expect(rows.at(-1)?.weekStart).toBe("2026-10-26");
    expect(daysBetween(rows[0].weekStart, rows.at(-1)?.weekStart ?? "")).toBe(49);
    expect(new Set(rows.map((r) => `${r.weekStart}|${r.channel}`)).size).toBe(32);
    expect(rows).toEqual(sortSnsRows(rows));
  });

  it("값이 모두 올바른 범위 (읽어 보면 오류가 없어요)", () => {
    const rows = sampleSnsRows("2026-10-31");
    for (const r of rows) {
      expect(Number.isInteger(r.followers) && r.followers > 0).toBe(true);
      expect(Number.isInteger(r.reach) && r.reach > 0).toBe(true);
      expect(Number.isInteger(r.linkClicks) && r.linkClicks > 0).toBe(true);
      expect(r.engagementRate !== null && r.engagementRate > 0 && r.engagementRate < 0.2).toBe(true);
    }
    expect(sanitizeSnsRows(rows)).toEqual(rows);
  });

  it("견본 CSV: 머리글 + 가장 최근 주 4행, 그대로 가져올 수 있어요", () => {
    const csv = snsTemplateCsv("2026-10-31");
    const result = parseSnsCsv(csv);
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(4);
    expect(new Set(result.rows.map((r) => r.weekStart))).toEqual(new Set(["2026-10-26"]));
  });
});
