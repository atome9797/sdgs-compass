// SDG 17개 목표의 문장(紋章)(#42): 스테이터스 항목(#45)의 16×16 픽셀 아이콘이자, 수상으로 얻은 그 SDG 스킬의 아이콘과 전투 효과의 종류.
// 17개를 처음부터 가진 기술이 아니에요(스킬은 수상해야 얻어요 — skills.ts). 그래서 목표마다의 기술 이름은 두지 않고, 이름은 목표의 공식 이름을 그대로 써요.
// 모두 이 앱만의 그림이에요 — 유엔의 공식 아이콘이나 다른 게임의 기술 모양을 따라 하지 않아요. 색만 각 목표의 공식 색을 써요.
// 웹은 RGBA 배열을 그대로(캔버스) · PNG 데이터 URI 로, 앱은 PNG 데이터 URI(png.ts)로 같은 그림을 보여 줘요.
import { darken, lighten, PixelGrid, type PixelImage } from "./pixels";
import { getSdg, type SdgId } from "./sdg";

const INK = "#1B2333";
const WHITE = "#FFFFFF";
const GOLD = "#FFD75E";

/** 전투에서 스킬을 쓰면 나오는 효과의 모양 — 목표마다 하나씩(웹의 무대가 그려요) */
export type SkillEffectKind =
  | "beacon" | "harvest" | "heal" | "pages" | "balance" | "jet" | "bolt" | "growth" | "gears"
  | "bridge" | "town" | "cycle" | "frost" | "wave" | "leaves" | "shield" | "link";

export interface SdgEmblem {
  id: SdgId;
  effect: SkillEffectKind;
}

/** 목표마다의 전투 효과(14 큰 파도 · 6 물대포 · 7 번개 …) */
export const SDG_EMBLEMS: Record<SdgId, SdgEmblem> = {
  1: { id: 1, effect: "beacon" },
  2: { id: 2, effect: "harvest" },
  3: { id: 3, effect: "heal" },
  4: { id: 4, effect: "pages" },
  5: { id: 5, effect: "balance" },
  6: { id: 6, effect: "jet" },
  7: { id: 7, effect: "bolt" },
  8: { id: 8, effect: "growth" },
  9: { id: 9, effect: "gears" },
  10: { id: 10, effect: "bridge" },
  11: { id: 11, effect: "town" },
  12: { id: 12, effect: "cycle" },
  13: { id: 13, effect: "frost" },
  14: { id: 14, effect: "wave" },
  15: { id: 15, effect: "leaves" },
  16: { id: 16, effect: "shield" },
  17: { id: 17, effect: "link" },
};

// 팔레트 번호: 1 = 테두리(INK, 자동) · 2 = 목표의 색 · 3 = 밝게 · 4 = 어둡게 · 5 = 흰색 · 6 = 금색 · 7 · 8 = 그림마다의 색
const [B, L, D, W, G, X, Y] = [2, 3, 4, 5, 6, 7, 8];

type Draw = (g: PixelGrid) => void;

/** 아래로 뾰족한 하트(가운데 x = 8) */
function heart(g: PixelGrid, top: number, c: number) {
  g.ellipse(5.5, top + 3, 3, 3, c).ellipse(10.5, top + 3, 3, 3, c);
  for (let y = top + 3; y <= top + 9; y++) {
    const half = Math.max(0, 6 - (y - top - 3));
    g.rect(8 - half, y, 7 + half, y, c);
  }
}

/** 네 갈래 반짝이 */
function twinkle(g: PixelGrid, x: number, y: number, c: number) {
  g.set(x, y, c).set(x - 1, y, c).set(x + 1, y, c).set(x, y - 1, c).set(x, y + 1, c);
}


/** 글자 지도로 칠해요: . = 비움, B L D W G X Y = 팔레트 2~8 */
function rows(g: PixelGrid, map: readonly string[]) {
  const index: Record<string, number> = { B, L, D, W, G, X, Y };
  map.forEach((row, y) => Array.from(row).forEach((ch, x) => index[ch] && g.set(x, y, index[ch])));
}

