import { describe, expect, it } from "vitest";
import { makeUsageState } from "./adminFixtures";
import {
  buildUsageTimeline,
  DEFAULT_USAGE_RANGE,
  isUsageRange,
  summarizeChallenges,
  summarizeSdgs,
  summarizeTotals,
  summarizeUsage,
  timelineSeries,
  USAGE_BUCKET_DAYS,
  USAGE_EVENT_KINDS,
  USAGE_RANGES,
  usageCurrentInsights,
  usageEventDates,
  usageInsights,
  usagePeriodInsight,
} from "./adminUsage";
import type { OfficialShare, PrPost } from "./domain";
import { daysBetween } from "./format";

describe("이용 현황: 지금 값", () => {
  const totals = summarizeTotals(makeUsageState());

  it("학생·기업·챌린지", () => {
    expect(totals.students).toBe(4);
    expect(totals.scoutableStudents).toBe(3);
    expect(totals.companies).toBe(2);
    expect(totals.verifiedCompanies).toBe(1);
    expect(totals.challenges).toBe(5);
    expect(totals.challengesByStatus).toEqual({ open: 2, judging: 1, closed: 2 });
    expect(totals.applicants).toBe(25);
  });

  it("기획서·수상·증명서", () => {
    expect(totals.proposals).toBe(5);
    expect(totals.proposalsByStatus).toEqual({ submitted: 2, reviewed: 1, awarded: 1, adopted: 1 });
    // 수상 = 기획서의 수상 1 + 데모 학생의 과거 활동 기록의 수상 1
    expect(totals.awards).toBe(2);
    // 증명서 = 활동 기록 3 + 내 기획서에서 나온 제출 1 (공유 기록은 증명서가 아니에요)
    expect(totals.certificates).toBe(4);
  });

  it("스카우트·매칭·팀원 모집", () => {
    expect(totals.scouts).toBe(3);
    expect(totals.scoutsByStatus).toEqual({ sent: 1, read: 1, accepted: 1, declined: 0 });
    expect(totals.matches).toBe(2);
    expect(totals.feeYen).toBe(60_000);
    expect(totals.donationYen).toBe(30_000);
    expect(totals.teamPosts).toBe(2);
  });

  it("피드: 글·좋아요·공식 게시 신청", () => {
    expect(totals.posts).toBe(4);
    expect(totals.bragPosts).toBe(2);
    expect(totals.prPosts).toBe(2);
    expect(totals.likes).toBe(20);
    expect(totals.officialShares).toBe(1);
  });

  it("공식 SNS 게시 신청은 채널별로도 세요 (신청이 없는 채널은 0, 채널 없는 옛 데이터는 Instagram)", () => {
    expect(totals.officialByChannel).toEqual({ x: 1, instagram: 0, facebook: 0 });
    const first = makeUsageState().posts[0] as PrPost;
    const share = first.official as OfficialShare;
    const many = summarizeTotals(
      makeUsageState({
        posts: [
          first,
          { ...first, id: "pa", official: { ...share, channel: "instagram" } },
          { ...first, id: "pb", official: { ...share, channel: "instagram" } },
          { ...first, id: "pc", official: { ...share, channel: "facebook" } },
          // 채널 선택이 생기기 전의 옛 데이터(채널 필드 없음)
          { ...first, id: "pd", official: { on: share.on, feeYen: share.feeYen, status: "scheduled" } as unknown as OfficialShare },
          { ...first, id: "pe", official: null },
        ],
      }),
    );
    expect(many.officialShares).toBe(5);
    expect(many.officialByChannel).toEqual({ x: 1, instagram: 3, facebook: 1 });
    // 채널별 합은 언제나 전체와 같아요
    expect(Object.values(many.officialByChannel).reduce((sum, n) => sum + n, 0)).toBe(many.officialShares);
  });

  it("아무것도 없는 상태에서도 0 으로 나와요", () => {
    const empty = summarizeTotals(
      makeUsageState({ talent: [], companies: [], challenges: [], proposals: [], history: [], scouts: [], matches: [], teamPosts: [], posts: [] }),
    );
    expect(empty.students).toBe(1);
    expect(empty.companies).toBe(0);
    expect(empty.applicants).toBe(0);
    expect(empty.awards).toBe(0);
    expect(empty.certificates).toBe(0);
    expect(empty.feeYen).toBe(0);
    expect(empty.likes).toBe(0);
    expect(empty.officialShares).toBe(0);
    expect(empty.officialByChannel).toEqual({ x: 0, instagram: 0, facebook: 0 });
  });
});

