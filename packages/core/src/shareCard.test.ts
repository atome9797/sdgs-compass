import { describe, expect, it } from "vitest";
import type { Activity } from "./domain";
import { computeImpactIndex } from "./impact";
import { buildShareCard, CARD_ASPECT, CARD_TEMPLATES } from "./shareCard";

const award: Activity = {
  id: "a1", kind: "award", award: "excellence",
  title: { ja: "再エネ啓発動画コンテスト", ko: "재생에너지 계몽 영상 콘테스트" },
  companyName: { ja: "ひかりエナジー株式会社", ko: "히카리 에너지(주)" },
  sdgIds: [7, 13], date: "2026-08-31", points: 300,
};
const submission: Activity = { ...award, id: "a2", kind: "submission", award: undefined, points: 215 };

describe("1-Click 카드뉴스", () => {
  const index = computeImpactIndex([award, submission]);
  const input = { nickname: "Mina", index, participationCount: 5, awardCount: 2 } as const;

  it("규격: Instagram 1:1, LinkedIn 1.91:1", () => {
    expect(CARD_TEMPLATES).toEqual(["instagram", "linkedin"]);
    expect(CARD_ASPECT).toEqual({ instagram: 1, linkedin: 1.91 });
    expect(buildShareCard({ ...input, activity: award, template: "linkedin", locale: "ja" }).aspect).toBe(1.91);
  });

  it("수상 카드: 언어별 제목·기업·수상이 들어가요", () => {
    const ja = buildShareCard({ ...input, activity: award, template: "instagram", locale: "ja" });
    const ko = buildShareCard({ ...input, activity: award, template: "instagram", locale: "ko" });
    expect(ja.title).toBe("再エネ啓発動画コンテスト");
    expect(ko.title).toBe("재생에너지 계몽 영상 콘테스트");
    expect(ja.subtitle).toContain("ひかりエナジー株式会社");
    expect(ko.subtitle).toContain("히카리 에너지(주)");
    expect(ja.headline).toContain("Mina");
    expect(ja.headline).not.toBe(ko.headline);
    expect(ja.sdgIds).toEqual([7, 13]);
  });

  it("해시태그에 SDGs 번호가 들어가고 캡션에 챌린지 이름이 들어가요", () => {
    const card = buildShareCard({ ...input, activity: award, template: "instagram", locale: "ko" });
    expect(card.hashtags).toContain("#SDGs7");
    expect(card.hashtags).toContain("#SDGs13");
    expect(card.caption).toContain("재생에너지 계몽 영상 콘테스트");
    expect(card.caption).toContain("#SDGs7");
  });

  it("통계 3가지(포인트·참가·수상)", () => {
    const card = buildShareCard({ ...input, activity: submission, template: "instagram", locale: "ja" });
    expect(card.stats).toHaveLength(3);
    expect(card.stats[0].value).toBe("515 pt");
    expect(card.stats[1].value).toBe("5");
    expect(card.stats[2].value).toBe("2");
  });

  it("개인정보: 닉네임과 성과만 넣어요 (학교·이메일 등은 없음)", () => {
    const card = buildShareCard({ ...input, activity: award, template: "linkedin", locale: "ja" });
    const all = JSON.stringify(card);
    expect(all).not.toMatch(/@|大学|대학|univ/i);
  });

  it("참가 카드는 수상 문구가 없어요", () => {
    const card = buildShareCard({ ...input, activity: submission, template: "instagram", locale: "ja" });
    expect(card.subtitle).toBe("ひかりエナジー株式会社");
  });
});
