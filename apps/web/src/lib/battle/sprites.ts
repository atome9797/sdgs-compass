// 전투 화면(#38)의 픽셀 그림: 과제 몬스터 6종 · 용사(뒷모습 · 앞모습) · 구름 · 배경 4종. 모두 이 앱만의 그림이에요(다른 게임의 캐릭터를 따라 그리지 않아요).
// 몬스터의 무늬(accent)는 퀘스트의 대표 SDG 색 — 몬스터의 「タイプ」가 SDG 번호예요. 용사의 망토 색은 가진 스킬의 SDG 색.
import type { FoeKind } from "@sdgs-compass/core/domain";
import type { SceneKind } from "@sdgs-compass/core/battle";
import { getSdg, type SdgId } from "@sdgs-compass/core/sdg";
import { darken, hash01, lighten, PixelCanvas, PixelGrid, type PixelImage } from "./pixels";

const INK = "#1B2333";
const WHITE = "#FFFFFF";

function finish(grid: PixelGrid, palette: (string | null)[]): PixelImage {
  grid.outline(1);
  return { w: grid.w, h: grid.h, data: grid.toRgba([null, INK, ...palette.slice(2)]) };
}

/** 비닐봉지 해파리: 손잡이 두 개(귀처럼), 둥근 몸, 아래로 늘어진 비닐 끈 */
function jelly(accent: string): PixelImage {
  const g = new PixelGrid(32, 32);
  const [BAG, SHADE, HI, ACC, EYE] = [2, 3, 4, 5, 6];
  g.ellipse(10, 5, 4, 4, BAG).ellipse(10, 5, 2, 2, 0);
  g.ellipse(22, 5, 4, 4, BAG).ellipse(22, 5, 2, 2, 0);
  g.ellipse(16.5, 15, 12.5, 10, SHADE);
  g.ellipse(15.5, 14, 11.5, 9, BAG);
  g.rect(0, 21, 31, 31, 0);
  for (const x of [6, 11, 16, 21, 26]) g.ellipse(x, 20.5, 2.5, 2, SHADE);
  g.recolor(0, 8, 31, 9, [BAG, SHADE], ACC);
  g.ellipse(9.5, 11.5, 1.5, 2, HI);
  // 눈 · 입
  g.rect(11, 13, 12, 15, EYE).rect(19, 13, 20, 15, EYE);
  g.rect(12, 14, 12, 15, 1).rect(20, 14, 20, 15, 1);
  g.set(14, 18, 1).set(15, 19, 1).set(16, 18, 1).set(17, 19, 1).set(18, 18, 1);
  // 비닐 끈 (조금씩 흔들리는 모양)
  const lengths = [8, 6, 9, 6, 8];
  [8, 12, 16, 20, 24].forEach((x0, i) => {
    for (let y = 22; y < 22 + lengths[i]; y++) {
      const x = x0 + (Math.floor((y + i) / 3) % 2);
      g.set(x, y, BAG).set(x + 1, y, y % 4 === 0 ? SHADE : BAG);
    }
  });
  return finish(g, [null, null, "#EEF6FCE6", "#C3D9E9E6", WHITE, accent, WHITE]);
}

