// SCR-03 기획서 제출: ① 팀 → ② 파일 → ③ 제목·요약(·동영상) → ④ 최종 제출 → 제출 수령증.
// 파일은 데모라서 견본 파일 세 개(마지막은 일부러 형식이 틀린 것) 중에서 골라요. 검사는 core 의 validateProposalDraft 가 해요.
// 수령증은 같은 경로에 receipt=1 을 붙여 열어요 (챌린지 상세의 "提出受領書を見る" 도 같은 화면).
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { formatBytes } from "@sdgs-compass/core/format";
import { pick } from "@sdgs-compass/core/i18n";
import { charCount, LIMITS, validateProposalDraft, type ProposalError } from "@sdgs-compass/core/proposal";
import { selectChallengeDetail, selectReceipt } from "@sdgs-compass/core/selectors";
import { OptionRow } from "@/components/OptionRow";
import { Screen } from "@/components/Screen";
import { StepDots } from "@/components/StepDots";
import { Button, Card, Field, KeyValue, Notice, Txt } from "@/components/ui";
import { useApp } from "@/lib/AppProvider";
import { challengeHref, paramText, receiptHref, ROUTES } from "@/lib/nav";
import {
  canAdvance,
  errorsForStep,
  firstInvalidStep,
  nextStep,
  prefilledFields,
  previousStep,
  PROPOSAL_ERROR_KEY,
  STEP_LABEL_KEY,
  stepIndex,
  SUBMIT_STEPS,
  toProposalDraft,
  type ProposalFields,
  type SubmitStep,
} from "@/lib/proposalForm";
import { isSubmittable, SAMPLE_FILES } from "@/lib/sampleFiles";
import { SAMPLE_PROPOSAL } from "@/lib/samples";
import { nowIso } from "@/lib/time";
import { MONO_FONT, SPACE } from "@/theme";

