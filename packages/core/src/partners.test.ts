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

// 게재 허락을 받은 실제 단체. 여기 없는 단체를 sample: false 로 넣으면 테스트가 막아요(허락 전에 실제 이름이 공개되지 않게).
const APPROVED_PARTNERS = ["pt-atec", "pt-marine-sweeper"];
// 로고까지 허락받은 단체 → 로고 파일 이름
const APPROVED_LOGOS: Record<string, string> = { "pt-marine-sweeper": "marine-sweeper.png" };

describe("첫 화면의 협력 단체 배너", () => {
  it("두 장 이상이고, id 가 겹치지 않아요 (저절로 넘어가는 배너)", () => {
    expect(PARTNER_BANNERS.length).toBeGreaterThanOrEqual(2);
    expect(new Set(PARTNER_BANNERS.map((p) => p.id)).size).toBe(PARTNER_BANNERS.length);
  });

  it("모든 문구에 일본어·한국어가 있고, 일본어에 한글·한국어에 가나가 섞이지 않아요 (실제 단체의 이름은 공식 이름 그대로라 빼요)", () => {
    for (const p of PARTNER_BANNERS) {
      for (const [field, text] of [["name", p.name], ["kind", p.kind], ["headline", p.headline], ["body", p.body]] as const) {
        expect(text.ja.trim().length > 0 && text.ko.trim().length > 0, `${p.id} ${field}`).toBe(true);
        expect(/[가-힣]/.test(text.ja), `${p.id} ${field} ja`).toBe(false);
        if (field === "name" && !p.sample) continue;
        expect(/[ぁ-ヿ]/.test(text.ko), `${p.id} ${field} ko`).toBe(false);
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

  it("실제 단체(sample: false)는 게재 허락을 받은 곳뿐이에요", () => {
    expect(PARTNER_BANNERS.filter((p) => !p.sample).map((p) => p.id)).toEqual(APPROVED_PARTNERS);
  });

  it("로고: 로고까지 허락받은 단체만, 파일 이름은 영문 소문자 · 숫자 · 하이픈의 .png (가상의 샘플에는 없어요)", () => {
    const withLogo = Object.fromEntries(PARTNER_BANNERS.filter((p) => p.logo !== undefined).map((p) => [p.id, p.logo]));
    expect(withLogo).toEqual(APPROVED_LOGOS);
    for (const file of Object.values(APPROVED_LOGOS)) expect(file).toMatch(/^[a-z0-9-]+\.png$/);
    for (const p of PARTNER_BANNERS) if (p.sample) expect(p.logo, p.id).toBeUndefined();
  });

  it("웹사이트: 실제 단체는 https 주소, 가상의 샘플에는 없어요 (지어낸 단체의 링크를 걸지 않게)", () => {
    for (const p of PARTNER_BANNERS) {
      if (p.sample) {
        expect(p.url, p.id).toBeUndefined();
      } else {
        expect(p.url, p.id).toMatch(/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}\/[^\s"'<>]*$/);
      }
    }
  });

  it("株式会社エイテック: 허락받은 글 그대로 (회사가 고쳐 준 소개 글 · 브랜드명)", () => {
    const atec = PARTNER_BANNERS.find((p) => p.id === "pt-atec");
    expect(atec?.name.ja).toBe("株式会社エイテック");
    expect(atec?.kind.ja).toBe("釣具ブランド「テイルウォーク」「アルファタックル」・静岡県沼津市");
    expect(atec?.headline.ja).toBe("浜のごみ拾いから、包装を変える");
    expect(atec?.body.ja).toBe("釣具メーカー　沼津の浜で海岸清掃を続け、製品の包装を環境に良い素材に変えることを模索しています。");
    expect(atec?.url).toBe("https://atec.fishing/sustainability/");
    expect(atec?.logo).toBeUndefined();
  });

  it("Marine Sweeper: 허락받은 글 그대로 (요청 문서에 적은 이름 · 표제 · 소개 글 · 웹사이트, 로고)", () => {
    const ms = PARTNER_BANNERS.find((p) => p.id === "pt-marine-sweeper");
    expect(ms?.name.ja).toBe("Marine Sweeper");
    expect(ms?.kind.ja).toBe("マリンスイーパー・水中清掃チーム");
    expect(ms?.headline.ja).toBe("海の底のごみを、潜って回収");
    expect(ms?.body.ja).toBe("海の底に残る釣り糸やルアーを回収し、再生して販売しています。");
    expect(ms?.url).toBe("https://marinesweeper.jp/");
    expect(ms?.logo).toBe("marine-sweeper.png");
  });

  it("selectPartnerBanners: 지금 언어의 글로 바꿔요", () => {
    const ja = selectPartnerBanners("ja");
    const ko = selectPartnerBanners("ko");
    expect(ja.map((b) => b.id)).toEqual(PARTNER_BANNERS.map((p) => p.id));
    expect(ja[0].name).toBe(PARTNER_BANNERS[0].name.ja);
    expect(ko[0].headline).toBe(PARTNER_BANNERS[0].headline.ko);
    expect(ja[0].sdgIds).toEqual([...PARTNER_BANNERS[0].sdgIds]);
    expect(ja.map((b) => b.sample)).toEqual(PARTNER_BANNERS.map((p) => p.sample));
    expect(ja.map((b) => b.url)).toEqual(PARTNER_BANNERS.map((p) => p.url ?? null));
    expect(ja.map((b) => b.logo)).toEqual(PARTNER_BANNERS.map((p) => p.logo ?? null));
  });
});
