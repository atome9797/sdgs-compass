// 기업 로고 대신 쓰는 이모지 동그라미 (기업 색을 연하게 깐 배경). 데모라서 실제 로고 이미지는 쓰지 않아요.
import { StyleSheet, Text, View } from "react-native";
import { tint } from "@/lib/color";
import { COLORS } from "@/theme";

export function CompanyAvatar({ emoji, accent, size = 44 }: { emoji: string; accent: string; size?: number }) {
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: tint(accent, 0.18, COLORS.primarySoft), borderColor: tint(accent, 0.5, COLORS.border) }]}
    >
      <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
});
