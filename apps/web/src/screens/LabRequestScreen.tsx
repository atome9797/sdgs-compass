"use client";

// 연구 의뢰 상세 /lab/request/?id=: 진행 단계 · 연구해 주었으면 하는 것 · 성과물 · 출발점 아이디어 · 거래 조건 · 맡기 전에 확인할 것 · 상태별 동작
// 모집 중 → 「この依頼を引き受ける」(데모: 바로 담당) / 연구 중(내 것) → 성과 보내기(요약 + 파일 이름·크기만) / 확인 대기 → 기다림 / 완료 → 받은 의뢰비 · 기업 평가
import { useSearchParams } from "next/navigation";
import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { formatBytes } from "@sdgs-compass/core/format";
import { ratingReceived } from "@sdgs-compass/core/networkView";
import { RESEARCH_LIMITS, RESULT_EXTENSIONS, validateResearchResult, type ResearchResultError } from "@sdgs-compass/core/research";
import { researchResultErrorText, selectResearchDetail, type ResearchDetailVM } from "@sdgs-compass/core/researchView";
import { RatingBlock, RatingItem } from "@/components/Network";
import { ResearchResultBox, ResearchSteps, ResearchTerms } from "@/components/Research";
import { Banner, Button, ButtonLink, Card, Counter, Empty, Field, ScreenHead, Section, Tag } from "@/components/ui";
import { buildHref, ROUTES } from "@/lib/routes";
import { useSession } from "@/lib/session";
import { nowIso } from "@/lib/time";

/** 데모용 샘플 성과 파일 (이름·크기만 — 실제 파일은 없어요) */
const SAMPLE_RESULT = { name: "research_report_sample.pdf", size: 2_400_000 };
const ACCEPT = RESULT_EXTENSIONS.map((ext) => `.${ext}`).join(",");

function ResultForm({ vm }: { vm: ResearchDetailVM }) {
  const { locale, t, dispatch } = useSession();
  const [summary, setSummary] = useState("");
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  const [tried, setTried] = useState(false);
  const draft = { summary, fileName: file?.name ?? null, fileSizeBytes: file?.size ?? 0 };
  const errors = validateResearchResult(draft);
  const message = (codes: readonly ResearchResultError[]): string | null => {
    const hit = tried ? errors.find((e) => codes.includes(e)) : undefined;
    return hit ? researchResultErrorText(hit, locale) : null;
  };
  const onPick = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0];
    setFile(picked ? { name: picked.name, size: picked.size } : null);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTried(true);
    if (errors.length > 0) return;
    dispatch({ type: "submitResearchResult", requestId: vm.id, draft, at: nowIso() });
  };
  const count = [...summary.trim()].length;
  return (
    <form className="stack" onSubmit={submit} noValidate>
      <Field
        label={t("research.submit.summary")}
        error={message(["summary_required", "summary_too_long"])}
        right={<Counter text={`${count}/${RESEARCH_LIMITS.resultSummary}`} over={count > RESEARCH_LIMITS.resultSummary} />}
      >
        {(props) => <textarea {...props} className="textarea" value={summary} onChange={(event) => setSummary(event.target.value)} placeholder={t("research.submit.summaryPh")} />}
      </Field>
      <div className={file && message(["file_required", "file_type", "file_too_large"]) === null ? "filebox filebox--chosen" : "filebox"}>
        {file ? (
          <>
            <p className="filebox__name">📄 {t("research.submit.chosen", { name: file.name, size: formatBytes(file.size) })}</p>
            {message(["file_type", "file_too_large"]) ? <p className="field__error">{message(["file_type", "file_too_large"])}</p> : null}
            <div>
              <Button size="sm" variant="secondary" onClick={() => setFile(null)}>
                {t("submit.removeFile")}
              </Button>
            </div>
          </>
        ) : (
          <>
            <Field label={t("research.submit.file")} hint={t("research.submit.fileNote")} error={message(["file_required"])}>
              {(props) => <input {...props} className="input" type="file" accept={ACCEPT} onChange={onPick} />}
            </Field>
            <div>
              <Button size="sm" variant="secondary" onClick={() => setFile(SAMPLE_RESULT)}>
                {t("research.submit.sample")}
              </Button>
            </div>
          </>
        )}
      </div>
      <div>
        <Button type="submit">📤 {t("research.submit.button")}</Button>
      </div>
    </form>
  );
}

