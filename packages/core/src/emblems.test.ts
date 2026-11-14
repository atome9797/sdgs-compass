import { describe, expect, it } from "vitest";
import { SDG_EMBLEMS, sdgEmblem } from "./emblems";
import { SDG_IDS, getSdg } from "./sdg";

describe("SDG 문장 (#42 · #45 — 스테이터스 항목과 수상으로 얻은 SDG 스킬의 아이콘 · 전투 효과)", () => {
  it("17개 목표마다 16×16 그림과 효과가 있어요 — 목표마다의 기술 이름은 두지 않아요(이름은 목표의 공식 이름)", () => {
    expect(Object.keys(SDG_EMBLEMS)).toHaveLength(17);
    for (const id of SDG_IDS) {
      const image = sdgEmblem(id);
      expect([image.w, image.h], `${id}`).toEqual([16, 16]);
      expect(image.data.length).toBe(16 * 16 * 4);
      expect(SDG_EMBLEMS[id]).toEqual({ id, effect: SDG_EMBLEMS[id].effect });
    }
  });

  it("그림 · 효과가 서로 달라요", () => {
    const pictures = new Set(SDG_IDS.map((id) => Array.from(sdgEmblem(id).data).join(",")));
    expect(pictures.size).toBe(17);
    expect(new Set(SDG_IDS.map((id) => SDG_EMBLEMS[id].effect)).size).toBe(17);
    expect(SDG_EMBLEMS[14].effect).toBe("wave");
  });

  it("그림에는 테두리(INK)와 그 목표의 색이 들어가고, 가장자리 한 칸은 비어 있거나 테두리예요", () => {
    const hex = (d: Uint8ClampedArray, i: number) => `#${[0, 1, 2].map((k) => d[i + k].toString(16).padStart(2, "0")).join("").toUpperCase()}`;
    for (const id of SDG_IDS) {
      const { data } = sdgEmblem(id);
      const colors = new Set<string>();
      let filled = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue;
        filled++;
        colors.add(hex(data, i));
      }
      expect(colors.has("#1B2333"), `${id} 테두리`).toBe(true);
      expect(colors.has(getSdg(id).color.toUpperCase()), `${id} 목표의 색`).toBe(true);
      expect(filled, `${id} 그림의 양`).toBeGreaterThan(60);
    }
  });

  it("같은 목표는 같은 그림(캐시)", () => {
    expect(sdgEmblem(14)).toBe(sdgEmblem(14));
  });
});
