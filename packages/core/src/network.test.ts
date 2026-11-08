import { describe, expect, it } from "vitest";
import { makeUsageState } from "./adminFixtures";
import type { DemoState, Rating, WorkRequest } from "./domain";
import { averageStars, isTrusted, LATE_AFTER_DAYS, trackRecord, validateShortText, validateWorkDraft, WORK_LIMITS, type WorkDraft } from "./network";

const work = (over: Partial<WorkRequest>): WorkRequest => ({
  id: "w1",
  mode: "direct",
  fromCompanyId: "co1",
  toCompanyId: "co2",
  category: "prototype",
  title: "試作",
  detail: "内容",
  budgetYen: 50_000,
  postedOn: "2026-10-01",
  dueOn: "2026-11-30",
  status: "completed",
  applications: [],
  acceptedOn: "2026-10-02",
  deliveredOn: "2026-10-20",
  deliveryNote: "納品しました",
  completedOn: "2026-10-21",
  ...over,
});
const rating = (toId: string, stars: number, id = `r-${toId}-${stars}`): Rating => ({
  id, kind: "work", refId: "w1", fromRole: "company", fromId: "x", toRole: "company", toId, stars, comment: "ok", createdOn: "2026-10-22",
});
const world = (over: Partial<DemoState> = {}): DemoState => makeUsageState({ prizePayments: [], researchRequests: [], workRequests: [], ratings: [], ...over });

describe("신뢰 실적", () => {
  it("거래도 평가도 없으면 「거래 · 평가」가 모자라요", () => {
    expect(trackRecord(world(), "co1")).toMatchObject({ deals: 0, ratingCount: 0, ratingAverage: null, trusted: false, missing: ["deals", "ratings"] });
  });

  it("끝난 업무 의뢰는 의뢰한 기업 · 맡은 기업 둘 다의 실적이고, 평가 평균이 ★3.5 이상이면 신뢰 기업", () => {
    const s = world({ workRequests: [work({})], ratings: [rating("co1", 4), rating("co2", 3, "a"), rating("co2", 4, "b")] });
    expect(trackRecord(s, "co1")).toMatchObject({ workDone: 1, deals: 1, ratingAverage: 4, trusted: true });
    // 평균 3.5 는 통과, 그 아래는 「평균」이 모자라요
    expect(trackRecord(s, "co2")).toMatchObject({ ratingAverage: 3.5, trusted: true });
    const low = world({ workRequests: [work({})], ratings: [rating("co2", 3)] });
    expect(trackRecord(low, "co2").missing).toEqual(["average"]);
    expect(isTrusted(low, "co2")).toBe(false);
  });

  it(`납품이 온 지 ${LATE_AFTER_DAYS}일이 넘었는데 확인·지급하지 않은 의뢰는 「지급 지연」 (의뢰한 쪽만)`, () => {
    const pending = work({ status: "delivered", completedOn: null, deliveredOn: "2026-10-10" });
    const ok = world({ today: "2026-10-24", workRequests: [pending, work({ id: "w2" })], ratings: [rating("co1", 5), rating("co2", 5)] });
    expect(trackRecord(ok, "co1")).toMatchObject({ late: 0, trusted: true });
    const late = { ...ok, today: "2026-10-25" };
    expect(trackRecord(late, "co1")).toMatchObject({ late: 1, trusted: false, missing: ["late"] });
    expect(trackRecord(late, "co2").late).toBe(0);
  });

  it("평균은 소수 첫째 자리로 반올림", () => {
    expect(averageStars([{ stars: 5 }, { stars: 4 }, { stars: 4 }])).toBe(4.3);
    expect(averageStars([])).toBeNull();
  });
});

describe("입력 검사", () => {
  const trusted = world({ myCompanyId: "co1", workRequests: [work({})], ratings: [rating("co1", 5), rating("co2", 5)] });
  const draft: WorkDraft = { mode: "direct", toCompanyId: "co2", category: "prototype", title: "試作", detail: "内容", budgetYen: 50_000, days: 30 };

  it("신뢰 기업끼리의 지명 의뢰는 통과", () => {
    expect(validateWorkDraft(trusted, draft)).toEqual([]);
    expect(validateWorkDraft(trusted, { ...draft, mode: "open", toCompanyId: null })).toEqual([]);
  });

  it("문제를 모두 돌려줘요", () => {
    expect(validateWorkDraft(world({ myCompanyId: "co1" }), draft)).toEqual(["not_trusted", "to_invalid"]);
    expect(validateWorkDraft(trusted, { ...draft, toCompanyId: "co1" })).toEqual(["to_invalid"]);
    expect(validateWorkDraft(trusted, { ...draft, mode: "open" })).toEqual(["to_invalid"]);
    expect(validateWorkDraft(trusted, { ...draft, category: "magic", title: " ", detail: "あ".repeat(WORK_LIMITS.detail + 1), budgetYen: 9_999, days: 6 })).toEqual([
      "category_invalid", "title_required", "detail_too_long", "budget_invalid", "days_invalid",
    ]);
    expect(validateWorkDraft(trusted, { ...draft, detail: "電話 03-1234-5678 まで" })).toEqual(["contact_info"]);
  });

  it("한 줄 입력: 비우지 않고 · 글자 수 안 · 연락처 없이", () => {
    expect(validateShortText("  ", 10)).toBe("required");
    expect(validateShortText("あ".repeat(11), 10)).toBe("too_long");
    expect(validateShortText("mail: a@b.jp", 40)).toBe("contact_info");
    expect(validateShortText(" よろしくお願いします ", 20)).toBeNull();
  });
});

describe("문구", () => {
  it("코드가 만드는 키가 모두 있어요 (분야 · 상태 · 오류 · 모자란 조건 · 할 일 · 평가 종류)", async () => {
    const { MESSAGES } = await import("./messages");
    const { WORK_CATEGORIES } = await import("./domain");
    const { WORK_STATUSES } = await import("./network");
    const keys: string[] = [];
    for (const c of WORK_CATEGORIES) keys.push(`network.category.${c}`);
    for (const s of WORK_STATUSES) keys.push(`network.status.${s}`);
    for (const e of ["not_trusted", "to_invalid", "category_invalid", "title_required", "title_too_long", "detail_required", "detail_too_long", "budget_invalid", "days_invalid", "contact_info"]) keys.push(`network.error.${e}`);
    for (const m of ["deals", "ratings", "average", "late"]) keys.push(`network.missing.${m}`);
    for (const a of ["respond", "choose", "deliver", "complete", "rate"]) keys.push(`network.action.${a}`);
    for (const k of ["prize", "research", "work"]) keys.push(`rating.kind.${k}`);
    for (const t of ["required", "too_long", "contact_info"]) keys.push(`network.text.${t}`);
    for (const m of ["direct", "open"]) keys.push(`network.mode.${m}`);
    expect(keys.filter((k) => !(k in MESSAGES))).toEqual([]);
  });
});
