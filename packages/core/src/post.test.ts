import { describe, expect, it } from "vitest";
import type { PrPost, SocialPost } from "./domain";
import {
  authorRole, bodyLimit, containsContact, defaultPrSdgs, nextOfficialDate, OFFICIAL_SHARE_FEE_YEN, POST_LIMITS, postErrorText, uniqueSdgs, validatePostDraft,
  type PostContext, type PostDraft,
} from "./post";
import type { SdgId } from "./sdg";

const context: PostContext = { activityIds: ["act-1", "act-2"], challengeIds: ["ch-1"] };
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

  it("이메일·전화번호가 본문이나 제목에 있으면 올릴 수 없어요", () => {
    expect(validatePostDraft(brag({ body: "連絡は mina@example.com へ" }), context)).toEqual(["contact_info"]);
    expect(validatePostDraft(pr({ body: "お問い合わせは 03-1234-5678" }), context)).toEqual(["contact_info"]);
    expect(validatePostDraft(pr({ title: "電話 090-1234-5678 まで" }), context)).toEqual(["contact_info"]);
  });

  it("오류는 화면의 입력 순서대로 나와요 (연락처 검사는 마지막)", () => {
    expect(validatePostDraft({ kind: "brag", body: "", activityId: null }, context)).toEqual(["achievement_required", "body_required"]);
    expect(validatePostDraft({ kind: "pr", body: "a@b.cd", title: "", sdgIds: [], challengeId: "없음" }, context)).toEqual([
      "title_required", "sdgs_required", "challenge_not_found", "contact_info",
    ]);
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
  });
});

describe("공식 SNS 게시 날짜 (하루에 한 회사)", () => {
  const prPost = (id: string, on: string | null): PrPost => ({
    id, kind: "pr", companyId: "co-x", title: "t", body: "b", sdgIds: [14], challengeId: null,
    official: on ? { on, feeYen: OFFICIAL_SHARE_FEE_YEN, status: "scheduled" } : null,
    createdAt: "2026-10-29T10:00", likes: 0, likedBy: [], mine: false,
  });
  const today = "2026-10-30";

  it("신청한 글이 없으면 내일이에요", () => {
    expect(nextOfficialDate([], today)).toBe("2026-10-31");
    expect(nextOfficialDate([prPost("a", null)], today)).toBe("2026-10-31");
  });

  it("이미 받은 날짜는 건너뛰어요", () => {
    const posts: SocialPost[] = [prPost("a", "2026-10-31"), prPost("b", "2026-11-01")];
    expect(nextOfficialDate(posts, today)).toBe("2026-11-02");
  });

  it("중간에 빈 날짜가 있으면 가장 빠른 빈 날짜예요", () => {
    expect(nextOfficialDate([prPost("a", "2026-10-31"), prPost("b", "2026-11-02")], today)).toBe("2026-11-01");
  });

  it("오늘이나 지난 날짜는 배정하지 않아요 (내일부터)", () => {
    expect(nextOfficialDate([prPost("a", "2026-10-30")], today)).toBe("2026-10-31");
  });

  it("월말·연말을 넘어도 맞아요", () => {
    expect(nextOfficialDate([], "2026-12-31")).toBe("2027-01-01");
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
