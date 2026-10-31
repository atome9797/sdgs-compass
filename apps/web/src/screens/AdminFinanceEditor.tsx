"use client";

// 수지·자금 화면의 "가정 입력" 부분: 기마다 7개 칸 + 경비 행(+ 인건비 계산기) + 자금 + 학생 환원(켜기 + 운전자금 N개월분) + 기 추가·삭제.
// 값은 칸마다 올바를 때만 시나리오에 반영하고(AdminNumberField), 시나리오를 바꾸는 일은 모두 onEdit(update) 로 위에 맡겨요 —
// 위에서는 저장 직전에 다시 읽은 시나리오에 update 를 적용해서 저장해요(다른 탭에서 방금 한 변경을 덮어쓰지 않게).
import {
  addPeriod,
  DEFAULT_RESERVE_MONTHS,
  FINANCE_FIELD_SPEC,
  laborCostYen,
  MAX_COST_LABEL_LENGTH,
  MAX_COST_ROWS,
  MAX_PERIOD_LABEL_LENGTH,
  MAX_PERIODS,
  MIN_PERIODS,
  parseFieldNumber,
  removePeriod,
  withStudentReturn,
  type FieldSpec,
  type FinanceCost,
  type FinanceFunding,
  type FinancePeriod,
  type FinanceScenario,
} from "@sdgs-compass/core/adminFinance";
import { formatYen } from "@sdgs-compass/core/format";
import type { MessageKey } from "@sdgs-compass/core/messages";
import { useId, useState, type ChangeEvent } from "react";
import { Banner, Button, Field, Section } from "@/components/ui";
import { useAdmin } from "@/lib/adminSession";
import { NumberField, TextField } from "./AdminNumberField";

export type ScenarioUpdate = (scenario: FinanceScenario) => FinanceScenario;

interface EditorProps {
  scenario: FinanceScenario;
  onEdit: (update: ScenarioUpdate) => void;
}

/** 인건비 계산기에 넣는 칸의 범위 (경비 한 행의 상한을 넘는 결과는 아래에서 따로 막아요) */
const LABOR_SPEC = {
  people: { min: 0, max: 10_000 },
  hourly: { min: 0, max: 100_000 },
  hours: { min: 0, max: 168 },
  weeks: { min: 0, max: 53 },
} as const satisfies Record<string, FieldSpec>;

type LaborKey = keyof typeof LABOR_SPEC;

/** 인원 × 시급 × 주당 시간 × 연간 주 수 → 경비 한 행. 값을 확인해서 쓸 수 있을 때만 "경비 행에 추가"가 켜져요 */
function LaborCalculator({ disabled, onApply }: { disabled: boolean; onApply: (yen: number) => void }) {
  const { t, locale } = useAdmin();
  const [fields, setFields] = useState<Record<LaborKey, string>>({ people: "", hourly: "", hours: "", weeks: "" });
  const set = (key: LaborKey) => (event: ChangeEvent<HTMLInputElement>) => setFields((current) => ({ ...current, [key]: event.target.value }));

  const touched = Object.values(fields).some((text) => text.trim() !== "");
  const people = parseFieldNumber(fields.people, LABOR_SPEC.people);
  const hourly = parseFieldNumber(fields.hourly, LABOR_SPEC.hourly);
  const hours = parseFieldNumber(fields.hours, LABOR_SPEC.hours);
  const weeks = parseFieldNumber(fields.weeks, LABOR_SPEC.weeks);
  let yen: number | null = null;
  if (people.ok && hourly.ok && hours.ok && weeks.ok) {
    const computed = laborCostYen({ people: people.value, hourlyYen: hourly.value, hoursPerWeek: hours.value, weeksPerYear: weeks.value });
    // 경비 한 행에 넣을 수 있는 금액 안일 때만 써요 (넘으면 저장할 수 없는 시나리오가 되어 버려요)
    if (computed !== null && computed <= FINANCE_FIELD_SPEC.costYen.max) yen = computed;
  }

  const input = (key: LaborKey, label: MessageKey) => (
    <Field label={t(label)}>
      {(props) => <input {...props} className="input" type="text" inputMode="decimal" autoComplete="off" value={fields[key]} onChange={set(key)} />}
    </Field>
  );

  return (
    <details className="adm-details">
      <summary>{t("admin.finance.labor.title")}</summary>
      <div className="stack">
        <p className="adm-note">{t("admin.finance.labor.lead")}</p>
        <div className="adm-form">
          {input("people", "admin.finance.labor.people")}
          {input("hourly", "admin.finance.labor.hourly")}
          {input("hours", "admin.finance.labor.hours")}
          {input("weeks", "admin.finance.labor.weeks")}
        </div>
        {touched ? <p className={yen === null ? "adm-note" : "strong"}>{yen === null ? t("admin.finance.labor.invalid") : t("admin.finance.labor.result", { amount: formatYen(yen, locale) })}</p> : null}
        <div className="adm-actions">
          <Button variant="secondary" size="sm" disabled={disabled || yen === null} onClick={() => yen !== null && onApply(yen)}>
            {t("admin.finance.labor.apply")}
          </Button>
        </div>
      </div>
    </details>
  );
}

