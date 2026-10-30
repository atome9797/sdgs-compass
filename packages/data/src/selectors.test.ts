// 화면 모델(selectors) 점검: 웹·모바일 화면은 이 함수들의 결과만 그려요.
// 그래서 (1) 일본어·한국어 어느 쪽에서도 문구에 빈 칸({name})·undefined·NaN 이 새지 않고,
// (2) 두 언어의 모양(키·배열 길이·null 여부)이 같고, (3) 화면이 기대하는 정렬·필터·상태가 맞는지 확인해요.
import { describe, expect, it } from "vitest";
import { CERT_DISCLAIMER, evaluateCertification } from "@sdgs-compass/core/certification";
import { verifyCertificate } from "@sdgs-compass/core/certificate";
import type { DemoState } from "@sdgs-compass/core/domain";
import { formatYen } from "@sdgs-compass/core/format";
import { LOCALES, type Locale } from "@sdgs-compass/core/i18n";
import type { ProposalDraft } from "@sdgs-compass/core/proposal";
import { SCOUT_DAILY_LIMIT } from "@sdgs-compass/core/scout";
import { SDG_IDS } from "@sdgs-compass/core/sdg";
import {
  selectApplicants,
  selectB2bDashboard,
  selectCertificates,
  selectChallengeDetail,
  selectComposer,
  selectEsg,
  selectFeed,
  selectHome,
  selectImpact,
  selectInbox,
  selectReceipt,
  selectSdgTiles,
  selectSearch,
  selectShare,
  selectTalent,
  tamperedCopy,
} from "@sdgs-compass/core/selectors";
import type { PostVM } from "@sdgs-compass/core/selectors";
import { reducer, type Action } from "@sdgs-compass/core/state";
import { createInitialState } from "./seed";

const TODAY = "2026-10-30";
const AT = "2026-10-30T10:00";
const initial = createInitialState(TODAY);
const run = (state: DemoState, ...actions: Action[]) => actions.reduce(reducer, state);

const draft: ProposalDraft = {
  teamName: "Mina & Rin",
  title: "海藻由来フィルムと回収BOXの二層設計",
  summary: "プラスチックを使わない包装と、漁港での回収を組み合わせた提案です。",
  videoUrl: "https://example.com/pitch",
  fileName: "plan.pdf",
  fileSizeBytes: 2_400_000,
};

/** 화면에서 할 수 있는 일을 두루 해 본 상태 (제출·북마크·팀 글·공유·스카우트·심사·수상·채용·증빙·ESG 리포트) */
const busy = run(
  initial,
  { type: "submitProposal", challengeId: "ch-plastic", draft, at: AT },
  { type: "toggleBookmark", challengeId: "ch-solar" },
  { type: "addTeamPost", challengeId: "ch-plastic", title: "仲間募集", body: "デザイナーを探しています", rolesWanted: ["design"], at: AT },
  { type: "requestTeam", postId: "tp-1" },
  { type: "recordShare" },
  { type: "sendScout", candidateId: "cand-yuna", kind: "internship", message: "ご興味はありますか？", at: AT },
  { type: "sendScout", candidateId: "stu-mina", kind: "interview", message: "面談はいかがですか？", at: AT },
  { type: "reviewProposal", proposalId: "pp-1", review: { creativity: 4, feasibility: 4, sdgContribution: 5, comment: "実現しやすい提案です" }, at: AT },
  { type: "awardProposal", proposalId: "pb-1", award: "grand" },
  { type: "adoptProposal", proposalId: "pb-1", at: AT },
  { type: "setCertAnswer", id: "womenManagers", evidence: true },
  { type: "generateEsg", at: AT },
  { type: "createPost", draft: { kind: "brag", body: "プラスチック削減ハッカソンで優秀賞をいただきました！", activityId: "h-5b" }, at: AT },
  { type: "createPost", draft: { kind: "pr", title: "マイボトル企画の審査が終わりました", body: "ご応募ありがとうございました。", sdgIds: [14, 12], challengeId: "ch-bottle", requestOfficial: true }, at: AT },
  { type: "togglePostLike", postId: "po-1", role: "b2c" },
  { type: "togglePostLike", postId: "po-5", role: "b2b" },
);

const noScoutsLeft = run(
  initial,
  { type: "sendScout", candidateId: "cand-yuna", kind: "interview", message: "a", at: AT },
  { type: "sendScout", candidateId: "cand-sota", kind: "interview", message: "a", at: AT },
  { type: "sendScout", candidateId: "cand-ren", kind: "interview", message: "a", at: AT },
);

