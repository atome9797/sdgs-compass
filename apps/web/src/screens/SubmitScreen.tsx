"use client";

// SCR-03 기획서 제출: ① 팀 → ② 파일 → ③ 제목·요약(·동영상) → ④ 최종 제출 → 제출 수령증
// 파일은 진짜 <input type="file"> 로 고르되 이름·크기만 읽어요(내용은 읽거나 보내지 않아요). 입력 검사는 core 의 validateProposalDraft 가 해요.
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type ChangeEvent } from "react";
import { formatBytes } from "@sdgs-compass/core/format";
import { charCount, LIMITS, validateProposalDraft, type ProposalError } from "@sdgs-compass/core/proposal";
import { selectChallengeDetail, selectReceipt } from "@sdgs-compass/core/selectors";
import { Banner, Button, ButtonLink, Counter, ErrorList, Field, ScreenHead } from "@/components/ui";
import { canLeaveStep, emptyDraftFields, errorsForStep, firstInvalidStep, pickFileInfo, SAMPLE_FILES, SUBMIT_STEPS, toProposalDraft, type DraftFields, type SubmitStep } from "@/lib/draft";
import { buildHref, challengeHref, receiptHref, ROUTES } from "@/lib/routes";
import { useSession } from "@/lib/session";
import { nowIso } from "@/lib/time";

/** 화면 미리보기·테스트용: 특정 단계와 입력값으로 시작해요 (실제 화면은 쓰지 않아요) */
export interface SubmitPreset {
  step?: SubmitStep;
  fields?: Partial<DraftFields>;
}

function Steps({ step }: { step: SubmitStep }) {
  const { t } = useSession();
  const labels = [t("submit.stepTeam"), t("submit.stepFile"), t("submit.stepSummary"), t("submit.stepConfirm")];
  return (
    <>
      <ol className="steps" aria-label={t("submit.title")}>
        {SUBMIT_STEPS.map((n) => (
          <li key={n} className={n < step ? "step step--done" : n === step ? "step step--current" : "step"} aria-current={n === step ? "step" : undefined}>
            <span className="step__dot" aria-hidden="true">
              {n < step ? "✓" : n}
            </span>
            <span>{labels[n - 1]}</span>
          </li>
        ))}
      </ol>
      <p className="sr-only" role="status">
        {t("web.submit.step", { current: step, total: SUBMIT_STEPS.length })}
      </p>
    </>
  );
}

