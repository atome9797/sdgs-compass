// #48 피드 = 용사의 업적을 전하는 「SDGs冒険新聞」: 제호 · 기사(헤드라인 · 기업과 퀘스트 · 수상은 동상) · 광고 칸(언제나 「広告（PR）」)
import { describe, expect, it } from "vitest";
import { selectComposer, selectFeed } from "@sdgs-compass/core/selectors";
import { reducer } from "@sdgs-compass/core/state";
import { createInitialState } from "./seed";

const state = createInitialState("2026-10-30");

describe("SDGs冒険新聞 (#48)", () => {
  it("제호: 이름 · 한 줄 소개 · 날짜 · 호수(2026-04-01 이 제1호)", () => {
    expect(selectFeed(state, "ja", "b2c").masthead).toEqual({ title: "SDGs冒険新聞", tagline: "勇者たちの業績をお届けします", dateLabel: "2026年10月30日", issueLabel: "第213号" });
    expect(selectFeed(state, "ko", "b2b").masthead).toMatchObject({ title: "SDGs 모험 신문", tagline: "용사들의 업적을 전해요", issueLabel: "제213호" });
    expect(selectFeed(createInitialState("2026-04-01"), "ja", "b2c").masthead.issueLabel).toBe("第1号");
  });

  it("수상 기사: 헤드라인 · 기업과 퀘스트 · 상에 따른 동상과 명판", () => {
    const posts = selectFeed(state, "ja", "b2c").posts;
    const yuna = posts.find((p) => p.id === "po-5")!;
    expect(yuna).toMatchObject({ kicker: "勇者の業績", headline: "勇者Yuna、優秀賞に輝く！", subhead: "みなと海洋フーズ株式会社の「漁港清掃の参加者を増やすポスター企画」" });
    expect(yuna.statue).toEqual({ award: "excellence", caption: "英雄の像", plaque: ["優秀賞", "漁港清掃の参加者を増やすポスター企画", "みなと海洋フーズ株式会社"], ariaLabel: "勇者Yunaの像（優秀賞）" });
    expect(posts.find((p) => p.id === "po-6")!.statue?.award).toBe("grand");
    const ko = selectFeed(state, "ko", "b2c").posts.find((p) => p.id === "po-6")!;
    expect(ko).toMatchObject({ kicker: "용사의 업적", headline: "용사 Daichi, 최우수상 수상!" });
    expect(ko.statue?.ariaLabel).toBe("용사 Daichi의 동상(최우수상)");
  });

  it("도전 · 참가 기사는 동상 없이, 광고 칸은 언제나 「広告（PR）」에 제목이 헤드라인", () => {
    const posts = selectFeed(state, "ja", "b2c").posts;
    expect(posts.find((p) => p.id === "po-7")).toMatchObject({ headline: "勇者Mei、クエストに挑戦", statue: null });
    expect(posts.find((p) => p.id === "po-8")).toMatchObject({ headline: "勇者Soyeon、クエストに参加", statue: null });
    for (const ad of posts.filter((p) => p.kind === "pr")) {
      expect(ad).toMatchObject({ kicker: "広告（PR）", headline: ad.title, subhead: null, statue: null });
    }
    expect(selectFeed(state, "ko", "b2b").posts.filter((p) => p.kind === "pr").every((p) => p.kicker === "광고(PR)")).toBe(true);
  });

  it("글쓰기의 실적마다 기사의 머리: 그 실적으로 올리면 피드에 뜨는 기사와 같아요(앱 미리보기가 써요)", () => {
    for (const locale of ["ja", "ko"] as const) {
      const composer = selectComposer(state, locale, "brag");
      expect(composer.activities.length).toBeGreaterThan(0);
      for (const activity of composer.activities) {
        const id = `po${state.seq}`;
        const next = reducer(state, { type: "createPost", draft: { kind: "brag", body: "よろしく", activityId: activity.id }, at: "2026-10-30T12:00" });
        const posted = selectFeed(next, locale, "b2c").posts.find((p) => p.id === id)!;
        expect(activity.article).toEqual({ kicker: posted.kicker, headline: posted.headline, subhead: posted.subhead, statue: posted.statue });
      }
    }
    const awarded = selectComposer(state, "ja", "brag").activities.find((a) => a.label.startsWith("🏆"))!;
    expect(awarded.article.statue).not.toBeNull();
    expect(awarded.article.headline).toMatch(/^勇者Mina、.+に輝く！$/);
  });

  it("칸 이름: 전체 · 기업의 광고 · 용사의 업적", () => {
    expect(selectFeed(state, "ja", "b2c").filters.map((f) => f.label)).toEqual(["すべて", "企業の広告（PR）", "勇者の業績"]);
  });
});
