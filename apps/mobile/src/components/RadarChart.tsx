// SDGs Impact 레이더 차트 (SDGs 17목표 × 0~100점). SVG 없이 그려요: 선은 회전한 얇은 View, 점은 동그란 View.
// 좌표는 core(radar.ts)와 lib/geometry.ts 의 순수 함수가 계산하고, 여기서는 그 결과를 겹쳐 그리기만 해요.
//   1) 격자(4겹)와 축 선  2) 목표 색으로 칠한 값 막대(가운데 → 값)  3) 값을 이은 외곽선  4) 값 점  5) 축 번호
import { StyleSheet, Text, View } from "react-native";
import { radarPolygon, radarRing, radarVertex, segmentsOf } from "@sdgs-compass/core/radar";
import { dotStyle, radarGeometry, segmentStyle } from "@/lib/geometry";
import { COLORS } from "@/theme";

const RINGS = [0.25, 0.5, 0.75, 1] as const;

export interface RadarChartProps {
  /** 축마다의 값 (0~100) */
  values: readonly number[];
  /** 축마다의 색 (SDGs 공식 색) */
  colors: readonly string[];
  /** 축 이름 (번호) */
  labels: readonly string[];
  /** 한 변 길이(dp) */
  size: number;
  accessibilityLabel: string;
}

export function RadarChart({ values, colors, labels, size, accessibilityLabel }: RadarChartProps) {
  const geo = radarGeometry(size);
  const count = values.length;
  const center = { x: geo.cx, y: geo.cy };
  const polygon = radarPolygon(values, 100, geo.radius, geo.cx, geo.cy);

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel} style={{ width: size, height: size }}>
      {RINGS.flatMap((fraction) =>
        segmentsOf(radarRing(count, fraction, geo.radius, geo.cx, geo.cy)).map((segment, index) => (
          <View key={`ring-${fraction}-${index}`} style={[segmentStyle(segment, 1), styles.ring]} />
        )),
      )}
      {Array.from({ length: count }, (_, index) => {
        const [spoke] = segmentsOf([center, radarVertex(index, count, geo.radius, geo.cx, geo.cy)], false);
        return <View key={`spoke-${index}`} style={[segmentStyle(spoke, 1), styles.spoke]} />;
      })}
      {polygon.map((point, index) => {
        if (values[index] <= 0) return null;
        const [bar] = segmentsOf([center, point], false);
        return <View key={`bar-${index}`} style={[segmentStyle(bar, 6), { backgroundColor: colors[index] }]} />;
      })}
      {segmentsOf(polygon).map((segment, index) => (
        <View key={`edge-${index}`} style={[segmentStyle(segment, 1.5), styles.edge]} />
      ))}
      {polygon.map((point, index) =>
        values[index] > 0 ? <View key={`dot-${index}`} style={[dotStyle(point, 9), styles.dot, { backgroundColor: colors[index] }]} /> : null,
      )}
      {labels.map((label, index) => {
        const at = radarVertex(index, count, geo.labelRadius, geo.cx, geo.cy);
        return (
          <View key={`label-${index}`} style={[styles.label, { left: at.x - 12, top: at.y - 8 }]}>
            <Text style={styles.labelText}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { backgroundColor: COLORS.border },
  spoke: { backgroundColor: COLORS.border },
  edge: { backgroundColor: COLORS.primaryDark },
  dot: { borderWidth: 1.5, borderColor: COLORS.card },
  label: { position: "absolute", width: 24, height: 16, alignItems: "center", justifyContent: "center" },
  labelText: { fontSize: 11, fontWeight: "700", color: COLORS.textMuted },
});