/** 페트병: 뚜껑과 라벨이 SDG 색, 라벨 위에 화난 눈 */
function bottle(accent: string): PixelImage {
  const g = new PixelGrid(32, 32);
  const [CAP, CAP_D, BOT, BOT_S, HI, LABEL, LABEL_HI, EYE] = [2, 3, 4, 5, 6, 7, 8, 9];
  g.rect(13, 1, 18, 3, CAP).rect(13, 4, 18, 4, CAP_D).set(14, 2, CAP_D).set(16, 2, CAP_D);
  g.rect(12, 5, 19, 7, BOT);
  g.ellipse(16, 12, 9, 5, BOT);
  g.rect(7, 12, 24, 27, BOT);
  g.ellipse(16, 27.5, 8.5, 3, BOT);
  g.recolor(21, 9, 25, 31, [BOT], BOT_S);
  g.rect(7, 16, 24, 21, LABEL).rect(7, 16, 24, 16, LABEL_HI);
  g.rect(9, 12, 9, 15, HI).rect(9, 22, 9, 27, HI);
  // 눈 · 눈썹 · 이를 드러낸 입 · 팔
  g.rect(10, 17, 12, 19, EYE).rect(19, 17, 21, 19, EYE);
  g.rect(11, 18, 12, 19, 1).rect(19, 18, 20, 19, 1);
  g.line(9, 14, 12, 15, 1).line(22, 14, 19, 15, 1);
  for (let x = 13; x <= 18; x++) g.set(x, x % 2 === 0 ? 24 : 23, 1);
  g.rect(5, 19, 6, 21, BOT).rect(25, 19, 26, 21, BOT_S);
  return finish(g, [null, null, accent, darken(accent, 0.3), "#D3ECF8E6", "#A9CFE3E6", WHITE, accent, lighten(accent, 0.45), WHITE]);
}

/** 검은 연기 구름: 뭉게뭉게, 눈이 SDG 색으로 빛나요 */
function smog(accent: string): PixelImage {
  const g = new PixelGrid(32, 28);
  const [SM, HI, D, EYE, TOOTH] = [2, 3, 4, 5, 6];
  const puffs: [number, number, number, number][] = [
    [9, 17, 7, 7],
    [16, 12, 9, 9],
    [24, 16, 7, 7],
    [13, 21, 6, 5],
    [21, 21, 6, 5],
  ];
  for (const [x, y, rx, ry] of puffs) g.ellipse(x, y, rx, ry, D);
  for (const [x, y, rx, ry] of puffs) g.ellipse(x - 0.8, y - 0.8, rx - 1, ry - 1, SM);
  g.ellipse(7, 14, 3, 2, HI).ellipse(13, 7, 4, 2, HI).ellipse(22, 12, 3, 2, HI);
  g.ellipse(6, 5, 2, 2, SM).ellipse(27, 6, 2, 2, SM);
  g.rect(11, 14, 13, 16, EYE).rect(19, 14, 21, 16, EYE);
  g.set(12, 15, 1).set(20, 15, 1);
  g.line(10, 12, 13, 13, 1).line(22, 12, 19, 13, 1);
  g.rect(13, 19, 19, 20, 1);
  g.set(14, 19, TOOTH).set(16, 19, TOOTH).set(18, 19, TOOTH);
  return finish(g, [null, null, "#4D5160", "#6E7384", "#363944", lighten(accent, 0.25), WHITE]);
}

/** 팔다 남은 것의 유령: 흰 천, 볼에 SDG 색, 몸에 둥근 할인 스티커 */
function ghost(accent: string): PixelImage {
  const g = new PixelGrid(32, 32);
  const [G, S, CHEEK, STICK, STICK_IN] = [2, 3, 4, 5, 6];
  g.ellipse(16.5, 13, 11, 11, S).rect(6, 13, 27, 26, S);
  g.ellipse(15.5, 12, 10, 10, G).rect(6, 12, 25, 25, G);
  for (const x of [9.5, 16, 22.5]) g.ellipse(x, 27.5, 2.5, 2.5, 0);
  g.ellipse(6.5, 26, 2.5, 2.5, G).ellipse(13, 27, 2.5, 2.5, G).ellipse(19.5, 27, 2.5, 2.5, G).ellipse(26, 26, 2.5, 2.5, S);
  g.ellipse(4.5, 17, 2, 2, G).ellipse(28, 17, 2, 2, S);
  g.rect(10, 10, 11, 13, 1).rect(18, 10, 19, 13, 1).set(10, 10, STICK_IN).set(18, 10, STICK_IN);
  g.ellipse(15, 17.5, 2, 1.5, 1);
  g.rect(7, 15, 8, 15, CHEEK).rect(21, 15, 22, 15, CHEEK);
  g.ellipse(22, 21.5, 3.5, 3.5, STICK).ellipse(22, 21.5, 2, 2, STICK_IN).set(21, 21, STICK).set(22, 21, STICK);
  return finish(g, [null, null, "#F4F1E8", "#D6CFBF", lighten(accent, 0.35), accent, WHITE]);
}

