"use client";

// 감도 분석: 한 항목(성사율 · 건당 수수료 · 광고 단가)을 모든 기에서 -30%~+30% 바꿨을 때 흑자 전환 시기 · 자금 부족 시기 ·
// 마지막 기의 경상이익 · 마지막 달의 자금 잔액(학생 환원을 켰으면 환원 뒤) · 학생 환원 합계(켰을 때만)가 어떻게 달라지는지 표로 보여 줘요.
// 계산은 core 의 sensitivity() 예요.
import { SENSITIVITY_PARAMS, sensitivity, type FinanceScenario, type SensitivityParam } from "@sdgs-compass/core/adminFinance";
import { monthText } from "@sdgs-compass/core/adminFinanceText";
import { formatMan, formatSignedPercent } from "@sdgs-compass/core/adminFormat";
import { useMemo, useState } from "react";
import { Section } from "@/components/ui";
import { useAdmin } from "@/lib/adminSession";
import { SENSITIVITY_PARAM_LABEL } from "@/lib/adminFinanceView";

export function AdminFinanceSensitivity({ scenario }: { scenario: FinanceScenario }) {
  const { t, locale } = useAdmin();
  const [param, setParam] = useState<SensitivityParam>("matchRate");
  const rows = useMemo(() => sensitivity(scenario, param), [scenario, param]);
  const returnOn = scenario.studentReturn !== undefined;

  return (
    <Section title={t("admin.finance.sens.title")} hint={t("admin.finance.sens.lead")}>
      <div className="card card--pad stack">
        <div className="adm-filter" role="group" aria-label={t("admin.finance.sens.param")}>
          <span className="adm-filter__label">{t("admin.finance.sens.param")}</span>
          {SENSITIVITY_PARAMS.map((value) => (
            <button key={value} type="button" className="chip" aria-pressed={param === value} onClick={() => setParam(value)}>
              {t(SENSITIVITY_PARAM_LABEL[value])}
            </button>
          ))}
        </div>
        <div className="adm-sheet-wrap" role="region" aria-label={t("admin.finance.sens.title")} tabIndex={0}>
          <table className="table adm-sheet">
            <thead>
              <tr>
                <th scope="col">{t("admin.finance.sens.col.change")}</th>
                <th scope="col">{t("admin.finance.sens.col.turnaround")}</th>
                <th scope="col">{t("admin.finance.sens.col.cash")}</th>
                <th scope="col" className="num">
                  {t("admin.finance.sens.col.lastProfit")}
                </th>
                <th scope="col" className="num">
                  {t("admin.finance.sens.col.finalCash")}
                </th>
                {returnOn ? (
                  <th scope="col" className="num">
                    {t("admin.finance.sens.col.return")}
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const base = row.factor === 0;
                return (
                  <tr key={row.factor} className={base ? "adm-sheet__strong" : undefined} aria-current={base ? "true" : undefined}>
                    <th scope="row">{base ? t("admin.finance.sens.base") : formatSignedPercent(row.factor, 0)}</th>
                    <td>{row.profitTurnaroundMonth === null ? t("admin.finance.sens.none") : monthText(scenario, row.profitTurnaroundMonth, locale)}</td>
                    <td>{row.cashShortMonth === null ? t("admin.finance.sens.cashNever") : monthText(scenario, row.cashShortMonth, locale)}</td>
                    <td className="num">{formatMan(row.lastPeriodProfitYen)}</td>
                    <td className="num">{formatMan(row.finalCashYen)}</td>
                    {returnOn ? <td className="num">{formatMan(row.totalReturnYen)}</td> : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="adm-note">{t("admin.finance.sens.note")}</p>
      </div>
    </Section>
  );
}
