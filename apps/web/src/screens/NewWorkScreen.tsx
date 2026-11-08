"use client";

// 기업 간 업무 의뢰 내기 /b2b/network/new/?to=<회사> (지명) 또는 ?mode=open (공개 모집)
// 의뢰 방식 · 상대(지명일 때, 신뢰 기업만) · 일의 종류 · 제목 · 내용 · 의뢰비 · 납기. 입력 검사는 core 의 validateWorkDraft.
// 내면 의뢰 상세로 가요. 수수료는 없고(신뢰 기업의 특전), 의뢰비는 완료한 뒤 상대에게 직접 지급해요.
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import type { WorkMode } from "@sdgs-compass/core/domain";
import { nextWorkId, validateWorkDraft, type WorkDraftError } from "@sdgs-compass/core/network";
import { selectWorkForm, workDraftErrorText } from "@sdgs-compass/core/networkView";
import { parseYenInput } from "@sdgs-compass/core/wallet";
import { Banner, Button, Counter, Field, ScreenHead } from "@/components/ui";
import { buildHref, ROUTES, workRequestHref } from "@/lib/routes";
import { useSession } from "@/lib/session";
import { nowIso } from "@/lib/time";

const DEFAULT_DAYS = 30;
const count = (text: string) => [...text.trim()].length;

export function NewWorkScreen() {
  const { demo, locale, t, dispatch } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const requestedTo = params.get("to");
  const requestedMode = params.get("mode");
  const vm = useMemo(() => selectWorkForm(demo, locale, { to: requestedTo, mode: requestedMode }), [demo, locale, requestedTo, requestedMode]);
  const [mode, setMode] = useState<WorkMode>(vm.mode);
  const [to, setTo] = useState<string>(vm.toId ?? vm.targets[0]?.id ?? "");
  const [category, setCategory] = useState<string>(vm.categories[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [budget, setBudget] = useState("");
  const [days, setDays] = useState(String(DEFAULT_DAYS));
  const [tried, setTried] = useState(false);

  const draft = {
    mode,
    toCompanyId: mode === "direct" ? to || null : null,
    category,
    title,
    detail,
    budgetYen: parseYenInput(budget) ?? Number.NaN,
    days: days.trim() === "" ? Number.NaN : Number(days),
  };
  const errors = validateWorkDraft(demo, draft);
  const message = (codes: readonly WorkDraftError[]): string | null => {
    const hit = tried ? errors.find((e) => codes.includes(e)) : undefined;
    return hit ? workDraftErrorText(hit, locale) : null;
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTried(true);
    if (errors.length > 0) return;
    const id = nextWorkId(demo); // reducer 가 새 의뢰에 붙이는 번호 — 상세로 바로 가요
    dispatch({ type: "postWorkRequest", draft, at: nowIso() });
    router.replace(workRequestHref(id));
  };

  const back = buildHref(ROUTES.b2bNetwork);
  return (
    <>
      <ScreenHead title={t("network.new.title")} back={back} backLabel={t("network.backToList")} />
      {vm.needTrustText ? (
        <Banner tone="warning" icon="🔒">
          {vm.needTrustText}
        </Banner>
      ) : null}
      <form className="card card--pad stack stack--lg form-narrow" onSubmit={submit} noValidate>
        <fieldset className="choice-set">
          <legend className="field__label">{t("network.new.mode")}</legend>
          <div className="chips" role="radiogroup" aria-label={t("network.new.mode")}>
            {(["direct", "open"] as const).map((m) => (
              <button key={m} type="button" role="radio" className="chip" aria-checked={mode === m} onClick={() => setMode(m)}>
                {t(m === "direct" ? "network.new.modeDirect" : "network.new.modeOpen")}
              </button>
            ))}
          </div>
        </fieldset>
        {mode === "direct" ? (
          <Field label={t("network.new.to")} error={message(["to_invalid", "not_trusted"])}>
            {(props) => (
              <select {...props} className="select" value={to} onChange={(event) => setTo(event.target.value)}>
                {vm.targets.map((target) => (
                  <option key={target.id} value={target.id}>
                    {target.label}
                  </option>
                ))}
              </select>
            )}
          </Field>
        ) : message(["not_trusted"]) ? (
          <p className="field__error">{message(["not_trusted"])}</p>
        ) : null}
        <Field label={t("network.new.category")} error={message(["category_invalid"])}>
          {(props) => (
            <select {...props} className="select" value={category} onChange={(event) => setCategory(event.target.value)}>
              {vm.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field
          label={t("network.new.requestTitle")}
          error={message(["title_required", "title_too_long"])}
          right={<Counter text={`${count(title)}/${vm.limits.title}`} over={count(title) > vm.limits.title} />}
        >
          {(props) => <input {...props} className="input" value={title} placeholder={t("network.new.titlePh")} onChange={(event) => setTitle(event.target.value)} />}
        </Field>
        <Field
          label={t("network.new.detail")}
          error={message(["detail_required", "detail_too_long", "contact_info"])}
          right={<Counter text={`${count(detail)}/${vm.limits.detail}`} over={count(detail) > vm.limits.detail} />}
        >
          {(props) => <textarea {...props} className="textarea" value={detail} placeholder={t("network.new.detailPh")} onChange={(event) => setDetail(event.target.value)} />}
        </Field>
        <div className="row" style={{ alignItems: "flex-start" }}>
          <div className="grow" style={{ minWidth: 200 }}>
            <Field label={t("network.new.budget")} hint={vm.budgetHint} error={message(["budget_invalid"])}>
              {(props) => <input {...props} className="input" inputMode="numeric" value={budget} placeholder="120000" onChange={(event) => setBudget(event.target.value)} />}
            </Field>
          </div>
          <div style={{ minWidth: 160 }}>
            <Field label={t("network.new.days")} hint={vm.daysHint} error={message(["days_invalid"])}>
              {(props) => <input {...props} className="input" inputMode="numeric" value={days} onChange={(event) => setDays(event.target.value)} />}
            </Field>
          </div>
        </div>
        <p className="small muted">🎁 {vm.feeNote}</p>
        <div>
          <Button type="submit" disabled={!vm.canPost}>
            🤝 {t(mode === "direct" ? "network.new.submitDirect" : "network.new.submitOpen")}
          </Button>
        </div>
      </form>
    </>
  );
}