function SubmitView({ id, preset }: { id: string; preset?: SubmitPreset }) {
  const { demo, locale, t, dispatch } = useSession();
  const router = useRouter();
  const detail = selectChallengeDetail(demo, id, locale);
  const challenge = demo.challenges.find((c) => c.id === id);
  const mine = demo.proposals.find((p) => p.challengeId === id && p.mine);
  const [step, setStep] = useState<SubmitStep>(preset?.step ?? 1);
  const [fields, setFields] = useState<DraftFields>(() => ({
    ...emptyDraftFields(),
    // 다시 제출할 때는 지난번 입력을 미리 채워 둬요 (파일은 새로 골라야 해요)
    ...(mine ? { teamName: mine.teamName, title: mine.title, summary: mine.summary, videoUrl: mine.videoUrl } : {}),
    ...preset?.fields,
  }));
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!detail || !challenge) {
    return (
      <div className="screen">
        <ScreenHead title={t("challenge.notFound")} back={buildHref(ROUTES.home)} backLabel={t("common.back")} />
      </div>
    );
  }

  const backHref = challengeHref(id);
  if (!detail.canApply) {
    return (
      <div className="screen">
        <ScreenHead title={t("submit.title")} back={backHref} backLabel={t("common.back")} />
        <Banner tone="warning">{t("challenge.closedNotice")}</Banner>
        <ButtonLink href={backHref} variant="secondary">
          {t("receipt.toChallenge")}
        </ButtonLink>
      </div>
    );
  }

  const errors = validateProposalDraft(toProposalDraft(fields), challenge.closesOn, demo.today);
  const update = (patch: Partial<DraftFields>) => setFields((current) => ({ ...current, ...patch }));
  const go = (next: SubmitStep) => {
    setStep(next);
    setTried(false);
  };

  // 지금 단계에서 보여 줄 오류 (파일은 고르는 즉시, 나머지는 "다음"을 눌러 본 뒤에)
  const shown: ProposalError[] = tried || (step === 2 && fields.file !== null) ? errorsForStep(step, errors) : [];
  const message = (codes: readonly ProposalError[]): string | null => {
    const code = shown.find((c) => codes.includes(c));
    return code ? t(`submit.error.${code}`) : null;
  };

  const next = () => {
    if (step === 4) return;
    if (!canLeaveStep(step, errors)) {
      setTried(true);
      return;
    }
    go((step + 1) as SubmitStep);
  };

  const finalSubmit = () => {
    if (errors.length > 0) {
      const first = firstInvalidStep(errors);
      if (first !== null) setStep(first);
      setTried(true);
      return;
    }
    setBusy(true);
    dispatch({ type: "submitProposal", challengeId: id, draft: toProposalDraft(fields), at: nowIso() });
    router.replace(receiptHref(id));
  };

  const onPickFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) update({ file: pickFileInfo(file) });
  };

  const summaryCount = charCount(fields.summary);
  const titleCount = charCount(fields.title);

  return (
    <div className="screen">
      <ScreenHead title={t("submit.title")} back={backHref} backLabel={t("common.back")} />
      <p className="small muted">
        {detail.card.title} · {t("challenge.deadline")} {detail.card.closesOnLabel} ({detail.card.dDay})
      </p>
      <Steps step={step} />
      {mine ? <Banner tone="info">{t("submit.resubmitNote", { version: mine.versions.length + 1 })}</Banner> : null}
      {errors.includes("deadline_passed") ? <Banner tone="danger">{t("submit.error.deadline_passed")}</Banner> : null}

      {step === 1 ? (
        <section className="stack" aria-labelledby="step-title">
          <h2 id="step-title" className="section__title">
            {t("submit.stepTeam")}
          </h2>
          <Field label={t("submit.teamName")} hint={`${t("challenge.participation")}: ${detail.card.participationLabel}`} error={message(["team_name_required", "team_name_too_long"])}>
            {(props) => <input {...props} className="input" value={fields.teamName} onChange={(event) => update({ teamName: event.target.value })} placeholder={t("submit.teamNamePh")} autoComplete="off" />}
          </Field>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="stack" aria-labelledby="step-title">
          <h2 id="step-title" className="section__title">
            {t("submit.stepFile")}
          </h2>
          <div className={fields.file && errorsForStep(2, errors).length === 0 ? "filebox filebox--chosen" : "filebox"}>
            {fields.file ? (
              <>
                <p className="filebox__name">📄 {t("submit.fileChosen", { name: fields.file.name, size: formatBytes(fields.file.size) })}</p>
                <div>
                  <Button size="sm" variant="secondary" onClick={() => update({ file: null })}>
                    {t("submit.removeFile")}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Field label={t("submit.file")} hint={t("submit.fileHint")} error={message(["file_required", "file_type", "file_too_large"])}>
                  {(props) => <input {...props} className="input" type="file" accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation" onChange={onPickFile} />}
                </Field>
                <div className="stack stack--sm">
                  {SAMPLE_FILES.map((sample) => (
                    <Button key={sample.name} variant="secondary" size="sm" onClick={() => update({ file: sample })}>
                      {t("submit.pickSample")} · {sample.name.split(".").pop()?.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </>
            )}
          </div>
          {fields.file && shown.length > 0 ? <ErrorList messages={shown.map((code) => t(`submit.error.${code}`))} /> : null}
        </section>
      ) : null}

      {step === 3 ? (
        <section className="stack" aria-labelledby="step-title">
          <h2 id="step-title" className="section__title">
            {t("submit.stepSummary")}
          </h2>
          <Field label={t("submit.proposalTitle")} error={message(["title_required", "title_too_long"])} right={<Counter text={t("submit.counter", { count: titleCount, max: LIMITS.title })} />}>
            {(props) => <input {...props} className="input" value={fields.title} onChange={(event) => update({ title: event.target.value })} placeholder={t("submit.proposalTitlePh")} autoComplete="off" />}
          </Field>
          <Field label={t("submit.summary", { max: LIMITS.summary })} error={message(["summary_required", "summary_too_long"])} right={<Counter text={t("submit.counter", { count: summaryCount, max: LIMITS.summary })} />}>
            {(props) => <textarea {...props} className="textarea" value={fields.summary} onChange={(event) => update({ summary: event.target.value })} placeholder={t("submit.summaryPh")} />}
          </Field>
          <Field label={t("submit.video")} error={message(["video_url_invalid"])}>
            {(props) => <input {...props} className="input" type="url" inputMode="url" value={fields.videoUrl} onChange={(event) => update({ videoUrl: event.target.value })} placeholder={t("submit.videoPh")} autoComplete="off" />}
          </Field>
        </section>
      ) : null}

      {step === 4 ? (
        <section className="stack" aria-labelledby="step-title">
          <h2 id="step-title" className="section__title">
            {t("submit.confirmTitle")}
          </h2>
          <dl className="kv kv--stack card card--pad">
            <dt>{t("submit.teamName")}</dt>
            <dd>{fields.teamName}</dd>
            <dt>{t("receipt.file")}</dt>
            <dd>{fields.file ? t("submit.fileChosen", { name: fields.file.name, size: formatBytes(fields.file.size) }) : "—"}</dd>
            <dt>{t("submit.proposalTitle")}</dt>
            <dd>{fields.title}</dd>
            <dt>{t("submit.stepSummary")}</dt>
            <dd>{fields.summary}</dd>
            <dt>{t("submit.video")}</dt>
            <dd>{fields.videoUrl || t("common.none")}</dd>
          </dl>
          <ErrorList messages={errors.map((code) => t(`submit.error.${code}`))} />
        </section>
      ) : null}

      <div className="row">
        {step > 1 ? (
          <Button variant="secondary" onClick={() => go((step - 1) as SubmitStep)}>
            {t("common.prev")}
          </Button>
        ) : (
          <Link className="btn btn--secondary" href={backHref}>
            {t("common.cancel")}
          </Link>
        )}
        <div className="grow" />
        {step < 4 ? (
          <Button onClick={next}>{t("common.next")}</Button>
        ) : (
          <Button onClick={finalSubmit} disabled={busy || errors.length > 0}>
            {t("submit.finalSubmit")}
          </Button>
        )}
      </div>
    </div>
  );
}

function ReceiptView({ id }: { id: string }) {
  const { demo, locale, t } = useSession();
  const receipt = selectReceipt(demo, id, locale);
  if (!receipt) {
    return (
      <div className="screen">
        <ScreenHead title={t("error.notFound")} back={challengeHref(id)} backLabel={t("common.back")} />
      </div>
    );
  }
  return (
    <div className="screen">
      <ScreenHead title={t("receipt.title")} />
      <section className="card receipt" aria-labelledby="receipt-thanks">
        <div className="receipt__head">
          <span className="receipt__check" aria-hidden="true">
            ✅
          </span>
          <h2 id="receipt-thanks" className="strong">
            {t("receipt.thanks")}
          </h2>
          <p className="small">{t("receipt.no")}</p>
          <p className="receipt__no mono">{receipt.receiptNo}</p>
        </div>
        <div className="receipt__body">
          <dl className="kv">
            <dt>{t("cert.challenge")}</dt>
            <dd>{receipt.challengeTitle}</dd>
            <dt>{t("submit.teamName")}</dt>
            <dd>{receipt.teamName}</dd>
            <dt>{t("submit.proposalTitle")}</dt>
            <dd>{receipt.title}</dd>
            <dt>{t("receipt.at")}</dt>
            <dd>{receipt.submittedAtLabel}</dd>
            <dt>{t("receipt.version")}</dt>
            <dd>v{receipt.version}</dd>
            <dt>{t("receipt.file")}</dt>
            <dd>
              {receipt.fileName} ({receipt.fileSizeLabel})
            </dd>
          </dl>
          <div className="stack stack--sm">
            <p className="field__label">{t("receipt.hash")}</p>
            <p className="hash mono">{receipt.sha256}</p>
          </div>
          <p className="small muted">{t("receipt.note")}</p>
        </div>
      </section>
      <div className="stack">
        <ButtonLink href={buildHref(ROUTES.impact)}>{t("receipt.toImpact")}</ButtonLink>
        <ButtonLink href={challengeHref(id)} variant="secondary">
          {t("receipt.toChallenge")}
        </ButtonLink>
      </div>
    </div>
  );
}

export function SubmitScreen({ preset }: { preset?: SubmitPreset }) {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const receipt = params.get("receipt") === "1";
  return receipt ? <ReceiptView key={id} id={id} /> : <SubmitView key={id} id={id} preset={preset} />;
}
