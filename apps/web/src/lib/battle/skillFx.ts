// 스킬 효과(#42): SDG 목표마다 다른 모양 — 14 큰 파도 · 6 물대포 · 7 번개 · 15 나뭇잎 회오리 · 13 눈보라 …
// 무대(240×150)의 점(dot) 그리기 목록을 만드는 순수 함수예요(브라우저 없이 테스트). 색은 그 목표의 색과 흰색 · 금색.
// 화면에서 잘 보이게 큰 점(3~8칸)과 옅은 빛(반투명 원 · 기둥)을 섞어요. 모양은 이 앱이 정한 것이고, 다른 게임의 기술 연출을 따라 하지 않아요.
import type { SkillEffectKind } from "@sdgs-compass/core/emblems";
import { darken, hash01, lighten } from "@sdgs-compass/core/pixels";
import { STAGE } from "@sdgs-compass/core/sprites";
import type { DrawItem } from "./scene";

export interface FxInput {
  style: SkillEffectKind;
  /** 효과의 진행 0~1 */
  p: number;
  /** 그 목표의 색 "#RRGGBB" */
  color: string;
  /** 몬스터의 가운데와 발밑 */
  foe: { x: number; y: number; base: number };
  /** 앞에 선 용사의 가운데 */
  hero: { x: number; y: number };
}

const WHITE = "#FFFFFF";
const GOLD = "#FFD75E";
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ease = (v: number) => 1 - (1 - v) * (1 - v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** 0 → 1 → 0 (가운데에서 가장 커요) */
const bell = (p: number) => Math.sin(Math.PI * clamp01(p));

function dot(x: number, y: number, size: number, color: string, alpha = 1, h = size): DrawItem {
  return { tex: "dot", x: Math.round(x - size / 2), y: Math.round(y - h / 2), w: Math.max(1, Math.round(size)), h: Math.max(1, Math.round(h)), color, alpha: clamp01(alpha) };
}

function box(x: number, y: number, w: number, h: number, color: string, alpha = 1): DrawItem {
  return { tex: "dot", x: Math.round(x), y: Math.round(y), w: Math.max(1, Math.round(w)), h: Math.max(1, Math.round(h)), color, alpha: clamp01(alpha) };
}

/** 반투명 원(빛): 2칸 높이의 가로줄을 쌓아서 */
function glow(cx: number, cy: number, r: number, color: string, alpha: number): DrawItem[] {
  if (r < 2 || alpha <= 0) return [];
  const items: DrawItem[] = [];
  for (let dy = -r; dy < r; dy += 2) {
    const half = Math.sqrt(Math.max(0, r * r - (dy + 1) * (dy + 1)));
    if (half >= 1) items.push(box(cx - half, cy + dy, half * 2, 2, color, alpha));
  }
  return items;
}

/** 점 여러 개로 된 고리 */
function ring(cx: number, cy: number, r: number, n: number, size: number, color: string, alpha: number, spin = 0): DrawItem[] {
  return Array.from({ length: n }, (_, i) => {
    const a = spin + (i / n) * Math.PI * 2;
    return dot(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8, size, color, alpha);
  });
}

/** 다섯 점 십자(+) — s 는 한 칸의 크기 */
function plus(cx: number, cy: number, s: number, color: string, alpha: number): DrawItem[] {
  return [dot(cx, cy, s, color, alpha), dot(cx - s, cy, s, color, alpha), dot(cx + s, cy, s, color, alpha), dot(cx, cy - s, s, color, alpha), dot(cx, cy + s, s, color, alpha)];
}

/** 작은 하트(점 6개) */
function heart(cx: number, cy: number, s: number, color: string, alpha: number): DrawItem[] {
  return [dot(cx - s / 2, cy - s / 2, s, color, alpha), dot(cx + s / 2, cy - s / 2, s, color, alpha), dot(cx - s, cy, s, color, alpha), dot(cx, cy, s, color, alpha), dot(cx + s, cy, s, color, alpha), dot(cx, cy + s, s, color, alpha)];
}

/** 선분을 따라 정사각형을 찍어 굵은 선(빛줄기)을 */
function beam(x0: number, y0: number, x1: number, y1: number, size: number, color: string, alpha = 1): DrawItem[] {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(len / Math.max(2, size * 0.6)));
  return Array.from({ length: steps + 1 }, (_, i) => dot(lerp(x0, x1, i / steps), lerp(y0, y1, i / steps), size, color, alpha));
}

