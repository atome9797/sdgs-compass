// SCR-04 마이 포트폴리오: 레벨·누적 지수 · 스카우트 수신 설정(따로 된 줄) · 応募中の課題(#28, 낸 기획서가 있을 때만) · SDGs Impact 레이더 차트(17목표) · 강점 SDGs · 배지 · 참여 실적
// · 증명서/요약/카드뉴스 단추 · 맨 아래 リワード残高 카드(#25 데모).
// 레이더는 SVG 없이 View 로 그려요(components/RadarChart). 값은 모두 core 의 selectImpact 에서 와요.
// #30 기업이 내 기획서를 심사·표창하면 応募中の課題 카드에 「企業からの審査結果」(점수 3개 · 코멘트 · 반영 포인트 · 다음에 키울 점 · 수상)가 붙어요.
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { selectApplications, selectCertificates, selectImpact, type ApplicationReviewVM } from "@sdgs-compass/core/selectors";
import { selectWallet } from "@sdgs-compass/core/walletView";
import { ActivityRow } from "@/components/ActivityRow";
import { RadarChart } from "@/components/RadarChart";
import { Screen, ScreenTitle } from "@/components/Screen";
import { SdgMiniRow, SdgTile } from "@/components/SdgTile";
import { Badge, Button, Card, Empty, Notice, ProgressBar, Section, Txt } from "@/components/ui";
import { useApp } from "@/lib/AppProvider";
import { squareSizeFor } from "@/lib/geometry";
import { certificateHref, challengeHref, paramText, receiptHref, ROUTES } from "@/lib/nav";
import { COLORS, RADIUS, SPACE } from "@/theme";

/**
 * #30 기업의 심사 결과: 점수는 막대 + 「4/5」 글자(색만으로 구분하지 않아요), 가장 낮은 항목은 「次に伸ばすポイント」 한 줄로도 알려요.
 * 스크린 리더는 점수·평균·반영 포인트·다음에 키울 점·수상을 요약 한 문장(summary)으로, 코멘트는 따로 읽어요.
 */
function ReviewResult({ review, id }: { review: ApplicationReviewVM; id: string }) {
  return (
    <View style={styles.result} testID={`impact-review-${id}`}>
      <View accessible accessibilityLabel={review.summary} style={styles.resultMain}>
        <View style={styles.resultHead}>
          <Txt variant="small" bold>
            {review.title}
          </Txt>
          {review.awardLabel ? <Badge tone="warning" label={`🏆 ${review.awardLabel}`} /> : null}
        </View>
        {review.scores.map((score) => (
          <View key={score.key} style={styles.scoreRow} testID={`review-score-${score.key}`}>
            <Txt variant="small" bold style={styles.scoreLabel}>
              {score.label}
            </Txt>
            <View style={styles.scoreTrack}>
              <View style={[styles.scoreFill, { width: `${(score.value / score.max) * 100}%`, backgroundColor: score.lowest ? COLORS.warning : COLORS.primary }]} />
            </View>
            <Txt variant="small" bold style={styles.scoreValue}>
              {score.valueLabel}
            </Txt>
          </View>
        ))}
        {review.averageLabel || review.bonusLabel ? (
          <View style={styles.resultTotal}>
            {review.averageLabel ? (
              <Txt variant="small" bold>
                {review.averageLabel}
              </Txt>
            ) : null}
            {review.bonusLabel ? <Badge tone="success" label={review.bonusLabel} /> : null}
          </View>
        ) : null}
        {review.improveLabel ? (
          <Txt variant="small" bold tone="warning">
            {`🌱 ${review.improveLabel}`}
          </Txt>
        ) : null}
      </View>
      {review.comment ? (
        <View style={styles.comment} accessible accessibilityLabel={`${review.commentBy ?? ""} ${review.comment}`} testID={`impact-review-comment-${id}`}>
          <Txt variant="caption" tone="muted" bold>
            {review.commentBy}
          </Txt>
          <Txt variant="small">{review.comment}</Txt>
        </View>
      ) : null}
    </View>
  );
}