/** 끝난 내 의뢰: 의뢰한 기업을 평가해요 (약속대로 지급했는지 — 기업의 신뢰 실적이 돼요) */
function CompanyRating({ vm }: { vm: ResearchDetailVM }) {
  const { demo, locale, t } = useSession();
  const theirs = ratingReceived(demo, "researcher", "research", vm.id, locale);
  return (
    <RatingBlock role="researcher" target={{ kind: "research", refId: vm.id, toRole: "company", toId: vm.companyId }} title={t("rating.rateFor", { name: vm.companyName })}>
      {theirs ? <RatingItem vm={theirs} title={t("rating.theirs")} /> : null}
    </RatingBlock>
  );
}

function Actions({ vm }: { vm: ResearchDetailVM }) {
  const { t, dispatch } = useSession();
  if (vm.canAccept) {
    return (
      <Card className="stack">
        <Button onClick={() => dispatch({ type: "acceptResearchRequest", requestId: vm.id, at: nowIso() })}>🤝 {t("research.accept")}</Button>
        <p className="small muted">{t("research.acceptNote")}</p>
      </Card>
    );
  }
  if (vm.expired) return <Banner tone="warning">{t("research.closedForYou")}</Banner>;
  if (vm.takenByOther) return <Banner tone="info">{t("research.takenByOther")}</Banner>;
  if (vm.canSubmit) {
    return (
      <Section title={t("research.submit.title")}>
        <Banner tone="success">{t("research.accepted")}</Banner>
        <Card>
          <ResultForm vm={vm} />
        </Card>
      </Section>
    );
  }
  if (vm.status === "delivered") {
    return (
      <Section title={t("research.result")}>
        <Banner tone="success">{t("research.submit.done")}</Banner>
        <p className="small muted">{t("research.waiting")}</p>
        <Card>
          <ResearchResultBox vm={vm} />
        </Card>
      </Section>
    );
  }
  return (
    <Section title={t("research.result")}>
      <Banner tone="success" icon="💴">
        {t("research.paid", { fee: vm.feeLabel })}
      </Banner>
      <Card>
        <ResearchResultBox vm={vm} />
      </Card>
      {vm.mine && vm.status === "completed" ? <CompanyRating vm={vm} /> : null}
    </Section>
  );
}

export function LabRequestScreen() {
  const { demo, locale, t } = useSession();
  const id = useSearchParams().get("id");
  const vm = useMemo(() => selectResearchDetail(demo, id, locale), [demo, id, locale]);
  const back = buildHref(vm?.mine ? ROUTES.labMine : ROUTES.lab);
  if (!vm) {
    return (
      <div className="screen">
        <ScreenHead title={t("research.detailTitle")} back={buildHref(ROUTES.lab)} backLabel={t("research.back")} />
        <Empty>{t("research.notFound")}</Empty>
        <div>
          <ButtonLink href={buildHref(ROUTES.lab)}>{t("lab.title")}</ButtonLink>
        </div>
      </div>
    );
  }
  return (
    <div className="screen">
      <ScreenHead title={t("research.detailTitle")} back={back} backLabel={t("research.back")} />
      <Card className="stack">
        <div className="row">
          <span aria-hidden="true">{vm.companyEmoji}</span>
          <span className="small strong grow">{vm.companyName}</span>
          <Tag tone={vm.statusTone}>{vm.statusLabel}</Tag>
        </div>
        <h2 className="hero__title">{vm.title}</h2>
        <div className="facts">
          <div className="fact">
            <span className="fact__label">{t("research.fee")}</span>
            <span className="fact__value">{vm.feeLabel}</span>
          </div>
          <div className="fact">
            <span className="fact__label">{t("research.due")}</span>
            <span className="fact__value">{vm.dDay ?? vm.dueLabel}</span>
          </div>
        </div>
        <div className="chips">
          {vm.fieldLabels.map((label) => (
            <Tag key={label}>{label}</Tag>
          ))}
        </div>
        <ResearchSteps vm={vm} />
      </Card>

      <Section title={t("research.what")}>
        <p>{vm.detail}</p>
      </Section>
      <Section title={t("research.deliverable")}>
        <p>{vm.deliverable}</p>
      </Section>
      <Section title={t("research.idea")}>
        <Card className="stack stack--sm">
          <p className="strong">💡 {vm.ideaLabel}</p>
          {vm.challengeTitle ? <p className="small muted">{t("research.challengeWith", { title: vm.challengeTitle })}</p> : null}
        </Card>
      </Section>
      <Section title={t("research.terms")}>
        <Card>
          <ResearchTerms vm={vm} />
        </Card>
      </Section>
      {vm.canAccept ? (
        <Section title={t("research.checks.title")}>
          <div className="prose small">
            <ul>
              <li>{t("research.checks.university")}</li>
              <li>{t("research.checks.rights")}</li>
              <li>{t("research.checks.tax")}</li>
            </ul>
          </div>
        </Section>
      ) : null}
      <Actions vm={vm} />
    </div>
  );
}
