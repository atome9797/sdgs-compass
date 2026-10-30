// 목록에서 하나를 고르는 줄(라디오): 증명서 고르기, 카드뉴스로 만들 성과 고르기 등. 한 줄에 제목과 보조 글을 함께 보여 줘요.
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Txt } from "@/components/ui";
import { COLORS, HIT, RADIUS, SPACE } from "@/theme";

export interface OptionRowProps {
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}

export function OptionRow({ title, subtitle, selected, onPress, testID }: OptionRowProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="radio"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderColor: selected ? COLORS.primary : COLORS.border, backgroundColor: selected ? COLORS.primarySoft : COLORS.card, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={[styles.radio, { borderColor: selected ? COLORS.primary : COLORS.textSubtle }]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
      <View style={styles.texts}>
        <Txt bold numberOfLines={2}>
          {title}
        </Txt>
        {subtitle ? (
          <Txt variant="small" tone="muted" numberOfLines={1}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {selected ? (
        <Text style={styles.check} accessible={false}>
          ✓
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: HIT + 8,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.md,
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.sm + 2,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
  },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  texts: { flex: 1, gap: 1 },
  check: { fontSize: 16, fontWeight: "800", color: COLORS.primaryDark },
});
