import { describe, expect, it } from "vitest";
import { qrMatrix } from "@sdgs-compass/core/qr";
import { QR_QUIET_ZONE, qrPath } from "./qrSvg";

describe("qrPath", () => {
  it("어두운 칸을 가로로 이어 붙인 path 를 만들어요", () => {
    const m = [
      [true, true, false],
      [false, true, false],
      [true, false, true],
    ];
    const { size, d } = qrPath(m, 1);
    expect(size).toBe(5);
    expect(d).toBe("M1 1h2v1h-2zM2 2h1v1h-1zM1 3h1v1h-1zM3 3h1v1h-1z");
  });

  it("빈 행렬은 여백만 있는 빈 그림이에요", () => {
    expect(qrPath([], 4)).toEqual({ size: 8, d: "" });
  });

  it("실제 QR: 여백 4칸이 양쪽에 붙고, path 의 칸 수가 행렬의 어두운 칸 수와 같아요", () => {
    const matrix = qrMatrix("SDGS-COMPASS|SC-C-0001|0123456789abcdef0123456789abcdef");
    const { size, d } = qrPath(matrix);
    expect(QR_QUIET_ZONE).toBe(4);
    expect(size).toBe(matrix.length + 8);
    const dark = matrix.reduce((sum, row) => sum + row.filter(Boolean).length, 0);
    const drawn = [...d.matchAll(/h(\d+)v1/g)].reduce((sum, m) => sum + Number(m[1]), 0);
    expect(drawn).toBe(dark);
    expect(d).toMatch(/^M4 4h/);
    for (const m of d.matchAll(/M(\d+) (\d+)h/g)) {
      expect(Number(m[1])).toBeGreaterThan(3);
      expect(Number(m[2])).toBeGreaterThan(3);
    }
  });
});
