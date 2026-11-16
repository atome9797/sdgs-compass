import { describe, expect, it } from "vitest";
import { COMPASS, DECOR_COLORS, MAP_DECOR, MAP_GRID, mapDecor, TREASURE } from "./adventureMap";
import { hexToRgba } from "./pixels";
import { MAP_COLORS } from "./theme";

// 홈의 「모험 지도」 바탕(#57): 오른쪽 위 장식 그림(나침반 · 점선 항로 · 보물 표시)
describe("모험 지도의 장식 그림", () => {
  const image = mapDecor();
  const at = (x: number, y: number) => Array.from(image.data.subarray((y * image.w + x) * 4, (y * image.w + x) * 4 + 4));
  const rgba = (hex: string) => Array.from(hexToRgba(hex));

  it("크기는 80 × 44 이고, 화면에서는 2배(160 × 88)로 보여요 — 모눈은 24px", () => {
    expect([image.w, image.h]).toEqual([MAP_DECOR.w, MAP_DECOR.h]);
    expect([MAP_DECOR.w * MAP_DECOR.scale, MAP_DECOR.h * MAP_DECOR.scale]).toEqual([160, 88]);
    expect(MAP_GRID).toBe(24);
  });

  it("늘 같은 그림이에요", () => {
    expect(Array.from(mapDecor().data)).toEqual(Array.from(image.data));
  });

  it("지도의 먹색 · 항로의 붉은색에 투명도만 다르게 써요(바탕은 투명해서 모눈이 비쳐요)", () => {
    const allowed = new Set(Object.values(DECOR_COLORS).map((hex) => rgba(hex).join(",")));
    let painted = 0;
    for (let i = 0; i < image.data.length; i += 4) {
      if (image.data[i + 3] === 0) continue;
      painted++;
      expect(allowed.has(Array.from(image.data.subarray(i, i + 4)).join(","))).toBe(true);
    }
    // 반 이상은 비어 있어요(장식이 글자를 덮지 않게)
    expect(painted).toBeLessThan((image.w * image.h) / 2);
    for (const hex of Object.values(DECOR_COLORS)) {
      const [r, g, b, a] = hexToRgba(hex);
      expect([MAP_COLORS.ink, MAP_COLORS.route].map((c) => rgba(c).slice(0, 3).join(","))).toContain([r, g, b].join(","));
      expect(a).toBeLessThan(255);
    }
    expect(at(0, 0)[3]).toBe(0);
    expect(at(image.w - 1, image.h - 1)[3]).toBe(0);
  });

  it("나침반의 가운데 · 북쪽 바늘 끝과 보물 표시(×)가 있어요", () => {
    expect(at(COMPASS.x, COMPASS.y)).toEqual(rgba(DECOR_COLORS.inkStrong));
    expect(at(COMPASS.x, COMPASS.y - COMPASS.point)[3]).toBeGreaterThan(0);
    for (const [dx, dy] of [[0, 0], [5, 0], [2, 2], [3, 2], [0, 4], [5, 4]]) expect(at(TREASURE.x + dx, TREASURE.y + dy)).toEqual(rgba(DECOR_COLORS.treasure));
    // 항로의 붉은 점선이 나침반과 보물 사이에 있어요
    let route = 0;
    for (let y = 0; y < image.h; y++) for (let x = TREASURE.x + 7; x < COMPASS.x - 8; x++) if (at(x, y).join(",") === rgba(DECOR_COLORS.route).join(",")) route++;
    expect(route).toBeGreaterThan(10);
  });
});