const STATES: [string, DemoState][] = [
  ["처음 상태", initial],
  ["이것저것 해 본 상태", busy],
  ["스카우트 한도를 다 쓴 상태", noScoutsLeft],
];

function allViews(state: DemoState, locale: Locale) {
  return {
    tiles: selectSdgTiles(locale),
    home: selectHome(state, locale),
    search: selectSearch(state, locale, { query: "", sdgIds: [] }),
    searchSdg: selectSearch(state, locale, { query: "", sdgIds: [14] }),
    detailOpen: selectChallengeDetail(state, "ch-plastic", locale),
    detailJudging: selectChallengeDetail(state, "ch-bottle", locale),
    detailMissing: selectChallengeDetail(state, "없음", locale),
    receipt: selectReceipt(state, "ch-plastic", locale),
    impact: selectImpact(state, locale),
    certificates: selectCertificates(state, locale),
    shareInstagram: selectShare(state, locale, "instagram", null),
    shareLinkedin: selectShare(state, locale, "linkedin", null),
    inbox: selectInbox(state, locale),
    dashboard: selectB2bDashboard(state, locale),
    applicants: selectApplicants(state, locale, null),
    applicantsPlastic: selectApplicants(state, locale, "ch-plastic"),
    talent: selectTalent(state, locale, { query: "", sdgIds: [] }),
    esg: selectEsg(state, locale),
    feedStudent: selectFeed(state, locale, "b2c"),
    feedCompanyPr: selectFeed(state, locale, "b2b", "pr"),
    feedStudentBrag: selectFeed(state, locale, "b2c", "brag"),
    composerBrag: selectComposer(state, locale, "brag"),
    composerPr: selectComposer(state, locale, "pr", { challengeId: "ch-plastic" }),
  };
}

