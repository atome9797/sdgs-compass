// 용사의 동상(#48): 피드(「SDGs冒険新聞」)의 수상 기사에 세우는 픽셀 그림 — 돌 받침대 위의 용사(앞모습), 상에 따라 금 · 은 · 동.
// 용사 그림(sprites.ts 의 heroFront)의 밝기를 금속의 4단 색으로 바꿔서 동상처럼 만들어요. 받침대 가운데에는 금속 명판.
// 모두 이 앱만의 그림이에요(실제 동상 · 다른 작품의 트로피를 본뜨지 않아요). 웹은 PNG 데이터 URI, 앱은 같은 PNG 를 <Image> 로.
import type { AwardKind } from "./domain";
import { PixelCanvas, type PixelImage } from "./pixels";
import { heroFront } from "./sprites";

export const STATUE_SIZE = { w: 40, h: 56 } as const;

/** 상마다의 금속(어두움 → 밝음): 최우수상 금 · 우수상 은 · 특별상 동 */
export const STATUE_METALS: Record<AwardKind, readonly [string, string, string, string]> = {
  grand: ["#6B4A12", "#B8862B", "#E6B84A", "#FFE9A6"],
  excellence: ["#454D5A", "#86909F", "#C2CAD5", "#F1F4F8"],
  special: ["#4F2D16", "#8E5A30", "#C38554", "#EDC39A"],
};

const INK = "#1B2333";
const STONE = { dark: "#5B6270", mid: "#8A93A3", light: "#B8C0CC" } as const;

const cache = new Map<AwardKind, PixelImage>();

/** 테두리(INK) 1칸을 두른 돌 덩어리: 왼쪽 위가 밝고 오른쪽이 어두워요 */
function stoneBlock(cv: PixelCanvas, x0: number, y0: number, x1: number, y1: number): void {
  cv.rect(x0, y0, x1, y1, INK);
  cv.rect(x0 + 1, y0 + 1, x1 - 1, y1 - 1, STONE.mid);
  cv.rect(x0 + 1, y0 + 1, x1 - 1, y0 + 1, STONE.light);
  cv.rect(x0 + 1, y0 + 1, x0 + 1, y1 - 1, STONE.light);
  cv.rect(x1 - 1, y0 + 2, x1 - 1, y1 - 1, STONE.dark);
}

export function heroStatue(award: AwardKind): PixelImage {
  const hit = cache.get(award);
  if (hit) return hit;
  const [m0, m1, m2, m3] = STATUE_METALS[award];
  const cv = new PixelCanvas(STATUE_SIZE.w, STATUE_SIZE.h);

  // 땅 그림자 → 아래판 · 몸통 · 위판
  cv.rect(5, 52, 34, 53, "#1B233333");
  stoneBlock(cv, 4, 47, 35, 51);
  stoneBlock(cv, 9, 35, 30, 47);
  stoneBlock(cv, 6, 31, 33, 35);
  // 명판(금속): 테두리 · 윗줄 빛 · 글씨 줄 두 개
  cv.rect(13, 38, 26, 44, m0);
  cv.rect(14, 39, 25, 43, m1);
  cv.rect(14, 39, 25, 39, m2);
  cv.rect(16, 41, 23, 41, m0);
  cv.rect(17, 43, 22, 43, m0);

  // 용사(앞모습)의 밝기 → 금속 색. 테두리는 가장 어두운 금속이라 금속 덩어리처럼 보여요
  const hero = heroFront("#808080");
  const ox = Math.round((STATUE_SIZE.w - hero.w) / 2);
  const oy = 31 - hero.h + 1;
  for (let y = 0; y < hero.h; y++) {
    for (let x = 0; x < hero.w; x++) {
      const i = (y * hero.w + x) * 4;
      if (hero.data[i + 3] === 0) continue;
      const lum = (0.299 * hero.data[i] + 0.587 * hero.data[i + 1] + 0.114 * hero.data[i + 2]) / 255;
      let shade = lum < 0.22 ? 0 : lum < 0.5 ? 1 : lum < 0.8 ? 2 : 3;
      // 빛은 왼쪽 위에서 — 오른쪽 1/3 은 한 단 어둡게, 왼쪽 가장자리의 밝은 칸은 한 단 밝게(입체감)
      if (x >= Math.round(hero.w * 0.62) && shade > 0) shade -= 1;
      else if (x <= Math.round(hero.w * 0.3) && shade === 2) shade = 3;
      cv.set(ox + x, oy + y, [m0, m1, m2, m3][shade]);
    }
  }
  // 반짝임: 최우수상은 별 셋, 그 밖은 하나
  const sparkles: [number, number][] = award === "grand" ? [[4, 9], [35, 6], [36, 20]] : [[35, 8]];
  for (const [x, y] of sparkles) {
    cv.set(x, y, m3);
    cv.set(x - 1, y, m2);
    cv.set(x + 1, y, m2);
    cv.set(x, y - 1, m2);
    cv.set(x, y + 1, m2);
  }

  const image: PixelImage = { w: cv.w, h: cv.h, data: cv.data };
  cache.set(award, image);
  return image;
}
