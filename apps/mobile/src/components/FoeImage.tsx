// 의뢰서(#39)의 과제 몬스터 그림: 전투 화면(웹)과 같은 과제 몬스터의 픽셀 그림을 PNG 데이터 URI 로 만들어 <Image> 로 보여 줘요(앱에는 캔버스가 없어서).
// 6배로 미리 키운 그림(192칸)이라 화면에서 늘려도 칸이 번지지 않아요. 모양 · 색마다 한 번만 만들어요.
import { useMemo } from "react";
import { Image } from "react-native";
import type { FoeKind } from "@sdgs-compass/core/domain";
import { pngDataUri } from "@sdgs-compass/core/png";
import { foeSprite } from "@sdgs-compass/core/sprites";

const PNG_SCALE = 6;
const cache = new Map<string, { uri: string; ratio: number }>();

export function foePng(kind: FoeKind, color: string): { uri: string; ratio: number } {
  const key = `${kind}:${color}`;
  let hit = cache.get(key);
  if (!hit) {
    const sprite = foeSprite(kind, color);
    hit = { uri: pngDataUri(sprite, PNG_SCALE), ratio: sprite.h / sprite.w };
    cache.set(key, hit);
  }
  return hit;
}

export function FoeImage({ kind, color, size, accessibilityLabel, testID }: { kind: FoeKind; color: string; size: number; accessibilityLabel?: string; testID?: string }) {
  const { uri, ratio } = useMemo(() => foePng(kind, color), [kind, color]);
  return (
    <Image
      testID={testID}
      source={{ uri }}
      style={{ width: size, height: Math.round(size * ratio) }}
      resizeMode="contain"
      accessible={accessibilityLabel !== undefined}
      accessibilityRole={accessibilityLabel !== undefined ? "image" : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityIgnoresInvertColors
    />
  );
}
