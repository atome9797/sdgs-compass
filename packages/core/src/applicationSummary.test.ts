import { describe, expect, it } from "vitest";
import { makeUsageState } from "./adminFixtures";
import {
  DEFAULT_SUMMARY_PERIOD,
  inSummaryPeriod,
  isSummaryPeriod,
  monthsBefore,
  parseSummaryPeriod,
  periodStart,
  selectApplicationSummary,
  SUMMARY_MAX_ACTIVITIES,
  SUMMARY_MAX_CERTIFICATES,
  SUMMARY_NOTE_KEYS,
  SUMMARY_PERIODS,
} from "./applicationSummary";
import type { Activity, DemoState } from "./domain";
import { MESSAGES, translate } from "./messages";
import { summary } from "./messages/summary";
import { selectCertificates } from "./selectors";

const act = (id: string, kind: Activity["kind"], date: string, extra: Partial<Activity> = {}): Activity => ({
  id,
  kind,
  title: { ja: `活動${id}`, ko: `활동${id}` },
  companyName: { ja: "会社", ko: "회사" },
  sdgIds: [14],
  date,
  points: 100,
  ...extra,
});

/** 오늘 2026-10-30. 최근 6개월 안 3건(참가·제출·수상), 1년 안 1건 더, 그 전 1건, 공유 2회 */
function makeState(history: Activity[] = defaultHistory(), overrides: Partial<DemoState> = {}): DemoState {
  return makeUsageState({ today: "2026-10-30", proposals: [], shares: 2, history, ...overrides });
}
const defaultHistory = (): Activity[] => [
  act("p1", "participation", "2026-08-10", { sdgIds: [14] }),
  act("s1", "submission", "2026-10-05", { sdgIds: [14, 12], points: 150 }),
  act("a1", "award", "2026-10-06", { sdgIds: [14], award: "excellence", points: 300 }),
  act("p2", "participation", "2025-12-01", { sdgIds: [4], points: 80 }),
  act("p3", "participation", "2025-01-10", { sdgIds: [13], points: 50 }),
];

describe("기간", () => {
  it("N개월 전의 같은 날 (없는 날은 그 달의 마지막 날)", () => {
    expect(monthsBefore("2026-10-30", 12)).toBe("2025-10-30");
    expect(monthsBefore("2026-10-30", 6)).toBe("2026-04-30");
    expect(monthsBefore("2026-03-31", 1)).toBe("2026-02-28");
    expect(monthsBefore("2024-03-31", 1)).toBe("2024-02-29");
    expect(monthsBefore("2026-01-15", 6)).toBe("2025-07-15");
    expect(monthsBefore("2026-08-31", 6)).toBe("2026-02-28");
  });

  it("주소 값 → 프리셋 (모르는 값은 기본값 '전체')", () => {
    expect(SUMMARY_PERIODS).toEqual(["all", "year", "half"]);
    expect(DEFAULT_SUMMARY_PERIOD).toBe("all");
    expect(parseSummaryPeriod("year")).toBe("year");
    expect(parseSummaryPeriod(" HALF ")).toBe("half");
    for (const raw of [null, undefined, "", "1y", "<script>"]) expect(parseSummaryPeriod(raw)).toBe("all");
    expect(isSummaryPeriod("half")).toBe(true);
    expect(isSummaryPeriod(6)).toBe(false);
  });

  it("시작일을 포함해요 (전체 기간은 시작이 없어요)", () => {
    expect(periodStart("2026-10-30", "all")).toBeNull();
    expect(periodStart("2026-10-30", "year")).toBe("2025-10-30");
    expect(inSummaryPeriod("2025-10-30", "2026-10-30", "year")).toBe(true);
    expect(inSummaryPeriod("2025-10-29", "2026-10-30", "year")).toBe(false);
    expect(inSummaryPeriod("2026-04-30", "2026-10-30", "half")).toBe(true);
    expect(inSummaryPeriod("2026-04-29", "2026-10-30", "half")).toBe(false);
    expect(inSummaryPeriod("2001-01-01", "2026-10-30", "all")).toBe(true);
  });
});

