// 참여 실적 한 줄: 종류 배지 · 챌린지 이름 · 기업 · 날짜 · 포인트(+수상). 홈과 마이 임팩트(SCR-04)가 함께 써요.
import { StyleSheet, View } from "react-native";
import type { ActivityVM } from "@sdgs-compass/core/selectors";
import { SdgMiniRow } from "@/components/SdgTile";
import { Badge, Txt, type BadgeTone } from "@/components/ui";
import { COLORS, SPACE } from "@/theme";

const KIND_TONE: Record<ActivityVM["kind"], BadgeTone> = { participation: "neutral", submission: "primary", award: "warning", share: "success" };

export function ActivityRow({ activity }: { activity: ActivityVM }) {
  return (
    <View
      accessible
      accessibilityLabel={[activity.kindLabel, activity.title, activity.companyName, activity.dateLabel, activity.pointsLabel, activity.awardLabel ?? ""].filter(Boolean).join(", ")}
      style={styles.row}
    >
      <View style={styles.head}>
        <Badge label={activity.kindLabel} tone={KIND_TONE[activity.kind]} />
        {activity.awardLabel ? <Badge label={`🏆 ${activity.awardLabel}`} tone="warning" /> : null}
        <Txt variant="small" tone="success" bold style={styles.points}>
          {activity.pointsLabel}
        </Txt>
      </View>
      <Txt bold numberOfLines={2}>
        {activity.title}
      </Txt>
      <Txt variant="small" tone="muted" numberOfLines={1}>
        {activity.companyName} · {activity.dateLabel}
      </Txt>
      <SdgMiniRow ids={activity.sdgIds} size={20} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: SPACE.xs + 2, paddingVertical: SPACE.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  head: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: SPACE.xs + 2 },
  points: { marginLeft: "auto" },
});
