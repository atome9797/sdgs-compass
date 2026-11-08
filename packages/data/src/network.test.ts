// 기업 네트워크(신뢰 기업끼리의 업무 의뢰 · 상호 평가): 샘플의 신뢰 실적 · 화면 데이터 · 우리 회사의 흐름 · 평가 · 날짜 옮기기 · 저장/불러오기
import { describe, expect, it } from "vitest";
import type { DemoState } from "@sdgs-compass/core/domain";
import { canRate, isTrusted, trackRecord, TRUST_RULE } from "@sdgs-compass/core/network";
import { ratingReceived, ratingSlot, selectNetworkHome, selectNetworkProfile, selectNetworkSummary, selectWorkForm, selectWorkRequest, starsText, workDraftErrorText } from "@sdgs-compass/core/networkView";
import { selectResearchDetail } from "@sdgs-compass/core/researchView";
import { selectWallet } from "@sdgs-compass/core/walletView";
import { reducer, rebaseState, type Action } from "@sdgs-compass/core/state";
import { createInitialState, DEMO_RESEARCHER_ID } from "./seed";
import { isDemoState, loadState, memoryStorage, parseState, serializeState, STORAGE_KEYS } from "./storage";

const TODAY = "2026-11-08";
const AT = "2026-11-08T10:00";
const initial = createInitialState(TODAY);
const run = (state: DemoState, ...actions: Action[]) => actions.reduce(reducer, state);
const home = (state: DemoState, tab: "find" | "open" | "mine" = "find") => selectNetworkHome(state, "ja", { tab, category: null, sort: "rating", query: "" });

describe("샘플의 신뢰 실적 (모두 가상)", () => {
  it("우리 회사(みなと)는 신뢰 기업: 상금 지급 1 + 끝난 거래 1, 평가 2건 ★5.0", () => {
    expect(trackRecord(initial, "co-minato")).toMatchObject({ prizesPaid: 1, researchPaid: 0, workDone: 1, deals: 2, late: 0, ratingCount: 2, ratingAverage: 5, trusted: true, missing: [] });
  });

  it("やさい未来ファーム만 아직 거래가 없어서 「これから」, 나머지 기업은 모두 신뢰 기업", () => {
    const trusted = Object.fromEntries(initial.companies.map((c) => [c.id, isTrusted(initial, c.id)]));
    expect(trusted).toEqual({ "co-minato": true, "co-green": true, "co-hikari": true, "co-machi": true, "co-yasai": false, "co-kotoba": true, "co-sakura": true });
    expect(trackRecord(initial, "co-yasai").missing).toEqual(["deals", "ratings"]);
    // 연구 의뢰를 끝낸 회사(まちづくり)는 연구 1건이 실적에 들어가요
    expect(trackRecord(initial, "co-machi")).toMatchObject({ researchPaid: 1, workDone: 1, ratingAverage: 4.5 });
  });

  it("규칙: 거래 1건 이상 · 평가 1건 이상 평균 ★3.5 이상 · 지급 지연 없음", () => {
    expect(TRUST_RULE).toEqual({ minDeals: 1, minRatings: 1, minAverage: 3.5 });
  });

  it("모든 기업이 할 수 있는 일을 하나 이상 가지고, 업무 의뢰·평가는 있는 회사·의뢰를 가리켜요", () => {
    const ids = new Set(initial.companies.map((c) => c.id));
    for (const c of initial.companies) expect(c.offers.length, c.id).toBeGreaterThan(0);
    for (const w of initial.workRequests) {
      expect(ids.has(w.fromCompanyId), w.id).toBe(true);
      if (w.toCompanyId) expect(ids.has(w.toCompanyId), w.id).toBe(true);
      for (const a of w.applications) expect(ids.has(a.companyId), w.id).toBe(true);
    }
    for (const r of initial.ratings) {
      if (r.toRole === "company") expect(ids.has(r.toId), r.id).toBe(true);
      else expect(r.toId).toBe(DEMO_RESEARCHER_ID);
      expect(r.stars >= 1 && r.stars <= 5).toBe(true);
    }
  });
});

