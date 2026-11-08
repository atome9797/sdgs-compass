import { describe, expect, it } from "vitest";
import { makeUsageState } from "./adminFixtures";
import { RESEARCH_FIELDS, type DemoState, type ResearchRequest } from "./domain";
import { addDays } from "./format";
import { MESSAGES, translate, type MessageKey } from "./messages";
import {
  isAcceptable, nextResearchId, RESEARCH_FEE_MAX_YEN, RESEARCH_FEE_MIN_YEN, RESEARCH_LIMITS, RESEARCH_MAX_DAYS, RESEARCH_MIN_DAYS, RESEARCH_STATUSES, researchableProposals,
  researchRequestsFor, researchTotals, resultFingerprint, uniqueFields, validateResearchDraft, validateResearchResult, type ResearchDraft, type ResearchDraftError,
  type ResearchResultError,
} from "./research";
import {
  proposalResearchLabel, researchDraftErrorText, researchFlow, researchPayTimings, researchResultErrorText, selectB2bResearch, selectLabHome, selectLabMine, selectResearchDetail,
  selectResearchForm,
} from "./researchView";
import { rebaseState, reducer } from "./state";

// 기준일 2026-10-30, 우리 회사 co1. 표창(p4)·채택(p5)된 아이디어는 우리 회사의 지난 과제 chD 에서 나왔어요(adminFixtures).
const AT = "2026-10-30T10:00";
const RESEARCHER = { id: "res1", name: "Sora", affiliation: { ja: "サンプル大学大学院", ko: "샘플대학교 대학원" }, degree: "master" as const, year: 1, fields: ["data" as const], bio: "" };

function request(overrides: Partial<ResearchRequest> = {}): ResearchRequest {
  return {
    id: "rq1",
    companyId: "co2",
    origin: { proposalId: null, challengeId: null, ideaTitle: "アイデア", teamName: "チーム" },
    title: { ja: "研究", ko: "연구" },
    detail: "内容",
    deliverable: "報告書",
    fields: ["data"],
    feeYen: 50_000,
    postedOn: "2026-10-20",
    dueOn: "2026-11-30",
    status: "open",
    researcherId: null,
    acceptedOn: null,
    result: null,
    completedOn: null,
    ...overrides,
  };
}

const delivered = (overrides: Partial<ResearchRequest> = {}): ResearchRequest =>
  request({
    status: "delivered",
    researcherId: "res1",
    acceptedOn: "2026-10-22",
    result: { summary: "まとめ", fileName: "r.pdf", fileSizeBytes: 1000, sha256: "a".repeat(64), submittedAt: "2026-10-29T18:00" },
    ...overrides,
  });

function state(requests: ResearchRequest[] = []): DemoState {
  return makeUsageState({ researcher: RESEARCHER, researchRequests: requests });
}

function draft(overrides: Partial<ResearchDraft> = {}): ResearchDraft {
  return { proposalId: "p4", title: "紙と樹脂の比較", detail: "強度と1個あたりの費用を比べてください", deliverable: "報告書（PDF）", fields: ["materials"], feeYen: 80_000, days: 30, ...overrides };
}

const RESULT = { summary: "分かったことのまとめ", fileName: "report.pdf", fileSizeBytes: 2_000_000 };

describe("연구를 의뢰할 수 있는 아이디어", () => {
  it("우리 회사 과제에서 표창(awarded)·채택(adopted)된 기획서만 — 제출·심사 완료나 다른 회사 과제는 빠져요", () => {
    expect(researchableProposals(state()).map((p) => p.id)).toEqual(["p4", "p5"]);
    const other = makeUsageState({ myCompanyId: "co2", researcher: RESEARCHER, researchRequests: [] });
    expect(researchableProposals(other)).toEqual([]);
  });

  it("분야는 모르는 값과 겹치는 값을 빼고 고른 순서 그대로", () => {
    expect(uniqueFields(["data", "x", "food", "data"])).toEqual(["data", "food"]);
    expect(uniqueFields([])).toEqual([]);
  });
});

