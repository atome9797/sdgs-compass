// SCR-04 마이 포트폴리오 = 용사의 프로필: 스킬(#38 · #45 — 수상으로 얻은 SDG 마다의 스킬과 레벨, 그 밑에 스킬이 된 수상) · 스카우트 수신 설정(따로 된 줄) · 応募中の課題(#28, 낸 기획서가 있을 때만)
// · 용사의 스테이터스(components/StatsWindow, #43 · #45 — SDGs 17항목, 기업의 평가 점수가 EXP 로 쌓여 레벨이 올라요) · 배지 · 참여 실적 · 증명서/요약/카드뉴스 단추 · 맨 아래 リワード残高 카드(#25 데모).
// 값은 모두 core 의 selectImpact 에서 와요(웹과 같은 내용).
// #30 기업이 내 기획서를 심사·표창하면 応募中の課題 카드에 「企業からの審査結果」(점수 3개 · 코멘트 · 받은 EXP 와 오른 레벨 · 다음에 키울 점 · 수상 · 얻은 스킬)가 붙어요.
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { selectApplications, selectCertificates, selectImpact, type ApplicationReviewVM, type HeroSkillVM, type SdgSkillVM } from "@sdgs-compass/core/selectors";
import { selectWallet } from "@sdgs-compass/core/walletView";
import { ActivityRow } from "@/components/ActivityRow";
import { Screen, ScreenTitle } from "@/components/Screen";
import { SdgEmblem } from "@/components/SdgEmblem";
import { StatsWindow } from "@/components/StatsWindow";
import { SdgMiniRow } from "@/components/SdgTile";
import { Badge, Button, Card, Empty, Notice, Section, Txt } from "@/components/ui";
import { useApp } from "@/lib/AppProvider";
import { certificateHref, challengeHref, paramText, receiptHref, ROUTES } from "@/lib/nav";
import { COLORS, GAME_COLORS, RADIUS, SPACE } from "@/theme";

