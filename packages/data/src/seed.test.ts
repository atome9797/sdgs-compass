import { describe, expect, it } from "vitest";
import { evaluateCertification } from "@sdgs-compass/core/certification";
import { daysBetween } from "@sdgs-compass/core/format";
import { selectEsg, selectHome, selectImpact } from "@sdgs-compass/core/selectors";
import { createInitialState, DEMO_COMPANY_ID, DEMO_STUDENT_ID } from "./seed";

const TODAY = "2026-10-30";
const state = createInitialState(TODAY);

/** 상태 전체를 훑어서 { ja, ko } 한 쌍을 모두 모아요 */
function collectPairs(value: unknown, path: string, out: { path: string; ja: string; ko: string }[]): void {
  if (Array.isArray(value)) {
    value.forEach((v, i) => collectPairs(v, `${path}[${i}]`, out));
  } else if (typeof value === "object" && value !== null) {
    const keys = Object.keys(value);
    const record = value as Record<string, unknown>;
    if (keys.length === 2 && keys.includes("ja") && keys.includes("ko") && typeof record.ja === "string" && typeof record.ko === "string") {
      out.push({ path, ja: record.ja, ko: record.ko });
    } else {
      for (const key of keys) collectPairs(record[key], `${path}.${key}`, out);
    }
  }
}