/** 벽돌 벽: 위에 SDG 색 간판, 화난 눈, 작은 발 */
function wall(accent: string): PixelImage {
  const g = new PixelGrid(32, 30);
  const [B, BD, M, SIGN, SIGN_IN, FEET, EYE] = [2, 3, 4, 5, 6, 7, 8];
  g.rect(3, 4, 28, 26, B);
  g.rect(3, 1, 8, 3, B).rect(13, 1, 18, 3, B).rect(23, 1, 28, 3, B);
  [8, 12, 16, 20, 24].forEach((y, row) => {
    g.rect(3, y, 28, y, M);
    for (let x = 3 + (row % 2) * 4; x <= 28; x += 8) g.rect(x, y + 1, x, Math.min(y + 3, 26), M);
  });
  g.recolor(26, 0, 28, 26, [B], BD).recolor(3, 25, 28, 26, [B], BD);
  g.rect(8, 5, 23, 11, SIGN).rect(9, 6, 22, 10, SIGN_IN);
  g.rect(11, 7, 13, 9, SIGN).rect(15, 7, 16, 9, SIGN).rect(18, 7, 20, 9, SIGN);
  g.rect(10, 14, 12, 17, EYE).rect(19, 14, 21, 17, EYE);
  g.rect(11, 15, 12, 16, 1).rect(19, 15, 20, 16, 1);
  g.line(9, 12, 12, 13, 1).line(22, 12, 19, 13, 1);
  g.rect(13, 21, 18, 22, 1);
  g.rect(7, 27, 11, 28, FEET).rect(20, 27, 24, 28, FEET);
  return finish(g, [null, null, "#C8704C", "#9E5236", "#E9CDB8", accent, WHITE, "#4A3428", WHITE]);
}

/** 한산한 새(카라스): 둥근 몸, 머리깃, SDG 색 목도리 */
function bird(accent: string): PixelImage {
  const g = new PixelGrid(32, 28);
  const [BD, BDD, BELLY, BEAK, SCARF, SCARF_D, EYE] = [2, 3, 4, 5, 6, 7, 8];
  g.line(14, 1, 15, 4, BD).line(17, 0, 17, 4, BD).line(20, 1, 19, 4, BD);
  g.ellipse(4.5, 16, 3, 5, BDD).ellipse(27.5, 16, 3, 5, BDD);
  g.ellipse(16.5, 15, 11, 10, BDD);
  g.ellipse(16, 14.5, 10.5, 9.5, BD);
  g.ellipse(16, 18.5, 6, 4.5, BELLY);
  g.ellipse(12.5, 11, 2.5, 2.5, EYE).ellipse(19.5, 11, 2.5, 2.5, EYE);
  g.rect(13, 11, 13, 12, 1).rect(19, 11, 19, 12, 1);
  g.line(10, 8, 14, 9, 1).line(22, 8, 18, 9, 1);
  g.rect(15, 13, 17, 14, BEAK).set(16, 15, BEAK);
  g.recolor(7, 19, 25, 20, [BD, BDD, BELLY], SCARF);
  g.rect(20, 21, 21, 24, SCARF_D);
  g.set(12, 25, BEAK).set(11, 26, BEAK).set(13, 26, BEAK).set(19, 25, BEAK).set(18, 26, BEAK).set(20, 26, BEAK);
  return finish(g, [null, null, "#3E4760", "#2B3247", "#66708C", "#F2B33D", accent, darken(accent, 0.3), WHITE]);
}

const FOES: Record<FoeKind, (accent: string) => PixelImage> = { jelly, bottle, smog, ghost, wall, bird };

export function foeSprite(kind: FoeKind, accent: string): PixelImage {
  return FOES[kind](accent);
}

