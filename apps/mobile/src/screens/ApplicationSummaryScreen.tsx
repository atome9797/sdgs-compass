// 학생용 신청 요약(#22): 기간을 고르면 활동·SDGs·디지털 증명서를 한 장으로 보여 줘요. 대학의 활동 장려 제도 등에 붙이는 "활동 기록 자료"예요.
// 모바일은 인쇄 모듈을 새로 넣지 않고(의존성 금지) React Native 내장 Share 로 글 요약을 보내요 — PDF 는 웹 버전에서 저장해요.
// 앱은 장학금을 주지 않고 대학·단체와 제휴하지 않았어요. 그래서 고지 문장(core 의 SUMMARY_NOTE_KEYS)을 늘 함께 보여 줘요. 계산은 모두 core 에 있어요.
import { useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Share, StyleSheet, View } from "react-native";
import { parseSummaryPeriod, selectApplicationSummary, type SummaryPeriod } from "@sdgs-compass/core/applicationSummary";
import { QrView } from "@/components/QrView";
import { Screen } from "@/components/Screen";
import { SdgMiniRow, SdgTile } from "@/components/SdgTile";
import { Badge, Button, Card, Empty, KeyValue, Notice, Section, Segmented, Txt, type NoticeTone } from "@/components/ui";
import { useApp } from "@/lib/AppProvider";
import { paramText } from "@/lib/nav";
import { COLORS, RADIUS, SPACE } from "@/theme";

interface SummaryNotice {
  tone: NoticeTone;
  text: string;
}