describe("의뢰 입력 검사 (기업)", () => {
  const errors = (d: Partial<ResearchDraft>) => validateResearchDraft(draft(d), state());

  it("올바른 의뢰는 통과해요 (경계값 포함)", () => {
    expect(errors({})).toEqual([]);
    expect(errors({ proposalId: "p5" })).toEqual([]);
    expect(errors({ feeYen: RESEARCH_FEE_MIN_YEN, days: RESEARCH_MIN_DAYS })).toEqual([]);
    expect(errors({ feeYen: RESEARCH_FEE_MAX_YEN, days: RESEARCH_MAX_DAYS })).toEqual([]);
    expect(errors({ title: "あ".repeat(RESEARCH_LIMITS.title), detail: "い".repeat(RESEARCH_LIMITS.detail), deliverable: "う".repeat(RESEARCH_LIMITS.deliverable) })).toEqual([]);
    expect(errors({ fields: ["data", "data", "food", "social"] })).toEqual([]);
  });

  it("출발점은 표창·채택한 우리 아이디어여야 해요", () => {
    expect(errors({ proposalId: "p1" })).toEqual(["origin_invalid"]);
    expect(errors({ proposalId: "nope" })).toEqual(["origin_invalid"]);
  });

  it("글자 수·분야·의뢰비·기한·연락처를 검사해요", () => {
    expect(errors({ title: " " })).toEqual(["title_required"]);
    expect(errors({ title: "あ".repeat(RESEARCH_LIMITS.title + 1) })).toEqual(["title_too_long"]);
    expect(errors({ detail: "" })).toEqual(["detail_required"]);
    expect(errors({ detail: "い".repeat(RESEARCH_LIMITS.detail + 1) })).toEqual(["detail_too_long"]);
    expect(errors({ deliverable: "" })).toEqual(["deliverable_required"]);
    expect(errors({ deliverable: "う".repeat(RESEARCH_LIMITS.deliverable + 1) })).toEqual(["deliverable_too_long"]);
    expect(errors({ fields: [] })).toEqual(["fields_required"]);
    expect(errors({ fields: ["unknown"] })).toEqual(["fields_required"]);
    expect(errors({ fields: ["data", "food", "social", "energy"] })).toEqual(["fields_too_many"]);
    for (const feeYen of [Number.NaN, RESEARCH_FEE_MIN_YEN - 1, RESEARCH_FEE_MAX_YEN + 1, 12_345.5, -1]) expect(errors({ feeYen }), String(feeYen)).toEqual(["fee_invalid"]);
    for (const days of [Number.NaN, RESEARCH_MIN_DAYS - 1, RESEARCH_MAX_DAYS + 1, 7.5]) expect(errors({ days }), String(days)).toEqual(["days_invalid"]);
    expect(errors({ detail: "連絡は sample@example.com までお願いします" })).toEqual(["contact_info"]);
    expect(errors({ title: "電話 090-1234-5678" })).toEqual(["contact_info"]);
  });
});

describe("성과 입력 검사 (연구자)", () => {
  it("요약 + 받을 수 있는 형식의 파일 (50MB 까지)", () => {
    expect(validateResearchResult(RESULT)).toEqual([]);
    for (const ext of ["pdf", "pptx", "docx", "xlsx", "csv", "zip", "PDF"]) expect(validateResearchResult({ ...RESULT, fileName: `a.${ext}` }), ext).toEqual([]);
    expect(validateResearchResult({ ...RESULT, summary: "" })).toEqual(["summary_required"]);
    expect(validateResearchResult({ ...RESULT, summary: "あ".repeat(RESEARCH_LIMITS.resultSummary + 1) })).toEqual(["summary_too_long"]);
    expect(validateResearchResult({ ...RESULT, fileName: null })).toEqual(["file_required"]);
    expect(validateResearchResult({ ...RESULT, fileName: "a.exe" })).toEqual(["file_type"]);
    expect(validateResearchResult({ ...RESULT, fileSizeBytes: RESEARCH_LIMITS.fileBytes + 1 })).toEqual(["file_too_large"]);
  });

  it("파일 지문은 SHA-256 64자이고, 내용이 같으면 같아요", () => {
    expect(resultFingerprint("rq1", RESULT)).toMatch(/^[0-9a-f]{64}$/);
    expect(resultFingerprint("rq1", RESULT)).toBe(resultFingerprint("rq1", { ...RESULT, summary: ` ${RESULT.summary} ` }));
    expect(resultFingerprint("rq1", RESULT)).not.toBe(resultFingerprint("rq2", RESULT));
  });
});

