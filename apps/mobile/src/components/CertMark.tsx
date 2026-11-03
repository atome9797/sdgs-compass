// SDGs 실천 마크(#35): 별 그림(가득·반·빈) · 회사 이름 옆의 마크(누르면 안내가 펼쳐져요) · 자세한 안내(독자 기준 + 기준 한 줄).
// 값은 모두 core 의 CertMarkVM/EsgVM 이고 여기서는 그리기만 해요. 웹(components/CertMark.tsx)과 같은 모양·같은 문구예요.
// 별 그림만으로 뜻을 전하지 않게 늘 마크 이름·숫자와 함께 두고, 스크린 리더에는 숫자가 든 이름(「SDGs取組みマーク 5段階中4.5」)만 읽혀요.
// SVG 없이 그려요: 빈 별 「☆」 위에 칠한 별 「★」을 겹치고, 반 별은 칠한 별의 왼쪽 절반만 보여요.
import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatStars, type StarIcon } from "@sdgs-compass/core/certification";
import type { CertMarkVM } from "@sdgs-compass/core/selectors";
import { MARK_COLORS } from "@sdgs-compass/core/theme";
import { Txt } from "@/components/ui";
import { COLORS, FONT_SIZE, HIT, RADIUS, SPACE, tint } from "@/theme";

function Star({ kind, size }: { kind: StarIcon; size: number }) {
  const glyph = { fontSize: size, lineHeight: size + 2, width: size, height: size + 2 };
  return (
    <View style={{ width: size, height: size + 2 }}>
      <Text style={[styles.glyph, glyph]}>☆</Text>
      {kind === "empty" ? null : (
        <View style={[styles.fillClip, { width: kind === "half" ? size / 2 : size, height: size + 2 }]}>
          <Text style={[styles.glyph, glyph]}>★</Text>
        </View>
      )}
    </View>
  );
}

/** 별 그림 5칸. 스크린 리더에서는 숨기고, 감싼 쪽의 이름(숫자 포함)이 뜻을 전해요 */
export function StarRow({ icons, size = 18, testID }: { icons: readonly StarIcon[]; size?: number; testID?: string }) {
  return (
    <View testID={testID} accessible={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={styles.stars}>
      {icons.map((kind, i) => (
        <Star key={i} kind={kind} size={size} />
      ))}
    </View>
  );
}

/** 마크의 자세한 안내: 별 그림 + 이름 + 숫자 · 독자 기준이라는 안내 · 기준 한 줄 (챌린지 상세의 기업 칸에서는 늘 펼쳐서 보여 줘요) */
export function CertMarkDetail({ mark, testID }: { mark: CertMarkVM; testID?: string }) {
  return (
    <View testID={testID} style={styles.detail}>
      <View accessible accessibilityRole="image" accessibilityLabel={mark.accessibilityLabel} style={styles.detailHead}>
        <StarRow icons={mark.icons} size={15} />
        <Txt variant="small" bold>
          {mark.name} {mark.starsLabel}
        </Txt>
      </View>
      <Txt variant="caption" tone="muted">
        {mark.disclaimer}
      </Txt>
      <Txt variant="caption" tone="muted">
        {mark.rule}
      </Txt>
    </View>
  );
}

/** 마크 알약의 모양: 「SDGs取組みマーク ★4.5」 (+ 누를 수 있으면 「?」) */
function MarkPill({ mark, help, expanded = false }: { mark: CertMarkVM; help: boolean; expanded?: boolean }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillName} numberOfLines={1}>
        {mark.name}
      </Text>
      <Text style={styles.pillStar}>★</Text>
      <Text style={styles.pillNum}>{formatStars(mark.stars)}</Text>
      {help ? (
        <View style={[styles.help, expanded ? styles.helpOn : null]}>
          <Text style={[styles.helpText, expanded ? styles.helpTextOn : null]}>?</Text>
        </View>
      ) : null}
    </View>
  );
}

/**
 * 회사 이름 옆의 마크 단추: 누르면 아래에 안내(CertMarkDetail)가 펼쳐져요. 누르는 곳은 hitSlop 으로 44dp 를 채워요.
 * (안내는 화면이 단추 아래 알맞은 자리에 open 일 때 그려요)
 */
export function CertMarkButton({ mark, open, onToggle, testID }: { mark: CertMarkVM; open: boolean; onToggle: () => void; testID?: string }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={mark.accessibilityLabel}
      accessibilityState={{ expanded: open }}
      hitSlop={{ top: 9, bottom: 9, left: 4, right: 4 }}
      onPress={onToggle}
      style={({ pressed }) => [styles.button, { opacity: pressed ? 0.75 : 1 }]}
    >
      <MarkPill mark={mark} help expanded={open} />
    </Pressable>
  );
}

/** 누르지 않는 마크 표시 (카드 전체가 하나의 단추인 챌린지 카드 안에서 — 안내는 상세 화면의 마크에서 볼 수 있어요) */
export function CertMarkBadge({ mark, testID }: { mark: CertMarkVM; testID?: string }) {
  return (
    <View testID={testID} accessible accessibilityLabel={mark.accessibilityLabel} style={styles.button}>
      <MarkPill mark={mark} help={false} />
    </View>
  );
}

/** 알약 테두리: 별 색을 흰색과 섞은 옅은 색 (웹 .cmark__pill 의 color-mix 40% 와 같아요) */
const PILL_BORDER = tint(MARK_COLORS.star, 0.4);

const styles = StyleSheet.create({
  glyph: { position: "absolute", left: 0, top: 0, textAlign: "center", color: MARK_COLORS.star, includeFontPadding: false },
  fillClip: { position: "absolute", left: 0, top: 0, overflow: "hidden" },
  stars: { flexDirection: "row", alignItems: "center", gap: 1 },
  detail: { gap: SPACE.xs, paddingVertical: SPACE.sm, paddingHorizontal: SPACE.md, borderLeftWidth: 4, borderLeftColor: MARK_COLORS.star, borderRadius: RADIUS.sm, backgroundColor: MARK_COLORS.starSoft },
  detailHead: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: SPACE.sm },
  button: { alignSelf: "flex-start", minHeight: HIT - 18, justifyContent: "center" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingVertical: 2,
    paddingLeft: 9,
    paddingRight: 6,
    borderWidth: 1,
    borderColor: PILL_BORDER,
    borderRadius: RADIUS.pill,
    backgroundColor: MARK_COLORS.starSoft,
  },
  pillName: { fontSize: FONT_SIZE.xs, lineHeight: 18, fontWeight: "700", color: COLORS.text, flexShrink: 1 },
  pillStar: { fontSize: 13, lineHeight: 18, color: MARK_COLORS.star },
  pillNum: { fontSize: FONT_SIZE.xs, lineHeight: 18, fontWeight: "800", color: COLORS.text },
  help: { width: 15, height: 15, marginLeft: 2, borderRadius: 8, borderWidth: 1, borderColor: COLORS.textMuted, alignItems: "center", justifyContent: "center" },
  helpOn: { backgroundColor: COLORS.textMuted },
  helpText: { fontSize: 10, lineHeight: 12, fontWeight: "800", color: COLORS.textMuted },
  helpTextOn: { color: COLORS.onPrimary },
});
