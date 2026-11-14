"use client";

// 스테이터스 화면(マイImpact, #38)의 용사 그림: 작은 WebGL 무대에서 용사 둘레를 스킬마다 그 SDG 색의 빛이 돌아요(스킬이 없으면 빛도 없어요).
import { useEffect, useRef } from "react";
import { getSdg, type SdgId } from "@sdgs-compass/core/sdg";
import { createRenderer } from "@/lib/battle/renderer";
import { portraitLayout } from "@/lib/battle/scene";
import { cloudSprite, dotSprite, heroFront, partyCapes, PORTRAIT, portraitBackground } from "@/lib/battle/sprites";
import { useReducedMotion } from "@/lib/useReducedMotion";

export function HeroPortrait({ skillSdgIds, label }: { skillSdgIds: readonly SdgId[]; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const key = skillSdgIds.join(",");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ids = key === "" ? [] : (key.split(",").map(Number) as SdgId[]);
    const hero = heroFront(partyCapes(ids)[0]);
    const renderer = createRenderer(canvas, { bg: portraitBackground(), foe: dotSprite(), hero0: hero, hero1: hero, hero2: hero, cloud: cloudSprite(), dot: dotSprite() }, 1);
    canvas.dataset.renderer = renderer?.kind ?? "none";
    if (!renderer) return;
    const colors = ids.map((id) => getSdg(id).color);
    let raf = 0;
    let running = true;
    const render = (t: number) => {
      raf = 0;
      renderer.draw(portraitLayout(t, colors, reduced, { w: hero.w, h: hero.h }), t);
      if (running && !reduced && document.visibilityState === "visible") raf = requestAnimationFrame(render);
    };
    const start = () => {
      if (!raf && running) raf = requestAnimationFrame(render);
    };
    document.addEventListener("visibilitychange", start);
    start();
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", start);
      renderer.dispose();
    };
  }, [key, reduced]);

  return <canvas ref={canvasRef} className="hero-portrait" width={PORTRAIT.w} height={PORTRAIT.h} role="img" aria-label={label} />;
}
