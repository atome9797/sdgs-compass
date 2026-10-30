// SNS 카드뉴스 미리보기(SCR-05): 닉네임과 성과만 담은 카드. Instagram(1:1)·LinkedIn(1.91:1)은 최소 높이를 비율에 맞추고,
// 글이 길면 카드가 늘어나요(잘리지 않게). 공식 로고 없이 앱 이름과 "デモ" 표시만 넣어요.
import { StyleSheet, Text, View } from "react-native";
import type { ShareCard } from "@sdgs-compass/core/shareCard";
import { SdgMiniRow } from "@/components/SdgTile";
import { Badge, Txt } from "@/components/ui";
import { hashtagList } from "@/lib/shareText";
import { CARD_SHADOW, COLORS, FONT_SIZE, RADIUS, SPACE } from "@/theme";

export interface ShareCardPreviewProps {
  card: ShareCard;
  /** 앱 이름 */
  brand: string;
  /** "デモ版" 같은 데모 표시 */
  demoLabel: string;
  /** 카드 가로 길이(dp) */
  width: number;
  accessibilityLabel: string;
}

export function ShareCardPreview({ card, brand, demoLabel, width, accessibilityLabel }: ShareCardPreviewProps) {
  const compact = card.template === "linkedin";
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel} style={[styles.card, { width, minHeight: width / card.aspect }]}>
      <View style={styles.band}>
        <Text style={styles.brand} numberOfLines={1}>
          🧭 {brand}
        </Text>
        <Badge tone="warning" label={demoLabel} />
      </View>
      <View style={styles.body}>
        <Txt variant="small" tone="primary" bold numberOfLines={2}>
          {card.headline}
        </Txt>
        <Txt variant={compact ? "heading" : "title"} numberOfLines={3}>
          {card.title}
        </Txt>
        <Txt variant="small" tone="muted" numberOfLines={2}>
          {card.subtitle}
        </Txt>
      </View>
      <View style={styles.stats}>
        {card.stats.map((stat) => (
          <View key={stat.label} style={styles.stat}>
            <Text style={styles.statValue} numberOfLines={1}>
              {stat.value}
            </Text>
            <Text style={styles.statLabel} numberOfLines={2}>
              {stat.label}
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.footer}>
        <SdgMiniRow ids={card.sdgIds} size={22} />
        <Txt variant="caption" tone="muted" numberOfLines={2}>
          {hashtagList(card.hashtags).join(" ")}
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: "center",
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    justifyContent: "space-between",
    ...CARD_SHADOW,
  },
  band: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACE.sm,
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.sm + 2,
    backgroundColor: COLORS.primarySoft,
  },
  brand: { flexShrink: 1, fontSize: FONT_SIZE.md, fontWeight: "800", color: COLORS.primaryDark },
  body: { gap: SPACE.xs + 2, paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md },
  stats: { flexDirection: "row", gap: SPACE.sm, paddingHorizontal: SPACE.lg },
  stat: { flex: 1, gap: 2, padding: SPACE.sm, borderRadius: RADIUS.md, backgroundColor: COLORS.bg },
  statValue: { fontSize: FONT_SIZE.lg, fontWeight: "800", color: COLORS.text },
  statLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
  footer: { gap: SPACE.xs + 2, paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md },
});
