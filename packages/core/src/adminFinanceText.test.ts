import { describe, expect, it } from "vitest";
import { parseScenarioJson, sampleScenario, simulate, validateScenario, FINANCE_FIELD_SPEC, type FinanceScenario } from "./adminFinance";
import { breakEvenSentence, compareSentence, fieldErrorText, financeSummary, issueText, monthText } from "./adminFinanceText";
import { translate } from "./messages";

// 손으로 계산할 수 있게 작게 만든 가상의 시나리오들 (실제 계획의 숫자가 아니에요)
const PERIOD = { projectsPerCompany: 0, matchRate: 0, feePerMatchYen: 0, donationRate: 0, adRevenuePerCompanyYen: 0, costOfRevenueYen: 0 };
const cost = (yen: number) => [{ label: "経費", yen }];

/** 처음부터 흑자: 기업 10곳 × 프로젝트 10 × 성사율 50% = 50건 × 1만 엔 = 연 50만 엔, 경비 연 12만 엔, 자기자금 100만 엔 */
const PROFITABLE: FinanceScenario = {
  schemaVersion: 1,
  name: "profitable",
  periods: [{ ...PERIOD, label: "第1期", companiesEnd: 10, projectsPerCompany: 10, matchRate: 0.5, feePerMatchYen: 10_000, costs: cost(120_000) }],
  startCompanies: 10,
  funding: { equityYen: 1_000_000, borrowingYen: 0, capexYen: 0, repaymentYenPerPeriod: 0 },
};

/** 매출이 없고 경비만 나가며, 시작할 때 이미 자금이 모자라요 (조달 0 < 비품 10만 엔) */
const STUCK: FinanceScenario = {
  schemaVersion: 1,
  name: "stuck",
  periods: [{ ...PERIOD, label: "第1期", companiesEnd: 0, costs: cost(1_200_000) }],
  startCompanies: 0,
  funding: { equityYen: 0, borrowingYen: 0, capexYen: 100_000, repaymentYenPerPeriod: 0 },
};

/** 1기는 매출 없이 경비 연 12만 엔, 2기에 기업이 0 → 12곳으로 늘며(광고 단가 10만 엔) 흑자로 돌아서요 */
const GROWING: FinanceScenario = {
  schemaVersion: 1,
  name: "growing",
  periods: [
    { ...PERIOD, label: "第1期", companiesEnd: 0, costs: cost(120_000) },
    { ...PERIOD, label: "第2期", companiesEnd: 12, adRevenuePerCompanyYen: 100_000, costs: cost(120_000) },
  ],
  startCompanies: 0,
  funding: { equityYen: 500_000, borrowingYen: 0, capexYen: 0, repaymentYenPerPeriod: 0 },
};

describe("수지 요약: 월 번호를 말로", () => {
  it("0 은 시작 시점, 그 뒤는 기 이름과 그 기의 몇 번째 달", () => {
    expect(monthText(GROWING, 0, "ja")).toBe("開始時点");
    expect(monthText(GROWING, 0, "ko")).toBe("시작 시점");
    expect(monthText(GROWING, 1, "ja")).toBe("第1期の1か月目");
    expect(monthText(GROWING, 13, "ja")).toBe("第2期の1か月目");
    expect(monthText(GROWING, 24, "ko")).toBe("第2期 12개월째");
  });

  it("기 이름은 시나리오에 적은 대로, 없는 기는 기본 이름", () => {
    const renamed: FinanceScenario = { ...GROWING, periods: [{ ...GROWING.periods[0], label: "FY2027" }, GROWING.periods[1]] };
    expect(monthText(renamed, 3, "ja")).toBe("FY2027の3か月目");
    expect(monthText(renamed, 30, "ja")).toBe("第3期の6か月目");
    expect(monthText(renamed, 30, "ko")).toBe("제3기 6개월째");
  });
});

