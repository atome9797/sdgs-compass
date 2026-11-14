"use client";

// 의뢰서(#39)의 「討伐対象」 그림: 전투 화면과 같은 과제 몬스터의 픽셀 그림을 작은 2D 캔버스로 (목록에 여러 장이 있어도 WebGL 을 쓰지 않아요).
import { useEffect, useRef } from "react";
import type { FoeKind } from "@sdgs-compass/core/domain";
import { foeSprite } from "@sdgs-compass/core/sprites";
import type { PixelImage } from "@sdgs-compass/core/pixels";

const cache = new Map<string, PixelImage>();
function spriteOf(kind: FoeKind, color: string): PixelImage {
  const key = `${kind}:${color}`;
  let image = cache.get(key);
  if (!image) {
    image = foeSprite(kind, color);
    cache.set(key, image);
  }
  return image;
}

export function FoeIcon({ kind, color, label }: { kind: FoeKind; color: string; label?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const image = spriteOf(kind, color);
    canvas.width = image.w;
    canvas.height = image.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const data = ctx.createImageData(image.w, image.h);
    data.data.set(image.data);
    ctx.putImageData(data, 0, 0);
  }, [kind, color]);
  return label ? (
    <canvas ref={ref} className="foe-icon" width={32} height={32} role="img" aria-label={label} />
  ) : (
    <canvas ref={ref} className="foe-icon" width={32} height={32} aria-hidden="true" />
  );
}
