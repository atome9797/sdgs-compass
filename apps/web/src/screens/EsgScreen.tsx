"use client";

// ESG 리포트(F-403)·SDGs 인증마크: 6개 문항(수치 + 증빙 제출 여부) → 점수·레벨·다음 ★까지 → 리포트 생성(PDF 저장·인쇄)
// 증빙 자료를 제출하지 않은 항목은 점수에 들어가지 않아요(core/certification.ts). 인증마크는 UN 공식 인증이 아니라는 안내를 항상 함께 보여 줘요.
import { useId, useMemo, useState } from "react";
import { clampCertValue } from "@sdgs-compass/core/certification";
import { formatYen } from "@sdgs-compass/core/format";
import { selectB2bDashboard, selectEsg, type CertItemVM, type EsgVM } from "@sdgs-compass/core/selectors";
import { Banner, Button, Empty, ScreenHead, Section, Tag } from "@/components/ui";
import { useSession } from "@/lib/session";
import { nowIso } from "@/lib/time";

function targetLabel(item: CertItemVM, formatYenFor: (amount: number) => string): string | null {
  if (item.unit === "flag") return null;
  if (item.unit === "yen") return formatYenFor(item.target);
  return `${item.target}${item.unitLabel}`;
}

function CriterionRow({ item }: { item: CertItemVM }) {
  const { t, locale, dispatch } = useSession();
  const inputId = useId();
  const [text, setText] = useState(String(item.value));
  const target = targetLabel(item, (amount) => formatYen(amount, locale));

  const changeValue = (raw: string) => {
    if (raw.trim() === "") {
      setText("");
      dispatch({ type: "setCertAnswer", id: item.id, value: 0 });
      return;
    }
    const value = clampCertValue(item.id, Number(raw));
    setText(String(value));
    dispatch({ type: "setCertAnswer", id: item.id, value });
  };

  return (
    <li className="card crit">
      <div className="crit__top">
        <label className="crit__label" htmlFor={inputId}>
          {item.label}
        </label>
        <span className="crit__pts">{item.pointsLabel}</span>
      </div>
      <div className="crit__inputs">
        {item.unit === "flag" ? (
          <select id={inputId} className="select" style={{ maxWidth: 240 }} value={item.value >= 1 ? "1" : "0"} onChange={(event) => dispatch({ type: "setCertAnswer", id: item.id, value: Number(event.target.value) })}>
            <option value="0">{t("web.esg.flagOff")}</option>
            <option value="1">{t("web.esg.flagOn")}</option>
          </select>
        ) : (
          <span className="crit__input">
            <input id={inputId} className="input" type="number" inputMode="numeric" min={0} max={item.inputMax} step={1} value={text} onChange={(event) => changeValue(event.target.value)} />
            <span className="small muted">{item.unitLabel}</span>
          </span>
        )}
        <label className="check">
          <input type="checkbox" checked={item.evidence} onChange={(event) => dispatch({ type: "setCertAnswer", id: item.id, evidence: event.target.checked })} />
          {t("esg.evidence")}
        </label>
      </div>
      {target ? <p className="small muted">{t("web.esg.target", { value: target })}</p> : null}
    </li>
  );
}

function CategoryBars({ vm }: { vm: EsgVM }) {
  return (
    <div className="bars">
      {vm.byCategory.map((category) => (
        <div key={category.key} className="bar">
          <span>{category.label}</span>
          <span className="bar__track" role="progressbar" aria-label={category.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={category.score}>
            <span className={`bar__fill bar__fill--${category.key.toLowerCase()}`} style={{ display: "block", width: `${category.score}%` }} />
          </span>
          <span className="bar__num">{category.score}</span>
        </div>
      ))}
    </div>
  );
}

function CertificationPanel({ vm }: { vm: EsgVM }) {
  const { t } = useSession();
  return (
    <div className="stack stack--lg">
      <section className="card esg-hero" aria-label={t("esg.certTitle")}>
        <p className="small muted">{t("esg.certTitle")}</p>
        <div className="esg-score">
          <span className="esg-score__num">{vm.total}</span>
          <span className="small muted">/ 100</span>
          <span className="esg-score__level">{vm.levelLabel}</span>
        </div>
        <p className="small">{vm.nextLabel ?? t("impact.maxLevel")}</p>
        <div className="stack stack--sm">
          <p className="field__label">{t("web.esg.categories")}</p>
          <CategoryBars vm={vm} />
        </div>
        <p className="small muted">{t("esg.certFlow")}</p>
      </section>

      <p className="disclaimer">{vm.disclaimer}</p>

      {vm.needEvidence ? <Banner tone="warning">{t("esg.needEvidence")}</Banner> : null}

      <Section title={t("web.esg.criteria")}>
        <ul className="crit-grid">
          {vm.items.map((item) => (
            <CriterionRow key={item.id} item={item} />
          ))}
        </ul>
      </Section>
    </div>
  );
}

function ReportPanel({ vm, companyName }: { vm: EsgVM; companyName: string }) {
  const { t, dispatch } = useSession();
  return (
    <div className="stack stack--lg">
      <Section title={t("esg.reportTitle")}>
        <div className="row no-print">
          <Button onClick={() => dispatch({ type: "generateEsg", at: nowIso() })}>📄 {t("esg.generate")}</Button>
          {vm.generated ? (
            <Button variant="secondary" onClick={() => window.print()}>
              🖨️ {t("web.esg.print")}
            </Button>
          ) : null}
        </div>
        {vm.generated ? (
          <article className="card report" aria-label={t("esg.reportTitle")}>
            <div className="stack stack--sm">
              <p className="small muted">{companyName}</p>
              <h3 className="report__title">{t("esg.reportTitle")}</h3>
              <p className="small muted">{vm.generatedLabel}</p>
            </div>
            <div className="esg-score">
              <span className="esg-score__num">{vm.total}</span>
              <span className="small muted">/ 100</span>
              <span className="esg-score__level">{vm.levelLabel}</span>
            </div>
            <div className="stack stack--sm">
              <p className="field__label">{t("web.esg.categories")}</p>
              <CategoryBars vm={vm} />
            </div>
            <div className="stack stack--sm">
              <p className="field__label">{t("esg.highlights")}</p>
              <div className="prose">
                <ul>
                  {vm.highlights.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="disclaimer">{vm.disclaimer}</p>
            <div className="row">
              <Tag tone="info">{vm.levelLabel}</Tag>
              <Tag>{vm.scoreLabel}</Tag>
            </div>
          </article>
        ) : (
          <Empty>{t("web.esg.reportHint")}</Empty>
        )}
      </Section>
    </div>
  );
}

export function EsgScreen() {
  const { demo, locale, t } = useSession();
  const vm = useMemo(() => selectEsg(demo, locale), [demo, locale]);
  const companyName = useMemo(() => selectB2bDashboard(demo, locale).companyName, [demo, locale]);
  return (
    <>
      <ScreenHead title={t("esg.title")} />
      <div className="two-col">
        <CertificationPanel vm={vm} />
        <ReportPanel vm={vm} companyName={companyName} />
      </div>
    </>
  );
}
