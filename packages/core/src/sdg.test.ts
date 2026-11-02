import { describe, expect, it } from "vitest";
import { getSdg, isSdgId, SDG_IDS, SDGS, sdgTextColor } from "./sdg";

describe("SDGs 17목표", () => {
  it("1~17 번이 순서대로 있어요", () => {
    expect(SDGS).toHaveLength(17);
    expect(SDG_IDS).toEqual(Array.from({ length: 17 }, (_, i) => i + 1));
    SDGS.forEach((sdg, i) => expect(sdg.id).toBe(i + 1));
  });

  it("색은 #RRGGBB 이고 서로 달라요", () => {
    const colors = SDGS.map((sdg) => sdg.color);
    for (const color of colors) expect(color).toMatch(/^#[0-9A-F]{6}$/);
    expect(new Set(colors).size).toBe(17);
  });

  it("이름은 두 언어 모두 있고, 일본어에 한글이, 한국어에 가나가 섞이지 않아요", () => {
    for (const sdg of SDGS) {
      for (const text of [sdg.name, sdg.short]) {
        expect(text.ja.length).toBeGreaterThan(0);
        expect(text.ko.length).toBeGreaterThan(0);
        expect(text.ja).not.toMatch(/[가-힣]/);
        expect(text.ko).not.toMatch(/[ぁ-ゟ゠-ヿ]/);
      }
    }
  });

  it("getSdg / isSdgId", () => {
    expect(getSdg(14).name.ja).toBe("海の豊かさを守ろう");
    expect(getSdg(14).color).toBe("#0A97D9");
    expect(isSdgId(17)).toBe(true);
    expect(isSdgId(0)).toBe(false);
    expect(isSdgId(18)).toBe(false);
    expect(isSdgId(1.5)).toBe(false);
    expect(isSdgId("3")).toBe(false);
  });

  it("타일 글자색: 밝은 타일에는 어두운 글자", () => {
    expect(sdgTextColor(1)).toBe("#FFFFFF");
    expect(sdgTextColor(14)).toBe("#FFFFFF");
    expect(sdgTextColor(17)).toBe("#FFFFFF");
    expect(sdgTextColor(7)).toBe("#1E2925");
    expect(sdgTextColor(2)).toBe("#1E2925");
  });

  it("타일 글자색: 어두운 글자를 쓰는 밝은 타일과도 4.5:1 이상이에요", () => {
    const lum = (hex: string) => {
      const ch = (i: number) => {
        const v = parseInt(hex.slice(i, i + 2), 16) / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * ch(1) + 0.7152 * ch(3) + 0.0722 * ch(5);
    };
    const dark = SDGS.filter((sdg) => sdgTextColor(sdg.id) !== "#FFFFFF");
    expect(dark.map((sdg) => sdg.id)).toEqual([2, 6, 7, 9, 11, 15]);
    for (const sdg of dark) {
      const [hi, lo] = [lum(sdg.color), lum(sdgTextColor(sdg.id))].sort((a, b) => b - a);
      expect((hi + 0.05) / (lo + 0.05), `SDG ${sdg.id}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
