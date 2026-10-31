"use client";

// 두 시나리오를 한 그래프에 겹쳐 비교해요: 실선 = 위에서 고른(표시 중인) 시나리오, 점선 = 여기서 고른 시나리오.
// 예를 들어 "제출본"과 "수정 시산"을 따로 저장해 두고 누적 손익 · 자금 잔액 · 월 경상이익 · 기업 수를 겹쳐 봐요.
// 기 수가 다르면 짧은 쪽은 끝에서 선이 멈춰요. 가로축은 기 이름이 시나리오마다 달라도 틀리지 않게 "시작 후 n개월"만 써요.
// "학생 환원(누적)"은 두 시나리오 중 하나라도 환원 규칙을 켰을 때만 고를 수 있어요 (끈 쪽은 0 으로 그려요).
import { simulate, type FinanceResult } from "@sdgs-compass/core/adminFinance";
import { compareSentence } from "@sdgs-compass/core/adminFinanceText";
import { formatMan, formatManYen } from "@sdgs-compass/core/adminFormat";
import { formatNumber } from "@sdgs-compass/core/format";
import { useMemo, useState } from "react";
import { LineChart } from "@/components/charts/LineChart";
import { Field, Section } from "@/components/ui";
import { useAdmin } from "@/lib/adminSession";
import type { StoredScenario } from "@/lib/adminStore";
import { FINANCE_METRIC_LABEL, FINANCE_METRICS, formatDecimal, isMoneyMetric, metricValues, padValues, plainMonthAxis, type FinanceMetric } from "@/lib/adminFinanceView";

interface CompareProps {
  selected: StoredScenario;
  /** 선택한 것 말고 저장돼 있는 시나리오들 */
  others: readonly StoredScenario[];
  compareId: string | null;
  onPick: (id: string | null) => void;
}

export function AdminFinanceCompare({ selected, others, compareId, onPick }: CompareProps) {
  const { t, locale } = useAdmin();
  const [metric, setMetric] = useState<FinanceMetric>("cumulativeProfit");
  const target = others.find((item) => item.id === compareId) ?? null;
  const resultA = useMemo(() => simulate(selected.scenario), [selected.scenario]);
  const resultB = useMemo(() => (target ? simulate(target.scenario) : null), [target]);

  const body = () => {
    if (others.length === 0) return <p className="adm-note">{t("admin.finance.compare.needTwo")}</p>;
    return (
      <>
        <Field label={t("admin.finance.compare.pick")}>
          {(props) => (
            <select {...props} className="select" value={compareId ?? ""} onChange={(event) => onPick(event.target.value === "" ? null : event.target.value)}>
              <option value="">{t("admin.finance.compare.none")}</option>
              {others.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.scenario.name}
                </option>
              ))}
            </select>
          )}
        </Field>
        {target && resultB ? chart(target, resultB) : <p className="adm-note">{t("admin.finance.compare.choose")}</p>}
      </>
    );
  };

  const chart = (other: StoredScenario, resultOther: FinanceResult) => {
    const periods = Math.max(selected.scenario.periods.length, other.scenario.periods.length);
    const axis = plainMonthAxis(periods, locale);
    const length = axis.labels.length;
    const returnOn = resultA.studentReturn !== null || resultOther.studentReturn !== null;
    const metrics = FINANCE_METRICS.filter((value) => value !== "cumulativeReturn" || returnOn);
    // 고른 값이 사라졌으면(환원을 켠 시나리오에서 끈 시나리오로 바꿈) 누적 손익으로 돌아가요
    const shown: FinanceMetric = metrics.includes(metric) ? metric : "cumulativeProfit";
    const metricName = t(FINANCE_METRIC_LABEL[shown]);
    const money = isMoneyMetric(shown);
    return (
      <>
        <div className="adm-filter" role="group" aria-label={t("admin.finance.compare.metric")}>
          <span className="adm-filter__label">{t("admin.finance.compare.metric")}</span>
          {metrics.map((value) => (
            <button key={value} type="button" className="chip" aria-pressed={shown === value} onClick={() => setMetric(value)}>
              {t(FINANCE_METRIC_LABEL[value])}
            </button>
          ))}
        </div>
        <LineChart
          title={t("admin.finance.compare.chartTitle", { metric: metricName })}
          hint={t(money ? "admin.finance.compare.unitMan" : "admin.finance.compare.unitCompanies")}
          summary={t("admin.finance.compare.chartSummary", { metric: metricName, a: selected.scenario.name, b: other.scenario.name })}
          xLabels={axis.labels}
          xTitles={axis.titles}
          xHeader={t("admin.finance.monthly.month")}
          series={[
            { id: "a", label: selected.scenario.name, color: "var(--adm-c1)", values: padValues(metricValues(resultA, shown), length) },
            { id: "b", label: other.scenario.name, color: "var(--adm-c2)", values: padValues(metricValues(resultOther, shown), length), dashed: true },
          ]}
          formatTick={money ? formatMan : (value) => formatNumber(value)}
          formatValue={money ? (value) => formatManYen(value, locale) : (value) => t("admin.finance.unit.companies", { n: formatDecimal(value) })}
          includeZero
          integerTicks={!money}
          anchorTicks
          height={260}
        />
        <p className="adm-meta">
          {t("admin.finance.compare.solid")} / {t("admin.finance.compare.dashed")}
        </p>
        <ul className="adm-insights">
          <li>{t("admin.finance.compare.summaryItem", { name: selected.scenario.name, text: compareSentence(selected.scenario, resultA, locale) })}</li>
          <li>{t("admin.finance.compare.summaryItem", { name: other.scenario.name, text: compareSentence(other.scenario, resultOther, locale) })}</li>
        </ul>
      </>
    );
  };

  return (
    <Section title={t("admin.finance.compare.title")} hint={t("admin.finance.compare.lead")}>
      <div className="card card--pad stack">{body()}</div>
    </Section>
  );
}