export function ImpactScreen() {
  const { demo, locale, t } = useApp();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const vm = useMemo(() => selectImpact(demo, locale), [demo, locale]);
  const applications = useMemo(() => selectApplications(demo, locale), [demo, locale]);
  const certs = useMemo(() => selectCertificates(demo, locale), [demo, locale]);
  const wallet = useMemo(() => selectWallet(demo, locale), [demo, locale]);
  // 수령증의 「マイImpactを見る」로 오면 경로에 방금 낸 과제(just)가 붙어 있어요 — 그 과제를 강조해요
  const just = paramText(useLocalSearchParams().just);
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
        </View>
        {/* 실적은 포인트 숫자가 아니라 레벨 + 진행률로 보여요(돈과 무관한 지표) */}
        <Txt variant="small" tone="muted">
          {t("impact.total")}
        </Txt>
        <Txt variant="display" testID="impact-total">
          {vm.levelLabel}
        </Txt>
        <ProgressBar ratio={vm.progressPercent / 100} accessibilityLabel={t("impact.total")} valueText={vm.nextLevelLabel} />
        <Txt variant="small" tone="muted">
          {vm.nextLevelLabel}
        </Txt>
        <Txt variant="small" tone="muted">
          {vm.levelHint}
        </Txt>
        {/* 스카우트 수신은 포인트와 관계없는 "설정"이라, 진행 막대 아래가 아니라 선으로 나눈 따로 된 줄에 상태 + 설명 + 설정 단추로 보여요 */}
        <View style={styles.scoutRow} testID="impact-scout">
          <Txt accessibilityElementsHidden importantForAccessibility="no">
            {vm.scoutable ? "🔔" : "🔕"}
          </Txt>
          <View style={styles.scoutText}>
            <Txt variant="small" bold>
              {vm.scoutStatus}
            </Txt>
            <Txt variant="small" tone="muted">
              {vm.scoutNote}
            </Txt>
          </View>
          <Button testID="impact-scout-settings" variant="ghost" small label={t("impact.scoutChange")} onPress={() => router.push(ROUTES.settings)} />
        </View>
      </Card>


      {/* #28 응모 중인 과제: 기획서를 낸 뒤 어느 기업의 어느 과제에 냈는지 첫 화면에서 보여요(낸 것이 없으면 칸째 숨겨요) */}
      {applications.length > 0 ? (
        <Section title={t("impact.applications")} hint={t("impact.applicationsHint")}>
          {applications.map((app) => {
            const fresh = app.challengeId === just;
            return (
              <Card key={app.challengeId} style={fresh ? styles.appliedNew : undefined}>
                <View style={styles.applied} testID={`impact-application-${app.challengeId}`}>
                  <Txt variant="small" tone="muted" bold numberOfLines={2}>
                    {app.companyName}
                  </Txt>
                  <Txt bold numberOfLines={3}>
                    {app.challengeTitle}
                  </Txt>
                  <View style={styles.appliedTags}>
                    {fresh ? <Badge label={`✓ ${t("impact.justSubmitted")}`} tone="success" /> : null}
                    <Badge label={app.statusLabel} tone={app.status === "open" ? "primary" : "warning"} />
                    <Badge label={app.versionLabel} />
                  </View>
                  {app.deadlineLabel ? (
                    <Txt variant="small" tone="muted">
                      {app.deadlineLabel}
                    </Txt>
                  ) : null}
                  <SdgMiniRow ids={app.sdgIds} size={20} />
                  {app.review ? <ReviewResult review={app.review} id={app.challengeId} /> : null}
                  <View style={styles.appliedLinks}>
                    <Button variant="ghost" small label={t("impact.viewChallenge")} onPress={() => router.push(challengeHref(app.challengeId))} />
                    <Button variant="ghost" small label={t("challenge.viewReceipt")} onPress={() => router.push(receiptHref(app.challengeId))} />
                  </View>
                </View>
              </Card>
            );
          })}
        </Section>
      ) : null}

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
        <Button testID="open-summary" variant="secondary" icon="🗂" label={t("summary.entry")} onPress={() => router.push(ROUTES.summary)} />
        <Button testID="open-share" variant="secondary" icon="📣" label={t("impact.shareButton")} onPress={() => router.push(ROUTES.share)} />
      </View>

      {/* #25 リワード残高(데모): 돈은 레벨과 따로 — 레벨은 바꿀 수 없다는 고지 ④ 를 카드에 함께 보여요.
          맨 아래에 둬요(#28): 제출 직후 첫 화면에서 지난 샘플 상금이 방금 낸 기획서의 결과처럼 보이지 않게 */}
      <Card>
        <View style={styles.rowBetween} testID="impact-wallet">
          <View style={styles.walletTitle}>
            <Txt bold>💴 {t("wallet.title")}</Txt>
            <Badge label={t("wallet.demo")} tone="warning" />
          </View>
          <Txt variant="title" bold>
            {wallet.balanceLabel}
          </Txt>
        </View>
        <Txt variant="small" tone="muted">
          {t("wallet.cardNote")}
        </Txt>
        <Txt variant="small" tone="muted">
          {wallet.notices.level}
        </Txt>
        <Button testID="open-wallet" variant="secondary" small label={t("wallet.more")} onPress={() => router.push(ROUTES.wallet)} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACE.sm },
  shrink: { flexShrink: 1 },
  walletTitle: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: SPACE.xs + 2, flexShrink: 1 },
  applied: { gap: SPACE.xs + 2 },
  appliedNew: { borderColor: COLORS.primary, borderWidth: 2 },
  appliedTags: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: SPACE.xs + 2 },
  appliedLinks: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.sm },
  result: { gap: SPACE.sm, padding: SPACE.md, borderRadius: RADIUS.md, backgroundColor: COLORS.bg },
  resultMain: { gap: SPACE.xs + 2 },
  resultHead: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: SPACE.xs + 2 },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: SPACE.sm },
  scoreLabel: { width: 96 },
  scoreTrack: { flex: 1, height: 8, borderRadius: RADIUS.pill, backgroundColor: COLORS.border, overflow: "hidden" },
  scoreFill: { height: 8, borderRadius: RADIUS.pill },
  scoreValue: { minWidth: 32, textAlign: "right" },
  resultTotal: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: SPACE.sm },
  comment: { gap: 2, paddingVertical: SPACE.xs + 2, paddingHorizontal: SPACE.sm + 2, borderLeftWidth: 3, borderLeftColor: COLORS.primary, backgroundColor: COLORS.card },
  scoutRow: { flexDirection: "row", alignItems: "center", gap: SPACE.sm, paddingTop: SPACE.md, borderTopWidth: 1, borderTopColor: COLORS.border },
  scoutText: { flex: 1, minWidth: 0 },
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
