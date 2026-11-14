// 전투 화면(#38)의 움직임: 시각 t(ms)에 무엇을 어디에 그릴지(그리기 목록)를 계산해요. 그리는 쪽(WebGL · 2D)은 이 목록만 따라 그려요.
// 순수 함수라 브라우저 없이 테스트해요. 위치는 모두 내부 해상도(STAGE 240×150)의 정수 칸 — 픽셀 그림이 또렷하게 보이도록.
import { hash01 } from "./pixels";
import { FOE_BASE, HERO_BASE, STAGE } from "./sprites";

export type TextureKey = "bg" | "foe" | "hero0" | "hero1" | "hero2" | "cloud" | "dot";

export interface DrawItem {
  tex: TextureKey;
  x: number;
  y: number;
  w: number;
  h: number;
  /** 0~1 (기본 1) */
  alpha?: number;
  /** 하얗게 번쩍임 0~1 */
  flash?: number;
  /** 흑백 0~1 (쓰러진 몬스터) */
  gray?: number;
  /** 점(dot)에 입히는 색 "#RRGGBB" */
  color?: string;
  /** 배경의 물결 세기 (바다만) */
  wave?: number;
}

/** intro = 등장 · skill = 스킬 사용(색 = 스킬의 SDG 색) · fight = 도전 · run = 도망 · clear = 쓰러짐(クエスト達成) */
export type EffectKind = "intro" | "skill" | "fight" | "run" | "clear";
export interface Effect {
  kind: EffectKind;
  /** 시작 시각(ms) */
  start: number;
  color?: string;
}

export const DURATION: Record<EffectKind, number> = { intro: 700, skill: 1000, fight: 650, run: 600, clear: 1100 };

export interface SceneInput {
  t: number;
  effects: readonly Effect[];
  /** 몬스터가 이미 쓰러졌는지(기획서를 낸 퀘스트) */
  defeated: boolean;
  /** 움직임 줄이기 — 등장 · 흔들림 · 불꽃이 없고, 끝난 모습만 */
  reduced: boolean;
  /** 바다 배경이면 물결 */
  sea: boolean;
  foeSize: { w: number; h: number };
  heroSize: { w: number; h: number };
}

const SCALE = 2;
const ease = (p: number) => 1 - (1 - p) * (1 - p);
const clamp01 = (p: number) => Math.min(1, Math.max(0, p));

/** 그 효과가 지금 몇 % 진행됐는지 (없으면 null, 끝났으면 1) */
function progressOf(effects: readonly Effect[], kind: EffectKind, t: number): number | null {
  let latest: Effect | null = null;
  for (const effect of effects) if (effect.kind === kind && effect.start <= t && (!latest || effect.start > latest.start)) latest = effect;
  return latest ? clamp01((t - latest.start) / DURATION[kind]) : null;
}

function latestOf(effects: readonly Effect[], kind: EffectKind, t: number): Effect | null {
  let latest: Effect | null = null;
  for (const effect of effects) if (effect.kind === kind && effect.start <= t && (!latest || effect.start > latest.start)) latest = effect;
  return latest;
}

