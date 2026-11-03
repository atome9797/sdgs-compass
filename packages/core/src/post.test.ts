import { describe, expect, it } from "vitest";
import type { OfficialChannel, PrPost, SocialPost } from "./domain";
import {
  authorRole, bodyLimit, containsContact, DEFAULT_OFFICIAL_CHANNEL, defaultPrSdgs, earliestOfficialDate, isOfficialChannel, OFFICIAL_CHANNELS, OFFICIAL_SHARE_FEE_YEN,
  OFFICIAL_ACCOUNT_URLS, OFFICIAL_SHARE_MONTHLY_LIMIT, OFFICIAL_SHARE_WINDOW_DAYS, OFFICIAL_STATUSES, officialChannelFormat, officialChannelLabel, officialChannelName,
  officialDateChoices, officialDateProblem, officialMonthOf, officialMonthRemaining, officialShareLink, officialUsageByMonth, isOfficialPostUrl, isOfficialStatus, POST_LIMITS,
  postContext, postErrorText, resolveOfficialDate, uniqueSdgs, validatePostDraft,
  type PostContext, type PostDraft,
} from "./post";
import type { SdgId } from "./sdg";

const context: PostContext = { activityIds: ["act-1", "act-2"], challengeIds: ["ch-1"], today: "2026-10-30", officialUsage: {} };
const brag = (overrides: Partial<PostDraft> = {}): PostDraft => ({ kind: "brag", body: "初めての受賞です！", activityId: "act-1", ...overrides });
const pr = (overrides: Partial<PostDraft> = {}): PostDraft => ({ kind: "pr", title: "漁港の朝市で容器を減らしました", body: "学生のアイデアを実際に試しました。", sdgIds: [14], ...overrides });

describe("연락처 검출 (DB mask_contacts 와 같은 규칙)", () => {
  it("이메일 주소를 잡아요", () => {
    for (const text of ["連絡は mina@example.com まで", "mina.sample+sdgs@mail.example.co.jp", "a_b%c@x-y.org"]) expect(containsContact(text), text).toBe(true);
  });

  it("전화번호를 잡아요 (일본·한국·국제 형식, 하이픈 없는 숫자도)", () => {
    for (const text of ["090-1234-5678", "03-1234-5678", "010-1234-5678", "+81 90 1234 5678", "+82-10-1234-5678", "09012345678", "TEL 0120-123-456"]) {
      expect(containsContact(text), text).toBe(true);
    }
  });

  it("날짜·금액·SDGs 번호 같은 평범한 숫자는 그냥 두어요", () => {
    for (const text of ["2026年10月30日に受賞", "2026-10-30", "賞金は¥30,000", "SDGs14 と SDGs12", "Lv.3 / 1,476 pt", "17目標すべてに挑戦", "참가자 1234567명", "11/14 13:00"]) {
      expect(containsContact(text), text).toBe(false);
    }
  });

  it("8자리 이상 이어진 숫자는 전화번호로 봐요 (DB 와 같아요)", () => {
    expect(containsContact("12345678")).toBe(true);
    expect(containsContact("1234567")).toBe(false);
  });
});

