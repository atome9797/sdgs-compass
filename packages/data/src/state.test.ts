import { describe, expect, it } from "vitest";
import { evaluateCertification } from "@sdgs-compass/core/certification";
import { daysBetween } from "@sdgs-compass/core/format";
import { verifyCertificate } from "@sdgs-compass/core/certificate";
import type { DemoState } from "@sdgs-compass/core/domain";
import { POST_LIMITS, type PostDraft } from "@sdgs-compass/core/post";
import { LIMITS, type ProposalDraft } from "@sdgs-compass/core/proposal";
import { selectApplicants, selectB2bDashboard, selectCertificates, selectHome, selectImpact, selectInbox, selectReceipt, selectSearch, selectTalent } from "@sdgs-compass/core/selectors";
import { reducer, rebaseState, type Action } from "@sdgs-compass/core/state";
import { createStore } from "@sdgs-compass/core/store";
import { createInitialState } from "./seed";
import { parseState, serializeState } from "./storage";

const TODAY = "2026-10-30";
const AT = "2026-10-30T10:00";
const initial = createInitialState(TODAY);

const draft = (overrides: Partial<ProposalDraft> = {}): ProposalDraft => ({
  teamName: "Mina & Rin",
  title: "海藻由来フィルムと回収BOXの二層設計",
  summary: "プラスチックを使わない包装と、漁港での回収を組み合わせた提案です。",
  videoUrl: "",
  fileName: "plan.pdf",
  fileSizeBytes: 2_400_000,
  ...overrides,
});

const run = (state: DemoState, ...actions: Action[]) => actions.reduce(reducer, state);
const points = (state: DemoState) => selectImpact(state, "ja").totalPoints;

describe("북마크·팀 빌딩", () => {
  it("북마크를 넣고 빼요 (없는 챌린지는 무시)", () => {
    const added = run(initial, { type: "toggleBookmark", challengeId: "ch-solar" });
    expect(added.bookmarks).toContain("ch-solar");
    const removed = run(added, { type: "toggleBookmark", challengeId: "ch-solar" });
    expect(removed.bookmarks).not.toContain("ch-solar");
    expect(run(initial, { type: "toggleBookmark", challengeId: "없음" })).toBe(initial);
  });

  it("팀원 모집 글: 내 글이 맨 앞에 생겨요 (제목이 비면 무시)", () => {
    const next = run(initial, { type: "addTeamPost", challengeId: "ch-plastic", title: " 함께해요 ", body: "디자이너 구해요", rolesWanted: ["design"], at: AT });
    expect(next.teamPosts[0]).toMatchObject({ title: "함께해요", mine: true, authorName: "Mina", authorLevel: 3, challengeId: "ch-plastic", createdOn: TODAY });
    expect(next.seq).toBe(initial.seq + 1);
    expect(run(initial, { type: "addTeamPost", challengeId: "ch-plastic", title: "  ", body: "", rolesWanted: [], at: AT })).toBe(initial);
    expect(run(initial, { type: "addTeamPost", challengeId: "없음", title: "x", body: "", rolesWanted: [], at: AT })).toBe(initial);
  });

  it("참여 요청은 한 번만, 내 글에는 못 해요", () => {
    const once = run(initial, { type: "requestTeam", postId: "tp-1" });
    const post = (s: DemoState, id: string) => s.teamPosts.find((p) => p.id === id)!;
    expect(post(once, "tp-1").requestedByMe).toBe(true);
    expect(post(once, "tp-1").requests).toBe(post(initial, "tp-1").requests + 1);
    expect(run(once, { type: "requestTeam", postId: "tp-1" })).toBe(once);
    const mine = run(initial, { type: "addTeamPost", challengeId: "ch-plastic", title: "내 글", body: "", rolesWanted: [], at: AT });
    expect(run(mine, { type: "requestTeam", postId: mine.teamPosts[0].id })).toBe(mine);
  });
});