export function layout(input: SceneInput): DrawItem[] {
  const { t, effects, reduced } = input;
  const items: DrawItem[] = [{ tex: "bg", x: 0, y: 0, w: STAGE.w, h: STAGE.h, wave: input.sea && !reduced ? 1 : 0 }];

  // 구름 두 개가 천천히 흘러가요
  for (const [i, base, y, speed] of [
    [0, 30, 10, 0.004],
    [1, 150, 26, 0.0025],
  ] as const) {
    const span = STAGE.w + 60;
    const x = reduced ? base : Math.round(((base + t * speed) % span) - 30);
    items.push({ tex: "cloud", x, y, w: 28, h: 12, alpha: i === 0 ? 0.95 : 0.8 });
  }

  const intro = reduced ? 1 : (progressOf(effects, "intro", t) ?? 1);
  const enter = ease(intro);

  // ── 몬스터 ──
  const fw = input.foeSize.w * SCALE;
  const fh = input.foeSize.h * SCALE;
  let fx = FOE_BASE.x - fw / 2 + Math.round((1 - enter) * 110);
  let fy = FOE_BASE.y - fh + 2;
  let foeFlash = 0;
  let foeGray = 0;
  let foeAlpha = 1;
  const clear = progressOf(effects, "clear", t);
  if (input.defeated) {
    // 쓰러짐: 처음 들어올 때 「clear」 효과가 있으면 번쩍이다 흐려지고, 없으면(또는 끝나면) 흐린 채로
    const p = reduced ? 1 : (clear ?? 1);
    if (p < 0.45) foeFlash = Math.floor(p * 20) % 2 === 0 ? 0.85 : 0;
    const fade = clamp01((p - 0.45) / 0.55);
    foeGray = fade;
    foeAlpha = 1 - 0.55 * fade;
    fy += Math.round(6 * fade);
  } else if (!reduced) {
    fy += Math.round(Math.sin(t / 420) * 1.5);
  }
  const skill = latestOf(effects, "skill", t);
  const skillP = skill ? clamp01((t - skill.start) / DURATION.skill) : null;
  if (skillP !== null && skillP < 1 && !reduced) {
    if (skillP > 0.25 && skillP < 0.6) {
      foeFlash = Math.max(foeFlash, Math.floor(skillP * 30) % 2 === 0 ? 0.9 : 0.2);
      fx += Math.round(Math.sin(skillP * 70) * 2);
    }
  }
  items.push({ tex: "foe", x: Math.round(fx), y: Math.round(fy), w: fw, h: fh, flash: foeFlash, gray: foeGray, alpha: foeAlpha });

  // ── 용사 파티 (뒤의 둘 → 앞의 리더) ──
  const hw = input.heroSize.w * SCALE;
  const hh = input.heroSize.h * SCALE;
  const fight = reduced ? null : progressOf(effects, "fight", t);
  const run = reduced ? null : progressOf(effects, "run", t);
  const slots: { tex: TextureKey; dx: number; dy: number; phase: number }[] = [
    { tex: "hero2", dx: 46, dy: -10, phase: 2 },
    { tex: "hero1", dx: 24, dy: -4, phase: 1 },
    { tex: "hero0", dx: -4, dy: 0, phase: 0 },
  ];
  for (const slot of slots) {
    let x = HERO_BASE.x - hw / 2 - 18 + slot.dx - Math.round((1 - enter) * 120);
    let y = HERO_BASE.y - hh + 4 + slot.dy;
    if (!reduced) y += Math.round(Math.sin(t / 360 + slot.phase * 1.7) * 1);
    if (fight !== null && fight < 1) y -= Math.round(Math.sin(fight * Math.PI) * (slot.tex === "hero0" ? 10 : 7));
    if (run !== null) x -= Math.round(ease(run) * 160);
    if (slot.tex === "hero0" && skillP !== null && skillP < 0.35 && !reduced) x += Math.round(Math.sin((skillP / 0.35) * Math.PI) * 10);
    items.push({ tex: slot.tex, x, y, w: hw, h: hh });
  }

  // ── 스킬의 불꽃: 몬스터 둘레로 SDG 색 점이 퍼져요 ──
  if (skill && skillP !== null && skillP < 1 && !reduced) {
    const local = clamp01((skillP - 0.2) / 0.8);
    if (local > 0) {
      const cx = FOE_BASE.x;
      const cy = FOE_BASE.y - fh / 2;
      const count = 22;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + hash01(i + 11) * 0.4;
        const dist = (10 + hash01(i + 37) * 34) * ease(local);
        const size = 2 + Math.floor(hash01(i + 71) * 2);
        items.push({
          tex: "dot",
          x: Math.round(cx + Math.cos(angle) * dist - size / 2),
          y: Math.round(cy + Math.sin(angle) * dist * 0.8 - size / 2),
          w: size,
          h: size,
          color: i % 3 === 0 ? "#FFFFFF" : (skill.color ?? "#FFD75E"),
          alpha: 1 - local * 0.9,
        });
      }
    }
  }
  // 쓰러질 때 반짝이
  if (input.defeated && clear !== null && clear < 1 && !reduced) {
    for (let i = 0; i < 10; i++) {
      const p = clamp01((clear - i * 0.05) / 0.7);
      if (p <= 0 || p >= 1) continue;
      items.push({
        tex: "dot",
        x: Math.round(FOE_BASE.x - 26 + hash01(i + 5) * 52),
        y: Math.round(FOE_BASE.y - 10 - p * 40 - hash01(i + 9) * 20),
        w: 2,
        h: 2,
        color: "#FFF2B8",
        alpha: 1 - p,
      });
    }
  }
  return items;
}

/** 효과가 모두 끝났는지 — 끝났고 움직임 줄이기면 그리기를 멈춰도 돼요 */
export function settled(effects: readonly Effect[], t: number): boolean {
  return effects.every((effect) => t - effect.start >= DURATION[effect.kind]);
}

/** 스테이터스 화면의 작은 무대(96×88): 가운데의 용사 둘레를 스킬마다 그 SDG 색의 빛이 돌아요 (뒤쪽은 용사 뒤에) */
export function portraitLayout(t: number, orbColors: readonly string[], reduced: boolean, heroSize: { w: number; h: number }): DrawItem[] {
  const items: DrawItem[] = [{ tex: "bg", x: 0, y: 0, w: 96, h: 88 }];
  const hw = heroSize.w * SCALE;
  const hh = heroSize.h * SCALE;
  const hero: DrawItem = { tex: "hero0", x: 48 - hw / 2, y: 78 - hh + (reduced ? 0 : Math.round(Math.sin(t / 380) * 1)), w: hw, h: hh };
  const orbs = orbColors.slice(0, 6).map((color, i, all) => {
    const angle = (reduced ? 0.6 : t / 1400) + (i / all.length) * Math.PI * 2;
    const front = Math.sin(angle) > 0;
    const size = front ? 5 : 4;
    const item: DrawItem = { tex: "dot", x: Math.round(48 + Math.cos(angle) * 36 - size / 2), y: Math.round(50 + Math.sin(angle) * 10 - size / 2), w: size, h: size, color, alpha: front ? 1 : 0.7 };
    return { item, front };
  });
  items.push(...orbs.filter((o) => !o.front).map((o) => o.item), hero, ...orbs.filter((o) => o.front).map((o) => o.item));
  return items;
}