describe("화면 데이터", () => {
  it("첫 화면: 신뢰 기업 5곳(우리 회사 제외, 평가 높은 순) · 공개 모집 1 · 주고받기 4 · 할 일 3", () => {
    const vm = home(initial);
    expect(vm.usText).toBe("貴社は信頼企業です。ほかの信頼企業に仕事を依頼できます。");
    expect(vm.tabs.map((t) => [t.id, t.count])).toEqual([["find", 5], ["open", 1], ["mine", 4]]);
    expect(vm.companies.map((c) => c.id)).toEqual(["co-green", "co-kotoba", "co-machi", "co-hikari", "co-sakura"]);
    expect(vm.companies.every((c) => c.canRequest && c.trust.trusted)).toBe(true);
    expect(vm.notYet).toEqual([{ id: "co-yasai", name: "やさい未来ファーム", emoji: "🥬", accent: "#56C02B", reasons: "約束どおり支払った取引がまだありません・取引の相手からの評価がまだありません" }]);
    expect(vm.groups.map((g) => [g.id, g.items.map((i) => [i.id, i.todo])])).toEqual([
      ["received", [["wr-1", "respond"]]],
      ["sent", [["wr-4", "choose"], ["wr-2", "complete"], ["wr-5", null]]],
      ["applied", []],
    ]);
    expect(vm.todoCount).toBe(3);
    expect(vm.rule).toBe("信頼企業の条件：約束どおり支払った取引が1件以上・評価が1件以上で平均★3.5以上・支払いの遅れがないこと");
  });

  it("찾기: 할 수 있는 일로 거르기 · 거래 많은 순 · 검색", () => {
    const proto = selectNetworkHome(initial, "ja", { tab: "find", category: "prototype", sort: "rating", query: "" });
    expect(proto.companies.map((c) => c.id)).toEqual(["co-sakura"]);
    expect(proto.categories.find((c) => c.id === "prototype")?.count).toBe(1);
    const deals = selectNetworkHome(initial, "ja", { tab: "find", category: null, sort: "deals", query: "" });
    expect(deals.companies.map((c) => c.trust.deals)).toEqual([2, 2, 2, 1, 1]);
    expect(selectNetworkHome(initial, "ja", { tab: "find", category: null, sort: "rating", query: "静岡" }).companies.map((c) => c.id)).toEqual(["co-sakura"]);
    expect(selectNetworkHome(initial, "ko", { tab: "find", category: null, sort: "rating", query: "물류" }).companies.map((c) => c.id)).toEqual(["co-green"]);
  });

  it("상세: 지명 의뢰(wr-2)의 조건 — 수수료 없음 · 의뢰비는 직접, 확인하고 완료할 수 있어요", () => {
    const vm = selectWorkRequest(initial, "wr-2", "ja")!;
    expect(vm.partiesLabel).toBe("みなと海洋フーズ株式会社 → さくらパック工業株式会社");
    expect(vm.terms.map((t) => [t.label, t.value])).toEqual([
      ["依頼費", "¥120,000"],
      ["納期", "2026年11月18日まで"],
      ["支払い", "完了したら、依頼した企業から受けた企業へ直接（デモでは記録だけ）"],
      ["手数料", "なし（信頼企業の特典）"],
    ]);
    expect(vm.can).toEqual({ respond: false, apply: false, choose: false, deliver: false, complete: true });
    expect(vm.steps.map((s) => s.state)).toEqual(["done", "done", "current", "todo"]);
    expect(selectWorkRequest(initial, "없음", "ja")).toBeNull();
    expect(selectWorkRequest(initial, null, "ja")).toBeNull();
  });

  it("프로필: 실적과 받은 평가(최신 순)", () => {
    const vm = selectNetworkProfile(initial, "co-minato", "ja")!;
    expect(vm.company.isUs).toBe(true);
    expect(vm.record.map((r) => r.value)).toEqual(["1件", "0件", "1件", "0件"]);
    expect(vm.ratings.map((r) => [r.starsText, r.line])).toEqual([
      ["★★★★★", "グリーンリテール株式会社・企業間の依頼・2026年10月7日"],
      ["★★★★★", "受賞した学生・賞金・2026年9月13日"],
    ]);
    expect(selectNetworkProfile(initial, "없음", "ja")).toBeNull();
    expect(starsText(3.6)).toBe("★★★★☆");
  });

  it("새 의뢰 폼: 지명할 수 있는 기업(평가 함께) · 주소로 받은 상대 · 공개 모집", () => {
    const direct = selectWorkForm(initial, "ja", { to: "co-sakura", mode: null });
    expect(direct).toMatchObject({ canPost: true, mode: "direct", toId: "co-sakura" });
    expect(direct.targets.map((t) => t.label)).toContain("さくらパック工業株式会社 ★4.0");
    expect(direct.targets.map((t) => t.id)).not.toContain("co-yasai");
    expect(selectWorkForm(initial, "ja", { to: "co-yasai", mode: null }).toId).toBeNull();
    expect(selectWorkForm(initial, "ja", { to: null, mode: "open" }).mode).toBe("open");
    expect(workDraftErrorText("budget_invalid", "ja")).toBe("依頼費は¥10,000〜¥10,000,000の金額を数字で入力してください");
    expect(workDraftErrorText("title_too_long", "ko")).toBe("제목은 60자까지예요");
  });

  it("대시보드 한 줄", () => {
    expect(selectNetworkSummary(initial, "ja")).toEqual({ text: "届いた依頼 1件・出した依頼 3件・公開募集 1件", todo: 3 });
  });
});

