"use client";

// 운영자 화면 ② SNS 지표 (/admin/sns/): 공식 SNS(X · Instagram · Facebook · YouTube)의 분석 화면 숫자를 주 1회 손으로 기록해요.
// 입력 방법은 세 가지 — ① 가상 샘플 불러오기 ② 한 줄씩 입력 ③ CSV 가져오기(내보내기·견본도 있어요).
// 모은 숫자로 지표 4개의 주별 추이 그래프와, 최신 주를 직전 주 · 최근 4주 중앙값과 비교한 표를 보여 줘요.
// 입력은 이 브라우저(localStorage)에만 저장하고 서버로 보내지 않아요. 왜 API 연동이 아니라 수동 입력인지는 docs/admin.md.
import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import {
  compareLatestWeek,
  formatSnsDelta,
  formatSnsValue,
  mondayOf,
  parseSnsCsv,
  planSnsImport,
  removeSnsRow,
  sampleSnsRows,
  serializeSnsCsv,
  SNS_CHANNEL_NAME,
  SNS_CHANNELS,
  SNS_CSV_MAX_ROWS,
  SNS_CSV_REASON_KEY,
  SNS_DRAFT_ERROR_KEY,
  SNS_METRIC_LABEL,
  SNS_METRICS,
  snsChartSeries,
  snsChartWeeks,
  snsTemplateCsv,
  validateSnsDraft,
  type SnsCsvIssue,
  type SnsDelta,
  type SnsDraft,
  type SnsDraftError,
  type SnsDraftField,
  type SnsImportPlan,
  type SnsMetric,
  type SnsRow,
} from "@sdgs-compass/core/adminSns";
import { formatCompact, formatPercent } from "@sdgs-compass/core/adminFormat";
import { formatDate, formatDateShort, formatNumber } from "@sdgs-compass/core/format";
import { CHANNEL_COLOR } from "@/components/charts/channelColors";
import { LineChart, type LineSeries } from "@/components/charts/LineChart";
import { Banner, Button, Field, Section, Tag, type Tone } from "@/components/ui";
import { useAdmin } from "@/lib/adminSession";
import { browserSyncStorage, readAdminStore, updateAdminStore, type AdminStoreData } from "@/lib/adminStore";
import { downloadTextFile, readTextFile } from "@/lib/adminFiles";

/** 가져오기 결과에 줄 단위로 보여 줄 최대 개수 (나머지는 "ほか○行") */
const ISSUES_SHOWN = 10;

/** 0.032 → "3.2%" 로 눈금용 (소수 첫째 자리까지, 필요 없는 0 은 빼요: 0.02 → "2%") */
const percentTick = (ratio: number): string => `${Number((ratio * 100).toFixed(1))}%`;

const blankDraft = (today: string): SnsDraft => ({ weekStart: mondayOf(today), channel: "x", followers: "", reach: "", engagementPercent: "", linkClicks: "" });

interface CsvReport {
  errors: SnsCsvIssue[];
  warnings: SnsCsvIssue[];
}

interface PendingImport {
  incoming: SnsRow[];
  plan: SnsImportPlan;
}