const HERO = { hair: "#3B2A20", hairHi: "#5A4232", tunic: "#E9E3D3", skin: "#F3CDAE", boot: "#5B3B2A", blade: "#DDE6F0", hilt: "#F2B33D" };

/** 용사의 뒷모습 (몬스터를 바라봐요): 망토 · 머리띠의 색이 cape */
export function heroBack(cape: string): PixelImage {
  const g = new PixelGrid(24, 28);
  const [HAIR, HAIR_HI, CAPE, CAPE_D, TUNIC, SKIN, BOOT, BLADE, HILT, BAND] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  g.ellipse(12, 7, 6.5, 6, HAIR).ellipse(10, 4.5, 2.5, 1.5, HAIR_HI);
  g.recolor(0, 8, 23, 8, [HAIR, HAIR_HI], BAND);
  g.rect(17, 9, 17, 11, BAND).rect(18, 10, 18, 12, BAND);
  g.rect(10, 12, 13, 13, SKIN);
  for (let y = 13; y <= 24; y++) {
    const half = 4 + Math.floor((y - 13) * 0.45);
    g.rect(12 - half, y, 11 + half, y, CAPE);
    g.recolor(12 + Math.floor(half / 3), y, 11 + half, y, [CAPE], CAPE_D);
  }
  for (let x = 6; x <= 17; x += 3) g.set(x, 24, 0);
  g.rect(4, 15, 5, 19, TUNIC).rect(18, 15, 19, 19, TUNIC).rect(4, 20, 5, 20, SKIN).rect(18, 20, 19, 20, SKIN);
  g.line(6, 11, 15, 21, BLADE).line(4, 11, 7, 9, HILT).rect(3, 7, 4, 8, HILT);
  g.rect(8, 25, 10, 27, BOOT).rect(13, 25, 15, 27, BOOT);
  return finish(g, [null, null, HERO.hair, HERO.hairHi, cape, darken(cape, 0.28), HERO.tunic, HERO.skin, HERO.boot, HERO.blade, HERO.hilt, lighten(cape, 0.2)]);
}

/** 용사의 앞모습 (스테이터스 화면) */
export function heroFront(cape: string): PixelImage {
  const g = new PixelGrid(24, 28);
  const [HAIR, CAPE, CAPE_D, TUNIC, SKIN, BOOT, BLADE, HILT, BAND, MOUTH, PANTS] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  g.rect(4, 14, 19, 23, CAPE).recolor(16, 14, 19, 23, [CAPE], CAPE_D);
  g.ellipse(12, 6, 6.5, 5.5, HAIR);
  g.ellipse(12, 9.5, 5, 4.5, SKIN);
  g.rect(7, 4, 16, 5, HAIR).set(8, 6, HAIR).set(10, 6, HAIR).set(13, 6, HAIR).set(15, 6, HAIR);
  g.rect(6, 5, 17, 5, BAND).rect(4, 6, 5, 6, BAND).rect(3, 7, 4, 8, BAND);
  g.rect(9, 9, 9, 10, 1).rect(14, 9, 14, 10, 1).rect(11, 12, 12, 12, MOUTH);
  g.rect(7, 14, 16, 22, TUNIC).rect(9, 14, 14, 14, CAPE).rect(7, 19, 16, 19, BOOT);
  g.rect(5, 15, 6, 20, TUNIC).rect(17, 15, 18, 20, TUNIC).rect(5, 21, 6, 21, SKIN).rect(17, 21, 18, 21, SKIN);
  g.rect(20, 8, 20, 19, BLADE).rect(19, 20, 21, 20, HILT).set(20, 21, HILT);
  g.rect(8, 23, 15, 23, PANTS).rect(8, 24, 10, 26, BOOT).rect(13, 24, 15, 26, BOOT);
  return finish(g, [null, null, HERO.hair, cape, darken(cape, 0.28), HERO.tunic, HERO.skin, HERO.boot, HERO.blade, HERO.hilt, lighten(cape, 0.2), "#B5644E", "#4A5A7A"]);
}