describe("이용 현황: 기간별 추이", () => {
  const dates = usageEventDates(makeUsageState());

  it("날짜가 있는 기록만 모아요 (시각은 버리고 날짜만)", () => {
    expect(dates.posts.sort()).toEqual(["2026-10-20", "2026-10-27", "2026-10-29", "2026-10-30"]);
    expect(dates.proposals).toHaveLength(5);
    expect(dates.activities.sort()).toEqual(["2026-08-10", "2026-10-05", "2026-10-06"]);
    for (const kind of USAGE_EVENT_KINDS) for (const date of dates[kind]) expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("기간마다 구간이 기간을 딱 맞게 채워요", () => {
    for (const range of USAGE_RANGES) {
      const timeline = buildUsageTimeline(dates, "2026-10-30", range);
      const unit = USAGE_BUCKET_DAYS[range];
      expect(range % unit, `${range}일`).toBe(0);
      expect(timeline.buckets).toHaveLength(range / unit);
      expect(timeline.buckets[0].start).toBe(timeline.from);
      expect(timeline.buckets.at(-1)?.end).toBe("2026-10-30");
      expect(daysBetween(timeline.from, timeline.to)).toBe(range - 1);
      for (let i = 1; i < timeline.buckets.length; i++) expect(daysBetween(timeline.buckets[i - 1].end, timeline.buckets[i].start), `${range}일 ${i}`).toBe(1);
    }
  });

  it("30일: 5일씩 6구간, 값을 손으로 센 것과 같아요", () => {
    const timeline = buildUsageTimeline(dates, "2026-10-30", 30);
    expect(timeline.unitDays).toBe(5);
    expect(timeline.from).toBe("2026-10-01");
    expect(timeline.buckets.map((b) => b.total)).toEqual([2, 1, 1, 1, 1, 9]);
    expect(timeline.totals).toEqual({ posts: 4, proposals: 3, scouts: 3, teamPosts: 2, matches: 1, activities: 2 });
    expect(timeline.total).toBe(15);
    expect(timelineSeries(timeline, "scouts")).toEqual([1, 0, 0, 0, 1, 1]);
    expect(timelineSeries(timeline, "posts")).toEqual([0, 0, 0, 1, 0, 3]);
    expect(timeline.busiest?.start).toBe("2026-10-26");
    expect(timeline.busiest?.total).toBe(9);
  });

  it("7일: 하루씩 7구간", () => {
    const timeline = buildUsageTimeline(dates, "2026-10-30", 7);
    expect(timeline.unitDays).toBe(1);
    expect(timeline.from).toBe("2026-10-24");
    expect(timeline.total).toBe(10);
    expect(timeline.totals).toEqual({ posts: 3, proposals: 2, scouts: 2, teamPosts: 2, matches: 1, activities: 0 });
    expect(timeline.busiest?.start).toBe("2026-10-29");
    expect(timeline.busiest?.total).toBe(4);
  });

  it("90일: 10일씩 9구간, 옛 기록도 잡혀요", () => {
    const timeline = buildUsageTimeline(dates, "2026-10-30", 90);
    expect(timeline.unitDays).toBe(10);
    expect(timeline.from).toBe("2026-08-02");
    expect(timeline.total).toBe(19);
    expect(timeline.buckets.map((b) => b.total)).toEqual([1, 0, 0, 1, 1, 1, 3, 2, 10]);
    expect(timeline.busiest?.start).toBe("2026-10-21");
  });

  it("기간 밖(너무 옛날 · 기준일 이후)은 세지 않아요", () => {
    const timeline = buildUsageTimeline(
      { posts: ["2026-09-30", "2026-10-31", "2026-10-30"], proposals: [], scouts: [], teamPosts: [], matches: [], activities: [] },
      "2026-10-30",
      7,
    );
    expect(timeline.total).toBe(1);
    expect(timeline.buckets.at(-1)?.counts.posts).toBe(1);
  });

  it("움직임이 같은 구간이 여럿이면 가장 최근 구간, 전부 0 이면 없음", () => {
    const tie = buildUsageTimeline({ posts: ["2026-10-24", "2026-10-30"], proposals: [], scouts: [], teamPosts: [], matches: [], activities: [] }, "2026-10-30", 7);
    expect(tie.busiest?.start).toBe("2026-10-30");
    const none = buildUsageTimeline({ posts: [], proposals: [], scouts: [], teamPosts: [], matches: [], activities: [] }, "2026-10-30", 30);
    expect(none.busiest).toBeNull();
    expect(none.total).toBe(0);
  });

  it("월말·연말을 넘어도 구간이 이어져요", () => {
    const timeline = buildUsageTimeline({ posts: ["2026-12-30", "2027-01-02"], proposals: [], scouts: [], teamPosts: [], matches: [], activities: [] }, "2027-01-03", 7);
    expect(timeline.from).toBe("2026-12-28");
    expect(timeline.buckets.map((b) => b.start)).toEqual(["2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02", "2027-01-03"]);
    expect(timeline.total).toBe(2);
  });
});

describe("이용 현황: SDGs·챌린지", () => {
  it("SDGs: 응모자가 많은 순으로 17개 전부", () => {
    const sdgs = summarizeSdgs(makeUsageState());
    expect(sdgs).toHaveLength(17);
    expect(sdgs.slice(0, 4)).toEqual([
      { sdgId: 14, applicants: 15, challenges: 2, interests: 3 },
      { sdgId: 12, applicants: 13, challenges: 2, interests: 2 },
      { sdgId: 4, applicants: 7, challenges: 1, interests: 1 },
      { sdgId: 17, applicants: 0, challenges: 1, interests: 0 },
    ]);
    // 응모자도 챌린지도 없는 목표는 번호 순
    expect(sdgs.slice(4, 7).map((s) => s.sdgId)).toEqual([1, 2, 3]);
    expect(new Set(sdgs.map((s) => s.sdgId)).size).toBe(17);
  });

  it("챌린지 표: 모집 중(마감 가까운 순) → 심사 중 → 마감(최근 순)", () => {
    const rows = summarizeChallenges(makeUsageState());
    expect(rows.map((r) => r.id)).toEqual(["chB", "chA", "chC", "chE", "chD"]);
    expect(rows.map((r) => r.proposals)).toEqual([0, 2, 1, 0, 2]);
    expect(rows[1]).toMatchObject({ applicants: 10, status: "open", closesOn: "2026-11-10", companyName: { ja: "会社co1", ko: "회사co1" } });
  });
});

describe("이용 현황: 한 번에 · 한 줄 읽기", () => {
  it("기본 기간은 30일이고, 기간 값을 확인해요", () => {
    expect(DEFAULT_USAGE_RANGE).toBe(30);
    expect(isUsageRange(30)).toBe(true);
    expect(isUsageRange("30")).toBe(false);
    expect(isUsageRange(14)).toBe(false);
  });

  it("summarizeUsage: 기획서 상태는 제출 → 심사 → 수상 → 채택 순", () => {
    const summary = summarizeUsage(makeUsageState());
    expect(summary.asOf).toBe("2026-10-30");
    expect(summary.timeline.range).toBe(30);
    expect(summary.proposalStatus).toEqual([
      { status: "submitted", count: 2 },
      { status: "reviewed", count: 1 },
      { status: "awarded", count: 1 },
      { status: "adopted", count: 1 },
    ]);
    expect(summarizeUsage(makeUsageState(), 7).timeline.range).toBe(7);
  });

  it("일본어 한 줄 읽기", () => {
    const lines = usageInsights(summarizeUsage(makeUsageState()), "ja");
    expect(lines).toEqual([
      "応募者がいちばん多いSDGsは「海の豊かさを守ろう」で、15名です。",
      "募集中の課題は2件で、応募者は合計25名です。",
      "フィードには4件の投稿があり（学生の実績2件・企業PR2件）、いいねは合計20です。",
      "マッチングは2件で、手数料¥60,000のうち¥30,000を寄付に充てています。",
      "スカウト3件のうち、承諾は1件、既読は1件です。",
      "公式SNS掲載の申請は1件です。",
      "直近30日でいちばん動きがあったのは「10/26」ごろで、9件でした。",
    ]);
  });

  it("한국어 한 줄 읽기", () => {
    const lines = usageInsights(summarizeUsage(makeUsageState(), 7), "ko");
    expect(lines[0]).toBe("응모자가 가장 많은 SDGs는 “해양 생태계 보전”이고, 15명이에요.");
    expect(lines[3]).toBe("매칭은 2건이고, 수수료 60,000엔 가운데 30,000엔을 기부에 써요.");
    expect(lines.at(-1)).toBe("최근 7일 중 움직임이 가장 많았던 때는 “10/29” 무렵이고, 4건이었어요.");
  });

  it("지금 값 문장은 기간을 바꿔도 같고, 기간 문장만 달라져요", () => {
    const week = summarizeUsage(makeUsageState(), 7);
    const month = summarizeUsage(makeUsageState(), 30);
    expect(usageCurrentInsights(week, "ja")).toEqual(usageCurrentInsights(month, "ja"));
    expect(usagePeriodInsight(month, "ja")).toBe("直近30日でいちばん動きがあったのは「10/26」ごろで、9件でした。");
    expect(usagePeriodInsight(week, "ja")).toBe("直近7日でいちばん動きがあったのは「10/29」ごろで、4件でした。");
    // 전체 = 지금 값 문장들 + 기간 문장 (기간 문장이 맨 끝)
    expect(usageInsights(month, "ja")).toEqual([...usageCurrentInsights(month, "ja"), usagePeriodInsight(month, "ja")]);
  });

  it("기간 안에 움직임이 없으면 기간 문장은 없어요 (전체에도 안 들어가요)", () => {
    const quiet = summarizeUsage(makeUsageState({ challenges: [], proposals: [], history: [], scouts: [], matches: [], teamPosts: [], posts: [] }), 7);
    expect(usagePeriodInsight(quiet, "ko")).toBeNull();
    expect(usageInsights(quiet, "ko")).toEqual(usageCurrentInsights(quiet, "ko"));
  });

  it("값이 0 인 항목은 말하지 않아요 (지어내지 않기)", () => {
    const empty = makeUsageState({ challenges: [], proposals: [], history: [], scouts: [], matches: [], teamPosts: [], posts: [] });
    const lines = usageInsights(summarizeUsage(empty), "ja");
    expect(lines).toEqual(["募集中の課題は0件で、応募者は合計0名です。"]);
  });
});
