// 의뢰 창(#37): 기업(NPC · 의뢰인)이 용사(학생)에게 말을 거는 RPG 대화 상자 — 홈 맨 위. 「クエストを受ける」를 누르면 그 퀘스트 상세로 가요.
// 남색 바탕에 흰 이중 테두리(웹 .rpg-window 와 같은 모양 · 같은 색 GAME_COLORS).
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { PleaVM } from "@sdgs-compass/core/selectors";
import { FONT_SIZE, GAME_COLORS, SPACE } from "@/theme";

export function PleaWindow({ plea, acceptLabel, onAccept, testID }: { plea: PleaVM; acceptLabel: string; onAccept: () => void; testID?: string }) {
  return (
    <View style={styles.ring} testID={testID}>
      <View style={styles.window}>
        <Text style={styles.speaker} accessibilityRole="header">
          {plea.companyEmoji} {plea.from}
        </Text>
        <Text style={styles.line}>{plea.line}</Text>
        {plea.rewards ? <Text style={styles.reward}>{plea.rewards}</Text> : null}
        <Pressable
          testID={testID ? `${testID}-accept` : undefined}
          accessibilityRole="button"
          accessibilityLabel={acceptLabel}
          onPress={onAccept}
          style={({ pressed }) => [styles.choice, pressed ? styles.choicePressed : null]}
        >
          <Text style={styles.choiceText}>▶ {acceptLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { backgroundColor: GAME_COLORS.window, borderRadius: 13, padding: 3 },
  window: { borderWidth: 3, borderColor: GAME_COLORS.frame, borderRadius: 10, paddingHorizontal: SPACE.lg, paddingTop: SPACE.md, paddingBottom: SPACE.sm, gap: SPACE.sm },
  speaker: { color: GAME_COLORS.speaker, fontSize: FONT_SIZE.sm, fontWeight: "800" },
  line: { color: GAME_COLORS.frame, fontSize: FONT_SIZE.md, fontWeight: "700", lineHeight: 25 },
  reward: { color: GAME_COLORS.reward, fontSize: FONT_SIZE.sm, lineHeight: 20 },
  choice: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center", paddingHorizontal: SPACE.md, borderRadius: 6 },
  choicePressed: { backgroundColor: "rgba(255, 255, 255, 0.14)" },
  choiceText: { color: GAME_COLORS.frame, fontSize: FONT_SIZE.md, fontWeight: "800" },
});
