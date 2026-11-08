"use client";

// 기업 간 업무 의뢰 상세 /b2b/network/request/?id=: 진행 단계 · 의뢰한 기업 → 맡은 기업(신뢰 실적) · 거래 조건(수수료 없음) · 내용 · 응모
// 우리 회사가 할 일: 지명받으면 맡기/거절 · 공개 모집에 응모 · 우리 모집의 응모에서 고르기 · 맡은 일의 납품 알리기 · 의뢰한 일을 확인하고 완료(의뢰비는 직접 지급 — 데모는 기록)
// 끝나면 서로 평가해요(우리 회사 → 상대, 상대가 남긴 평가도 보여요).
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { validateShortText, WORK_LIMITS } from "@sdgs-compass/core/network";
import { selectWorkRequest, shortTextErrorText, type WorkDetailVM, type WorkPartyVM } from "@sdgs-compass/core/networkView";
import { charCount } from "@sdgs-compass/core/proposal";
import { Logo, RatingBlock, RatingItem, TrustLine } from "@/components/Network";
import { Banner, Button, Counter, Empty, Field, ScreenHead, Section, Tag } from "@/components/ui";
import { buildHref, networkCompanyHref, ROUTES } from "@/lib/routes";
import { useSession } from "@/lib/session";
import { nowIso } from "@/lib/time";

function Party({ title, party }: { title: string; party: WorkPartyVM }) {
  return (
    <div className="stack stack--sm">
      <p className="small muted">{title}</p>
      <div className="rcard__head">
        <Logo emoji={party.emoji} accent={party.accent} size={32} />
        <Link className="strong grow" href={networkCompanyHref(party.id)}>
          {party.name}
        </Link>
      </div>
      <TrustLine trust={party.trust} />
    </div>
  );
}

/** 한 줄 입력 + 보내기 (응모 · 납품 알리기) */
function ShortForm({ label, placeholder, max, submitLabel, onSubmit }: { label: string; placeholder: string; max: number; submitLabel: string; onSubmit: (text: string) => void }) {
  const { locale } = useSession();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const problem = validateShortText(text, max);
    if (problem !== null) {
      setError(shortTextErrorText(problem, max, locale));
      return;
    }
    onSubmit(text);
    setText("");
  };
  const n = charCount(text.trim());
  return (
    <form className="stack stack--sm" onSubmit={submit} noValidate>
      <Field label={label} error={error} right={<Counter text={`${n}/${max}`} over={n > max} />}>
        {(props) => (
          <input
            {...props}
            className="input"
            value={text}
            placeholder={placeholder}
            onChange={(event) => {
              setText(event.target.value);
              setError(null);
            }}
          />
        )}
      </Field>
      <div>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}

function Actions({ vm }: { vm: WorkDetailVM }) {
  const { t, dispatch } = useSession();
  const [confirming, setConfirming] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const id = vm.id;
  return (
    <div className="stack">
      {vm.can.respond ? (
        <div className="stack stack--sm">
          <p className="small">{t("network.respond.hint", { company: vm.fromName })}</p>
          <div className="row">
            <Button
              onClick={() => {
                dispatch({ type: "respondWorkRequest", requestId: id, accept: true, at: nowIso() });
                setNote(t("network.respond.accepted"));
              }}
            >
              ✅ {t("network.respond.accept")}
            </Button>
            <Button
              variant="secondary"
              onClick={() => dispatch({ type: "respondWorkRequest", requestId: id, accept: false, at: nowIso() })}
            >
              {t("network.respond.decline")}
            </Button>
          </div>
        </div>
      ) : null}
      {vm.can.apply ? (
        <ShortForm
          label={t("network.apply.label", { max: WORK_LIMITS.application })}
          placeholder={t("network.apply.placeholder")}
          max={WORK_LIMITS.application}
          submitLabel={`🙋 ${t("network.apply.submit")}`}
          onSubmit={(message) => dispatch({ type: "applyWorkRequest", requestId: id, message, at: nowIso() })}
        />
      ) : null}
      {vm.status === "open" && !vm.can.apply && vm.relation === "other" ? <p className="small muted">{t("network.apply.needTrust")}</p> : null}
      {vm.can.deliver ? (
        <ShortForm
          label={t("network.deliver.label", { max: WORK_LIMITS.delivery })}
          placeholder={t("network.deliver.placeholder")}
          max={WORK_LIMITS.delivery}
          submitLabel={`📦 ${t("network.deliver.submit")}`}
          onSubmit={(text) => dispatch({ type: "deliverWork", requestId: id, note: text, at: nowIso() })}
        />
      ) : null}
      {vm.can.complete ? (
        confirming ? (
          <div className="stack">
            <Banner tone="info" icon="💴">
              {t("network.complete.confirm", { budget: vm.budgetLabel, company: vm.toName ?? "" })}
            </Banner>
            <div className="row">
              <Button
                onClick={() => {
                  dispatch({ type: "completeWork", requestId: id, at: nowIso() });
                  setConfirming(false);
                  setNote(t("network.complete.done", { budget: vm.budgetLabel }));
                }}
              >
                {t("common.confirm")}
              </Button>
              <Button variant="secondary" onClick={() => setConfirming(false)}>
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <Button onClick={() => setConfirming(true)}>✅ {t("network.action.complete")}</Button>
          </div>
        )
      ) : null}
      {/* 할 일을 하면 바뀌는 한 줄(기다리는 중 · 거절됨)과 결과 알림을 읽어 줘요 */}
      <div className="live" aria-live="polite">
        {note ? <Banner tone="success">{note}</Banner> : null}
        {vm.waitingLabel ? <p className="small muted">{vm.waitingLabel}</p> : null}
      </div>
    </div>
  );
}

