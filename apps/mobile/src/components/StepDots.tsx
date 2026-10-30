// 단계 표시(기획서 제출의 4단계): 번호가 든 동그라미들. 끝낸 단계는 ✓, 지금 단계는 강조, 아래에 지금 단계의 이름을 보여 줘요.
import { StyleSheet, Text, View } from "react-native";
import { Txt } from "@/components/ui";
import { COLORS, FONT_SIZE, SPACE } from "@/theme";

export interface StepDotsProps {
  /** 단계 이름들 (지금 단계의 이름만 보여요) */
  labels: readonly string[];
  /** 지금 단계 (0부터) */
  current: number;
  /** 스크린 리더가 읽을 글 (예: "ステップ 2/4: ファイルアップロード") */
  accessibilityLabel: string;
}

export function StepDots({ labels, current, accessibilityLabel }: StepDotsProps) {
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={accessibilityLabel} accessibilityValue={{ min: 1, max: labels.length, now: current + 1 }} style={styles.wrap}>
      <View style={styles.row}>
        {labels.map((label, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <View key={label} style={styles.item}>
              {index > 0 ? <View style={[styles.line, { backgroundColor: index <= current ? COLORS.primary : COLORS.border }]} /> : null}
              <View
                style={[
                  styles.dot,
                  { backgroundColor: done ? COLORS.primary : active ? COLORS.primarySoft : COLORS.card, borderColor: done || active ? COLORS.primary : COLORS.textSubtle },
                ]}
              >
                <Text style={[styles.dotText, { color: done ? COLORS.onPrimary : active ? COLORS.primaryDark : COLORS.textMuted }]}>{done ? "✓" : index + 1}</Text>
              </View>
            </View>
          );
        })}
      </View>
      <Txt variant="heading" center>
        {labels[current] ?? ""}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: SPACE.sm },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  item: { flexDirection: "row", alignItems: "center" },
  line: { width: 28, height: 3, borderRadius: 2 },
  dot: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  dotText: { fontSize: FONT_SIZE.sm, fontWeight: "800" },
});
