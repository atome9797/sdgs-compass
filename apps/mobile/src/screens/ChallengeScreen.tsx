// SCR-02 챌린지 상세: 표지 · 핵심 정보(상금·마감·혜택·Impact) · 참가 신청/재제출/수령증 · 북마크 ·
// [상세 요강 | 팀원 모집 게시판] 탭(배경·미션·제출물·일정·기업 소개 / 게시글 목록·새 글·팀 요청).
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { SKILL_IDS, type SkillId } from "@sdgs-compass/core/domain";
import { pick } from "@sdgs-compass/core/i18n";
import { skillLabel } from "@sdgs-compass/core/labels";
import { selectChallengeDetail, type ChallengeDetailVM, type TeamPostVM } from "@sdgs-compass/core/selectors";
import { Cover } from "@/components/Cover";
import { Screen } from "@/components/Screen";
import { SdgMiniRow } from "@/components/SdgTile";
import { Badge, Button, Card, Chip, Empty, Field, KeyValue, Notice, Section, Segmented, Txt } from "@/components/ui";
import { useApp } from "@/lib/AppProvider";
import { paramText, receiptHref, ROUTES, submitHref } from "@/lib/nav";
import { SAMPLE_TEAM_POST } from "@/lib/samples";
import { nowIso } from "@/lib/time";
import { CARD_SHADOW, COLORS, RADIUS, SPACE } from "@/theme";

type TabId = "detail" | "team";

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact} accessible accessibilityLabel={`${label}: ${value}`}>
      <Txt variant="small" tone="muted">
        {label}
      </Txt>
      <Txt bold>{value}</Txt>
    </View>
  );
}

function TeamPostCard({ post }: { post: TeamPostVM }) {
  const { t, dispatch } = useApp();
  return (
    <Card style={post.mine ? styles.minePost : undefined}>
      <View style={styles.rowBetween}>
        <Txt variant="small" tone="muted" style={styles.shrink}>
          {post.authorLabel}
        </Txt>
        <Txt variant="small" tone="muted">
          {post.dateLabel}
        </Txt>
      </View>
      <Txt bold>{post.title}</Txt>
      {post.body ? <Txt variant="small">{post.body}</Txt> : null}
      <View style={styles.chips}>
        {post.roles.map((role) => (
          <Badge key={role} tone="primary" label={role} />
        ))}
        {post.mine ? <Badge tone="success" label={t("team.myPost")} /> : null}
      </View>
      <View style={styles.rowBetween}>
        <Txt variant="small" tone="muted" style={styles.shrink}>
          {post.requestsLabel}
        </Txt>
        {post.requestedByMe ? (
          <Badge tone="success" label={`✓ ${t("team.requested")}`} />
        ) : post.canRequest ? (
          <Button small variant="secondary" label={t("team.request")} onPress={() => dispatch({ type: "requestTeam", postId: post.id })} />
        ) : null}
      </View>
    </Card>
  );
}

