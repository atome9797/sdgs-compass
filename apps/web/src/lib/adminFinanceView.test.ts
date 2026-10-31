import { describe, expect, it } from "vitest";
import { blankScenario, MAX_NAME_LENGTH, sampleScenario, simulate, type FinanceScenario } from "@sdgs-compass/core/adminFinance";
import {
  annualRows,
  cloneScenario,
  copyName,
  FINANCE_METRICS,
  FINANCE_METRIC_LABEL,
  financeMarkers,
  formatDecimal,
  isMoneyMetric,
  metricValues,
  monthAxis,
  newScenarioId,
  padValues,
  periodColumns,
  plainMonthAxis,
  uniqueName,
} from "./adminFinanceView";

// 손으로 계산하기 쉬운 가상의 시나리오들 (실제 계획과 무관해요)
/** 1기, 기업 10곳으로 계속: 매출 6万, 매출원가 6천, 경비 1.2万 → 이익 4.2万, 월 이익 3,500 (첫 달부터 흑자) */
const STEADY: FinanceScenario = {
  schemaVersion: 1,
  name: "安定",
  periods: [
    {
      label: "第1期",
      companiesEnd: 10,
      projectsPerCompany: 10,
      matchRate: 0.1,
      feePerMatchYen: 10000,
      donationRate: 0.5,
      adRevenuePerCompanyYen: 1000,
      costOfRevenueYen: 6000,
      costs: [{ label: "経費", yen: 12000 }],
    },
  ],
  startCompanies: 10,
  funding: { equityYen: 1_000_000, borrowingYen: 0, capexYen: 0, repaymentYenPerPeriod: 0 },
};

/** 기업 0곳, 경비만 연 12万: 매월 -1万, 자기자금 5万이면 6개월째에 모자라요. 흑자 전환도 손익분기도 없음 */
const STUCK: FinanceScenario = {
  schemaVersion: 1,
  name: "赤字",
  periods: [
    {
      label: "第1期",
      companiesEnd: 0,
      projectsPerCompany: 0,
      matchRate: 0,
      feePerMatchYen: 0,
      donationRate: 0,
      adRevenuePerCompanyYen: 0,
      costOfRevenueYen: 0,
      costs: [{ label: "経費", yen: 120000 }],
    },
  ],
  startCompanies: 0,
  funding: { equityYen: 50000, borrowingYen: 0, capexYen: 0, repaymentYenPerPeriod: 0 },
};

/**
 * 기업이 0 → 12곳으로 매달 1곳씩 늘어요(월 매출 = 1,000 × n, 경비 월 6,000).
 * 월 이익 = 1,000n - 6,000 → 6개월째에 0 이상, 누적은 11개월째에 0, 자기자금 1万이면 3개월째에 모자라요.
 */
const GROWING: FinanceScenario = {
  schemaVersion: 1,
  name: "成長",
  periods: [
    {
      label: "第1期",
      companiesEnd: 12,
      projectsPerCompany: 0,
      matchRate: 0,
      feePerMatchYen: 0,
      donationRate: 0,
      adRevenuePerCompanyYen: 6500,
      costOfRevenueYen: 0,
      costs: [{ label: "経費", yen: 72000 }],
    },
  ],
  startCompanies: 0,
  funding: { equityYen: 10000, borrowingYen: 0, capexYen: 0, repaymentYenPerPeriod: 0 },
};

describe("월 가로축", () => {
  it("monthAxis: 시작 + 12×기 수 개, 짧은 이름표와 긴 이름(기 이름 · 시작 후 개월)", () => {
    const scenario = sampleScenario("ja");
    const axis = monthAxis(scenario, "ja");
    expect(axis.labels).toHaveLength(37);
    expect(axis.titles).toHaveLength(37);
    expect(axis.labels[0]).toBe("開始");
    expect(axis.labels[1]).toBe("1か月");
    expect(axis.labels[36]).toBe("36か月");
    expect(axis.titles[0]).toBe("開始時点");
    expect(axis.titles[1]).toBe("第1期の1か月目（開始から1か月）");
    expect(axis.titles[13]).toBe("第2期の1か月目（開始から13か月）");
    expect(axis.titles[36]).toBe("第3期の12か月目（開始から36か月）");
  });

  it("monthAxis: ko, 입력한 기 이름을 그대로 써요", () => {
    const scenario = { ...STEADY, periods: [{ ...STEADY.periods[0], label: "FY2027" }] };
    const axis = monthAxis(scenario, "ko");
    expect(axis.labels.slice(0, 2)).toEqual(["시작", "1개월"]);
    expect(axis.titles[0]).toBe("시작 시점");
    expect(axis.titles[12]).toBe("FY2027 12개월째(시작 후 12개월)");
  });

  it("plainMonthAxis: 기 이름 없이 시작 후 개월 수만 (두 시나리오의 기 이름이 달라도 틀리지 않게)", () => {
    const axis = plainMonthAxis(2, "ja");
    expect(axis.labels).toHaveLength(25);
    expect(axis.titles[0]).toBe("開始時点");
    expect(axis.titles[13]).toBe("開始から13か月");
    expect(plainMonthAxis(1, "ko").titles[12]).toBe("시작 후 12개월");
  });
});

