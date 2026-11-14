import { describe, expect, it } from "vitest";
import { heroStatue, STATUE_METALS, STATUE_SIZE } from "./statue";

const colorsOf = (data: Uint8ClampedArray): Set<string> => {
  const out = new Set<string>();
  for (let i = 0; i < data.length; i += 4) if (data[i + 3] === 255) out.add(`#${[0, 1, 2].map((k) => data[i + k].toString(16).padStart(2, "0")).join("").toUpperCase()}`);
  return out;
};

describe("용사의 동상(#48) — 수상 기사의 픽셀 그림", () => {
  it("40×56 · 상마다 금 · 은 · 동의 금속 색 · 돌 받침대 · 같은 상은 같은 그림(캐시)", () => {
    for (const award of ["grand", "excellence", "special"] as const) {
      const image = heroStatue(award);
      expect([image.w, image.h]).toEqual([STATUE_SIZE.w, STATUE_SIZE.h]);
      const colors = colorsOf(image.data);
      for (const metal of STATUE_METALS[award]) expect(colors.has(metal), `${award} ${metal}`).toBe(true);
      // 받침대의 돌 · 테두리
      expect(colors.has("#8A93A3")).toBe(true);
      expect(colors.has("#1B2333")).toBe(true);
      expect(heroStatue(award)).toBe(image);
    }
    const pictures = new Set(["grand", "excellence", "special"].map((award) => Array.from(heroStatue(award as "grand").data).join(",")));
    expect(pictures.size).toBe(3);
  });
});