/**
 * #30 기업의 심사 결과: 점수는 막대 + 「4/5」 글자(색만으로 구분하지 않아요), 가장 낮은 항목은 「次に伸ばすポイント」 한 줄로도 알려요.
 * 스크린 리더는 점수·평균·받은 EXP 와 오른 레벨·다음에 키울 점·수상·얻은 스킬을 요약 한 문장(summary)으로, 코멘트는 따로 읽어요.
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
        {/* 수상하면 그 퀘스트의 SDG 마다 스킬을 「おぼえた！」 · 이미 있던 SDG 는 「レベルアップ！」(#38 · #45) */}
        {review.skillLearned ? (
          <View style={[styles.itemWon, styles.learnedRow]} testID={`impact-skill-learned-${id}`}>
            <View style={styles.learnedIcons}>
              {review.skillLearned.sdgIds.map((sdg) => (
                <SdgEmblem key={sdg} id={sdg} size={22} />
              ))}
            </View>
            <View style={styles.shrink}>
              {review.skillLearned.learnedLines.map((line) => (
                <Txt key={line} variant="small" bold style={styles.itemWonText}>
                  {line}
                </Txt>
              ))}
            </View>
          </View>
        ) : null}
        {/* 상품 보상이 걸린 퀘스트에서 수상하면 「〇〇を手に入れた！」(#37) */}
        {review.rewardItemLabel ? (
          <View style={styles.itemWon} testID={`impact-item-${id}`}>
            <Txt variant="small" bold style={styles.itemWonText}>
              🎁 {review.rewardItemLabel}
            </Txt>
          </View>
        ) : null}
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
        {/* 평가 점수는 상과 관계없이 그 퀘스트의 SDG 항목에 EXP 로 들어가요(#45) — 레벨이 오르면 한 줄씩 */}
        {review.averageLabel || review.expLabel ? (
          <View style={styles.resultTotal}>
            {review.averageLabel ? (
              <Txt variant="small" bold>
                {review.averageLabel}
              </Txt>
            ) : null}
            {review.expLabel ? <Badge tone="success" label={review.expLabel} /> : null}
          </View>
        ) : null}
        {review.statusLevelUps.map((line) => (
          <Txt key={line} variant="small" bold tone="success">
            {`⬆ ${line}`}
          </Txt>
        ))}
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
  const vm = useMemo(() => selectImpact(demo, locale), [demo, locale]);
  const applications = useMemo(() => selectApplications(demo, locale), [demo, locale]);
  const certs = useMemo(() => selectCertificates(demo, locale), [demo, locale]);
  const wallet = useMemo(() => selectWallet(demo, locale), [demo, locale]);
  // 수령증의 「マイImpactを見る」로 오면 경로에 방금 낸 과제(just)가 붙어 있어요 — 그 과제를 강조해요
  const just = paramText(useLocalSearchParams().just);
  const firstCert = certs[0];

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
        {/* 스킬 = 수상 경력(#38 · #45): 수상한 퀘스트의 SDG 마다 스킬, 같은 SDG 의 수상이 쌓이면 레벨이 올라요(돈과 무관한 기록) */}
        <Txt variant="display" testID="impact-total">
          {vm.skillCountLabel}
        </Txt>
        {vm.sdgSkills.length === 0 ? (
          <Txt variant="small" tone="muted">
            {t("impact.skillsEmpty")}
          </Txt>
        ) : (
          <>
            <View style={styles.sdgSkillGrid} testID="impact-sdg-skills">
              {vm.sdgSkills.map((skill) => (
                <SdgSkillTile key={skill.sdgId} skill={skill} />
              ))}
            </View>
            <Txt variant="small" tone="muted" bold>
              {t("impact.skillRecords")}
            </Txt>
            <View style={styles.skillList} testID="impact-skills">
              {vm.skills.map((skill) => (
                <SkillRow key={skill.id} skill={skill} />
              ))}
            </View>
          </>
        )}
        <Txt variant="small" tone="muted">
          {vm.skillsHint}
        </Txt>
        {/* 스카우트 수신은 스킬과 관계없는 "설정"이라, 선으로 나눈 따로 된 줄에 상태 + 설명 + 설정 단추로 보여요 */}
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

      {/* 용사의 스테이터스(#43 · #45): SDGs 17항목 — 기업의 평가 점수가 EXP 로 쌓여 항목마다 레벨이 올라요 */}
      <StatsWindow stats={vm.stats} locale={locale} testID="impact-stats" />

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
            {wallet.totalLabel}
          </Txt>
        </View>
        <Txt variant="small" tone="muted">
          {t("wallet.cardNote")}
        </Txt>
        <Txt variant="small" tone="muted">
          {wallet.notices.skills}
        </Txt>
        <Button testID="open-wallet" variant="secondary" small label={t("wallet.more")} onPress={() => router.push(ROUTES.wallet)} />
      </Card>
    </Screen>
  );
}

/** SDG 스킬 하나(#45): 문장 · 번호와 스킬 레벨(= 그 SDG 의 수상 수) · 공식 이름 · 「受賞 2件」 (웹 .sdg-skill 과 같은 모양) */
function SdgSkillTile({ skill }: { skill: SdgSkillVM }) {
  return (
    <View style={styles.sdgSkill} accessible accessibilityLabel={skill.ariaLabel} testID={`impact-sdg-skill-${skill.sdgId}`}>
      <View style={styles.sdgSkillSlot}>
        <SdgEmblem id={skill.sdgId} size={30} />
      </View>
      <View style={styles.sdgSkillMain}>
        <View style={styles.sdgSkillHead}>
          <View style={[styles.sdgSkillNo, { backgroundColor: skill.color }]}>
            <Txt variant="caption" bold style={{ color: skill.textColor }}>
              {skill.sdgId}
            </Txt>
          </View>
          <Txt variant="small" bold style={styles.sdgSkillLevel} numberOfLines={1}>
            {skill.levelLabel}
          </Txt>
        </View>
        <Txt variant="caption" bold style={styles.sdgSkillGoalText} numberOfLines={3}>
          {skill.goal}
        </Txt>
        <Txt variant="caption" bold style={styles.sdgSkillCount}>
          {skill.countLabel}
        </Txt>
      </View>
    </View>
  );
}