describe("수지 요약: 문장 다섯 줄", () => {
  it("처음부터 흑자 (일본어)", () => {
    const lines = financeSummary(PROFITABLE, simulate(PROFITABLE), "ja");
    expect(lines).toEqual([
      "月次の経常利益は最初の月から黒字です。",
      "累計損益は最初の月からプラスです。",
      "資金は表示した期間（1期）を通して不足しません（最低残高は開始時点の100万円）。",
      "損益分岐の企業数：第1期 3社（その期の費用をまかなうのに必要な数。企業1社あたりの貢献利益が0円以下の期は「なし」）",
      "最後の月の累計損益は38万円、資金残高は138万円です。",
    ]);
  });

  it("처음부터 흑자 (한국어)", () => {
    const lines = financeSummary(PROFITABLE, simulate(PROFITABLE), "ko");
    expect(lines[0]).toBe("월 경상이익은 첫 달부터 흑자예요.");
    expect(lines[1]).toBe("누적 손익은 첫 달부터 플러스예요.");
    expect(lines[2]).toBe("자금은 표시한 기간(1기) 내내 모자라지 않아요(최저 잔액은 시작 시점의 100만 엔).");
    expect(lines[3]).toContain("第1期 3곳");
    expect(lines[4]).toBe("마지막 달의 누적 손익은 38만 엔, 자금 잔액은 138만 엔이에요.");
  });

  it("흑자 전환 없음 · 시작부터 자금 부족 · 손익분기 없음: '표시한 기간 안에서는'이라고 정직하게", () => {
    const lines = financeSummary(STUCK, simulate(STUCK), "ja");
    expect(lines[0]).toBe("表示した期間（1期）の中では、月次の経常利益は黒字に転換しません。");
    expect(lines[1]).toBe("表示した期間（1期）の中では、累計損益はプラスになりません。");
    expect(lines[2]).toBe("開始時点で資金が不足しています（調達額が初期の支出より少ないです）。");
    expect(lines[3]).toContain("第1期 なし");
    expect(lines[4]).toBe("最後の月の累計損益は-120万円、資金残高は-130万円です。");
    const ko = financeSummary(STUCK, simulate(STUCK), "ko");
    expect(ko[0]).toBe("표시한 기간(1기) 안에서는 월 경상이익이 흑자로 돌아서지 않아요.");
    expect(ko[2]).toBe("시작 시점부터 자금이 모자라요(조달액이 초기 지출보다 적어요).");
  });

  it("기업이 늘며 중간에 흑자로 돌아서는 경우: 전환·누적·최저 잔액의 때를 '第○期の○か月目'로", () => {
    const result = simulate(GROWING);
    // 2기 1개월째: 월 매출 약 1.5만 엔 > 월 경비 1만 엔 / 누적은 2기 5개월째에 플러스 / 자금이 가장 적은 때는 1기 12개월째(50만 − 12만 = 38만 엔)
    expect(result.milestones.profitTurnaroundMonth).toBe(13);
    expect(result.milestones.cumulativeBreakEvenMonth).toBe(17);
    expect(result.milestones.lowestCash).toEqual({ month: 12, yen: 380_000 });
    expect(financeSummary(GROWING, result, "ja")).toEqual([
      "月次の経常利益は第2期の1か月目ごろに黒字へ転換します。",
      "累計損益は第2期の5か月目ごろにプラスになります。",
      "資金は表示した期間（2期）を通して不足しません（最低残高は第1期の12か月目の38万円）。",
      "損益分岐の企業数：第1期 なし・第2期 2社（その期の費用をまかなうのに必要な数。企業1社あたりの貢献利益が0円以下の期は「なし」）",
      "最後の月の累計損益は96万円、資金残高は146万円です。",
    ]);
    expect(financeSummary(GROWING, result, "ko")[0]).toBe("월 경상이익은 第2期 1개월째 무렵 흑자로 돌아서요.");
  });

  it("자금이 중간에 모자라는 경우", () => {
    // 자기자금이 10만 엔뿐이면 1기의 경비(월 1만 엔)로 11개월째에 잔액이 0 미만이 돼요
    const tight: FinanceScenario = { ...GROWING, funding: { equityYen: 100_000, borrowingYen: 0, capexYen: 0, repaymentYenPerPeriod: 0 } };
    const result = simulate(tight);
    expect(result.milestones.cashShortMonth).toBe(11);
    const ja = financeSummary(tight, result, "ja")[2];
    expect(ja).toBe("資金は第1期の11か月目に不足します。");
    expect(financeSummary(tight, result, "ko")[2]).toBe("자금은 第1期 11개월째에 모자라게 돼요.");
  });

  it("손익분기 기업 수는 올림해서 쉼표와 함께, 기마다", () => {
    const sentence = breakEvenSentence(GROWING, simulate(GROWING), "ko");
    expect(sentence).toContain("第1期 없음·第2期 2곳");
    // 샘플 시나리오(가상)도 세 기가 모두 나와요
    const sample = sampleScenario("ja");
    const text = breakEvenSentence(sample, simulate(sample), "ja");
    for (const period of sample.periods) expect(text).toContain(period.label);
  });

  it("겹쳐 비교용 한 줄: 흑자 전환 + 자금", () => {
    const line = compareSentence(GROWING, simulate(GROWING), "ja");
    expect(line).toBe("月次の経常利益は第2期の1か月目ごろに黒字へ転換します。資金は表示した期間（2期）を通して不足しません（最低残高は第1期の12か月目の38万円）。");
    expect(compareSentence(GROWING, simulate(GROWING), "ko")).toContain("흑자로 돌아서요. 자금은");
  });

  it("샘플 시나리오(가상): 문장에 undefined·NaN 이 섞이지 않아요", () => {
    for (const locale of ["ja", "ko"] as const) {
      const sample = sampleScenario(locale);
      for (const line of financeSummary(sample, simulate(sample), locale)) {
        expect(line).not.toMatch(/undefined|NaN|\{|\}/);
        expect(line.length).toBeGreaterThan(10);
      }
    }
  });
});