function NewPostForm({ challengeId, onDone }: { challengeId: string; onDone: () => void }) {
  const { t, locale, dispatch } = useApp();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [roles, setRoles] = useState<SkillId[]>([]);
  const [tried, setTried] = useState(false);
  const titleError = tried && title.trim() === "" ? t("team.errorTitle") : null;

  const publish = () => {
    setTried(true);
    if (title.trim() === "") return;
    dispatch({ type: "addTeamPost", challengeId, title, body, rolesWanted: roles, at: nowIso() });
    onDone();
  };
  const toggle = (id: SkillId) => setRoles((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
  const fillSample = () => {
    setTitle(pick(SAMPLE_TEAM_POST.title, locale));
    setBody(pick(SAMPLE_TEAM_POST.body, locale));
    setRoles(SAMPLE_TEAM_POST.roles);
  };

  return (
    <Card>
      <Txt variant="heading" accessibilityRole="header">
        {t("team.new")}
      </Txt>
      <Field testID="team-title" label={t("team.postTitle")} value={title} onChangeText={setTitle} placeholder={t("team.postTitlePh")} maxLength={60} error={titleError} />
      <Field testID="team-body" label={t("team.postBody")} value={body} onChangeText={setBody} placeholder={t("team.postBodyPh")} maxLength={300} multiline />
      <View style={styles.roleBlock}>
        <Txt variant="small" tone="muted" bold>
          {t("team.rolesWanted")}
        </Txt>
        <View style={styles.chips}>
          {SKILL_IDS.map((id) => (
            <Chip key={id} kind="checkbox" label={skillLabel(id, locale)} selected={roles.includes(id)} onPress={() => toggle(id)} />
          ))}
        </View>
      </View>
      <Button small variant="ghost" label={t("mobile.fillSample")} onPress={fillSample} />
      <View style={styles.buttons}>
        <Button label={t("team.publish")} onPress={publish} style={styles.grow} />
        <Button variant="secondary" label={t("common.cancel")} onPress={onDone} />
      </View>
    </Card>
  );
}

function DetailTab({ vm }: { vm: ChallengeDetailVM }) {
  const { t } = useApp();
  const { card } = vm;
  return (
    <View style={styles.stack}>
      {card.match !== null && card.reasons.length > 0 ? (
        <Section title={t("mobile.reasonsTitle")}>
          <Card>
            <Badge tone="success" label={t("home.matchRate", { rate: card.match })} />
            {card.reasons.map((reason) => (
              <Txt key={reason} variant="small" tone="muted">
                ✓ {reason}
              </Txt>
            ))}
          </Card>
        </Section>
      ) : null}
      <Section title={t("challenge.background")}>
        <Txt>{vm.background}</Txt>
      </Section>
      <Section title={t("challenge.mission")}>
        <Txt>{vm.mission}</Txt>
      </Section>
      <Section title={t("challenge.deliverables")}>
        <View style={styles.bullets}>
          {vm.deliverables.map((item) => (
            <Txt key={item}>• {item}</Txt>
          ))}
        </View>
      </Section>
      {vm.skills.length > 0 ? (
        <Section title={t("mobile.challengeSkills")}>
          <View style={styles.chips}>
            {vm.skills.map((skill) => (
              <Badge key={skill} tone="primary" label={skill} />
            ))}
          </View>
        </Section>
      ) : null}
      <Section title={t("challenge.criteria")}>
        <Txt variant="small" tone="muted">
          {t("challenge.criteriaDesc")}
        </Txt>
      </Section>
      <Section title={t("challenge.schedule")}>
        <Card>
          <KeyValue label={t("challenge.opensOn")} value={vm.opensOnLabel} />
          <KeyValue label={t("challenge.closesOn")} value={card.closesOnLabel} />
        </Card>
      </Section>
      <Section title={t("challenge.company")}>
        <Card>
          <Txt bold>
            {vm.company.emoji} {vm.company.name}
            {vm.company.verified ? " ✓" : ""}
          </Txt>
          <Txt variant="small" tone="muted">
            {vm.company.industry} · {vm.company.region}
          </Txt>
          <Txt variant="small">{vm.company.about}</Txt>
          {vm.company.verified ? (
            <Txt variant="caption" tone="muted">
              ✓ {t("mobile.companyVerified")}
            </Txt>
          ) : null}
        </Card>
      </Section>
    </View>
  );
}

function TeamTab({ vm }: { vm: ChallengeDetailVM }) {
  const { t } = useApp();
  const [composing, setComposing] = useState(false);
  return (
    <View style={styles.stack}>
      {composing ? (
        <NewPostForm challengeId={vm.card.id} onDone={() => setComposing(false)} />
      ) : (
        <Button testID="team-new" variant="secondary" icon="＋" label={t("team.new")} onPress={() => setComposing(true)} />
      )}
      {vm.teamPosts.length === 0 ? <Empty>{t("team.empty")}</Empty> : vm.teamPosts.map((post) => <TeamPostCard key={post.id} post={post} />)}
    </View>
  );
}

function ChallengeView({ id }: { id: string }) {
  const { demo, locale, t, dispatch } = useApp();
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("detail");
  const vm = selectChallengeDetail(demo, id, locale);

  if (!vm) {
    return (
      <Screen backTitle={t("challenge.tabDetail")} testID="screen-challenge-missing">
        <Notice tone="warning" title={t("challenge.notFound")} />
        <Button label={t("nav.search")} onPress={() => router.replace(ROUTES.search)} />
      </Screen>
    );
  }

  const { card } = vm;
  const tabs: { value: TabId; label: string }[] = [
    { value: "detail", label: t("challenge.tabDetail") },
    { value: "team", label: t("challenge.tabTeam") },
  ];

  return (
    <Screen backTitle={t("challenge.tabDetail")} testID="screen-challenge">
      <View style={styles.shadow}>
        <View style={styles.clip}>
          <Cover hue={card.hue} emoji={card.companyEmoji} status={card.status} statusLabel={card.statusLabel} dDay={card.dDay} bookmarked={card.bookmarked} height={132} />
          <View style={styles.heroBody}>
            <Txt variant="title" accessibilityRole="header">
              {card.title}
            </Txt>
            <Txt variant="small" tone="muted">
              🏢 {vm.company.name}
              {vm.company.verified ? " ✓" : ""}
            </Txt>
            <SdgMiniRow ids={card.sdgIds} />
            <View style={styles.facts}>
              <Fact label={t("reward.prize")} value={card.prizeLabel ?? t("common.none")} />
              <Fact label={t("challenge.deadline")} value={card.closesOnLabel} />
              <Fact label={t("challenge.rewards")} value={card.rewardLabels.join(" / ") || t("common.none")} />
              <Fact label={t("challenge.impact")} value={card.impactLabel} />
            </View>
            <Txt variant="small" tone="muted">
              {card.applicantsLabel} · {t("challenge.participation")}: {card.participationLabel}
            </Txt>
          </View>
        </View>
      </View>

      <View style={styles.stack}>
        {vm.canApply ? (
          <Button testID="apply" label={vm.hasSubmitted ? t("challenge.resubmit") : t("challenge.apply")} onPress={() => router.push(submitHref(card.id))} />
        ) : vm.hasSubmitted ? null : (
          <Notice tone="warning" message={t("challenge.closedNotice")} />
        )}
        {vm.hasSubmitted ? (
          <View style={styles.rowBetween}>
            <Badge tone="success" label={`✓ ${t("challenge.submitted", { version: card.submittedVersion ?? 1 })}`} />
            <Button small variant="ghost" label={t("challenge.viewReceipt")} onPress={() => router.push(receiptHref(card.id))} />
          </View>
        ) : null}
        <Button
          testID="bookmark"
          small
          variant="secondary"
          label={card.bookmarked ? `★ ${t("challenge.bookmarked")}` : `☆ ${t("challenge.bookmark")}`}
          onPress={() => dispatch({ type: "toggleBookmark", challengeId: card.id })}
          style={styles.selfStart}
        />
        {card.bookmarked ? (
          <Txt variant="small" tone="muted">
            {t("challenge.bookmarkHint")}
          </Txt>
        ) : null}
      </View>

      <Segmented kind="tab" options={tabs} value={tab} onChange={setTab} accessibilityLabel={card.title} />
      {tab === "detail" ? <DetailTab vm={vm} /> : <TeamTab vm={vm} />}
    </Screen>
  );
}

export function ChallengeScreen() {
  const id = paramText(useLocalSearchParams().id);
  // 다른 챌린지로 옮기면 탭·입력 상태를 새로 시작해요
  return <ChallengeView key={id} id={id} />;
}

const styles = StyleSheet.create({
  stack: { gap: SPACE.md },
  shadow: { borderRadius: RADIUS.lg, backgroundColor: COLORS.card, ...CARD_SHADOW },
  clip: { borderRadius: RADIUS.lg, overflow: "hidden", borderWidth: 1, borderColor: COLORS.border },
  heroBody: { padding: SPACE.lg, gap: SPACE.sm },
  facts: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.sm },
  fact: { flexBasis: "48%", flexGrow: 1, gap: 2, padding: SPACE.md, borderRadius: RADIUS.md, backgroundColor: COLORS.bg },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACE.sm },
  shrink: { flexShrink: 1 },
  grow: { flex: 1 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.xs + 2 },
  bullets: { gap: SPACE.xs },
  roleBlock: { gap: SPACE.sm },
  buttons: { flexDirection: "row", gap: SPACE.sm },
  selfStart: { alignSelf: "flex-start" },
  minePost: { borderColor: COLORS.primary, borderWidth: 1.5 },
});