describe("월별 값", () => {
  it("metricValues: 길이는 12×기 수 + 1, 0번은 시작 시점", () => {
    const result = simulate(GROWING);
    for (const metric of FINANCE_METRICS) expect(metricValues(result, metric), metric).toHaveLength(13);
    const companies = metricValues(result, "companies");
    expect(companies[0]).toBe(0);
    expect(companies[1]).toBeCloseTo(1, 9);
    expect(companies[12]).toBe(12);
    const monthly = metricValues(result, "monthlyProfit");
    expect(monthly[0]).toBeNull();
    expect(monthly[1]).toBeCloseTo(-5000, 6);
    expect(monthly[6]).toBeCloseTo(0, 6);
    expect(monthly[12]).toBeCloseTo(6000, 6);
    const cumulative = metricValues(result, "cumulativeProfit");
    expect(cumulative[0]).toBe(0);
    expect(cumulative[12]).toBeCloseTo(6000, 6);
    const cash = metricValues(result, "cash");
    expect(cash[0]).toBe(10000);
    expect(cash[12]).toBeCloseTo(16000, 6);
    expect(cash[12]).toBe(result.finalCashYen);
  });

  it("값 이름표와 돈 여부", () => {
    expect(FINANCE_METRICS.map((metric) => FINANCE_METRIC_LABEL[metric])).toEqual([
      "admin.finance.series.cumulative",
      "admin.finance.series.cash",
      "admin.finance.series.monthlyProfit",
      "admin.finance.series.companies",
      "admin.finance.series.cumulativeReturn",
    ]);
    expect(FINANCE_METRICS.filter(isMoneyMetric)).toEqual(["cumulativeProfit", "cash", "monthlyProfit", "cumulativeReturn"]);
  });

  it("metricValues(cumulativeReturn): 0번은 0, 환원은 기의 마지막 달에 한 번에 더해져요 (규칙이 꺼져 있으면 모두 0)", () => {
    // STEADY + 3개월분: 운전자금 = 3 × (경비 12,000 + 매출원가 6,000) / 12 = 4,500, 기말 자금(환원 전) 1,042,000 → 이익 42,000 전액 환원
    const result = simulate({ ...STEADY, studentReturn: { reserveMonths: 3 } });
    const returned = metricValues(result, "cumulativeReturn");
    expect(returned).toHaveLength(13);
    expect(returned[0]).toBe(0);
    expect(returned.slice(1, 12).every((value) => value === 0)).toBe(true);
    expect(returned[12]).toBeCloseTo(42000, 6);
    // 자금 잔액은 환원을 뺀 값 (누적 손익은 그대로)
    expect(metricValues(result, "cash")[12]).toBeCloseTo(1_000_000, 6);
    expect(metricValues(result, "cumulativeProfit")[12]).toBeCloseTo(42000, 6);
    expect(metricValues(simulate(STEADY), "cumulativeReturn").every((value) => value === 0)).toBe(true);
  });

  it("padValues: 모자라면 끝을 null 로 채우고, 넘치면 잘라요", () => {
    expect(padValues([1, 2, 3], 5)).toEqual([1, 2, 3, null, null]);
    expect(padValues([0, null, 3], 3)).toEqual([0, null, 3]);
    expect(padValues([1, 2, 3], 2)).toEqual([1, 2]);
    expect(padValues([], 2)).toEqual([null, null]);
  });
});

