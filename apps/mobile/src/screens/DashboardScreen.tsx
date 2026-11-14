// SCR-06 기업 대시보드: 환영 · KPI 5개 · 챌린지 관리 · 상금 지급(기업이 수상 팀에 직접) · 수수료(상금·연구 의뢰비의 10%, 최저 ¥9,000 — 인턴 채용은 무료).
// 숫자는 모두 core 의 selectB2bDashboard 에서 와요. 챌린지 카드의 "응모자 보기"는 그 챌린지를 고른 채로 응모자 탭을 열어요.
// #33 KPI 카드를 누르면: 응모자 탭(모든 과제 + 상태 필터) 또는 이 화면 안의 칸(課題の管理 · お支払い（手数料）)으로 스크롤해요.
import { useRouter } from "expo-router";
import { useMemo, useRef, type ComponentRef } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { ALL_CHALLENGES, selectB2bDashboard, type DashboardSection, type FeeVM, type KpiVM } from "@sdgs-compass/core/selectors";
import { selectPrizePayments, type PrizePaymentsVM } from "@sdgs-compass/core/walletView";
import { ChallengeCard } from "@/components/ChallengeCard";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { Screen } from "@/components/Screen";
import { Badge, Button, Card, Divider, Empty, KeyValue, Notice, Section, Txt } from "@/components/ui";
import { useApp } from "@/lib/AppProvider";
import { applicantsHref, ROUTES } from "@/lib/nav";
import { COLORS, FONT_SIZE, HIT, RADIUS, SPACE } from "@/theme";

/** 숫자 카드 하나: 카드 전체를 누를 수 있고(이름은 「숫자 + 갈 곳」), 오른쪽 › 가 누를 수 있다는 표시예요 */
function Kpi({ kpi, onPress }: { kpi: KpiVM; onPress: () => void }) {
  const highlight = kpi.id === "fees";
  return (
    <Pressable
      testID={`kpi-${kpi.id}`}
      accessibilityRole={kpi.target.kind === "applicants" ? "link" : "button"}
      accessibilityLabel={kpi.actionLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.kpi, highlight ? styles.kpiFees : null, pressed ? styles.kpiPressed : null]}
    >
      <View style={styles.kpiText}>
        <Txt variant="small" tone="muted">
          {kpi.label}
        </Txt>
        <Txt variant="title" tone={highlight ? "primary" : "text"} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {kpi.value}
        </Txt>
      </View>
      <Txt style={styles.kpiGo} accessibilityElementsHidden importantForAccessibility="no">
        ›
      </Txt>
    </Pressable>
  );
}

function FeeCell({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={[styles.feeCell, highlight ? styles.feeCellHighlight : null]}>
      <Txt variant="caption" tone="muted" numberOfLines={2}>
        {label}
      </Txt>
      <Txt variant="heading" tone={highlight ? "primary" : "text"} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </Txt>
    </View>
  );
}

/** 수수료: 규칙(상금·연구 의뢰비의 10%, 최저 ¥9,000 — 상대에게는 직접 전액) · 무료인 것 · 합계 · 수수료가 생긴 거래 */
export function FeeSection({ fee }: { fee: FeeVM }) {
  const { t } = useApp();
  return (
    <Section title={t("b2b.fees")} hint={t("fee.title")}>
      <Card>
        <Txt bold>{fee.rule}</Txt>
        <Notice tone="info" message={`🎁 ${fee.free}`} />
        <View style={styles.feeSplit} testID="fee-totals">
          <FeeCell label={t("fee.count")} value={String(fee.totals.count)} />
          <FeeCell label={t("fee.base")} value={fee.totals.base} />
          <FeeCell label={t("fee.fee")} value={fee.totals.fee} highlight />
        </View>
        {fee.rows.length === 0 ? <Empty>{t("fee.empty")}</Empty> : null}
        {fee.rows.map((row) => (
          <View
            key={row.id}
            accessible
            accessibilityLabel={`${row.kindLabel}, ${row.title}, ${row.dateLabel}, ${t("fee.base")} ${row.baseLabel}, ${t("fee.fee")} ${row.feeLabel}`}
            style={styles.feeRow}
          >
            <Divider />
            <View style={styles.prizeMeta}>
              <Badge label={row.kindLabel} tone={row.kind === "prize" ? "success" : "primary"} />
              <Txt variant="small" tone="muted">
                {row.dateLabel}
              </Txt>
            </View>
            <Txt bold numberOfLines={2}>
              {row.title}
            </Txt>
            <KeyValue label={t("fee.base")} value={row.baseLabel} />
            <KeyValue label={t("fee.fee")} value={row.feeLabel} />
          </View>
        ))}
        <Txt variant="small" tone="muted">
          {fee.note}
        </Txt>
      </Card>
    </Section>
  );
}

