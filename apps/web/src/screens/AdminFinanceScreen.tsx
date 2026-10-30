"use client";

// 운영자 화면 ③ 수지·자금 시뮬레이션 (/admin/finance/): 기마다의 가정(기업 수 · 성사율 · 수수료 · 비용 · 자금)을 넣으면
// 흑자 전환 시기 · 자금 잔액 · 손익분기 기업 수를 시산하고, 시나리오를 이름 붙여 여러 개 저장해서 두 개를 겹쳐 비교해요.
// 입력은 이 브라우저(localStorage)에만 저장하고 서버로 보내지 않아요. 숫자는 모두 사용자가 넣는 값이고, 내장된 것은 가상 샘플 하나뿐이에요.
// 계산은 core 의 adminFinance.ts, 문장은 adminFinanceText.ts. 모델의 가정과 한계는 화면 아래 "前提"와 docs/admin.md 에 있어요.
import {
  blankScenario,
  MAX_NAME_LENGTH,
  parseScenarioJson,
  sampleScenario,
  serializeScenarioJson,
  simulate,
  validateScenario,
  type FinanceIssue,
  type FinanceScenario,
} from "@sdgs-compass/core/adminFinance";
import { issueText } from "@sdgs-compass/core/adminFinanceText";
import type { MessageKey } from "@sdgs-compass/core/messages";
import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Banner, Button, Field, Section, Tag, type Tone } from "@/components/ui";
import { downloadTextFile, readTextFile } from "@/lib/adminFiles";
import { cloneScenario, copyName, newScenarioId, uniqueName } from "@/lib/adminFinanceView";
import { useAdmin } from "@/lib/adminSession";
import { browserSyncStorage, MAX_SCENARIOS, readAdminStore, updateAdminStore, type AdminStoreData, type StoredScenario } from "@/lib/adminStore";
import { AdminFinanceCompare } from "./AdminFinanceCompare";
import { AdminFinanceEditor, type ScenarioUpdate } from "./AdminFinanceEditor";
import { AdminFinanceResults } from "./AdminFinanceResults";
import { AdminFinanceSensitivity } from "./AdminFinanceSensitivity";

/** 가져오기 결과에 줄 단위로 보여 줄 최대 개수 (나머지는 "ほか○か所") */
const ISSUES_SHOWN = 10;

/** 이름 바꾸기 칸이 나타나면 바로 쓸 수 있게 포커스를 줘요 (함수가 매번 새로 만들어지지 않게 밖에 둬서, 그릴 때마다 포커스를 다시 가져오지 않아요) */
const focusOnMount = (element: HTMLInputElement | null): void => {
  element?.focus();
};

const ASSUME_KEYS = ["admin.finance.assume.1", "admin.finance.assume.2", "admin.finance.assume.3", "admin.finance.assume.4", "admin.finance.assume.5", "admin.finance.assume.6", "admin.finance.assume.7"] as const satisfies readonly MessageKey[];