describe("연구 의뢰의 흐름 (reducer)", () => {
  it("기업이 게재하면 rr{seq} 로 맨 앞에 들어가고, 아이디어(기획서 제목·팀)가 그대로 복사돼요", () => {
    const before = state();
    const id = nextResearchId(before);
    const after = reducer(before, { type: "postResearchRequest", draft: draft({ fields: ["materials", "materials", "data"] }), at: AT });
    expect(after.seq).toBe(before.seq + 1);
    const posted = after.researchRequests[0];
    expect(posted.id).toBe(id);
    expect(posted).toMatchObject({
      companyId: "co1",
      origin: { proposalId: "p4", challengeId: "chD", ideaTitle: "企画 p4", teamName: "team-p4" },
      title: "紙と樹脂の比較",
      fields: ["materials", "data"],
      feeYen: 80_000,
      postedOn: "2026-10-30",
      dueOn: addDays("2026-10-30", 30),
      status: "open",
      researcherId: null,
      result: null,
    });
    expect(researchRequestsFor(after, "p4").map((r) => r.id)).toEqual([id]);
    // 입력이 틀리면 아무것도 바뀌지 않아요
    expect(reducer(before, { type: "postResearchRequest", draft: draft({ proposalId: "p1" }), at: AT })).toBe(before);
    expect(reducer(before, { type: "postResearchRequest", draft: draft({ feeYen: 0 }), at: AT })).toBe(before);
  });

  it("연구자는 모집 중이고 기한 전인 의뢰만 맡아요", () => {
    const s = state([request({ id: "open" }), request({ id: "late", dueOn: "2026-10-29" }), delivered({ id: "done" })]);
    const accepted = reducer(s, { type: "acceptResearchRequest", requestId: "open", at: AT });
    expect(accepted.researchRequests.find((r) => r.id === "open")).toMatchObject({ status: "inProgress", researcherId: "res1", acceptedOn: "2026-10-30" });
    expect(reducer(accepted, { type: "acceptResearchRequest", requestId: "open", at: AT })).toBe(accepted);
    expect(reducer(s, { type: "acceptResearchRequest", requestId: "late", at: AT })).toBe(s);
    expect(reducer(s, { type: "acceptResearchRequest", requestId: "done", at: AT })).toBe(s);
    expect(reducer(s, { type: "acceptResearchRequest", requestId: "nope", at: AT })).toBe(s);
    expect(isAcceptable(request({ dueOn: "2026-10-30" }), "2026-10-30")).toBe(true);
  });

  it("맡은 연구자만 성과를 보낼 수 있고, 보내면 확인 대기예요", () => {
    const s = state([request({ id: "mine", status: "inProgress", researcherId: "res1", acceptedOn: "2026-10-25" }), request({ id: "other", status: "inProgress", researcherId: "res-x", acceptedOn: "2026-10-25" })]);
    const sent = reducer(s, { type: "submitResearchResult", requestId: "mine", draft: RESULT, at: AT });
    const mine = sent.researchRequests.find((r) => r.id === "mine");
    expect(mine?.status).toBe("delivered");
    expect(mine?.result).toEqual({ summary: RESULT.summary, fileName: "report.pdf", fileSizeBytes: 2_000_000, sha256: resultFingerprint("mine", RESULT), submittedAt: AT });
    expect(reducer(s, { type: "submitResearchResult", requestId: "other", draft: RESULT, at: AT })).toBe(s);
    expect(reducer(s, { type: "submitResearchResult", requestId: "mine", draft: { ...RESULT, fileName: "a.exe" }, at: AT })).toBe(s);
    expect(reducer(sent, { type: "submitResearchResult", requestId: "mine", draft: RESULT, at: AT })).toBe(sent);
  });

  it("의뢰한 회사만 확인 대기 의뢰를 완료할 수 있어요 (의뢰비는 직접 지급 — 기록만)", () => {
    const s = state([delivered({ id: "ours", companyId: "co1" }), delivered({ id: "theirs", companyId: "co2" }), request({ id: "open", companyId: "co1" })]);
    const done = reducer(s, { type: "completeResearchRequest", requestId: "ours", at: AT });
    expect(done.researchRequests.find((r) => r.id === "ours")).toMatchObject({ status: "completed", completedOn: "2026-10-30" });
    expect(reducer(s, { type: "completeResearchRequest", requestId: "theirs", at: AT })).toBe(s);
    expect(reducer(s, { type: "completeResearchRequest", requestId: "open", at: AT })).toBe(s);
  });

  it("한 바퀴: 게재 → 맡기 → 성과 → 완료, 합계가 맞아요", () => {
    let s = state();
    const id = nextResearchId(s);
    s = reducer(s, { type: "postResearchRequest", draft: draft(), at: AT });
    s = reducer(s, { type: "acceptResearchRequest", requestId: id, at: AT });
    s = reducer(s, { type: "submitResearchResult", requestId: id, draft: RESULT, at: AT });
    s = reducer(s, { type: "completeResearchRequest", requestId: id, at: AT });
    expect(researchTotals(s.researchRequests)).toEqual({ open: 0, inProgress: 0, delivered: 0, completed: 1, completedYen: 80_000 });
  });

  it("다른 날 열면 의뢰의 날짜도 같은 날수만큼 옮겨져요 (rebase)", () => {
    const s = state([delivered({ id: "d", postedOn: "2026-10-20", dueOn: "2026-11-30", acceptedOn: "2026-10-22", completedOn: null })]);
    const moved = rebaseState(s, "2026-11-09");
    const r = moved.researchRequests[0];
    expect([r.postedOn, r.dueOn, r.acceptedOn, r.result?.submittedAt, r.completedOn]).toEqual(["2026-10-30", "2026-12-10", "2026-11-01", "2026-11-08T18:00", null]);
    expect(rebaseState(s, s.today)).toBe(s);
  });
});

