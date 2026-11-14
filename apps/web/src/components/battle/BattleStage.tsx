"use client";

// 전투 화면(#38)의 무대: WebGL 캔버스(배경 · 과제 몬스터 · 용사 파티 · 효과) 위에 이름표 두 개(몬스터: 이름 · SDG 번호 · HP / 용사: 이름 · 스킬 수 · 스킬의 SDG 번호).
// 글자는 캔버스가 아니라 HTML 이라서 또렷하고, 화면 읽기 프로그램이 읽어요. 캔버스 그림에는 대체 글(sceneAlt)이 붙어요.
import { useEffect, useRef, type RefObject } from "react";
import type { BattleVM } from "@sdgs-compass/core/battle";
import { SdgMini } from "@/components/sdg";
import { createRenderer } from "@/lib/battle/renderer";
import { layout, settled, type Effect } from "@/lib/battle/scene";
import { background, cloudSprite, dotSprite, foeSprite, heroBack, HORIZON, partyCapes, STAGE } from "@/lib/battle/sprites";

export function BattleStage({ vm, effectsRef, kickRef, reduced }: { vm: BattleVM; effectsRef: RefObject<Effect[]>; kickRef: RefObject<(() => void) | null>; reduced: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const capeKey = partyCapes(vm.hero.skillSdgIds).join(",");
  const { scene } = vm;
  const { kind: foeKind, color: foeColor, defeated } = vm.foe;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const [c0, c1, c2] = capeKey.split(",");
    const foe = foeSprite(foeKind, foeColor);
    const hero = heroBack(c0);
    const renderer = createRenderer(
      canvas,
      { bg: background(scene), foe, hero0: hero, hero1: heroBack(c1), hero2: heroBack(c2), cloud: cloudSprite(), dot: dotSprite() },
      HORIZON[scene],
    );
    canvas.dataset.renderer = renderer?.kind ?? "none";
    if (!renderer) return;
    const list = effectsRef.current;
    const now = performance.now();
    list.push({ kind: "intro", start: now });
    if (defeated) list.push({ kind: "clear", start: now + 650 });

    let raf = 0;
    let running = true;
    let inView = true;
    const render = (t: number) => {
      raf = 0;
      renderer.draw(layout({ t, effects: list, defeated, reduced, sea: scene === "sea", foeSize: { w: foe.w, h: foe.h }, heroSize: { w: hero.w, h: hero.h } }), t);
      if (running && inView && document.visibilityState === "visible" && !(reduced && settled(list, t))) raf = requestAnimationFrame(render);
    };
    const start = () => {
      if (!raf && running) raf = requestAnimationFrame(render);
    };
    kickRef.current = start;
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => {
      inView = entry?.isIntersecting ?? true;
      if (inView) start();
    });
    observer?.observe(canvas);
    document.addEventListener("visibilitychange", start);
    start();
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      observer?.disconnect();
      document.removeEventListener("visibilitychange", start);
      if (kickRef.current === start) kickRef.current = null;
      list.length = 0;
      renderer.dispose();
    };
  }, [scene, foeKind, foeColor, defeated, capeKey, reduced, effectsRef, kickRef]);

  return (
    <div className="battle__stage">
      <canvas ref={canvasRef} className="battle__canvas" width={STAGE.w} height={STAGE.h} role="img" aria-label={vm.sceneAlt} />
      <div className="battle-status battle-status--foe">
        <p className="battle-status__name">{vm.foe.name}</p>
        <div className="battle-status__types" aria-label={vm.foe.sdgLabel}>
          {vm.foe.sdgIds.map((id) => (
            <SdgMini key={id} id={id} />
          ))}
        </div>
        <div className="battle-hp" role="img" aria-label={vm.foe.hpAria} title={vm.hpHint}>
          <span className="battle-hp__label" aria-hidden="true">
            HP
          </span>
          <span className="battle-hp__track" aria-hidden="true">
            <span className={defeated && !reduced ? "battle-hp__bar battle-hp__bar--drain" : "battle-hp__bar"} style={{ width: `${vm.foe.hpPercent}%` }} />
          </span>
        </div>
      </div>
      <div className="battle-status battle-status--hero">
        <p className="battle-status__name">{vm.hero.name}</p>
        <p className="battle-status__sub">{vm.hero.skillsLabel}</p>
        {vm.hero.skillSdgIds.length > 0 ? (
          <div className="battle-status__types">
            {vm.hero.skillSdgIds.slice(0, 5).map((id) => (
              <SdgMini key={id} id={id} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
