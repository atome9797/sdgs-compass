import { describe, expect, it } from "vitest";
import { evaluateCertification } from "@sdgs-compass/core/certification";
import { daysBetween } from "@sdgs-compass/core/format";
import { pick } from "@sdgs-compass/core/i18n";
import { levelOf } from "@sdgs-compass/core/impact";
import { containsContact, isOfficialChannel, nextOfficialDate, OFFICIAL_CHANNELS, POST_LIMITS } from "@sdgs-compass/core/post";
import { charCount } from "@sdgs-compass/core/proposal";
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
      history: state.history, talent: state.talent, scouts: state.scouts, matches: state.matches, posts: state.posts,
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

  it("주인공 학생(Mina)은 내부 점수 1,476·Lv.3 이고, 화면에는 Lv.4 까지의 진행률 97% 로 보여요", () => {
    const impact = selectImpact(state, "ja");
    expect(impact.totalPoints).toBe(1476);
    expect(impact.level).toBe(3);
    expect(impact.progressPercent).toBe(97);
    expect(impact.nextLevelLabel).toBe("次のLv.4への進み具合 97%");
    expect(impact.nextLevelLabel).not.toContain("pt");
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

describe("SNS 피드 샘플 글 (F-503 · F-504)", () => {
  const prs = state.posts.flatMap((p) => (p.kind === "pr" ? [p] : []));
  const brags = state.posts.flatMap((p) => (p.kind === "brag" ? [p] : []));

  it("기업 홍보 4건 + 학생 자랑 4건이고, 번호는 po-1 부터예요", () => {
    expect(state.posts.map((p) => p.id)).toEqual(["po-1", "po-2", "po-3", "po-4", "po-5", "po-6", "po-7", "po-8"]);
    expect(prs).toHaveLength(4);
    expect(brags).toHaveLength(4);
  });

  it("홍보 글: 기업이 실제로 있고, 연결한 챌린지는 그 기업의 것이에요", () => {
    const companies = new Map(state.companies.map((c) => [c.id, c]));
    for (const p of prs) {
      expect(companies.has(p.companyId), p.id).toBe(true);
      if (p.challengeId) expect(state.challenges.find((c) => c.id === p.challengeId)?.companyId, p.id).toBe(p.companyId);
    }
  });

  it("우리 회사 글은 한 건이고, 학생(나)이 쓴 자랑 글은 처음에 없어요 (발표 때 직접 올려 보여 줘요)", () => {
    expect(prs.filter((p) => p.mine).map((p) => p.companyId)).toEqual([DEMO_COMPANY_ID]);
    expect(state.posts.filter((p) => p.mine)).toHaveLength(1);
    expect(brags.some((p) => p.mine)).toBe(false);
    expect(state.posts.some((p) => p.id.startsWith("po-") && p.likedBy.length > 0)).toBe(false);
  });

  it("공식 SNS 게시 신청은 3건이고, 날짜는 모두 내일 이후이며 같은 채널에서는 겹치지 않아요 (하루에 한 회사 · 채널별)", () => {
    const shares = prs.flatMap((p) => (p.official ? [p.official] : []));
    expect(shares).toHaveLength(3);
    for (const share of shares) {
      expect(isOfficialChannel(share.channel)).toBe(true);
      expect(daysBetween(TODAY, share.on)).toBeGreaterThanOrEqual(1);
    }
    const keys = shares.map((s) => `${s.channel}|${s.on}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(prs.find((p) => p.companyId === DEMO_COMPANY_ID)?.official).toBeNull();
  });

  it("공식 SNS 게시 신청은 채널별로 흩어져 있고(X · Instagram · Facebook 하나씩), 같은 날 다른 채널이 함께 있어요", () => {
    const shares = prs.flatMap((p) => (p.official ? [p.official] : []));
    expect(shares.map((s) => s.channel).sort()).toEqual([...OFFICIAL_CHANNELS].sort());
    const byDay = new Map<string, string[]>();
    for (const s of shares) byDay.set(s.on, [...(byDay.get(s.on) ?? []), s.channel]);
    expect([...byDay.values()].some((channels) => channels.length >= 2)).toBe(true);
  });

  it("우리 회사가 지금 신청하면 채널마다 배정되는 날짜가 달라요 (X 는 내일, Instagram·Facebook 은 모레)", () => {
    expect(OFFICIAL_CHANNELS.map((channel) => [channel, daysBetween(TODAY, nextOfficialDate(state.posts, TODAY, channel))])).toEqual([
      ["x", 1], ["instagram", 2], ["facebook", 2],
    ]);
    // 채널을 말하지 않으면 Instagram (옛 호출 그대로)
    expect(nextOfficialDate(state.posts, TODAY)).toBe(nextOfficialDate(state.posts, TODAY, "instagram"));
  });

  it("자랑 글: 닉네임·레벨·실적만 있고, 샘플 학생과 레벨이 맞아요 (이메일·학교 이름 없음)", () => {
    for (const p of brags) {
      const candidate = state.talent.find((c) => c.nickname === p.authorName);
      expect(candidate, p.id).toBeDefined();
      expect(p.authorLevel, p.id).toBe(levelOf(candidate!.points));
      expect(p.achievement.activityId, p.id).toBeNull(); // 다른 학생의 실적이라 내 활동 기록에는 없어요
      expect(p.sdgIds, p.id).toEqual(p.achievement.sdgIds.slice(0, 3));
      expect(JSON.stringify(p)).not.toMatch(/大学|대학교|@/);
    }
  });

  it("글자 수·SDGs 태그가 규칙을 지키고, 연락처 같은 글자가 없어요 (두 언어 모두)", () => {
    for (const p of state.posts) {
      expect(p.sdgIds.length, p.id).toBeGreaterThanOrEqual(1);
      expect(p.sdgIds.length, p.id).toBeLessThanOrEqual(POST_LIMITS.maxSdgs);
      expect(p.likes, p.id).toBeGreaterThanOrEqual(p.likedBy.length);
      for (const locale of ["ja", "ko"] as const) {
        const body = pick(p.body, locale);
        expect(charCount(body), `${p.id} ${locale} 본문`).toBeLessThanOrEqual(p.kind === "brag" ? POST_LIMITS.bragBody : POST_LIMITS.prBody);
        expect(containsContact(body), `${p.id} ${locale} 본문`).toBe(false);
        if (p.kind === "pr") {
          const title = pick(p.title, locale);
          expect(charCount(title), `${p.id} ${locale} 제목`).toBeLessThanOrEqual(POST_LIMITS.prTitle);
          expect(containsContact(title), `${p.id} ${locale} 제목`).toBe(false);
        }
      }
    }
  });

  it("글은 모두 과거 시각이고 오늘 기준 상대 날짜예요", () => {
    for (const p of state.posts) {
      expect(p.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
      expect(daysBetween(TODAY, p.createdAt.slice(0, 10)), p.id).toBeLessThan(0);
    }
  });
});