describe("화면용 데이터", () => {
  const s = state([
    request({ id: "a", postedOn: "2026-10-28", fields: ["data", "food"] }),
    request({ id: "b", postedOn: "2026-10-29", fields: ["social"], companyId: "co1" }),
    request({ id: "late", postedOn: "2026-10-01", dueOn: "2026-10-29" }),
    request({ id: "c", status: "inProgress", researcherId: "res1", acceptedOn: "2026-10-25", dueOn: "2026-11-05" }),
    delivered({ id: "d", companyId: "co1", feeYen: 70_000 }),
    delivered({ id: "e", status: "completed", completedOn: "2026-10-28", feeYen: 40_000 }),
  ]);

  it("연구자 홈: 지금 맡을 수 있는 의뢰만 새로 올라온 순, 분야 칩의 숫자, 연구 중 건수", () => {
    const vm = selectLabHome(s, "ja");
    expect(vm.open.map((c) => c.id)).toEqual(["b", "a"]);
    expect(vm.filters.find((f) => f.id === "all")?.count).toBe(2);
    expect(vm.filters.find((f) => f.id === "data")?.count).toBe(1);
    expect(vm.filters.map((f) => f.id)).toEqual(["all", ...RESEARCH_FIELDS]);
    expect(selectLabHome(s, "ja", "social").open.map((c) => c.id)).toEqual(["b"]);
    expect(selectLabHome(s, "ja", "energy").open).toEqual([]);
    expect(selectLabHome(s, "ja", "energy").emptyLabel).toBe(translate("lab.openEmptyField", "ja"));
    expect(vm.activeCount).toBe(1);
    expect(vm.profile.line).toBe("Sora・サンプル大学大学院・修士1年");
    expect(selectLabHome(s, "ko").profile.line).toBe("Sora · 샘플대학교 대학원 · 석사 1년차");
    const card = vm.open[1];
    expect(card).toMatchObject({ feeLabel: "¥50,000", dueLabel: "2026年11月30日まで", dDay: "D-31", ideaLabel: "「アイデア」（チーム）", fieldLabels: ["データ分析・統計", "食品・農学"] });
  });

  it("내 연구: 상태별 묶음과 받은 의뢰비(완료만)", () => {
    const vm = selectLabMine(s, "ja");
    expect(vm.groups.map((g) => [g.status, g.items.map((i) => i.id)])).toEqual([["inProgress", ["c"]], ["delivered", ["d"]], ["completed", ["e"]]]);
    expect(vm.kpis.find((k) => k.id === "received")?.value).toBe("¥40,000");
    expect(selectLabMine(s, "ko").kpis.find((k) => k.id === "received")?.value).toBe("40,000엔");
  });

  it("기업 화면: 우리 회사 의뢰만, 확인 대기가 맨 위 · 지급한 의뢰비 · 대시보드 한 줄", () => {
    const vm = selectB2bResearch(s, "ja");
    expect(vm.requests.map((r) => r.id)).toEqual(["d", "b"]);
    expect(vm.requests[0].canComplete).toBe(true);
    expect(vm.kpis.map((k) => k.id)).toEqual([...RESEARCH_STATUSES, "paid"]);
    expect(vm.kpis.find((k) => k.id === "paid")?.value).toBe("¥0");
    expect(vm.summary).toBe("募集中 1件・研究中 0件・確認待ち 1件");
    expect(vm.needsAction).toBe(1);
    expect(vm.canCreate).toBe(true);
  });

  it("상세: 진행 단계 · 할 수 있는 일 · 거래 조건(운영 수수료는 의뢰비의 10%·최저 ¥9,000 — 기업이 따로)", () => {
    const open = selectResearchDetail(s, "a", "ja");
    expect(open?.steps.map((st) => st.state)).toEqual(["current", "todo", "todo", "todo"]);
    expect(open).toMatchObject({ canAccept: true, canSubmit: false, takenByOther: false, expired: false, canComplete: false });
    expect(selectResearchDetail(s, "late", "ja")).toMatchObject({ canAccept: false, expired: true });
    expect(selectResearchDetail(s, "c", "ja")).toMatchObject({ canSubmit: true, mine: true, researcherLabel: "Sora・サンプル大学大学院・修士1年" });
    expect(selectResearchDetail(s, "e", "ja")?.steps.every((st) => st.state === "done")).toBe(true);
    expect(selectResearchDetail(state([request({ id: "x", status: "inProgress", researcherId: "res-x", acceptedOn: "2026-10-25" })]), "x", "ja")).toMatchObject({
      takenByOther: true,
      researcherLabel: "ほかの研究者（サンプル）",
    });
    expect(selectResearchDetail(s, "nope", "ja")).toBeNull();
    expect(selectResearchDetail(s, null, "ja")).toBeNull();
    for (const locale of ["ja", "ko"] as const) {
      const terms = selectResearchDetail(s, "a", locale)?.terms ?? [];
      expect(terms).toHaveLength(4);
      const fee = terms[3].value;
      expect(fee).toMatch(locale === "ja" ? /企業が別に支払います。依頼費は満額/ : /기업이 따로 내요\. 의뢰비는 전액/);
      expect(fee).toContain(locale === "ja" ? "¥9,000" : "9,000엔");
    }
  });

  it("새 의뢰 화면: 의뢰할 수 있는 아이디어와 주소로 고른 아이디어", () => {
    expect(selectResearchForm(s, "ja", "p5").selectedId).toBe("p5");
    expect(selectResearchForm(s, "ja", "p1").selectedId).toBe("p4");
    expect(selectResearchForm(s, "ja", null).ideas.map((i) => i.id)).toEqual(["p4", "p5"]);
    expect(selectResearchForm(s, "ja", null).feeHint).toBe("研究者に満額支払う金額です（¥10,000〜¥1,000,000）。当社の手数料は、この10%（最低¥9,000）を別にご請求します。");
    const none = makeUsageState({ myCompanyId: "co2", researcher: RESEARCHER, researchRequests: [] });
    expect(selectResearchForm(none, "ja", null)).toMatchObject({ ideas: [], selectedId: null });
  });

  it("응모자 카드의 「研究依頼 n件」, 흐름 5단계, 돈을 내는 때(상금 · 연구비 + 수수료 10%)와 무료인 것(인턴 · 기업 간 의뢰)", () => {
    const posted = reducer(state(), { type: "postResearchRequest", draft: draft(), at: AT });
    expect(proposalResearchLabel(posted, "p4", "ja")).toBe("研究依頼 1件");
    expect(proposalResearchLabel(posted, "p5", "ja")).toBeNull();
    expect(researchFlow("ja")).toHaveLength(5);
    expect(researchFlow("ko")[4]).toContain("은행");
    const pay = researchPayTimings("ja");
    expect(pay.items).toHaveLength(4);
    expect(pay.items[0]).toContain("最低¥9,000");
    expect(pay.items[1]).toContain("無料");
    expect(pay.items[3]).toContain("手数料なし");
    expect(pay.note).toContain("預かりません");
    expect(pay.items.join("")).not.toMatch(/30,000|寄付/);
  });
});