describe("표시선", () => {
  it("흑자 전환(6개월째)과 자금 부족(3개월째)을 월 번호 위치에 둬요", () => {
    const result = simulate(GROWING);
    expect(result.milestones.profitTurnaroundMonth).toBe(6);
    expect(result.milestones.cashShortMonth).toBe(3);
    expect(financeMarkers(result, "ja")).toEqual([
      { index: 6, label: "黒字転換" },
      { index: 3, label: "資金不足" },
    ]);
    expect(financeMarkers(result, "ko").map((marker) => marker.label)).toEqual(["흑자 전환", "자금 부족"]);
  });

  it("kinds 로 한 종류만 고를 수 있어요 (월 경상이익 그래프에는 흑자 전환만)", () => {
    const result = simulate(GROWING);
    expect(financeMarkers(result, "ja", ["turnaround"])).toEqual([{ index: 6, label: "黒字転換" }]);
    expect(financeMarkers(result, "ja", ["cashShort"])).toEqual([{ index: 3, label: "資金不足" }]);
    expect(financeMarkers(result, "ja", [])).toEqual([]);
  });

  it("첫 달부터 흑자이고 자금이 모자라지 않으면 표시선이 없어요", () => {
    const result = simulate(STEADY);
    expect(result.milestones.profitTurnaroundMonth).toBe(1);
    expect(result.milestones.cashShortMonth).toBeNull();
    expect(financeMarkers(result, "ja")).toEqual([]);
  });

  it("흑자 전환이 없으면 그 표시선만 빠져요 (자금 부족은 6개월째)", () => {
    const result = simulate(STUCK);
    expect(result.milestones.profitTurnaroundMonth).toBeNull();
    expect(financeMarkers(result, "ja")).toEqual([{ index: 6, label: "資金不足" }]);
  });

  it("시작 시점부터 자금이 모자라면 0번 위치", () => {
    const result = simulate({ ...STUCK, funding: { ...STUCK.funding, equityYen: 0, capexYen: 100 } });
    expect(result.milestones.cashShortMonth).toBe(0);
    expect(financeMarkers(result, "ja")).toEqual([{ index: 0, label: "資金不足" }]);
  });

  it("학생 환원의 시작: 첫 환원 기의 마지막 달 위치 (월 경상이익 그래프에는 그리지 않아요)", () => {
    const result = simulate({ ...STEADY, studentReturn: { reserveMonths: 3 } });
    expect(financeMarkers(result, "ja")).toEqual([{ index: 12, label: "還元開始" }]);
    expect(financeMarkers(result, "ko")).toEqual([{ index: 12, label: "환원 시작" }]);
    expect(financeMarkers(result, "ja", ["turnaround"])).toEqual([]);
    // 3기 샘플: 셋째 기에 처음 환원 → 36개월째
    expect(financeMarkers(simulate(sampleScenario("ja")), "ja", ["studentReturn"])).toEqual([{ index: 36, label: "還元開始" }]);
  });

  it("환원이 없으면 그 표시선도 없어요 (GROWING: 기말 자금 16,000 < 운전자금 18,000 / 0개월분이면 6,000 환원)", () => {
    const short = simulate({ ...GROWING, studentReturn: { reserveMonths: 3 } });
    expect(short.studentReturn?.firstPeriodIndex).toBeNull();
    expect(financeMarkers(short, "ja")).toEqual([
      { index: 6, label: "黒字転換" },
      { index: 3, label: "資金不足" },
    ]);
    const noReserve = simulate({ ...GROWING, studentReturn: { reserveMonths: 0 } });
    expect(noReserve.studentReturn?.totalYen).toBeCloseTo(6000, 6);
    expect(financeMarkers(noReserve, "ja", ["studentReturn"])).toEqual([{ index: 12, label: "還元開始" }]);
  });
});

