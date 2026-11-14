// 앱의 아이콘 · 로고(#44): 밧줄을 감은 놋쇠 나침반과 밤바다 — 해적의 항해를 떠올리게 하는 이 앱만의 픽셀 그림(48×48).
// 어떤 작품의 소품도 본뜨지 않았어요. 웹의 왼쪽 위 로고 · 언어 선택 · 시작 화면과 앱의 머리글이 같은 그림을 쓰고,
// 앱 아이콘 · 웹 아이콘 PNG 는 scripts/make-icons.ts 가 이 그림으로 만들어요.
import { hexToRgba, type PixelImage } from "./pixels";

export const LOGO_SIZE = 48;
const C = (LOGO_SIZE - 1) / 2;

const PALETTE = {
  navy: "#0E1A33",
  navy2: "#13213B",
  wave: "#2B5A8F",
  wave2: "#4F86C2",
  brassDark: "#5E3F14",
  brassMid: "#A8782A",
  brassLight: "#DDB052",
  brassHi: "#FFE7A0",
  parch: "#F6E7C3",
  parchShade: "#E6CC95",
  parchDark: "#B8925A",
  ink: "#4A3218",
  red: "#E0402F",
  redDark: "#9C2116",
  blue: "#2A4C86",
  blueDark: "#16294D",
  ropeLight: "#D9B77A",
  ropeMid: "#B8924F",
  ropeDark: "#8E6B38",
} as const;

/** 앱 아이콘의 바탕(밤바다)과 같은 색 — 아이콘의 여백 · 안드로이드 적응형 아이콘의 바탕 */
export const LOGO_BACKGROUND = PALETTE.navy2;

type Rgba = [number, number, number, number];

class Canvas {
  readonly data = new Uint8ClampedArray(LOGO_SIZE * LOGO_SIZE * 4);
  put(x: number, y: number, hex: string) {
    if (x < 0 || y < 0 || x >= LOGO_SIZE || y >= LOGO_SIZE) return;
    this.data.set(hexToRgba(hex) as Rgba, (y * LOGO_SIZE + x) * 4);
  }
  /** 가운데에서의 거리가 r1 이상 r2 미만인 칸을 color(x, y, 거리, 각도)로 */
  ring(r1: number, r2: number, color: (d: number, a: number) => string) {
    for (let y = 0; y < LOGO_SIZE; y++) {
      for (let x = 0; x < LOGO_SIZE; x++) {
        const d = Math.hypot(x - C, y - C);
        if (d >= r1 && d < r2) this.put(x, y, color(d, Math.atan2(y - C, x - C)));
      }
    }
  }
  /** 세 점으로 된 삼각형(칸의 가운데가 안에 들면) */
  tri(a: [number, number], b: [number, number], c: [number, number], hex: string) {
    const side = (p: [number, number], q: [number, number], r: [number, number]) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
    for (let y = 0; y < LOGO_SIZE; y++) {
      for (let x = 0; x < LOGO_SIZE; x++) {
        const pt: [number, number] = [x + 0.5, y + 0.5];
        const s1 = side(a, b, pt);
        const s2 = side(b, c, pt);
        const s3 = side(c, a, pt);
        if ((s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0)) this.put(x, y, hex);
      }
    }
  }
}

/** 빛은 왼쪽 위에서 — 1 에 가까울수록 밝은 쪽 */
const lit = (a: number) => (-Math.cos(a) - Math.sin(a)) / Math.SQRT2;
const mod = (n: number, m: number) => ((n % m) + m) % m;

function sea(cv: Canvas) {
  for (let y = 0; y < LOGO_SIZE; y++) for (let x = 0; x < LOGO_SIZE; x++) cv.put(x, y, y < 30 ? PALETTE.navy2 : PALETTE.navy);
  // 픽셀 물결(아래쪽)과 별
  for (const [row, color] of [[33, PALETTE.wave], [38, PALETTE.wave2], [43, PALETTE.wave]] as const) {
    for (let x = 0; x < LOGO_SIZE; x++) if ((x + row) % 8 < 3) cv.put(x, row + (Math.floor(x / 4) % 2), color);
  }
  for (const [x, y] of [[6, 6], [40, 5], [35, 11], [9, 15], [44, 18]]) cv.put(x, y, PALETTE.brassHi);
}