describe("문구", () => {
  it("코드가 만드는 키가 모두 있어요", () => {
    const keys: string[] = [];
    for (const status of RESEARCH_STATUSES) keys.push(`research.status.${status}`);
    for (const field of RESEARCH_FIELDS) keys.push(`research.field.${field}`);
    for (const degree of ["master", "doctor"]) keys.push(`research.degree.${degree}`);
    for (const n of [1, 2, 3, 4, 5]) keys.push(`research.flow.${n}`);
    for (const g of ["inProgress", "delivered", "completed"]) keys.push(`lab.mine.group.${g}`);
    keys.push("role.researcher", "role.researcherDesc", "web.roleShort.researcher", "settings.switchToResearcher");
    expect(keys.filter((k) => !(k in MESSAGES))).toEqual([]);
  });

  it("오류 문장은 자리표시자를 모두 채워요 (두 언어)", () => {
    const draftErrors: ResearchDraftError[] = [
      "origin_invalid", "title_required", "title_too_long", "detail_required", "detail_too_long", "deliverable_required", "deliverable_too_long", "fields_required", "fields_too_many",
      "fee_invalid", "days_invalid", "contact_info",
    ];
    const resultErrors: ResearchResultError[] = ["summary_required", "summary_too_long", "file_required", "file_type", "file_too_large"];
    for (const locale of ["ja", "ko"] as const) {
      for (const e of draftErrors) expect(researchDraftErrorText(e, locale), e).not.toMatch(/[{}]/);
      for (const e of resultErrors) expect(researchResultErrorText(e, locale), e).not.toMatch(/[{}]/);
    }
    expect(researchDraftErrorText("fee_invalid", "ja")).toBe("依頼費は¥10,000〜¥1,000,000の金額を数字で入力してください");
    expect(researchResultErrorText("file_too_large", "ko")).toBe("파일은 50MB까지예요");
  });

  it("운영 수수료는 기업이 따로 내고, 연구자는 의뢰비를 전액 받아요 (「予定」은 더 없어요)", () => {
    const keys: MessageKey[] = ["research.platformFeeValue", "research.b2b.feeNote", "research.pay.note", "research.new.feeHint"];
    for (const key of keys) {
      expect(MESSAGES[key].ja + MESSAGES[key].ko, key).not.toMatch(/予定|예정/);
    }
    expect(MESSAGES["research.platformFeeValue"].ja).toContain("満額");
    expect(MESSAGES["research.platformFeeValue"].ko).toContain("전액");
  });
});
