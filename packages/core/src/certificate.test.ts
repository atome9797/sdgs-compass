import { describe, expect, it } from "vitest";
import type { Activity } from "./domain";
import { certificateFromActivity, certificatePayload, issueCertificate, qrPayload, verifyCertificate, verifyCode } from "./certificate";

const base = {
  id: "SC-C-0001",
  kind: "award" as const,
  holder: "Mina",
  challengeTitle: { ja: "再エネ啓発動画コンテスト", ko: "재생에너지 계몽 영상 콘테스트" },
  companyName: { ja: "ひかりエナジー株式会社", ko: "히카리 에너지(주)" },
  award: "excellence" as const,
  sdgIds: [7, 13] as (7 | 13)[],
  points: 300,
  issuedOn: "2026-08-31",
};

describe("디지털 증명서", () => {
  it("발급한 증명서는 검증을 통과해요", () => {
    const cert = issueCertificate(base);
    expect(cert.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(verifyCertificate(cert)).toBe(true);
  });

  it("내용을 한 군데라도 바꾸면 검증에 실패해요", () => {
    const cert = issueCertificate(base);
    expect(verifyCertificate({ ...cert, points: 301 })).toBe(false);
    expect(verifyCertificate({ ...cert, holder: "Someone" })).toBe(false);
    expect(verifyCertificate({ ...cert, award: "grand" })).toBe(false);
    expect(verifyCertificate({ ...cert, issuedOn: "2026-09-01" })).toBe(false);
    expect(verifyCertificate({ ...cert, sdgIds: [7] })).toBe(false);
    expect(verifyCertificate({ ...cert, hash: cert.hash.replace(/.$/, cert.hash.endsWith("0") ? "1" : "0") })).toBe(false);
  });

  it("해시는 언어와 상관없이 같아요 (문구는 일본어 기준으로 적어요)", () => {
    const withKo = issueCertificate({ ...base, challengeTitle: { ja: "再エネ啓発動画コンテスト", ko: "다른 한국어 표현" } });
    expect(withKo.hash).toBe(issueCertificate(base).hash);
  });

  it("확인 코드와 QR 문구", () => {
    const cert = issueCertificate(base);
    expect(verifyCode(cert.hash)).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
    expect(verifyCode(cert.hash).replaceAll("-", "").toLowerCase()).toBe(cert.hash.slice(0, 12));
    expect(qrPayload(cert)).toBe(`SDGS-COMPASS|SC-C-0001|${cert.hash.slice(0, 32)}`);
  });

  it("payload 는 같은 입력이면 항상 같아요", () => {
    expect(certificatePayload(base)).toBe(certificatePayload({ ...base }));
    expect(certificatePayload(base)).toContain("SDGS-COMPASS-CERT/1");
  });

  it("활동에서 증명서를 만들어요 (공유는 제외)", () => {
    const activity: Activity = { id: "a", kind: "award", title: base.challengeTitle, companyName: base.companyName, sdgIds: [7, 13], date: "2026-08-31T10:00", points: 300, award: "excellence" };
    const award = certificateFromActivity(activity, "Mina", 0);
    expect(award?.kind).toBe("award");
    expect(award?.id).toBe("SC-C-0001");
    expect(award?.issuedOn).toBe("2026-08-31");
    expect(award && verifyCertificate(award)).toBe(true);
    const participation = certificateFromActivity({ ...activity, kind: "submission", award: undefined }, "Mina", 11);
    expect(participation?.kind).toBe("participation");
    expect(participation?.award).toBeNull();
    expect(participation?.id).toBe("SC-C-0012");
    expect(certificateFromActivity({ ...activity, kind: "share" }, "Mina", 0)).toBeNull();
  });
});
