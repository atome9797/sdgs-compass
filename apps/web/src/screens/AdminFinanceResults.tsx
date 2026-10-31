"use client";

// 수지·자금 화면의 "결과" 부분: 숫자 타일 6개 · 결과 요약 문장 5줄 · 그래프 4개 · 연간 요약 표 · 월별 표.
// 학생 환원 규칙이 켜져 있으면 타일 2개 · 요약 한 줄 · 기별 막대(환원) · 자금 그래프의 "還元開始" 표시선 · 연간 표 세 줄 · 월별 표 한 칸이 더해져요.
// 계산(adminFinance.ts)과 문장(adminFinanceText.ts)은 core 에서, 그래프용 값 만들기는 lib/adminFinanceView.ts 에서 해요 — 여기는 그리기만 해요.
// 그래프 값은 엔 단위 그대로 넘기고, 눈금·말풍선에서 만 엔으로 보여 줘요(단위는 그래프 설명에 적어요).
import { ceilCompanies, type FinanceResult, type FinanceScenario } from "@sdgs-compass/core/adminFinance";
import { financeSummary, monthText } from "@sdgs-compass/core/adminFinanceText";
import { formatMan, formatManYen } from "@sdgs-compass/core/adminFormat";
import { formatNumber } from "@sdgs-compass/core/format";
import { useMemo } from "react";
import { ColumnChart } from "@/components/charts/ColumnChart";
import { LineChart } from "@/components/charts/LineChart";
import { Section } from "@/components/ui";
import { useAdmin } from "@/lib/adminSession";
import { annualRows, financeMarkers, formatDecimal, metricValues, monthAxis, periodColumns } from "@/lib/adminFinanceView";

interface Tile {
  id: string;
  label: string;
  value: string;
  sub?: string;
  /** 숫자가 아닌 글(예: "第2期の3か月目")이면 글자를 조금 작게 */
  text?: boolean;
}