describe("기별 그래프 · 연간 표", () => {
  it("periodColumns: 비용은 매출원가 + 경비", () => {
    const columns = periodColumns(simulate(STEADY));
    expect(columns.categories).toEqual(["第1期"]);
    expect(columns.sales).toEqual([60000]);
    expect(columns.cost).toEqual([18000]);
    expect(columns.profit).toEqual([42000]);
    // 학생 환원 규칙이 꺼져 있으면 막대를 그리지 않아요
    expect(columns.studentReturn).toBeNull();
    expect(periodColumns(simulate({ ...STEADY, studentReturn: { reserveMonths: 3 } })).studentReturn).toEqual([42000]);
  });

  it("annualRows: 손으로 계산한 값 (건수 10 · 수수료 매출 5万 · 광고 1万 · 이익 4.2万 · 손익분기 3곳)", () => {
    const rows = annualRows(simulate(STEADY));
    const byId = Object.fromEntries(rows.map((row) => [row.id, row]));
    expect(rows.map((row) => row.id)).toEqual(["companies", "matches", "fee", "ad", "sales", "cogs", "costs", "profit", "donation", "breakEven"]);
    expect(byId.companies.values).toEqual([10]);
    expect(byId.matches.values).toEqual([10]);
    expect(byId.fee.values).toEqual([50000]);
    expect(byId.ad.values).toEqual([10000]);
    expect(byId.sales.values).toEqual([60000]);
    expect(byId.cogs.values).toEqual([6000]);
    expect(byId.costs.values).toEqual([12000]);
    expect(byId.profit.values).toEqual([42000]);
    expect(byId.donation.values).toEqual([50000]);
    expect(byId.breakEven.values).toEqual([3]);
    // 합계: 더해서 뜻이 있는 행만
    expect(byId.companies.total).toBeNull();
    expect(byId.breakEven.total).toBeNull();
    expect(byId.matches.total).toBe(10);
    expect(byId.sales.total).toBe(60000);
    expect(byId.profit.total).toBe(42000);
    expect(rows.filter((row) => row.strong).map((row) => row.id)).toEqual(["sales", "profit"]);
    expect(rows.filter((row) => row.kind === "count").map((row) => row.id)).toEqual(["companies", "matches", "breakEven"]);
  });

  it("annualRows: 합계는 계산 결과의 totals 와 같고, 공헌이익이 없는 기의 손익분기는 null", () => {
    const sample = simulate(sampleScenario("ja"));
    const rows = annualRows(sample);
    expect(rows.find((row) => row.id === "sales")?.total).toBeCloseTo(sample.totals.salesYen, 6);
    expect(rows.find((row) => row.id === "profit")?.total).toBeCloseTo(sample.totals.profitYen, 6);
    expect(rows.every((row) => row.values.length === 3)).toBe(true);
    expect(annualRows(simulate(STUCK)).find((row) => row.id === "breakEven")?.values).toEqual([null]);
  });

  it("annualRows: 학생 환원을 켜면 이익 다음에 기말 자금(환원 전) · 남길 운전자금(N개월분) · 환원액", () => {
    const rows = annualRows(simulate({ ...STEADY, studentReturn: { reserveMonths: 3 } }));
    const byId = Object.fromEntries(rows.map((row) => [row.id, row]));
    expect(rows.map((row) => row.id)).toEqual(["companies", "matches", "fee", "ad", "sales", "cogs", "costs", "profit", "cashBeforeReturn", "returnReserve", "studentReturn", "donation", "breakEven"]);
    expect(byId.cashBeforeReturn.values).toEqual([1_042_000]);
    expect(byId.returnReserve.values).toEqual([4500]);
    expect(byId.returnReserve.labelParams).toEqual({ months: 3 });
    expect(byId.studentReturn.label).toBe("admin.finance.annual.studentReturn");
    expect(byId.studentReturn.values).toEqual([42000]);
    // 합계는 환원액만 (자금·운전자금은 기말의 잔고라 더하지 않아요)
    expect(byId.studentReturn.total).toBe(42000);
    expect(byId.cashBeforeReturn.total).toBeNull();
    expect(byId.returnReserve.total).toBeNull();
    expect(rows.filter((row) => row.strong).map((row) => row.id)).toEqual(["sales", "profit", "studentReturn"]);
    expect(rows.filter((row) => row.kind === "money").map((row) => row.id)).toContain("studentReturn");
  });

  it("annualRows: 샘플(켜짐, 3개월분)은 셋째 기에만 환원하고 합계는 totals 와 같아요 / 끄면 세 줄이 없어요", () => {
    const sample = simulate(sampleScenario("ja"));
    const row = annualRows(sample).find((item) => item.id === "studentReturn");
    expect(row?.values).toEqual([0, 0, 1_180_000]);
    expect(row?.total).toBe(sample.totals.studentReturnYen);
    const ids = annualRows(simulate({ ...sampleScenario("ja"), studentReturn: undefined })).map((item) => item.id);
    expect(ids).not.toContain("studentReturn");
    expect(ids).not.toContain("cashBeforeReturn");
    expect(ids).not.toContain("returnReserve");
  });
});

