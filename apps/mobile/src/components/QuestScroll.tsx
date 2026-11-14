// 퀘스트 의뢰서(#39): 웹과 같은 양피지 두루마리 모양의 「依頼書」 — 위아래 두루마리, 과제 몬스터의 픽셀 그림(밑에 이름) · 의뢰인 ·
// 「課題」(과제를 쉬운 말로, #41 — 게임을 하지 않는 사람도 알 수 있게) · SDG 번호 · 보상 한 줄,
// 오른쪽 위에 남은 날 도장(あと 12日 · 本日締切 · 審査中), 기획서를 낸 퀘스트는 몬스터 그림 위에 「達成」 도장. 종이 전체가 하나의 단추예요.
// compact 는 홈의 「締切が近いクエスト」용 작은 의뢰서(그림 · 제목 · 의뢰인 · 도장 한 줄). 그라데이션 없이 색 View 를 겹쳐서 그려요.
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import type { Locale } from "@sdgs-compass/core/i18n";
import { makeT } from "@sdgs-compass/core/messages";
import type { ChallengeCardVM } from "@sdgs-compass/core/selectors";
import { FoeImage } from "@/components/FoeImage";
import { SdgMiniRow } from "@/components/SdgTile";
import { FONT_SIZE, SCROLL_COLORS as C, SPACE } from "@/theme";

/** 명조체: iOS 는 언어에 맞는 명조, 안드로이드는 시스템의 serif */
function serifOf(locale: Locale): string {
  if (Platform.OS === "ios") return locale === "ko" ? "AppleMyungjo" : "Hiragino Mincho ProN";
  return "serif";
}

export interface QuestScrollProps {
  card: ChallengeCardVM;
  locale: Locale;
  onPress: () => void;
  /** 홈의 추천: 매칭률과 추천 이유 */
  showMatch?: boolean;
  /** 작은 의뢰서 (마감 임박) */
  compact?: boolean;
  testID?: string;
}

/** 위 · 아래로 말린 두루마리 (가운데가 밝고 양 끝이 어두운 원기둥처럼) */
function Roll({ thin }: { thin: boolean }) {
  return (
    <View style={[styles.roll, thin ? styles.rollThin : null]} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <View style={[styles.rollEnd, styles.rollEndLeft]} />
      <View style={[styles.rollHi, thin ? styles.rollHiThin : null]} />
      <View style={[styles.rollEnd, styles.rollEndRight]} />
    </View>
  );
}

/** 남은 날 도장 */
function Seal({ card, locale, small }: { card: ChallengeCardVM; locale: Locale; small: boolean }) {
  const t = makeT(locale);
  const muted = !card.isOpen;
  const color = muted ? C.muted : C.seal;
  const size = small ? 46 : 54;
  const lines = !card.isOpen ? [card.statusLabel] : card.daysLeft <= 0 ? [t("scroll.today")] : [t("scroll.daysLeft"), t("scroll.days", { days: card.daysLeft })];
  return (
    <View style={[styles.seal, { width: size, height: size, borderRadius: size / 2, borderColor: color }, small ? styles.sealStatic : styles.sealCorner]}>
      <View style={[styles.sealInner, { borderRadius: size / 2 - 3, borderColor: color }]} />
      {lines.length === 2 ? (
        <>
          <Text style={[styles.sealSmall, { color, fontFamily: serifOf(locale) }]}>{lines[0]}</Text>
          <Text style={[styles.sealBig, { color, fontFamily: serifOf(locale) }]}>{lines[1]}</Text>
        </>
      ) : (
        <Text style={[styles.sealOne, { color, fontFamily: serifOf(locale) }]}>{lines[0]}</Text>
      )}
    </View>
  );
}

function Key({ label }: { label: string }) {
  return (
    <View style={styles.key}>
      <Text style={styles.keyText}>{label}</Text>
    </View>
  );
}

