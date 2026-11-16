// 홈의 「모험 지도」 바탕(#57) — 웹과 같은 모눈 · 같은 장식 그림.
//  - MapGrid: 웹의 CSS 모눈(MAP_GRID 24px · MAP_COLORS.grid)과 같은 간격 · 색의 1dp 선을, 본문 크기에 맞춰 그어요.
//  - MapDecor: 오른쪽 위의 나침반 · 점선 항로 · 보물 표시(core/adventureMap.ts 의 픽셀 그림). 6배로 키운 PNG 를 줄여 보여 줘서 칸이 또렷해요.
// 둘 다 장식이라 누름을 가로채지 않고, 화면 읽기 프로그램은 건너뛰어요.
import { useState } from "react";
import { Image, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { MAP_DECOR, MAP_GRID, mapDecor } from "@sdgs-compass/core/adventureMap";
import { pngDataUri } from "@sdgs-compass/core/png";
import { MAP_COLORS } from "@/theme";

export const MAP_DECOR_URI = pngDataUri(mapDecor(), 6);

/** 본문 전체를 덮는 모눈(본문의 첫 자식으로 두고, 뒤의 내용이 그 위에 그려져요) */
export function MapGrid({ testID }: { testID?: string }) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((prev) => (Math.abs(prev.w - width) < 1 && Math.abs(prev.h - height) < 1 ? prev : { w: width, h: height }));
  };
  const rows = Math.ceil(size.h / MAP_GRID);
  const cols = Math.ceil(size.w / MAP_GRID);
  return (
    <View testID={testID} pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={onLayout} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: rows }, (_, i) => (
        <View key={`row-${i}`} style={[styles.row, { top: i * MAP_GRID }]} />
      ))}
      {Array.from({ length: cols }, (_, i) => (
        <View key={`col-${i}`} style={[styles.col, { left: i * MAP_GRID }]} />
      ))}
    </View>
  );
}

/** 오른쪽 위 장식(160 × 88) — 본문(여백 안)의 첫 자식으로 두면 인사말 · 의뢰 창이 그 위에 그려져요 */
export function MapDecor({ testID }: { testID?: string }) {
  return (
    <Image
      testID={testID}
      source={{ uri: MAP_DECOR_URI }}
      style={styles.decor}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

const styles = StyleSheet.create({
  row: { position: "absolute", left: 0, right: 0, height: 1, backgroundColor: MAP_COLORS.grid },
  col: { position: "absolute", top: 0, bottom: 0, width: 1, backgroundColor: MAP_COLORS.grid },
  decor: { position: "absolute", top: 4, right: 8, width: MAP_DECOR.w * MAP_DECOR.scale, height: MAP_DECOR.h * MAP_DECOR.scale },
});
