"use client";

// 학생용 신청 요약(#22): 기간을 고르면 활동·SDGs·디지털 증명서를 A4 한 장으로 보여 주고, 브라우저 인쇄로 종이·PDF 로 남겨요.
// 대학의 활동 장려 제도 등에 "활동 기록 자료"로 붙이는 용도예요. 앱은 장학금을 주지 않고 대학·단체와 제휴하지 않았어요 —
// 그래서 한 장 맨 아래의 고지 문장(core 의 SUMMARY_NOTE_KEYS)은 화면에서도 인쇄에서도 늘 보여요. 계산은 모두 core(applicationSummary.ts)에 있어요.
import { useRouter, useSearchParams } from "next/navigation";
import { useId, useMemo, useState } from "react";
import { parseSummaryPeriod, selectApplicationSummary, type SummaryPeriod } from "@sdgs-compass/core/applicationSummary";
import { QrCode } from "@/components/QrCode";
import { SdgMini, SdgMiniRow } from "@/components/sdg";
import { Button, ScreenHead } from "@/components/ui";
import { buildHref, impactSummaryHref, ROUTES } from "@/lib/routes";
import { useSession } from "@/lib/session";

export function ApplicationSummaryScreen() {
  const { demo, locale, t } = useSession();
  const router = useRouter();
  const initial = parseSummaryPeriod(useSearchParams().get("period"));
  const [period, setPeriod] = useState<SummaryPeriod>(initial);
  const vm = useMemo(() => selectApplicationSummary(demo, locale, period), [demo, locale, period]);
  const groupName = useId();
  const hintId = useId();

  const choose = (next: SummaryPeriod) => {
    setPeriod(next);
    // 새로고침·공유해도 같은 기간이 열리게 주소도 바꿔요 (기록을 쌓지 않고 바꾸기)
    router.replace(impactSummaryHref(next));
  };

  return (
    <div className="screen summary-screen">
      <div className="no-print stack">
        <ScreenHead title={t("summary.title")} back={buildHref(ROUTES.impact)} backLabel={t("common.back")} />
        <p className="small muted">{t("summary.lead")}</p>
        <fieldset className="summary-periods">
          <legend className="field__label">{t("summary.period.label")}</legend>
          <div className="summary-periods__row">
            {vm.periodOptions.map((option) => (
              <label key={option.id} className={option.selected ? "summary-period summary-period--on" : "summary-period"}>
                <input type="radio" name={groupName} value={option.id} checked={option.selected} onChange={() => choose(option.id)} />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="stack stack--sm">
          <Button block onClick={() => window.print()} aria-describedby={hintId}>
            🖨 {t("summary.print")}
          </Button>
          <p id={hintId} className="small muted">
            {t("summary.printHint")}
          </p>
        </div>
        <p className="summary-preview-label">{t("summary.preview")}</p>
      </div>

      <article className="summary-sheet" aria-label={vm.docTitle}>
        <header className="summary-sheet__head">
          <p className="summary-sheet__title">🧭 {vm.docTitle}</p>
          <p className="summary-sheet__date">{vm.createdOnLabel}</p>
        </header>

        <dl className="summary-meta">
          <div>
            <dt>{t("summary.holder.name")}</dt>
            <dd>{vm.holder.name}</dd>
          </div>
          <div>
            <dt>{t("summary.holder.affiliation")}</dt>
            <dd>{vm.holder.affiliation}</dd>
          </div>
          <div>
            <dt>{t("summary.holder.level")}</dt>
            <dd>
              {vm.holder.levelLabel}
            </dd>
          </div>
          <div>
            <dt>{t("summary.holder.period")}</dt>
            <dd>{vm.rangeLabel}</dd>
          </div>
        </dl>

        <ul className="summary-stats">
          {vm.stats.map((stat) => (
            <li key={stat.key} className="summary-stat">
              <span className="summary-stat__label">{stat.label}</span>
              <span className="summary-stat__value">{stat.value}</span>
            </li>
          ))}
        </ul>

        <section className="summary-block" aria-labelledby={`${groupName}-acts`}>
          <h2 id={`${groupName}-acts`} className="summary-block__title">
            {t("summary.activities.title")}
          </h2>
          {vm.empty ? (
            <p className="summary-empty">{t("summary.activities.empty")}</p>
          ) : (
            <table className="summary-table">
              <thead>
                <tr>
                  <th scope="col">{t("summary.activities.date")}</th>
                  <th scope="col">{t("summary.activities.kind")}</th>
                  <th scope="col">{t("summary.activities.subject")}</th>
                  <th scope="col">{t("summary.activities.sdgs")}</th>
                </tr>
              </thead>
              <tbody>
                {vm.activities.map((activity) => (
                  <tr key={activity.id}>
                    <td className="summary-table__date">{activity.dateLabel}</td>
                    <td className="summary-table__kind">
                      {activity.kindLabel}
                      {activity.awardLabel ? <span className="summary-table__award">🏆 {activity.awardLabel}</span> : null}
                    </td>
                    <td className="summary-table__subject">
                      <span className="summary-table__name">{activity.title}</span>
                      <span className="summary-table__company">{activity.companyName}</span>
                    </td>
                    <td className="summary-table__sdgs">
                      <SdgMiniRow ids={activity.sdgIds} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {vm.moreActivitiesLabel ? <p className="summary-more">{vm.moreActivitiesLabel}</p> : null}
        </section>

        <section className="summary-block" aria-labelledby={`${groupName}-sdgs`}>
          <h2 id={`${groupName}-sdgs`} className="summary-block__title">
            {t("summary.sdgs.title")}
          </h2>
          {vm.sdgs.length === 0 ? (
            <p className="summary-empty">{t("summary.sdgs.empty")}</p>
          ) : (
            <ul className="summary-sdgs">
              {vm.sdgs.map((sdg) => (
                <li key={sdg.id} className="summary-sdg">
                  <SdgMini id={sdg.id} />
                  <span className="summary-sdg__name">{sdg.label}</span>
                  <span className="summary-sdg__count">{sdg.countLabel}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="summary-block" aria-labelledby={`${groupName}-certs`}>
          <h2 id={`${groupName}-certs`} className="summary-block__title">
            {t("summary.certs.title")}
          </h2>
          {vm.certificates.length === 0 ? (
            <p className="summary-empty">{t("summary.certs.empty")}</p>
          ) : (
            <ul className="summary-certs">
              {vm.certificates.map((cert) => (
                <li key={cert.id} className="summary-cert">
                  <div className="summary-cert__qr">
                    <QrCode matrix={cert.qr} label={cert.qrLabel} />
                  </div>
                  <div className="summary-cert__text">
                    <p className="summary-cert__id">
                      {cert.id} · {cert.kindLabel}
                      {cert.awardLabel ? ` · ${cert.awardLabel}` : ""}
                    </p>
                    <p className="summary-cert__title">{cert.title}</p>
                    <p className="summary-cert__meta">
                      {cert.companyName} · {cert.issuedOnLabel}
                    </p>
                    <p className="summary-cert__code">{cert.codeLabel}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {vm.moreCertificatesLabel ? <p className="summary-more">{vm.moreCertificatesLabel}</p> : null}
        </section>

        <footer className="summary-notes" aria-labelledby={`${groupName}-notes`}>
          <h2 id={`${groupName}-notes`} className="summary-notes__title">
            {t("summary.notes.title")}
          </h2>
          <ul>
            {vm.notes.map((note) => (
              <li key={note}>※ {note}</li>
            ))}
          </ul>
        </footer>
      </article>
    </div>
  );
}