export function AdminFinanceResults({ scenario, result }: { scenario: FinanceScenario; result: FinanceResult }) {
  const { t, locale } = useAdmin();
  const summary = useMemo(() => financeSummary(scenario, result, locale), [scenario, result, locale]);
  const axis = useMemo(() => monthAxis(scenario, locale), [scenario, locale]);
  const columns = useMemo(() => periodColumns(result), [result]);
  const rows = useMemo(() => annualRows(result), [result]);
  const studentReturn = result.studentReturn;
  const markers = useMemo(() => financeMarkers(result, locale), [result, locale]);
  const turnaroundMarkers = useMemo(() => financeMarkers(result, locale, ["turnaround"]), [result, locale]);

  const last = result.periods[result.periods.length - 1];
  if (!last) return null;
  const lastLabel = scenario.periods[scenario.periods.length - 1]?.label ?? last.label;
  const { profitTurnaroundMonth, lowestCash } = result.milestones;

  const money = (yen: number) => formatManYen(yen, locale);
  const tiles: Tile[] = [
    {
      id: "turnaround",
      label: t("admin.finance.kpi.turnaround"),
      value: profitTurnaroundMonth === null ? t("admin.finance.kpi.turnaroundNone") : profitTurnaroundMonth === 1 ? t("admin.finance.kpi.turnaroundFirst") : monthText(scenario, profitTurnaroundMonth, locale),
      text: true,
    },
    {
      id: "breakEven",
      label: t("admin.finance.kpi.breakEven", { label: lastLabel }),
      value: last.breakEvenCompanies === null ? t("admin.finance.kpi.breakEvenNone") : t("admin.finance.unit.companies", { n: formatNumber(ceilCompanies(last.breakEvenCompanies)) }),
    },
    { id: "sales", label: t("admin.finance.kpi.sales", { label: lastLabel }), value: money(last.salesYen) },
    { id: "profit", label: t("admin.finance.kpi.profit", { label: lastLabel }), value: money(last.profitYen) },
    { id: "cash", label: t("admin.finance.kpi.cash"), value: money(result.finalCashYen) },
    { id: "lowest", label: t("admin.finance.kpi.lowestCash"), value: money(lowestCash.yen), sub: monthText(scenario, lowestCash.month, locale) },
  ];
  if (studentReturn) {
    const first = studentReturn.firstPeriodIndex;
    tiles.push(
      {
        id: "returnFirst",
        label: t("admin.finance.kpi.returnFirst"),
        value: first === null ? t("admin.finance.kpi.returnNone") : t("admin.finance.kpi.returnFrom", { label: scenario.periods[first]?.label ?? result.periods[first]?.label ?? "" }),
        sub: studentReturn.reserveMonths > 0 ? t("admin.finance.kpi.returnRule", { months: studentReturn.reserveMonths }) : t("admin.finance.kpi.returnRuleNone"),
        text: true,
      },
      { id: "returnTotal", label: t("admin.finance.kpi.returnTotal"), value: money(studentReturn.totalYen) },
    );
  }

  const companiesValue = (value: number) => t("admin.finance.unit.companies", { n: formatDecimal(value) });
  const companiesSeries = metricValues(result, "companies");
  const monthlyProfit = metricValues(result, "monthlyProfit");

  return (
    <>
      <Section title={t("admin.finance.summary.title")}>
        {/* 타일 6개는 3열(2줄), 학생 환원까지 8개면 넓은 화면에서 4열(2줄) */}
        <div className={studentReturn ? "adm-kpis" : "adm-kpis adm-kpis--3"}>
          {tiles.map((tile) => (
            <div key={tile.id} className="card adm-kpi">
              <span className="adm-kpi__label">{tile.label}</span>
              <span className={tile.text ? "adm-kpi__value adm-kpi__value--text" : "adm-kpi__value"}>{tile.value}</span>
              {tile.sub ? <span className="adm-kpi__sub">{tile.sub}</span> : null}
            </div>
          ))}
        </div>
        <div className="card card--pad">
          <ul className="adm-insights">
            {summary.map((line, index) => (
              <li key={index}>{line}</li>
            ))}
          </ul>
        </div>
      </Section>

      <Section title={t("admin.finance.charts.title")}>
        <div className="adm-charts adm-charts--2">
          <LineChart
            title={t("admin.finance.chart.cumulative.title")}
            hint={t(studentReturn ? "admin.finance.chart.cumulative.hintReturn" : "admin.finance.chart.cumulative.hint")}
            summary={t("admin.finance.chart.cumulative.summary", { profit: money(result.finalCumulativeProfitYen), cash: money(result.finalCashYen) })}
            xLabels={axis.labels}
            xTitles={axis.titles}
            xHeader={t("admin.finance.monthly.month")}
            series={[
              { id: "cumulative", label: t("admin.finance.series.cumulative"), color: "var(--adm-c1)", values: metricValues(result, "cumulativeProfit") },
              { id: "cash", label: t("admin.finance.series.cash"), color: "var(--adm-c2)", values: metricValues(result, "cash") },
            ]}
            formatTick={formatMan}
            formatValue={money}
            includeZero
            markers={markers}
            anchorTicks
          />
          <LineChart
            title={t("admin.finance.chart.monthly.title")}
            hint={t("admin.finance.chart.monthly.hint")}
            summary={t("admin.finance.chart.monthly.summary", { profit: money(monthlyProfit[monthlyProfit.length - 1] ?? 0) })}
            xLabels={axis.labels}
            xTitles={axis.titles}
            xHeader={t("admin.finance.monthly.month")}
            series={[{ id: "monthlyProfit", label: t("admin.finance.series.monthlyProfit"), color: "var(--adm-c3)", values: monthlyProfit }]}
            formatTick={formatMan}
            formatValue={money}
            includeZero
            markers={turnaroundMarkers}
            anchorTicks
          />
          <ColumnChart
            title={t("admin.finance.chart.periods.title")}
            hint={t(studentReturn ? "admin.finance.chart.periods.hintReturn" : "admin.finance.chart.periods.hint")}
            summary={
              studentReturn
                ? t("admin.finance.chart.periods.summaryReturn", { sales: money(last.salesYen), profit: money(last.profitYen), amount: money(studentReturn.periods[studentReturn.periods.length - 1]?.returnYen ?? 0) })
                : t("admin.finance.chart.periods.summary", { sales: money(last.salesYen), profit: money(last.profitYen) })
            }
            categories={columns.categories}
            categoryHeader={t("admin.finance.chart.period")}
            series={[
              { id: "sales", label: t("admin.finance.series.sales"), color: "var(--adm-c1)", values: columns.sales },
              { id: "cost", label: t("admin.finance.series.cost"), color: "var(--adm-c2)", values: columns.cost },
              { id: "profit", label: t("admin.finance.series.profit"), color: "var(--adm-c3)", values: columns.profit },
              ...(columns.studentReturn ? [{ id: "studentReturn", label: t("admin.finance.series.studentReturn"), color: "var(--adm-c4)", values: columns.studentReturn }] : []),
            ]}
            formatTick={formatMan}
            formatValue={money}
            labelSeriesId="profit"
          />
          <LineChart
            title={t("admin.finance.chart.companies.title")}
            hint={t("admin.finance.chart.companies.hint")}
            summary={t("admin.finance.chart.companies.summary", { start: formatDecimal(result.start.companies), end: formatDecimal(companiesSeries[companiesSeries.length - 1] ?? 0) })}
            xLabels={axis.labels}
            xTitles={axis.titles}
            xHeader={t("admin.finance.monthly.month")}
            series={[{ id: "companies", label: t("admin.finance.series.companies"), color: "var(--adm-c3)", values: companiesSeries }]}
            formatTick={(value) => formatNumber(value)}
            formatValue={companiesValue}
            includeZero
            integerTicks
            anchorTicks
          />
        </div>
      </Section>

      <Section title={t("admin.finance.annual.title")}>
        <div className="card card--pad">
          <div className="adm-sheet-wrap" role="region" aria-label={t("admin.finance.annual.title")} tabIndex={0}>
            <table className="table adm-sheet">
              <thead>
                <tr>
                  <th scope="col">{t("admin.finance.annual.item")}</th>
                  {result.periods.map((period, index) => (
                    <th key={index} scope="col" className="num">
                      {scenario.periods[index]?.label ?? period.label}
                    </th>
                  ))}
                  {result.periods.length > 1 ? (
                    <th scope="col" className="num">
                      {t("admin.finance.annual.total")}
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const cell = (value: number | null) => (value === null ? t("admin.finance.kpi.breakEvenNone") : row.kind === "money" ? formatMan(value) : formatNumber(value));
                  return (
                    <tr key={row.id} className={row.strong ? "adm-sheet__strong" : undefined}>
                      <th scope="row">{t(row.label, row.labelParams)}</th>
                      {row.values.map((value, index) => (
                        <td key={index} className="num">
                          {cell(value)}
                        </td>
                      ))}
                      {result.periods.length > 1 ? <td className="num">{row.total === null ? "" : cell(row.total)}</td> : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <details className="adm-details card card--pad">
          <summary>{t("admin.finance.monthly.toggle")}</summary>
          <p className="adm-note">{t("admin.finance.monthly.title")}</p>
          <div className="adm-sheet-wrap adm-sheet-wrap--tall" role="region" aria-label={t("admin.finance.monthly.title")} tabIndex={0}>
            <table className="table adm-sheet">
              <thead>
                <tr>
                  <th scope="col">{t("admin.finance.monthly.month")}</th>
                  <th scope="col" className="num">
                    {t("admin.finance.monthly.companies")}
                  </th>
                  <th scope="col" className="num">
                    {t("admin.finance.series.sales")}
                  </th>
                  <th scope="col" className="num">
                    {t("admin.finance.series.cost")}
                  </th>
                  <th scope="col" className="num">
                    {t("admin.finance.series.profit")}
                  </th>
                  <th scope="col" className="num">
                    {t("admin.finance.series.cumulative")}
                  </th>
                  <th scope="col" className="num">
                    {t("admin.finance.series.cash")}
                  </th>
                  {studentReturn ? (
                    <th scope="col" className="num">
                      {t("admin.finance.series.studentReturn")}
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {result.months.map((month) => (
                  <tr key={month.month}>
                    <th scope="row">{monthText(scenario, month.month, locale)}</th>
                    <td className="num">{formatDecimal(month.companies)}</td>
                    <td className="num">{formatMan(month.salesYen)}</td>
                    <td className="num">{formatMan(month.costOfRevenueYen + month.costsYen)}</td>
                    <td className="num">{formatMan(month.profitYen)}</td>
                    <td className="num">{formatMan(month.cumulativeProfitYen)}</td>
                    <td className="num">{formatMan(month.cashYen)}</td>
                    {studentReturn ? <td className="num">{formatMan(month.studentReturnYen)}</td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </Section>
    </>
  );
}