export function cloudSprite(): PixelImage {
  const g = new PixelGrid(28, 12);
  g.ellipse(9, 7.5, 7, 4.5, 3).ellipse(16, 5.5, 8, 5.5, 3).ellipse(22, 8, 5.5, 3.5, 3);
  g.ellipse(9, 7, 6.5, 4, 2).ellipse(16, 5, 7.5, 5, 2).ellipse(22, 7.5, 5, 3, 2);
  return { w: g.w, h: g.h, data: g.toRgba([null, null, "#FFFFFF", "#DCEAF6"]) };
}

/** 1×1 흰 점 — 기술 효과의 불꽃(색은 그릴 때 입혀요) */
export function dotSprite(): PixelImage {
  return { w: 1, h: 1, data: new Uint8ClampedArray([255, 255, 255, 255]) };
}

/** 전투 화면의 크기(내부 해상도) — 화면에는 CSS 로 늘려서, 칸이 또렷하게 보여요 */
export const STAGE = { w: 240, h: 150 } as const;
/** 몬스터 · 용사가 서는 받침의 가운데 */
export const FOE_BASE = { x: 172, y: 84 } as const;
export const HERO_BASE = { x: 66, y: 146 } as const;
/** 바다 배경에서 물결이 시작하는 높이(0~1) — WebGL 의 물결 효과가 이 아래만 흔들어요 */
export const HORIZON: Record<SceneKind, number> = { sea: 72 / 150, sky: 1, field: 1, town: 1 };

function platform(c: PixelCanvas, x: number, y: number, rx: number, ry: number, dark: string, light: string): void {
  c.ellipse(x, y + 2, rx + 2, ry + 1, dark);
  c.ellipse(x, y, rx, ry, light);
}