describe("우리 회사의 흐름", () => {
  it("받은 지명 의뢰(wr-1): 맡기 → 납품 알리기 (확인·완료는 의뢰한 기업이 해요)", () => {
    const accepted = run(initial, { type: "respondWorkRequest", requestId: "wr-1", accept: true, at: AT });
    expect(accepted.workRequests.find((w) => w.id === "wr-1")).toMatchObject({ status: "inProgress", acceptedOn: TODAY });
    expect(run(accepted, { type: "deliverWork", requestId: "wr-1", note: "", at: AT })).toBe(accepted);
    const delivered = run(accepted, { type: "deliverWork", requestId: "wr-1", note: "100セットを3店舗へ届けました", at: AT });
    expect(delivered.workRequests.find((w) => w.id === "wr-1")).toMatchObject({ status: "delivered", deliveredOn: TODAY, deliveryNote: "100セットを3店舗へ届けました" });
    expect(run(delivered, { type: "completeWork", requestId: "wr-1", at: AT })).toBe(delivered);
    expect(selectWorkRequest(delivered, "wr-1", "ja")?.waitingLabel).toBe("納品を知らせました。相手の確認を待っています。");
    const declined = run(initial, { type: "respondWorkRequest", requestId: "wr-1", accept: false, at: AT });
    expect(declined.workRequests.find((w) => w.id === "wr-1")?.status).toBe("declined");
  });

  it("낸 지명 의뢰(wr-2): 확인하고 완료 → 상대 평가 → 상대의 실적이 늘어요", () => {
    const done = run(initial, { type: "completeWork", requestId: "wr-2", at: AT });
    expect(done.workRequests.find((w) => w.id === "wr-2")).toMatchObject({ status: "completed", completedOn: TODAY });
    const detail = selectWorkRequest(done, "wr-2", "ja")!;
    expect(detail).toMatchObject({ todo: "rate", rateTarget: { toId: "co-sakura", name: "さくらパック工業株式会社" }, rating: { canRate: true, mine: null } });
    const draft = { kind: "work" as const, refId: "wr-2", toRole: "company" as const, toId: "co-sakura", stars: 5, comment: "試作が早く、改善案まで出してもらえました" };
    const rated = run(done, { type: "rate", role: "company", draft, at: AT });
    expect(trackRecord(rated, "co-sakura")).toMatchObject({ workDone: 2, ratingCount: 2, ratingAverage: 4.5 });
    expect(trackRecord(rated, "co-minato").workDone).toBe(2);
    // 같은 거래를 두 번 평가할 수 없어요
    expect(run(rated, { type: "rate", role: "company", draft, at: AT })).toBe(rated);
    expect(selectWorkRequest(rated, "wr-2", "ja")?.rating?.mine?.starsText).toBe("★★★★★");
  });

  it("낸 공개 모집(wr-4): 응모한 기업 중 한 곳에 맡겨요 (응모하지 않은 기업은 안 돼요)", () => {
    expect(run(initial, { type: "chooseWorkApplicant", requestId: "wr-4", companyId: "co-kotoba", at: AT })).toBe(initial);
    const chosen = run(initial, { type: "chooseWorkApplicant", requestId: "wr-4", companyId: "co-green", at: AT });
    expect(chosen.workRequests.find((w) => w.id === "wr-4")).toMatchObject({ status: "inProgress", toCompanyId: "co-green", acceptedOn: TODAY });
  });

  it("다른 기업의 공개 모집(wr-3)에 응모: 한 줄 · 한 번만 · 연락처는 안 돼요", () => {
    expect(run(initial, { type: "applyWorkRequest", requestId: "wr-3", message: "連絡は info@example.com へ", at: AT })).toBe(initial);
    const applied = run(initial, { type: "applyWorkRequest", requestId: "wr-3", message: "骨を取った切り身を月200食分届けられます", at: AT });
    expect(applied.workRequests.find((w) => w.id === "wr-3")?.applications).toEqual([{ companyId: "co-minato", message: "骨を取った切り身を月200食分届けられます", appliedOn: TODAY }]);
    expect(run(applied, { type: "applyWorkRequest", requestId: "wr-3", message: "もう一度", at: AT })).toBe(applied);
    expect(home(applied, "mine").groups.find((g) => g.id === "applied")?.items.map((i) => i.id)).toEqual(["wr-3"]);
  });

  it("새 의뢰: 신뢰 기업에 지명(requested) · 공개 모집(open) · 신뢰 기업이 아닌 곳에는 못 해요", () => {
    const draft = { mode: "direct" as const, toCompanyId: "co-sakura", category: "prototype", title: "干物用の紙箱を試作", detail: "冷凍に強い紙箱を3種類", budgetYen: 80_000, days: 30 };
    const posted = run(initial, { type: "postWorkRequest", draft, at: AT });
    expect(posted.workRequests[0]).toMatchObject({ id: `wr${initial.seq}`, mode: "direct", fromCompanyId: "co-minato", toCompanyId: "co-sakura", status: "requested", dueOn: "2026-12-08" });
    const open = run(initial, { type: "postWorkRequest", draft: { ...draft, mode: "open", toCompanyId: null }, at: AT });
    expect(open.workRequests[0]).toMatchObject({ status: "open", toCompanyId: null });
    expect(run(initial, { type: "postWorkRequest", draft: { ...draft, toCompanyId: "co-yasai" }, at: AT })).toBe(initial);
    expect(run(initial, { type: "postWorkRequest", draft: { ...draft, toCompanyId: "co-minato" }, at: AT })).toBe(initial);
  });
});