function compass(cv: Canvas) {
  // 밧줄 테: 세 색의 비스듬한 꼬임, 그늘 쪽은 조금 어둡게
  cv.ring(19.5, 22.5, (d, a) => {
    const base = [PALETTE.ropeLight, PALETTE.ropeMid, PALETTE.ropeDark][mod(Math.floor((a / (2 * Math.PI)) * 34 + d * 1.15), 3)];
    return lit(a) < -0.55 && base === PALETTE.ropeLight ? PALETTE.ropeMid : base;
  });
  cv.ring(19, 19.9, () => PALETTE.brassDark);
  // 놋쇠 테: 왼쪽 위가 빛나요
  cv.ring(16, 19.5, (_, a) => {
    const l = lit(a);
    return l > 0.75 ? PALETTE.brassHi : l > 0.2 ? PALETTE.brassLight : l > -0.5 ? PALETTE.brassMid : PALETTE.brassDark;
  });
  // 양피지 문자판과 눈금 16개
  cv.ring(-1, 16, (d) => (d > 11.2 ? PALETTE.parchShade : PALETTE.parch));
  for (let k = 0; k < 16; k++) {
    const a = (k * 2 * Math.PI) / 16;
    for (let t = 0; t < (k % 4 === 0 ? 2 : 1); t++) cv.put(Math.round(C + Math.cos(a) * (14.6 - t)), Math.round(C + Math.sin(a) * (14.6 - t)), PALETTE.ink);
  }
  // 나침도: 대각선(짧게) → 동서 → 남북(바늘: 북은 빨강, 남은 남색), 반쪽씩 밝고 어둡게
  const at = (ang: number, r: number): [number, number] => [C + 0.5 + Math.cos(ang) * r, C + 0.5 + Math.sin(ang) * r];
  const point = (ang: number, len: number, width: number, light: string, dark: string) => {
    const tip = at(ang, len);
    cv.tri(tip, at(ang + Math.PI / 2, width), [C + 0.5, C + 0.5], light);
    cv.tri(tip, at(ang - Math.PI / 2, width), [C + 0.5, C + 0.5], dark);
  };
  for (let k = 0; k < 4; k++) point(Math.PI / 4 + (k * Math.PI) / 2, 8.2, 2.1, PALETTE.parchDark, PALETTE.ink);
  for (const ang of [0, Math.PI]) point(ang, 11.6, 2.7, PALETTE.parchDark, PALETTE.ink);
  point(-Math.PI / 2, 14, 2.9, PALETTE.red, PALETTE.redDark);
  point(Math.PI / 2, 14, 2.9, PALETTE.blue, PALETTE.blueDark);
  // 가운데 핀(놋쇠)
  const cx = Math.round(C);
  for (const dx of [-1, 0]) for (const dy of [-1, 0]) cv.put(cx + dx, cx + dy, dx + dy < 0 ? PALETTE.brassLight : PALETTE.brassMid);
}

let full: PixelImage | null = null;
let bare: PixelImage | null = null;

/** 로고 · 아이콘: 밤바다 위의 나침반(48×48, 빈칸 없음) */
export function compassLogo(): PixelImage {
  if (!full) {
    const cv = new Canvas();
    sea(cv);
    compass(cv);
    full = { w: LOGO_SIZE, h: LOGO_SIZE, data: cv.data };
  }
  return full;
}

/** 바탕 없이 나침반만(투명) — 안드로이드 적응형 아이콘의 앞 그림 · 시작 화면 */
export function compassOnly(): PixelImage {
  if (!bare) {
    const cv = new Canvas();
    compass(cv);
    bare = { w: LOGO_SIZE, h: LOGO_SIZE, data: cv.data };
  }
  return bare;
}
