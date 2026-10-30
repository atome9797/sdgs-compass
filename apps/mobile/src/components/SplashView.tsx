// 저장된 설정을 읽는 동안의 시작 화면 (네이티브 스플래시와 같은 파랑 바탕·나침반). 보통은 네이티브 스플래시가 그 시간을 덮고,
// 읽기가 오래 걸려서 스플래시가 먼저 내려갔을 때만 이 화면이 보여요. 아직 언어를 모르니 두 언어로 적어요.
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { MESSAGES } from "@sdgs-compass/core/messages";
import { COLORS, SPACE } from "@/theme";

export function SplashView() {
  const loading = `${MESSAGES["common.loading"].ja} / ${MESSAGES["common.loading"].ko}`;
  return (
    <View style={styles.root} accessibilityRole="progressbar" accessibilityLabel={loading}>
      <StatusBar style="light" />
      <Text style={styles.emoji} accessible={false}>
        🧭
      </Text>
      <Text style={styles.name}>{MESSAGES["app.name"].ja}</Text>
      <ActivityIndicator color={COLORS.onPrimary} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center", gap: SPACE.md },
  emoji: { fontSize: 72 },
  name: { fontSize: 26, fontWeight: "800", color: COLORS.onPrimary },
  spinner: { marginTop: SPACE.lg },
});