describe("상호 평가 (학생 · 연구자 · 기업)", () => {
  it("학생: 받은 상금의 기업을 평가해요 (과제 없는 지난 상금은 활동 id 로)", () => {
    const target = { kind: "prize" as const, refId: "h-5b", toRole: "company" as const, toId: "co-minato" };
    expect(ratingSlot(initial, "student", target, "ja")).toEqual({ canRate: true, mine: null });
    const rated = run(initial, { type: "rate", role: "student", draft: { ...target, stars: 4, comment: "審査のコメントが参考になりました" }, at: AT });
    expect(ratingSlot(rated, "student", target, "ja").mine).toMatchObject({ starsText: "★★★★☆", line: "Mina・賞金・2026年11月8日" });
    expect(canRate(initial, "student", { ...target, toId: "co-green" })).toBe(false);
  });

  it("연구자 ↔ 기업: 끝난 연구만, 서로 한 번씩 (샘플 rr-5 는 이미 서로 평가했어요)", () => {
    expect(canRate(initial, "researcher", { kind: "research", refId: "rr-5", toRole: "company", toId: "co-machi" })).toBe(false);
    expect(canRate(initial, "researcher", { kind: "research", refId: "rr-1", toRole: "company", toId: "co-minato" })).toBe(false);
    const done = run(initial, { type: "completeResearchRequest", requestId: "rr-1", at: AT });
    expect(canRate(done, "researcher", { kind: "research", refId: "rr-1", toRole: "company", toId: "co-minato" })).toBe(true);
    expect(canRate(done, "company", { kind: "research", refId: "rr-1", toRole: "researcher", toId: DEMO_RESEARCHER_ID })).toBe(true);
    const rated = run(done, { type: "rate", role: "researcher", draft: { kind: "research", refId: "rr-1", toRole: "company", toId: "co-minato", stars: 5, comment: "確認が早かったです" }, at: AT });
    expect(trackRecord(rated, "co-minato")).toMatchObject({ researchPaid: 1, ratingCount: 3, ratingAverage: 5 });
  });

  it("받은 상금 화면: 기업 상금마다 평가할 거래(ratingRef)와 지급한 기업이 있고, 특별상에는 없어요", () => {
    const entries = selectWallet(initial, "ja").entries;
    const prizes = entries.filter((e) => e.kind === "prize");
    expect(prizes.length).toBeGreaterThan(0);
    for (const e of prizes) {
      expect(e.companyId !== null && e.ratingRef !== null).toBe(true);
      expect(canRate(initial, "student", { kind: "prize", refId: e.ratingRef ?? "", toRole: "company", toId: e.companyId ?? "" })).toBe(true);
    }
    for (const e of entries.filter((x) => x.kind !== "prize")) expect([e.companyId, e.ratingRef]).toEqual([null, null]);
  });

  it("상대가 남긴 평가: 연구자는 rr-5 에서 기업의 평가를 받았고, 우리 회사가 rr-1 을 평가하면 연구자 화면에 보여요", () => {
    expect(ratingReceived(initial, "researcher", "research", "rr-5", "ja")?.line).toMatch(/^まちづくりラボ合同会社・研究依頼・/);
    expect(ratingReceived(initial, "company", "research", "rr-5", "ja")).toBeNull();
    const done = run(initial, { type: "completeResearchRequest", requestId: "rr-1", at: AT });
    const detail = selectResearchDetail(done, "rr-1", "ja");
    expect([detail?.companyId, detail?.researcherId]).toEqual(["co-minato", DEMO_RESEARCHER_ID]);
    expect(ratingReceived(done, "researcher", "research", "rr-1", "ja")).toBeNull();
    const rated = run(done, { type: "rate", role: "company", draft: { kind: "research", refId: "rr-1", toRole: "researcher", toId: DEMO_RESEARCHER_ID, stars: 5, comment: "丁寧な報告でした" }, at: AT });
    expect(ratingReceived(rated, "researcher", "research", "rr-1", "ja")).toMatchObject({ stars: 5, comment: "丁寧な報告でした" });
    expect(ratingSlot(rated, "company", { kind: "research", refId: "rr-1", toRole: "researcher", toId: DEMO_RESEARCHER_ID }, "ja")).toMatchObject({ canRate: false });
  });

  it("별은 1~5 정수, 한마디는 80자까지", () => {
    const done = run(initial, { type: "completeWork", requestId: "wr-2", at: AT });
    const base = { kind: "work" as const, refId: "wr-2", toRole: "company" as const, toId: "co-sakura", comment: "ありがとうございました" };
    for (const stars of [0, 6, 2.5]) expect(run(done, { type: "rate", role: "company", draft: { ...base, stars }, at: AT })).toBe(done);
    expect(run(done, { type: "rate", role: "company", draft: { ...base, stars: 3, comment: "あ".repeat(81) }, at: AT })).toBe(done);
  });
});