describe("샘플 데이터", () => {
  it("기본 모양", () => {
    expect(state.version).toBe(1);
    expect(state.today).toBe(TODAY);
    expect(state.me.id).toBe(DEMO_STUDENT_ID);
    expect(state.myCompanyId).toBe(DEMO_COMPANY_ID);
    expect(state.companies.length).toBeGreaterThanOrEqual(6);
    expect(state.challenges.length).toBeGreaterThanOrEqual(8);
    expect(state.talent.length).toBeGreaterThanOrEqual(8);
  });

  it("id 는 모음마다 겹치지 않아요", () => {
    for (const [name, list] of Object.entries({
      companies: state.companies, challenges: state.challenges, teamPosts: state.teamPosts, proposals: state.proposals,
      history: state.history, talent: state.talent, scouts: state.scouts, matches: state.matches,
    })) {
      const ids = list.map((x) => x.id);
      expect(new Set(ids).size, name).toBe(ids.length);
    }
  });

  it("참조하는 id 가 모두 존재해요", () => {
    const companies = new Set(state.companies.map((c) => c.id));
    const challenges = new Set(state.challenges.map((c) => c.id));
    expect(companies.has(state.myCompanyId)).toBe(true);
    for (const c of state.challenges) expect(companies.has(c.companyId), c.id).toBe(true);
    for (const p of state.teamPosts) expect(challenges.has(p.challengeId), p.id).toBe(true);
    for (const p of state.proposals) expect(challenges.has(p.challengeId), p.id).toBe(true);
    for (const id of state.bookmarks) expect(challenges.has(id), id).toBe(true);
    for (const m of state.matches) expect(companies.has(m.companyId), m.id).toBe(true);
    for (const s of state.scouts) {
      expect(companies.has(s.companyId), s.id).toBe(true);
      expect(s.studentId).toBe(state.me.id);
    }
  });

  it("모든 두 언어 문구가 채워져 있고, 서로 다른 언어가 섞이지 않았어요", () => {
    const pairs: { path: string; ja: string; ko: string }[] = [];
    collectPairs(state, "state", pairs);
    expect(pairs.length).toBeGreaterThan(100);
    for (const { path, ja, ko } of pairs) {
      expect(ja.trim().length > 0 && ko.trim().length > 0, path).toBe(true);
      expect(/[가-힣]/.test(ja), `${path} 의 일본어에 한글: ${ja}`).toBe(false);
      expect(/[ぁ-ゟ゠-ヿ]/.test(ko), `${path} 의 한국어에 가나: ${ko}`).toBe(false);
    }
  });

  // 응모작의 팀 이름·제목·요약은 학생이 쓴 글(번역되지 않는 한 가지 언어)이에요. 일본 대회라서 샘플은 일본어로 써 두어요.
  // (한글이 섞이면 일본어 화면에서 버그처럼 보이므로, 샘플 응모작에 한글이 없는지 확인해요.)
  it("샘플 응모작은 일본어(또는 영문)로만 쓰여 있어요", () => {
    expect(state.proposals.length).toBeGreaterThanOrEqual(8);
    for (const p of state.proposals) {
      for (const [field, text] of [["teamName", p.teamName], ["title", p.title], ["summary", p.summary]] as const) {
        expect(/[가-힣]/.test(text), `${p.id}.${field} 에 한글: ${text}`).toBe(false);
      }
    }
  });

  it("모집 중 챌린지가 충분하고 마감일은 오늘 이후예요", () => {
    const open = state.challenges.filter((c) => c.status === "open");
    expect(open.length).toBeGreaterThanOrEqual(6);
    for (const c of open) expect(daysBetween(TODAY, c.closesOn), c.id).toBeGreaterThanOrEqual(0);
    for (const c of state.challenges) expect(daysBetween(c.opensOn, c.closesOn), c.id).toBeGreaterThan(0);
  });

  it("심사 중인 챌린지에 응모작이 있어요 (B2B 데모용)", () => {
    const judging = state.challenges.filter((c) => c.status === "judging");
    expect(judging).toHaveLength(1);
    expect(judging[0].companyId).toBe(DEMO_COMPANY_ID);
    const proposals = state.proposals.filter((p) => p.challengeId === judging[0].id);
    expect(proposals.length).toBeGreaterThanOrEqual(4);
    expect(proposals.some((p) => p.review !== null)).toBe(true);
    expect(proposals.some((p) => p.review === null)).toBe(true);
  });

  it("제출 파일 지문은 모두 SHA-256 형식이에요", () => {
    for (const p of state.proposals) for (const v of p.versions) expect(v.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("주인공 학생(Mina)은 1,476pt·Lv.3 이고 Lv.4 까지 24pt 남았어요", () => {
    const impact = selectImpact(state, "ja");
    expect(impact.totalPoints).toBe(1476);
    expect(impact.level).toBe(3);
    expect(impact.nextLevelLabel).toContain("24");
    expect(impact.topSdgs[0].id).toBe(14);
    const badgeCodes = impact.badges.map((b) => b.code);
    for (const code of ["firstStep", "challenger", "winner", "multiSdg", "ocean"]) expect(badgeCodes).toContain(code);
    expect(badgeCodes).not.toContain("sharer");
  });

  it("처음 추천 1위는 대표 챌린지(해양 플라스틱)예요", () => {
    expect(selectHome(state, "ja").recommended[0].id).toBe("ch-plastic");
    expect(selectHome(state, "ko").recommended[0].id).toBe("ch-plastic");
  });

  it("기업 인증마크는 처음 53점(★1)이고 증빙 하나가 모자라요", () => {
    const result = evaluateCertification(state.cert);
    expect(result.total).toBe(53);
    expect(result.level).toBe(1);
    expect(selectEsg(state, "ko").needEvidence).toBe(true);
  });

  it("오늘 날짜가 달라도 남은 날수(D-day)는 같아요", () => {
    const later = createInitialState("2027-02-14");
    state.challenges.forEach((c, i) => {
      expect(daysBetween(later.today, later.challenges[i].closesOn)).toBe(daysBetween(TODAY, c.closesOn));
    });
  });

  it("같은 날짜면 항상 같은 데이터예요", () => {
    expect(JSON.stringify(createInitialState(TODAY))).toBe(JSON.stringify(state));
  });

  it("실존하는 학교·기업 이름을 쓰지 않았어요 (샘플임을 밝혀요)", () => {
    const text = JSON.stringify(state);
    expect(text).not.toMatch(/専修|전수|早稲田|慶應|서울대|東京大学/);
    expect(text).toContain("サンプル");
  });
});