describe("기획서 제출 (F-301/F-302)", () => {
  it("제출하면 수령증·응모자 수·포인트(+120)·레벨업(Lv.3→4)이 반영돼요", () => {
    const before = points(initial);
    const next = run(initial, { type: "submitProposal", challengeId: "ch-plastic", draft: draft(), at: AT });
    const mine = next.proposals.find((p) => p.mine);
    expect(mine).toBeDefined();
    expect(mine?.receiptNo).toBe(`SC-20261030-${String(initial.seq).padStart(4, "0")}`);
    expect(mine?.versions).toHaveLength(1);
    expect(mine?.versions[0].sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(mine?.status).toBe("submitted");
    expect(next.challenges.find((c) => c.id === "ch-plastic")?.applicants).toBe(4);
    expect(points(next)).toBe(before + 120);
    expect(selectImpact(initial, "ja").level).toBe(3);
    expect(selectImpact(next, "ja").level).toBe(4);
    expect(selectReceipt(next, "ch-plastic", "ko")?.version).toBe(1);
    expect(selectReceipt(initial, "ch-plastic", "ko")).toBeNull();
  });

  it("마감 전에 다시 내면 버전만 쌓이고 응모자 수·수령증은 그대로예요", () => {
    const first = run(initial, { type: "submitProposal", challengeId: "ch-plastic", draft: draft(), at: AT });
    const second = run(first, { type: "submitProposal", challengeId: "ch-plastic", draft: draft({ title: "수정한 제목", fileName: "plan_v2.pptx" }), at: "2026-10-31T09:00" });
    const mine = second.proposals.filter((p) => p.mine);
    expect(mine).toHaveLength(1);
    expect(mine[0].versions.map((v) => v.no)).toEqual([1, 2]);
    expect(mine[0].versions[1].sha256).not.toBe(mine[0].versions[0].sha256);
    expect(mine[0].title).toBe("수정한 제목");
    expect(mine[0].receiptNo).toBe(first.proposals.find((p) => p.mine)?.receiptNo);
    expect(second.challenges.find((c) => c.id === "ch-plastic")?.applicants).toBe(4);
    expect(points(second)).toBe(points(first));
  });

  it("잘못된 입력·마감·심사 중 챌린지에는 제출되지 않아요", () => {
    expect(run(initial, { type: "submitProposal", challengeId: "ch-plastic", draft: draft({ teamName: "" }), at: AT })).toBe(initial);
    expect(run(initial, { type: "submitProposal", challengeId: "ch-plastic", draft: draft({ fileName: "a.docx" }), at: AT })).toBe(initial);
    expect(run(initial, { type: "submitProposal", challengeId: "ch-plastic", draft: draft({ fileSizeBytes: LIMITS.fileBytes + 1 }), at: AT })).toBe(initial);
    expect(run(initial, { type: "submitProposal", challengeId: "ch-bottle", draft: draft(), at: AT })).toBe(initial);
    expect(run(initial, { type: "submitProposal", challengeId: "ch-old1", draft: draft(), at: AT })).toBe(initial);
    expect(run(initial, { type: "submitProposal", challengeId: "없음", draft: draft(), at: AT })).toBe(initial);
  });
});

describe("기업(B2B) 동작", () => {
  it("챌린지를 출제하면 학생 화면의 검색에도 보여요", () => {
    const next = run(initial, {
      type: "createChallenge",
      draft: { title: "ユニークな漁港キャンペーン案", summary: "概要", sdgIds: [14], prizeYen: 30_000, days: 10, participation: "both", internship: false },
    });
    expect(next.challenges[0]).toMatchObject({ companyId: "co-minato", status: "open", closesOn: "2026-11-09" });
    expect(selectSearch(next, "ja", { query: "ユニークな漁港", sdgIds: [] }).map((c) => c.id)).toEqual([next.challenges[0].id]);
    expect(selectB2bDashboard(next, "ko").challenges.map((c) => c.id)).toContain(next.challenges[0].id);
    expect(run(initial, { type: "createChallenge", draft: { title: "", summary: "", sdgIds: [], prizeYen: -1, days: 0, participation: "both", internship: false } })).toBe(initial);
  });

  it("심사 점수는 1~5 로 맞추고, 상태가 '심사 완료'가 돼요", () => {
    const next = run(initial, { type: "reviewProposal", proposalId: "pp-1", review: { creativity: 9, feasibility: 0, sdgContribution: 3.6, comment: " 좋아요 " }, at: AT });
    const p = next.proposals.find((x) => x.id === "pp-1")!;
    expect(p.status).toBe("reviewed");
    expect(p.review).toEqual({ creativity: 5, feasibility: 1, sdgContribution: 4, comment: "좋아요", reviewedAt: AT });
    expect(run(initial, { type: "reviewProposal", proposalId: "없음", review: { creativity: 3, feasibility: 3, sdgContribution: 3, comment: "" }, at: AT })).toBe(initial);
  });

  it("채택하면 매칭 수수료 ¥30,000 중 ¥15,000 이 기부로 기록돼요", () => {
    const before = selectB2bDashboard(initial, "ja");
    const next = run(initial, { type: "awardProposal", proposalId: "pb-1", award: "grand" }, { type: "adoptProposal", proposalId: "pb-1", at: AT });
    const p = next.proposals.find((x) => x.id === "pb-1")!;
    expect(p.status).toBe("adopted");
    expect(p.award).toBe("grand");
    const added = next.matches[next.matches.length - 1];
    expect(added).toMatchObject({ proposalId: "pb-1", companyId: "co-minato", feeYen: 30_000, donationYen: 15_000, matchedOn: TODAY });
    const after = selectB2bDashboard(next, "ja");
    expect(before.kpis.find((k) => k.id === "donation")?.value).toBe("¥30,000");
    expect(after.kpis.find((k) => k.id === "donation")?.value).toBe("¥45,000");
    expect(after.kpis.find((k) => k.id === "matches")?.value).toBe("3");
    expect(after.fee.rows).toHaveLength(3);
  });

  it("같은 응모작을 두 번 채택해도 한 번만 기록돼요, 채택된 건 수상 변경 불가", () => {
    const once = run(initial, { type: "adoptProposal", proposalId: "pb-2", at: AT });
    expect(run(once, { type: "adoptProposal", proposalId: "pb-2", at: AT })).toBe(once);
    expect(run(once, { type: "awardProposal", proposalId: "pb-2", award: "special" })).toBe(once);
    expect(once.matches).toHaveLength(initial.matches.length + 1);
  });
});

describe("스카우트 (F-601/F-602)", () => {
  const send = (s: DemoState, candidateId: string, message = "お話ししませんか？") => run(s, { type: "sendScout", candidateId, kind: "interview", message, at: AT });

  it("보낼 수 있는 학생에게 보내면 기록돼요", () => {
    const next = send(initial, "cand-yuna");
    expect(next.scouts[0]).toMatchObject({ studentId: "cand-yuna", companyId: "co-minato", status: "sent" });
    expect(selectTalent(next, "ja", { query: "", sdgIds: [] }).remaining).toBe(2);
  });

  it("스카우트를 거부한 학생·같은 학생 중복·빈 메시지는 무시해요", () => {
    expect(send(initial, "cand-mei")).toBe(initial);
    const once = send(initial, "cand-yuna");
    expect(send(once, "cand-yuna")).toBe(once);
    expect(send(initial, "cand-sota", "  ")).toBe(initial);
    expect(send(initial, "없음")).toBe(initial);
  });

  it("하루 3건을 넘으면 보낼 수 없어요", () => {
    let s = send(initial, "cand-yuna");
    s = send(s, "cand-sota");
    s = send(s, "cand-ren");
    const blocked = send(s, "cand-haru");
    expect(blocked).toBe(s);
    const talent = selectTalent(s, "ko", { query: "", sdgIds: [] });
    expect(talent.remaining).toBe(0);
    expect(talent.candidates.every((c) => !c.canScout)).toBe(true);
  });

  it("학생 화면의 나(Mina)에게 보낸 스카우트가 받은 메시지에 도착하고, 읽음·수락 처리돼요", () => {
    const before = selectInbox(initial, "ja");
    expect(before.unreadCount).toBe(1);
    const sent = send(initial, "stu-mina", "インターンの面談はいかがですか？");
    const inbox = selectInbox(sent, "ko");
    expect(inbox.items).toHaveLength(selectInbox(initial, "ko").items.length + 1); // 샘플 3건 + 방금 받은 1건
    expect(inbox.unreadCount).toBe(2);
    expect(inbox.items[0].companyName).toContain("미나토");
    const id = inbox.items[0].id;
    const read = run(sent, { type: "markScoutRead", scoutId: id });
    expect(selectInbox(read, "ja").unreadCount).toBe(1);
    expect(run(read, { type: "markScoutRead", scoutId: id })).toBe(read);
    const accepted = run(read, { type: "respondScout", scoutId: id, response: "accepted" });
    expect(selectInbox(accepted, "ja").items.find((i) => i.id === id)?.statusLabel).not.toBeNull();
    expect(selectInbox(accepted, "ja").items.find((i) => i.id === id)?.canRespond).toBe(false);
  });
});

describe("공유·인증마크·ESG", () => {
  it("공유 1회마다 +10pt (최대 5회까지만 포인트)", () => {
    const start = points(initial);
    let s = initial;
    for (let i = 0; i < 8; i++) s = run(s, { type: "recordShare" });
    expect(s.shares).toBe(initial.shares + 8);
    expect(points(s)).toBe(start - 10 * initial.shares + 50);
  });

  it("증빙을 올리면 인증 점수가 오르고 ★2 가 돼요", () => {
    const before = evaluateCertification(initial.cert);
    const next = run(initial, { type: "setCertAnswer", id: "womenManagers", evidence: true });
    const after = evaluateCertification(next.cert);
    expect(before.level).toBe(1);
    expect(after.total).toBe(62);
    expect(after.level).toBe(2);
  });

  it("입력값은 허용 범위로 맞춰요", () => {
    const next = run(initial, { type: "setCertAnswer", id: "ecoPackage", value: 250 }, { type: "setCertAnswer", id: "volunteer", value: -3 });
    expect(next.cert.ecoPackage.value).toBe(100);
    expect(next.cert.volunteer.value).toBe(0);
  });

  it("ESG 리포트 생성일이 기록돼요", () => {
    expect(initial.esgGeneratedOn).toBeNull();
    expect(run(initial, { type: "generateEsg", at: AT }).esgGeneratedOn).toBe(TODAY);
  });
});

describe("hydrate / reset / rebase", () => {
  it("hydrate·reset 은 상태를 통째로 바꿔요", () => {
    const other = createInitialState("2027-01-01");
    expect(run(initial, { type: "hydrate", state: other })).toBe(other);
    expect(run(initial, { type: "reset", state: other })).toBe(other);
  });

  it("rebase: 같은 날이면 그대로, 다른 날이면 모든 날짜가 같은 만큼 옮겨져요", () => {
    expect(rebaseState(initial, TODAY)).toBe(initial);
    const later = rebaseState(initial, "2027-03-01");
    expect(later.today).toBe("2027-03-01");
    initial.challenges.forEach((c, i) => {
      expect(daysBetween(later.today, later.challenges[i].closesOn)).toBe(daysBetween(TODAY, c.closesOn));
      expect(daysBetween(later.challenges[i].opensOn, later.challenges[i].closesOn)).toBe(daysBetween(c.opensOn, c.closesOn));
    });
    initial.proposals.forEach((p, i) => {
      expect(daysBetween(later.today, later.proposals[i].submittedAt)).toBe(daysBetween(TODAY, p.submittedAt));
      expect(later.proposals[i].submittedAt.slice(10)).toBe(p.submittedAt.slice(10));
    });
    expect(selectHome(later, "ja").recommended[0].id).toBe("ch-plastic");
    expect(selectImpact(later, "ja").totalPoints).toBe(points(initial));
  });

  it("rebase 는 원본을 바꾸지 않아요", () => {
    const snapshot = JSON.stringify(initial);
    rebaseState(initial, "2028-01-01");
    expect(JSON.stringify(initial)).toBe(snapshot);
  });
});

describe("저장소(store)", () => {
  it("바뀔 때만 구독자를 불러요", () => {
    const store = createStore(reducer, initial);
    let calls = 0;
    const off = store.subscribe(() => calls++);
    store.dispatch({ type: "toggleBookmark", challengeId: "없음" });
    expect(calls).toBe(0);
    store.dispatch({ type: "recordShare" });
    expect(calls).toBe(1);
    off();
    store.dispatch({ type: "recordShare" });
    expect(calls).toBe(1);
    expect(store.getState().shares).toBe(initial.shares + 2);
  });
});

describe("발표 시나리오 한 바퀴 (학생 ↔ 기업)", () => {
  it("출제 → 제출 → 심사 → 수상·채택 → 포트폴리오·증명서까지 이어져요", () => {
    const store = createStore(reducer, createInitialState(TODAY));
    const d = store.dispatch;

    // 1) 기업이 챌린지를 출제 → 학생 검색에 나타남
    d({ type: "createChallenge", draft: { title: "朝市×デジタル企画", summary: "朝市の魅力を発信する", sdgIds: [14, 8], prizeYen: 80_000, days: 14, participation: "both", internship: true } });
    const newId = store.getState().challenges[0].id;
    expect(selectSearch(store.getState(), "ko", { query: "朝市", sdgIds: [14] }).some((c) => c.id === newId)).toBe(true);

    // 2) 학생이 기획서를 제출 → 수령증, 레벨 업
    d({ type: "submitProposal", challengeId: newId, draft: draft(), at: AT });
    const receipt = selectReceipt(store.getState(), newId, "ja");
    expect(receipt?.receiptNo).toMatch(/^SC-20261030-\d{4}$/);
    expect(selectImpact(store.getState(), "ja").level).toBe(4);

    // 3) 기업 화면에 내 응모작이 보임 → 심사 → 수상 → 채택
    const applicants = selectApplicants(store.getState(), "ja", newId);
    expect(applicants.applicants).toHaveLength(1);
    const proposalId = applicants.applicants[0].id;
    d({ type: "reviewProposal", proposalId, review: { creativity: 5, feasibility: 4, sdgContribution: 5, comment: "素晴らしい" }, at: AT });
    d({ type: "awardProposal", proposalId, award: "grand" });
    d({ type: "adoptProposal", proposalId, at: AT });

    // 4) 학생 포트폴리오에 수상·보너스가 반영되고, 새 증명서는 검증을 통과
    const impact = selectImpact(store.getState(), "ja");
    expect(impact.badges.map((b) => b.code)).toContain("winner");
    expect(impact.totalPoints).toBe(1476 + 100 + 75 + 400); // 제출 +100(출제 기본값) +심사 보너스 75 +대상 400
    const certs = selectCertificates(store.getState(), "ja");
    expect(certs.length).toBeGreaterThanOrEqual(6);
    for (const c of certs) expect(verifyCertificate(c.cert)).toBe(true);
    expect(certs[0].awardLabel).not.toBeNull();

    // 5) 기업 대시보드에는 기부가 늘어남
    expect(selectB2bDashboard(store.getState(), "ja").kpis.find((k) => k.id === "donation")?.value).toBe("¥45,000");
  });
});

describe("SNS 피드: 글 올리기·좋아요·삭제 (F-503 · F-504)", () => {
  const brag = (overrides: Partial<PostDraft> = {}): PostDraft => ({ kind: "brag", body: "  優秀賞をいただきました！  ", activityId: "h-5b", ...overrides });
  const pr = (overrides: Partial<PostDraft> = {}): PostDraft => ({ kind: "pr", title: " 朝市で容器を減らしました ", body: "学生の提案を試しました。", sdgIds: [14, 12], ...overrides });
  const create = (state: DemoState, draft: PostDraft) => run(state, { type: "createPost", draft, at: AT });
  const post = (state: DemoState, id: string) => state.posts.find((p) => p.id === id)!;

  it("자랑 글: 내 실적 1건이 붙고 SDGs 가 자동으로 붙어요 (포인트·레벨은 그대로)", () => {
    const next = create(initial, brag());
    expect(next.posts).toHaveLength(initial.posts.length + 1);
    expect(next.posts[0]).toMatchObject({
      id: `po${initial.seq}`, kind: "brag", authorName: "Mina", authorLevel: 3, body: "優秀賞をいただきました！",
      sdgIds: [14, 12], createdAt: AT, likes: 0, likedBy: [], mine: true,
    });
    expect(next.posts[0]).toMatchObject({ achievement: { activityId: "h-5b", kind: "award", award: "excellence" } });
    expect(next.seq).toBe(initial.seq + 1);
    expect(points(next)).toBe(points(initial));
  });

  it("자랑 글: 방금 낸 기획서도 붙일 수 있고, 카드뉴스 공유 기록은 붙일 수 없어요", () => {
    const submitted = run(initial, { type: "submitProposal", challengeId: "ch-plastic", draft: draft(), at: AT });
    const proposalId = submitted.proposals.find((p) => p.mine)!.id;
    const withPost = create(submitted, brag({ activityId: `act-${proposalId}` }));
    expect(withPost.posts[0]).toMatchObject({ kind: "brag", achievement: { activityId: `act-${proposalId}`, kind: "submission" } });
    expect(create(initial, brag({ activityId: "act-share-1" }))).toBe(initial);
  });

  it("자랑 글: 검사를 통과하지 못하면 아무것도 바뀌지 않아요", () => {
    for (const bad of [
      brag({ activityId: null }), brag({ activityId: "남의 실적" }), brag({ body: "   " }),
      brag({ body: "あ".repeat(POST_LIMITS.bragBody + 1) }), brag({ body: "連絡は mina@example.com まで" }), brag({ body: "090-1234-5678" }),
    ]) {
      expect(create(initial, bad)).toBe(initial);
    }
  });

  it("홍보 글: 우리 회사 이름으로 올라가고, 제목·본문은 앞뒤 공백을 지우고, SDGs 는 중복을 빼요", () => {
    const next = create(initial, pr({ sdgIds: [14, 12, 14], challengeId: "ch-plastic" }));
    expect(next.posts[0]).toMatchObject({
      kind: "pr", companyId: initial.myCompanyId, title: "朝市で容器を減らしました", body: "学生の提案を試しました。",
      sdgIds: [14, 12], challengeId: "ch-plastic", official: null, likes: 0, likedBy: [], mine: true,
    });
    expect(next.seq).toBe(initial.seq + 1);
  });

  it("홍보 글: 검사를 통과하지 못하면 아무것도 바뀌지 않아요 (제목 없음 · SDGs 없음 · 다른 회사 챌린지 · 연락처)", () => {
    for (const bad of [
      pr({ title: "" }), pr({ sdgIds: [] }), pr({ sdgIds: [1, 2, 3, 4] }), pr({ challengeId: "ch-solar" }),
      pr({ title: "題".repeat(POST_LIMITS.prTitle + 1) }), pr({ body: "文".repeat(POST_LIMITS.prBody + 1) }),
      pr({ body: "お問い合わせは info@example.co.jp まで" }),
    ]) {
      expect(create(initial, bad)).toBe(initial);
    }
  });

  it("공식 SNS 게시: 내일부터 가장 빠른 빈 날짜가 배정돼요 (다른 기업이 내일·모레를 받아서 3일 뒤)", () => {
    const first = create(initial, pr({ requestOfficial: true }));
    expect(first.posts[0]).toMatchObject({ official: { on: "2026-11-02", feeYen: 3000, status: "scheduled" } });
    const second = create(first, pr({ title: "もう一件", requestOfficial: true }));
    expect(second.posts[0]).toMatchObject({ official: { on: "2026-11-03" } });
    // 신청하지 않으면 날짜는 없고, 다른 날짜도 차지하지 않아요
    const plain = create(second, pr({ title: "申込なし" }));
    expect(plain.posts[0]).toMatchObject({ official: null });
    // 첫 글을 지우면 그 날짜가 다시 비어요 (하루에 한 회사만)
    const deleted = run(second, { type: "deletePost", postId: first.posts[0].id, role: "b2b" });
    expect(deleted.posts.find((p) => p.id === first.posts[0].id)).toBeUndefined();
    const again = create(deleted, pr({ title: "다시", requestOfficial: true }));
    expect(again.posts[0]).toMatchObject({ official: { on: "2026-11-02" } });
  });

  it("공식 게시 날짜는 어떤 글도 겹치지 않아요", () => {
    let state = initial;
    for (let i = 0; i < 6; i++) state = create(state, pr({ title: `申込${i}`, requestOfficial: true }));
    const days = state.posts.flatMap((p) => (p.kind === "pr" && p.official ? [p.official.on] : []));
    expect(new Set(days).size).toBe(days.length);
    expect(days.every((d) => daysBetween(TODAY, d) >= 1)).toBe(true);
  });

  it("좋아요: 학생·기업 계정이 따로 누르고, 다시 누르면 취소돼요", () => {
    const likedByStudent = run(initial, { type: "togglePostLike", postId: "po-1", role: "b2c" });
    expect(post(likedByStudent, "po-1")).toMatchObject({ likes: post(initial, "po-1").likes + 1, likedBy: ["b2c"] });
    const both = run(likedByStudent, { type: "togglePostLike", postId: "po-1", role: "b2b" });
    expect(post(both, "po-1")).toMatchObject({ likes: post(initial, "po-1").likes + 2, likedBy: ["b2c", "b2b"] });
    const undone = run(both, { type: "togglePostLike", postId: "po-1", role: "b2c" });
    expect(post(undone, "po-1")).toMatchObject({ likes: post(initial, "po-1").likes + 1, likedBy: ["b2b"] });
    expect(run(undone, { type: "togglePostLike", postId: "po-1", role: "b2b" })).toEqual(initial);
  });

  it("좋아요: 내가 쓴 글에는 누를 수 없어요 (남의 계정이 쓴 글에는 눌러요)", () => {
    // 우리 회사 글(po-4): 기업 계정은 못 누르고, 학생 계정은 눌러요
    expect(run(initial, { type: "togglePostLike", postId: "po-4", role: "b2b" })).toBe(initial);
    expect(post(run(initial, { type: "togglePostLike", postId: "po-4", role: "b2c" }), "po-4").likedBy).toEqual(["b2c"]);
    // 내가 쓴 자랑 글: 학생 계정은 못 누르고, 기업 계정은 눌러요
    const mine = create(initial, brag());
    const id = mine.posts[0].id;
    expect(run(mine, { type: "togglePostLike", postId: id, role: "b2c" })).toBe(mine);
    expect(post(run(mine, { type: "togglePostLike", postId: id, role: "b2b" }), id).likedBy).toEqual(["b2b"]);
    expect(run(initial, { type: "togglePostLike", postId: "없음", role: "b2c" })).toBe(initial);
  });

  it("삭제: 내 글만, 글을 쓴 계정에서만 지울 수 있어요", () => {
    const mine = create(initial, brag());
    const id = mine.posts[0].id;
    expect(run(mine, { type: "deletePost", postId: id, role: "b2b" })).toBe(mine); // 기업 계정은 학생의 글을 못 지워요
    expect(run(mine, { type: "deletePost", postId: id, role: "b2c" }).posts).toEqual(initial.posts); // (글 번호용 seq 는 되돌리지 않아요)
    // 샘플로 들어 있는 남의 글은 지울 수 없어요
    expect(run(initial, { type: "deletePost", postId: "po-1", role: "b2c" })).toBe(initial);
    expect(run(initial, { type: "deletePost", postId: "po-5", role: "b2b" })).toBe(initial);
    // 우리 회사의 샘플 글(po-4)은 기업 계정에서만 지울 수 있어요
    expect(run(initial, { type: "deletePost", postId: "po-4", role: "b2c" })).toBe(initial);
    expect(run(initial, { type: "deletePost", postId: "po-4", role: "b2b" }).posts.map((p) => p.id)).not.toContain("po-4");
    expect(run(initial, { type: "deletePost", postId: "없음", role: "b2c" })).toBe(initial);
  });

  it("기준일을 옮기면 글의 시각과 공식 게시 날짜도 같은 날수만큼 옮겨져요", () => {
    const state = create(create(initial, brag()), pr({ requestOfficial: true }));
    const later = rebaseState(state, "2026-11-10");
    state.posts.forEach((p, i) => {
      expect(daysBetween(later.today, later.posts[i].createdAt.slice(0, 10))).toBe(daysBetween(TODAY, p.createdAt.slice(0, 10)));
      expect(later.posts[i].createdAt.slice(10)).toBe(p.createdAt.slice(10));
      if (p.kind === "pr" && p.official) {
        const moved = later.posts[i];
        expect(moved.kind === "pr" && moved.official && daysBetween(later.today, moved.official.on)).toBe(daysBetween(TODAY, p.official.on));
      }
    });
    // 새로 시작한 상태와 같은 모양이에요
    expect(rebaseState(initial, "2026-11-10").posts).toEqual(createInitialState("2026-11-10").posts);
  });

  it("글이 있는 상태도 저장했다 불러오면 그대로예요", () => {
    const state = create(create(initial, brag()), pr({ requestOfficial: true, challengeId: "ch-bottle" }));
    expect(parseState(serializeState(state))).toEqual(state);
  });
});
