// SCR-06 기업 대시보드: 환영 · KPI 5개 · 챌린지 관리 · 중개 수수료와 기부 내역(1건 ¥30,000 → 50% 기부).
// 숫자는 모두 core 의 selectB2bDashboard 에서 와요. 챌린지 카드의 "응모자 보기"는 그 챌린지를 고른 채로 응모자 탭을 열어요.
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { selectB2bDashboard, type FeeVM, type KpiVM } from "@sdgs-compass/core/selectors";
import { ChallengeCard } from "@/components/ChallengeCard";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { Screen } from "@/components/Screen";
import { Button, Card, Divider, Empty, KeyValue, Notice, Section, Txt } from "@/components/ui";
import { useApp } from "@/lib/AppProvider";
import { applicantsHref, ROUTES } from "@/lib/nav";
import { COLORS, RADIUS, SPACE } from "@/theme";

function Kpi({ kpi }: { kpi: KpiVM }) {
  const donation = kpi.id === "donation";
  return (
    <View
      testID={`kpi-${kpi.id}`}
      accessible
      accessibilityLabel={`${kpi.label}: ${kpi.value}`}
      style={[styles.kpi, donation ? styles.kpiDonation : null]}
    >
      <Txt variant="small" tone="muted">
        {kpi.label}
      </Txt>
      <Txt variant="title" tone={donation ? "donation" : "text"} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {kpi.value}
      </Txt>
    </View>
  );
}

function FeeCell({ label, value, donation = false }: { label: string; value: string; donation?: boolean }) {
  return (
    <View style={[styles.feeCell, donation ? styles.feeCellDonation : null]}>
      <Txt variant="caption" tone="muted" numberOfLines={2}>
        {label}
      </Txt>
      <Txt variant="heading" tone={donation ? "donation" : "text"} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </Txt>
    </View>
  );
}

/** 중개 수수료와 기부 내역: 1건당 내역(수수료 = 기부 50% + 운영 수익 50%) · 누계 · 건별 목록 */
export function FeeSection({ fee }: { fee: FeeVM }) {
  const { t } = useApp();
  return (
    <Section title={t("b2b.fees")} hint={t("fee.title")}>
      <Card>
        <Txt variant="small" tone="muted" bold>
          {t("fee.perMatch")}
        </Txt>
        <View style={styles.feeSplit}>
          <FeeCell label={t("fee.gross")} value={fee.perMatch.gross} />
          <FeeCell label={`💗 ${t("fee.donation")}`} value={fee.perMatch.donation} donation />
          <FeeCell label={t("fee.revenue")} value={fee.perMatch.revenue} />
        </View>
        <Notice tone="info" message={`💗 ${fee.note}`} />
        <KeyValue label={t("fee.matches")} value={String(fee.totals.count)} />
        <KeyValue label={t("fee.gross")} value={fee.totals.gross} />
        <KeyValue label={t("fee.donation")} value={fee.totals.donation} />
        <KeyValue label={t("fee.revenue")} value={fee.totals.revenue} />
        {fee.rows.map((row) => (
          <View
            key={row.id}
            accessible
            accessibilityLabel={`${row.title}, ${row.dateLabel}, ${t("fee.gross")} ${row.feeLabel}, ${t("fee.donation")} ${row.donationLabel}, ${t("fee.recipient")} ${row.recipient}`}
            style={styles.feeRow}
          >
            <Divider />
            <Txt bold numberOfLines={2}>
              {row.title}
            </Txt>
            <Txt variant="small" tone="muted">
              {row.dateLabel}
            </Txt>
            <KeyValue label={t("fee.gross")} value={row.feeLabel} />
            <KeyValue label={t("fee.donation")} value={row.donationLabel} />
            <KeyValue label={t("fee.recipient")} value={row.recipient} />
          </View>
        ))}
      </Card>
    </Section>
  );
}

export function DashboardScreen() {
  const { demo, locale, t } = useApp();
  const router = useRouter();
  const vm = useMemo(() => selectB2bDashboard(demo, locale), [demo, locale]);

  return (
    <Screen tabbed testID="screen-dashboard">
      <View style={styles.welcome}>
        <CompanyAvatar emoji={vm.companyEmoji} accent={vm.companyAccent} size={52} />
        <Txt variant="title" accessibilityRole="header" style={styles.welcomeText}>
          {vm.welcome}
        </Txt>
      </View>

      <Button testID="new-challenge" icon="＋" label={t("b2b.newChallenge")} onPress={() => router.push(ROUTES.b2bNew)} />

      <View accessibilityLabel={t("b2b.title")} style={styles.kpis}>
        {vm.kpis.map((kpi) => (
          <Kpi key={kpi.id} kpi={kpi} />
        ))}
      </View>

      <Section title={t("b2b.challenges")}>
        {vm.challenges.length === 0 ? (
          <Empty testID="no-challenges">{t("b2b.noChallenges")}</Empty>
        ) : (
          vm.challenges.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              testID={`managed-${challenge.id}`}
              card={challenge}
              onPress={() => router.push(applicantsHref(challenge.id))}
              footer={<Button small variant="secondary" label={t("b2b.viewApplicants")} onPress={() => router.push(applicantsHref(challenge.id))} />}
            />
          ))
        )}
      </Section>

      <FeeSection fee={vm.fee} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  welcome: { flexDirection: "row", alignItems: "center", gap: SPACE.md },
  welcomeText: { flex: 1 },
  kpis: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.sm },
  kpi: {
    flexBasis: "47%",
    flexGrow: 1,
    gap: 2,
    padding: SPACE.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  kpiDonation: { borderColor: COLORS.donation },
  feeSplit: { flexDirection: "row", gap: SPACE.sm },
  feeCell: { flex: 1, gap: 2, padding: SPACE.sm, borderRadius: RADIUS.md, backgroundColor: COLORS.bg },
  feeCellDonation: { borderWidth: 1, borderColor: COLORS.donation },
  feeRow: { gap: SPACE.xs + 2 },
});
