import { describe, expect, it } from "vitest";
import { makeUsageState } from "./adminFixtures";
import type { Activity, DemoState, HeroSkill } from "./domain";
import { awardActivityId } from "./activities";
import { heroSkillVM, selectSkills } from "./selectors";
import { AWARD_STARS, isAwardActivity, skillFromAward, skillIdFor, skillMatches, skillSdgIds, sortSkills, syncSkills } from "./skills";

const award = (id: string, date: string, overrides: Partial<Activity> = {}): Activity => ({
  id,
  kind: "award",
  award: "excellence",
  title: { ja: "海のクエスト", ko: "바다 퀘스트" },
  companyName: { ja: "みなと株式会社", ko: "미나토(주)" },
  sdgIds: [14, 12],
  date,
  points: 300,
  ...overrides,
});

/** makeUsageState 에 「내 기획서 p3(chC)가 우수상」을 더한 상태 — 활동 기록 h3(優秀賞)과 합쳐 내 수상은 2건 */
function stateWithMyAward(): DemoState {
  const base = makeUsageState();
  return { ...base, proposals: base.proposals.map((p) => (p.id === "p3" ? { ...p, award: "excellence" as const, status: "awarded" as const } : p)) };
}

describe("스킬(#38): 수상 1건 = SDG 번호가 붙은 스킬 1개", () => {
  it("수상 기록을 그대로 적어 둔 스냅샷이에요 (스킬 이름이 없으면 퀘스트 이름)", () => {
    const activity = award("h-9", "2026-09-01");
    if (!isAwardActivity(activity)) throw new Error("award");
    const skill = skillFromAward(activity);
    expect(skill).toEqual({
      id: "skill-h-9",
      name: { ja: "海のクエスト", ko: "바다 퀘스트" },
      sdgIds: [14, 12],
      award: "excellence",
      questTitle: { ja: "海のクエスト", ko: "바다 퀘스트" },
      companyName: { ja: "みなと株式会社", ko: "미나토(주)" },
      learnedOn: "2026-09-01",
      activityId: "h-9",
    });
    expect(skillFromAward(activity, { ja: "海の知恵", ko: "바다의 지혜" }).name).toEqual({ ja: "海の知恵", ko: "바다의 지혜" });
    expect(skillIdFor("h-9")).toBe(skill.id);
    // 참가 · 제출은 스킬이 되지 않아요
    expect(isAwardActivity({ ...activity, kind: "submission", award: undefined })).toBe(false);
  });

  it("syncSkills: 스킬이 없는 수상에만 스킬을 만들고, 바뀐 것이 없으면 같은 상태를 돌려줘요", () => {
    const base = stateWithMyAward();
    const synced = syncSkills(base);
    const ids = synced.skills.map((s) => s.activityId).sort();
    // 다른 학생의 수상(p4)은 내 스킬이 아니에요
    expect(ids).toEqual(["h3", awardActivityId("p3")].sort());
    expect(syncSkills(synced)).toBe(synced);
    // 기획서의 수상이면 기획서 id 와 퀘스트의 스킬 이름을 써요 (SDG 번호는 퀘스트의 것)
    const withName: DemoState = { ...base, challenges: base.challenges.map((c) => (c.id === "chC" ? { ...c, skillName: { ja: "まちの知恵", ko: "마을의 지혜" } } : c)) };
    const fromProposal = syncSkills(withName).skills.find((s) => s.proposalId === "p3")!;
    expect(fromProposal).toMatchObject({ name: { ja: "まちの知恵", ko: "마을의 지혜" }, sdgIds: [12], award: "excellence" });
  });

  it("syncSkills: 같은 수상의 상이 바뀌면 그 스킬의 상만 고쳐요 (이름 · 날짜는 처음 그대로)", () => {
    const synced = syncSkills(stateWithMyAward());
    const changed = { ...synced, proposals: synced.proposals.map((p) => (p.id === "p3" ? { ...p, award: "grand" as const } : p)) };
    const after = syncSkills(changed);
    const before = synced.skills.find((s) => s.proposalId === "p3")!;
    const now = after.skills.find((s) => s.proposalId === "p3")!;
    expect(now).toEqual({ ...before, award: "grand" });
    expect(after.skills).toHaveLength(synced.skills.length);
  });

  it("보이는 순서: 최근 것부터, 같은 날이면 상이 큰 것부터", () => {
    const make = (id: string, learnedOn: string, kind: HeroSkill["award"]): HeroSkill => ({ ...skillFromAward(award(id, learnedOn, { award: kind }) as Activity & { kind: "award"; award: HeroSkill["award"] }) });
    const list = [make("a", "2026-09-01", "special"), make("b", "2026-10-01", "special"), make("c", "2026-10-01", "grand")];
    expect(sortSkills(list).map((s) => s.activityId)).toEqual(["c", "b", "a"]);
    expect(AWARD_STARS).toEqual({ grand: 3, excellence: 2, special: 1 });
  });

  it("상성: 스킬의 SDG 가 퀘스트의 SDG 와 하나라도 겹치면 true · 가진 SDG 번호는 겹치지 않게", () => {
    const a = skillFromAward(award("a", "2026-10-02", { sdgIds: [14, 12] }) as Activity & { kind: "award"; award: "excellence" });
    const b = skillFromAward(award("b", "2026-09-01", { sdgIds: [11, 14] }) as Activity & { kind: "award"; award: "excellence" });
    expect(skillMatches(a, [12, 2])).toBe(true);
    expect(skillMatches(a, [7, 13])).toBe(false);
    expect(skillSdgIds([b, a])).toEqual([14, 12, 11]);
  });

  it("화면 모델: 대표 SDG(첫 번째)의 색 · ★ · 「おぼえた！」 문구 (일본어 · 한국어)", () => {
    const skill = skillFromAward(award("h-1", "2026-10-17") as Activity & { kind: "award"; award: "excellence" }, { ja: "エコ包装デザイン", ko: "친환경 포장 디자인" });
    const ja = heroSkillVM(skill, "ja");
    expect(ja).toMatchObject({ name: "エコ包装デザイン", sdgId: 14, color: "#0A97D9", awardLabel: "優秀賞", stars: 2 });
    expect(ja.metaLabel).toBe("優秀賞・みなと株式会社・2026年10月17日");
    expect(ja.learnedLabel).toBe("スキル「エコ包装デザイン」（SDG 14）をおぼえた！");
    expect(ja.ariaLabel).toBe("スキル「エコ包装デザイン」、SDG 14・12、優秀賞");
    const ko = heroSkillVM(skill, "ko");
    expect(ko.learnedLabel).toBe("스킬 「친환경 포장 디자인」(SDG 14)을 배웠다!");
    expect(selectSkills({ skills: [skill] }, "ko")[0].name).toBe("친환경 포장 디자인");
  });
});