export function WorkRequestScreen() {
  const { demo, locale, t, dispatch } = useSession();
  const id = useSearchParams().get("id");
  const vm = useMemo(() => selectWorkRequest(demo, id, locale), [demo, id, locale]);
  const back = buildHref(ROUTES.b2bNetwork, { tab: "mine" });
  // 맡기 · 납품 · 완료 · 응모 · 고르기를 하면 누른 단추가 사라지니, 포커스를 할 일 칸으로 옮겨요(같은 의뢰 안에서만)
  const actionsBox = useRef<HTMLDivElement>(null);
  const stage = vm ? `${vm.status}:${vm.applications.length}` : null;
  const seen = useRef<{ id: string | null; stage: string | null }>({ id, stage });
  useEffect(() => {
    if (seen.current.id === id && seen.current.stage !== stage) actionsBox.current?.focus();
    seen.current = { id, stage };
  }, [id, stage]);
  if (!vm) {
    return (
      <div className="screen">
        <ScreenHead title={t("network.title")} back={back} backLabel={t("network.backToList")} />
        <Empty>{t("network.notFound")}</Empty>
      </div>
    );
  }
  return (
    <div className="screen">
      <ScreenHead title={vm.title} back={back} backLabel={t("network.backToList")} side={<Tag tone={vm.statusTone}>{vm.statusLabel}</Tag>} />

      <ol className="steps" aria-label={t("network.progress")}>
        {vm.steps.map((step, i) => (
          <li key={step.key} className={step.state === "done" ? "step step--done" : step.state === "current" ? "step step--current" : "step"} aria-current={step.state === "current" ? "step" : undefined}>
            <span className="step__dot" aria-hidden="true">
              {step.state === "done" ? "✓" : i + 1}
            </span>
            {step.label}
          </li>
        ))}
      </ol>

      <section className="card card--pad stack">
        <div className="chips">
          <Tag tone="info">{vm.categoryLabel}</Tag>
          <Tag>{vm.modeLabel}</Tag>
          {vm.dDay ? <Tag tone={vm.overdue ? "danger" : undefined}>{vm.dDay}</Tag> : null}
        </div>
        <Party title={t("network.from")} party={vm.from} />
        {vm.to ? (
          <Party title={t("network.to")} party={vm.to} />
        ) : (
          <p className="small muted">
            {t("network.to")} {t("network.notChosen")}
          </p>
        )}
        <dl className="kv">
          {vm.terms.map((term) => (
            <div key={term.label} style={{ display: "contents" }}>
              <dt>{term.label}</dt>
              <dd>{term.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <Section title={t("network.detail")}>
        <div className="card card--pad stack stack--sm">
          <p>{vm.detail}</p>
          <p className="small muted">
            {[
              `${t("network.posted")} ${vm.postedLabel}`,
              vm.acceptedLabel ? `${t("network.accepted")} ${vm.acceptedLabel}` : null,
              vm.completedLabel ? `${t("network.completed")} ${vm.completedLabel}` : null,
            ]
              .filter(Boolean)
              .join(locale === "ja" ? "・" : " · ")}
          </p>
        </div>
      </Section>

      {vm.mode === "open" && (vm.relation === "from" || vm.applications.length > 0) ? (
        <Section title={vm.applicationsLabel ?? ""} hint={vm.can.choose ? t("network.choose.hint") : undefined}>
          {vm.applications.length === 0 ? (
            <Empty>{t("network.choose.none")}</Empty>
          ) : (
            <ul className="card-list">
              {vm.applications.map((a) => (
                <li key={a.id} className="card rcard">
                  <div className="rcard__head">
                    <Logo emoji={a.emoji} accent={a.accent} size={32} />
                    <Link className="strong grow" href={networkCompanyHref(a.id)}>
                      {a.name}
                    </Link>
                    <span className="small muted">{a.appliedLabel}</span>
                  </div>
                  <TrustLine trust={a.trust} />
                  <p className="small">💬 {a.message}</p>
                  {a.canChoose ? (
                    <div>
                      <Button size="sm" onClick={() => dispatch({ type: "chooseWorkApplicant", requestId: vm.id, companyId: a.id, at: nowIso() })}>
                        {t("network.choose")}
                      </Button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Section>
      ) : null}

      {vm.deliveryNote ? (
        <Section title={`📦 ${t("network.delivered")}`}>
          <div className="card card--pad stack stack--sm">
            <p>{vm.deliveryNote}</p>
            {vm.deliveredLabel ? <p className="small muted">{vm.deliveredLabel}</p> : null}
          </div>
        </Section>
      ) : null}

      <div ref={actionsBox} tabIndex={-1} className="focus-target">
        <Actions vm={vm} />
      </div>

      {vm.rateTarget ? (
        <Section title={t("rating.title")}>
          <RatingBlock role="company" target={{ kind: "work", refId: vm.id, toRole: "company", toId: vm.rateTarget.toId }} title={t("rating.rateFor", { name: vm.rateTarget.name })}>
            {vm.theirRating ? <RatingItem vm={vm.theirRating} title={t("rating.theirs")} /> : <p className="small muted">{t("rating.waiting")}</p>}
          </RatingBlock>
        </Section>
      ) : null}
    </div>
  );
}