describe("입력 검사", () => {
  it("올릴 수 있는 글은 오류가 없어요", () => {
    expect(validatePostDraft(brag(), context)).toEqual([]);
    expect(validatePostDraft(pr(), context)).toEqual([]);
    expect(validatePostDraft(pr({ challengeId: "ch-1", sdgIds: [14, 12, 13], requestOfficial: true }), context)).toEqual([]);
  });

  it("자랑 글: 실적이 꼭 필요하고, 내 실적 목록에 있는 것이어야 해요", () => {
    expect(validatePostDraft(brag({ activityId: null }), context)).toEqual(["achievement_required"]);
    expect(validatePostDraft(brag({ activityId: "" }), context)).toEqual(["achievement_required"]);
    expect(validatePostDraft(brag({ activityId: "남의 실적" }), context)).toEqual(["achievement_not_found"]);
  });

  it("자랑 글: 본문 1~200자 (이모지·한자도 1글자)", () => {
    expect(validatePostDraft(brag({ body: "   " }), context)).toEqual(["body_required"]);
    expect(validatePostDraft(brag({ body: "あ".repeat(POST_LIMITS.bragBody) }), context)).toEqual([]);
    expect(validatePostDraft(brag({ body: "あ".repeat(POST_LIMITS.bragBody + 1) }), context)).toEqual(["body_too_long"]);
    expect(validatePostDraft(brag({ body: "🏆".repeat(POST_LIMITS.bragBody) }), context)).toEqual([]);
  });

  it("홍보 글: 제목 1~40자, 본문 1~400자", () => {
    expect(validatePostDraft(pr({ title: "" }), context)).toEqual(["title_required"]);
    expect(validatePostDraft(pr({ title: undefined }), context)).toEqual(["title_required"]);
    expect(validatePostDraft(pr({ title: "題".repeat(POST_LIMITS.prTitle + 1) }), context)).toEqual(["title_too_long"]);
    expect(validatePostDraft(pr({ title: "題".repeat(POST_LIMITS.prTitle) }), context)).toEqual([]);
    expect(validatePostDraft(pr({ body: "" }), context)).toEqual(["body_required"]);
    expect(validatePostDraft(pr({ body: "文".repeat(POST_LIMITS.prBody + 1) }), context)).toEqual(["body_too_long"]);
    expect(validatePostDraft(pr({ body: "文".repeat(POST_LIMITS.prBody) }), context)).toEqual([]);
  });

  it("홍보 글: SDGs 는 중복을 빼고 1~3개", () => {
    expect(validatePostDraft(pr({ sdgIds: [] }), context)).toEqual(["sdgs_required"]);
    expect(validatePostDraft(pr({ sdgIds: undefined }), context)).toEqual(["sdgs_required"]);
    expect(validatePostDraft(pr({ sdgIds: [14, 14, 14] }), context)).toEqual([]);
    expect(validatePostDraft(pr({ sdgIds: [1, 2, 3, 4] }), context)).toEqual(["sdgs_too_many"]);
    expect(validatePostDraft(pr({ sdgIds: [99 as SdgId] }), context)).toEqual(["sdgs_required"]);
  });

  it("홍보 글: 연결하는 챌린지는 우리 회사 것이어야 해요 (연결 안 해도 돼요)", () => {
    expect(validatePostDraft(pr({ challengeId: null }), context)).toEqual([]);
    expect(validatePostDraft(pr({ challengeId: "ch-1" }), context)).toEqual([]);
    expect(validatePostDraft(pr({ challengeId: "다른 회사 챌린지" }), context)).toEqual(["challenge_not_found"]);
  });

  it("홍보 글: 공식 SNS 게시 채널은 신청을 켰을 때만 봐요 (비우면 기본 채널, 목록에 없는 값은 거절)", () => {
    for (const channel of OFFICIAL_CHANNELS) expect(validatePostDraft(pr({ requestOfficial: true, officialChannel: channel }), context), channel).toEqual([]);
    expect(validatePostDraft(pr({ requestOfficial: true }), context)).toEqual([]);
    expect(validatePostDraft(pr({ requestOfficial: true, officialChannel: "youtube" as OfficialChannel }), context)).toEqual(["official_channel_invalid"]);
    expect(validatePostDraft(pr({ requestOfficial: true, officialChannel: null as unknown as OfficialChannel }), context)).toEqual(["official_channel_invalid"]);
    expect(validatePostDraft(pr({ requestOfficial: true, officialChannel: "" as OfficialChannel }), context)).toEqual(["official_channel_invalid"]);
    // 신청하지 않으면 채널 값은 아무 뜻이 없어요
    expect(validatePostDraft(pr({ requestOfficial: false, officialChannel: "youtube" as OfficialChannel }), context)).toEqual([]);
    expect(validatePostDraft(pr({ officialChannel: "youtube" as OfficialChannel }), context)).toEqual([]);
    // 자랑 글은 공식 게시를 신청할 수 없어서 채널을 보지 않아요
    expect(validatePostDraft(brag({ requestOfficial: true, officialChannel: "youtube" as OfficialChannel }), context)).toEqual([]);
  });

  it("홍보 글: 공식 SNS 게시 날짜는 내일부터 30일 뒤까지만 (오늘·지난 날·31일 뒤·날짜가 아닌 값은 거절)", () => {
    for (const on of ["2026-10-31", "2026-11-15", "2026-11-29"]) expect(validatePostDraft(pr({ requestOfficial: true, officialOn: on }), context), on).toEqual([]);
    for (const on of ["2026-10-30", "2026-10-01", "2026-11-30", "2027-10-31", "2026-02-30", "2026-11-5", "", "内日"]) {
      expect(validatePostDraft(pr({ requestOfficial: true, officialOn: on }), context), on).toEqual(["official_date_out_of_range"]);
    }
    // 날짜를 비우면 고를 수 있는 가장 빠른 날을 쓰니 오류가 없어요. 신청하지 않으면 날짜는 아무 뜻이 없어요
    expect(validatePostDraft(pr({ requestOfficial: true }), context)).toEqual([]);
    expect(validatePostDraft(pr({ requestOfficial: false, officialOn: "2026-10-30" }), context)).toEqual([]);
    expect(validatePostDraft(brag({ requestOfficial: true, officialOn: "1999-01-01" }), context)).toEqual([]);
  });

  it("홍보 글: 고른 날짜의 달에 우리 회사가 이미 4번 썼으면 거절하고, 다음 달은 따로 세요", () => {
    const full: PostContext = { ...context, officialUsage: { "2026-10": 1, "2026-11": OFFICIAL_SHARE_MONTHLY_LIMIT } };
    expect(validatePostDraft(pr({ requestOfficial: true, officialOn: "2026-11-02" }), full)).toEqual(["official_month_full"]);
    expect(validatePostDraft(pr({ requestOfficial: true, officialOn: "2026-10-31" }), full)).toEqual([]); // 10월은 1번만 썼어요
    expect(validatePostDraft(pr({ requestOfficial: true }), full)).toEqual([]); // 비우면 10/31
    const three: PostContext = { ...context, officialUsage: { "2026-11": OFFICIAL_SHARE_MONTHLY_LIMIT - 1 } };
    expect(validatePostDraft(pr({ requestOfficial: true, officialOn: "2026-11-02" }), three)).toEqual([]); // 3번 썼으면 한 번 더 돼요
    // 기간(10/31 ~ 11/29) 안의 모든 달이 찼으면 날짜를 비워도 고를 날이 없어서 한도 오류예요
    const allFull: PostContext = { ...context, officialUsage: { "2026-10": 4, "2026-11": 5 } };
    expect(validatePostDraft(pr({ requestOfficial: true }), allFull)).toEqual(["official_month_full"]);
    expect(validatePostDraft(pr({ requestOfficial: true, officialOn: "2026-11-30" }), allFull)).toEqual(["official_date_out_of_range"]); // 기간 밖이 먼저
  });

  it("이메일·전화번호가 본문이나 제목에 있으면 올릴 수 없어요", () => {
    expect(validatePostDraft(brag({ body: "連絡は mina@example.com へ" }), context)).toEqual(["contact_info"]);
    expect(validatePostDraft(pr({ body: "お問い合わせは 03-1234-5678" }), context)).toEqual(["contact_info"]);
    expect(validatePostDraft(pr({ title: "電話 090-1234-5678 まで" }), context)).toEqual(["contact_info"]);
  });

  it("오류는 화면의 입력 순서대로 나와요 (연락처 검사는 마지막)", () => {
    expect(validatePostDraft({ kind: "brag", body: "", activityId: null }, context)).toEqual(["achievement_required", "body_required"]);
    expect(
      validatePostDraft({ kind: "pr", body: "a@b.cd", title: "", sdgIds: [], challengeId: "없음", requestOfficial: true, officialChannel: "youtube" as OfficialChannel, officialOn: "2026-10-30" }, context),
    ).toEqual(["title_required", "sdgs_required", "challenge_not_found", "official_channel_invalid", "official_date_out_of_range", "contact_info"]);
  });

  it("홍보 글에만 있는 값은 자랑 글 검사에 영향을 주지 않아요", () => {
    expect(validatePostDraft(brag({ title: "", sdgIds: [], challengeId: "없음" }), context)).toEqual([]);
  });
});

