import { describe, expect, it } from "vitest";
import { bayer, hash01, hexToRgba, mix, PixelGrid } from "./pixels";
import { DURATION, layout, portraitLayout, settled, type Effect, type SceneInput } from "./scene";
import { background, foeSprite, FOE_BASE, heroBack, heroFront, partyCapes, portraitBackground, STAGE } from "./sprites";

const FOE_KINDS = ["jelly", "bottle", "smog", "ghost", "wall", "bird"] as const;

function colorsOf(data: Uint8ClampedArray): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 0) out.add(`#${[0, 1, 2].map((k) => data[i + k].toString(16).padStart(2, "0")).join("").toUpperCase()}`);
  return out;
}

describe("픽셀 붓 (#38)", () => {
  it("타원은 가운데가 정수면 좌우가 똑같고, 테두리는 그림 둘레에만 생겨요", () => {
    const g = new PixelGrid(10, 10).ellipse(5, 5, 3, 3, 2);
    for (let y = 0; y < 10; y++) for (let x = 0; x < 5; x++) expect(g.get(x, y), `${x},${y}`).toBe(g.get(9 - x, y));
    const before = g.filled();
    g.outline(1);
    expect(g.filled()).toBeGreaterThan(before);
    expect(g.get(5, 5)).toBe(2);
    expect(g.get(0, 0)).toBe(0);
  });

  it("팔레트로 RGBA 를 만들어요 (#RRGGBBAA 의 투명도 포함)", () => {
    const g = new PixelGrid(2, 1).set(0, 0, 2);
    expect([...g.toRgba([null, null, "#11223380"])]).toEqual([0x11, 0x22, 0x33, 0x80, 0, 0, 0, 0]);
    expect(hexToRgba("#0A97D9")).toEqual([10, 151, 217, 255]);
    expect(mix("#000000", "#FFFFFF", 0.5)).toBe("#808080");
    expect(() => new PixelGrid(1, 1).set(0, 0, 3).toRgba([null])).toThrow();
  });

  it("점무늬 문턱값 · 난수는 늘 같은 값이에요 (0 이상 1 미만)", () => {
    const values = Array.from({ length: 16 }, (_, i) => bayer(i % 4, Math.floor(i / 4)));
    expect(new Set(values).size).toBe(16);
    expect(values.every((v) => v > 0 && v < 1)).toBe(true);
    expect(hash01(42)).toBe(hash01(42));
  });
});

describe("픽셀 그림 (#38)", () => {
  it("몬스터 6종: 그림이 충분히 있고, 무늬에 퀘스트의 SDG 색이 들어가요", () => {
    for (const kind of FOE_KINDS) {
      const image = foeSprite(kind, "#0A97D9");
      expect(image.data.length, kind).toBe(image.w * image.h * 4);
      let filled = 0;
      for (let i = 3; i < image.data.length; i += 4) if (image.data[i] > 0) filled++;
      expect(filled, kind).toBeGreaterThan(250);
      expect(colorsOf(image.data).has("#0A97D9") || colorsOf(image.data).has(mix("#0A97D9", "#FFFFFF", 0.25)) || colorsOf(image.data).has(mix("#0A97D9", "#FFFFFF", 0.35)), kind).toBe(true);
      // 테두리(잉크색)가 있어요
      expect(colorsOf(image.data).has("#1B2333"), kind).toBe(true);
    }
  });

  it("용사: 망토 색이 들어가고, 앞모습 · 뒷모습 크기가 같아요", () => {
    const back = heroBack("#E5533D");
    const front = heroFront("#E5533D");
    expect([back.w, back.h]).toEqual([front.w, front.h]);
    expect(colorsOf(back.data).has("#E5533D")).toBe(true);
    expect(colorsOf(front.data).has("#E5533D")).toBe(true);
  });

  it("배경 4종은 240×150 을 빈틈없이 칠해요", () => {
    for (const scene of ["sea", "sky", "field", "town"] as const) {
      const image = background(scene);
      expect([image.w, image.h]).toEqual([STAGE.w, STAGE.h]);
      let holes = 0;
      for (let i = 3; i < image.data.length; i += 4) if (image.data[i] !== 255) holes++;
      expect(holes, scene).toBe(0);
    }
    const portrait = portraitBackground();
    expect(portrait.data.every((v, i) => i % 4 !== 3 || v === 255)).toBe(true);
  });

  it("파티의 망토: 가진 스킬의 SDG 색부터, 모자라면 기본색", () => {
    expect(partyCapes([14, 11])).toEqual(["#0A97D9", "#FD9D24", "#F2A93B"]);
    expect(partyCapes([])).toEqual(["#E5533D", "#3B7DD8", "#F2A93B"]);
  });
});

