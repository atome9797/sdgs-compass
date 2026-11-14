import { describe, expect, it } from "vitest";
import { makeUsageState } from "./adminFixtures";
import type { Activity, DemoState, HeroSkill } from "./domain";
import { awardActivityId } from "./activities";
import { heroSkillVM, selectSdgSkills, selectSkills } from "./selectors";
import { AWARD_STARS, isAwardActivity, sdgSkills, skillFromAward, skillIdFor, skillLevel, skillMatches, skillSdgIds, sortSkills, syncSkills } from "./skills";

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

describe("스킬(#38 · #45): 수상 1건 = 기록 1개 → 퀘스트의 SDG 마다 스킬, 같은 SDG 의 수상이 쌓이면 레벨이 올라요", () => {
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

  it("수상 기록의 화면 모델: 대표 SDG(첫 번째)의 색 · ★ · 이 수상으로 얻은 SDG 스킬 (일본어 · 한국어)", () => {
    const skill = skillFromAward(award("h-1", "2026-10-17") as Activity & { kind: "award"; award: "excellence" }, { ja: "エコ包装デザイン", ko: "친환경 포장 디자인" });
    const ja = heroSkillVM(skill, "ja");
    expect(ja).toMatchObject({ name: "エコ包装デザイン", sdgId: 14, color: "#0A97D9", awardLabel: "優秀賞", stars: 2 });
    expect(ja.metaLabel).toBe("優秀賞・みなと株式会社・2026年10月17日");
    // SDG 가 2개인 퀘스트의 수상 → 두 SDG 의 스킬을 모두 얻어요
    expect(ja.learnedLines).toEqual(["SDG 14・12のスキルをおぼえた！"]);
    expect(ja.learnedLabel).toBe("SDG 14・12のスキルをおぼえた！");
    expect(ja.ariaLabel).toBe("受賞「エコ包装デザイン」、優秀賞、SDG 14・12のスキル");
    const ko = heroSkillVM(skill, "ko");
    expect(ko.learnedLabel).toBe("SDG 14, 12 스킬을 배웠다!");
    expect(selectSkills({ skills: [skill] }, "ko")[0].name).toBe("친환경 포장 디자인");
  });

  it("같은 SDG 의 수상이 쌓이면 그 SDG 의 스킬 레벨이 올라요 (레벨 = 그 SDG 가 붙은 수상의 수)", () => {
    const first = skillFromAward(award("a", "2026-09-01", { sdgIds: [14, 12] }) as Activity & { kind: "award"; award: "excellence" }, { ja: "プラごみ削減アイデア", ko: "플라스틱 쓰레기 감축 아이디어" });
    const second = skillFromAward(award("b", "2026-10-20", { sdgIds: [14, 13], award: "grand" }) as Activity & { kind: "award"; award: "grand" }, { ja: "エコ包装デザイン", ko: "친환경 포장 디자인" });
    const all = [first, second];
    expect(skillLevel(all, 14)).toBe(2);
    expect(skillLevel(all, 12)).toBe(1);
    expect(skillLevel(all, 7)).toBe(0);
    // 그날까지 받은 상만: 첫 수상 때 14 는 Lv.1
    expect(skillLevel(all, 14, "2026-09-30")).toBe(1);
    expect(sdgSkills(all).map((entry) => [entry.sdgId, entry.level, entry.records.map((r) => r.activityId)])).toEqual([
      [14, 2, ["b", "a"]],
      [13, 1, ["b"]],
      [12, 1, ["a"]],
    ]);
    // 두 번째 수상: 13 은 처음(おぼえた), 14 는 레벨 업 — 첫 수상의 문구는 그때 그대로(Lv.1)
    expect(heroSkillVM(second, "ja", all).learnedLines).toEqual(["SDG 13のスキルをおぼえた！", "SDG 14のスキルがレベルアップ！（Lv.2）"]);
    expect(heroSkillVM(second, "ko", all).learnedLines).toEqual(["SDG 13 스킬을 배웠다!", "SDG 14 스킬 레벨 업! Lv.2"]);
    expect(heroSkillVM(first, "ja", all).learnedLines).toEqual(["SDG 14・12のスキルをおぼえた！"]);
    const vms = selectSdgSkills({ skills: all }, "ja");
    expect(vms[0]).toMatchObject({
      sdgId: 14,
      goal: "海の豊かさを守ろう",
      level: 2,
      levelLabel: "スキルLv.2",
      countLabel: "受賞 2件",
      recordsLabel: "エコ包装デザイン・プラごみ削減アイデア",
      effect: "wave",
      ariaLabel: "SDG 14 海の豊かさを守ろうのスキル、レベル2、受賞2件",
    });
    expect(selectSdgSkills({ skills: all }, "ko")[0]).toMatchObject({ levelLabel: "스킬 Lv.2", countLabel: "수상 2건", ariaLabel: "SDG 14 해양 생태계 보전 스킬, 레벨 2, 수상 2건" });
  });
});