/** 배경 4종 (240×150): 바다 · 하늘(풍차) · 들판 · 거리 */
export function background(scene: SceneKind): PixelImage {
  const { w, h } = STAGE;
  const c = new PixelCanvas(w, h);
  if (scene === "sea") {
    c.gradient(0, 72, ["#7EC8F2", "#B9E3FA", "#E6F6FF"]);
    c.ellipse(36, 72, 22, 4, "#86B9D8");
    c.gradient(72, 149, ["#5BB3E6", "#2F8FD1", "#1E6FB0", "#165A93"]);
    for (let i = 0; i < 46; i++) {
      const y = 76 + Math.floor(hash01(i * 3 + 1) * 70);
      const x = Math.floor(hash01(i * 3 + 2) * w);
      const len = 3 + Math.floor(hash01(i * 3 + 3) * 6);
      c.rect(x, y, x + len, y, y < 100 ? "#A9DBF7" : "#5FA6DA");
    }
    platform(c, FOE_BASE.x, FOE_BASE.y, 44, 7, "#B89C63", "#E6D3A1");
    platform(c, HERO_BASE.x, HERO_BASE.y, 64, 11, "#C2A36A", "#EBD8A6");
  } else if (scene === "sky") {
    c.gradient(0, 100, ["#5AA8E6", "#9ED3F5", "#D8F0FF"]);
    c.ellipse(206, 24, 14, 14, "#FFF2B8");
    c.ellipse(206, 24, 11, 11, "#FFE27A");
    c.ellipse(62, 118, 116, 30, "#6DB85C");
    c.ellipse(204, 122, 104, 32, "#5FA84F");
    c.gradient(108, 149, ["#7CC46A", "#5FA84F"]);
    for (const [x, top] of [
      [34, 62],
      [58, 70],
    ] as const) {
      c.rect(x, top, x, 100, "#F4F7FA");
      for (const [dx, dy] of [
        [0, -9],
        [-8, 5],
        [8, 5],
      ] as const) {
        for (let k = 0; k <= 8; k++) c.set(x + Math.round((dx * k) / 8), top + Math.round((dy * k) / 8), "#FFFFFF");
      }
      c.rect(x - 1, top - 1, x + 1, top + 1, "#C9D4DE");
    }
    platform(c, FOE_BASE.x, FOE_BASE.y, 44, 7, "#4F9A44", "#7CC86A");
    platform(c, HERO_BASE.x, HERO_BASE.y, 64, 11, "#4F9A44", "#86D174");
  } else if (scene === "field") {
    c.gradient(0, 80, ["#8FD3F4", "#CDEEFF", "#F2FBFF"]);
    for (const [x, peak, half, color] of [
      [40, 50, 46, "#86B8A6"],
      [118, 44, 52, "#76AA97"],
      [200, 54, 50, "#86B8A6"],
    ] as const) {
      for (let y = peak; y <= 80; y++) {
        const span = Math.round(((y - peak) / (80 - peak)) * half);
        c.rect(x - span, y, x + span, y, color);
      }
    }
    c.gradient(80, 149, ["#B6DC7A", "#A1CF62", "#8CC251"]);
    for (let y = 86; y < h; y += 7) c.rect(0, y, w - 1, y, "#86B84C");
    platform(c, FOE_BASE.x, FOE_BASE.y, 44, 7, "#A87C4D", "#D9AE78");
    platform(c, HERO_BASE.x, HERO_BASE.y, 64, 11, "#A87C4D", "#DDB27D");
  } else {
    c.gradient(0, 86, ["#9CC9EE", "#CFE6F7", "#EEF6FC"]);
    let x = 0;
    let i = 0;
    while (x < w) {
      const bw = 18 + Math.floor(hash01(i * 7 + 1) * 18);
      const bh = 24 + Math.floor(hash01(i * 7 + 2) * 34);
      const color = ["#8A9BB5", "#A7B4C8", "#7D8DA8"][i % 3];
      c.rect(x, 86 - bh, x + bw - 2, 86, color);
      for (let wy = 86 - bh + 4; wy < 82; wy += 6) for (let wx = x + 3; wx < x + bw - 4; wx += 5) if (hash01(i * 97 + wy * 13 + wx) > 0.35) c.rect(wx, wy, wx + 1, wy + 1, "#E8EEF6");
      x += bw;
      i++;
    }
    c.gradient(86, 149, ["#E2DCCF", "#D3CBBC"]);
    for (let y = 92; y < h; y += 9) c.rect(0, y, w - 1, y, "#C2B9A8");
    for (let y = 92, row = 0; y < h; y += 9, row++) for (let gx = (row % 2) * 12; gx < w; gx += 24) c.rect(gx, y + 1, gx, Math.min(y + 8, h - 1), "#C9C0B0");
    platform(c, FOE_BASE.x, FOE_BASE.y, 44, 7, "#A79D8B", "#CFC7B8");
    platform(c, HERO_BASE.x, HERO_BASE.y, 64, 11, "#A79D8B", "#D2CABB");
  }
  return c.image();
}

/** 스테이터스 화면의 작은 무대 (96×88): 위는 하늘, 아래는 풀밭, 가운데에 받침 */
export const PORTRAIT = { w: 96, h: 88 } as const;
export function portraitBackground(): PixelImage {
  const c = new PixelCanvas(PORTRAIT.w, PORTRAIT.h);
  c.gradient(0, 58, ["#9ED3F5", "#CDEBFB", "#EEF8FE"]);
  c.gradient(58, 87, ["#9DD486", "#7FC26A"]);
  platform(c, 48, 76, 30, 6, "#5FA84F", "#A8DC8E");
  return c.image();
}

/** 파티 세 명의 망토 색: 가진 스킬의 SDG 색(최근 스킬부터), 모자라면 빨강 · 파랑 · 노랑 */
export function partyCapes(skillSdgIds: readonly SdgId[]): [string, string, string] {
  const defaults = ["#E5533D", "#3B7DD8", "#F2A93B"];
  return [0, 1, 2].map((i) => (skillSdgIds[i] ? getSdg(skillSdgIds[i]).color : defaults[i])) as [string, string, string];
}
