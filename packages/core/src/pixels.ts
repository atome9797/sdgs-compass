// 픽셀 그림을 코드로 그려요(#38 전투 화면). 작은 격자에 타원 · 사각형 · 선을 칠하고, 테두리를 자동으로 둘러요.
// 결과는 RGBA 배열이라 웹의 WebGL 텍스처 · 2D 캔버스와 앱의 PNG(png.ts)가 같은 그림을 써요. 브라우저 없이 테스트할 수 있어요.

/** 0 = 투명, 1 이상 = 팔레트의 번호 */
export class PixelGrid {
  readonly w: number;
  readonly h: number;
  readonly px: Uint8Array;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.px = new Uint8Array(w * h);
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  get(x: number, y: number): number {
    return this.inside(x, y) ? this.px[y * this.w + x] : 0;
  }

  set(x: number, y: number, c: number): this {
    if (this.inside(x, y)) this.px[y * this.w + x] = c;
    return this;
  }

  /** 양 끝을 포함한 사각형 */
  rect(x0: number, y0: number, x1: number, y1: number, c: number): this {
    for (let y = Math.max(0, y0); y <= Math.min(this.h - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(this.w - 1, x1); x++) this.px[y * this.w + x] = c;
    return this;
  }

  /** 칸의 가운데(x+0.5, y+0.5)가 타원 안에 들면 칠해요 — 가운데가 정수면 짝수 폭으로 좌우가 똑같아요 */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: number): this {
    const x0 = Math.floor(cx - rx - 1);
    const x1 = Math.ceil(cx + rx + 1);
    const y0 = Math.floor(cy - ry - 1);
    const y1 = Math.ceil(cy + ry + 1);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, c);
      }
    }
    return this;
  }

  /** 브레젠험 직선 */
  line(x0: number, y0: number, x1: number, y1: number, c: number): this {
    let x = x0;
    let y = y0;
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x, y, c);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
    return this;
  }

  /** 범위 안에서 from 색들을 to 로 바꿔요 (줄무늬 · 그늘) */
  recolor(x0: number, y0: number, x1: number, y1: number, from: readonly number[], to: number): this {
    for (let y = Math.max(0, y0); y <= Math.min(this.h - 1, y1); y++) {
      for (let x = Math.max(0, x0); x <= Math.min(this.w - 1, x1); x++) if (from.includes(this.px[y * this.w + x])) this.px[y * this.w + x] = to;
    }
    return this;
  }

  /** 그림 둘레의 투명한 칸(위 · 아래 · 왼쪽 · 오른쪽이 그림에 닿는 칸)을 테두리 색으로 */
  outline(c: number): this {
    const add: number[] = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.px[y * this.w + x] !== 0) continue;
        const touches = [this.get(x - 1, y), this.get(x + 1, y), this.get(x, y - 1), this.get(x, y + 1)].some((v) => v !== 0 && v !== c);
        if (touches) add.push(y * this.w + x);
      }
    }
    for (const i of add) this.px[i] = c;
    return this;
  }

  /** 그려진(투명이 아닌) 칸 수 */
  filled(): number {
    let n = 0;
    for (const v of this.px) if (v !== 0) n++;
    return n;
  }

  /** 팔레트(번호 → "#RRGGBB" 또는 "#RRGGBBAA", 0 번은 무시)로 RGBA 배열을 만들어요 */
  toRgba(palette: readonly (string | null)[]): Uint8ClampedArray {
    const rgba = palette.map((hex) => (hex ? hexToRgba(hex) : ([0, 0, 0, 0] as const)));
    const out = new Uint8ClampedArray(this.w * this.h * 4);
    this.px.forEach((v, i) => {
      if (v === 0) return;
      const color = rgba[v];
      if (!color) throw new Error(`팔레트에 ${v} 번 색이 없어요`);
      out.set(color, i * 4);
    });
    return out;
  }
}

export interface PixelImage {
  w: number;
  h: number;
  data: Uint8ClampedArray;
}

export function hexToRgba(hex: string): [number, number, number, number] {
  const m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(hex);
  if (!m) throw new Error(`색 모양이 아니에요: ${hex}`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, m[2] ? parseInt(m[2], 16) : 255];
}

/** 두 색을 섞어요 (t = 0 이면 a, 1 이면 b) — 결과는 "#RRGGBB" */
export function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgba(a);
  const [br, bg, bb] = hexToRgba(b);
  const ch = (x: number, y: number) => Math.round(x + (y - x) * Math.min(1, Math.max(0, t))).toString(16).padStart(2, "0");
  return `#${ch(ar, br)}${ch(ag, bg)}${ch(ab, bb)}`.toUpperCase();
}

export const lighten = (hex: string, t: number) => mix(hex, "#FFFFFF", t);
export const darken = (hex: string, t: number) => mix(hex, "#000000", t);

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
/** 4×4 바이어 행렬의 문턱값 (0 이상 1 미만) — 옛 게임기처럼 두 색을 점점이 섞을 때 */
export function bayer(x: number, y: number): number {
  return (BAYER4[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
}

/** 늘 같은 값을 내는 0~1 난수 (반짝이 · 창문 배치처럼 매번 같은 그림이 나와야 하는 곳) */
export function hash01(n: number): number {
  let t = (n + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** 큰 그림(배경)용: RGBA 배열에 직접 칠하는 붓 */
export class PixelCanvas {
  readonly w: number;
  readonly h: number;
  readonly data: Uint8ClampedArray;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.data = new Uint8ClampedArray(w * h * 4);
  }

  set(x: number, y: number, hex: string): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.data.set(hexToRgba(hex), (y * this.w + x) * 4);
  }

  rect(x0: number, y0: number, x1: number, y1: number, hex: string): void {
    const color = hexToRgba(hex);
    for (let y = Math.max(0, y0); y <= Math.min(this.h - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(this.w - 1, x1); x++) this.data.set(color, (y * this.w + x) * 4);
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, hex: string): void {
    const color = hexToRgba(hex);
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) {
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        if (x < 0 || y < 0 || x >= this.w || y >= this.h) continue;
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.data.set(color, (y * this.w + x) * 4);
      }
    }
  }

  /** y0~y1 줄을 위에서 아래로 stops 색으로, 사이는 바이어 점무늬로 섞어요 */
  gradient(y0: number, y1: number, stops: readonly string[], x0 = 0, x1 = this.w - 1): void {
    const segments = stops.length - 1;
    for (let y = y0; y <= y1; y++) {
      const t = y1 === y0 ? 0 : ((y - y0) / (y1 - y0)) * segments;
      const i = Math.min(segments - 1, Math.floor(t));
      const local = t - i;
      for (let x = x0; x <= x1; x++) this.set(x, y, local > bayer(x, y) ? stops[i + 1] : stops[i]);
    }
  }

  /** 작은 그림(PixelGrid → RGBA)을 (x, y)에 붙여요. 투명한 칸은 건너뛰어요 */
  stamp(image: PixelImage, x: number, y: number): void {
    for (let j = 0; j < image.h; j++) {
      for (let i = 0; i < image.w; i++) {
        const k = (j * image.w + i) * 4;
        if (image.data[k + 3] === 0) continue;
        const tx = x + i;
        const ty = y + j;
        if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) continue;
        this.data.set(image.data.subarray(k, k + 4), (ty * this.w + tx) * 4);
      }
    }
  }

  image(): PixelImage {
    return { w: this.w, h: this.h, data: this.data };
  }
}