export function AdminFinanceScreen() {
  const { t, locale, demo } = useAdmin();
  const [storage] = useState(() => browserSyncStorage());
  const [data, setData] = useState<AdminStoreData>(() => readAdminStore(storage));
  const [saveFailed, setSaveFailed] = useState(false);
  const [status, setStatus] = useState<{ text: string; tone: Tone } | null>(null);

  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [jsonText, setJsonText] = useState("");
  const [jsonIssues, setJsonIssues] = useState<FinanceIssue[] | null>(null);
  const [jsonFail, setJsonFail] = useState<string | null>(null);

  const scenarios = data.scenarios;
  const selected = scenarios.find((item) => item.id === data.selectedScenarioId) ?? null;
  const others = selected ? scenarios.filter((item) => item.id !== selected.id) : [];
  const result = useMemo(() => (selected ? simulate(selected.scenario) : null), [selected]);
  const names = (list: readonly StoredScenario[]): string[] => list.map((item) => item.scenario.name);
  const notify = (text: string, tone: Tone = "success") => setStatus({ text, tone });

  /** 저장 직전에 읽은 값을 기준으로 바꿔서 저장하고, 화면의 값도 그걸로 맞춰요 */
  const apply = (change: (fresh: AdminStoreData) => Partial<AdminStoreData>) => {
    const outcome = updateAdminStore(change, storage);
    setData(outcome.data);
    setSaveFailed(!outcome.ok);
  };

  const resetTransient = () => {
    setRenaming(null);
    setRenameError(null);
    setConfirmDelete(false);
  };

  // ───────── 시나리오 추가 · 선택 · 이름 · 삭제 ─────────
  /** 시나리오를 목록에 더하고 그걸 선택해요. 이름이 겹치면 (2) 를 붙여요. 상한이면 더하지 않고 알려요. 더했으면 최종 이름, 아니면 null */
  const addScenario = (scenario: FinanceScenario, sample: boolean): string | null => {
    if (scenarios.length >= MAX_SCENARIOS) {
      notify(t("admin.finance.scenario.limit", { max: MAX_SCENARIOS }), "warning");
      return null;
    }
    const name = uniqueName(scenario.name, names(scenarios));
    const id = newScenarioId(
      scenarios.map((item) => item.id),
      Date.now(),
    );
    apply((fresh) => (fresh.scenarios.length >= MAX_SCENARIOS ? {} : { scenarios: [...fresh.scenarios, { id, sample, scenario: { ...scenario, name } }], selectedScenarioId: id }));
    resetTransient();
    return name;
  };
  const addAndTell = (scenario: FinanceScenario, sample: boolean) => {
    const name = addScenario(scenario, sample);
    if (name !== null) notify(t("admin.finance.scenario.added", { name }));
  };
  const loadSample = () => addAndTell(sampleScenario(locale), true);
  const newBlank = () => addAndTell(blankScenario(t("admin.finance.scenario.blankName"), locale), false);
  const duplicate = () => {
    if (!selected) return;
    addAndTell({ ...cloneScenario(selected.scenario), name: copyName(selected.scenario.name, locale, names(scenarios)) }, selected.sample);
  };

  const select = (id: string) => {
    apply(() => ({ selectedScenarioId: id }));
    resetTransient();
    setStatus(null);
  };
  const pickCompare = (id: string | null) => apply(() => ({ compareScenarioId: id }));

  const startRename = () => {
    if (!selected) return;
    setConfirmDelete(false);
    setRenameError(null);
    setRenaming(selected.scenario.name);
  };
  const submitRename = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected || renaming === null) return;
    const name = renaming.trim();
    if (name === "" || name.length > MAX_NAME_LENGTH) {
      setRenameError(t("admin.finance.scenario.nameError", { max: MAX_NAME_LENGTH }));
      return;
    }
    if (scenarios.some((item) => item.id !== selected.id && item.scenario.name === name)) {
      setRenameError(t("admin.finance.scenario.nameTaken"));
      return;
    }
    const { id } = selected;
    apply((fresh) => ({ scenarios: fresh.scenarios.map((item) => (item.id === id ? { ...item, scenario: { ...item.scenario, name } } : item)) }));
    resetTransient();
    notify(t("admin.finance.scenario.renamed", { name }));
  };

  const removeSelected = () => {
    if (!selected) return;
    const { id } = selected;
    const { name } = selected.scenario;
    apply((fresh) => ({ scenarios: fresh.scenarios.filter((item) => item.id !== id) }));
    resetTransient();
    notify(t("admin.finance.scenario.deleted", { name }));
  };

  // ───────── 입력 고치기 ─────────
  /** 편집기가 넘긴 변경을 저장 직전에 읽은 시나리오에 적용해요. 저장 모양(validateScenario)을 통과하지 못하는 값은 저장하지 않아요(저장했다가 다시 열 때 사라지는 일이 없게) */
  const edit = (update: ScenarioUpdate) => {
    if (!selected) return;
    const { id } = selected;
    apply((fresh) => ({
      scenarios: fresh.scenarios.map((item) => {
        if (item.id !== id) return item;
        const next = update(item.scenario);
        return validateScenario(next).ok ? { ...item, sample: false, scenario: next } : item;
      }),
    }));
    setStatus(null);
  };

  // ───────── JSON ─────────
  const importJson = (text: string) => {
    setJsonFail(null);
    setStatus(null);
    const parsed = parseScenarioJson(text);
    if (!parsed.ok) {
      setJsonIssues(parsed.issues);
      return;
    }
    setJsonIssues(null);
    const name = addScenario(parsed.scenario, false);
    if (name === null) return;
    setJsonText("");
    notify(t("admin.finance.json.imported", { name }));
  };
  const pickFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;
    const read = await readTextFile(file);
    input.value = "";
    if (!read.ok) {
      setJsonIssues(null);
      setJsonFail(t(read.reason === "too_large" ? "admin.finance.json.tooLarge" : "admin.finance.json.readFail"));
      return;
    }
    importJson(read.text);
  };
  const exportJson = () => {
    if (!selected) return;
    downloadTextFile(`finance-scenario-${demo.today}.json`, serializeScenarioJson(selected.scenario), "application/json;charset=utf-8");
    notify(t("admin.finance.json.exported"));
  };
  const downloadExample = () => downloadTextFile("finance-scenario-example.json", serializeScenarioJson(sampleScenario(locale)), "application/json;charset=utf-8");

  const jsonSection = (
    <Section title={t("admin.finance.json.title")} hint={t("admin.finance.json.help")}>
      <div className="card card--pad stack">
        <label className="adm-file">
          <span className="field__label">{t("admin.finance.json.pick")}</span>
          <input type="file" accept=".json,application/json" onChange={pickFile} />
        </label>
        <Field label={t("admin.finance.json.paste")}>
          {(props) => <textarea {...props} className="textarea adm-textarea" rows={6} spellCheck={false} value={jsonText} onChange={(event) => setJsonText(event.target.value)} />}
        </Field>
        <div className="adm-actions">
          <Button variant="secondary" onClick={() => importJson(jsonText)} disabled={jsonText.trim() === ""}>
            {t("admin.finance.json.import")}
          </Button>
          <Button variant="secondary" onClick={exportJson} disabled={selected === null}>
            {t("admin.finance.json.export")}
          </Button>
          <Button variant="ghost" size="sm" onClick={downloadExample}>
            {t("admin.finance.json.example")}
          </Button>
        </div>
        {jsonFail ? <Banner tone="danger">{jsonFail}</Banner> : null}
        {jsonIssues ? (
          <Banner tone="danger">
            <p className="strong">{t("admin.finance.json.issuesTitle", { n: jsonIssues.length })}</p>
            <ul className="adm-issues">
              {jsonIssues.slice(0, ISSUES_SHOWN).map((issue, index) => (
                <li key={index}>{issueText(issue, locale)}</li>
              ))}
              {jsonIssues.length > ISSUES_SHOWN ? <li>{t("admin.finance.json.moreIssues", { n: jsonIssues.length - ISSUES_SHOWN })}</li> : null}
            </ul>
          </Banner>
        ) : null}
      </div>
    </Section>
  );

  return (
    <>
      <section className="adm-intro" aria-labelledby="adm-finance-title">
        <div className="adm-intro__title">
          <h1 id="adm-finance-title" className="adm-h1">
            {t("admin.finance.title")}
          </h1>
          {selected?.sample ? <Tag tone="warning">{t("admin.sampleBadge")}</Tag> : null}
        </div>
        <p className="adm-lead">{t("admin.finance.lead")}</p>
        <p className="adm-lead">{t("admin.finance.disclaimer")}</p>
        <p className="adm-meta">{t("admin.localOnly")}</p>
      </section>

      {storage.kind === "memory" ? <Banner tone="warning">{t("admin.storage.memoryOnly")}</Banner> : null}
      {saveFailed ? <Banner tone="warning">{t("admin.storage.failed")}</Banner> : null}
      {status ? <Banner tone={status.tone}>{status.text}</Banner> : null}

      {selected === null || result === null ? (
        <div className="card card--pad stack">
          <p className="strong">{t("admin.finance.empty.title")}</p>
          <p className="adm-note">{t("admin.finance.empty.body")}</p>
          <div className="adm-actions">
            <Button onClick={loadSample}>{t("admin.finance.scenario.loadSample")}</Button>
            <Button variant="secondary" onClick={newBlank}>
              {t("admin.finance.scenario.new")}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="card card--pad stack">
            <div className="adm-toolbar">
              <Field label={t("admin.finance.scenario.select")}>
                {(props) => (
                  <select {...props} className="select" value={selected.id} onChange={(event) => select(event.target.value)}>
                    {scenarios.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.scenario.name}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <div className="adm-actions">
                <Button variant="secondary" size="sm" onClick={duplicate}>
                  {t("admin.finance.scenario.duplicate")}
                </Button>
                <Button variant="secondary" size="sm" onClick={startRename}>
                  {t("admin.finance.scenario.rename")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setRenaming(null);
                    setConfirmDelete(true);
                  }}
                >
                  {t("admin.finance.scenario.delete")}
                </Button>
              </div>
            </div>
            <div className="adm-actions">
              <Button variant="secondary" size="sm" onClick={newBlank}>
                {t("admin.finance.scenario.new")}
              </Button>
              <Button variant="secondary" size="sm" onClick={loadSample}>
                {t("admin.finance.scenario.loadSample")}
              </Button>
              <span className="adm-meta">{t("admin.finance.scenario.count", { n: scenarios.length, max: MAX_SCENARIOS })}</span>
              <a className="adm-jump" href="#adm-finance-edit">
                {t("admin.finance.editJump")}
              </a>
            </div>
            {renaming !== null ? (
              <form className="adm-rename" onSubmit={submitRename} noValidate>
                <Field label={t("admin.finance.scenario.nameLabel")} error={renameError}>
                  {(props) => (
                    <input
                      {...props}
                      className="input"
                      type="text"
                      autoComplete="off"
                      ref={focusOnMount}
                      value={renaming}
                      onChange={(event) => {
                        setRenaming(event.target.value);
                        setRenameError(null);
                      }}
                    />
                  )}
                </Field>
                <div className="adm-actions">
                  <Button type="submit" size="sm">
                    {t("admin.finance.scenario.nameSave")}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={resetTransient}>
                    {t("admin.finance.cancel")}
                  </Button>
                </div>
              </form>
            ) : null}
            {confirmDelete ? (
              <Banner tone="warning">
                <p>{t("admin.finance.scenario.deleteConfirm", { name: selected.scenario.name })}</p>
                <div className="adm-actions">
                  <Button variant="danger" size="sm" onClick={removeSelected}>
                    {t("admin.finance.scenario.deleteYes")}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={resetTransient}>
                    {t("admin.finance.cancel")}
                  </Button>
                </div>
              </Banner>
            ) : null}
          </div>

          <AdminFinanceResults scenario={selected.scenario} result={result} />
          <AdminFinanceSensitivity scenario={selected.scenario} />
          <AdminFinanceCompare selected={selected} others={others} compareId={data.compareScenarioId} onPick={pickCompare} />
          <AdminFinanceEditor key={selected.id} scenario={selected.scenario} onEdit={edit} />
        </>
      )}

      {jsonSection}

      <Section title={t("admin.finance.assume.title")} hint={t("admin.finance.assume.lead")}>
        <div className="card card--pad">
          <ol className="adm-assume">
            {ASSUME_KEYS.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ol>
        </div>
      </Section>
    </>
  );
}