describe("오류 문장", () => {
  it("글 종류에 맞는 글자 수 제한이 들어가요", () => {
    expect(postErrorText("body_too_long", "brag", "ja")).toContain("200");
    expect(postErrorText("body_too_long", "pr", "ko")).toContain("400");
    expect(postErrorText("title_too_long", "pr", "ja")).toContain("40");
    expect(postErrorText("sdgs_too_many", "pr", "ko")).toContain("3");
    expect(bodyLimit("brag")).toBe(200);
    expect(bodyLimit("pr")).toBe(400);
  });

  it("두 언어 모두 채워진 문장이에요", () => {
    expect(postErrorText("contact_info", "brag", "ja")).toMatch(/メール/);
    expect(postErrorText("contact_info", "brag", "ko")).toMatch(/이메일/);
    expect(postErrorText("official_channel_invalid", "pr", "ja")).toMatch(/SNS/);
    expect(postErrorText("official_channel_invalid", "pr", "ko")).toMatch(/SNS/);
  });

  it("게시 날짜 오류에는 기간(30일)과 한도(월 4회)가 들어가요", () => {
    expect(postErrorText("official_date_out_of_range", "pr", "ja")).toBe("掲載日は明日から30日後までの中から選んでください");
    expect(postErrorText("official_date_out_of_range", "pr", "ko")).toContain("30일");
    expect(postErrorText("official_month_full", "pr", "ja")).toBe("選んだ日の月は掲載枠（月4回）を使い切っています");
    expect(postErrorText("official_month_full", "pr", "ko")).toContain("4번");
  });
});

