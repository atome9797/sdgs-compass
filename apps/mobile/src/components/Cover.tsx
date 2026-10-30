// 챌린지 표지: 색(hue 하나로 정해져요) + 기업 이모지 + 상태·D-day 표시. 그라데이션 이미지 없이 색 View 두 겹으로 입체감을 내요.
// 표지 위에는 글자를 직접 올리지 않고(색에 따라 대비가 부족할 수 있어서), 흰 알약·배지 안에만 글자를 넣어요.
import { StyleSheet, Text, View } from "react-native";
import type { ChallengeStatus } from "@sdgs-compass/core/domain";
import { Badge, type BadgeTone } from "@/components/ui";
import { COLORS, RADIUS, SPACE, coverColors } from "@/theme";

const STATUS_TONE: Record<ChallengeStatus, BadgeTone> = { open: "success", judging: "warning", closed: "neutral" };

export interface CoverProps {
  hue: number;
  emoji: string;
  status: ChallengeStatus;
  statusLabel: string;
  dDay: string;
  bookmarked: boolean;
  /** 표지 높이(dp). 카드는 88, 상세는 132 */
  height?: number;
}

export function Cover({ hue, emoji, status, statusLabel, dDay, bookmarked, height = 88 }: CoverProps) {
  const colors = coverColors(hue);
  return (
    <View style={[styles.cover, { height, backgroundColor: colors.from }]}>
      <View style={[styles.circle, { backgroundColor: colors.to }]} />
      <View style={[styles.emojiWrap, { width: height * 0.6, height: height * 0.6, borderRadius: height * 0.3 }]}>
        <Text style={[styles.emoji, { fontSize: height * 0.32 }]}>{emoji}</Text>
      </View>
      <View style={styles.topRow}>
        <Badge label={statusLabel} tone={STATUS_TONE[status]} style={styles.badge} />
        <View style={styles.dDay}>
          <Text style={styles.dDayText}>{dDay}</Text>
        </View>
      </View>
      {bookmarked ? (
        <View style={styles.bookmark}>
          <Text style={styles.bookmarkMark}>🔖</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { justifyContent: "flex-end", overflow: "hidden" },
  circle: { position: "absolute", right: -28, bottom: -52, width: 150, height: 150, borderRadius: 75, opacity: 0.55 },
  emojiWrap: {
    position: "absolute",
    left: SPACE.lg,
    bottom: SPACE.md,
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: { textAlign: "center" },
  topRow: { position: "absolute", top: SPACE.sm, left: SPACE.md, right: SPACE.md, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  badge: { borderWidth: 0 },
  dDay: { backgroundColor: COLORS.card, borderRadius: RADIUS.pill, paddingHorizontal: SPACE.md, paddingVertical: 3 },
  dDayText: { color: COLORS.text, fontSize: 13, fontWeight: "800" },
  bookmark: { position: "absolute", right: SPACE.md, bottom: SPACE.sm },
  bookmarkMark: { fontSize: 20 },
});
