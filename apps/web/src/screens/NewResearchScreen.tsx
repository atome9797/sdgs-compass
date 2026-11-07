"use client";

// 기업의 새 연구 의뢰 /b2b/research/new/?proposal=: 표창·채택한 아이디어 고르기 · 제목 · 연구해 주었으면 하는 것 · 성과물 · 분야(최대 3) · 의뢰비 · 기한
// 입력 검사는 core 의 validateResearchDraft. 게재하면 목록(/b2b/research/?posted=rr…)으로 가서 방금 낸 의뢰를 알려 줘요.
// 거래 조건(내용·의뢰비·기한·지급 방법)은 연구자가 맡기 전에 상세 화면에서 봐요.
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { nextResearchId, validateResearchDraft, type ResearchDraftError } from "@sdgs-compass/core/research";
import { researchDraftErrorText, selectResearchForm } from "@sdgs-compass/core/researchView";
import { ALL_CHALLENGES } from "@sdgs-compass/core/selectors";
import { parseYenInput } from "@sdgs-compass/core/wallet";
import { Banner, Button, ButtonLink, Counter, Empty, Field, ScreenHead } from "@/components/ui";
import { applicantsHref, b2bResearchHref } from "@/lib/routes";
import { useSession } from "@/lib/session";
import { nowIso } from "@/lib/time";

const DEFAULT_DAYS = 30;
const count = (text: string) => [...text.trim()].length;

export function NewResearchScreen() {
  const { demo, locale, t, dispatch } = useSession();
  const router = useRouter();
  const requested = useSearchParams().get("proposal");
  const vm = useMemo(() => selectResearchForm(demo, locale, requested), [demo, locale, requested]);
  const [proposalId, setProposalId] = useState<string>(vm.selectedId ?? "");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [deliverable, setDeliverable] = useState("");
  const [fields, setFields] = useState<string[]>([]);
  const [fee, setFee] = useState("");
  const [days, setDays] = useState(String(DEFAULT_DAYS));
  const [tried, setTried] = useState(false);

  const draft = {
    proposalId,
    title,
    detail,
    deliverable,
    fields,
    feeYen: parseYenInput(fee) ?? Number.NaN,
    days: days.trim() === "" ? Number.NaN : Number(days),
  };
  const errors = validateResearchDraft(draft, demo);
  const message = (codes: readonly ResearchDraftError[]): string | null => {
    const hit = tried ? errors.find((e) => codes.includes(e)) : undefined;
    return hit ? researchDraftErrorText(hit, locale) : null;
  };
  const toggleField = (id: string) => setFields((current) => (current.includes(id) ? current.filter((f) => f !== id) : [...current, id]));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTried(true);
    if (errors.length > 0) return;
    const id = nextResearchId(demo); // reducer 가 새 의뢰에 붙이는 번호 — 목록이 이 의뢰를 알려 줘요
    dispatch({ type: "postResearchRequest", draft, at: nowIso() });
    router.replace(b2bResearchHref(id));
  };

  const back = b2bResearchHref();
  if (vm.ideas.length === 0) {
    return (
      <>
        <ScreenHead title={t("research.new.title")} back={back} backLabel={t("common.back")} />
        <Empty>{t("research.b2b.noIdeas")}</Empty>
        <div>
          <ButtonLink href={applicantsHref(ALL_CHALLENGES, "all")}>{t("b2b.viewApplicants")}</ButtonLink>
        </div>
      </>
    );
  }

  const selected = vm.ideas.find((idea) => idea.id === proposalId);
  return (
    <>
      <ScreenHead title={t("research.new.title")} back={back} backLabel={t("common.back")} />
      <p className="small muted">{t("research.b2b.intro")}</p>
      <form className="card card--pad stack stack--lg form-narrow" onSubmit={submit} noValidate>
        <Field label={t("research.new.idea")} hint={selected ? t("research.challengeWith", { title: selected.challengeTitle }) : undefined} error={message(["origin_invalid"])}>
          {(props) => (
            <select {...props} className="select" value={proposalId} onChange={(event) => setProposalId(event.target.value)}>
              {vm.ideas.map((idea) => (
                <option key={idea.id} value={idea.id}>
                  {idea.label}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field
          label={t("research.new.requestTitle")}
          error={message(["title_required", "title_too_long"])}
          right={<Counter text={`${count(title)}/${vm.limits.title}`} over={count(title) > vm.limits.title} />}
        >
          {(props) => <input {...props} className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t("research.new.titlePh")} autoComplete="off" />}
        </Field>
        <Field
          label={t("research.what")}
          error={message(["detail_required", "detail_too_long"])}
          right={<Counter text={`${count(detail)}/${vm.limits.detail}`} over={count(detail) > vm.limits.detail} />}
        >
          {(props) => <textarea {...props} className="textarea" value={detail} onChange={(event) => setDetail(event.target.value)} placeholder={t("research.new.detailPh")} />}
        </Field>
        <Field
          label={t("research.deliverable")}
          error={message(["deliverable_required", "deliverable_too_long"])}
          right={<Counter text={`${count(deliverable)}/${vm.limits.deliverable}`} over={count(deliverable) > vm.limits.deliverable} />}
        >
          {(props) => <input {...props} className="input" value={deliverable} onChange={(event) => setDeliverable(event.target.value)} placeholder={t("research.new.deliverablePh")} autoComplete="off" />}
        </Field>
        <div className="stack stack--sm">
          <p className="field__label" id="research-fields">
            {vm.fieldsLabel} <span className="muted">({fields.length}/{vm.limits.maxFields})</span>
          </p>
          <div className="chips" role="group" aria-labelledby="research-fields">
            {vm.fields.map((field) => {
              const on = fields.includes(field.id);
              return (
                <button key={field.id} type="button" className="chip" aria-pressed={on} disabled={!on && fields.length >= vm.limits.maxFields} onClick={() => toggleField(field.id)}>
                  {field.label}
                </button>
              );
            })}
          </div>
          {message(["fields_required", "fields_too_many"]) ? <p className="field__error">{message(["fields_required", "fields_too_many"])}</p> : null}
        </div>
        <div className="row" style={{ alignItems: "flex-start" }}>
          <div className="grow" style={{ minWidth: 200 }}>
            <Field label={t("research.new.fee")} hint={vm.feeHint} error={message(["fee_invalid"])}>
              {(props) => <input {...props} className="input" inputMode="numeric" value={fee} onChange={(event) => setFee(event.target.value)} placeholder="80000" autoComplete="off" />}
            </Field>
          </div>
          <div className="grow" style={{ minWidth: 200 }}>
            <Field label={t("research.new.days")} hint={vm.daysHint} error={message(["days_invalid"])}>
              {(props) => <input {...props} className="input" type="number" inputMode="numeric" min={vm.minDays} max={vm.maxDays} step={1} value={days} onChange={(event) => setDays(event.target.value)} />}
            </Field>
          </div>
        </div>
        <Banner tone="info" icon="💴">
          {t("research.b2b.feeNote")}
        </Banner>
        <p className="small muted">{t("research.new.termsNote")}</p>
        {message(["contact_info"]) ? <p className="field__error">{message(["contact_info"])}</p> : null}
        <div>
          <Button type="submit">🔬 {t("research.new.submit")}</Button>
        </div>
      </form>
    </>
  );
}
