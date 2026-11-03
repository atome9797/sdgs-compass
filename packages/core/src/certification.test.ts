import { describe, expect, it } from "vitest";
import type { CertAnswers } from "./domain";
import {
  CERT_CRITERIA, CERT_DISCLAIMER, CERT_MAX_STARS, CERT_POINTS_PER_STAR_STEP, CERT_STAR_STEP, certNextStar, certStarIcons, certStarsOf, clampCertValue, emptyCertAnswers,
  evaluateCertification, formatStars,
} from "./certification";

const full = (): CertAnswers => ({
  ecoPackage: { value: 60, evidence: true },
  renewable: { value: 40, evidence: true },
  donation: { value: 300_000, evidence: true },
  womenManagers: { value: 30, evidence: true },
  volunteer: { value: 8, evidence: true },
  disclosure: { value: 1, evidence: true },
});

describe("SDGs 실천 마크 심사 (★5 만점 · 0.5 단위, #35)", () => {
  it("배점의 합계는 100 이에요", () => {
    expect(CERT_CRITERIA.reduce((sum, c) => sum + c.weight, 0)).toBe(100);
  });

  it("아무것도 안 넣으면 0점·未取得(별 0), 다음 ★0.5 까지 10점", () => {
    const result = evaluateCertification(emptyCertAnswers());
    expect(result.total).toBe(0);
    expect(result.stars).toBe(0);
    expect(result.nextStars).toBe(0.5);
    expect(result.pointsToNext).toBe(10);
    expect(result.missingEvidence).toEqual([]);
  });

  it("모두 기준 이상이고 증빙이 있으면 100점·★5.0 (다음 별 없음)", () => {
    const result = evaluateCertification(full());
    expect(result.total).toBe(100);
    expect(result.stars).toBe(5);
    expect(result.pointsToNext).toBeNull();
    expect(result.nextStars).toBeNull();
    expect(result.byCategory).toEqual({ E: 100, S: 100, G: 100 });
  });

  it("기준을 넘겨도 만점을 넘지 않아요", () => {
    const answers = full();
    answers.ecoPackage = { value: 100, evidence: true };
    expect(evaluateCertification(answers).total).toBe(100);
  });

  it("증빙이 없으면 점수에 넣지 않고 안내해요", () => {
    const answers = full();
    answers.womenManagers = { value: 30, evidence: false };
    const result = evaluateCertification(answers);
    expect(result.total).toBe(85);
    expect(result.missingEvidence).toEqual(["womenManagers"]);
    expect(result.items.find((i) => i.id === "womenManagers")?.points).toBe(0);
  });

  it("기준값의 일부만 채우면 비례해서 얻어요", () => {
    const answers = emptyCertAnswers();
    answers.ecoPackage = { value: 30, evidence: true };
    const result = evaluateCertification(answers);
    expect(result.items.find((i) => i.id === "ecoPackage")?.points).toBe(10);
    expect(result.total).toBe(10);
  });

  it("별 규칙(#35): 상수 — 10점마다 ★0.5, 만점 ★5.0", () => {
    expect(CERT_POINTS_PER_STAR_STEP).toBe(10);
    expect(CERT_STAR_STEP).toBe(0.5);
    expect(CERT_MAX_STARS).toBe(5);
  });

  it("별 수 = floor(달성도 ÷ 10) × 0.5 — 0~100점 모두, 10점 미만은 未取得(0)", () => {
    for (let score = 0; score <= 100; score++) expect(certStarsOf(score), `${score}점`).toBe(Math.floor(score / 10) * 0.5);
    expect([0, 9, 10, 19, 20, 45, 53, 62, 99, 100].map(certStarsOf)).toEqual([0, 0, 0.5, 0.5, 1, 2, 2.5, 3, 4.5, 5]);
    // 범위 밖·숫자가 아닌 값: 0 미만·NaN 은 0, 100 을 넘어도 ★5.0 까지
    expect([-5, Number.NaN, Number.POSITIVE_INFINITY, 150, 9.99].map(certStarsOf)).toEqual([0, 0, 0, 5, 0]);
  });

  it("다음 별(반 개 위)까지 남은 점수 — ★5.0 이면 없음", () => {
    expect(certNextStar(0)).toEqual({ stars: 0.5, points: 10 });
    expect(certNextStar(9)).toEqual({ stars: 0.5, points: 1 });
    expect(certNextStar(10)).toEqual({ stars: 1, points: 10 });
    expect(certNextStar(53)).toEqual({ stars: 3, points: 7 });
    expect(certNextStar(94)).toEqual({ stars: 5, points: 6 });
    expect(certNextStar(99)).toEqual({ stars: 5, points: 1 });
    expect(certNextStar(100)).toBeNull();
    // 0~99점 어디서든 남은 점수는 1~10점이고, 다음 별은 지금보다 정확히 반 개 위예요
    for (let score = 0; score < 100; score++) {
      const next = certNextStar(score)!;
      expect(next.stars).toBe(certStarsOf(score) + 0.5);
      expect(next.points >= 1 && next.points <= 10, `${score}점`).toBe(true);
      expect(certStarsOf(score + next.points)).toBe(next.stars);
      expect(certStarsOf(score + next.points - 1)).toBe(certStarsOf(score));
    }
  });

  it("별 그림 5칸: 가득·반·빈 (2.5 → ★★⯨☆☆)", () => {
    expect(certStarIcons(0)).toEqual(["empty", "empty", "empty", "empty", "empty"]);
    expect(certStarIcons(0.5)).toEqual(["half", "empty", "empty", "empty", "empty"]);
    expect(certStarIcons(2.5)).toEqual(["full", "full", "half", "empty", "empty"]);
    expect(certStarIcons(4)).toEqual(["full", "full", "full", "full", "empty"]);
    expect(certStarIcons(4.5)).toEqual(["full", "full", "full", "full", "half"]);
    expect(certStarIcons(5)).toEqual(["full", "full", "full", "full", "full"]);
    for (let score = 0; score <= 100; score += 10) {
      const icons = certStarIcons(certStarsOf(score));
      expect(icons).toHaveLength(5);
      expect(icons.filter((i) => i === "full").length + icons.filter((i) => i === "half").length * 0.5).toBe(certStarsOf(score));
    }
  });

  it("별 수 글자는 늘 소수 첫째 자리까지 (★3 과 ★3.0 이 섞이지 않게)", () => {
    expect([0.5, 2.5, 3, 5].map(formatStars)).toEqual(["0.5", "2.5", "3.0", "5.0"]);
  });

  it("평가 결과의 경계: 40점 ★2.0, 63점 ★3.0, 85점 ★4.0", () => {
    const at = (points: number) => {
      const answers = emptyCertAnswers();
      // 거버넌스 20점(공개) + 환경 20점(친환경 포장 만점) = 40
      answers.disclosure = { value: 1, evidence: true };
      answers.ecoPackage = { value: 60, evidence: true };
      if (points >= 60) answers.renewable = { value: 40, evidence: true }; // +15 = 55
      if (points >= 60) answers.volunteer = { value: 4, evidence: true }; // +7.5 = 62.5 → 63
      if (points >= 80) answers.womenManagers = { value: 30, evidence: true }; // +15 = 77.5
      if (points >= 80) answers.volunteer = { value: 8, evidence: true }; // +7.5 → 85
      return evaluateCertification(answers);
    };
    expect([at(40).total, at(40).stars, at(40).pointsToNext]).toEqual([40, 2, 10]);
    expect([at(60).total, at(60).stars, at(60).pointsToNext]).toEqual([63, 3, 7]);
    expect([at(80).total, at(80).stars, at(80).pointsToNext]).toEqual([85, 4, 5]);
  });

  it("데모 기업의 처음 상태(53점 ★2.5)에서 증빙 하나로 ★3.0 이 돼요", () => {
    const answers = emptyCertAnswers();
    answers.ecoPackage = { value: 35, evidence: true };
    answers.renewable = { value: 20, evidence: true };
    answers.donation = { value: 120_000, evidence: true };
    answers.womenManagers = { value: 18, evidence: false };
    answers.volunteer = { value: 4, evidence: true };
    answers.disclosure = { value: 1, evidence: true };
    const before = evaluateCertification(answers);
    expect(before.total).toBe(53);
    expect(before.stars).toBe(2.5);
    expect([before.nextStars, before.pointsToNext]).toEqual([3, 7]);
    expect(before.missingEvidence).toEqual(["womenManagers"]);
    answers.womenManagers = { value: 18, evidence: true };
    const after = evaluateCertification(answers);
    expect(after.total).toBe(62);
    expect(after.stars).toBe(3);
    expect([after.nextStars, after.pointsToNext]).toEqual([3.5, 8]);
  });

  it("입력값 정리", () => {
    expect(clampCertValue("ecoPackage", -5)).toBe(0);
    expect(clampCertValue("ecoPackage", 150)).toBe(100);
    expect(clampCertValue("ecoPackage", 33.6)).toBe(34);
    expect(clampCertValue("ecoPackage", Number.NaN)).toBe(0);
    expect(clampCertValue("disclosure", 5)).toBe(1);
    expect(clampCertValue("donation", 5_000_000)).toBe(5_000_000);
  });

  it("면책 문구는 두 언어 모두 '독자 기준이고 국가·자치체·UN 의 인증이 아님'을 밝혀요 (#19)", () => {
    expect(CERT_DISCLAIMER.ja).toContain("独自の目安");
    expect(CERT_DISCLAIMER.ja).toContain("国・自治体・国連の認証ではありません");
    expect(CERT_DISCLAIMER.ko).toContain("자체 기준");
    expect(CERT_DISCLAIMER.ko).toContain("국가·지자체·유엔의 인증이 아니에요");
    // 화면 표기는 「取組みマーク」「실천 마크」 — 옛 이름 「認証マーク」「인증마크」로 돌아가지 않게
    expect(CERT_DISCLAIMER.ja).toContain("取組みマーク");
    expect(CERT_DISCLAIMER.ja).not.toContain("認証マーク");
    expect(CERT_DISCLAIMER.ko).toContain("실천 마크");
    expect(CERT_DISCLAIMER.ko).not.toContain("인증마크");
  });
});