describe("공식 SNS 게시 날짜 (회사당 월 4회 · 내일 ~ 30일 뒤에서 기업이 골라요)", () => {
  const prPost = (id: string, on: string | null, companyId = "co-me", channel: OfficialChannel = "instagram"): PrPost => ({
    id, kind: "pr", companyId, title: "t", body: "b", sdgIds: [14], challengeId: null,
    official: on ? { on, channel, feeYen: OFFICIAL_SHARE_FEE_YEN, status: "scheduled", postUrl: null } : null,
    createdAt: "2026-10-29T10:00", likes: 0, likedBy: [], mine: false,
  });
  const today = "2026-10-30";

  it("게시 완료(posted)한 신청도 그 달의 횟수에 들어가요", () => {
    const posted: PrPost = { ...prPost("p", "2026-11-03"), official: { on: "2026-11-03", channel: "instagram", feeYen: OFFICIAL_SHARE_FEE_YEN, status: "posted", postUrl: null } };
    expect(officialUsageByMonth([posted, prPost("s", "2026-11-04")], "co-me")).toEqual({ "2026-11": 2 });
  });

  it("한도는 월 4회, 고를 수 있는 기간은 30일이에요 (상수 하나씩)", () => {
    expect(OFFICIAL_SHARE_MONTHLY_LIMIT).toBe(4);
    expect(OFFICIAL_SHARE_WINDOW_DAYS).toBe(30);
    expect(officialMonthOf("2026-11-05")).toBe("2026-11");
  });

  it("달마다 센 횟수: 우리 회사의 신청만, 채널을 모두 합쳐서 (신청 없는 글·자랑 글·다른 회사는 세지 않아요)", () => {
    const posts: SocialPost[] = [
      prPost("a", "2026-10-31", "co-me", "x"), prPost("b", "2026-11-01", "co-me", "instagram"), prPost("c", "2026-11-20", "co-me", "facebook"),
      prPost("d", "2026-11-01", "co-other"), prPost("e", null),
    ];
    expect(officialUsageByMonth(posts, "co-me")).toEqual({ "2026-10": 1, "2026-11": 2 });
    expect(officialUsageByMonth(posts, "co-other")).toEqual({ "2026-11": 1 });
    expect(officialUsageByMonth([], "co-me")).toEqual({});
    expect(officialMonthRemaining({ "2026-11": 2 }, "2026-11")).toBe(2);
    expect(officialMonthRemaining({ "2026-11": 2 }, "2026-12")).toBe(4);
    expect(officialMonthRemaining({ "2026-11": 6 }, "2026-11")).toBe(0); // 0 아래로는 내려가지 않아요
  });

  it("선택지는 내일부터 30일 뒤까지 하루씩이고, 한도를 다 쓴 달만 고를 수 없어요", () => {
    const choices = officialDateChoices({ "2026-11": 4 }, today);
    expect(choices).toHaveLength(OFFICIAL_SHARE_WINDOW_DAYS);
    expect(choices[0]).toEqual({ date: "2026-10-31", month: "2026-10", remaining: 4, available: true });
    expect(choices[1]).toEqual({ date: "2026-11-01", month: "2026-11", remaining: 0, available: false });
    expect(choices.at(-1)?.date).toBe("2026-11-29");
    expect(choices.filter((c) => c.available).map((c) => c.date)).toEqual(["2026-10-31"]);
  });

  it("가장 빠른 날: 신청이 없으면 내일, 다른 회사가 같은 날·같은 채널에 몇 곳 있어도 내일이에요 (하루 제한 없음)", () => {
    expect(earliestOfficialDate([], "co-me", today)).toBe("2026-10-31");
    const others = ["co-a", "co-b", "co-c", "co-d", "co-e"].map((co, i) => prPost(`o${i}`, "2026-10-31", co));
    expect(earliestOfficialDate(others, "co-me", today)).toBe("2026-10-31");
    // 우리 회사가 내일(10/31)을 이미 받았어도 같은 날을 또 고를 수 있어요 (그 달에 한도가 남았으면)
    expect(earliestOfficialDate([prPost("a", "2026-10-31")], "co-me", today)).toBe("2026-10-31");
  });

  it("이번 달을 다 썼으면 다음 달 1일, 다음 달은 따로 세요", () => {
    const october = ["2026-10-31", "2026-10-31", "2026-10-31", "2026-10-31"].map((on, i) => prPost(`m${i}`, on));
    expect(earliestOfficialDate(october, "co-me", today)).toBe("2026-11-01");
    expect(earliestOfficialDate(october.slice(1), "co-me", today)).toBe("2026-10-31"); // 하나를 지우면(취소) 다시 10/31
    const november = ["2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23"].map((on, i) => prPost(`n${i}`, on));
    expect(earliestOfficialDate(november, "co-me", "2026-10-25")).toBe("2026-10-26"); // 10월은 비어 있어요
    expect(earliestOfficialDate(november, "co-me", "2026-11-05")).toBe("2026-12-01"); // 11/6 ~ 12/5 중 11월은 찼어요
  });

  it("기간 안의 모든 달이 찼으면 고를 날이 없어요 (null)", () => {
    const posts = ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05"].map((on, i) => prPost(`n${i}`, on));
    expect(earliestOfficialDate(posts, "co-me", "2026-10-31")).toBeNull(); // 11/1 ~ 11/30 은 모두 11월
    expect(earliestOfficialDate(posts, "co-me", "2026-11-01")).toBe("2026-12-01"); // 하루 지나면 12/1 이 기간에 들어와요
  });

  it("기간이 세 달에 걸칠 때 (1/30 → 1/31 · 2월 · 3/1), 윤년·연말도 맞아요", () => {
    expect(officialDateChoices({}, "2027-01-30").map((c) => c.month).filter((m, i, a) => a.indexOf(m) === i)).toEqual(["2027-01", "2027-02", "2027-03"]);
    const jan = ["2027-01-31", "2027-01-31", "2027-01-31", "2027-01-31"].map((on, i) => prPost(`j${i}`, on));
    const feb = ["2027-02-01", "2027-02-02", "2027-02-03", "2027-02-04"].map((on, i) => prPost(`f${i}`, on));
    expect(earliestOfficialDate([...jan, ...feb], "co-me", "2027-01-30")).toBe("2027-03-01");
    expect(officialDateChoices({}, "2028-02-28")[0].date).toBe("2028-02-29");
    expect(earliestOfficialDate([], "co-me", "2026-12-31")).toBe("2027-01-01");
  });

  it("officialDateProblem: 기간 밖 → out_of_range, 찬 달 → month_full, 괜찮으면 null", () => {
    const usage = { "2026-11": 4 };
    expect(officialDateProblem(usage, today, "2026-10-31")).toBeNull();
    expect(officialDateProblem(usage, today, "2026-11-01")).toBe("month_full");
    expect(officialDateProblem(usage, today, today)).toBe("out_of_range");
    expect(officialDateProblem(usage, today, "2026-11-30")).toBe("out_of_range"); // 31일 뒤
    expect(officialDateProblem({}, today, "2026-11-29")).toBeNull(); // 30일 뒤
    for (const bad of [null, undefined, 20261031, "2026/10/31", "2026-10-32"]) expect(officialDateProblem({}, today, bad), String(bad)).toBe("out_of_range");
  });

  it("postContext 는 우리 회사의 달별 횟수만 담고, resolveOfficialDate 는 고른 날 → 없으면 가장 빠른 날", () => {
    const state = makeContextState([prPost("a", "2026-11-01", "co-me"), prPost("b", "2026-11-01", "co-other")]);
    const ctx = postContext(state);
    expect(ctx).toMatchObject({ today, officialUsage: { "2026-11": 1 } });
    expect(resolveOfficialDate({ officialOn: "2026-11-20" }, ctx)).toBe("2026-11-20");
    expect(resolveOfficialDate({}, ctx)).toBe("2026-10-31");
  });
});

