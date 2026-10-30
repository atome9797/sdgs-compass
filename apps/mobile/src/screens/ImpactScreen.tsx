// SCR-04 마이 포트폴리오: 레벨·누적 지수 · SDGs Impact 레이더 차트(17목표) · 강점 SDGs · 배지 · 참여 실적 · 증명서/카드뉴스 단추.
// 레이더는 SVG 없이 View 로 그려요(components/RadarChart). 값은 모두 core 의 selectImpact 에서 와요.
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { selectCertificates, selectImpact } from "@sdgs-compass/core/selectors";
import { ActivityRow } from "@/components/ActivityRow";
import { RadarChart } from "@/components/RadarChart";
import { Screen, ScreenTitle } from "@/components/Screen";
import { SdgTile } from "@/components/SdgTile";
import { Badge, Button, Card, Empty, Notice, ProgressBar, Section, Txt } from "@/components/ui";
import { useApp } from "@/lib/AppProvider";
import { squareSizeFor } from "@/lib/geometry";
import { certificateHref, ROUTES } from "@/lib/nav";
import { COLORS, RADIUS, SPACE } from "@/theme";

export function ImpactScreen() {
  const { demo, locale, t } = useApp();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const vm = useMemo(() => selectImpact(demo, locale), [demo, locale]);
  const certs = useMemo(() => selectCertificates(demo, locale), [demo, locale]);
  const radarSize = squareSizeFor(width);
  const firstCert = certs[0];

  const radarSummary = vm.topSdgs.map((top) => `${top.id} ${top.name} ${top.score}`).join(", ");

  return (
    <Screen tabbed testID="screen-impact">
      <ScreenTitle title={t("impact.title")} />

      <Card>
        <View style={styles.rowBetween}>
          <View style={styles.shrink}>
            <Txt variant="heading">{vm.nickname}</Txt>
            <Txt variant="small" tone="muted">
              {vm.university} · {vm.faculty}
            </Txt>
          </View>
          <Badge tone="primary" label={vm.levelLabel} />
        </View>
        <Txt variant="small" tone="muted">
          {t("impact.total")}
        </Txt>
        <Txt variant="display" testID="impact-total">
          {vm.totalLabel}
        </Txt>
        <ProgressBar ratio={vm.progressRatio} accessibilityLabel={t("impact.total")} valueText={vm.nextLevelLabel} />
        <Txt variant="small" tone="muted">
          {vm.nextLevelLabel}
        </Txt>
        <Txt variant="small" tone="muted">
          {vm.scoutNote}
        </Txt>
      </Card>

      <Section title={t("impact.radarTitle")} hint={t("impact.radarHint")}>
        <Card style={styles.center}>
          <RadarChart
            values={vm.perSdg.map((p) => p.score)}
            colors={vm.perSdg.map((p) => p.color)}
            labels={vm.perSdg.map((p) => String(p.id))}
            size={radarSize}
            accessibilityLabel={radarSummary ? `${t("impact.radarTitle")}: ${radarSummary}` : t("impact.radarTitle")}
          />
        </Card>
      </Section>

      <Section title={t("impact.top")}>
        {vm.topSdgs.length === 0 ? (
          <Empty>{t("home.myActivitiesEmpty")}</Empty>
        ) : (
          <Card>
            {vm.topSdgs.map((top) => (
              <View key={top.id} style={styles.topRow} accessible accessibilityLabel={`${top.id} ${top.name} ${top.score}`}>
                <SdgTile id={top.id} size={36} />
                <Txt style={styles.shrink} numberOfLines={2}>
                  {top.name}
                </Txt>
                <Txt bold tone="primary">
                  {top.score}
                </Txt>
              </View>
            ))}
          </Card>
        )}
      </Section>

      <Section title={t("impact.badges")}>
        {vm.badges.length === 0 ? (
          <Empty>{t("impact.badgesEmpty")}</Empty>
        ) : (
          <View style={styles.badges}>
            {vm.badges.map((badge) => (
              <View key={badge.code} style={styles.badge} accessible accessibilityLabel={`${badge.name}, ${badge.desc}`}>
                <Txt style={styles.badgeEmoji}>{badge.emoji}</Txt>
                <Txt bold center>
                  {badge.name}
                </Txt>
                <Txt variant="caption" tone="muted" center>
                  {badge.desc}
                </Txt>
              </View>
            ))}
          </View>
        )}
      </Section>

      <Section title={t("impact.history")}>
        {vm.activities.length === 0 ? (
          <Empty>{t("home.myActivitiesEmpty")}</Empty>
        ) : (
          <Card>
            {vm.activities.map((activity) => (
              <ActivityRow key={activity.id} activity={activity} />
            ))}
          </Card>
        )}
      </Section>

      <View style={styles.actions}>
        <Button
          testID="open-certificate"
          icon="🎓"
          label={t("impact.certificateButton")}
          disabled={!firstCert}
          onPress={() => {
            if (firstCert) router.push(certificateHref(firstCert.cert.id));
          }}
        />
        {firstCert ? null : <Notice tone="info" message={t("cert.empty")} />}
        <Button testID="open-share" variant="secondary" icon="📣" label={t("impact.shareButton")} onPress={() => router.push(ROUTES.share)} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACE.sm },
  shrink: { flexShrink: 1 },
  center: { alignItems: "center" },
  topRow: { flexDirection: "row", alignItems: "center", gap: SPACE.md, minHeight: 44 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.sm },
  badge: {
    flexBasis: "47%",
    flexGrow: 1,
    alignItems: "center",
    gap: 2,
    padding: SPACE.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  badgeEmoji: { fontSize: 30, lineHeight: 38 },
  actions: { gap: SPACE.md },
});