const BAD_TEXT = /\{\w+\}|\[object |(^|[^A-Za-z])(undefined|NaN|null)([^A-Za-z]|$)/;

/** 화면에 새면 안 되는 값(빈 칸·undefined·NaN·무한대)을 찾아요 */
function problems(value: unknown, path = "$"): string[] {
  if (value === undefined) return [`${path}: undefined`];
  if (typeof value === "number") return Number.isFinite(value) ? [] : [`${path}: ${value}`];
  if (typeof value === "string") return BAD_TEXT.test(value) ? [`${path}: "${value}"`] : [];
  if (Array.isArray(value)) return value.flatMap((item, i) => problems(item, `${path}[${i}]`));
  if (value !== null && typeof value === "object") return Object.entries(value).flatMap(([key, item]) => problems(item, `${path}.${key}`));
  return [];
}

/** 값은 빼고 모양만 (키·배열 길이·타입·null) */
function shapeOf(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(shapeOf);
  if (value === null) return "null";
  if (typeof value === "object") return Object.fromEntries(Object.entries(value as object).map(([key, item]) => [key, shapeOf(item)]));
  return typeof value;
}

describe("모든 화면 모델: 문구 점검", () => {
  for (const [name, state] of STATES) {
    for (const locale of LOCALES) {
      it(`${name} · ${locale}: 빈 칸·undefined·NaN 이 없어요`, () => {
        const views = allViews(state, locale);
        for (const [view, value] of Object.entries(views)) {
          expect(problems(value, view)).toEqual([]);
        }
      });
    }

    it(`${name}: 일본어와 한국어의 모양(키·배열 길이·null)이 같아요`, () => {
      const ja = allViews(state, "ja");
      const ko = allViews(state, "ko");
      for (const view of Object.keys(ja) as (keyof typeof ja)[]) {
        expect([view, shapeOf(ja[view])]).toEqual([view, shapeOf(ko[view])]);
      }
    });

    it(`${name}: 화면 모델은 JSON 으로 저장·복원해도 같아요 (함수·순환 참조 없음)`, () => {
      for (const locale of LOCALES) {
        const views = allViews(state, locale);
        expect(JSON.parse(JSON.stringify(views))).toEqual(views);
      }
    });
  }

  it("같은 상태·언어로 부르면 항상 같은 결과예요 (순수 함수)", () => {
    for (const locale of LOCALES) {
      expect(allViews(busy, locale)).toEqual(allViews(busy, locale));
    }
  });
});

describe("SDGs 타일·홈", () => {
  it("17개 타일: 번호 순서, 글자색은 흰색 또는 어두운색", () => {
    for (const locale of LOCALES) {
      const tiles = selectSdgTiles(locale);
      expect(tiles.map((t) => t.id)).toEqual([...SDG_IDS]);
      for (const tile of tiles) {
        expect(tile.color).toMatch(/^#[0-9A-F]{6}$/);
        expect(["#FFFFFF", "#10161F"]).toContain(tile.textColor);
        expect(tile.short.length).toBeGreaterThan(0);
        expect(tile.name.length).toBeGreaterThan(0);
      }
    }
  });

  it("홈: 추천은 최대 5개·매칭률 내림차순·모집 중만, 마감 임박은 최대 3개·가까운 순", () => {
    for (const locale of LOCALES) {
      const home = selectHome(initial, locale);
      expect(home.nickname).toBe("Mina");
      expect(home.sdgTiles).toHaveLength(17);
      expect(home.recommended.length).toBeGreaterThan(0);
      expect(home.recommended.length).toBeLessThanOrEqual(5);
      expect(home.recommended.every((c) => c.isOpen && c.match !== null)).toBe(true);
      const matches = home.recommended.map((c) => c.match ?? 0);
      expect([...matches].sort((a, b) => b - a)).toEqual(matches);
      expect(home.recommended.every((c) => c.reasons.length > 0)).toBe(true);
      expect(home.soon.length).toBeLessThanOrEqual(3);
      expect(home.soon.every((c) => c.isOpen)).toBe(true);
      const days = home.soon.map((c) => c.daysLeft);
      expect([...days].sort((a, b) => a - b)).toEqual(days);
      expect(home.activities.length).toBeGreaterThan(0);
      expect(home.activities.every((a) => a.kind !== "share")).toBe(true);
    }
  });

  it("북마크한 챌린지 카드에 표시가 붙어요", () => {
    const card = (state: DemoState) => selectSearch(state, "ja", { query: "", sdgIds: [] }).find((c) => c.id === "ch-solar");
    expect(card(initial)?.bookmarked).toBe(false);
    expect(card(busy)?.bookmarked).toBe(true);
  });
});

describe("검색", () => {
  it("검색어가 없으면 모든 챌린지가 나오고 모집 중이 먼저예요", () => {
    for (const locale of LOCALES) {
      const all = selectSearch(initial, locale, { query: "", sdgIds: [] });
      expect(all).toHaveLength(initial.challenges.length);
      const firstClosed = all.findIndex((c) => !c.isOpen);
      expect(firstClosed).toBeGreaterThan(0);
      expect(all.slice(firstClosed).every((c) => !c.isOpen)).toBe(true);
    }
  });

  it("일본어·한국어 어느 쪽 낱말로 찾아도 같은 챌린지를 찾고, 화면 언어로 보여 줘요", () => {
    const ja = selectSearch(initial, "ja", { query: "海洋プラスチック", sdgIds: [] });
    const ko = selectSearch(initial, "ko", { query: "해양 플라스틱", sdgIds: [] });
    expect(ja.map((c) => c.id)).toContain("ch-plastic");
    expect(ko.map((c) => c.id)).toContain("ch-plastic");
    const crossJa = selectSearch(initial, "ja", { query: "해양 플라스틱", sdgIds: [] });
    expect(crossJa.map((c) => c.id)).toEqual(ko.map((c) => c.id));
    expect(ja.find((c) => c.id === "ch-plastic")?.title).toContain("プラスチック");
    expect(ko.find((c) => c.id === "ch-plastic")?.title).toContain("플라스틱");
  });

  it("검색어 앞뒤 공백과 대소문자는 무시하고, 없는 낱말은 빈 목록이에요", () => {
    expect(selectSearch(initial, "ja", { query: "  海洋プラスチック  ", sdgIds: [] }).length).toBeGreaterThan(0);
    expect(selectSearch(initial, "ja", { query: "zzzzzz-없는-낱말", sdgIds: [] })).toEqual([]);
  });

  it("SDG 필터: 고른 목표 중 하나라도 겹치면 나오고, 여러 개를 고르면 합쳐서 보여요", () => {
    const only14 = selectSearch(initial, "ko", { query: "", sdgIds: [14] });
    expect(only14.length).toBeGreaterThan(0);
    expect(only14.every((c) => c.sdgIds.includes(14))).toBe(true);
    const only7 = selectSearch(initial, "ko", { query: "", sdgIds: [7] });
    const both = selectSearch(initial, "ko", { query: "", sdgIds: [14, 7] });
    expect(both.length).toBeGreaterThanOrEqual(Math.max(only14.length, only7.length));
    expect(both.every((c) => c.sdgIds.includes(14) || c.sdgIds.includes(7))).toBe(true);
  });
});

describe("챌린지 상세", () => {
  it("없는 id 는 null, 모집 중이면 신청할 수 있고 심사 중·마감이면 못 해요", () => {
    expect(selectChallengeDetail(initial, "없음", "ja")).toBeNull();
    const open = selectChallengeDetail(initial, "ch-plastic", "ko");
    expect(open?.canApply).toBe(true);
    expect(open?.card.isOpen).toBe(true);
    expect(open?.hasSubmitted).toBe(false);
    expect(open?.deliverables.length).toBeGreaterThan(0);
    const judging = selectChallengeDetail(initial, "ch-bottle", "ko");
    expect(judging?.canApply).toBe(false);
    expect(judging?.card.statusLabel.length).toBeGreaterThan(0);
    const closed = initial.challenges.find((c) => c.status === "closed");
    expect(closed).toBeDefined();
    expect(selectChallengeDetail(initial, closed!.id, "ja")?.canApply).toBe(false);
  });

  it("팀 모집 글: 내 글에는 참여 요청 단추가 없고, 요청한 글에도 다시 못 해요", () => {
    const detail = selectChallengeDetail(busy, "ch-plastic", "ja");
    expect(detail?.teamPosts[0].mine).toBe(true);
    expect(detail?.teamPosts[0].canRequest).toBe(false);
    const requested = detail?.teamPosts.find((p) => p.id === "tp-1");
    expect(requested?.requestedByMe).toBe(true);
    expect(requested?.canRequest).toBe(false);
  });

  it("제출 전에는 수령증이 없고, 제출하면 수령증 번호와 버전 1 이 나와요", () => {
    expect(selectReceipt(initial, "ch-plastic", "ja")).toBeNull();
    for (const locale of LOCALES) {
      const receipt = selectReceipt(busy, "ch-plastic", locale);
      expect(receipt?.receiptNo).toMatch(/^SC-\d{8}-\d{4}$/);
      expect(receipt?.version).toBe(1);
      expect(receipt?.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(receipt?.fileName).toBe("plan.pdf");
    }
    expect(selectChallengeDetail(busy, "ch-plastic", "ja")?.hasSubmitted).toBe(true);
    expect(selectChallengeDetail(busy, "ch-plastic", "ja")?.card.submittedVersion).toBe(1);
  });
});

describe("Impact·증명서·카드뉴스", () => {
  it("Impact: SDG 17개 점수, 강점 최대 3개(높은 순), 진행률 0~1, 배지", () => {
    for (const locale of LOCALES) {
      const impact = selectImpact(initial, locale);
      expect(impact.perSdg.map((s) => s.id)).toEqual([...SDG_IDS]);
      expect(impact.perSdg.every((s) => s.score >= 0 && s.score <= 100)).toBe(true);
      expect(impact.topSdgs.length).toBeLessThanOrEqual(3);
      const scores = impact.topSdgs.map((s) => s.score);
      expect([...scores].sort((a, b) => b - a)).toEqual(scores);
      expect(impact.progressRatio).toBeGreaterThanOrEqual(0);
      expect(impact.progressRatio).toBeLessThanOrEqual(1);
      expect(impact.badges.length).toBeGreaterThan(0);
      expect(impact.levelLabel).toContain(String(impact.level));
      expect(impact.activities.length).toBeGreaterThan(0);
    }
  });

  it("제출·수상·공유가 쌓이면 포인트가 늘어요", () => {
    const before = selectImpact(initial, "ja").totalPoints;
    const after = selectImpact(busy, "ja").totalPoints;
    expect(after).toBeGreaterThan(before);
  });

  it("증명서: 모두 진위 확인이 되고, 한 군데라도 고치면 확인에 실패해요", () => {
    for (const locale of LOCALES) {
      const certs = selectCertificates(busy, locale);
      expect(certs.length).toBeGreaterThan(0);
      for (const vm of certs) {
        expect(verifyCertificate(vm.cert)).toBe(true);
        expect(verifyCertificate(tamperedCopy(vm.cert))).toBe(false);
        expect(vm.code).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
        expect(vm.qr.length).toBeGreaterThanOrEqual(21);
        expect(vm.qr.every((row) => row.length === vm.qr.length)).toBe(true);
      }
      expect(new Set(certs.map((c) => c.cert.id)).size).toBe(certs.length);
    }
  });

  it("카드뉴스: 선택 목록은 수상 실적이 먼저이고, 모르는 활동 id 는 첫 번째로 돌아가요", () => {
    for (const locale of LOCALES) {
      const share = selectShare(busy, locale, "instagram", null);
      expect(share.options.length).toBeGreaterThan(0);
      expect(share.options[0].label.startsWith("🏆")).toBe(true);
      expect(share.card).not.toBeNull();
      expect(share.selectedId).toBe(share.options[0].id);
      const fallback = selectShare(busy, locale, "linkedin", "없는-활동");
      expect(fallback.selectedId).toBe(share.options[0].id);
      const second = selectShare(busy, locale, "instagram", share.options[1]?.id ?? null);
      expect(second.selectedId).toBe(share.options[1]?.id ?? share.options[0].id);
    }
  });
});

describe("메시지·인재", () => {
  it("받은 스카우트: 샘플 3건(안 읽음·읽음·수락)과 시연에서 보낸 1건이 모두 보이고 개수가 맞아요", () => {
    const inbox = selectInbox(busy, "ko");
    expect(inbox.items).toHaveLength(4);
    expect(inbox.unreadCount).toBe(inbox.items.filter((i) => i.unread).length);
    expect(new Set(inbox.items.map((i) => i.id)).size).toBe(4);
    const statuses = new Set(inbox.items.map((i) => i.status));
    for (const wanted of ["sent", "read", "accepted"] as const) expect(statuses.has(wanted), wanted).toBe(true);
    // 답할 수 있는 건 아직 답하지 않은(안 읽음·읽음) 것뿐이고, 수락한 것에는 상태 표시가 붙어요
    expect(inbox.items.every((i) => i.canRespond === (i.status === "sent" || i.status === "read"))).toBe(true);
    expect(inbox.items.find((i) => i.status === "accepted")?.statusLabel).not.toBeNull();
  });

  it("인재 검색: 비공개 학생은 스카우트할 수 없고, 데모 학생(나)은 한 명만 있어요", () => {
    for (const locale of LOCALES) {
      const talent = selectTalent(initial, locale, { query: "", sdgIds: [] });
      expect(talent.limit).toBe(SCOUT_DAILY_LIMIT);
      expect(talent.remaining).toBe(SCOUT_DAILY_LIMIT);
      expect(talent.candidates.filter((c) => c.isDemoStudent)).toHaveLength(1);
      expect(talent.candidates.find((c) => c.id === "cand-mei")?.canScout).toBe(false);
      expect(talent.candidates.find((c) => c.id === "cand-yuna")?.canScout).toBe(true);
      expect(talent.candidates.every((c) => c.suggestedMessage.length > 0)).toBe(true);
      const scoutable = talent.candidates.filter((c) => c.canScout);
      expect(talent.candidates.slice(0, scoutable.length).every((c) => c.canScout)).toBe(true);
    }
  });

  it("인재 검색: SDG 필터와 스킬 낱말(일본어·한국어 모두)로 찾아요", () => {
    const bySdg = selectTalent(initial, "ko", { query: "", sdgIds: [14] });
    expect(bySdg.candidates.length).toBeGreaterThan(0);
    expect(bySdg.candidates.every((c) => c.sdgIds.includes(14))).toBe(true);
    const ja = selectTalent(initial, "ja", { query: "デザイン", sdgIds: [] }).candidates.map((c) => c.id);
    const ko = selectTalent(initial, "ko", { query: "디자인", sdgIds: [] }).candidates.map((c) => c.id);
    expect(ja).toContain("cand-yuna");
    expect(ko).toEqual(ja);
  });

  it("스카우트를 보낸 학생은 '보냄' 표시가 되고, 한도를 다 쓰면 누구에게도 못 보내요", () => {
    const talent = selectTalent(busy, "ja", { query: "", sdgIds: [] });
    expect(talent.candidates.find((c) => c.id === "cand-yuna")?.alreadySent).toBe(true);
    expect(talent.candidates.find((c) => c.id === "cand-yuna")?.canScout).toBe(false);
    const spent = selectTalent(noScoutsLeft, "ja", { query: "", sdgIds: [] });
    expect(spent.remaining).toBe(0);
    expect(spent.candidates.every((c) => !c.canScout)).toBe(true);
  });
});

describe("B2B: 대시보드·응모자·ESG", () => {
  it("대시보드: KPI 5개(순서 고정), 수수료·기부 합계", () => {
    for (const locale of LOCALES) {
      const dash = selectB2bDashboard(initial, locale);
      expect(dash.kpis.map((k) => k.id)).toEqual(["open", "applicants", "pending", "matches", "donation"]);
      expect(dash.challenges.length).toBeGreaterThan(0);
      expect(dash.challenges.every((c) => c.companyName === dash.companyName)).toBe(true);
      expect(dash.fee.perMatch.gross).toBe(formatYen(30_000, locale));
      expect(dash.fee.perMatch.donation).toBe(formatYen(15_000, locale));
      expect(dash.fee.perMatch.revenue).toBe(formatYen(15_000, locale));
      expect(dash.fee.totals.count).toBe(2);
      expect(dash.fee.totals.donation).toBe(formatYen(30_000, locale));
      expect(dash.fee.rows).toHaveLength(2);
    }
  });

  it("채용하면 매칭·기부 합계가 한 건 늘어요", () => {
    const before = selectB2bDashboard(initial, "ja");
    const after = selectB2bDashboard(busy, "ja");
    expect(after.fee.totals.count).toBe(before.fee.totals.count + 1);
    expect(after.fee.rows).toHaveLength(before.fee.rows.length + 1);
    expect(after.kpis.find((k) => k.id === "matches")?.value).toBe(String(before.fee.totals.count + 1));
    expect(after.fee.totals.donation).toBe(formatYen(45_000, "ja"));
  });

  it("응모자: 기본은 응모작이 있는 첫 챌린지, 점수 높은 순(심사 전은 맨 뒤)이고 수수료 안내가 나와요", () => {
    for (const locale of LOCALES) {
      const view = selectApplicants(initial, locale, null);
      expect(view.selectedId).not.toBeNull();
      expect(view.challengeOptions.map((o) => o.id)).toContain(view.selectedId);
      expect(view.applicants.length).toBeGreaterThan(0);
      const averages = view.applicants.map((a) => a.average ?? -1);
      expect([...averages].sort((a, b) => b - a)).toEqual(averages);
      expect(view.feeNote).toContain(formatYen(30_000, locale));
      expect(view.feeNote).toContain(formatYen(15_000, locale));
      const unknown = selectApplicants(initial, locale, "없는-챌린지");
      expect(unknown.selectedId).toBe(view.selectedId);
    }
  });

  it("응모자: 수상·채용 결과가 상태 표시에 반영돼요", () => {
    const view = selectApplicants(busy, "ko", "ch-bottle");
    const adopted = view.applicants.find((a) => a.id === "pb-1");
    expect(adopted?.adopted).toBe(true);
    expect(adopted?.award).toBe("grand");
    expect(adopted?.awardLabel).not.toBeNull();
    const reviewed = selectApplicants(busy, "ko", "ch-plastic").applicants.find((a) => a.id === "pp-1");
    expect(reviewed?.average).toBe(4.3);
    expect(reviewed?.status).toBe("reviewed");
  });

  it("ESG: 점수·단계는 core 평가와 같고, 증빙이 없으면 안내가 나와요", () => {
    for (const locale of LOCALES) {
      const esg = selectEsg(initial, locale);
      const evaluated = evaluateCertification(initial.cert);
      expect(esg.total).toBe(evaluated.total);
      expect(esg.level).toBe(evaluated.level);
      expect(esg.items).toHaveLength(6);
      expect(esg.byCategory.map((c) => c.key)).toEqual(["E", "S", "G"]);
      expect(esg.byCategory.every((c) => c.score >= 0 && c.score <= 100)).toBe(true);
      expect(esg.items.every((i) => i.inputMax >= i.target && i.target > 0)).toBe(true);
      expect(esg.needEvidence).toBe(true);
      expect(esg.generated).toBe(false);
      expect(esg.disclaimer).toBe(CERT_DISCLAIMER[locale]);
    }
    const done = selectEsg(busy, "ja");
    expect(done.generated).toBe(true);
    expect(done.needEvidence).toBe(false);
    expect(done.total).toBeGreaterThan(selectEsg(initial, "ja").total);
  });
});

describe("SNS 피드 (F-503 · F-504)", () => {
  const find = (list: PostVM[], id: string): PostVM => list.find((p) => p.id === id)!;
  const mineBrag = run(initial, { type: "createPost", draft: { kind: "brag", body: "優秀賞をいただきました！", activityId: "h-5b" }, at: AT });

  it("피드: 최신순이고, 전체 8건 · 기업 홍보 4건 · 학생 자랑 4건으로 걸러 볼 수 있어요", () => {
    const all = selectFeed(initial, "ja", "b2c");
    expect(all.posts.map((p) => p.id)).toEqual(["po-5", "po-4", "po-1", "po-6", "po-2", "po-7", "po-3", "po-8"]);
    expect(all.filters.map((f) => [f.id, f.count])).toEqual([["all", 8], ["pr", 4], ["brag", 4]]);
    expect(selectFeed(initial, "ja", "b2c", "pr").posts.map((p) => p.kind)).toEqual(["pr", "pr", "pr", "pr"]);
    expect(selectFeed(initial, "ja", "b2c", "brag").posts.map((p) => p.kind)).toEqual(["brag", "brag", "brag", "brag"]);
    expect(selectFeed(mineBrag, "ja", "b2c").posts[0].id).toBe(mineBrag.posts[0].id); // 방금 쓴 글이 맨 위
  });

  it("홍보 글에는 항상 PR 표시와 기업 정보가, 자랑 글에는 닉네임·레벨·실적만 있어요", () => {
    for (const locale of LOCALES) {
      for (const p of selectFeed(initial, locale, "b2c").posts) {
        if (p.kind === "pr") {
          expect(p.chipLabel).toBe("PR");
          expect(p.title).not.toBeNull();
          expect(p.achievement).toBeNull();
          expect(p.authorMeta.length).toBeGreaterThan(0);
        } else {
          expect(p.authorMeta).toMatch(/^Lv\.\d$/);
          expect(p.authorName).toMatch(/^[A-Za-z]+$/); // 닉네임뿐 (학교·실명 없음)
          expect(p.achievement).not.toBeNull();
          expect(p.title).toBeNull();
          expect(p.official).toBeNull();
        }
      }
    }
    expect(find(selectFeed(initial, "ja", "b2c").posts, "po-4")).toMatchObject({ authorName: "みなと海洋フーズ株式会社", verified: true, avatar: "🐟" });
  });

  it("샘플 글은 두 언어로 보이고, 내가 쓴 글은 쓴 그대로 두 언어에 같아요", () => {
    const ja = find(selectFeed(initial, "ja", "b2c").posts, "po-1");
    const ko = find(selectFeed(initial, "ko", "b2c").posts, "po-1");
    expect(ja.body).toContain("賞味期限");
    expect(ko.body).toContain("유통기한");
    expect(ja.title).not.toBe(ko.title);
    const mineJa = find(selectFeed(mineBrag, "ja", "b2c").posts, mineBrag.posts[0].id);
    const mineKo = find(selectFeed(mineBrag, "ko", "b2c").posts, mineBrag.posts[0].id);
    expect(mineJa.body).toBe("優秀賞をいただきました！");
    expect(mineKo.body).toBe("優秀賞をいただきました！");
  });

  it("'내 글'은 지금 화면의 계정 기준이에요 (학생 화면 = 내 자랑 글, 기업 화면 = 우리 회사 홍보 글)", () => {
    const student = selectFeed(mineBrag, "ja", "b2c").posts;
    const company = selectFeed(mineBrag, "ja", "b2b").posts;
    const mineId = mineBrag.posts[0].id;
    // 우리 회사 글(po-4): 학생에게는 남의 글, 기업에게는 내 글
    expect(find(student, "po-4")).toMatchObject({ mine: false, canLike: true, canDelete: false });
    expect(find(company, "po-4")).toMatchObject({ mine: true, canLike: false, canDelete: true });
    // 내가 쓴 자랑 글: 학생에게는 내 글, 기업에게는 남의 글
    expect(find(student, mineId)).toMatchObject({ mine: true, canLike: false, canDelete: true });
    expect(find(company, mineId)).toMatchObject({ mine: false, canLike: true, canDelete: false });
    // 샘플로 들어 있는 다른 사람·다른 기업의 글은 어느 계정에서도 지울 수 없어요
    for (const id of ["po-1", "po-2", "po-3", "po-5", "po-6", "po-7", "po-8"]) {
      for (const list of [student, company]) expect(find(list, id), id).toMatchObject({ mine: false, canLike: true, canDelete: false });
    }
  });

  it("좋아요는 학생·기업 계정이 따로 보여요", () => {
    const liked = run(initial, { type: "togglePostLike", postId: "po-1", role: "b2c" });
    expect(find(selectFeed(liked, "ja", "b2c").posts, "po-1")).toMatchObject({ likes: 19, likedByMe: true });
    expect(find(selectFeed(liked, "ja", "b2b").posts, "po-1")).toMatchObject({ likes: 19, likedByMe: false });
  });

  it("공식 SNS 게시 신청은 날짜(M/D)와 게시료로 보여요", () => {
    const ja = find(selectFeed(initial, "ja", "b2c").posts, "po-1");
    expect(ja.official?.label).toBe("公式SNS掲載予定 · 10/31");
    expect(ja.official?.feeLabel).toContain(formatYen(3000, "ja"));
    const ko = find(selectFeed(initial, "ko", "b2c").posts, "po-2");
    expect(ko.official?.label).toBe("공식 SNS 게시 예정 · 11/1");
    expect((find(selectFeed(initial, "ja", "b2c").posts, "po-3")).official).toBeNull();
  });

  it("내보내기 글: 홍보 글은 [PR] 로 시작하고, 자랑 글에는 실적과 해시태그가 들어가요", () => {
    const pr = find(selectFeed(initial, "ja", "b2c").posts, "po-1");
    expect(pr.shareText.startsWith("【PR】")).toBe(true);
    expect((find(selectFeed(initial, "ko", "b2c").posts, "po-1")).shareText.startsWith("[PR] ")).toBe(true);
    const brag = find(selectFeed(initial, "ja", "b2c").posts, "po-6");
    expect(brag.shareText).toContain("再エネ啓発動画コンテスト");
    expect(brag.shareText).toContain("#SDGs7");
    expect(brag.shareText).not.toMatch(/@/);
  });

  it("실적: 내 실적에 붙인 글만 증명서 번호가 있고, 샘플 글에는 없어요", () => {
    const mine = find(selectFeed(mineBrag, "ja", "b2c").posts, mineBrag.posts[0].id);
    const index = selectShare(mineBrag, "ja", "instagram", null).options.findIndex((o) => o.id === "h-5b");
    expect(mine.achievement?.certificateId).toBe(selectCertificates(mineBrag, "ja")[index].cert.id);
    expect(mine.achievement?.awardLabel).not.toBeNull();
    for (const p of selectFeed(initial, "ja", "b2c", "brag").posts) expect(p.achievement?.certificateId).toBeNull();
  });

  it("홍보 글에 연결한 챌린지는 이름과 함께 보여요", () => {
    const po1 = find(selectFeed(initial, "ja", "b2c").posts, "po-1");
    expect(po1.challenge?.id).toBe("ch-foodloss");
    expect(po1.challenge?.title).toBe((initial.challenges.find((c) => c.id === "ch-foodloss")!.title as { ja: string }).ja);
  });

  it("글쓰기(자랑): 고를 실적은 카드뉴스와 같은 순서이고, 미리 채운 실적이 선택돼요", () => {
    const composer = selectComposer(initial, "ja", "brag");
    const share = selectShare(initial, "ja", "instagram", null);
    expect(composer.activities.map((a) => a.id)).toEqual(share.options.map((o) => o.id));
    expect(composer.selectedActivityId).toBe(composer.activities[0].id);
    expect(composer.activities[0].label).toContain("🏆");
    expect(selectComposer(initial, "ja", "brag", { activityId: "h-1" }).selectedActivityId).toBe("h-1");
    expect(selectComposer(initial, "ja", "brag", { activityId: "없음" }).selectedActivityId).toBe(composer.selectedActivityId);
    expect(composer).toMatchObject({ kind: "brag", bodyLimit: 200, maxSdgs: 3, author: { name: "Mina", meta: "Lv.3", avatar: "M" } });
    for (const a of composer.activities) expect(a.sdgIds.length).toBeLessThanOrEqual(3);
  });

  it("글쓰기(홍보): 우리 회사 챌린지만 고르고, SDGs 기본값은 챌린지 → 기업 순서이며, 공식 게시는 3일 뒤로 안내해요", () => {
    const composer = selectComposer(initial, "ko", "pr");
    const mine = new Set(initial.challenges.filter((c) => c.companyId === initial.myCompanyId).map((c) => c.id));
    expect(composer.challenges.map((c) => c.id).sort()).toEqual([...mine].sort());
    const statuses = composer.challenges.map((c) => initial.challenges.find((x) => x.id === c.id)!.status);
    expect(statuses.indexOf("open")).toBe(0); // 모집 중이 먼저
    expect(statuses.slice(0, statuses.filter((s) => s === "open").length).every((s) => s === "open")).toBe(true);
    expect(composer.selectedChallengeId).toBeNull();
    expect(composer.defaultSdgIds).toEqual(initial.companies.find((c) => c.id === initial.myCompanyId)!.sdgIds);
    const linked = selectComposer(initial, "ko", "pr", { challengeId: "ch-plastic" });
    expect(linked.selectedChallengeId).toBe("ch-plastic");
    expect(linked.defaultSdgIds).toEqual(initial.challenges.find((c) => c.id === "ch-plastic")!.sdgIds.slice(0, 3));
    expect(selectComposer(initial, "ko", "pr", { challengeId: "ch-solar" }).selectedChallengeId).toBeNull(); // 다른 회사 챌린지는 고를 수 없어요
    expect(composer.official).toMatchObject({ feeYen: 3000, nextDate: "2026-11-02" });
    expect(composer.official.nextDateLabel).toContain("2026");
    expect(composer).toMatchObject({ kind: "pr", bodyLimit: 400, titleLimit: 40, author: { avatar: "🐟", verified: true } });
  });

  it("공식 게시 날짜를 이미 받았다면 안내하는 날짜가 하루씩 밀려요", () => {
    const requested = run(initial, { type: "createPost", draft: { kind: "pr", title: "t", body: "b", sdgIds: [14], requestOfficial: true }, at: AT });
    expect(selectComposer(requested, "ja", "pr").official.nextDate).toBe("2026-11-03");
  });
});