describe("오류 문구", () => {
  it("JSON 으로 읽을 수 없을 때: 위치는 'JSON 전체'", () => {
    const result = parseScenarioJson("{");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(issueText(result.issues[0], "ja")).toBe("JSON全体：JSONとして読み取れません（かっこ・カンマ・引用符を確認してください）");
    expect(issueText(result.issues[0], "ko")).toBe("JSON 전체: JSON으로 읽을 수 없어요(괄호·쉼표·따옴표를 확인해 주세요)");
  });

  it("틀린 곳은 JSON 경로 그대로 + 이유를 말로 (범위·정수·필수 키)", () => {
    const bad = JSON.parse(JSON.stringify(PROFITABLE)) as Record<string, unknown>;
    const period = (bad.periods as Record<string, unknown>[])[0];
    period.matchRate = 1.5;
    period.companiesEnd = 2.5;
    delete period.feePerMatchYen;
    const result = validateScenario(bad);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const texts = result.issues.map((issue) => issueText(issue, "ja"));
    expect(texts).toContain("periods[0].matchRate：0以上1以下で指定してください");
    expect(texts).toContain("periods[0].companiesEnd：整数で指定してください");
    expect(texts).toContain("periods[0].feePerMatchYen：必須の項目がありません");
    const ko = result.issues.map((issue) => issueText(issue, "ko"));
    expect(ko).toContain("periods[0].matchRate: 0 이상 1 이하로 지정해 주세요");
  });

  it("기 개수·경비 행 수·schemaVersion", () => {
    const none = validateScenario({ ...PROFITABLE, periods: [] });
    expect(none.ok).toBe(false);
    if (!none.ok) expect(issueText(none.issues[0], "ja")).toBe("periods：期は1〜5個にしてください");
    const version = validateScenario({ ...PROFITABLE, schemaVersion: 2 });
    expect(version.ok).toBe(false);
    if (!version.ok) expect(issueText(version.issues[0], "ko")).toBe("schemaVersion: schemaVersion은 1이어야 해요");
  });

  it("모든 오류 코드에 두 언어 문구가 있어요 (자리표시자가 남지 않아요)", () => {
    const codes = ["not_json", "not_object", "schema_version", "missing", "not_number", "not_integer", "out_of_range", "not_string", "empty_string", "too_long", "not_array", "periods_count", "too_many_costs"] as const;
    for (const code of codes) {
      for (const locale of ["ja", "ko"] as const) {
        const text = issueText({ code, path: "periods[0].x", min: 0, max: 5 }, locale);
        expect(text, `${code} ${locale}`).not.toMatch(/[{}]/);
        expect(text.length).toBeGreaterThan(8);
      }
    }
  });

  it("입력 칸의 오류: 범위는 칸의 규칙에서", () => {
    expect(fieldErrorText("empty", FINANCE_FIELD_SPEC.matchRate, "ja")).toBe("入力してください");
    expect(fieldErrorText("not_number", FINANCE_FIELD_SPEC.matchRate, "ko")).toBe("숫자로 입력해 주세요");
    expect(fieldErrorText("not_integer", FINANCE_FIELD_SPEC.companiesEnd, "ja")).toBe("整数で入力してください");
    expect(fieldErrorText("out_of_range", { min: 0, max: 100 }, "ja")).toBe("0〜100の範囲で入力してください");
    expect(fieldErrorText("out_of_range", FINANCE_FIELD_SPEC.feePerMatchYen, "ko")).toBe("0~1,000,000,000,000 범위로 입력해 주세요");
  });

  it("문구 사전에서 만든 문장이 사전과 같아요", () => {
    expect(translate("admin.finance.disclaimer", "ja")).toBe("計画検討用の試算です。投資判断や保証ではありません。");
  });
});