/** 스킬이 된 수상 한 줄(#38): 왼쪽에 대표 SDG 의 문장과 번호, 이름 · ★(상의 세기) · 상 · 기업 · 날짜 · 수상한 퀘스트 · 스킬을 얻은 SDG 번호 모두 (웹 .skill 과 같은 모양) */
function SkillRow({ skill }: { skill: HeroSkillVM }) {
  return (
    <View style={styles.skill} accessible accessibilityLabel={skill.ariaLabel} testID={`impact-skill-${skill.activityId}`}>
      {/* 대표 SDG 의 스킬 문장(#42) + 번호 */}
      <View style={styles.skillBadge}>
        <SdgEmblem id={skill.sdgId} size={36} />
        <View style={[styles.skillType, { backgroundColor: skill.color }]}>
          <Txt bold style={{ color: skill.textColor }}>
            {skill.sdgId}
          </Txt>
        </View>
      </View>
      <View style={styles.skillMain}>
        <Txt bold style={styles.skillName}>
          {skill.name} <Txt style={styles.stars}>{"★".repeat(skill.stars)}</Txt>
          <Txt style={styles.starsOff}>{"★".repeat(3 - skill.stars)}</Txt>
        </Txt>
        <Txt variant="small">{skill.metaLabel}</Txt>
        <Txt variant="small" tone="muted">
          {skill.questLabel}
        </Txt>
        <SdgMiniRow ids={skill.sdgIds} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skillList: { gap: SPACE.sm },
  skill: { flexDirection: "row", alignItems: "flex-start", gap: SPACE.md, padding: SPACE.md, borderRadius: RADIUS.md, borderWidth: 2, borderColor: GAME_COLORS.ink, backgroundColor: GAME_COLORS.panel },
  skillBadge: { alignItems: "center", gap: 4 },
  skillType: { minWidth: 32, height: 24, paddingHorizontal: 4, alignItems: "center", justifyContent: "center", borderRadius: 5, borderWidth: 2, borderColor: GAME_COLORS.ink },
  learnedIcons: { flexDirection: "row", gap: 3, padding: 2, borderRadius: 5, backgroundColor: GAME_COLORS.panel },
  // #45 SDG 스킬 칸(한 칸 150 이상 — 좁은 화면은 1열, 보통 2열): 남색 게임 창 · 금색 레벨
  sdgSkillGrid: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.xs + 2 },
  sdgSkill: { flexBasis: "48%", minWidth: 150, flexGrow: 1, flexDirection: "row", alignItems: "center", gap: SPACE.sm, padding: SPACE.sm, borderRadius: 8, borderWidth: 2, borderColor: GAME_COLORS.ink, backgroundColor: GAME_COLORS.window },
  sdgSkillSlot: { padding: 2, borderRadius: 6, borderWidth: 2, borderColor: "#0B1324", backgroundColor: GAME_COLORS.panel },
  sdgSkillMain: { flex: 1, minWidth: 0, gap: 3 },
  sdgSkillHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  sdgSkillNo: { minWidth: 22, height: 18, paddingHorizontal: 3, alignItems: "center", justifyContent: "center", borderRadius: 4 },
  sdgSkillGoalText: { color: GAME_COLORS.frame },
  sdgSkillLevel: { flexShrink: 1, color: GAME_COLORS.speaker },
  sdgSkillCount: { color: GAME_COLORS.reward },
  skillMain: { flex: 1, gap: 3 },
  skillName: { color: GAME_COLORS.ink },
  stars: { color: "#C98A0C" },
  starsOff: { color: "#CBD2DC" },
  learnedRow: { flexDirection: "row", alignItems: "center", gap: SPACE.sm },
  // 수상 뒤 「〇〇を手に入れた！」(#37): 남색 바탕 · 금색 글자 (웹 .item-won 과 같은 색)
  itemWon: { marginTop: SPACE.xs, paddingVertical: SPACE.sm, paddingHorizontal: SPACE.md, borderRadius: RADIUS.md, backgroundColor: GAME_COLORS.window },
  itemWonText: { color: GAME_COLORS.speaker },
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