type Fx = (input: FxInput) => DrawItem[];

const FX: Record<SkillEffectKind, Fx> = {
  // 1 서로 돕는 등불: 몬스터 발밑에서 따뜻한 빛 기둥이 서고, 하트가 떠올라요
  beacon: ({ p, color, foe }) => {
    const items: DrawItem[] = [];
    const w = 30 * bell(p);
    items.push(box(foe.x - w / 2, 0, w, foe.base, GOLD, 0.28 * bell(p)), box(foe.x - w / 6, 0, w / 3, foe.base, WHITE, 0.4 * bell(p)));
    for (let i = 0; i < 7; i++) {
      const t = clamp01(p * 1.4 - i * 0.08);
      if (t <= 0 || t >= 1) continue;
      items.push(...heart(foe.x - 26 + hash01(i + 5) * 52, foe.base - 6 - t * 70, 3, i % 2 ? color : lighten(color, 0.35), 1 - t));
    }
    items.push(...ring(foe.x, foe.base - 4, 8 + ease(p) * 40, 16, 3, GOLD, 1 - p));
    return items;
  },
  // 2 풍년의 선물: 금빛 낟알이 몬스터 위로 쏟아지고, 둘레가 금빛으로 빛나요
  harvest: ({ p, color, foe }) => {
    const items: DrawItem[] = glow(foe.x, foe.y, 34, GOLD, 0.22 * bell(p));
    for (let i = 0; i < 28; i++) {
      const t = clamp01(p * 1.5 - hash01(i + 11) * 0.5);
      if (t <= 0) continue;
      const y = lerp(-8 - hash01(i + 5) * 40, foe.base - hash01(i + 2) * 10, t * t);
      const big = i % 3 === 0;
      items.push(dot(foe.x - 48 + hash01(i + 1) * 96, y, big ? 5 : 4, i % 5 === 0 ? WHITE : i % 2 ? GOLD : color, t >= 1 ? 1 - clamp01((p - 0.75) / 0.25) : 1, big ? 3 : 4));
    }
    return items;
  },
  // 3 치유의 십자: 초록 빛 속에서 큰 십자가 떠올라요
  heal: ({ p, color, foe }) => {
    const items: DrawItem[] = glow(foe.x, foe.y, 30, lighten(color, 0.3), 0.22 * bell(p));
    for (let i = 0; i < 7; i++) {
      const t = clamp01(p * 1.4 - i * 0.07);
      if (t <= 0 || t >= 1) continue;
      items.push(...plus(foe.x - 34 + hash01(i + 2) * 68, foe.base - 6 - t * 64, 4, i % 2 ? WHITE : lighten(color, 0.15), 1 - t * 0.9));
    }
    items.push(...ring(foe.x, foe.y, 10 + ease(p) * 30, 12, 3, WHITE, 1 - p));
    return items;
  },
  // 4 배움의 페이지: 흰 종이가 용사에게서 몬스터로 펄럭이며 날아가 빛나요
  pages: ({ p, color, foe, hero }) => {
    const items: DrawItem[] = [];
    for (let i = 0; i < 9; i++) {
      const t = clamp01((p - i * 0.05) / 0.6);
      if (t <= 0 || t >= 1) continue;
      const x = lerp(hero.x, foe.x, ease(t)) + Math.sin(t * 9 + i) * 4;
      const y = lerp(hero.y - 10, foe.y, t) - Math.sin(t * Math.PI) * (30 + i * 2);
      const flap = Math.floor(t * 10 + i) % 2 === 0;
      const w = flap ? 9 : 5;
      items.push(box(x - w / 2, y - 5, w, 11, WHITE), box(x - w / 2, y - 5, w, 2, color), box(x - w / 2 + 1, y, w - 2, 1, lighten(color, 0.5)));
    }
    if (p > 0.55) items.push(...glow(foe.x, foe.y, 10 + (p - 0.55) * 50, GOLD, 0.3 * (1 - (p - 0.55) / 0.45)), ...ring(foe.x, foe.y, 10 + (p - 0.55) * 70, 12, 3, GOLD, 1 - (p - 0.55) / 0.45));
    return items;
  },
  // 5 균형의 저울: 양쪽에서 똑같은 빛줄기가 내려와 한가운데서 만나 터져요
  balance: ({ p, color, foe }) => {
    const items: DrawItem[] = [];
    const head = clamp01(p / 0.5);
    for (const side of [-1, 1]) {
      const x0 = foe.x + side * 80;
      const y0 = foe.y - 60;
      const tail = Math.max(0, head - 0.45);
      items.push(...beam(lerp(x0, foe.x, tail), lerp(y0, foe.y, tail), lerp(x0, foe.x, head), lerp(y0, foe.y, head), 6, color, p < 0.6 ? 1 : 0));
      items.push(...beam(lerp(x0, foe.x, tail), lerp(y0, foe.y, tail), lerp(x0, foe.x, head), lerp(y0, foe.y, head), 2, WHITE, p < 0.6 ? 1 : 0));
    }
    if (p > 0.5) {
      const s = (p - 0.5) / 0.5;
      items.push(...glow(foe.x, foe.y, 10 + s * 30, lighten(color, 0.3), 0.4 * (1 - s)), ...ring(foe.x, foe.y, 8 + s * 50, 14, 4, color, 1 - s), ...ring(foe.x, foe.y, 4 + s * 36, 10, 3, WHITE, 1 - s));
    }
    return items;
  },
  // 6 맑은 물 대포: 용사에게서 몬스터까지 굵은 물줄기, 맞으면 크게 물보라
  jet: ({ p, color, foe, hero }) => {
    const items: DrawItem[] = [];
    const head = clamp01(p / 0.4);
    const tail = clamp01((p - 0.35) / 0.4);
    if (head > tail) {
      const sx = hero.x + 10;
      const sy = hero.y - 10;
      for (let i = 0; i <= 26; i++) {
        const t = lerp(tail, head, i / 26);
        const wob = Math.sin(i * 1.7 + p * 40) * 1.5;
        const x = lerp(sx, foe.x, t);
        const y = lerp(sy, foe.y, t) + wob;
        items.push(dot(x, y, 8, color, 0.9), dot(x, y, 3, WHITE));
      }
    }
    if (p > 0.38) {
      const s = (p - 0.38) / 0.62;
      items.push(...glow(foe.x, foe.y, 8 + s * 20, lighten(color, 0.5), 0.45 * (1 - s)));
      for (let i = 0; i < 18; i++) {
        const a = -Math.PI * (0.05 + hash01(i + 4) * 0.9);
        const speed = 22 + hash01(i + 9) * 34;
        items.push(dot(foe.x + Math.cos(a) * speed * s, foe.y + Math.sin(a) * speed * s + 46 * s * s, i % 3 === 0 ? 5 : 3, i % 2 ? WHITE : color, 1 - s));
      }
    }
    return items;
  },
  // 7 번개 충전: 하늘이 번쩍이고, 굵은 지그재그 번개가 몬스터에게 떨어져요
  bolt: ({ p, color, foe }) => {
    const items: DrawItem[] = [];
    if ((p > 0.12 && p < 0.2) || (p > 0.42 && p < 0.46)) items.push(box(0, 0, STAGE.w, STAGE.h, WHITE, p < 0.3 ? 0.45 : 0.25));
    const off = (p > 0.3 && p < 0.34) || p > 0.72;
    if (!off) {
      const reach = clamp01(p / 0.16);
      const steps = 6;
      let x = foe.x + 18;
      let y = -6;
      for (let s = 0; s < steps; s++) {
        const nx = s === steps - 1 ? foe.x : foe.x + (s % 2 === 0 ? -16 : 14) + (hash01(s + 21) - 0.5) * 8;
        const ny = lerp(-6, foe.y, (s + 1) / steps);
        const t0 = s / steps;
        if (t0 >= reach) break;
        const part = clamp01((reach - t0) * steps);
        items.push(...beam(x, y, lerp(x, nx, part), lerp(y, ny, part), 7, color), ...beam(x, y, lerp(x, nx, part), lerp(y, ny, part), 3, WHITE));
        x = nx;
        y = ny;
      }
    }
    if (p > 0.16) {
      const s = (p - 0.16) / 0.84;
      items.push(...glow(foe.x, foe.y, 14 + s * 16, lighten(color, 0.4), 0.35 * (1 - s)));
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + hash01(i) * 0.4;
        items.push(dot(foe.x + Math.cos(a) * (10 + s * 40), foe.y + Math.sin(a) * (8 + s * 30), 3, i % 2 ? WHITE : GOLD, 1 - s));
      }
    }
    return items;
  },
  // 8 성장의 화살: 몬스터 앞에 막대 그래프가 쑥쑥 자라고, 금빛 화살이 위로 솟아요
  growth: ({ p, color, foe }) => {
    const items: DrawItem[] = [];
    const fade = 1 - clamp01((p - 0.8) / 0.2);
    [-36, -18, 0, 18, 36].forEach((dx, i) => {
      const h = Math.round(ease(clamp01(p * 1.7 - i * 0.09)) * (14 + i * 9));
      if (h > 0) items.push(box(foe.x + dx - 6, foe.base + 2 - h, 12, h, i % 2 ? darken(color, 0.1) : lighten(color, 0.25), 0.92 * fade), box(foe.x + dx - 6, foe.base + 2 - h, 12, 2, WHITE, fade));
    });
    for (let i = 0; i < 6; i++) {
      const t = clamp01(p * 1.3 - i * 0.1);
      if (t <= 0 || t >= 1) continue;
      const x = foe.x - 40 + i * 16 + t * 8;
      const y = foe.base - 10 - t * 80;
      items.push(dot(x, y, 5, GOLD), dot(x - 4, y + 4, 4, GOLD), dot(x + 4, y + 4, 4, GOLD), dot(x, y + 6, 3, GOLD));
    }
    return items;
  },
  // 9 번뜩이는 톱니바퀴: 큰 톱니가 몬스터 둘레를 돌고, 불꽃이 튀어요
  gears: ({ p, color, foe }) => {
    const items: DrawItem[] = [];
    const fade = 1 - clamp01((p - 0.8) / 0.2);
    const spin = p * Math.PI * 3;
    for (let i = 0; i < 10; i++) {
      const a = spin + (i / 10) * Math.PI * 2;
      items.push(dot(foe.x + Math.cos(a) * 34, foe.y + Math.sin(a) * 27, 8, i % 2 ? color : darken(color, 0.2), fade));
    }
    items.push(...ring(foe.x, foe.y, 26, 20, 4, lighten(color, 0.3), fade * 0.9, -spin));
    for (let i = 0; i < 16; i++) {
      const t = (p * 3 + hash01(i + 8)) % 1;
      const a = hash01(i + 30) * Math.PI * 2;
      items.push(dot(foe.x + Math.cos(a) * (10 + t * 40), foe.y + Math.sin(a) * (10 + t * 30), 3, i % 2 ? GOLD : WHITE, (1 - t) * fade));
    }
    return items;
  },
  // 10 함께 잇는 다리: 용사와 몬스터 사이에 굵은 빛의 아치가 놓여요
  bridge: ({ p, color, foe, hero }) => {
    const items: DrawItem[] = [];
    const fade = 1 - clamp01((p - 0.8) / 0.2);
    const n = 36;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      if (t > p * 1.6) break;
      const x = lerp(hero.x + 4, foe.x, t);
      const y = lerp(hero.y - 14, foe.y, t) - Math.sin(t * Math.PI) * 50;
      items.push(dot(x, y, 7, i % 4 === 0 ? lighten(color, 0.45) : color, fade), dot(x, y - 1, 3, WHITE, fade));
    }
    if (p > 0.62) {
      const s = (p - 0.62) / 0.38;
      items.push(...glow(foe.x, foe.y, 8 + s * 22, lighten(color, 0.4), 0.4 * (1 - s)), ...ring(foe.x, foe.y, 8 + s * 50, 12, 3, GOLD, 1 - s));
    }
    return items;
  },
  // 11 마을 살리기: 몬스터 둘레에 집들이 쑥쑥 솟아나요(창에 불이 켜져요)
  town: ({ p, color, foe }) => {
    const items: DrawItem[] = [];
    [-42, -21, 21, 42, 0].forEach((dx, i) => {
      const raw = clamp01(p * 1.8 - i * 0.12);
      const t = raw < 0.7 ? ease(raw / 0.7) * 1.15 : 1.15 - 0.15 * ((raw - 0.7) / 0.3);
      if (t <= 0) return;
      const w = 18 * t;
      const h = 14 * t;
      const bx = foe.x + dx - w / 2;
      const by = foe.base + 6 - h - (i === 4 ? 30 : 0);
      items.push(box(bx, by, w, h, i % 2 ? color : lighten(color, 0.3)));
      for (let r = 0; r < 4; r++) items.push(box(bx - 2 + r * 2.4 * t, by - (r + 1) * 2.6 * t, Math.max(1, w + 4 - r * 4.8 * t), Math.max(1, 2.6 * t), darken(color, 0.35)));
      if (raw > 0.6) items.push(box(bx + w * 0.2, by + h * 0.3, 3, 3, GOLD), box(bx + w * 0.62, by + h * 0.3, 3, 3, GOLD));
    });
    return items;
  },
  // 12 리사이클 루프: 두 화살표가 몬스터 둘레를 쫓고 쫓기며 돌다가 모여요
  cycle: ({ p, color, foe }) => {
    const items: DrawItem[] = [];
    const r = 38 - p * 16;
    items.push(...ring(foe.x, foe.y, r, 28, 3, lighten(color, 0.45), 0.55 * (1 - p)));
    for (let k = 0; k < 2; k++) {
      const headA = p * Math.PI * 4 + k * Math.PI;
      for (let i = 0; i < 16; i++) {
        const a = headA - i * 0.11;
        items.push(dot(foe.x + Math.cos(a) * r, foe.y + Math.sin(a) * r * 0.75, i === 0 ? 11 : Math.max(3, 8 - i * 0.35), i === 0 ? GOLD : k ? darken(color, 0.1) : lighten(color, 0.3), 1 - i / 17));
      }
    }
    if (p > 0.75) items.push(...glow(foe.x, foe.y, 10 + (p - 0.75) * 60, lighten(color, 0.4), 0.4 * (1 - (p - 0.75) / 0.25)));
    return items;
  },
  // 13 시원한 폭풍: 차가운 바람이 불고 큰 눈 결정이 몬스터를 감싸요
  frost: ({ p, color, foe }) => {
    const items: DrawItem[] = [box(0, 0, STAGE.w, STAGE.h, "#E8F6FF", 0.26 * bell(p)), ...glow(foe.x, foe.y, 30, WHITE, 0.22 * bell(p))];
    for (let i = 0; i < 16; i++) {
      const t = (p * 1.1 + hash01(i + 40)) % 1;
      const x = foe.x + 60 - t * 120 + Math.sin(t * 8 + i) * 6;
      const y = foe.y - 44 + hash01(i + 17) * 80 + t * 12;
      const big = i % 3 === 0;
      const a = 1 - Math.abs(t - 0.5) * 1.5;
      items.push(...plus(x, y, big ? 4 : 3, i % 2 ? WHITE : lighten(color, 0.55), a));
      if (big) items.push(dot(x - 5, y - 5, 3, WHITE, a), dot(x + 5, y - 5, 3, WHITE, a), dot(x - 5, y + 5, 3, WHITE, a), dot(x + 5, y + 5, 3, WHITE, a));
    }
    for (let i = 0; i < 7; i++) {
      const t = (p * 2 + hash01(i + 60)) % 1;
      const x = foe.x + 80 - t * 160;
      const y = foe.y - 36 + i * 12;
      items.push(box(x, y, 18, 2, WHITE, 0.75 * (1 - t)));
    }
    return items;
  },
  // 14 큰 파도 청소: 왼쪽에서 큰 파도가 밀려와 몬스터를 덮쳐요(물마루는 흰 물보라)
  wave: ({ p, color, foe }) => {
    const items: DrawItem[] = [];
    const front = -40 + ease(p) * 330;
    const fade = 1 - clamp01((p - 0.75) / 0.25);
    for (let x = front - 150; x <= front; x += 4) {
      if (x < -4 || x > STAGE.w) continue;
      const near = clamp01((front - x) / 26);
      const h = Math.round(18 + 34 * (1 - Math.abs(near - 0.35)) + 6 * Math.sin((x + p * 120) / 11));
      const top = STAGE.h - h;
      items.push(box(x, top, 4, h, color, 0.86 * fade), box(x, top + 6, 4, Math.max(1, h - 6), darken(color, 0.15), 0.6 * fade), box(x, top, 4, 3, WHITE, fade));
    }
    // 물마루의 물보라
    for (let i = 0; i < 12; i++) {
      const a = hash01(i + 70) * Math.PI;
      items.push(dot(front + 4 + Math.cos(a) * 10, STAGE.h - 54 - Math.sin(a) * 12 - hash01(i) * 8, i % 3 === 0 ? 4 : 3, WHITE, fade));
    }
    if (front > foe.x) items.push(...ring(foe.x, foe.y, 6 + (front - foe.x) * 0.15, 10, 3, WHITE, fade * 0.8));
    return items;
  },
  // 15 숲의 회오리바람: 나뭇잎이 몬스터 둘레를 크게 맴돌며 솟아올라요
  leaves: ({ p, color, foe }) => {
    const items: DrawItem[] = [];
    for (let i = 0; i < 24; i++) {
      const a = p * Math.PI * 6 + (i / 24) * Math.PI * 2;
      const rise = (p * 70 + i * 3.5) % 84;
      const r = 32 - rise * 0.2;
      const flip = Math.floor(p * 16 + i) % 2 === 0;
      const tint = i % 3 === 0 ? lighten(color, 0.35) : i % 3 === 1 ? color : darken(color, 0.25);
      items.push(dot(foe.x + Math.cos(a) * r, foe.base - 4 - rise, flip ? 7 : 4, tint, 1 - rise / 90, flip ? 4 : 6));
    }
    items.push(...glow(foe.x, foe.y + 6, 24, lighten(color, 0.4), 0.16 * bell(p)));
    return items;
  },
  // 16 평화의 방패: 용사 앞에 빛의 방패가 생기고, 물결처럼 몬스터 쪽으로 퍼져요
  shield: ({ p, color, foe, hero }) => {
    const items: DrawItem[] = [];
    const appear = clamp01(p / 0.25);
    const keep = 1 - clamp01((p - 0.6) / 0.2);
    if (keep > 0) {
      items.push(...glow(hero.x + 8, hero.y - 10, 36 * appear, lighten(color, 0.35), 0.32 * keep));
      items.push(...ring(hero.x + 8, hero.y - 10, 36 * appear, 26, 4, Math.floor(p * 20) % 2 ? WHITE : lighten(color, 0.3), keep));
    }
    if (p > 0.35) {
      const t = (p - 0.35) / 0.65;
      const cx = lerp(hero.x + 8, foe.x, t);
      const cy = lerp(hero.y - 10, foe.y, t);
      items.push(...glow(cx, cy, 14 + t * 10, lighten(color, 0.4), 0.3 * (1 - t)), ...ring(cx, cy, 16 + t * 14, 18, 5, color, 1 - t * 0.5), ...ring(cx, cy, 8 + t * 6, 12, 3, WHITE, 1 - t));
    }
    return items;
  },
  // 17 모두의 연결: 용사에서 몬스터까지 고리가 하나씩 이어지고, 몬스터를 감싸요
  link: ({ p, color, foe, hero }) => {
    const items: DrawItem[] = [];
    const fade = 1 - clamp01((p - 0.8) / 0.2);
    for (let k = 0; k < 6; k++) {
      const show = clamp01(p * 2.2 - k * 0.22);
      if (show <= 0) continue;
      const t = (k + 0.5) / 6;
      const cx = lerp(hero.x + 6, foe.x, t);
      const cy = lerp(hero.y - 10, foe.y, t) - Math.sin(t * Math.PI) * 20;
      items.push(...ring(cx, cy, 9 * show, 12, 3, k % 2 ? color : lighten(color, 0.45), fade, k));
    }
    if (p > 0.65) {
      const s = (p - 0.65) / 0.35;
      items.push(...ring(foe.x, foe.y, 12 + s * 26, 16, 4, lighten(color, 0.4), 1 - s), ...ring(foe.x, foe.y, 8 + s * 18, 12, 3, GOLD, 1 - s));
    }
    return items;
  },
};

/** 스킬 효과의 그리기 목록 (p 가 0 이하 · 1 이상이면 아무것도 없어요) */
export function skillFx(input: FxInput): DrawItem[] {
  if (input.p <= 0 || input.p >= 1) return [];
  return FX[input.style](input);
}