describe("이름 · 번호", () => {
  it("uniqueName: 겹치지 않으면 그대로, 겹치면 (2) (3) 순서로", () => {
    expect(uniqueName("提出版", [])).toBe("提出版");
    expect(uniqueName("提出版", ["修正"])).toBe("提出版");
    expect(uniqueName("提出版", ["提出版"])).toBe("提出版 (2)");
    expect(uniqueName("提出版", ["提出版", "提出版 (2)"])).toBe("提出版 (3)");
    expect(uniqueName("  提出版  ", ["提出版"])).toBe("提出版 (2)");
  });

  it("uniqueName: 최대 길이(60자)를 넘기지 않고 이모지를 반으로 가르지 않아요", () => {
    const long = "あ".repeat(80);
    expect(uniqueName(long, []).length).toBe(MAX_NAME_LENGTH);
    const clipped = uniqueName(long, ["あ".repeat(MAX_NAME_LENGTH)]);
    expect(clipped.length).toBeLessThanOrEqual(MAX_NAME_LENGTH);
    expect(clipped.endsWith(" (2)")).toBe(true);
    const emoji = uniqueName("🌱".repeat(40), []);
    expect(emoji.length).toBeLessThanOrEqual(MAX_NAME_LENGTH);
    expect([...emoji].every((char) => char === "🌱")).toBe(true);
  });

  it("copyName: 복사본 표시를 붙이고, 긴 이름은 앞을 줄여서 표시가 잘리지 않아요", () => {
    expect(copyName("提出版", "ja", [])).toBe("提出版（コピー）");
    expect(copyName("제출본", "ko", [])).toBe("제출본(복사본)");
    expect(copyName("提出版", "ja", ["提出版（コピー）"])).toBe("提出版（コピー） (2)");
    const copy = copyName("あ".repeat(MAX_NAME_LENGTH), "ja", []);
    expect(copy.length).toBe(MAX_NAME_LENGTH);
    expect(copy.endsWith("（コピー）")).toBe(true);
  });

  it("newScenarioId: 같은 시각에 만들어도 겹치지 않아요", () => {
    const base = `s${(1_000_000).toString(36)}`;
    expect(newScenarioId([], 1_000_000)).toBe(base);
    expect(newScenarioId([base], 1_000_000)).toBe(`${base}-1`);
    expect(newScenarioId([base, `${base}-1`], 1_000_000)).toBe(`${base}-2`);
    expect(newScenarioId(["other"], 1_000_000.9)).toBe(base);
  });

  it("빈 시나리오로도 계산·가로축이 깨지지 않아요", () => {
    const blank = blankScenario("空", "ja");
    const result = simulate(blank);
    expect(monthAxis(blank, "ja").labels).toHaveLength(37);
    for (const metric of FINANCE_METRICS) expect(metricValues(result, metric)).toHaveLength(37);
    expect(annualRows(result).every((row) => row.values.length === 3)).toBe(true);
  });
});

describe("복사 · 숫자 표기", () => {
  it("cloneScenario: 값은 같고 객체는 따로예요 (복사본을 고쳐도 원본이 바뀌지 않아요)", () => {
    const original = sampleScenario("ja");
    const copy = cloneScenario(original);
    expect(copy).toEqual(original);
    expect(copy).not.toBe(original);
    expect(copy.periods[0]).not.toBe(original.periods[0]);
    expect(copy.periods[0].costs[0]).not.toBe(original.periods[0].costs[0]);
    expect(copy.funding).not.toBe(original.funding);
    copy.periods[0].costs[0].yen = 1;
    copy.periods[0].label = "変更";
    copy.funding.equityYen = 7;
    expect(original.periods[0].costs[0].yen).toBe(2400000);
    expect(original.periods[0].label).toBe("第1期");
    expect(original.funding.equityYen).toBe(3000000);
  });

  it("cloneScenario: 학생 환원도 따로 복사하고, 꺼진 시나리오에는 항목을 만들지 않아요", () => {
    const original = sampleScenario("ja");
    expect(original.studentReturn).toEqual({ reserveMonths: 3 });
    const copy = cloneScenario(original);
    expect(copy.studentReturn).toEqual({ reserveMonths: 3 });
    expect(copy.studentReturn).not.toBe(original.studentReturn);
    if (copy.studentReturn) copy.studentReturn.reserveMonths = 6;
    expect(original.studentReturn?.reserveMonths).toBe(3);
    const off = cloneScenario(STEADY);
    expect("studentReturn" in off).toBe(false);
    expect(off).toEqual(STEADY);
  });

  it("formatDecimal: 소수 첫째 자리까지, 필요 없는 0 은 빼요", () => {
    expect(formatDecimal(3.5)).toBe("3.5");
    expect(formatDecimal(12)).toBe("12");
    expect(formatDecimal(12.04)).toBe("12");
    expect(formatDecimal(1234.56)).toBe("1,234.6");
    expect(formatDecimal(0)).toBe("0");
    expect(formatDecimal(2.25)).toBe("2.3");
    expect(formatDecimal(-2.26)).toBe("-2.3");
    expect(formatDecimal(-0.04)).toBe("0");
    expect(formatDecimal(Number.NaN)).toBe("-");
  });
});