/** 세 점으로 된 삼각형을 칠해요(칸의 가운데가 안에 들면) */
function tri(g: PixelGrid, a: [number, number], b: [number, number], c: [number, number], color: number) {
  const area = (p: [number, number], q: [number, number], r: [number, number]) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  for (let y = 0; y < g.h; y++) {
    for (let x = 0; x < g.w; x++) {
      const pt: [number, number] = [x + 0.5, y + 0.5];
      const s1 = area(a, b, pt);
      const s2 = area(b, c, pt);
      const s3 = area(c, a, pt);
      if ((s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0)) g.set(x, y, color);
    }
  }
}

const DRAW: Record<SdgId, Draw> = {
  // 1 하트와 위로 오르는 빛 — 서로 돕는 마음
  1: (g) => {
    heart(g, 3, B);
    g.ellipse(5, 5.5, 1.2, 1.2, L).set(4, 5, W);
    g.recolor(9, 8, 13, 12, [B], D);
    twinkle(g, 13, 2, G);
    g.set(2, 2, G);
  },
  // 2 김이 나는 밥 한 그릇 — 굶주림 없이 배부르게
  2: (g) =>
    rows(g, [
      "................",
      ".....W....W.....",
      "......W....W....",
      ".....W....W.....",
      "................",
      "....WWWWWWWW....",
      "..WWWWWWWWWWWW..",
      ".LLLLLLLLLLLLLL.",
      ".BBBBBBBBBBBBBD.",
      "..BBBBBBBBBBBD..",
      "...BBBBBBBBBD...",
      "....BBBBBBBD....",
      "......DDDD......",
      ".....DDDDDD.....",
      "................",
      "................",
    ]),
  // 3 십자와 작은 하트 — 몸과 마음의 건강
  3: (g) => {
    g.rect(6, 2, 9, 13, B).rect(2, 6, 13, 9, B);
    g.rect(6, 2, 6, 13, L).rect(2, 6, 13, 6, L);
    g.rect(9, 7, 9, 13, D).rect(7, 9, 13, 9, D);
    g.ellipse(7.5, 7.5, 1.3, 1.3, W);
    twinkle(g, 13, 2, G);
  },
  // 4 펼친 책과 별 — 배움의 빛
  4: (g) => {
    g.rect(1, 7, 7, 13, W).rect(8, 7, 14, 13, W);
    g.line(1, 13, 7, 14, B).line(8, 14, 14, 13, B).rect(7, 7, 8, 14, D);
    for (const y of [9, 11]) g.rect(2, y, 5, y, L).rect(10, y, 13, y, L);
    twinkle(g, 8, 3, G);
    g.set(4, 4, G).set(12, 4, G);
  },
  // 5 천칭 — 양쪽이 똑같이 균형
  5: (g) => {
    g.rect(7, 2, 8, 12, D).rect(4, 13, 11, 14, D);
    g.rect(2, 4, 13, 4, B);
    g.line(2, 5, 1, 8, X).line(2, 5, 3, 8, X).line(13, 5, 12, 8, X).line(13, 5, 14, 8, X);
    g.rect(0, 9, 4, 9, B).rect(1, 10, 3, 10, B).rect(11, 9, 15, 9, B).rect(12, 10, 14, 10, B);
    g.set(7, 1, G).set(8, 1, G);
  },
  // 6 물방울 — 맑은 물
  6: (g) => {
    for (let y = 1; y <= 7; y++) {
      const half = Math.floor((y - 1) / 2);
      g.rect(8 - half - 1, y, 7 + half + 1, y, B);
    }
    g.ellipse(8, 10, 5, 4.5, B);
    g.recolor(9, 8, 13, 14, [B], D);
    g.ellipse(6, 9.5, 1.3, 2, L).set(6, 9, W).set(6, 10, W);
  },
  // 7 번개 — 깨끗한 에너지
  7: (g) => {
    rows(g, [
      "................",
      "........WWWWW...",
      ".......LLLLL....",
      "......LLLLL.....",
      ".....LLLLL......",
      "....BBBBBBBBBB..",
      "........BBBBB...",
      ".......BBBBB....",
      "......BBBBD.....",
      ".....BBBD.......",
      "....BBD.........",
      "...BD...........",
      "..D.............",
      "................",
      "................",
      "................",
    ]);
    g.set(13, 2, G).set(2, 7, G).set(12, 11, W);
  },
  // 8 오르는 막대와 화살표 — 일하는 보람과 성장
  8: (g) => {
    g.rect(1, 11, 3, 14, L).rect(5, 9, 7, 14, B).rect(9, 7, 11, 14, D);
    for (let t = 0; t <= 8; t++) g.set(2 + t, 11 - t, G).set(3 + t, 11 - t, G);
    tri(g, [9.5, 1], [14.6, 1], [14.6, 6.1], G);
  },
  // 9 톱니바퀴와 불꽃 — 아이디어로 만드는 산업
  9: (g) => {
    g.rect(7, 1, 8, 3, B).rect(7, 12, 8, 14, B).rect(1, 7, 3, 8, B).rect(12, 7, 14, 8, B);
    g.rect(3, 3, 4, 4, B).rect(11, 3, 12, 4, B).rect(3, 11, 4, 12, B).rect(11, 11, 12, 12, B);
    g.ellipse(8, 8, 4.3, 4.3, B);
    g.recolor(8, 8, 15, 15, [B], D);
    g.rect(5, 5, 5, 6, L).set(6, 4, L);
    g.ellipse(8, 8, 1.7, 1.7, 0);
    twinkle(g, 14, 1, G);
  },
  // 10 아치 다리 — 사람과 사람을 잇다
  10: (g) =>
    rows(g, [
      "................",
      "................",
      ".....LLLLLL.....",
      "...LLL....LLL...",
      "..LL..D..D..LL..",
      ".LL...D..D...LL.",
      ".L....D..D....L.",
      "BBBBBBBBBBBBBBBB",
      "DDDDDDDDDDDDDDDD",
      ".DD..........DD.",
      ".DD..........DD.",
      ".DD..........DD.",
      "XXXX..XXXX..XXXX",
      ".XX.XX.XX.XX.XX.",
      "................",
      "................",
    ]),
  // 11 집과 탑 — 살기 좋은 마을
  11: (g) => {
    g.rect(9, 3, 13, 14, D);
    for (const y of [5, 8, 11]) g.set(10, y, G).set(12, y, G);
    g.rect(2, 9, 8, 14, B);
    g.line(1, 9, 5, 5, L).line(5, 5, 9, 9, L).rect(3, 8, 7, 8, L).rect(4, 7, 6, 7, L).set(5, 6, L);
    g.rect(4, 11, 5, 14, X);
    g.set(7, 11, W);
  },
  // 12 쫓고 쫓기는 두 화살표 — 다시 쓰는 순환(위쪽 화살표는 오른쪽으로 내려가고, 아래쪽 화살표는 왼쪽으로 올라가요)
  12: (g) => {
    const cx = 7.5;
    const cy = 7.5;
    const deg = Math.PI / 180;
    const arc = (from: number, to: number, color: number) => {
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
          if (d < 3.9 || d > 6.1) continue;
          let a = Math.atan2(y + 0.5 - cy, x + 0.5 - cx) / deg;
          if (a < 0) a += 360;
          if (a >= from && a <= to) g.set(x, y, color);
        }
      }
    };
    const head = (end: number, color: number) => {
      const r = 5;
      const at = (angle: number, radius: number): [number, number] => [cx + Math.cos(angle * deg) * radius, cy + Math.sin(angle * deg) * radius];
      tri(g, at(end, r - 3), at(end, r + 3), at(end + 34, r), color);
    };
    arc(195, 330, B);
    head(330, B);
    arc(15, 150, D);
    head(150, D);
    g.set(5, 2, L).set(6, 2, L).set(4, 3, L);
  },
  // 13 눈 결정과 지구 — 지구를 식히는 시원한 바람
  13: (g) => {
    g.ellipse(6.5, 9.5, 5.5, 5.5, X);
    g.ellipse(4.8, 8.5, 2.3, 1.7, B).ellipse(8.5, 12, 1.9, 1.4, B).ellipse(8.8, 6.4, 1.2, 0.9, B);
    g.recolor(7, 10, 12, 15, [X], Y);
    g.rect(13, 1, 13, 5, W).rect(11, 3, 15, 3, W);
    g.set(5, 4, W).set(4, 5, W);
  },
  // 14 말려 오는 큰 파도와 물보라 — 바다를 깨끗하게
  14: (g) =>
    rows(g, [
      "................",
      "......WWWW......",
      "....WWLLLLWW....",
      "...WLLBBBBLLW...",
      "..WLBBBBBBBBLW..",
      "..LBBBDDDDBBBL..",
      ".LBBBD....DBBB..",
      ".LBBD...W..BBB..",
      ".BBBD..WBB.BBD..",
      ".BBBD..DBBBBD...",
      "WBBBBD..DDDD....",
      "BBBBBBD.......W.",
      "BBBBBBBBBWWBBBBW",
      "DBBBBBBBBBBBBBBB",
      "DDDDDDDDDDDDDDDD",
      "................",
    ]),
  // 15 큰 나무와 잎 — 숲과 땅의 생명
  15: (g) => {
    g.rect(7, 10, 8, 14, X).rect(5, 14, 10, 14, X);
    g.ellipse(8, 6.5, 5.5, 5, B);
    g.ellipse(6.5, 5, 2, 1.8, L);
    g.recolor(8, 7, 14, 11, [B], D);
    g.set(13, 13, B).set(14, 12, L).set(2, 12, L);
  },
  // 16 별이 새겨진 방패 — 평화와 정의
  16: (g) => {
    g.rect(3, 2, 12, 9, B);
    for (let y = 10; y <= 14; y++) g.rect(3 + (y - 9), y, 12 - (y - 9), y, B);
    g.recolor(8, 2, 12, 14, [B], D);
    g.rect(3, 2, 12, 2, L);
    twinkle(g, 8, 7, G);
    g.set(7, 9, G).set(9, 9, G);
  },
  // 17 이어진 고리 두 개 — 모두의 파트너십
  17: (g) => {
    g.ellipse(5.5, 8, 4.5, 4.5, B).ellipse(5.5, 8, 2.4, 2.4, 0);
    g.ellipse(10.5, 8, 4.5, 4.5, L).ellipse(10.5, 8, 2.4, 2.4, 0);
    // 겹치는 곳: 왼쪽 고리가 위로 지나가게
    g.recolor(8, 4, 9, 7, [L], B);
    twinkle(g, 13, 2, G);
  },
};

const cache = new Map<SdgId, PixelImage>();

/** 목표의 문장(16×16, 테두리 포함) */
export function sdgEmblem(id: SdgId): PixelImage {
  const hit = cache.get(id);
  if (hit) return hit;
  const g = new PixelGrid(16, 16);
  DRAW[id](g);
  g.outline(1);
  const base = getSdg(id).color;
  const extra: Record<number, [string, string]> = {
    2: ["#7A5A1E", base],
    5: [darken(base, 0.35), base],
    10: ["#2E86C1", base],
    11: ["#7A4A22", base],
    13: ["#2E86C1", "#1F5F8B"],
    15: ["#7A4A22", base],
  };
  const [x, y] = extra[id] ?? [darken(base, 0.45), lighten(base, 0.6)];
  const image = { w: 16, h: 16, data: g.toRgba([null, INK, base, lighten(base, 0.45), darken(base, 0.3), WHITE, GOLD, x, y]) };
  cache.set(id, image);
  return image;
}