function SubmitView({ id }: { id: string }) {
  const { demo, locale, t, dispatch } = useApp();
  const router = useRouter();
  const detail = selectChallengeDetail(demo, id, locale);
  const challenge = demo.challenges.find((c) => c.id === id);
  const mine = demo.proposals.find((p) => p.challengeId === id && p.mine);
  const [step, setStep] = useState<SubmitStep>("team");
  const [fields, setFields] = useState<ProposalFields>(() => prefilledFields(mine));
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!detail || !challenge) {
    return (
      <Screen backTitle={t("submit.title")} testID="screen-submit-missing">
        <Notice tone="warning" title={t("challenge.notFound")} />
        <Button label={t("mobile.notFoundBack")} onPress={() => router.replace(ROUTES.home)} />
      </Screen>
    );
  }

  const goBackToChallenge = () => (router.canGoBack() ? router.back() : router.replace(challengeHref(id)));

  if (!detail.canApply) {
    return (
      <Screen backTitle={t("submit.title")} testID="screen-submit-closed">
        <Notice tone="warning" message={t("challenge.closedNotice")} />
        <Button label={t("receipt.toChallenge")} onPress={goBackToChallenge} />
      </Screen>
    );
  }

  const draft = toProposalDraft(fields);
  const errors = validateProposalDraft(draft, challenge.closesOn, demo.today);
  const update = (patch: Partial<ProposalFields>) => setFields((current) => ({ ...current, ...patch }));
  const go = (next: SubmitStep) => {
    setStep(next);
    setTried(false);
  };

  // 지금 단계에서 보여 줄 오류: 파일은 고르는 즉시, 나머지는 "다음"을 눌러 본 뒤에
  const shown: ProposalError[] = tried || (step === "file" && fields.file !== null) ? errorsForStep(step, errors) : [];
  const message = (codes: readonly ProposalError[]): string | null => {
    const code = shown.find((c) => codes.includes(c));
    return code ? t(PROPOSAL_ERROR_KEY[code]) : null;
  };

  const next = () => {
    if (!canAdvance(step, errors)) {
      setTried(true);
      return;
    }
    go(nextStep(step));
  };

  const finalSubmit = () => {
    if (errors.length > 0) {
      go(firstInvalidStep(errors) ?? "confirm");
      setTried(true);
      return;
    }
    setBusy(true);
    dispatch({ type: "submitProposal", challengeId: id, draft, at: nowIso() });
    router.replace(receiptHref(id));
  };

  const index = stepIndex(step);
  const stepLabels = SUBMIT_STEPS.map((name) => t(STEP_LABEL_KEY[name]));
  const lastStep = step === "confirm";
  const fillSample = () => update({ title: pick(SAMPLE_PROPOSAL.title, locale), summary: pick(SAMPLE_PROPOSAL.summary, locale) });

  const footer = (
    <View style={styles.footer}>
      {step === "team" ? (
        <Button variant="secondary" label={t("common.cancel")} onPress={goBackToChallenge} />
      ) : (
        <Button variant="secondary" label={t("common.prev")} onPress={() => go(previousStep(step))} />
      )}
      <Button
        testID={lastStep ? "final-submit" : "next-step"}
        label={lastStep ? t("submit.finalSubmit") : t("common.next")}
        onPress={lastStep ? finalSubmit : next}
        busy={busy}
        style={styles.grow}
      />
    </View>
  );

  return (
    <Screen backTitle={t("submit.title")} footer={footer} testID="screen-submit">
      <Txt variant="small" tone="muted">
        {detail.card.title} · {t("challenge.deadline")} {detail.card.closesOnLabel} ({detail.card.dDay})
      </Txt>
      <StepDots
        labels={stepLabels}
        current={index}
        accessibilityLabel={`${t("mobile.stepOf", { current: index + 1, total: SUBMIT_STEPS.length })}: ${stepLabels[index]}`}
      />
      {mine ? <Notice tone="info" message={t("submit.resubmitNote", { version: mine.versions.length + 1 })} /> : null}
      {errors.includes("deadline_passed") ? <Notice tone="danger" message={t("submit.error.deadline_passed")} /> : null}

      {step === "team" ? (
        <View style={styles.stack}>
          <Field
            testID="team-name"
            label={t("submit.teamName")}
            hint={`${t("challenge.participation")}: ${detail.card.participationLabel}`}
            value={fields.teamName}
            onChangeText={(text) => update({ teamName: text })}
            placeholder={t("submit.teamNamePh")}
            autoCorrect={false}
            error={message(["team_name_required", "team_name_too_long"])}
          />
          <Button small variant="secondary" label={t("mobile.teamSolo")} onPress={() => update({ teamName: demo.me.nickname })} style={styles.selfStart} />
        </View>
      ) : null}

      {step === "file" ? (
        <View style={styles.stack}>
          <Txt bold>{t("submit.file")}</Txt>
          <Txt variant="small" tone="muted">
            {t("submit.fileHint")}
          </Txt>
          <Notice tone="info" message={t("mobile.sampleHint")} />
          {shown.length > 0 ? (
            <Notice tone="danger" title={t("mobile.errorsTitle")}>
              {shown.map((code) => (
                <Txt key={code} variant="small" tone="danger">
                  • {t(PROPOSAL_ERROR_KEY[code])}
                </Txt>
              ))}
            </Notice>
          ) : null}
          <Txt variant="small" tone="muted" bold>
            {t("submit.pickSample")}
          </Txt>
          <View style={styles.stack}>
            {SAMPLE_FILES.map((sample) => (
              <OptionRow
                key={sample.id}
                testID={`sample-${sample.id}`}
                title={`📄 ${sample.fileName}`}
                subtitle={`${formatBytes(sample.sizeBytes)}${isSubmittable(sample) ? "" : ` · ${t("mobile.sampleInvalid")}`}`}
                selected={fields.file?.id === sample.id}
                onPress={() => update({ file: sample })}
              />
            ))}
          </View>
          {fields.file ? (
            <View style={styles.rowBetween}>
              <Txt variant="small" bold style={styles.shrink}>
                {t("submit.fileChosen", { name: fields.file.fileName, size: formatBytes(fields.file.sizeBytes) })}
              </Txt>
              <Button small variant="ghost" label={t("submit.removeFile")} onPress={() => update({ file: null })} />
            </View>
          ) : null}
        </View>
      ) : null}

      {step === "summary" ? (
        <View style={styles.stack}>
          <Field
            testID="proposal-title"
            label={t("submit.proposalTitle")}
            value={fields.title}
            onChangeText={(text) => update({ title: text })}
            placeholder={t("submit.proposalTitlePh")}
            counter={t("submit.counter", { count: charCount(fields.title), max: LIMITS.title })}
            counterOver={charCount(fields.title) > LIMITS.title}
            error={message(["title_required", "title_too_long"])}
          />
          <Field
            testID="proposal-summary"
            label={t("submit.summary", { max: LIMITS.summary })}
            value={fields.summary}
            onChangeText={(text) => update({ summary: text })}
            placeholder={t("submit.summaryPh")}
            multiline
            counter={t("submit.counter", { count: charCount(fields.summary), max: LIMITS.summary })}
            counterOver={charCount(fields.summary) > LIMITS.summary}
            error={message(["summary_required", "summary_too_long"])}
          />
          <Field
            testID="proposal-video"
            label={t("submit.video")}
            value={fields.videoUrl}
            onChangeText={(text) => update({ videoUrl: text })}
            placeholder={t("submit.videoPh")}
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            error={message(["video_url_invalid"])}
          />
          <Button small variant="ghost" label={t("mobile.fillSample")} onPress={fillSample} style={styles.selfStart} />
        </View>
      ) : null}

      {step === "confirm" ? (
        <View style={styles.stack}>
          <Txt variant="heading" accessibilityRole="header">
            {t("submit.confirmTitle")}
          </Txt>
          <Card>
            <KeyValue label={t("submit.teamName")} value={fields.teamName || "—"} />
            <KeyValue label={t("receipt.file")} value={fields.file ? t("submit.fileChosen", { name: fields.file.fileName, size: formatBytes(fields.file.sizeBytes) }) : "—"} />
            <KeyValue label={t("submit.proposalTitle")} value={fields.title || "—"} />
            <KeyValue label={t("submit.stepSummary")} value={fields.summary || "—"} />
            <KeyValue label={t("submit.video")} value={fields.videoUrl || t("common.none")} />
          </Card>
          {errors.length > 0 ? (
            <Notice tone="danger" title={t("mobile.errorsTitle")}>
              {errors.map((code) => (
                <Txt key={code} variant="small" tone="danger">
                  • {t(PROPOSAL_ERROR_KEY[code])}
                </Txt>
              ))}
            </Notice>
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}

function ReceiptView({ id }: { id: string }) {
  const { demo, locale, t } = useApp();
  const router = useRouter();
  const receipt = selectReceipt(demo, id, locale);
  if (!receipt) {
    return (
      <Screen backTitle={t("receipt.title")} testID="screen-receipt-missing">
        <Notice tone="warning" title={t("error.notFound")} />
        <Button label={t("mobile.notFoundBack")} onPress={() => router.replace(ROUTES.home)} />
      </Screen>
    );
  }
  const back = () => (router.canGoBack() ? router.back() : router.replace(challengeHref(id)));
  return (
    <Screen backTitle={t("receipt.title")} testID="screen-receipt">
      <Card>
        <View style={styles.receiptHead}>
          <Txt style={styles.check} accessibilityElementsHidden importantForAccessibility="no">
            ✅
          </Txt>
          <Txt variant="title" center accessibilityRole="header">
            {t("receipt.thanks")}
          </Txt>
          <Txt variant="small" tone="muted">
            {t("receipt.no")}
          </Txt>
          <Txt variant="heading" tone="primary" selectable testID="receipt-no">
            {receipt.receiptNo}
          </Txt>
        </View>
        <KeyValue label={t("cert.challenge")} value={receipt.challengeTitle} />
        <KeyValue label={t("submit.teamName")} value={receipt.teamName} />
        <KeyValue label={t("submit.proposalTitle")} value={receipt.title} />
        <KeyValue label={t("receipt.at")} value={receipt.submittedAtLabel} />
        <KeyValue label={t("receipt.version")} value={`v${receipt.version}`} />
        <KeyValue label={t("receipt.file")} value={`${receipt.fileName} (${receipt.fileSizeLabel})`} />
        <Txt variant="small" tone="muted" bold>
          {t("receipt.hash")}
        </Txt>
        <Txt variant="caption" selectable style={styles.hash}>
          {receipt.sha256}
        </Txt>
        <Txt variant="small" tone="muted">
          {t("receipt.note")}
        </Txt>
      </Card>
      <Button label={t("receipt.toImpact")} onPress={() => router.navigate(ROUTES.impact)} />
      <Button variant="secondary" label={t("receipt.toChallenge")} onPress={back} />
    </Screen>
  );
}

export function SubmitScreen() {
  const params = useLocalSearchParams();
  const id = paramText(params.id);
  const receipt = paramText(params.receipt) === "1";
  return receipt ? <ReceiptView key={id} id={id} /> : <SubmitView key={id} id={id} />;
}

const styles = StyleSheet.create({
  stack: { gap: SPACE.md },
  footer: { flexDirection: "row", gap: SPACE.sm },
  grow: { flex: 1 },
  shrink: { flexShrink: 1 },
  selfStart: { alignSelf: "flex-start" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACE.sm },
  receiptHead: { alignItems: "center", gap: SPACE.xs, paddingBottom: SPACE.sm },
  check: { fontSize: 44, lineHeight: 54 },
  hash: { fontFamily: MONO_FONT },
});