describe("신청 요약 한 장", () => {
  it("기간마다 활동·건수·포인트가 달라지고, 공유 기록은 넣지 않아요", () => {
    const state = makeState();
    const all = selectApplicationSummary(state, "ja", "all");
    expect(all.activitiesTotal).toBe(5);
    expect(all.activities.map((a) => a.id)).toEqual(["a1", "s1", "p1", "p2", "p3"]);
    expect(all.activities.some((a) => a.kind === "share")).toBe(false);
    expect(all.stats.map((s) => [s.key, s.value])).toEqual([
      ["participations", "3件"],
      ["submissions", "1件"],
      ["awards", "1件"],
      ["points", "680 pt"],
    ]);

    const year = selectApplicationSummary(state, "ja", "year");
    expect(year.activities.map((a) => a.id)).toEqual(["a1", "s1", "p1", "p2"]);
    const half = selectApplicationSummary(state, "ja", "half");
    expect(half.activities.map((a) => a.id)).toEqual(["a1", "s1", "p1"]);
    expect(half.stats.find((s) => s.key === "points")?.value).toBe("550 pt");
    expect(half.empty).toBe(false);
  });

  it("SDG 는 붙은 활동 수가 많은 순, 같으면 번호 순", () => {
    const vm = selectApplicationSummary(makeState(), "ja", "all");
    expect(vm.sdgs.map((s) => [s.id, s.count])).toEqual([
      [14, 3],
      [4, 1],
      [12, 1],
      [13, 1],
    ]);
    expect(vm.sdgs[0].label).toContain("14");
    expect(vm.sdgs[0].countLabel).toBe("3件");
  });

  it("증명서 번호·확인 코드가 증명서 화면과 같아요", () => {
    const state = makeState();
    const screen = selectCertificates(state, "ja");
    const vm = selectApplicationSummary(state, "ja", "all");
    expect(vm.certificatesTotal).toBe(screen.length);
    expect(vm.certificates.map((c) => [c.id, c.code])).toEqual(screen.slice(0, SUMMARY_MAX_CERTIFICATES).map((c) => [c.cert.id, c.code]));
    expect(vm.certificates[0].kindLabel).toBe(translate("cert.kindAward", "ja"));
    expect(vm.certificates[0].qr.length).toBeGreaterThan(20);
    expect(vm.certificates[0].codeLabel).toContain(vm.certificates[0].code);

    // 기간으로 거르면 그 기간의 증명서만 (번호는 그대로)
    const half = selectApplicationSummary(state, "ja", "half");
    const halfIds = screen.filter((c) => c.cert.issuedOn >= "2026-04-30").map((c) => c.cert.id);
    expect(half.certificates.map((c) => c.id)).toEqual(halfIds.slice(0, SUMMARY_MAX_CERTIFICATES));
  });

  it("A4 한 장에 맞춰 줄 수를 자르고 나머지는 'ほか n件'", () => {
    const many = Array.from({ length: 12 }, (_, i) => act(`m${i}`, "participation", `2026-09-${String(10 + i).padStart(2, "0")}`));
    const vm = selectApplicationSummary(makeState(many), "ja", "all");
    expect(vm.activities.length).toBe(SUMMARY_MAX_ACTIVITIES);
    expect(vm.activitiesTotal).toBe(12);
    expect(vm.moreActivitiesLabel).toBe(translate("summary.activities.more", "ja", { n: "2" }));
    expect(vm.certificates.length).toBe(SUMMARY_MAX_CERTIFICATES);
    expect(vm.moreCertificatesLabel).toBe(translate("summary.certs.more", "ja", { n: "8" }));
    // 공유 글에는 자르지 않고 모두 적어요
    for (const a of many) expect(vm.shareText).toContain(`活動${a.id}`);

    const few = selectApplicationSummary(makeState(), "ja", "all");
    expect(few.moreActivitiesLabel).toBeNull();
    expect(few.moreCertificatesLabel).toBe(translate("summary.certs.more", "ja", { n: "1" }));
  });

  it("빈 상태: 기간 안에 활동이 없어도 고지 문장은 늘 있어요", () => {
    const vm = selectApplicationSummary(makeState([act("old", "participation", "2024-05-01")], { shares: 0 }), "ja", "half");
    expect(vm.empty).toBe(true);
    expect(vm.activities).toEqual([]);
    expect(vm.sdgs).toEqual([]);
    expect(vm.certificates).toEqual([]);
    expect(vm.stats.map((s) => s.value)).toEqual(["0件", "0件", "0件", "0 pt"]);
    expect(vm.notes).toEqual(SUMMARY_NOTE_KEYS.map((key) => translate(key, "ja")));
    expect(vm.shareText).toContain(translate("summary.activities.empty", "ja"));
  });

  it("머리글: 문서 이름·작성일·기간·이름·소속·레벨", () => {
    const state = makeState();
    const all = selectApplicationSummary(state, "ja", "all");
    expect(all.docTitle).toBe(translate("summary.docTitle", "ja"));
    expect(all.createdOnLabel).toBe("作成日 2026年10月30日");
    expect(all.rangeLabel).toBe("全期間（〜 2026年10月30日）");
    expect(selectApplicationSummary(state, "ja", "year").rangeLabel).toBe("2025年10月30日 〜 2026年10月30日");
    expect(all.holder.name).toBe(state.me.nickname);
    expect(all.holder.affiliation).toContain(" · ");
    expect(all.holder.levelLabel.length).toBeGreaterThan(0);
    expect(all.periodOptions.map((o) => [o.id, o.selected])).toEqual([
      ["all", true],
      ["year", false],
      ["half", false],
    ]);
    expect(selectApplicationSummary(state, "ko", "half").periodOptions.map((o) => o.label)).toEqual(["전체 기간", "최근 1년", "최근 6개월"]);
  });

  it("한국어: 같은 모양, 공유 글에 가나·전각 괄호가 섞이지 않아요", () => {
    const vm = selectApplicationSummary(makeState(), "ko", "all");
    expect(vm.rangeLabel).toBe("전체 기간(~ 2026년 10월 30일)");
    expect(vm.stats[0].value).toBe("3건");
    expect(vm.shareText).toContain(translate("summary.docTitle", "ko"));
    expect(vm.shareText).not.toMatch(/[぀-ゟ゠-ヿ（）]/);
    for (const note of SUMMARY_NOTE_KEYS) expect(vm.shareText).toContain(translate(note, "ko"));
  });

  it("공유 글: 기간 · 건수 · 활동 · 증명서 번호 · 고지", () => {
    const vm = selectApplicationSummary(makeState(), "ja", "half");
    expect(vm.shareText.split("\n")[0]).toBe(vm.docTitle);
    expect(vm.shareText).toContain(vm.rangeLabel);
    expect(vm.shareText).toContain("参加 1件・企画書の提出 1件・受賞 1件・ポイント 550 pt");
    expect(vm.shareText).toContain("受賞（");
    for (const c of vm.certificates) expect(vm.shareText).toContain(c.id);
    expect(vm.shareText.trim().endsWith(translate("summary.note.sample", "ja"))).toBe(true);
  });
});

describe("신청 요약 문구", () => {
  it("코드가 만드는 키가 모두 사전에 있어요", () => {
    for (const id of SUMMARY_PERIODS) expect(MESSAGES[`summary.period.${id}`]).toBeDefined();
    for (const key of SUMMARY_NOTE_KEYS) expect(MESSAGES[key]).toBeDefined();
  });

  it("지급·제휴·보장으로 읽히는 말, 「チャレンジ」·「AI」·「認証」을 쓰지 않아요", () => {
    for (const [key, entry] of Object.entries(summary)) {
      expect(entry.ja, key).not.toMatch(/チャレンジ|AI|認証|支給|提携しています|保証します/);
      expect(entry.ko, key).not.toMatch(/지급해|제휴했|보장해요|인증/);
    }
    // 부정문(보장하지 않음·제휴하지 않음)은 꼭 있어요
    expect(summary["summary.note.record"].ja).toContain("保証するものではありません");
    expect(summary["summary.note.partner"].ja).toContain("提携していません");
  });
});
