// 화면 모델(selectors) 점검: 웹·모바일 화면은 이 함수들의 결과만 그려요.
// 그래서 (1) 일본어·한국어 어느 쪽에서도 문구에 빈 칸({name})·undefined·NaN 이 새지 않고,
// (2) 두 언어의 모양(키·배열 길이·null 여부)이 같고, (3) 화면이 기대하는 정렬·필터·상태가 맞는지 확인해요.
import { describe, expect, it } from "vitest";
import { CERT_DISCLAIMER, evaluateCertification } from "@sdgs-compass/core/certification";
import { verifyCertificate } from "@sdgs-compass/core/certificate";
import type { DemoState, OfficialShare } from "@sdgs-compass/core/domain";
import { OFFICIAL_ACCOUNT_URLS } from "@sdgs-compass/core/post";
import { deriveActivities } from "@sdgs-compass/core/activities";
import { addDays, formatYen } from "@sdgs-compass/core/format";
import { REVIEW_BONUS_MAX, reviewBonus } from "@sdgs-compass/core/impact";
import { LOCALES, type Locale } from "@sdgs-compass/core/i18n";
import type { ProposalDraft } from "@sdgs-compass/core/proposal";
import { SCOUT_DAILY_LIMIT } from "@sdgs-compass/core/scout";
import { SDG_IDS, type SdgId } from "@sdgs-compass/core/sdg";
import {
  ALL_CHALLENGES,
  APPLICANT_FILTERS,
  certificateVM,
  parseApplicantFilter,
  selectApplicants,
  selectApplications,
  selectB2bDashboard,
  selectCertificates,
  selectChallengeDetail,
  selectComposer,
  selectEsg,
  selectFeed,
  selectHome,
  selectImpact,
  selectScoutSetting,
  selectInbox,
  selectReceipt,
  searchResultsLabel,
  selectCompanyMark,
  selectSdgCountTiles,
  selectSdgOpenCounts,
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

/** 데모 순서 그대로: 학생이 D2 에서 낸 기획서를 기업이 D5 에서 심사(점수·코멘트) → 최우수상 → 채택 (#30) */
const mineId = run(initial, { type: "submitProposal", challengeId: "ch-plastic", draft, at: AT }).proposals.find((p) => p.mine)!.id;
const reviewedMine = run(
  initial,
  { type: "submitProposal", challengeId: "ch-plastic", draft, at: AT },
  { type: "reviewProposal", proposalId: mineId, review: { creativity: 4, feasibility: 3, sdgContribution: 5, comment: "回収まで考えた、現実的な提案です。" }, at: "2026-10-30T11:00" },
  { type: "awardProposal", proposalId: mineId, award: "grand" },
  { type: "adoptProposal", proposalId: mineId, at: "2026-10-30T11:05" },
);

const STATES: [string, DemoState][] = [
  ["처음 상태", initial],
  ["이것저것 해 본 상태", busy],
  ["스카우트 한도를 다 쓴 상태", noScoutsLeft],
  ["내 기획서가 심사·표창·채택된 상태", reviewedMine],
];

function allViews(state: DemoState, locale: Locale) {
  return {
    tiles: selectSdgTiles(locale),
    home: selectHome(state, locale),
    search: selectSearch(state, locale, { query: "", sdgIds: [] }),
    searchSdg: selectSearch(state, locale, { query: "", sdgIds: [14] }),
    searchSdgSummary: searchResultsLabel(selectSearch(state, locale, { query: "", sdgIds: [14] }), locale),
    searchChips: selectSdgCountTiles(state, locale, "海"),
    detailOpen: selectChallengeDetail(state, "ch-plastic", locale),
    detailJudging: selectChallengeDetail(state, "ch-bottle", locale),
    detailMissing: selectChallengeDetail(state, "없음", locale),
    receipt: selectReceipt(state, "ch-plastic", locale),
    applications: selectApplications(state, locale),
    impact: selectImpact(state, locale),
    certificates: selectCertificates(state, locale),
    shareInstagram: selectShare(state, locale, "instagram", null),
    shareLinkedin: selectShare(state, locale, "linkedin", null),
    inbox: selectInbox(state, locale),
    dashboard: selectB2bDashboard(state, locale),
    applicants: selectApplicants(state, locale, null),
    applicantsPlastic: selectApplicants(state, locale, "ch-plastic"),
    applicantsAll: selectApplicants(state, locale, ALL_CHALLENGES),
    applicantsAllPending: selectApplicants(state, locale, ALL_CHALLENGES, "submitted"),
    applicantsAllAdopted: selectApplicants(state, locale, ALL_CHALLENGES, "adopted"),
    applicantsOld: selectApplicants(state, locale, "ch-old1"),
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
        expect(["#FFFFFF", "#1E2925"]).toContain(tile.textColor);
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

describe("홈 SDG 타일의 숫자 = 목표별 모집 중 과제 수 (#29)", () => {
  /** 그 목표 하나로 검색했을 때 나오는 카드 중 모집 중인 것의 수 */
  const openInSearch = (state: DemoState, id: SdgId, query = "") => selectSearch(state, "ja", { query, sdgIds: [id] }).filter((c) => c.isOpen).length;
  const SAMPLE = { 1: 0, 2: 2, 3: 0, 4: 1, 5: 0, 6: 0, 7: 1, 8: 2, 9: 0, 10: 1, 11: 1, 12: 3, 13: 1, 14: 2, 15: 1, 16: 0, 17: 1 };

  it("샘플: 목표 1·3·5·6·9·16 은 0건, 12 는 3건, 2·8·14 는 2건, 나머지는 1건 — 홈 타일도 두 언어에서 같은 숫자", () => {
    expect(selectSdgOpenCounts(initial)).toEqual(SAMPLE);
    for (const locale of LOCALES) {
      const tiles = selectHome(initial, locale).sdgTiles;
      expect(tiles.map((t) => t.id)).toEqual([...SDG_IDS]);
      expect(Object.fromEntries(tiles.map((t) => [t.id, t.openCount]))).toEqual(SAMPLE);
    }
  });

  it("타일의 숫자는 그 타일을 눌러 나오는 검색 결과의 모집 중 수와 같아요 (심사 중·종료는 세지 않아요)", () => {
    for (const [, state] of STATES) {
      for (const tile of selectHome(state, "ko").sdgTiles) expect([tile.id, tile.openCount]).toEqual([tile.id, openInSearch(state, tile.id)]);
    }
    // 목표 14 는 검색하면 5건(심사 중 1 · 종료 2 포함)이 나오지만 모집 중은 2건이에요
    expect(selectSearch(initial, "ja", { query: "", sdgIds: [14] })).toHaveLength(5);
    expect(selectSdgOpenCounts(initial)[14]).toBe(2);
  });

  it("검색 화면의 칩 숫자: 검색어가 있으면 그 검색어로도 걸러서, 칩 하나만 골랐을 때의 모집 중 수와 같아요", () => {
    for (const query of ["", "海洋", "해양", "  SOLAR  ", "zzzz-없는-낱말"]) {
      for (const locale of LOCALES) {
        for (const chip of selectSdgCountTiles(initial, locale, query)) expect([query, chip.id, chip.openCount]).toEqual([query, chip.id, openInSearch(initial, chip.id, query)]);
      }
    }
    expect(Object.values(selectSdgOpenCounts(initial, "zzzz-없는-낱말")).every((n) => n === 0)).toBe(true);
  });

  it("기업이 새 과제를 내면 그 과제의 목표 숫자가 1씩 늘어요 (다른 목표는 그대로)", () => {
    const created = run(initial, { type: "createChallenge", draft: { title: "朝市×デジタル企画", summary: "朝市の魅力を発信する", sdgIds: [14, 3], prizeYen: 80_000, days: 14, participation: "both", internship: false } });
    const before = selectSdgOpenCounts(initial);
    const after = selectSdgOpenCounts(created);
    expect([after[14], after[3]]).toEqual([before[14] + 1, before[3] + 1]);
    for (const id of SDG_IDS.filter((x) => x !== 14 && x !== 3)) expect([id, after[id]]).toEqual([id, before[id]]);
    expect(selectHome(created, "ja").sdgTiles.find((t) => t.id === 3)?.openCount).toBe(openInSearch(created, 3));
  });

  it("마감일이 지나면(마감 당일까지는 세요) 빠지고, 심사 중·종료가 되어도 빠져요", () => {
    const foodloss = initial.challenges.find((c) => c.id === "ch-foodloss")!; // 목표 12·2, 가장 먼저 마감
    const onDeadline = { ...initial, today: foodloss.closesOn };
    const dayAfter = { ...initial, today: addDays(foodloss.closesOn, 1) };
    expect([selectSdgOpenCounts(onDeadline)[12], selectSdgOpenCounts(onDeadline)[2]]).toEqual([3, 2]);
    expect([selectSdgOpenCounts(dayAfter)[12], selectSdgOpenCounts(dayAfter)[2]]).toEqual([2, 1]);
    expect(openInSearch(dayAfter, 12)).toBe(2);
    for (const status of ["judging", "closed"] as const) {
      const ended = { ...initial, challenges: initial.challenges.map((c) => (c.id === "ch-plastic" ? { ...c, status } : c)) }; // 목표 14·12
      const counts = selectSdgOpenCounts(ended);
      expect([status, counts[14], counts[12]]).toEqual([status, 1, 2]);
      expect([openInSearch(ended, 14), openInSearch(ended, 12)]).toEqual([1, 2]);
    }
  });

  it("문구: 단위는 件/개, 스크린 리더용 이름에 목표 번호·정식 이름·모집 중 개수가 다 들어가요", () => {
    const ja = selectHome(initial, "ja").sdgTiles.find((t) => t.id === 14)!;
    const ko = selectHome(initial, "ko").sdgTiles.find((t) => t.id === 14)!;
    expect([ja.unit, ja.label, ja.short]).toEqual(["件", "目標14 海の豊かさを守ろう・募集中の課題 2件", "海"]);
    expect([ko.unit, ko.label, ko.short]).toEqual(["개", "목표 14 해양 생태계 보전 · 모집 중인 챌린지 2개", "해양"]);
    expect(selectHome(initial, "ja").sdgTiles.find((t) => t.id === 1)?.label).toBe("目標1 貧困をなくそう・募集中の課題 0件");
  });

  it("검색 결과 줄: 심사 중·종료가 섞이면 「うち募集中」 수를 함께, 모두 모집 중이면 그대로", () => {
    const sdg14 = (locale: Locale) => searchResultsLabel(selectSearch(initial, locale, { query: "", sdgIds: [14] }), locale);
    const sdg2 = (locale: Locale) => searchResultsLabel(selectSearch(initial, locale, { query: "", sdgIds: [2] }), locale);
    expect([sdg14("ja"), sdg14("ko")]).toEqual(["5件の課題（うち募集中 2件）", "챌린지 5건 (모집 중 2건)"]);
    expect([sdg2("ja"), sdg2("ko")]).toEqual(["2件の課題", "챌린지 2건"]);
    expect(searchResultsLabel([], "ja")).toBe("0件の課題");
  });

  it("과제 만들기·인재 검색·글쓰기에서 고르는 타일(selectSdgTiles)에는 개수가 없어요", () => {
    for (const tile of selectSdgTiles("ja")) expect(Object.keys(tile).sort()).toEqual(["color", "id", "name", "short", "textColor"]);
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
    // 어느 기업의 어느 과제에 냈는지 수령증에서 바로 보여요(#28)
    expect(selectReceipt(busy, "ch-plastic", "ja")?.companyName).toBe("みなと海洋フーズ株式会社");
    expect(selectReceipt(busy, "ch-plastic", "ko")?.companyName).toBe("미나토 해양푸드(주)");
    expect(selectChallengeDetail(busy, "ch-plastic", "ja")?.hasSubmitted).toBe(true);
    expect(selectChallengeDetail(busy, "ch-plastic", "ja")?.card.submittedVersion).toBe(1);
  });
});

describe("응모 중인 과제 — 마이 임팩트 맨 위 (#28)", () => {
  const withStatus = (state: DemoState, id: string, status: "open" | "judging" | "closed"): DemoState => ({
    ...state,
    challenges: state.challenges.map((c) => (c.id === id ? { ...c, status } : c)),
  });

  it("처음 상태(샘플)에는 내 기획서가 없어서 빈 목록이에요 — 다른 팀의 응모작은 들어오지 않아요", () => {
    for (const locale of LOCALES) expect(selectApplications(initial, locale)).toEqual([]);
    expect(initial.proposals.some((p) => !p.mine)).toBe(true);
  });

  it("제출하면 기업·과제 제목·모집 중·마감일(D-n)·버전이 두 언어로 나와요", () => {
    const state = run(initial, { type: "submitProposal", challengeId: "ch-plastic", draft, at: AT });
    const [ja] = selectApplications(state, "ja");
    expect(ja).toMatchObject({
      challengeId: "ch-plastic",
      companyName: "みなと海洋フーズ株式会社",
      challengeTitle: "海洋プラスチックを減らす新しい包装アイデア",
      status: "open",
      statusLabel: "募集中",
      deadlineLabel: "締切 2026年11月11日（D-12）",
      version: 1,
      versionLabel: "提出済み（第1版）",
      submittedAt: AT,
      sdgIds: [14, 12],
    });
    const [ko] = selectApplications(state, "ko");
    expect(ko).toMatchObject({
      companyName: "미나토 해양푸드(주)",
      challengeTitle: "해양 플라스틱을 줄이는 새로운 포장 아이디어",
      statusLabel: "모집 중",
      deadlineLabel: "마감 2026년 11월 11일 (D-12)",
      versionLabel: "1차 제출 완료",
    });
  });

  it("다시 내면 항목은 하나 그대로이고 버전만 올라가요", () => {
    const state = run(
      initial,
      { type: "submitProposal", challengeId: "ch-plastic", draft, at: AT },
      { type: "submitProposal", challengeId: "ch-plastic", draft: { ...draft, fileName: "plan_v2.pdf" }, at: "2026-10-30T15:30" },
    );
    const list = selectApplications(state, "ja");
    expect(list).toHaveLength(1);
    expect(list[0].version).toBe(2);
    expect(list[0].versionLabel).toBe("提出済み（第2版）");
    expect(selectApplications(state, "ko")[0].versionLabel).toBe("2차 제출 완료");
    expect(list[0].submittedAt).toBe("2026-10-30T15:30");
  });

  it("최근에 낸 과제가 위에 와요", () => {
    const state = run(
      initial,
      { type: "submitProposal", challengeId: "ch-plastic", draft, at: AT },
      { type: "submitProposal", challengeId: "ch-foodloss", draft, at: "2026-10-30T11:00" },
    );
    expect(selectApplications(state, "ja").map((a) => [a.challengeId, a.companyName])).toEqual([
      ["ch-foodloss", "グリーンリテール株式会社"],
      ["ch-plastic", "みなと海洋フーズ株式会社"],
    ]);
  });

  it("심사 중이면 「審査中」이고 마감일 줄은 없어요, 마감(결과 발표)된 과제는 빠져요", () => {
    const submitted = run(initial, { type: "submitProposal", challengeId: "ch-plastic", draft, at: AT });
    const judging = selectApplications(withStatus(submitted, "ch-plastic", "judging"), "ja");
    expect(judging).toHaveLength(1);
    expect(judging[0].statusLabel).toBe("審査中");
    expect(judging[0].deadlineLabel).toBeNull();
    expect(selectApplications(withStatus(submitted, "ch-plastic", "judging"), "ko")[0].statusLabel).toBe("심사 중");
    expect(selectApplications(withStatus(submitted, "ch-plastic", "closed"), "ja")).toEqual([]);
  });
});

describe("심사 결과를 학생에게 — 「応募中の課題」 카드 (#30)", () => {
  const submitted = run(initial, { type: "submitProposal", challengeId: "ch-plastic", draft, at: AT });
  const review = (creativity: number, feasibility: number, sdgContribution: number, comment = "回収まで考えた、現実的な提案です。"): Action => ({
    type: "reviewProposal",
    proposalId: mineId,
    review: { creativity, feasibility, sdgContribution, comment },
    at: "2026-10-30T11:00",
  });

  it("심사 전이면 결과가 없어요 — 카드에는 지금처럼 상태만", () => {
    for (const locale of LOCALES) expect(selectApplications(submitted, locale)[0].review).toBeNull();
  });

  it("심사하면 점수 3개(5점 만점)·평균·코멘트(기업 이름)·반영 포인트·다음에 키울 점이 두 언어로 나와요", () => {
    const state = run(submitted, review(4, 3, 5));
    const ja = selectApplications(state, "ja")[0].review!;
    expect(ja.title).toBe("企業からの審査結果");
    // 항목 이름은 기업 심사 화면과 같은 문구 키(review.*)예요
    expect(ja.scores.map((s) => [s.key, s.label, s.value, s.max, s.valueLabel, s.lowest])).toEqual([
      ["creativity", "創造性", 4, 5, "4/5", false],
      ["feasibility", "実現可能性", 3, 5, "3/5", true],
      ["sdgContribution", "SDGs貢献度", 5, 5, "5/5", false],
    ]);
    expect(ja.average).toBe(4);
    expect(ja.averageLabel).toBe("総合 4.0/5.0");
    expect(ja.comment).toBe("回収まで考えた、現実的な提案です。");
    expect(ja.commentBy).toBe("みなと海洋フーズ株式会社のコメント");
    expect(ja.bonusPoints).toBe(64);
    expect(ja.bonusLabel).toBe("+64pt をマイImpactに反映");
    expect(ja.improveLabel).toBe("次に伸ばすポイント：実現可能性");
    expect(ja.award).toBeNull();
    expect(ja.awardLabel).toBeNull();
    expect(ja.summary).toBe("企業からの審査結果：創造性 4/5・実現可能性 3/5・SDGs貢献度 5/5、総合 4.0/5.0。+64pt をマイImpactに反映。次に伸ばすポイント：実現可能性。");
    const ko = selectApplications(state, "ko")[0].review!;
    expect(ko.title).toBe("기업의 심사 결과");
    expect(ko.scores.map((s) => s.label)).toEqual(["창의성", "실현 가능성", "SDGs 기여도"]);
    expect(ko.averageLabel).toBe("종합 4.0/5.0");
    expect(ko.commentBy).toBe("미나토 해양푸드(주)의 코멘트");
    expect(ko.bonusLabel).toBe("마이 임팩트에 +64pt 반영");
    expect(ko.improveLabel).toBe("다음에 키울 점: 실현 가능성");
    expect(ko.summary).toBe("기업의 심사 결과: 창의성 4/5・실현 가능성 3/5・SDGs 기여도 5/5, 종합 4.0/5.0. 마이 임팩트에 +64pt 반영. 다음에 키울 점: 실현 가능성.");
  });

  it("보너스는 reviewBonus 와 같고 제출 실적 포인트에 그대로 더해져요 — 심사를 고치면 바로 바뀌어요", () => {
    const base = deriveActivities(submitted).find((a) => a.proposalId === mineId)!.points;
    for (const [c, f, s] of [[4, 3, 5], [5, 5, 5], [1, 2, 1], [3, 3, 3]] as const) {
      const state = run(submitted, review(c, f, s));
      const result = selectApplications(state, "ja")[0].review!;
      expect(result.bonusPoints).toBe(reviewBonus({ creativity: c, feasibility: f, sdgContribution: s }));
      expect(result.bonusPoints).toBeLessThanOrEqual(REVIEW_BONUS_MAX);
      expect(deriveActivities(state).find((a) => a.proposalId === mineId)!.points - base).toBe(result.bonusPoints);
    }
    // 같은 기획서를 다시 심사하면(점수 수정) 결과 카드의 숫자가 바로 바뀌어요
    const first = run(submitted, review(4, 3, 5));
    const revised = run(first, review(5, 5, 5, "さらに良くなりました"));
    expect(selectApplications(first, "ja")[0].review!.bonusLabel).toBe("+64pt をマイImpactに反映");
    expect(selectApplications(revised, "ja")[0].review!.bonusLabel).toBe("+80pt をマイImpactに反映");
    expect(selectApplications(revised, "ja")[0].review!.comment).toBe("さらに良くなりました");
  });

  it("가장 낮은 점수가 여럿이면 「다음에 키울 점」은 생략하고, 코멘트가 비면 코멘트 줄도 없어요", () => {
    const tie = selectApplications(run(submitted, review(3, 3, 5, "  ")), "ja")[0].review!;
    expect(tie.scores.some((s) => s.lowest)).toBe(false);
    expect(tie.improveLabel).toBeNull();
    expect(tie.comment).toBeNull();
    expect(tie.commentBy).toBeNull();
    const flat = selectApplications(run(submitted, review(4, 4, 4)), "ko")[0].review!;
    expect(flat.improveLabel).toBeNull();
    expect(flat.bonusLabel).toBe("마이 임팩트에 +64pt 반영");
  });

  it("표창하면 같은 카드에 상 이름이 나오고, 점수 없이 표창만 해도 결과 칸이 생겨요", () => {
    const ja = selectApplications(reviewedMine, "ja")[0].review!;
    expect(ja.award).toBe("grand");
    expect(ja.awardLabel).toBe("最優秀賞を受賞");
    expect(ja.summary.endsWith("最優秀賞を受賞。")).toBe(true);
    expect(selectApplications(reviewedMine, "ko")[0].review!.awardLabel).toBe("최우수상 수상");
    const awardOnly = selectApplications(run(submitted, { type: "awardProposal", proposalId: mineId, award: "special" }), "ja")[0].review!;
    expect(awardOnly.scores).toEqual([]);
    expect([awardOnly.average, awardOnly.averageLabel, awardOnly.bonusLabel, awardOnly.improveLabel, awardOnly.comment]).toEqual([null, null, null, null, null]);
    expect(awardOnly.bonusPoints).toBe(0);
    expect(awardOnly.awardLabel).toBe("特別賞を受賞");
    expect(awardOnly.summary).toBe("企業からの審査結果。特別賞を受賞。");
  });

  it("보이는 것은 내 기획서의 결과뿐이에요 — 다른 팀(pp-1)을 심사해도 내 카드는 그대로예요", () => {
    const state = run(submitted, { type: "reviewProposal", proposalId: "pp-1", review: { creativity: 5, feasibility: 5, sdgContribution: 5, comment: "他チーム" }, at: AT }, { type: "awardProposal", proposalId: "pp-1", award: "grand" });
    const list = selectApplications(state, "ja");
    expect(list).toHaveLength(1);
    expect(list[0].review).toBeNull();
    expect(JSON.stringify(list)).not.toContain("他チーム");
  });

  it("데모 흐름: D2 에서 낸 내 기획서가 D5 의 응모자 화면에 「あなたの提出」로 있고, 심사·표창·채택 뒤 학생 카드에 결과가 보여요", () => {
    const applicants = selectApplicants(submitted, "ja", "ch-plastic").applicants;
    const mine = applicants.find((a) => a.mine)!;
    expect(mine.id).toBe(mineId);
    expect(mine.title).toBe(draft.title);
    // 심사 전(점수가 같을 때)에는 내 기획서가 맨 위 — D5 에서 처음 누르는 「審査」가 D2 의 기획서예요
    expect(applicants[0].id).toBe(mineId);
    expect(selectApplicants(submitted, "ja", ALL_CHALLENGES, "submitted").applicants[0].id).toBe(mineId);
    const after = selectApplications(reviewedMine, "ja");
    expect(after).toHaveLength(1);
    expect(after[0].challengeId).toBe("ch-plastic");
    expect(after[0].review?.bonusLabel).toBe("+64pt をマイImpactに反映");
    expect(after[0].review?.awardLabel).toBe("最優秀賞を受賞");
  });
});

describe("Impact·증명서·카드뉴스", () => {
  it("실적은 포인트 숫자 없이 레벨·진행률로 보여요 (어느 화면 모델에도 「… pt」 글자가 없어요 — #30 의 심사 보너스 한 줄만 예외)", () => {
    for (const [, state] of STATES) {
      for (const locale of LOCALES) {
        const views = allViews(state, locale);
        // #30 사용자 결정(2026-11-03): 기업 심사 보너스만은 「+64pt をマイImpactに反映」처럼 숫자로 보여요 — 그 줄(과 요약)만 빼고 그대로 검사해요
        const bonusLines = views.applications.flatMap((a) => (a.review?.bonusLabel ? [a.review.bonusLabel] : []));
        for (const line of bonusLines) expect(line).toMatch(locale === "ja" ? /^\+\d+pt をマイImpactに反映$/ : /^마이 임팩트에 \+\d+pt 반영$/);
        const rest = { ...views, applications: views.applications.map((a) => ({ ...a, review: a.review ? { ...a.review, bonusLabel: null, summary: "" } : null })) };
        const text = JSON.stringify(rest);
        expect(text).not.toMatch(/\d\s?pt\b/);
        const impact = selectImpact(state, locale);
        expect(Number.isInteger(impact.progressPercent)).toBe(true);
        expect(impact.progressPercent).toBeGreaterThanOrEqual(0);
        expect(impact.progressPercent).toBeLessThanOrEqual(100);
        if (impact.level < 5) {
          expect(impact.progressPercent).toBeLessThanOrEqual(99);
          expect(impact.nextLevelLabel).toContain(`${impact.progressPercent}%`);
        }
        expect(impact.levelHint.length).toBeGreaterThan(0);
      }
    }
  });

  it("위조 테스트 사본은 눈에 보이는 수상 등급이 바뀌고, 확인에 실패해요", () => {
    for (const vm of selectCertificates(busy, "ja")) {
      const forged = certificateVM(tamperedCopy(vm.cert), "ja");
      expect(forged.awardLabel).not.toBeNull();
      expect(forged.awardLabel).not.toBe(vm.awardLabel);
      expect(verifyCertificate(forged.cert)).toBe(false);
    }
  });

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

describe("스카우트 받기 설정 (Impact 한 줄 · 설정 스위치)", () => {
  it("켜짐/꺼짐 상태와 설명이 두 언어로 나오고, Impact 화면과 설정 화면이 같은 문구를 써요", () => {
    const off = reducer(initial, { type: "setScoutable", scoutable: false });
    for (const locale of LOCALES) {
      const onVm = selectScoutSetting(initial, locale);
      const offVm = selectScoutSetting(off, locale);
      expect(onVm.enabled).toBe(true);
      expect(offVm.enabled).toBe(false);
      expect(onVm.status).not.toBe(offVm.status);
      expect(onVm.note).not.toBe(offVm.note);
      const impact = selectImpact(initial, locale);
      expect([impact.scoutable, impact.scoutStatus, impact.scoutNote]).toEqual([true, onVm.status, onVm.note]);
      const impactOff = selectImpact(off, locale);
      expect([impactOff.scoutable, impactOff.scoutStatus, impactOff.scoutNote]).toEqual([false, offVm.status, offVm.note]);
    }
    expect(selectScoutSetting(initial, "ja").status).toBe("スカウトの受け取り：オン");
    expect(selectScoutSetting(off, "ko").status).toBe("스카우트 받기: 꺼짐");
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

  it("인재 검색: 같은 조건이면 레벨 → 수상 수 순서로 보여요(포인트 숫자는 보이지 않아요)", () => {
    const list = selectTalent(initial, "ja", { query: "", sdgIds: [] }).candidates.filter((c) => c.canScout && !c.isDemoStudent);
    for (let i = 1; i < list.length; i++) {
      const [a, b] = [list[i - 1], list[i]];
      expect(a.level > b.level || (a.level === b.level && a.awards >= b.awards)).toBe(true);
    }
    expect(list.every((c) => c.levelLabel.startsWith(`Lv.${c.level}`))).toBe(true);
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

  it("응모자 카드의 제출 버전은 「第1版 / 1차 제출」이고 스크린 리더 이름에 몇 번째 버전인지 들어가요 (#34)", () => {
    const state = run(
      initial,
      { type: "submitProposal", challengeId: "ch-plastic", draft, at: AT },
      { type: "submitProposal", challengeId: "ch-plastic", draft: { ...draft, fileName: "plan_v2.pdf" }, at: "2026-10-30T15:30" },
    );
    const ja = selectApplicants(state, "ja", "ch-plastic").applicants;
    expect(ja.find((a) => a.id === "pp-1")!.versionLabel).toBe("第1版");
    expect(ja.find((a) => a.id === "pp-1")!.versionA11y).toBe("提出された企画書の第1版");
    expect(ja.find((a) => a.mine)!.versionLabel).toBe("第2版");
    const ko = selectApplicants(state, "ko", "ch-plastic").applicants;
    expect(ko.find((a) => a.mine)!.versionLabel).toBe("2차 제출");
    expect(ko.find((a) => a.mine)!.versionA11y).toBe("제출한 기획서의 2번째 버전");
    // 레벨 표기(Lv.n)와 섞이지 않게, 버전 칩·수령증·응모 중 카드 어디에도 맨 글자 v1 이 없어요
    for (const locale of LOCALES) {
      const texts = [...selectApplicants(state, locale, "ch-plastic").applicants.map((a) => a.versionLabel), selectReceipt(state, "ch-plastic", locale)!.versionLabel, selectApplications(state, locale)[0].versionLabel];
      for (const text of texts) expect(text).not.toMatch(/\bv\d/);
    }
    expect(selectReceipt(state, "ch-plastic", "ja")!.versionLabel).toBe("第2版");
    expect(selectReceipt(state, "ch-plastic", "ko")!.versionLabel).toBe("2차 제출");
  });

  it("ESG: 점수·단계는 core 평가와 같고, 증빙이 없으면 안내가 나와요", () => {
    for (const locale of LOCALES) {
      const esg = selectEsg(initial, locale);
      const evaluated = evaluateCertification(initial.cert);
      expect(esg.total).toBe(evaluated.total);
      expect(esg.stars).toBe(evaluated.stars);
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

describe("대시보드 숫자 카드 → 해당 목록, 응모자 상태 필터 (#33)", () => {
  const submitted = run(initial, { type: "submitProposal", challengeId: "ch-plastic", draft, at: AT });

  it("카드 5개는 각자 갈 곳이 있고, 스크린 리더 이름에 숫자와 갈 곳이 함께 들어가요", () => {
    const ja = selectB2bDashboard(submitted, "ja");
    expect(ja.kpis.map((k) => [k.id, k.target])).toEqual([
      ["open", { kind: "section", section: "challenges" }],
      ["applicants", { kind: "applicants", filter: "all" }],
      ["pending", { kind: "applicants", filter: "submitted" }],
      ["matches", { kind: "applicants", filter: "adopted" }],
      ["donation", { kind: "section", section: "fees" }],
    ]);
    const label = (id: string) => ja.kpis.find((k) => k.id === id)!;
    expect(label("pending").actionLabel).toBe(`審査待ち ${label("pending").value}（審査待ちの応募者を見る）`);
    expect(label("donation").actionLabel).toBe(`寄付累計（貴社の寄付） ${formatYen(30_000, "ja")}（お支払いと寄付の内訳を見る）`);
    for (const kpi of ja.kpis) expect(kpi.actionLabel.startsWith(`${kpi.label} ${kpi.value}`)).toBe(true);
    const ko = selectB2bDashboard(submitted, "ko");
    expect(ko.kpis.find((k) => k.id === "matches")!.actionLabel).toBe(`매칭 성립 ${ko.kpis.find((k) => k.id === "matches")!.value} (채택한 응모자 보기)`);
    expect(ko.kpis.find((k) => k.id === "open")!.actionLabel).toContain("챌린지 관리 보기");
  });

  it("「すべての課題」: 맨 앞 선택지이고, 필터 칩 건수를 더하면 전체와 같아요", () => {
    for (const locale of LOCALES) {
      const view = selectApplicants(submitted, locale, ALL_CHALLENGES);
      expect(view.challengeOptions[0]).toMatchObject({ id: ALL_CHALLENGES, all: true });
      expect(view.challengeOptions.slice(1).every((o) => !o.all)).toBe(true);
      expect(view.allChallenges).toBe(true);
      expect(view.selectedId).toBe(ALL_CHALLENGES);
      expect(view.selected).toBeNull();
      expect(view.filters.map((f) => f.id)).toEqual(APPLICANT_FILTERS);
      const [all, ...rest] = view.filters;
      expect(rest.reduce((sum, f) => sum + f.count, 0)).toBe(all.count);
      expect(view.applicants).toHaveLength(all.count);
      // 여러 과제의 응모가 섞여서 카드마다 과제 이름이 붙어요
      expect(new Set(view.applicants.map((a) => a.challengeId))).toEqual(new Set(["ch-plastic", "ch-bottle"]));
    }
    expect(selectApplicants(submitted, "ja", ALL_CHALLENGES).challengeOptions[0].title).toBe("すべての課題");
    expect(selectApplicants(submitted, "ko", ALL_CHALLENGES).challengeOptions[0].title).toBe("모든 챌린지");
    expect(selectApplicants(submitted, "ja", ALL_CHALLENGES).filters.map((f) => f.label)).toEqual(["すべて", "審査待ち", "審査済み", "受賞", "採用"]);
    expect(selectApplicants(submitted, "ja", ALL_CHALLENGES).applicants.find((a) => a.challengeId === "ch-bottle")!.challengeLabel).toBe(`課題：${selectChallengeDetail(submitted, "ch-bottle", "ja")!.card.title}`);
  });

  it("「審査待ち」 카드 숫자 = 필터를 켠 목록 수 (심사하면 둘 다 줄어요)", () => {
    for (const state of [initial, submitted, busy, reviewedMine]) {
      const pending = Number(selectB2bDashboard(state, "ja").kpis.find((k) => k.id === "pending")!.value);
      const view = selectApplicants(state, "ja", ALL_CHALLENGES, "submitted");
      expect(view.applicants).toHaveLength(pending);
      expect(view.applicants.every((a) => a.status === "submitted")).toBe(true);
      expect(view.countNote).toBeNull();
    }
    expect(Number(selectB2bDashboard(reviewedMine, "ja").kpis.find((k) => k.id === "pending")!.value)).toBe(Number(selectB2bDashboard(submitted, "ja").kpis.find((k) => k.id === "pending")!.value) - 1);
  });

  it("카드 숫자와 목록 수가 다르면 이유를 한 줄로 밝혀요 (샘플 응모자 수 · 지난 매칭)", () => {
    const all = selectApplicants(submitted, "ja", ALL_CHALLENGES);
    const people = selectB2bDashboard(submitted, "ja").kpis.find((k) => k.id === "applicants")!.value;
    expect(all.countNote).toBe(`応募者 ${people}には、企画書データのない過去の応募（サンプル）も含まれます。ここに表示しているのは企画書 ${all.applicants.length}件です。`);
    const adopted = selectApplicants(submitted, "ja", ALL_CHALLENGES, "adopted");
    expect(adopted.applicants).toHaveLength(0);
    expect(adopted.countNote).toContain("マッチング成立 2件");
    expect(adopted.emptyLabel).toBe("この条件の応募はありません");
    // 내 기획서를 채택하면 매칭 3건 중 1건이 목록에 보여요
    const after = selectApplicants(reviewedMine, "ko", ALL_CHALLENGES, "adopted");
    expect(after.applicants.map((a) => a.id)).toEqual([mineId]);
    expect(after.countNote).toBe("매칭 성립 3건에는 기획서 데이터가 없는 지난 채택(샘플 · 내역은 대시보드의 「결제와 기부」)도 포함돼요. 여기에는 1건을 보여 줘요.");
    // 한 과제만 볼 때: 응모자 수와 기획서 수가 같으면 안내가 없어요
    expect(selectApplicants(submitted, "ja", "ch-plastic").countNote).toBeNull();
    // 응모자 수(샘플)만 있고 기획서가 없는 지난 과제는 안내 + 「表示できる企画書はありません」
    const old = selectApplicants(submitted, "ja", "ch-old1");
    expect(old.applicants).toEqual([]);
    expect(old.countNote).toContain("企画書 0件");
    expect(old.emptyLabel).toBe("表示できる企画書はありません");
    expect(selectApplicants(submitted, "ja", "ch-asaichi").emptyLabel).toBe("応募はまだありません");
  });

  it("주소의 status 값: 모르는 값은 전체, 필터를 켜도 방금 손댄 응모(keep)는 남아요", () => {
    expect(APPLICANT_FILTERS.map((f) => parseApplicantFilter(f))).toEqual(APPLICANT_FILTERS);
    for (const raw of [null, undefined, "", "pending", "ALL", "x"]) expect(parseApplicantFilter(raw)).toBe("all");
    const state = run(submitted, { type: "reviewProposal", proposalId: mineId, review: { creativity: 4, feasibility: 3, sdgContribution: 5, comment: "" }, at: AT });
    expect(selectApplicants(state, "ja", ALL_CHALLENGES, "submitted").applicants.some((a) => a.id === mineId)).toBe(false);
    const kept = selectApplicants(state, "ja", ALL_CHALLENGES, "submitted", [mineId]);
    expect(kept.applicants.some((a) => a.id === mineId && a.status === "reviewed")).toBe(true);
    expect(kept.filters.find((f) => f.id === "submitted")!.count).toBe(kept.applicants.length - 1);
  });

  it("한 과제를 고르면 그 과제의 응모만, 필터는 그 과제 안에서 세요 (기본 선택은 그대로)", () => {
    const one = selectApplicants(submitted, "ja", "ch-bottle", "reviewed");
    expect(one.allChallenges).toBe(false);
    expect(one.selectedId).toBe("ch-bottle");
    expect(one.applicants.map((a) => a.id).sort()).toEqual(["pb-1", "pb-2"]);
    expect(one.filters.find((f) => f.id === "all")!.count).toBe(5);
    expect(selectApplicants(submitted, "ja", null).selectedId).toBe("ch-plastic");
  });

});

describe("SNS 피드 (F-503 · F-504)", () => {
  const find = (list: PostVM[], id: string): PostVM => list.find((p) => p.id === id)!;
  const mineBrag = run(initial, { type: "createPost", draft: { kind: "brag", body: "優秀賞をいただきました！", activityId: "h-5b" }, at: AT });

  it("피드: 최신순이고, 전체 8건 · 기업 홍보 4건 · 학생 자랑 4건으로 걸러 볼 수 있어요", () => {
    const all = selectFeed(initial, "ja", "b2c");
    // po-1 은 공식 SNS 에 이미 올라간 글이라 4일 전에 썼어요(게시는 사흘 전)
    expect(all.posts.map((p) => p.id)).toEqual(["po-5", "po-4", "po-6", "po-2", "po-7", "po-3", "po-1", "po-8"]);
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

  it("쓴 회사(기업 화면 · 우리 회사 글)에게는 예정이면 채널 · 날짜(M/D) · 게시료가 보여요", () => {
    expect(find(selectFeed(initial, "ja", "b2b").posts, "po-4").official).toEqual({
      audience: "author", status: "scheduled", label: "公式SNS掲載予定 · Instagram · 10/31", feeLabel: `掲載料 ${formatYen(3000, "ja")}（サンプル）`, link: null,
      channel: "instagram", channelName: "Instagram", channelLabel: "Instagram フィード投稿",
    });
    expect(find(selectFeed(initial, "ko", "b2b").posts, "po-4").official).toMatchObject({ label: "공식 SNS 게시 예정 · 인스타그램 · 10/31", feeLabel: "게시료 3,000엔(샘플)" });
  });

  it("학생·다른 기업에게는 예정이면 아무것도 보이지 않아요 (예정일·게시료는 쓴 회사에게만)", () => {
    for (const locale of LOCALES) {
      // 다른 회사의 예정 신청(po-2 X · po-3 Instagram)은 학생에게도 기업(우리 회사)에게도 안 보여요
      for (const role of ["b2c", "b2b"] as const) for (const id of ["po-2", "po-3"]) expect(find(selectFeed(initial, locale, role).posts, id).official, `${locale} ${role} ${id}`).toBeNull();
      // 우리 회사의 예정 신청(po-4)도 학생 화면에서는 안 보여요
      expect(find(selectFeed(initial, locale, "b2c").posts, "po-4").official).toBeNull();
    }
  });

  it("게시된 신청(po-1)은 누구에게나 「公式SNSでも紹介中」과 공식 SNS 링크로 보여요 — 게시글 주소가 없으면 공식 계정으로", () => {
    const expected = {
      audience: "public", status: "posted", label: "公式SNSでも紹介中 · Instagram", feeLabel: null,
      link: { url: OFFICIAL_ACCOUNT_URLS.instagram, label: "公式SNSで見る" }, channel: "instagram", channelName: "Instagram", channelLabel: "Instagram フィード投稿",
    };
    expect(find(selectFeed(initial, "ja", "b2c").posts, "po-1").official).toEqual(expected);
    expect(find(selectFeed(initial, "ja", "b2b").posts, "po-1").official).toEqual(expected); // 다른 회사(우리 회사)에게도 같아요
    expect(find(selectFeed(initial, "ko", "b2c").posts, "po-1").official).toMatchObject({
      label: "공식 SNS에서도 소개 중 · 인스타그램", link: { url: "https://www.instagram.com/sdgscompass_app/", label: "공식 SNS에서 보기" }, feeLabel: null,
    });
  });

  it("쓴 회사가 보는 게시 완료: 「公式SNSに掲載済み」 + 게시글이 있으면 「投稿を見る」, 없으면 공식 계정으로 「公式SNSで見る」", () => {
    const withMine = (official: OfficialShare) => ({ ...initial, posts: initial.posts.map((p) => (p.id === "po-4" && p.kind === "pr" ? { ...p, official } : p)) });
    const base: OfficialShare = { on: "2026-10-27", channel: "instagram", feeYen: 3000, status: "posted", postUrl: "https://www.instagram.com/p/sample/" };
    expect(find(selectFeed(withMine(base), "ja", "b2b").posts, "po-4").official).toMatchObject({
      audience: "author", status: "posted", label: "公式SNSに掲載済み · Instagram", feeLabel: null, link: { url: "https://www.instagram.com/p/sample/", label: "投稿を見る" },
    });
    expect(find(selectFeed(withMine({ ...base, postUrl: null }), "ko", "b2b").posts, "po-4").official).toMatchObject({
      label: "공식 SNS에 게시됨 · 인스타그램", link: { url: "https://www.instagram.com/sdgscompass_app/", label: "공식 SNS에서 보기" },
    });
    // 학생이 보면 같은 글도 「公式SNSでも紹介中」 + 「公式SNSで見る」(게시글 주소로)
    expect(find(selectFeed(withMine(base), "ja", "b2c").posts, "po-4").official).toMatchObject({ audience: "public", link: { url: "https://www.instagram.com/p/sample/", label: "公式SNSで見る" } });
    // 게시글 주소가 없으면 그 채널의 공식 계정 주소로 (X·Facebook 도)
    expect(find(selectFeed(withMine({ ...base, channel: "facebook" as const, postUrl: null }), "ja", "b2c").posts, "po-4").official).toMatchObject({ link: { url: "https://www.facebook.com/profile.php?id=61596222300663", label: "公式SNSで見る" }, channel: "facebook" });
    expect(find(selectFeed(withMine({ ...base, channel: "x" as const, postUrl: null }), "ja", "b2c").posts, "po-4").official).toMatchObject({ link: { url: "https://x.com/SDGs3ab", label: "公式SNSで見る" }, channel: "x" });
  });

  it("공식 SNS 게시 신청 라벨은 글을 올릴 때 고른 채널을 따라가요 (날짜를 비우면 고를 수 있는 가장 빠른 날)", () => {
    const requested = run(initial, { type: "createPost", draft: { kind: "pr", title: "t", body: "b", sdgIds: [14], requestOfficial: true, officialChannel: "x" }, at: AT });
    const mine = find(selectFeed(requested, "ko", "b2b").posts, requested.posts[0].id);
    expect(mine.official).toMatchObject({ label: "공식 SNS 게시 예정 · X · 10/31", channel: "x" });
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

  it("글쓰기(홍보): 우리 회사 챌린지만 고르고, SDGs 기본값은 챌린지 → 기업 순서이며, 공식 게시는 채널과 날짜(회사당 월 4회)를 골라요", () => {
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
    expect(composer.official).toMatchObject({ feeYen: 3000, defaultChannel: "instagram", limit: 4, defaultDate: "2026-10-31", unavailableReason: null, fullMonthNotes: [] });
    // 채널은 X · Instagram · Facebook 순서 (날짜는 채널과 상관없어요)
    expect(composer.official.channels.map((c) => [c.id, c.name, c.format, c.label])).toEqual([
      ["x", "X", "포스트", "X 포스트"],
      ["instagram", "인스타그램", "피드 게시물", "인스타그램 피드 게시물"],
      ["facebook", "페이스북", "페이지 게시", "페이스북 페이지 게시"],
    ]);
    // 날짜는 내일(10/31)부터 30일 뒤(11/29)까지. 우리 회사는 10/31 에 1건이 있어서 10월은 3/4, 11월은 4/4
    const dates = composer.official.dates;
    expect(dates).toHaveLength(30);
    expect(dates[0]).toEqual({ date: "2026-10-31", label: "10월 31일(토)", available: true, month: "2026-10", remaining: 3, remainingLabel: "10월 남은 횟수 3/4회" });
    expect(dates[1]).toMatchObject({ date: "2026-11-01", label: "11월 1일(일)", remaining: 4, remainingLabel: "11월 남은 횟수 4/4회" });
    expect(dates.at(-1)?.date).toBe("2026-11-29");
    expect(dates.every((d) => d.available)).toBe(true);
    const ja = selectComposer(initial, "ja", "pr").official;
    expect(ja.hint).toBe("1社につき月4回まで（すべてのSNSの合計）。掲載日は明日から30日後までの中から選べます（掲載料 ¥3,000・サンプル）");
    expect([ja.dates[0].label, ja.dates[0].remainingLabel, ja.dates[1].remainingLabel]).toEqual(["10月31日（土）", "10月の残り 3/4回", "11月の残り 4/4回"]);
    expect(composer).toMatchObject({ kind: "pr", bodyLimit: 400, titleLimit: 40, author: { avatar: "🐟", verified: true } });
  });

  it("같은 달에 4번을 다 쓰면 그 달의 날짜는 고를 수 없고 이유가 보여요 — 다른 회사의 신청은 상관없어요", () => {
    const apply = (state: DemoState, officialOn?: string) =>
      run(state, { type: "createPost", draft: { kind: "pr", title: "t", body: "b", sdgIds: [14], requestOfficial: true, officialOn }, at: AT });
    // 10월은 10/31 하루뿐: 이미 1건 → 3건을 더 넣으면 10월이 차요
    const octoberFull = apply(apply(apply(initial)));
    const official = selectComposer(octoberFull, "ja", "pr").official;
    expect(official.dates[0]).toMatchObject({ date: "2026-10-31", available: false, remaining: 0, remainingLabel: "10月の残り 0/4回" });
    expect(official.defaultDate).toBe("2026-11-01");
    expect(official.fullMonthNotes).toEqual(["10月は掲載枠（月4回）を使い切ったため選べません"]);
    expect(apply(octoberFull, "2026-10-31")).toBe(octoberFull); // 찬 달의 날짜로는 올라가지 않아요
    // 11월도 4번 채우면 고를 날이 없어요 → 신청 스위치를 꺼요
    const allFull = ["2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23"].reduce(apply, octoberFull);
    const none = selectComposer(allFull, "ja", "pr").official;
    expect(none.defaultDate).toBeNull();
    expect(none.dates.every((d) => !d.available)).toBe(true);
    expect(none.unavailableReason).toBe("この先30日間は掲載枠（月4回）を使い切っているため、いまは申し込めません");
    expect(none.fullMonthNotes).toHaveLength(2);
    expect(selectComposer(allFull, "ko", "pr").official.unavailableReason).toContain("30일");
    // 다른 회사(po-1 · po-3)가 10/31 Instagram 에 있어도 우리 회사의 선택지에는 영향이 없어요
    expect(selectComposer(initial, "ja", "pr").official.dates[0].remaining).toBe(3);
  });

  it("고른 날짜로 신청돼요: 날짜를 비우면 가장 빠른 날, 고르면 그 날 (채널과 상관없어요)", () => {
    const create = (officialOn?: string, officialChannel?: "x" | "instagram" | "facebook") =>
      run(initial, { type: "createPost", draft: { kind: "pr", title: "t", body: "b", sdgIds: [14], requestOfficial: true, officialChannel, officialOn }, at: AT }).posts[0];
    expect(create()).toMatchObject({ official: { on: "2026-10-31", channel: "instagram" } });
    expect(create("2026-11-20", "x")).toMatchObject({ official: { on: "2026-11-20", channel: "x" } });
    expect(create("2026-11-29", "facebook")).toMatchObject({ official: { on: "2026-11-29", channel: "facebook" } });
    // 31일 뒤는 거절돼서 아무것도 바뀌지 않아요
    expect(run(initial, { type: "createPost", draft: { kind: "pr", title: "t", body: "b", sdgIds: [14], requestOfficial: true, officialOn: "2026-11-30" }, at: AT })).toBe(initial);
  });
});

describe("SDGs 실천 마크 — ★5 만점 · 0.5 단위, 학생에게도 회사 이름 옆에 (#35)", () => {
  const starsOf = (state: DemoState, locale: Locale) => Object.fromEntries(state.companies.map((c) => [c.id, selectCompanyMark(state, c.id, locale)?.starsLabel ?? null]));
  const companyOfChallenge = (state: DemoState, challengeId: string) => state.challenges.find((c) => c.id === challengeId)!.companyId;
  const allEvidence = (state: DemoState, evidence: boolean) =>
    run(state, ...(["ecoPackage", "renewable", "donation", "womenManagers", "volunteer", "disclosure"] as const).map((id): Action => ({ type: "setCertAnswer", id, evidence })));

  it("샘플 회사의 마크: 우리 회사는 ESG 입력값(53점 ★2.5), 다른 회사는 가상의 샘플 값, 마크 없는 회사(未取得)는 null", () => {
    for (const locale of LOCALES) {
      expect(starsOf(initial, locale)).toEqual({ "co-minato": "★2.5", "co-green": "★4.0", "co-hikari": "★4.5", "co-machi": "★1.5", "co-yasai": null, "co-kotoba": "★3.5" });
    }
    expect(selectCompanyMark(initial, "없는-회사", "ja")).toBeNull();
  });

  it("이름은 #19 그대로 + ★숫자, 스크린 리더 이름에 숫자, 누르면 보이는 안내는 기존 문구와 기준 한 줄", () => {
    const ja = selectCompanyMark(initial, "co-hikari", "ja")!;
    expect(ja).toEqual({
      stars: 4.5,
      name: "SDGs取組みマーク",
      starsLabel: "★4.5",
      accessibilityLabel: "SDGs取組みマーク 5段階中4.5",
      icons: ["full", "full", "full", "full", "half"],
      disclaimer: CERT_DISCLAIMER.ja,
      rule: "基準：ESG 6項目の達成度（証明資料のある項目のみ・100点満点）10点ごとに★0.5、100点で★5.0。",
    });
    expect(ja.disclaimer).toBe("※この取組みマークは独自の目安です。国・自治体・国連の認証ではありません。");
    const ko = selectCompanyMark(initial, "co-hikari", "ko")!;
    expect(ko).toMatchObject({ name: "SDGs 실천 마크", starsLabel: "★4.5", accessibilityLabel: "SDGs 실천 마크 5단계 중 4.5", disclaimer: CERT_DISCLAIMER.ko });
    expect(ko.rule).toBe("기준: ESG 6개 항목의 달성도(증빙 자료가 있는 항목만, 100점 만점) 10점마다 ★0.5, 100점이면 ★5.0.");
    expect(selectCompanyMark(initial, "co-green", "ja")!.accessibilityLabel).toBe("SDGs取組みマーク 5段階中4.0");
    // 인증·추천·평점으로 읽히는 말, 옛 이름은 쓰지 않아요
    for (const vm of [ja, ko]) expect(JSON.stringify(vm)).not.toMatch(/優良|実践マーク|認証マーク|인증마크|우수 기업|우량|評価|평점|スタンダード|シルバー|ゴールド|스탠다드|실버|골드/);
  });

  it("학생이 보는 챌린지 카드(홈 추천·마감 임박·검색)와 챌린지 상세에 그 회사의 마크 — 未取得 회사의 과제는 마크 없음", () => {
    for (const locale of LOCALES) {
      const home = selectHome(initial, locale);
      const cards = [...home.recommended, ...home.soon, ...selectSearch(initial, locale, { query: "", sdgIds: [] })];
      expect(cards.length).toBeGreaterThan(5);
      for (const card of cards) expect(card.companyMark, card.id).toEqual(selectCompanyMark(initial, companyOfChallenge(initial, card.id), locale));
      for (const challenge of initial.challenges) {
        const detail = selectChallengeDetail(initial, challenge.id, locale)!;
        expect(detail.company.mark, challenge.id).toEqual(selectCompanyMark(initial, challenge.companyId, locale));
      }
    }
    const yasai = initial.challenges.filter((c) => c.companyId === "co-yasai");
    expect(yasai.length).toBeGreaterThan(0);
    for (const c of yasai) expect(selectChallengeDetail(initial, c.id, "ja")!.card.companyMark).toBeNull();
    expect(selectChallengeDetail(initial, "ch-plastic", "ja")!.company.mark?.starsLabel).toBe("★2.5");
  });

  it("피드: 기업 글의 회사 이름 옆에 마크(학생·기업 화면 같은 값), 학생 자랑 글에는 없음", () => {
    for (const locale of LOCALES) {
      for (const role of ["b2c", "b2b"] as const) {
        for (const post of selectFeed(busy, locale, role).posts) {
          const source = busy.posts.find((p) => p.id === post.id)!;
          if (source.kind === "brag") expect(post.companyMark, post.id).toBeNull();
          else expect(post.companyMark, post.id).toEqual(selectCompanyMark(busy, source.companyId, locale));
        }
      }
    }
    const marks = Object.fromEntries(selectFeed(initial, "ja", "b2c").posts.filter((p) => p.kind === "pr").map((p) => [p.id, p.companyMark?.starsLabel ?? null]));
    expect(marks).toEqual({ "po-1": "★4.0", "po-2": "★4.5", "po-3": "★1.5", "po-4": "★2.5" });
  });

  it("우리 회사의 마크는 ESG 입력을 그대로 따라가요: 증빙을 올리면 학생 피드·카드·상세도 ★3.0, 10점 미만이 되면 사라져요", () => {
    const more = run(initial, { type: "setCertAnswer", id: "womenManagers", evidence: true });
    const minatoPost = (state: DemoState) => selectFeed(state, "ja", "b2c").posts.find((p) => p.id === "po-4")!;
    expect(minatoPost(initial).companyMark?.starsLabel).toBe("★2.5");
    expect(minatoPost(more).companyMark?.starsLabel).toBe("★3.0");
    expect(selectChallengeDetail(more, "ch-plastic", "ko")!.card.companyMark?.accessibilityLabel).toBe("SDGs 실천 마크 5단계 중 3.0");
    const none = allEvidence(initial, false);
    expect(minatoPost(none).companyMark).toBeNull();
    expect(selectChallengeDetail(none, "ch-plastic", "ja")!.company.mark).toBeNull();
    // 다른 회사의 마크는 우리 회사의 입력과 상관없어요
    expect(starsOf(none, "ja")["co-green"]).toBe("★4.0");
  });

  it("기업 ESG 화면: 「★2.5」 + 별 그림 + 다음 반 개까지 남은 점수 — 예전 3단계 이름은 없어요", () => {
    const ja = selectEsg(initial, "ja");
    expect(ja).toMatchObject({ total: 53, stars: 2.5, starsLabel: "★2.5", markLabel: "SDGs取組みマーク 5段階中2.5", nextLabel: "次の★3.0まであと 7点" });
    expect(ja.starIcons).toEqual(["full", "full", "half", "empty", "empty"]);
    expect(ja.highlights).toContain("SDGs取組みマーク：★2.5");
    const ko = selectEsg(initial, "ko");
    expect(ko).toMatchObject({ starsLabel: "★2.5", markLabel: "SDGs 실천 마크 5단계 중 2.5", nextLabel: "다음 ★3.0까지 7점 남았어요" });
    expect(ko.highlights).toContain("SDGs 실천 마크: ★2.5");
    for (const vm of [ja, ko]) expect(JSON.stringify(vm)).not.toMatch(/スタンダード|シルバー|ゴールド|스탠다드|실버|골드/);
    // 증빙을 모두 내리면 0점 → 未取得 · 다음 ★0.5 까지 10점
    const none = selectEsg(allEvidence(initial, false), "ja");
    expect(none).toMatchObject({ total: 0, stars: 0, starsLabel: "未取得", markLabel: "SDGs取組みマーク 未取得", nextLabel: "次の★0.5まであと 10点" });
    expect(none.starIcons.every((i) => i === "empty")).toBe(true);
    expect(none.highlights).toContain("SDGs取組みマーク：未取得");
    // 모든 항목을 목표 이상 + 증빙 → 100점 ★5.0, 다음 별 없음
    const top = run(
      allEvidence(initial, true),
      ...([["ecoPackage", 60], ["renewable", 40], ["donation", 300_000], ["womenManagers", 30], ["volunteer", 8], ["disclosure", 1]] as const).map(
        ([id, value]): Action => ({ type: "setCertAnswer", id, value }),
      ),
    );
    expect(selectEsg(top, "ja")).toMatchObject({ total: 100, stars: 5, starsLabel: "★5.0", nextLabel: "最高の★5.0です" });
    expect(selectEsg(top, "ko").nextLabel).toBe("최고 단계 ★5.0이에요");
  });
});
