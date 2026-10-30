// 응모자·심사(F-303): 챌린지 선택 → 점수순 응모자 → 심사(3항목 1~5점 + 코멘트) → 시상 → 채택(매칭 성립: 수수료 ¥30,000 중 50% 기부).
// 대시보드의 "응모자 보기"는 ?id=챌린지 를 붙여 이 탭을 열고, 그 챌린지를 미리 골라요.
// 수상·채택된 응모 건에는 "홍보하기"가 붙어요 — 그 챌린지를 연결한 홍보 글쓰기(F-504)가 열려요.
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import type { AwardKind, ProposalStatus } from "@sdgs-compass/core/domain";
import { awardLabel } from "@sdgs-compass/core/labels";
import { selectApplicants, type ApplicantVM } from "@sdgs-compass/core/selectors";
import { OptionRow } from "@/components/OptionRow";
import { Screen, ScreenTitle } from "@/components/Screen";
import { Badge, Button, Card, Empty, Field, KeyValue, Notice, Section, Segmented, Stepper, Txt, type BadgeTone } from "@/components/ui";
import { useApp } from "@/lib/AppProvider";
import { isHttpUrl } from "@/lib/links";
import { composeHref, paramText } from "@/lib/nav";
import { AWARD_KINDS, DEFAULT_AWARD, REVIEW_MAX, REVIEW_MIN, reviewFormFrom, toReviewInput, type ReviewFormState } from "@/lib/reviewForm";
import { nowIso } from "@/lib/time";
import { SPACE } from "@/theme";

const STATUS_TONE: Record<ProposalStatus, BadgeTone> = { submitted: "neutral", reviewed: "primary", awarded: "warning", adopted: "success" };
const CHALLENGE_TONE = { open: "success", judging: "warning", closed: "neutral" } as const satisfies Record<string, BadgeTone>;