describe("지급 지연과 신뢰", () => {
  it("납품이 온 지 14일이 넘도록 확인·지급하지 않으면 「支払いの遅れ」로 신뢰 기업에서 빠져요", () => {
    const later = rebaseState(initial, TODAY);
    const stale: DemoState = { ...later, today: "2026-11-30" };
    expect(trackRecord(stale, "co-minato")).toMatchObject({ late: 2, trusted: false, missing: ["late"] });
    expect(home(stale).usText).toBe("まだ信頼企業の条件を満たしていません：支払いの遅れがあります");
    expect(home(stale).companies.every((c) => !c.canRequest)).toBe(true);
  });
});

describe("날짜 옮기기 · 저장 · 이어 쓰기", () => {
  it("다른 날 열면 의뢰·응모·평가 날짜도 같은 날수만큼 옮겨요", () => {
    const later = rebaseState(initial, "2026-11-18");
    expect(later.workRequests.find((w) => w.id === "wr-2")).toMatchObject({ postedOn: "2026-10-29", deliveredOn: "2026-11-17", dueOn: "2026-11-28" });
    expect(later.workRequests.find((w) => w.id === "wr-4")?.applications.map((a) => a.appliedOn)).toEqual(["2026-11-12", "2026-11-14"]);
    expect(later.ratings.find((r) => r.id === "ra-2")?.createdOn).toBe("2026-10-17");
  });

  it("저장했다 불러와도 그대로이고, 모양이 틀리면 버려요", () => {
    const next = run(initial, { type: "completeWork", requestId: "wr-2", at: AT });
    expect(parseState(serializeState(next))).toEqual(next);
    const bad = (patch: (s: DemoState) => unknown) => parseState(JSON.stringify(patch(next)));
    expect(bad((s) => ({ ...s, workRequests: [{ ...s.workRequests[0], status: "lost" }] }))).toBeNull();
    expect(bad((s) => ({ ...s, workRequests: [{ ...s.workRequests[0], category: "magic" }] }))).toBeNull();
    expect(bad((s) => ({ ...s, workRequests: s.workRequests.map((w) => (w.id === "wr-2" ? { ...w, completedOn: null } : w)) }))).toBeNull();
    expect(bad((s) => ({ ...s, ratings: [{ ...s.ratings[0], stars: 6 }] }))).toBeNull();
    expect(bad((s) => ({ ...s, companies: [{ ...s.companies[0], offers: ["magic"] }] }))).toBeNull();
  });

  it("기업 네트워크가 생기기 전에 저장된 상태도 샘플(의뢰 · 평가 · 회사의 할 수 있는 일 · 샘플 회사)을 채워서 이어 써요", async () => {
    const used = run(initial, { type: "toggleBookmark", challengeId: "ch-solar" });
    const { workRequests: _w, ratings: _r, ...rest } = used;
    void _w;
    void _r;
    const legacy = { ...rest, companies: rest.companies.filter((c) => c.id !== "co-sakura").map(({ offers: _o, offerNote: _n, ...c }) => c) };
    expect(isDemoState(legacy)).toBe(false);
    const kv = memoryStorage({ [STORAGE_KEYS.state]: JSON.stringify(legacy) });
    const loaded = await loadState(kv, TODAY);
    const fresh = createInitialState(TODAY);
    expect(loaded.bookmarks).toContain("ch-solar");
    expect(loaded.workRequests).toEqual(fresh.workRequests);
    expect(loaded.ratings).toEqual(fresh.ratings);
    expect(loaded.companies.map((c) => [c.id, c.offers])).toEqual(fresh.companies.map((c) => [c.id, c.offers]));
    expect(isDemoState(loaded)).toBe(true);
  });
});
