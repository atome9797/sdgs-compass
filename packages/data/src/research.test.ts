import { describe, expect, it } from "vitest";
import { addDays, daysBetween } from "@sdgs-compass/core/format";
import { isAcceptable, nextResearchId, RESEARCH_FEE_MAX_YEN, RESEARCH_FEE_MIN_YEN, researchableProposals, resultFingerprint } from "@sdgs-compass/core/research";
import { selectB2bResearch, selectLabHome, selectLabMine } from "@sdgs-compass/core/researchView";
import { reducer } from "@sdgs-compass/core/state";
import { appReducer } from "./app";
import { createInitialState, DEMO_COMPANY_ID, DEMO_RESEARCHER_ID } from "./seed";
import { isDemoState, loadState, memoryStorage, parsePrefs, parseState, serializeState, STORAGE_KEYS } from "./storage";

const TODAY = "2026-10-30";
const AT = `${TODAY}T10:00`;
const state = createInitialState(TODAY);

describe("연구 의뢰 샘플 (연구자 = 세 번째 역할)", () => {
  it("연구자는 가상의 대학원생(소속에 「サンプル」)이고, 의뢰는 5건 — id 가 겹치지 않아요", () => {
    expect(state.researcher.id).toBe(DEMO_RESEARCHER_ID);
    expect(state.researcher.name).toBe("Sora");
    expect(JSON.stringify(state.researcher.affiliation)).toContain("サンプル");
    const ids = state.researchRequests.map((r) => r.id);
    expect(ids).toEqual(["rr-1", "rr-2", "rr-3", "rr-4", "rr-5"]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("참조하는 회사·과제가 모두 있고, 담당자는 데모 연구자뿐이에요", () => {
    const companies = new Set(state.companies.map((c) => c.id));
    const challenges = new Set(state.challenges.map((c) => c.id));
    const proposals = new Set(state.proposals.map((p) => p.id));
    for (const r of state.researchRequests) {
      expect(companies.has(r.companyId), r.id).toBe(true);
      if (r.origin.challengeId) expect(challenges.has(r.origin.challengeId), r.id).toBe(true);
      if (r.origin.proposalId) expect(proposals.has(r.origin.proposalId), r.id).toBe(true);
      expect(r.researcherId === null || r.researcherId === DEMO_RESEARCHER_ID, r.id).toBe(true);
    }
  });

  it("상태와 값이 맞아요: 모집 중 = 담당자 없음, 성과는 확인 대기·완료일 때만, 지문은 계산값과 같아요", () => {
    for (const r of state.researchRequests) {
      expect(r.status === "open", r.id).toBe(r.researcherId === null);
      expect(r.status === "delivered" || r.status === "completed", r.id).toBe(r.result !== null);
      expect(r.status === "completed", r.id).toBe(r.completedOn !== null);
      if (r.result) expect(r.result.sha256, r.id).toBe(resultFingerprint(r.id, r.result));
      expect(r.feeYen >= RESEARCH_FEE_MIN_YEN && r.feeYen <= RESEARCH_FEE_MAX_YEN, r.id).toBe(true);
      expect(daysBetween(r.postedOn, r.dueOn), r.id).toBeGreaterThan(0);
    }
  });

  it("기업 데모: 우리 회사 의뢰 1건이 성과 도착(확인 대기) — 대시보드에 「確認待ち 1件」", () => {
    const ours = state.researchRequests.filter((r) => r.companyId === DEMO_COMPANY_ID);
    expect(ours.map((r) => [r.id, r.status])).toEqual([["rr-1", "delivered"]]);
    expect(selectB2bResearch(state, "ja").summary).toBe("募集中 0件・研究中 0件・確認待ち 1件");
    // 처음에는 표창·채택한 아이디어가 없어서, 발표 때 응모자 화면에서 표창하면 「研究を依頼する」가 생겨요
    expect(researchableProposals(state)).toEqual([]);
    expect(selectB2bResearch(state, "ja").canCreate).toBe(false);
  });

  it("연구자 데모: 맡을 수 있는 의뢰 2건(기한은 오늘 이후) · 연구 중 1건 · 완료 1건(받은 의뢰비 ¥40,000)", () => {
    const home = selectLabHome(state, "ja");
    expect(home.open.map((c) => c.id)).toEqual(["rr-2", "rr-3"]);
    for (const r of state.researchRequests.filter((x) => x.status === "open")) expect(isAcceptable(r, TODAY), r.id).toBe(true);
    const mine = selectLabMine(state, "ja");
    expect(mine.groups.map((g) => g.items.map((i) => i.id))).toEqual([["rr-4"], ["rr-1"], ["rr-5"]]);
    expect(mine.kpis.find((k) => k.id === "received")?.value).toBe("¥40,000");
  });

  it("발표 흐름 한 바퀴: 표창 → 연구 의뢰 → 연구자가 맡고 성과 보냄 → 기업이 완료", () => {
    let s = reducer(state, { type: "awardProposal", proposalId: "pb-1", award: "grand" });
    expect(researchableProposals(s).map((p) => p.id)).toEqual(["pb-1"]);
    const id = nextResearchId(s);
    s = reducer(s, {
      type: "postResearchRequest",
      draft: { proposalId: "pb-1", title: "給水スポットの利用データを分析する", detail: "利用回数と時間帯を集計してください", deliverable: "報告書（PDF）", fields: ["data"], feeYen: 50_000, days: 30 },
      at: AT,
    });
    expect(selectLabHome(s, "ja").open[0].id).toBe(id);
    s = reducer(s, { type: "acceptResearchRequest", requestId: id, at: AT });
    s = reducer(s, { type: "submitResearchResult", requestId: id, draft: { summary: "まとめ", fileName: "report.pdf", fileSizeBytes: 1_000_000 }, at: AT });
    s = reducer(s, { type: "completeResearchRequest", requestId: id, at: AT });
    expect(s.researchRequests.find((r) => r.id === id)?.status).toBe("completed");
    expect(selectB2bResearch(s, "ja").kpis.find((k) => k.id === "paid")?.value).toBe("¥50,000");
  });
});

describe("저장: 연구자 역할 · 연구 의뢰", () => {
  it("설정의 역할로 researcher 를 읽고, 모르는 역할은 버려요", () => {
    expect(parsePrefs('{"locale":"ja","role":"researcher"}')).toEqual({ locale: "ja", role: "researcher" });
    expect(parsePrefs('{"locale":"ja","role":"lab"}')).toEqual({ locale: "ja", role: null });
    expect(appReducer({ locale: "ja", role: "b2c", demo: state }, { type: "setRole", role: "researcher" }).role).toBe("researcher");
  });

  it("직렬화한 뒤 다시 읽으면 같아요", () => {
    expect(isDemoState(state)).toBe(true);
    expect(parseState(serializeState(state))).toEqual(state);
  });

  it("연구 의뢰가 생기기 전에 저장된 상태도 버리지 않고, 저장했을 때의 날짜 기준 샘플을 채워요", () => {
    const old = JSON.parse(serializeState(createInitialState("2026-10-20"))) as Record<string, unknown>;
    delete old.researcher;
    delete old.researchRequests;
    const parsed = parseState(JSON.stringify(old));
    expect(parsed?.researcher.id).toBe(DEMO_RESEARCHER_ID);
    expect(parsed?.researchRequests.map((r) => r.id)).toEqual(["rr-1", "rr-2", "rr-3", "rr-4", "rr-5"]);
    expect(parsed?.researchRequests[0].postedOn).toBe(addDays("2026-10-20", -26));
  });

  it("다른 날 열면 의뢰 날짜도 같은 날수만큼 옮겨서 남은 날수가 그대로예요", async () => {
    const kv = memoryStorage({ [STORAGE_KEYS.state]: serializeState(state) });
    const later = await loadState(kv, "2026-11-14");
    const before = state.researchRequests.map((r) => daysBetween(TODAY, r.dueOn));
    const after = later.researchRequests.map((r) => daysBetween("2026-11-14", r.dueOn));
    expect(after).toEqual(before);
  });

  it("모양이 틀린 의뢰가 있으면 저장된 상태를 버려요 (상태와 맞지 않는 값 포함)", () => {
    const broken = (change: (r: Record<string, unknown>) => void) => {
      const data = JSON.parse(serializeState(state)) as { researchRequests: Record<string, unknown>[] };
      change(data.researchRequests[1]);
      return parseState(JSON.stringify(data));
    };
    expect(broken((r) => (r.status = "accepted"))).toBeNull();
    expect(broken((r) => (r.fields = ["space"]))).toBeNull();
    expect(broken((r) => (r.fields = []))).toBeNull();
    expect(broken((r) => (r.feeYen = -1))).toBeNull();
    expect(broken((r) => (r.dueOn = "next week"))).toBeNull();
    expect(broken((r) => (r.researcherId = DEMO_RESEARCHER_ID))).toBeNull();
    expect(broken((r) => (r.origin = null))).toBeNull();
    const data = JSON.parse(serializeState(state)) as Record<string, unknown>;
    data.researcher = { id: "x" };
    expect(parseState(JSON.stringify(data))).toBeNull();
  });
});
