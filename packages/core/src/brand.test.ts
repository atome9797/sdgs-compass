import { describe, expect, it } from "vitest";
import { compassLogo, compassOnly, LOGO_BACKGROUND, LOGO_SIZE } from "./brand";

const hexAt = (data: Uint8ClampedArray, x: number, y: number) => {
  const i = (y * LOGO_SIZE + x) * 4;
  return `#${[0, 1, 2].map((k) => data[i + k].toString(16).padStart(2, "0")).join("").toUpperCase()}`;
};

describe("앱 로고 · 아이콘 (#44) — 밧줄을 감은 놋쇠 나침반과 밤바다", () => {
  it("48×48, 바탕까지 빈칸 없이 칠해져 있고 왼쪽 위는 밤바다 색", () => {
    const { w, h, data } = compassLogo();
    expect([w, h]).toEqual([LOGO_SIZE, LOGO_SIZE]);
    for (let i = 3; i < data.length; i += 4) expect(data[i]).toBe(255);
    expect(hexAt(data, 0, 0)).toBe(LOGO_BACKGROUND.toUpperCase());
  });

  it("바늘: 위(북)는 빨강, 아래(남)는 남색 · 가운데는 놋쇠 핀", () => {
    const { data } = compassLogo();
    expect(["#E0402F", "#9C2116"]).toContain(hexAt(data, 23, 13));
    expect(["#2A4C86", "#16294D"]).toContain(hexAt(data, 23, 34));
    expect(["#DDB052", "#A8782A"]).toContain(hexAt(data, 23, 23));
  });

  it("나침반만: 모서리는 투명하고, 나침반 칸은 로고와 같아요", () => {
    const logo = compassLogo().data;
    const only = compassOnly().data;
    expect(only[3]).toBe(0);
    expect(only[(LOGO_SIZE * LOGO_SIZE - 1) * 4 + 3]).toBe(0);
    for (const [x, y] of [[23, 13], [23, 34], [23, 23], [5, 23], [23, 3]]) expect(hexAt(only, x, y), `${x},${y}`).toBe(hexAt(logo, x, y));
  });

  it("늘 같은 그림(한 번만 그려요)", () => {
    expect(compassLogo()).toBe(compassLogo());
    expect(compassOnly()).toBe(compassOnly());
  });
});