export function ApplicationSummaryScreen() {
  const { demo, locale, t } = useApp();
  const requested = paramText(useLocalSearchParams().period);
  const [period, setPeriod] = useState<SummaryPeriod>(parseSummaryPeriod(requested));
  const [notice, setNotice] = useState<SummaryNotice | null>(null);
  const vm = useMemo(() => selectApplicationSummary(demo, locale, period), [demo, locale, period]);
  const periodOptions = vm.periodOptions.map((option) => ({ value: option.id, label: option.label }));

  const share = async () => {
    try {
      const result = await Share.share({ title: vm.docTitle, message: vm.shareText });
      // 취소(dismissedAction)는 iOS 에서만 와요. 공유 메뉴를 열었을 때만 안내를 보여요.
      setNotice(result.action === Share.sharedAction ? { tone: "success", text: t("mobile.shareDone") } : null);
    } catch {
      setNotice({ tone: "danger", text: t("error.generic") });
    }
  };

  return (
    <Screen backTitle={t("summary.title")} testID="screen-summary">
      <Txt tone="muted">{t("summary.lead")}</Txt>

      <Section title={t("summary.period.label")}>
        <Segmented options={periodOptions} value={period} onChange={(next) => setPeriod(next)} accessibilityLabel={t("summary.period.label")} />
      </Section>

      <Card>
        <View style={styles.head}>
          <Txt variant="title" bold testID="summary-doc-title">
            🧭 {vm.docTitle}
          </Txt>
          <Txt variant="small" tone="muted">
            {vm.createdOnLabel}
          </Txt>
        </View>
        <KeyValue label={t("summary.holder.name")} value={vm.holder.name} />
        <KeyValue label={t("summary.holder.affiliation")} value={vm.holder.affiliation} />
        <KeyValue label={t("summary.holder.level")} value={`${vm.holder.levelLabel} · ${vm.holder.totalLabel}`} />
        <KeyValue label={t("summary.holder.period")} value={vm.rangeLabel} />
        <View style={styles.stats}>
          {vm.stats.map((stat) => (
            <View key={stat.key} style={styles.stat} testID={`summary-stat-${stat.key}`}>
              <Txt variant="small" tone="muted">
                {stat.label}
              </Txt>
              <Txt bold>{stat.value}</Txt>
            </View>
          ))}
        </View>
      </Card>

      <Section title={t("summary.activities.title")}>
        {vm.empty ? (
          <Empty testID="summary-empty">{t("summary.activities.empty")}</Empty>
        ) : (
          <Card>
            {vm.activities.map((activity, index) => (
              <View key={activity.id} style={[styles.row, index > 0 ? styles.rowDivider : null]} testID={`summary-activity-${activity.id}`}>
                <View style={styles.rowTop}>
                  <Txt variant="small" tone="muted">
                    {activity.dateLabel} · {activity.kindLabel}
                  </Txt>
                  {activity.awardLabel ? <Badge tone="warning" label={`🏆 ${activity.awardLabel}`} /> : null}
                </View>
                <Txt bold>{activity.title}</Txt>
                <Txt variant="small" tone="muted">
                  {activity.companyName}
                </Txt>
                <SdgMiniRow ids={activity.sdgIds} size={20} />
              </View>
            ))}
            {vm.moreActivitiesLabel ? (
              <Txt variant="small" tone="muted">
                {vm.moreActivitiesLabel}
              </Txt>
            ) : null}
          </Card>
        )}
      </Section>

      <Section title={t("summary.sdgs.title")}>
        {vm.sdgs.length === 0 ? (
          <Empty>{t("summary.sdgs.empty")}</Empty>
        ) : (
          <Card>
            {vm.sdgs.map((sdg) => (
              <View key={sdg.id} style={styles.sdgRow}>
                <SdgTile id={sdg.id} size={24} accessibilityLabel={sdg.label} />
                <Txt style={styles.grow}>{sdg.label}</Txt>
                <Txt variant="small" tone="muted">
                  {sdg.countLabel}
                </Txt>
              </View>
            ))}
          </Card>
        )}
      </Section>

      <Section title={t("summary.certs.title")}>
        {vm.certificates.length === 0 ? (
          <Empty>{t("summary.certs.empty")}</Empty>
        ) : (
          <View style={styles.stack}>
            {vm.certificates.map((cert) => (
              <Card key={cert.id}>
                <View style={styles.cert} testID={`summary-cert-${cert.id}`}>
                  <QrView matrix={cert.qr} size={72} accessibilityLabel={cert.qrLabel} />
                  <View style={styles.grow}>
                    <Txt variant="small" tone="muted">
                      {cert.id} · {cert.kindLabel}
                      {cert.awardLabel ? ` · ${cert.awardLabel}` : ""}
                    </Txt>
                    <Txt bold>{cert.title}</Txt>
                    <Txt variant="small" tone="muted">
                      {cert.companyName} · {cert.issuedOnLabel}
                    </Txt>
                    <Txt variant="small" bold>
                      {cert.codeLabel}
                    </Txt>
                  </View>
                </View>
              </Card>
            ))}
            {vm.moreCertificatesLabel ? (
              <Txt variant="small" tone="muted">
                {vm.moreCertificatesLabel}
              </Txt>
            ) : null}
          </View>
        )}
      </Section>

      <Section title={t("summary.notes.title")}>
        <View style={styles.notes} testID="summary-notes">
          {vm.notes.map((note) => (
            <Txt key={note} variant="small" tone="muted">
              ※ {note}
            </Txt>
          ))}
        </View>
      </Section>

      {notice ? <Notice testID="summary-notice" tone={notice.tone} message={notice.text} /> : null}
      <View style={styles.stack}>
        <Button testID="summary-share" icon="📤" label={t("summary.share")} onPress={share} />
        <Txt variant="small" tone="muted">
          {t("summary.pdfOnWeb")}
        </Txt>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { gap: SPACE.xs, paddingBottom: SPACE.sm, borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.sm, marginTop: SPACE.sm },
  stat: { flexGrow: 1, flexBasis: "45%", gap: 2, padding: SPACE.sm, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bg },
  row: { gap: SPACE.xs, paddingVertical: SPACE.sm },
  rowDivider: { borderTopWidth: 1, borderTopColor: COLORS.border },
  rowTop: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: SPACE.sm },
  sdgRow: { flexDirection: "row", alignItems: "center", gap: SPACE.sm, paddingVertical: SPACE.xs },
  cert: { flexDirection: "row", alignItems: "flex-start", gap: SPACE.md },
  grow: { flex: 1, minWidth: 0 },
  stack: { gap: SPACE.md },
  notes: { gap: SPACE.xs },
});