/** postContext 에 필요한 만큼만 채운 상태 (우리 회사 = co-me) */
function makeContextState(posts: SocialPost[]): Parameters<typeof postContext>[0] {
  return { history: [], proposals: [], challenges: [], companies: [], shares: 0, today: "2026-10-30", myCompanyId: "co-me", posts };
}

describe("공식 SNS 채널", () => {
  it("운영하는 채널은 X · Instagram · Facebook 이고 화면 순서가 이 순서예요 (YouTube 는 영상 채널이라 대상이 아니에요)", () => {
    expect([...OFFICIAL_CHANNELS]).toEqual(["x", "instagram", "facebook"]);
    expect(OFFICIAL_CHANNELS).toContain(DEFAULT_OFFICIAL_CHANNEL);
  });

  it("isOfficialChannel: 목록에 있는 값만 채널이에요", () => {
    for (const channel of OFFICIAL_CHANNELS) expect(isOfficialChannel(channel)).toBe(true);
    for (const value of ["youtube", "linkedin", "X", "Instagram", "", null, undefined, 1, {}]) expect(isOfficialChannel(value), String(value)).toBe(false);
  });

  it("채널 이름과 올라가는 모양: Instagram 피드 게시물(스토리는 24시간이면 사라져서 링크가 남지 않아요) · X 포스트 · Facebook 페이지 게시", () => {
    expect(OFFICIAL_CHANNELS.map((c) => officialChannelName(c, "ja"))).toEqual(["X", "Instagram", "Facebook"]);
    expect(OFFICIAL_CHANNELS.map((c) => officialChannelFormat(c, "ja"))).toEqual(["ポスト", "フィード投稿", "ページ投稿"]);
    expect(OFFICIAL_CHANNELS.map((c) => officialChannelName(c, "ko"))).toEqual(["X", "인스타그램", "페이스북"]);
    expect(OFFICIAL_CHANNELS.map((c) => officialChannelFormat(c, "ko"))).toEqual(["포스트", "피드 게시물", "페이지 게시"]);
    expect(OFFICIAL_CHANNELS.map((c) => officialChannelLabel(c, "ja"))).toEqual(["X ポスト", "Instagram フィード投稿", "Facebook ページ投稿"]);
    expect(OFFICIAL_CHANNELS.map((c) => officialChannelLabel(c, "ko"))).toEqual(["X 포스트", "인스타그램 피드 게시물", "페이스북 페이지 게시"]);
  });

  it("공식 계정 주소: Instagram 만 있고, X·Facebook 은 만드는 중이라 비어 있어요", () => {
    expect(OFFICIAL_ACCOUNT_URLS).toEqual({ x: null, instagram: "https://www.instagram.com/sdgscompass_app/", facebook: null });
    for (const url of Object.values(OFFICIAL_ACCOUNT_URLS)) if (url !== null) expect(isOfficialPostUrl(url)).toBe(true);
  });

  it("게시 상태는 예정·게시 완료 두 가지예요 (취소는 앱에 없어요)", () => {
    expect([...OFFICIAL_STATUSES]).toEqual(["scheduled", "posted"]);
    for (const value of ["scheduled", "posted"]) expect(isOfficialStatus(value)).toBe(true);
    for (const value of ["cancelled", "Posted", "", null, undefined, 1]) expect(isOfficialStatus(value), String(value)).toBe(false);
  });

  it("게시글 주소는 https:// 로 시작하고 빈칸이 없어야 해요 (DB 의 검사와 같아요)", () => {
    for (const url of ["https://www.instagram.com/p/abc123/", "https://x.com/sdgs/status/1", "https://a.b"]) expect(isOfficialPostUrl(url), url).toBe(true);
    for (const url of ["http://www.instagram.com/p/abc/", "https://", "https:// x.com", "javascript:alert(1)", "www.instagram.com/p/abc", " https://x.com", "", null, 3, "https://例え.jp", "https://x.com/\u3000", "HTTPS://X.COM"]) {
      expect(isOfficialPostUrl(url), String(url)).toBe(false);
    }
  });

  it("링크: 게시 완료만 — 게시글 주소 → 없으면 그 채널의 공식 계정 주소 → 그것도 없으면 링크 없음", () => {
    const share = (status: "scheduled" | "posted", channel: OfficialChannel, postUrl: string | null) => ({ status, channel, postUrl });
    expect(officialShareLink(share("posted", "instagram", "https://www.instagram.com/p/abc123/"))).toBe("https://www.instagram.com/p/abc123/");
    expect(officialShareLink(share("posted", "instagram", null))).toBe("https://www.instagram.com/sdgscompass_app/");
    expect(officialShareLink(share("posted", "x", null))).toBeNull();
    expect(officialShareLink(share("posted", "facebook", null))).toBeNull();
    expect(officialShareLink(share("posted", "x", "https://x.com/sdgs/status/1"))).toBe("https://x.com/sdgs/status/1");
    expect(officialShareLink(share("scheduled", "instagram", null))).toBeNull(); // 예정이면 아직 볼 곳이 없어요
  });
});

describe("SDGs 정리", () => {
  it("uniqueSdgs: 중복과 없는 번호를 빼고 순서는 그대로", () => {
    expect(uniqueSdgs([14, 12, 14, 99 as SdgId, 12])).toEqual([14, 12]);
    expect(uniqueSdgs(undefined)).toEqual([]);
  });

  it("defaultPrSdgs: 챌린지의 SDGs → 없으면 기업의 SDGs, 최대 3개", () => {
    expect(defaultPrSdgs([14, 12], [7, 13])).toEqual([7, 13]);
    expect(defaultPrSdgs([14, 12], null)).toEqual([14, 12]);
    expect(defaultPrSdgs([14, 12], [])).toEqual([14, 12]);
    expect(defaultPrSdgs([1, 2, 3, 4, 5], null)).toEqual([1, 2, 3]);
  });
});

describe("글쓴이 계정", () => {
  it("자랑 글은 학생(b2c), 홍보 글은 기업(b2b)이 써요", () => {
    expect(authorRole("brag")).toBe("b2c");
    expect(authorRole("pr")).toBe("b2b");
  });
});