export function AdminFinanceEditor({ scenario, onEdit }: EditorProps) {
  const { t, locale } = useAdmin();
  const uid = useId();
  // rev: 줄 수가 바뀔 때마다 올려서 칸들을 새로 그려요. problems: 지금 틀린 칸의 안내 문구 (칸 id → 문구)
  const [rev, setRev] = useState(0);
  const [problems, setProblems] = useState<Record<string, string>>({});

  const report = (id: string) => (message: string | null) =>
    setProblems((current) => {
      if (message === null) {
        if (!(id in current)) return current;
        const next = { ...current };
        delete next[id];
        return next;
      }
      return current[id] === message ? current : { ...current, [id]: message };
    });

  /** 줄 수가 바뀌는 편집: 칸이 자기 글자를 들고 있어서, 위치가 밀린 칸에 옛 글자가 남지 않도록 칸을 새로 그려요 */
  const restructure = (update: ScenarioUpdate) => {
    onEdit(update);
    setProblems({});
    setRev((current) => current + 1);
  };

  const editPeriod = (index: number, patch: Partial<FinancePeriod>) => onEdit((s) => ({ ...s, periods: s.periods.map((p, i) => (i === index ? { ...p, ...patch } : p)) }));
  const editCost = (periodIndex: number, costIndex: number, patch: Partial<FinanceCost>) =>
    onEdit((s) => ({ ...s, periods: s.periods.map((p, i) => (i !== periodIndex ? p : { ...p, costs: p.costs.map((c, j) => (j === costIndex ? { ...c, ...patch } : c)) })) }));
  const addCost = (periodIndex: number, cost: FinanceCost) =>
    restructure((s) => ({ ...s, periods: s.periods.map((p, i) => (i !== periodIndex || p.costs.length >= MAX_COST_ROWS ? p : { ...p, costs: [...p.costs, cost] })) }));
  const removeCost = (periodIndex: number, costIndex: number) =>
    restructure((s) => ({ ...s, periods: s.periods.map((p, i) => (i !== periodIndex ? p : { ...p, costs: p.costs.filter((_, j) => j !== costIndex) })) }));
  const editFunding = (patch: Partial<FinanceFunding>) => onEdit((s) => ({ ...s, funding: { ...s.funding, ...patch } }));
  /** 학생 환원 켜기·끄기. 켤 때 이미 개월 수가 있으면(다른 탭) 그대로, 없으면 기본 3개월. 끄면 개월 칸이 사라지니 그 칸의 오류도 지워요 */
  const toggleReturn = (on: boolean) => {
    report("return.months")(null);
    onEdit((s) => withStudentReturn(s, on ? (s.studentReturn?.reserveMonths ?? DEFAULT_RESERVE_MONTHS) : null));
  };

  const spec = FINANCE_FIELD_SPEC;
  const periodsCount = scenario.periods.length;
  const problemEntries = Object.entries(problems);

  return (
    <div id="adm-finance-edit" className="adm-anchor">
      <Section title={t("admin.finance.edit.title")} hint={t("admin.finance.edit.lead")}>
        <div key={rev} className="adm-stack">
          {problemEntries.length > 0 ? (
            <Banner tone="danger">
              <p className="strong">{t("admin.finance.edit.errors", { n: problemEntries.length })}</p>
              <ul className="adm-issues">
                {problemEntries.map(([id, text]) => (
                  <li key={id}>{text}</li>
                ))}
              </ul>
            </Banner>
          ) : null}

          <div className="card card--pad">
            <div className="adm-form">
              <NumberField
                label={t("admin.finance.edit.startCompanies")}
                value={scenario.startCompanies}
                spec={spec.startCompanies}
                inputMode="numeric"
                problemLabel={t("admin.finance.edit.startCompanies")}
                onProblem={report("start")}
                onCommit={(value) => onEdit((s) => ({ ...s, startCompanies: value }))}
              />
            </div>
          </div>

          {scenario.periods.map((period, index) => {
            const base = `p${index}`;
            const titleId = `${uid}-${base}`;
            const costTotal = period.costs.reduce((sum, cost) => sum + cost.yen, 0);
            const num = (key: string, labelKey: MessageKey, value: number, fieldSpec: FieldSpec, commit: (value: number) => void, extra: { hint?: string; percent?: boolean; inputMode?: "numeric" | "decimal" } = {}) => (
              <NumberField
                label={t(labelKey)}
                hint={extra.hint}
                value={value}
                spec={fieldSpec}
                percent={extra.percent}
                inputMode={extra.inputMode}
                problemLabel={`${period.label} ${t(labelKey)}`}
                onProblem={report(`${base}.${key}`)}
                onCommit={commit}
              />
            );
            return (
              <section key={base} className="card card--pad stack adm-period" aria-labelledby={titleId}>
                <div className="adm-period__head">
                  <h3 id={titleId} className="adm-period__title">
                    {t("admin.finance.edit.periodTitle", { label: period.label })}
                  </h3>
                  <Button variant="ghost" size="sm" disabled={periodsCount <= MIN_PERIODS} onClick={() => restructure((s) => removePeriod(s, index))}>
                    {t("admin.finance.edit.removePeriod", { label: period.label })}
                  </Button>
                </div>
                <div className="adm-form adm-form--fields">
                  <TextField
                    label={t("admin.finance.edit.periodName")}
                    value={period.label}
                    maxLength={MAX_PERIOD_LABEL_LENGTH}
                    problemLabel={`${period.label} ${t("admin.finance.edit.periodName")}`}
                    onProblem={report(`${base}.label`)}
                    onCommit={(value) => editPeriod(index, { label: value })}
                  />
                  {num("companiesEnd", "admin.finance.field.companiesEnd", period.companiesEnd, spec.companiesEnd, (value) => editPeriod(index, { companiesEnd: value }), { inputMode: "numeric" })}
                  {num("projectsPerCompany", "admin.finance.field.projectsPerCompany", period.projectsPerCompany, spec.projectsPerCompany, (value) => editPeriod(index, { projectsPerCompany: value }))}
                  {num("matchRate", "admin.finance.field.matchRate", period.matchRate, spec.matchRate, (value) => editPeriod(index, { matchRate: value }), { percent: true, hint: t("admin.finance.field.matchRateHint") })}
                  {num("feePerMatchYen", "admin.finance.field.feePerMatch", period.feePerMatchYen, spec.feePerMatchYen, (value) => editPeriod(index, { feePerMatchYen: value }))}
                  {num("donationRate", "admin.finance.field.donationRate", period.donationRate, spec.donationRate, (value) => editPeriod(index, { donationRate: value }), { percent: true })}
                  {num("adRevenuePerCompanyYen", "admin.finance.field.adRevenue", period.adRevenuePerCompanyYen, spec.adRevenuePerCompanyYen, (value) => editPeriod(index, { adRevenuePerCompanyYen: value }), {
                    hint: t("admin.finance.field.adRevenueHint"),
                  })}
                  {num("costOfRevenueYen", "admin.finance.field.costOfRevenue", period.costOfRevenueYen, spec.costOfRevenueYen, (value) => editPeriod(index, { costOfRevenueYen: value }))}
                </div>

                <div className="adm-costs">
                  <p className="adm-subtitle">{t("admin.finance.cost.title")}</p>
                  {period.costs.length === 0 ? <p className="adm-note">{t("admin.finance.cost.none")}</p> : null}
                  {period.costs.map((cost, costIndex) => {
                    const costBase = `${base}.c${costIndex}`;
                    return (
                      <div key={costIndex} className="adm-cost-row">
                        <TextField
                          label={t("admin.finance.cost.label")}
                          value={cost.label}
                          maxLength={MAX_COST_LABEL_LENGTH}
                          problemLabel={`${period.label} ${t("admin.finance.cost.label")}`}
                          onProblem={report(`${costBase}.label`)}
                          onCommit={(value) => editCost(index, costIndex, { label: value })}
                        />
                        <NumberField
                          label={t("admin.finance.cost.yen")}
                          value={cost.yen}
                          spec={spec.costYen}
                          problemLabel={`${period.label} ${cost.label}`}
                          onProblem={report(`${costBase}.yen`)}
                          onCommit={(value) => editCost(index, costIndex, { yen: value })}
                        />
                        <div className="field adm-cost-row__action">
                          {/* 입력 칸의 이름표와 같은 높이를 비워 두어서, 버튼이 입력 칸과 같은 줄에 놓이게 해요 */}
                          <span className="field__label" aria-hidden="true">
                            &nbsp;
                          </span>
                          <Button variant="ghost" size="sm" onClick={() => removeCost(index, costIndex)} aria-label={t("admin.finance.cost.remove", { label: cost.label })}>
                            {t("admin.finance.scenario.delete")}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  <div className="adm-actions">
                    <Button variant="secondary" size="sm" disabled={period.costs.length >= MAX_COST_ROWS} onClick={() => addCost(index, { label: t("admin.finance.cost.defaultLabel"), yen: 0 })}>
                      {t("admin.finance.cost.add")}
                    </Button>
                    <span className="adm-meta">{t("admin.finance.cost.total", { amount: formatYen(costTotal, locale) })}</span>
                  </div>
                  {period.costs.length >= MAX_COST_ROWS ? <p className="adm-note">{t("admin.finance.cost.max", { max: MAX_COST_ROWS })}</p> : null}
                  <LaborCalculator disabled={period.costs.length >= MAX_COST_ROWS} onApply={(yen) => addCost(index, { label: t("admin.finance.labor.rowLabel"), yen })} />
                </div>
              </section>
            );
          })}

          <div className="adm-actions">
            <Button variant="secondary" disabled={periodsCount >= MAX_PERIODS} onClick={() => restructure((s) => addPeriod(s, locale))}>
              {t("admin.finance.edit.addPeriod")}
            </Button>
            {periodsCount >= MAX_PERIODS ? <span className="adm-meta">{t("admin.finance.edit.periodsMax", { max: MAX_PERIODS })}</span> : null}
            {periodsCount <= MIN_PERIODS ? <span className="adm-meta">{t("admin.finance.edit.periodsMin", { min: MIN_PERIODS })}</span> : null}
          </div>

          <section className="card card--pad stack adm-period" aria-labelledby={`${uid}-funding`}>
            <h3 id={`${uid}-funding`} className="adm-period__title">
              {t("admin.finance.funding.title")}
            </h3>
            <div className="adm-form adm-form--fields">
              <NumberField
                label={t("admin.finance.funding.equity")}
                value={scenario.funding.equityYen}
                spec={spec.equityYen}
                problemLabel={t("admin.finance.funding.equity")}
                onProblem={report("funding.equity")}
                onCommit={(value) => editFunding({ equityYen: value })}
              />
              <NumberField
                label={t("admin.finance.funding.borrowing")}
                value={scenario.funding.borrowingYen}
                spec={spec.borrowingYen}
                problemLabel={t("admin.finance.funding.borrowing")}
                onProblem={report("funding.borrowing")}
                onCommit={(value) => editFunding({ borrowingYen: value })}
              />
              <NumberField
                label={t("admin.finance.funding.capex")}
                value={scenario.funding.capexYen}
                spec={spec.capexYen}
                problemLabel={t("admin.finance.funding.capex")}
                onProblem={report("funding.capex")}
                onCommit={(value) => editFunding({ capexYen: value })}
              />
              <NumberField
                label={t("admin.finance.funding.repayment")}
                hint={t("admin.finance.funding.repaymentHint")}
                value={scenario.funding.repaymentYenPerPeriod}
                spec={spec.repaymentYenPerPeriod}
                problemLabel={t("admin.finance.funding.repayment")}
                onProblem={report("funding.repayment")}
                onCommit={(value) => editFunding({ repaymentYenPerPeriod: value })}
              />
            </div>
          </section>

          <section className="card card--pad stack adm-period" aria-labelledby={`${uid}-return`}>
            <h3 id={`${uid}-return`} className="adm-period__title">
              {t("admin.finance.return.title")}
            </h3>
            <div>
              <label className="check">
                <input type="checkbox" checked={scenario.studentReturn !== undefined} aria-describedby={`${uid}-return-hint`} onChange={(event) => toggleReturn(event.target.checked)} />
                {t("admin.finance.return.toggle")}
              </label>
              <p id={`${uid}-return-hint`} className="field__hint">
                {t(scenario.studentReturn ? "admin.finance.return.hint" : "admin.finance.return.off")}
              </p>
            </div>
            {scenario.studentReturn ? (
              <div className="adm-form adm-form--fields">
                <NumberField
                  label={t("admin.finance.return.months")}
                  value={scenario.studentReturn.reserveMonths}
                  spec={spec.reserveMonths}
                  inputMode="numeric"
                  problemLabel={t("admin.finance.return.months")}
                  onProblem={report("return.months")}
                  onCommit={(value) => onEdit((s) => withStudentReturn(s, value))}
                />
              </div>
            ) : null}
          </section>
        </div>
      </Section>
    </div>
  );
}