export function QuestScroll({ card, locale, onPress, showMatch = false, compact = false, testID }: QuestScrollProps) {
  const t = makeT(locale);
  const serif = serifOf(locale);
  const cleared = card.submittedVersion !== null;
  const due = !card.isOpen ? card.statusLabel : card.dDay;
  // 스크린 리더: 종이 전체가 단추 하나 — 제목 · 의뢰인 · 과제(쉬운 말) · 남은 날(상태) · 제출 여부
  const label = [
    card.title,
    `${t("scroll.client")} ${card.companyName}`,
    `${t("scroll.problem")} ${card.problem}`,
    due,
    cleared ? t("challenge.submitted", { version: card.submittedVersion ?? 1 }) : null,
  ]
    .filter(Boolean)
    .join(", ");
  const wanted = (
    <View style={[styles.wanted, compact ? styles.wantedSmall : null]}>
      <FoeImage kind={card.foe.kind} color={card.foe.color} size={compact ? 44 : 64} testID={testID ? `${testID}-foe` : undefined} />
      {cleared ? (
        <View style={[styles.cleared, compact ? styles.clearedSmall : null]}>
          <Text style={[styles.clearedText, compact ? styles.clearedTextSmall : null, { fontFamily: serif }]}>{t("scroll.cleared")}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.wrap}>
      <Roll thin={compact} />
      <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }: { pressed: boolean }) => [styles.paper, compact ? styles.paperCompact : null, pressed ? styles.pressed : null]}>
        {/* 종이의 얼룩 (장식) */}
        <View style={[styles.stain, styles.stainA]} />
        <View style={[styles.stain, styles.stainB]} />
        {compact ? (
          <View style={styles.compactRow}>
            {wanted}
            <View style={styles.compactMain}>
              <Text style={[styles.title, styles.titleCompact, { fontFamily: serif }]} numberOfLines={2}>
                {card.title}
              </Text>
              <View style={styles.row}>
                <Key label={t("scroll.client")} />
                <Text style={styles.value} numberOfLines={1}>
                  {card.companyName}
                </Text>
              </View>
            </View>
            <Seal card={card} locale={locale} small />
          </View>
        ) : (
          <>
            <View style={styles.labelRow}>
              <View style={styles.labelLine} />
              <Text style={[styles.label, { fontFamily: serif }]}>{t("scroll.title")}</Text>
              {showMatch && card.isOpen && card.match !== null ? (
                <View style={styles.match}>
                  <Text style={styles.matchText}>{t("home.matchRate", { rate: card.match })}</Text>
                </View>
              ) : null}
            </View>
            <Seal card={card} locale={locale} small={false} />
            <View style={styles.main}>
              {/* 몬스터 그림 밑에 이름을 작게(#41) — 「課題」 줄에는 쉬운 말을 써요 */}
              <View style={styles.monster}>
                {wanted}
                <Text style={styles.foeName} numberOfLines={2}>
                  {card.foe.name}
                </Text>
              </View>
              <Text style={[styles.title, { fontFamily: serif }]} numberOfLines={3}>
                {card.title}
              </Text>
            </View>
            <View style={styles.row}>
              <Key label={t("scroll.client")} />
              <Text style={styles.value}>
                {card.companyEmoji} {card.companyName}
              </Text>
            </View>
            <View style={styles.row}>
              <Key label={t("scroll.problem")} />
              <Text style={[styles.value, styles.problem]}>{card.problem}</Text>
            </View>
            <SdgMiniRow ids={card.sdgIds} />
            {card.rewardsLine ? (
              <View style={styles.row}>
                <Key label={t("scroll.reward")} />
                <Text style={[styles.value, styles.strong]}>{card.rewardsLine}</Text>
              </View>
            ) : null}
            {showMatch && card.reasons.length > 0 ? (
              <View style={styles.reasons}>
                {card.reasons.slice(0, 2).map((reason) => (
                  <Text key={reason} style={styles.reason}>
                    ✓ {reason}
                  </Text>
                ))}
              </View>
            ) : null}
            <View style={styles.foot}>
              <Text style={styles.footText}>
                {card.teamRuleLabel} · {card.applicantsLabel}
                {cleared ? ` · ${t("challenge.submitted", { version: card.submittedVersion ?? 1 })}` : ""}
              </Text>
              {card.bookmarked ? <Text style={styles.bookmark}>★</Text> : null}
            </View>
          </>
        )}
      </Pressable>
      <Roll thin={compact} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 6, marginVertical: 2 },
  roll: {
    zIndex: 2,
    height: 16,
    marginHorizontal: -6,
    borderRadius: 8,
    backgroundColor: C.roll,
    overflow: "hidden",
    shadowColor: C.rollDark,
    shadowOpacity: 0.35,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  rollThin: { height: 11, borderRadius: 6 },
  rollHi: { position: "absolute", top: 4, left: 10, right: 10, height: 4, borderRadius: 2, backgroundColor: C.rollLight },
  rollHiThin: { top: 3, height: 3 },
  rollEnd: { position: "absolute", top: 0, bottom: 0, width: 9, backgroundColor: C.rollDark },
  rollEndLeft: { left: 0, borderTopLeftRadius: 8, borderBottomLeftRadius: 8 },
  rollEndRight: { right: 0, borderTopRightRadius: 8, borderBottomRightRadius: 8 },
  paper: {
    marginVertical: -5,
    paddingTop: 18,
    paddingBottom: 16,
    paddingHorizontal: SPACE.lg,
    gap: SPACE.sm,
    overflow: "hidden",
    backgroundColor: C.paper,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderColor: C.paperEdge,
  },
  paperCompact: { paddingTop: 14, paddingBottom: 12, paddingHorizontal: SPACE.md },
  pressed: { opacity: 0.88 },
  stain: { position: "absolute", width: 140, height: 140, borderRadius: 70, backgroundColor: "rgba(150, 100, 40, 0.07)" },
  stainA: { top: -50, left: -50 },
  stainB: { bottom: -60, right: -40 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: SPACE.sm },
  labelLine: { width: 18, height: 2, backgroundColor: "#A37B45" },
  label: { fontSize: FONT_SIZE.sm, fontWeight: "900", letterSpacing: 4, color: C.key },
  match: { marginLeft: "auto", paddingHorizontal: SPACE.sm, paddingVertical: 1, borderRadius: 999, borderWidth: 1, borderColor: "#B89463", backgroundColor: "rgba(255, 249, 230, 0.75)" },
  matchText: { fontSize: FONT_SIZE.xs, fontWeight: "800", color: "#5A3D1C" },
  main: { flexDirection: "row", alignItems: "center", gap: SPACE.md },
  wanted: { width: 76, height: 76, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: C.frame, borderRadius: 6, backgroundColor: C.frameFill },
  wantedSmall: { width: 56, height: 56 },
  monster: { alignItems: "center", gap: 3 },
  foeName: { maxWidth: 86, fontSize: 11, fontWeight: "800", lineHeight: 14, textAlign: "center", color: C.key },
  title: { flex: 1, paddingRight: 50, fontSize: FONT_SIZE.lg, fontWeight: "800", lineHeight: 24, color: C.ink },
  titleCompact: { flex: 0, paddingRight: 0, fontSize: FONT_SIZE.md, lineHeight: 21 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  key: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 3, backgroundColor: C.key },
  keyText: { fontSize: FONT_SIZE.xs, fontWeight: "800", color: C.keyText },
  value: { flex: 1, fontSize: FONT_SIZE.sm, lineHeight: 19, color: C.ink },
  strong: { fontWeight: "800" },
  problem: { fontWeight: "700" },
  reasons: { gap: 2 },
  reason: { fontSize: FONT_SIZE.sm, color: "#5A4630" },
  foot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACE.sm, paddingTop: 6, borderTopWidth: 1, borderTopColor: "rgba(184, 148, 99, 0.6)" },
  footText: { flex: 1, fontSize: FONT_SIZE.sm, color: "#5A4630" },
  bookmark: { fontSize: 20, color: C.seal },
  seal: { alignItems: "center", justifyContent: "center", borderWidth: 2, transform: [{ rotate: "-12deg" }] },
  sealCorner: { position: "absolute", top: 40, right: 12, zIndex: 2 },
  sealStatic: { flexShrink: 0 },
  sealInner: { position: "absolute", top: 3, left: 3, right: 3, bottom: 3, borderWidth: 1 },
  sealSmall: { fontSize: 10, fontWeight: "900", lineHeight: 12 },
  sealBig: { fontSize: 15, fontWeight: "900", lineHeight: 17 },
  sealOne: { fontSize: 11, fontWeight: "900", lineHeight: 13, textAlign: "center", paddingHorizontal: 4 },
  cleared: {
    position: "absolute",
    paddingHorizontal: 6,
    borderWidth: 3,
    borderColor: C.seal,
    borderRadius: 6,
    backgroundColor: "rgba(255, 249, 230, 0.55)",
    transform: [{ rotate: "-14deg" }],
    opacity: 0.9,
  },
  clearedSmall: { paddingHorizontal: 4, borderWidth: 2 },
  clearedText: { fontSize: 20, fontWeight: "900", letterSpacing: 2, color: C.seal },
  clearedTextSmall: { fontSize: 14, letterSpacing: 1 },
  compactRow: { flexDirection: "row", alignItems: "center", gap: SPACE.md },
  compactMain: { flex: 1, gap: 4 },
});
