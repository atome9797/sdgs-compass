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
    expect(sdgTextColor(7)).toBe("#10161F");
    expect(sdgTextColor(2)).toBe("#10161F");
  });
});