describe("움직임 (#38)", () => {
  const base: SceneInput = { t: 0, effects: [], defeated: false, reduced: false, sea: true, foeSize: { w: 32, h: 32 }, heroSize: { w: 24, h: 28 } };
  const foeOf = (input: SceneInput) => layout(input).find((item) => item.tex === "foe")!;
  const dots = (input: SceneInput) => layout(input).filter((item) => item.tex === "dot");

  it("등장: 몬스터는 오른쪽에서, 용사는 왼쪽에서 들어와 받침 위에 서요", () => {
    const intro: Effect[] = [{ kind: "intro", start: 0 }];
    const start = layout({ ...base, effects: intro, t: 0 });
    const end = layout({ ...base, effects: intro, t: DURATION.intro });
    const foeStart = start.find((i) => i.tex === "foe")!;
    const foeEnd = end.find((i) => i.tex === "foe")!;
    expect(foeStart.x).toBeGreaterThan(foeEnd.x + 100);
    expect(Math.abs(foeEnd.x + foeEnd.w / 2 - FOE_BASE.x)).toBeLessThanOrEqual(1);
    expect(start.find((i) => i.tex === "hero0")!.x).toBeLessThan(end.find((i) => i.tex === "hero0")!.x - 100);
    // 그리는 순서: 배경 → 구름 → 몬스터 → 뒤의 동료 → 앞의 리더
    expect(end.map((i) => i.tex)).toEqual(["bg", "cloud", "cloud", "foe", "hero2", "hero1", "hero0"]);
    expect(end.every((i) => Number.isInteger(i.x) && Number.isInteger(i.y))).toBe(true);
    expect(end[0].wave).toBe(1);
  });

  it("스킬: 몬스터가 번쩍이고, 스킬의 SDG 색 불꽃이 퍼졌다가 사라져요", () => {
    const effects: Effect[] = [{ kind: "skill", start: 1000, color: "#56C02B" }];
    const mid = { ...base, effects, t: 1000 + DURATION.skill * 0.45 };
    expect(foeOf(mid).flash).toBeGreaterThan(0);
    const sparks = dots(mid);
    expect(sparks.length).toBe(22);
    expect(sparks.some((d) => d.color === "#56C02B")).toBe(true);
    expect(dots({ ...base, effects, t: 1000 + DURATION.skill })).toEqual([]);
    expect(settled(effects, 1000 + DURATION.skill)).toBe(true);
    expect(settled(effects, 1500)).toBe(false);
  });

  it("쓰러진 몬스터(기획서를 낸 퀘스트): 번쩍인 뒤 흑백 · 반투명으로 가라앉아요", () => {
    const effects: Effect[] = [{ kind: "clear", start: 0 }];
    const after = foeOf({ ...base, defeated: true, effects, t: DURATION.clear });
    expect(after.gray).toBe(1);
    expect(after.alpha).toBeCloseTo(0.45);
    expect(foeOf({ ...base, defeated: true, effects, t: 100 }).gray).toBe(0);
    // 효과가 없어도(다시 그릴 때) 쓰러진 모습 그대로
    expect(foeOf({ ...base, defeated: true }).gray).toBe(1);
  });

  it("움직임 줄이기: 등장 · 흔들림 · 불꽃 · 물결이 없고 끝난 모습만", () => {
    const effects: Effect[] = [{ kind: "intro", start: 0 }, { kind: "skill", start: 0, color: "#FFFFFF" }];
    const a = layout({ ...base, reduced: true, effects, t: 50 });
    const b = layout({ ...base, reduced: true, effects, t: 5000 });
    expect(a).toEqual(b);
    expect(a.some((i) => i.tex === "dot")).toBe(false);
    expect(a[0].wave).toBe(0);
  });

  it("도망: 파티가 왼쪽 밖으로 나가요", () => {
    const run: Effect[] = [{ kind: "run", start: 0 }];
    expect(layout({ ...base, effects: run, t: DURATION.run }).find((i) => i.tex === "hero2")!.x + 48).toBeLessThan(0);
  });

  it("스테이터스 그림: 스킬 수만큼 빛이 돌고, 용사는 늘 그려져요", () => {
    const items = portraitLayout(1234, ["#0A97D9", "#FD9D24"], false, { w: 24, h: 28 });
    expect(items.filter((i) => i.tex === "dot").map((i) => i.color).sort()).toEqual(["#0A97D9", "#FD9D24"]);
    expect(items.filter((i) => i.tex === "hero0")).toHaveLength(1);
    expect(portraitLayout(0, [], true, { w: 24, h: 28 }).map((i) => i.tex)).toEqual(["bg", "hero0"]);
  });
});