function RateStepper({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  const { t } = useApp();
  return (
    <Stepper
      label={label}
      value={value}
      min={REVIEW_MIN}
      max={REVIEW_MAX}
      onChange={onChange}
      formatValue={(score) => t("review.rating", { score })}
      decreaseLabel={t("mobile.decrease")}
      increaseLabel={t("mobile.increase")}
    />
  );
}

function ReviewForm({ applicant }: { applicant: ApplicantVM }) {
  const { t, dispatch } = useApp();
  const [form, setForm] = useState<ReviewFormState>(() => reviewFormFrom(applicant.review));
  const [saved, setSaved] = useState(false);

  const edit = (patch: Partial<ReviewFormState>) => {
    setForm((current) => ({ ...current, ...patch }));
    setSaved(false);
  };
  const save = () => {
    dispatch({ type: "reviewProposal", proposalId: applicant.id, review: toReviewInput(form), at: nowIso() });
    setSaved(true);
  };

  return (
    <View style={styles.stack}>
      <Txt variant="heading" accessibilityRole="header">
        {t("review.title")}
      </Txt>
      <RateStepper label={t("review.creativity")} value={form.creativity} onChange={(creativity) => edit({ creativity })} />
      <RateStepper label={t("review.feasibility")} value={form.feasibility} onChange={(feasibility) => edit({ feasibility })} />
      <RateStepper label={t("review.sdgContribution")} value={form.sdgContribution} onChange={(sdgContribution) => edit({ sdgContribution })} />
      <Field label={t("review.comment")} value={form.comment} onChangeText={(comment) => edit({ comment })} placeholder={t("review.commentPh")} multiline />
      <Button testID={`review-save-${applicant.id}`} label={t("review.save")} onPress={save} />
      {saved ? <Notice testID={`review-saved-${applicant.id}`} tone="success" message={t("review.saved")} /> : null}
    </View>
  );
}

function AwardAndAdopt({ applicant, feeNote }: { applicant: ApplicantVM; feeNote: string }) {
  const { t, locale, dispatch } = useApp();
  const [award, setAward] = useState<AwardKind>(applicant.award ?? DEFAULT_AWARD);
  const [confirming, setConfirming] = useState(false);

  return (
    <View style={styles.stack}>
      <Segmented
        options={AWARD_KINDS.map((kind) => ({ value: kind, label: awardLabel(kind, locale) }))}
        value={award}
        onChange={setAward}
        accessibilityLabel={t("mobile.awardKind")}
      />
      <Button
        testID={`award-${applicant.id}`}
        variant="secondary"
        icon="🏆"
        label={t("review.award")}
        onPress={() => dispatch({ type: "awardProposal", proposalId: applicant.id, award })}
      />
      {confirming ? (
        <View style={styles.stack}>
          <Notice tone="info" message={`💗 ${feeNote}`} />
          <Button
            testID={`adopt-confirm-${applicant.id}`}
            label={t("common.confirm")}
            onPress={() => {
              dispatch({ type: "adoptProposal", proposalId: applicant.id, at: nowIso() });
              setConfirming(false);
            }}
          />
          <Button variant="secondary" label={t("common.cancel")} onPress={() => setConfirming(false)} />
        </View>
      ) : (
        <Button testID={`adopt-${applicant.id}`} icon="🤝" label={t("review.adopt")} onPress={() => setConfirming(true)} />
      )}
    </View>
  );
}

function ApplicantCard({ applicant, challengeId, feeNote }: { applicant: ApplicantVM; challengeId: string | null; feeNote: string }) {
  const { t } = useApp();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const promotable = applicant.status === "awarded" || applicant.status === "adopted";
  const openVideo = () => {
    if (isHttpUrl(applicant.videoUrl)) void Linking.openURL(applicant.videoUrl.trim()).catch(() => undefined);
  };

  return (
    <Card>
      <View style={styles.badges}>
        <Badge tone={STATUS_TONE[applicant.status]} label={applicant.statusLabel} />
        <Badge label={applicant.versionLabel} />
        {applicant.awardLabel ? <Badge tone="warning" label={`🏆 ${applicant.awardLabel}`} /> : null}
        {applicant.mine ? <Badge tone="primary" label={t("applicants.mine")} /> : null}
      </View>
      <Txt variant="small" tone={applicant.average === null ? "muted" : "primary"} bold>
        {applicant.scoreLabel}
      </Txt>
      <Txt variant="heading">{applicant.title}</Txt>
      <Txt variant="small" tone="muted">
        {t("applicants.team", { name: applicant.teamName })}
      </Txt>
      <Txt variant="small">{applicant.summary}</Txt>
      <KeyValue label={t("receipt.file")} value={applicant.fileName} />
      <KeyValue label={t("receipt.no")} value={applicant.receiptNo} />
      <KeyValue label={t("receipt.at")} value={applicant.submittedLabel} />
      {isHttpUrl(applicant.videoUrl) ? <Button small variant="ghost" icon="🎬" label={`${t("mobile.openVideo")} ↗`} onPress={openVideo} /> : null}

      <View style={styles.badges}>
        <Button
          testID={`toggle-review-${applicant.id}`}
          small
          variant="secondary"
          label={`${open ? "▲" : "▼"} ${t("review.title")}`}
          onPress={() => setOpen((value) => !value)}
        />
        {applicant.adopted ? <Badge tone="success" label={`✓ ${t("review.adopted")}`} /> : null}
        {promotable ? (
          <Button
            testID={`promote-${applicant.id}`}
            small
            variant="secondary"
            icon="📣"
            label={t("applicants.promote")}
            onPress={() => router.push(composeHref("pr", challengeId))}
          />
        ) : null}
      </View>

      {open ? (
        <View style={styles.panel}>
          <ReviewForm applicant={applicant} />
          {applicant.adopted ? null : <AwardAndAdopt applicant={applicant} feeNote={feeNote} />}
        </View>
      ) : null}
    </Card>
  );
}

export function ApplicantsScreen() {
  const { demo, locale, t } = useApp();
  const requestedId = paramText(useLocalSearchParams().id);
  const [picked, setPicked] = useState<string | null>(requestedId === "" ? null : requestedId);
  const [seenParam, setSeenParam] = useState(requestedId);
  // 대시보드에서 다른 챌린지로 다시 열리면 그 챌린지로 맞춰요 (렌더 중에 맞추는 방식이라 effect 가 필요 없어요)
  if (seenParam !== requestedId) {
    setSeenParam(requestedId);
    if (requestedId !== "") setPicked(requestedId);
  }
  const vm = useMemo(() => selectApplicants(demo, locale, picked), [demo, locale, picked]);

  return (
    <Screen tabbed testID="screen-applicants">
      <ScreenTitle title={t("applicants.title")} />

      {vm.challengeOptions.length === 0 ? (
        <Empty testID="no-applicant-challenges">{t("b2b.noChallenges")}</Empty>
      ) : (
        <>
          <Section title={t("applicants.pick")}>
            <View style={styles.stack}>
              {vm.challengeOptions.map((option) => (
                <OptionRow
                  key={option.id}
                  testID={`pick-${option.id}`}
                  title={option.title}
                  subtitle={option.statusLabel}
                  selected={option.id === vm.selectedId}
                  onPress={() => setPicked(option.id)}
                />
              ))}
            </View>
          </Section>

          {vm.selected ? (
            <View style={styles.badges}>
              <Badge tone={CHALLENGE_TONE[vm.selected.status]} label={vm.selected.statusLabel} />
              <Badge label={vm.selected.dDay} />
              <Badge label={vm.selected.applicantsLabel} />
            </View>
          ) : null}

          {vm.applicants.length === 0 ? (
            <Empty testID="no-applicants">{t("applicants.empty")}</Empty>
          ) : (
            vm.applicants.map((applicant) => <ApplicantCard key={applicant.id} applicant={applicant} challengeId={vm.selectedId} feeNote={vm.feeNote} />)
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: SPACE.md },
  badges: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: SPACE.xs + 2 },
  panel: { gap: SPACE.lg },
});
