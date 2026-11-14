// 능력치 창(#43): 마이 Impact 의 SDGs 실적(0~100)을 게임의 스테이터스 화면처럼 — 웹 .stats 와 같은 모양.
// 남색 게임 창 안에 17개 목표를 번호 순으로 한 줄씩: 스킬 문장(#42) · 번호와 공식 이름 · 10칸 막대 · 숫자. 가장 높은 3개는 금색 「得意」.
// 화면 읽기 프로그램에는 한 줄을 「目標14 海の豊かさを守ろう 97（得意）」로 통째로 알려요.
import { StyleSheet, Text, View } from "react-native";
import type { Locale } from "@sdgs-compass/core/i18n";
import { makeT } from "@sdgs-compass/core/messages";
import type { SdgStatVM } from "@sdgs-compass/core/selectors";
import { GAME_COLORS } from "@sdgs-compass/core/theme";
import { SdgEmblem } from "@/components/SdgEmblem";

const SEGMENTS = 10;
const MUTED = "#9AA6BD";

function Bar({ score, color }: { score: number; color: string }) {
  return (
    <View style={styles.bar}>
      <View style={[styles.fill, { width: `${score}%`, backgroundColor: color }]} />
      {/* 10칸 눈금 */}
      {Array.from({ length: SEGMENTS - 1 }, (_, i) => (
        <View key={i} style={[styles.tick, { left: `${((i + 1) * 100) / SEGMENTS}%` }]} />
      ))}
    </View>
  );
}

export function StatsWindow({ stats, locale, testID }: { stats: readonly SdgStatVM[]; locale: Locale; testID?: string }) {
  const t = makeT(locale);
  return (
    <View style={styles.window} testID={testID}>
      <Text style={styles.title} accessibilityRole="header">
        {t("impact.statsTitle")}
      </Text>
      <Text style={styles.hint}>{t("impact.statsHint")}</Text>
      <View style={styles.list}>
        {stats.map((stat) => {
          const zero = stat.score === 0;
          return (
            <View key={stat.id} style={[styles.row, stat.top ? styles.rowTop : null]} accessible accessibilityLabel={stat.ariaLabel} testID={testID ? `${testID}-${stat.id}` : undefined}>
              {/* 아이템 칸처럼 밝은 바탕 위에 문장(남색 창에서도 테두리가 보이게) */}
              <View style={[styles.slot, zero ? styles.slotZero : null]}>
                <View style={zero ? styles.dim : null}>
                  <SdgEmblem id={stat.id} size={26} />
                </View>
              </View>
              <View style={styles.main}>
                <View style={styles.nameRow}>
                  <View style={[styles.no, { backgroundColor: stat.color }]}>
                    <Text style={[styles.noText, { color: stat.textColor }]}>{stat.id}</Text>
                  </View>
                  <Text style={[styles.name, zero ? styles.muted : null]} numberOfLines={2}>
                    {stat.name}
                  </Text>
                  {stat.top ? (
                    <View style={styles.top}>
                      <Text style={styles.topText}>★ {t("impact.statTop")}</Text>
                    </View>
                  ) : null}
                </View>
                <Bar score={stat.score} color={stat.color} />
              </View>
              <Text style={[styles.value, zero ? styles.muted : null]}>{stat.score}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  window: { margin: 3, paddingTop: 14, paddingBottom: 12, paddingHorizontal: 12, gap: 2, backgroundColor: GAME_COLORS.window, borderWidth: 3, borderColor: GAME_COLORS.frame, borderRadius: 10 },
  title: { fontSize: 18, fontWeight: "900", letterSpacing: 0.6, color: GAME_COLORS.speaker },
  hint: { marginBottom: 8, fontSize: 12, lineHeight: 18, color: GAME_COLORS.reward },
  list: { gap: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 5, paddingHorizontal: 6, borderRadius: 6 },
  rowTop: { backgroundColor: "rgba(255, 215, 94, 0.12)", borderWidth: 1, borderColor: "rgba(255, 215, 94, 0.55)" },
  slot: { padding: 2, backgroundColor: GAME_COLORS.panel, borderWidth: 2, borderColor: "#0B1324", borderRadius: 6 },
  slotZero: { backgroundColor: "#C9CED8" },
  dim: { opacity: 0.75 },
  main: { flex: 1, minWidth: 0, gap: 4 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  no: { minWidth: 22, height: 18, paddingHorizontal: 3, alignItems: "center", justifyContent: "center", borderRadius: 4 },
  noText: { fontSize: 11, fontWeight: "900" },
  name: { flex: 1, fontSize: 12, fontWeight: "800", lineHeight: 16, color: GAME_COLORS.frame },
  muted: { color: MUTED },
  top: { paddingHorizontal: 5, borderRadius: 3, backgroundColor: GAME_COLORS.speaker },
  topText: { fontSize: 10, fontWeight: "900", lineHeight: 16, color: GAME_COLORS.ink },
  bar: { height: 10, overflow: "hidden", backgroundColor: GAME_COLORS.hpTrack, borderWidth: 2, borderColor: "#0B1324", borderRadius: 3 },
  fill: { position: "absolute", top: 0, bottom: 0, left: 0 },
  tick: { position: "absolute", top: 0, bottom: 0, width: 2, marginLeft: -1, backgroundColor: "#0B1324" },
  value: { minWidth: 30, textAlign: "right", fontSize: 16, fontWeight: "900", color: GAME_COLORS.frame },
});
