import { describe, expect, it } from "vitest";
import { PARTNER_BANNERS } from "./partners";
import { SDG_IDS } from "./sdg";
import { selectPartnerBanners } from "./selectors";

function luminance(hex: string): number {
  const channel = (start: number) => {
    const v = parseInt(hex.slice(start, start + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}
const contrastWithWhite = (hex: string) => 1.05 / (luminance(hex) + 0.05);

describe("첫 화면의 협력 단체 배너 (샘플)", () => {
  it("두 장 이상이고, id 가 겹치지 않아요 (저절로 넘어가는 배너)", () => {
    expect(PARTNER_BANNERS.length).toBeGreaterThanOrEqual(2);
    expect(new Set(PARTNER_BANNERS.map((p) => p.id)).size).toBe(PARTNER_BANNERS.length);
  });

  it("모든 문구에 일본어·한국어가 있고, 일본어에 한글·한국어에 가나가 섞이지 않아요", () => {
    for (const p of PARTNER_BANNERS) {
      for (const text of [p.name, p.kind, p.headline, p.body]) {
        expect(text.ja.trim().length > 0 && text.ko.trim().length > 0, p.id).toBe(true);
        expect(/[가-힣]/.test(text.ja), `${p.id} ja`).toBe(false);
        expect(/[ぁ-ヿ]/.test(text.ko), `${p.id} ko`).toBe(false);
      }
    }
  });

  it("바탕색은 #RRGGBB 이고, 위의 흰 글자와 대비 4.5:1 이상 (WCAG AA)", () => {
    for (const p of PARTNER_BANNERS) {
      expect(p.accent, p.id).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(contrastWithWhite(p.accent), p.id).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("SDGs 목표는 1〜17 중에서 하나 이상", () => {
    for (const p of PARTNER_BANNERS) {
      expect(p.sdgIds.length, p.id).toBeGreaterThan(0);
      for (const id of p.sdgIds) expect(SDG_IDS.includes(id), `${p.id} ${id}`).toBe(true);
    }
  });

  it("지금은 모두 가상의 샘플이에요 — 실제 단체는 앱(공개 웹) 게재 허락을 받은 뒤에만 넣어요", () => {
    expect(PARTNER_BANNERS.every((p) => p.sample)).toBe(true);
  });

  it("selectPartnerBanners: 지금 언어의 글로 바꿔요", () => {
    const ja = selectPartnerBanners("ja");
    const ko = selectPartnerBanners("ko");
    expect(ja.map((b) => b.id)).toEqual(PARTNER_BANNERS.map((p) => p.id));
    expect(ja[0].name).toBe(PARTNER_BANNERS[0].name.ja);
    expect(ko[0].headline).toBe(PARTNER_BANNERS[0].headline.ko);
    expect(ja[0].sdgIds).toEqual([...PARTNER_BANNERS[0].sdgIds]);
    expect(ja[0].sample).toBe(true);
  });
});