export function AdminSnsScreen() {
  const { t, locale, demo } = useAdmin();
  const [storage] = useState(() => browserSyncStorage());
  const [data, setData] = useState<AdminStoreData>(() => readAdminStore(storage));
  const [saveFailed, setSaveFailed] = useState(false);
  const [status, setStatus] = useState<{ text: string; tone: Tone } | null>(null);

  const [draft, setDraft] = useState<SnsDraft>(() => blankDraft(demo.today));
  const [errors, setErrors] = useState<Partial<Record<SnsDraftField, SnsDraftError>>>({});

  const [csvText, setCsvText] = useState("");
  const [csvReport, setCsvReport] = useState<CsvReport | null>(null);
  const [csvFail, setCsvFail] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const rows = data.snsRows;
  const weekText = (weekStart: string): string => t("admin.sns.weekOf", { date: formatDate(weekStart, locale) });
  const notify = (text: string, tone: Tone = "success") => setStatus({ text, tone });

  /** 저장 직전에 읽은 값을 기준으로 바꿔서 저장하고, 화면의 값도 그걸로 맞춰요 */
  const apply = (change: (fresh: AdminStoreData) => Partial<AdminStoreData>) => {
    const result = updateAdminStore(change, storage);
    setData(result.data);
    setSaveFailed(!result.ok);
  };

  // ───────── 입력 ① 샘플 ─────────
  const loadSample = () => {
    const sample = sampleSnsRows(demo.today);
    apply((fresh) => ({ snsRows: planSnsImport(fresh.snsRows, sample).rows, snsSample: true }));
    notify(t("admin.sns.sampleLoaded", { n: sample.length }));
  };

  // ───────── 입력 ② 한 줄씩 ─────────
  const setField = (field: keyof SnsDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };
  const submitDraft = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = validateSnsDraft(draft);
    if (!result.ok) {
      setErrors(result.errors);
      setStatus(null);
      return;
    }
    const row = result.row;
    const replaced = rows.some((r) => r.weekStart === row.weekStart && r.channel === row.channel);
    apply((fresh) => ({ snsRows: planSnsImport(fresh.snsRows, [row]).rows }));
    setErrors({});
    // 주와 SNS 는 남겨 두고 숫자만 비워요 (같은 주의 다른 SNS 를 이어서 넣기 쉽게)
    setDraft((current) => ({ ...current, followers: "", reach: "", engagementPercent: "", linkClicks: "" }));
    notify(t(replaced ? "admin.sns.form.savedReplaced" : "admin.sns.form.saved", { channel: SNS_CHANNEL_NAME[row.channel], week: weekText(row.weekStart) }));
  };
  const errorText = (field: SnsDraftField): string | null => {
    const error = errors[field];
    return error ? t(SNS_DRAFT_ERROR_KEY[error]) : null;
  };

  // ───────── 입력 ③ CSV ─────────
  const finishImport = (incoming: SnsRow[]) => {
    const plan = planSnsImport(rows, incoming);
    apply((fresh) => ({ snsRows: planSnsImport(fresh.snsRows, incoming).rows }));
    setPending(null);
    setCsvText("");
    notify(t("admin.sns.csv.result", { added: plan.added, replaced: plan.replaced, unchanged: plan.unchanged }));
  };
  const importCsv = (text: string) => {
    const result = parseSnsCsv(text);
    setCsvReport({ errors: result.errors, warnings: result.warnings });
    setCsvFail(null);
    setStatus(null);
    if (result.rows.length === 0) {
      setPending(null);
      notify(t("admin.sns.csv.nothing"), "warning");
      return;
    }
    const plan = planSnsImport(rows, result.rows);
    // 이미 있는 주·SNS 의 값을 바꾸게 되면 확인을 받아요 (모르고 덮어쓰지 않게)
    if (plan.replaced > 0) setPending({ incoming: result.rows, plan });
    else finishImport(result.rows);
  };
  const pickFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;
    const result = await readTextFile(file);
    input.value = "";
    if (!result.ok) {
      setCsvReport(null);
      setPending(null);
      setCsvFail(t(result.reason === "too_large" ? "admin.sns.csv.tooLarge" : "admin.sns.csv.readFail"));
      return;
    }
    importCsv(result.text);
  };

  // ───────── 내보내기 · 지우기 ─────────
  const exportCsv = () => downloadTextFile(`sns-metrics-${demo.today}.csv`, serializeSnsCsv(rows));
  const downloadTemplate = () => downloadTextFile("sns-metrics-template.csv", snsTemplateCsv(demo.today));
  const deleteRow = (row: SnsRow) => {
    apply((fresh) => ({ snsRows: removeSnsRow(fresh.snsRows, row) }));
    notify(t("admin.sns.rows.deleted"));
  };
  const clearAll = () => {
    apply(() => ({ snsRows: [], snsSample: false }));
    setConfirmClear(false);
    setPending(null);
    setCsvReport(null);
    notify(t("admin.sns.cleared"));
  };

  // ───────── 그래프 · 비교표용 계산 ─────────
  const weeks = useMemo(() => snsChartWeeks(rows), [rows]);
  const comparison = useMemo(() => compareLatestWeek(rows), [rows]);
  // 표는 최근 주가 위로, 같은 주 안에서는 SNS 순서대로
  const sortedDesc = useMemo(() => [...rows].sort((a, b) => b.weekStart.localeCompare(a.weekStart) || SNS_CHANNELS.indexOf(a.channel) - SNS_CHANNELS.indexOf(b.channel)), [rows]);
  const weekCount = new Set(rows.map((row) => row.weekStart)).size;
  const sample = data.snsSample ? <Tag tone="warning">{t("admin.sampleBadge")}</Tag> : null;

  const chartFor = (metric: SnsMetric) => {
    const series = snsChartSeries(rows, metric, weeks);
    const lineSeries: LineSeries[] = series.map((s) => ({ id: s.channel, label: SNS_CHANNEL_NAME[s.channel], color: CHANNEL_COLOR[s.channel], values: s.values }));
    const latest = series
      .map((s) => {
        const last = [...s.values].reverse().find((value) => value !== null) ?? null;
        return `${SNS_CHANNEL_NAME[s.channel]} ${formatSnsValue(metric, last)}`;
      })
      .join(locale === "ja" ? "、" : ", ");
    const isRate = metric === "engagementRate";
    return (
      <LineChart
        key={metric}
        title={t(SNS_METRIC_LABEL[metric])}
        summary={t("admin.sns.chart.summary", { metric: t(SNS_METRIC_LABEL[metric]), weeks: weeks.length, latest })}
        xLabels={weeks.map(formatDateShort)}
        xTitles={weeks.map(weekText)}
        xHeader={t("admin.sns.rows.week")}
        series={lineSeries}
        formatTick={isRate ? percentTick : formatCompact}
        formatValue={isRate ? (value) => formatPercent(value) : formatNumber}
        integerTicks={!isRate}
        height={220}
      />
    );
  };

  const deltaCell = (label: "admin.sns.compare.vsPrev" | "admin.sns.compare.vsMedian", delta: SnsDelta | null) => {
    if (delta === null) return null;
    const glyph = delta.amount > 0 ? "▲" : delta.amount < 0 ? "▼" : "";
    return (
      <span className="adm-cell__delta">
        {glyph ? <span className={delta.amount > 0 ? "adm-up" : "adm-down"}>{glyph} </span> : null}
        {t(label, { delta: formatSnsDelta(delta) })}
      </span>
    );
  };

  const issueList = (issues: SnsCsvIssue[]) => (
    <ul className="adm-issues">
      {issues.slice(0, ISSUES_SHOWN).map((issue, index) => (
        <li key={`${issue.line}-${index}`}>{t("admin.sns.csv.line", { line: issue.line, reason: t(SNS_CSV_REASON_KEY[issue.reason], { max: SNS_CSV_MAX_ROWS }) })}</li>
      ))}
      {issues.length > ISSUES_SHOWN ? <li>{t("admin.sns.csv.moreIssues", { n: issues.length - ISSUES_SHOWN })}</li> : null}
    </ul>
  );

  return (
    <>
      <section className="adm-intro" aria-labelledby="adm-sns-title">
        <div className="adm-intro__title">
          <h1 id="adm-sns-title" className="adm-h1">
            {t("admin.sns.title")}
          </h1>
          {sample}
        </div>
        <p className="adm-lead">{t("admin.sns.lead")}</p>
        <p className="adm-lead">{t("admin.sns.channelNote")}</p>
        <p className="adm-meta">{t("admin.localOnly")}</p>
      </section>

      {storage.kind === "memory" ? <Banner tone="warning">{t("admin.storage.memoryOnly")}</Banner> : null}
      {saveFailed ? <Banner tone="warning">{t("admin.storage.failed")}</Banner> : null}
      {status ? <Banner tone={status.tone}>{status.text}</Banner> : null}

      {rows.length === 0 ? (
        <div className="card card--pad stack">
          <p className="strong">{t("admin.sns.empty.title")}</p>
          <p className="adm-note">{t("admin.sns.empty.body")}</p>
          <div className="adm-actions">
            <Button onClick={loadSample}>{t("admin.sns.loadSample")}</Button>
          </div>
        </div>
      ) : (
        <>
          <div className="row row--between">
            <p className="adm-meta">{t("admin.sns.rowsCount", { n: rows.length, weeks: weekCount })}</p>
            <div className="adm-actions">
              <Button variant="secondary" size="sm" onClick={exportCsv}>
                {t("admin.sns.csv.export")}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmClear(true)}>
                {t("admin.sns.clear")}
              </Button>
            </div>
          </div>
          {confirmClear ? (
            <Banner tone="warning">
              <p>{t("admin.sns.clearConfirm", { n: rows.length })}</p>
              <div className="adm-actions">
                <Button variant="danger" size="sm" onClick={clearAll}>
                  {t("admin.sns.clearYes")}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setConfirmClear(false)}>
                  {t("admin.sns.cancel")}
                </Button>
              </div>
            </Banner>
          ) : null}

          <Section title={t("admin.sns.charts.title")} action={sample}>
            <div className="adm-charts adm-charts--2">{SNS_METRICS.map(chartFor)}</div>
          </Section>

          <Section title={t("admin.sns.compare.title")} hint={comparison.latestWeek ? t("admin.sns.compare.hint", { date: formatDate(comparison.latestWeek, locale) }) : undefined}>
            <div className="card card--pad">
              <div className="table-wrap">
                <table className="table table--stack">
                  <thead>
                    <tr>
                      <th scope="col">{t("admin.sns.compare.channel")}</th>
                      {SNS_METRICS.map((metric) => (
                        <th key={metric} scope="col" className="num">
                          {t(SNS_METRIC_LABEL[metric])}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.rows.map((row) => (
                      <tr key={row.channel}>
                        <td>{SNS_CHANNEL_NAME[row.channel]}</td>
                        {SNS_METRICS.map((metric) => {
                          const cell = row.cells[metric];
                          const hasDelta = cell.vsPrev !== null || cell.vsMedian !== null;
                          return (
                            <td key={metric} className="num" data-label={t(SNS_METRIC_LABEL[metric])}>
                              {row.hasLatest ? (
                                <span className="adm-cell">
                                  <span className="adm-cell__value">{formatSnsValue(metric, cell.value)}</span>
                                  {deltaCell("admin.sns.compare.vsPrev", cell.vsPrev)}
                                  {deltaCell("admin.sns.compare.vsMedian", cell.vsMedian)}
                                  {hasDelta ? null : <span className="adm-cell__delta">{t("admin.sns.compare.noBase")}</span>}
                                </span>
                              ) : (
                                <span className="adm-cell__delta">{t("admin.sns.compare.none")}</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Section>
        </>
      )}

      <div className="two-col">
        <Section title={t("admin.sns.form.title")}>
          <form className="card card--pad stack" onSubmit={submitDraft} noValidate>
            <div className="adm-form">
              <Field label={t("admin.sns.form.week")} hint={t("admin.sns.form.weekHint")} error={errorText("weekStart")}>
                {(props) => <input {...props} className="input" type="text" inputMode="numeric" autoComplete="off" value={draft.weekStart} onChange={(event) => setField("weekStart", event.target.value)} />}
              </Field>
              <Field label={t("admin.sns.form.channel")} error={errorText("channel")}>
                {(props) => (
                  <select {...props} className="select" value={draft.channel} onChange={(event) => setField("channel", event.target.value)}>
                    {SNS_CHANNELS.map((channel) => (
                      <option key={channel} value={channel}>
                        {SNS_CHANNEL_NAME[channel]}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <Field label={t("admin.sns.form.followers")} error={errorText("followers")}>
                {(props) => <input {...props} className="input" type="text" inputMode="numeric" autoComplete="off" value={draft.followers} onChange={(event) => setField("followers", event.target.value)} />}
              </Field>
              <Field label={t("admin.sns.form.reach")} error={errorText("reach")}>
                {(props) => <input {...props} className="input" type="text" inputMode="numeric" autoComplete="off" value={draft.reach} onChange={(event) => setField("reach", event.target.value)} />}
              </Field>
              <Field label={t("admin.sns.form.engagement")} hint={t("admin.sns.form.engagementHint")} error={errorText("engagementPercent")}>
                {(props) => (
                  <input {...props} className="input" type="text" inputMode="decimal" autoComplete="off" value={draft.engagementPercent} onChange={(event) => setField("engagementPercent", event.target.value)} />
                )}
              </Field>
              <Field label={t("admin.sns.form.clicks")} error={errorText("linkClicks")}>
                {(props) => <input {...props} className="input" type="text" inputMode="numeric" autoComplete="off" value={draft.linkClicks} onChange={(event) => setField("linkClicks", event.target.value)} />}
              </Field>
            </div>
            <div className="adm-actions">
              <Button type="submit">{t("admin.sns.form.save")}</Button>
            </div>
          </form>
        </Section>

        <Section title={t("admin.sns.csv.title")}>
          <div className="card card--pad stack">
            <p className="adm-note">{t("admin.sns.csv.format")}</p>
            <label className="adm-file">
              <span className="field__label">{t("admin.sns.csv.pick")}</span>
              <input type="file" accept=".csv,text/csv" onChange={pickFile} />
            </label>
            <Field label={t("admin.sns.csv.paste")}>
              {(props) => <textarea {...props} className="textarea adm-textarea" rows={5} spellCheck={false} value={csvText} onChange={(event) => setCsvText(event.target.value)} />}
            </Field>
            <div className="adm-actions">
              <Button variant="secondary" onClick={() => importCsv(csvText)} disabled={csvText.trim() === ""}>
                {t("admin.sns.csv.import")}
              </Button>
              <Button variant="ghost" size="sm" onClick={downloadTemplate}>
                {t("admin.sns.csv.template")}
              </Button>
            </div>
            {csvFail ? <Banner tone="danger">{csvFail}</Banner> : null}
            {pending ? (
              <Banner tone="warning">
                <p>{t("admin.sns.csv.confirm", { n: pending.plan.replaced })}</p>
                <div className="adm-actions">
                  <Button size="sm" onClick={() => finishImport(pending.incoming)}>
                    {t("admin.sns.csv.confirmYes")}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setPending(null)}>
                    {t("admin.sns.cancel")}
                  </Button>
                </div>
              </Banner>
            ) : null}
            {csvReport && csvReport.errors.length > 0 ? (
              <Banner tone="danger">
                <p className="strong">{t("admin.sns.csv.issuesTitle", { n: csvReport.errors.length })}</p>
                {issueList(csvReport.errors)}
              </Banner>
            ) : null}
            {csvReport && csvReport.warnings.length > 0 ? (
              <Banner tone="warning">
                <p className="strong">{t("admin.sns.csv.warnTitle", { n: csvReport.warnings.length })}</p>
                {issueList(csvReport.warnings)}
              </Banner>
            ) : null}
          </div>
        </Section>
      </div>

      {rows.length > 0 ? (
        <Section title={t("admin.sns.rows.title")}>
          <div className="card card--pad">
            <div className="adm-scroll" role="region" aria-label={t("admin.sns.rows.title")} tabIndex={0}>
              <table className="table table--stack">
                <thead>
                  <tr>
                    <th scope="col">{t("admin.sns.rows.week")}</th>
                    <th scope="col">{t("admin.sns.compare.channel")}</th>
                    {SNS_METRICS.map((metric) => (
                      <th key={metric} scope="col" className="num">
                        {t(SNS_METRIC_LABEL[metric])}
                      </th>
                    ))}
                    <th scope="col">
                      <span className="sr-only">{t("admin.sns.rows.delete")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedDesc.map((row) => (
                    <tr key={`${row.weekStart}-${row.channel}`}>
                      <td className="nowrap">{formatDate(row.weekStart, locale)}</td>
                      <td data-label={t("admin.sns.compare.channel")}>{SNS_CHANNEL_NAME[row.channel]}</td>
                      {SNS_METRICS.map((metric) => (
                        <td key={metric} className="num" data-label={t(SNS_METRIC_LABEL[metric])}>
                          {formatSnsValue(metric, row[metric])}
                        </td>
                      ))}
                      <td data-label="">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRow(row)}
                          aria-label={t("admin.sns.rows.deleteLabel", { channel: SNS_CHANNEL_NAME[row.channel], week: weekText(row.weekStart) })}
                        >
                          {t("admin.sns.rows.delete")}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Section>
      ) : null}
    </>
  );
}