/** 상금 지급: 표창 전 · 지급한 상금 합계와 과제별 상태(상금은 기업이 수상 팀에 직접 — 수수료 10%는 따로) */
function PrizeSection({ prize }: { prize: PrizePaymentsVM }) {
  const { t } = useApp();
  return (
    <Section title={t("prize.section")} hint={prize.note}>
      <Card>
        <View style={styles.feeSplit} testID="prize-totals">
          <FeeCell label={t("prize.kpiPromised")} value={prize.promisedLabel} />
          <FeeCell label={t("prize.kpiPaid")} value={prize.paidLabel} />
        </View>
        {prize.rows.map((row) => (
          <View key={row.challengeId} accessible accessibilityLabel={`${row.title}, ${row.amountLabel}, ${t("prize.col.fee")} ${row.feeLabel}, ${row.statusLabel}, ${row.dateLabel}`} style={styles.feeRow}>
            <Divider />
            <Txt bold numberOfLines={2}>
              {row.title}
            </Txt>
            <View style={styles.prizeMeta}>
              <Badge label={row.statusLabel} tone={row.status === "paid" ? "success" : row.status === "promised" || row.status === "choosing" ? "primary" : "neutral"} />
              <Txt variant="small" tone="muted">
                {row.dateLabel}
              </Txt>
              <Txt bold style={styles.prizeAmount}>
                {row.amountLabel}
              </Txt>
            </View>
            <Txt variant="small" tone="muted">
              {t("prize.col.fee")} {row.feeLabel}
            </Txt>
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
  const prize = useMemo(() => selectPrizePayments(demo, locale), [demo, locale]);
  // 같은 화면 안의 칸으로 스크롤: 칸의 위치(onLayout y — 본문 맨 위 기준)를 기억해 두고 scrollTo 해요
  const scrollRef = useRef<ComponentRef<typeof ScrollView> | null>(null);
  const sectionY = useRef<Record<DashboardSection, number>>({ challenges: 0, fees: 0 });
  const openKpi = (kpi: KpiVM) => {
    const target = kpi.target;
    if (target.kind === "applicants") router.push(applicantsHref(ALL_CHALLENGES, target.filter));
    else scrollRef.current?.scrollTo({ y: Math.max(0, sectionY.current[target.section] - SPACE.sm), animated: true });
  };

  return (
    <Screen tabbed testID="screen-dashboard" scrollRef={scrollRef}>
      <View style={styles.welcome}>
        <CompanyAvatar emoji={vm.companyEmoji} accent={vm.companyAccent} size={52} />
        <Txt variant="title" accessibilityRole="header" style={styles.welcomeText}>
          {vm.welcome}
        </Txt>
      </View>

      <Button testID="new-challenge" icon="＋" label={t("b2b.newChallenge")} onPress={() => router.push(ROUTES.b2bNew)} />

      <View accessibilityLabel={t("b2b.title")} style={styles.kpis}>
        {vm.kpis.map((kpi) => (
          <Kpi key={kpi.id} kpi={kpi} onPress={() => openKpi(kpi)} />
        ))}
      </View>

      <View testID="section-challenges" onLayout={(event) => (sectionY.current.challenges = event.nativeEvent.layout.y)}>
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
      </View>

      <PrizeSection prize={prize} />

      <View testID="section-fees" onLayout={(event) => (sectionY.current.fees = event.nativeEvent.layout.y)}>
        <FeeSection fee={vm.fee} />
      </View>
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
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.xs,
    minHeight: HIT,
    padding: SPACE.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  kpiFees: { borderColor: COLORS.primary },
  kpiPressed: { opacity: 0.8 },
  kpiText: { flex: 1, minWidth: 0, gap: 2 },
  kpiGo: { fontSize: FONT_SIZE.xl + 6, lineHeight: 30, fontWeight: "700", color: COLORS.primary },
  feeSplit: { flexDirection: "row", gap: SPACE.sm },
  feeCell: { flex: 1, gap: 2, padding: SPACE.sm, borderRadius: RADIUS.md, backgroundColor: COLORS.bg },
  feeCellHighlight: { borderWidth: 1, borderColor: COLORS.primary },
  feeRow: { gap: SPACE.xs + 2 },
  prizeMeta: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: SPACE.xs + 2 },
  prizeAmount: { marginLeft: "auto" },
});
