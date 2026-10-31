import { describe, expect, it } from "vitest";
import type { CertAnswers } from "./domain";
import { CERT_CRITERIA, CERT_DISCLAIMER, clampCertValue, emptyCertAnswers, evaluateCertification } from "./certification";

const full = (): CertAnswers => ({
  ecoPackage: { value: 60, evidence: true },
  renewable: { value: 40, evidence: true },
  donation: { value: 300_000, evidence: true },
  womenManagers: { value: 30, evidence: true },
  volunteer: { value: 8, evidence: true },
  disclosure: { value: 1, evidence: true },
});

describe("SDGs 인증마크 심사", () => {
  it("배점의 합계는 100 이에요", () => {
    expect(CERT_CRITERIA.reduce((sum, c) => sum + c.weight, 0)).toBe(100);
  });

  it("아무것도 안 넣으면 0점·미인증", () => {
    const result = evaluateCertification(emptyCertAnswers());
    expect(result.total).toBe(0);
    expect(result.level).toBe(0);
    expect(result.pointsToNext).toBe(40);
    expect(result.missingEvidence).toEqual([]);
  });

  it("모두 기준 이상이고 증빙이 있으면 100점·★3", () => {
    const result = evaluateCertification(full());
    expect(result.total).toBe(100);
    expect(result.level).toBe(3);
    expect(result.pointsToNext).toBeNull();
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

  it("레벨 경계: 40점 ★1, 60점 ★2, 80점 ★3", () => {
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
    expect(at(40).total).toBe(40);
    expect(at(40).level).toBe(1);
    expect(at(60).level).toBe(2);
    expect(at(80).level).toBe(3);
  });

  it("데모 기업의 처음 상태(약 53점)에서 증빙 하나로 ★2 가 돼요", () => {
    const answers = emptyCertAnswers();
    answers.ecoPackage = { value: 35, evidence: true };
    answers.renewable = { value: 20, evidence: true };
    answers.donation = { value: 120_000, evidence: true };
    answers.womenManagers = { value: 18, evidence: false };
    answers.volunteer = { value: 4, evidence: true };
    answers.disclosure = { value: 1, evidence: true };
    const before = evaluateCertification(answers);
    expect(before.total).toBe(53);
    expect(before.level).toBe(1);
    expect(before.missingEvidence).toEqual(["womenManagers"]);
    answers.womenManagers = { value: 18, evidence: true };
    const after = evaluateCertification(answers);
    expect(after.total).toBe(62);
    expect(after.level).toBe(2);
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
