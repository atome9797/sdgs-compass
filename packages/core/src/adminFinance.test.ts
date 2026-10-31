import { describe, expect, it } from "vitest";
import {
  addPeriod,
  annualMatches,
  blankScenario,
  ceilCompanies,
  DEFAULT_RESERVE_MONTHS,
  evaluatePeriod,
  FINANCE_FIELD_SPEC,
  laborCostYen,
  MAX_COST_ROWS,
  MAX_JSON_LENGTH,
  MAX_PERIODS,
  monthPosition,
  numberToFieldText,
  parseFieldNumber,
  parseFieldPercent,
  parseScenarioJson,
  periodReturnYen,
  ratioToPercentText,
  removePeriod,
  returnReserveYen,
  roundHalfUp,
  sampleScenario,
  scaleScenario,
  sensitivity,
  SENSITIVITY_FACTORS,
  serializeScenarioJson,
  simulate,
  validateScenario,
  withStudentReturn,
  type FinancePeriod,
  type FinanceScenario,
} from "./adminFinance";

const AD_UNIT = 1_000_000 / 18;

/** 가상의 숫자지만 제출 계획서와 같은 구조(기말 기업 수로 연 합계 · 정수 반올림한 매칭 건수 · 소수 광고 단가)를 가진 시나리오 */
function structureScenario(extraCostPerYear = 0): FinanceScenario {
  const period = (label: string, companiesEnd: number, costs: number): FinancePeriod => ({
    label,
    companiesEnd,
    projectsPerCompany: 14,
    matchRate: 0.09,
    feePerMatchYen: 26000,
    donationRate: 0.5,
    adRevenuePerCompanyYen: AD_UNIT,
    costOfRevenueYen: 0,
    costs: [{ label: "人件費", yen: costs - 600_000 }, { label: "その他", yen: 600_000 }, ...(extraCostPerYear > 0 ? [{ label: "追加", yen: extraCostPerYear }] : [])],
  });
  return {
    schemaVersion: 1,
    name: "structure",
    periods: [period("1", 18, 2_800_000), period("2", 47, 4_100_000), period("3", 111, 6_000_000)],
    startCompanies: 0,
    funding: { equityYen: 2_000_000, borrowingYen: 3_000_000, capexYen: 500_000, repaymentYenPerPeriod: 0 },
  };
}

/** 한 기만 있는 단순한 시나리오 (경계 시험의 바탕) */
function simple(overrides: Partial<FinancePeriod> = {}, funding: Partial<FinanceScenario["funding"]> = {}, startCompanies = 0): FinanceScenario {
  return {
    schemaVersion: 1,
    name: "simple",
    periods: [
      {
        label: "1",
        companiesEnd: 20,
        projectsPerCompany: 12,
        matchRate: 0.1,
        feePerMatchYen: 30000,
        donationRate: 0,
        adRevenuePerCompanyYen: 50000,
        costOfRevenueYen: 0,
        costs: [{ label: "経費", yen: 600_000 }],
        ...overrides,
      },
    ],
    startCompanies,
    funding: { equityYen: 0, borrowingYen: 0, capexYen: 0, repaymentYenPerPeriod: 0, ...funding },
  };
}

describe("반올림 (엑셀 ROUND 처럼 .5 는 올림)", () => {
  it("roundHalfUp", () => {
    expect(roundHalfUp(54.4)).toBe(54);
    expect(roundHalfUp(54.5)).toBe(55);
    expect(roundHalfUp(54.6)).toBe(55);
    expect(roundHalfUp(0)).toBe(0);
    expect(roundHalfUp(0.49999)).toBe(0);
    expect(roundHalfUp(0.5)).toBe(1);
    expect(roundHalfUp(-2.5)).toBe(-3);
    expect(roundHalfUp(Number.NaN)).toBe(0);
  });

  it("annualMatches: .4 는 내림, .5 는 올림 (부동소수 꼬리에도 흔들리지 않아요)", () => {
    expect(annualMatches(18, 14, 0.09)).toBe(23); // 22.68
    expect(annualMatches(47, 14, 0.09)).toBe(59); // 59.22
    expect(annualMatches(25, 10, 0.07)).toBe(18); // 17.5
    expect(annualMatches(5, 10, 0.05)).toBe(3); // 2.5
    expect(annualMatches(10, 1, 0.35)).toBe(4); // 3.5 (0.35 * 10 은 3.4999999999999996 로 계산돼요)
    expect(annualMatches(35, 10, 0.01)).toBe(4); // 3.5
    expect(annualMatches(54, 10, 0.1)).toBe(54);
    expect(annualMatches(0, 20, 0.5)).toBe(0);
    expect(annualMatches(100, 20, 0)).toBe(0);
  });
});

describe("연 합계 (구조 재현)", () => {
  const result = simulate(structureScenario());

  it("매칭 건수는 정수, 수수료 매출은 건수 × 수수료 × (1 − 기부 비율)", () => {
    expect(result.periods.map((p) => p.matches)).toEqual([23, 59, 140]);
    expect(result.periods.map((p) => p.feeRevenueYen)).toEqual([299_000, 767_000, 1_820_000]);
    expect(result.periods.map((p) => p.donationYen)).toEqual([299_000, 767_000, 1_820_000]);
  });

  it("광고 매출은 기말 기업 수 × 소수 단가", () => {
    expect(result.periods[0].adRevenueYen).toBeCloseTo(1_000_000, 4);
    expect(result.periods[1].adRevenueYen).toBeCloseTo(2_611_111.11, 2);
    expect(result.periods[2].adRevenueYen).toBeCloseTo(6_166_666.67, 2);
  });

  it("연 매출 · 경상이익", () => {
    expect(result.periods.map((p) => p.salesYen)).toEqual(result.periods.map((p) => p.feeRevenueYen + p.adRevenueYen));
    expect(result.periods[0].salesYen).toBeCloseTo(1_299_000, 4);
    expect(result.periods[1].salesYen).toBeCloseTo(3_378_111.11, 2);
    expect(result.periods[2].salesYen).toBeCloseTo(7_986_666.67, 2);
    expect(result.periods.map((p) => p.costsYen)).toEqual([2_800_000, 4_100_000, 6_000_000]);
    expect(result.periods[0].profitYen).toBeCloseTo(-1_501_000, 4);
    expect(result.periods[1].profitYen).toBeCloseTo(-721_888.89, 2);
    expect(result.periods[2].profitYen).toBeCloseTo(1_986_666.67, 2);
    expect(result.totals.profitYen).toBeCloseTo(-236_222.22, 2);
  });

  it("경비를 더하면 이익이 그만큼 줄어요 (기마다 연 600,000 추가)", () => {
    const more = simulate(structureScenario(600_000));
    expect(more.periods[0].profitYen).toBeCloseTo(-2_101_000, 4);
    expect(more.periods[1].profitYen).toBeCloseTo(-1_321_888.89, 2);
    expect(more.periods[2].profitYen).toBeCloseTo(1_386_666.67, 2);
  });

  it("기별 손익분기 기업 수 = (경비 + 매출원가) ÷ 1사당 공헌이익", () => {
    expect(result.periods[0].contributionPerCompanyYen).toBeCloseTo(71_935.56, 2);
    expect(result.periods.map((p) => ceilCompanies(p.breakEvenCompanies ?? Number.NaN))).toEqual([39, 57, 84]);
    expect(result.periods[0].breakEvenCompanies).toBeCloseTo(38.9237, 3);
  });

  it("건수를 반올림하지 않으면 값이 달라진다는 것도 고정 (정수 규칙을 못 박기)", () => {
    // 22.68 건이라면 수수료 매출이 22.68 × 13,000 = 294,840 이지만, 규칙은 23건 → 299,000
    expect(result.periods[0].feeRevenueYen).not.toBeCloseTo(294_840, 0);
  });
});

describe("월별 곡선 (기 사이를 직선으로, 합계 보존)", () => {
  const result = simulate(structureScenario());

  it("12 × 기 수 개월, 월말 기업 수는 직선 보간", () => {
    expect(result.months).toHaveLength(36);
    expect(result.months.map((m) => m.month)).toEqual(Array.from({ length: 36 }, (_, i) => i + 1));
    expect(result.months[0].companies).toBeCloseTo(1.5, 10);
    expect(result.months[5].companies).toBeCloseTo(9, 10);
    expect(result.months[11].companies).toBe(18);
    expect(result.months[12].companies).toBeCloseTo(18 + 29 / 12, 10);
    expect(result.months[23].companies).toBe(47);
    expect(result.months[35].companies).toBe(111);
    expect(result.start).toEqual({ companies: 0, cashYen: 4_500_000 });
  });

  it("월 매출 · 원가 · 경비의 합이 연 값과 같아요", () => {
    result.periods.forEach((period, p) => {
      const inYear = result.months.filter((m) => m.periodIndex === p);
      expect(inYear).toHaveLength(12);
      expect(inYear.reduce((s, m) => s + m.salesYen, 0)).toBeCloseTo(period.salesYen, 4);
      expect(inYear.reduce((s, m) => s + m.costsYen, 0)).toBeCloseTo(period.costsYen, 4);
      expect(inYear.reduce((s, m) => s + m.profitYen, 0)).toBeCloseTo(period.profitYen, 4);
    });
    expect(result.months[35].cumulativeProfitYen).toBeCloseTo(result.totals.profitYen, 4);
  });

  it("기업이 늘면 월 매출도 점점 늘어요 (첫 기: 1달째 대비 12달째 12배)", () => {
    const first = result.months[0].salesYen;
    const last = result.months[11].salesYen;
    expect(last / first).toBeCloseTo(12, 8);
    for (let i = 1; i < 12; i++) expect(result.months[i].salesYen).toBeGreaterThan(result.months[i - 1].salesYen);
  });

  it("경비는 12 등분", () => {
    for (const m of result.months.slice(0, 12)) expect(m.costsYen).toBeCloseTo(233_333.33, 2);
  });

  it("자금 잔액 = 조달 − 비품 + 누적 손익 − 상환", () => {
    for (const m of result.months) expect(m.cashYen).toBeCloseTo(4_500_000 + m.cumulativeProfitYen, 6);
    expect(result.finalCashYen).toBeCloseTo(4_500_000 - 236_222.22, 2);
  });

  it("기업 수가 줄어드는 기: 월 매출이 줄고 합계는 그대로", () => {
    const scenario: FinanceScenario = {
      ...structureScenario(),
      periods: [structureScenario().periods[0], { ...structureScenario().periods[1], companiesEnd: 9 }],
    };
    const down = simulate(scenario);
    const second = down.months.filter((m) => m.periodIndex === 1);
    expect(second[0].companies).toBeCloseTo(18 - 9 / 12, 10);
    expect(second[11].companies).toBe(9);
    for (let i = 1; i < 12; i++) expect(second[i].salesYen).toBeLessThan(second[i - 1].salesYen);
    expect(second.reduce((s, m) => s + m.salesYen, 0)).toBeCloseTo(down.periods[1].salesYen, 4);
  });

  it("처음부터 끝까지 기업이 0 이어도 NaN 이 없어요 (월 매출은 12 등분)", () => {
    const zero = simulate(simple({ companiesEnd: 0, adRevenuePerCompanyYen: 100_000 }));
    expect(zero.months.every((m) => Number.isFinite(m.salesYen) && Number.isFinite(m.cashYen))).toBe(true);
    expect(zero.periods[0].salesYen).toBe(0);
    expect(zero.months[0].profitYen).toBeCloseTo(-50_000, 6);
  });

  it("기초 기업 수가 있으면 첫 기는 거기서 시작", () => {
    const started = simulate(simple({ companiesEnd: 20 }, {}, 20));
    for (const m of started.months) expect(m.companies).toBe(20);
    // 기업 수가 일정하면 월 매출도 일정
    expect(started.months[0].salesYen).toBeCloseTo(started.months[11].salesYen, 6);
  });
});

describe("경계 시험: 마일스톤", () => {
  it("처음부터 흑자 (기수 1개)", () => {
    // 20사 일정: 건수 24 × 30,000 = 720,000 + 광고 20 × 50,000 = 1,000,000 = 1,720,000 / 경비 600,000
    const result = simulate(simple({}, {}, 20));
    expect(result.months).toHaveLength(12);
    expect(result.periods[0].matches).toBe(24);
    expect(result.periods[0].profitYen).toBeCloseTo(1_120_000, 4);
    expect(result.milestones.profitTurnaroundMonth).toBe(1);
    expect(result.milestones.cumulativeBreakEvenMonth).toBe(1);
    expect(result.milestones.cashShortMonth).toBeNull();
    expect(result.milestones.lowestCash.month).toBe(0);
  });

  it("흑자 전환이 없음 (표시 기간 안에서는 오지 않아요) → null", () => {
    const result = simulate({ ...simple({ companiesEnd: 5, costs: [{ label: "経費", yen: 9_000_000 }] }), periods: [simple({ companiesEnd: 5, costs: [{ label: "経費", yen: 9_000_000 }] }).periods[0], simple({ companiesEnd: 8, costs: [{ label: "経費", yen: 9_000_000 }] }).periods[0]] });
    expect(result.milestones.profitTurnaroundMonth).toBeNull();
    expect(result.milestones.cumulativeBreakEvenMonth).toBeNull();
    expect(result.months.every((m) => m.profitYen < 0)).toBe(true);
  });

  it("흑자가 되었다가 다시 적자 → 끝까지 이어지는 흑자 전환만 세요", () => {
    // 기업 0 → 100 → 0: 가운데는 흑자지만 끝이 적자
    const peak = (end: number): FinancePeriod => simple({ companiesEnd: end, adRevenuePerCompanyYen: 0, projectsPerCompany: 10, matchRate: 0.1, costs: [{ label: "経費", yen: 1_200_000 }] }).periods[0];
    const hump: FinanceScenario = { ...simple(), periods: [peak(100), peak(0)] };
    const result = simulate(hump);
    expect(result.months.filter((m) => m.profitYen > 0).length).toBeGreaterThan(5);
    expect(result.months[2].profitYen).toBeGreaterThan(0); // 3달째부터 흑자가 보이지만
    expect(result.months[23].profitYen).toBeLessThan(0); // 끝은 적자
    expect(result.milestones.profitTurnaroundMonth).toBeNull();

    // 3기에 다시 늘면, 처음 흑자가 된 달(3)이 아니라 마지막으로 흑자에 안착한 달(26)이에요
    const recovered = simulate({ ...simple(), periods: [peak(100), peak(0), peak(200)] });
    expect(recovered.months.find((m) => m.profitYen > 0)?.month).toBe(3);
    expect(recovered.milestones.profitTurnaroundMonth).toBe(26);
    expect(recovered.months[25].profitYen).toBeGreaterThan(0);
    expect(recovered.months[24].profitYen).toBeLessThan(0);
  });

  it("구조 시나리오: 2기 끝에 잠깐 흑자가 되었다가 3기 첫 두 달 적자 → 27달째에 안착", () => {
    const result = simulate(structureScenario());
    expect(result.months.find((m) => m.profitYen > 0)?.month).toBe(22);
    expect(result.months[24].profitYen).toBeLessThan(0);
    expect(result.months[25].profitYen).toBeLessThan(0);
    expect(result.milestones.profitTurnaroundMonth).toBe(27);
    expect(monthPosition(27)).toEqual({ period: 3, month: 3 });
    // 3년 합계가 적자라서 누적 흑자화는 오지 않아요
    expect(result.milestones.cumulativeBreakEvenMonth).toBeNull();
    // 가장 잔액이 낮은 때 = 흑자 전환 직전
    expect(result.milestones.lowestCash.month).toBe(26);
    expect(result.milestones.cashShortMonth).toBeNull();
  });

  it("누적 흑자화: 흑자가 충분히 커서 누적이 0 을 넘는 달", () => {
    // 첫 기 적자(−) 뒤 큰 흑자 → 어느 달에 누적이 0 이상으로 돌아서요
    const big = simulate({
      ...simple(),
      periods: [
        simple({ companiesEnd: 10, costs: [{ label: "経費", yen: 1_500_000 }] }).periods[0],
        simple({ companiesEnd: 100, costs: [{ label: "経費", yen: 1_500_000 }] }).periods[0],
      ],
    });
    const month = big.milestones.cumulativeBreakEvenMonth;
    expect(month).not.toBeNull();
    expect(month).toBeGreaterThan(12);
    const m = big.months[(month ?? 1) - 1];
    expect(m.cumulativeProfitYen).toBeGreaterThanOrEqual(-0.5);
    expect(big.months[(month ?? 1) - 2].cumulativeProfitYen).toBeLessThan(-0.5);
  });

  it("자금이 시작부터 부족: 비품 지출이 조달액보다 커요 → 0달째", () => {
    const result = simulate(simple({}, { equityYen: 1_000_000, capexYen: 2_000_000 }, 20));
    expect(result.start.cashYen).toBe(-1_000_000);
    expect(result.milestones.cashShortMonth).toBe(0);
    expect(result.milestones.lowestCash).toEqual({ month: 0, yen: -1_000_000 });
  });

  it("자금이 첫 달에 부족해짐", () => {
    // 매출 0, 경비 월 200,000, 자기자금 100,000 → 1달째 잔액 −100,000
    const result = simulate(simple({ companiesEnd: 0, adRevenuePerCompanyYen: 0, costs: [{ label: "経費", yen: 2_400_000 }] }, { equityYen: 100_000 }));
    expect(result.start.cashYen).toBe(100_000);
    expect(result.milestones.cashShortMonth).toBe(1);
    expect(result.months[0].cashYen).toBeCloseTo(-100_000, 6);
  });

  it("잔액이 딱 0 이 되는 것은 부족이 아니에요", () => {
    const result = simulate(simple({ companiesEnd: 0, adRevenuePerCompanyYen: 0, costs: [{ label: "経費", yen: 1_200_000 }] }, { equityYen: 1_200_000 }));
    expect(result.finalCashYen).toBeCloseTo(0, 6);
    expect(result.milestones.cashShortMonth).toBeNull();
  });
});

describe("경계 시험: 입력 값", () => {
  it("성사율 0: 수수료 매출 0, 광고만", () => {
    const result = simulate(simple({ matchRate: 0 }));
    expect(result.periods[0].matches).toBe(0);
    expect(result.periods[0].feeRevenueYen).toBe(0);
    expect(result.periods[0].adRevenueYen).toBe(1_000_000);
  });

  it("기부 100%: 수수료는 전부 기부라 매출이 아니에요", () => {
    const result = simulate(simple({ donationRate: 1 }));
    expect(result.periods[0].feeRevenueYen).toBe(0);
    expect(result.periods[0].donationYen).toBe(720_000);
    expect(result.periods[0].salesYen).toBe(1_000_000);
  });

  it("매출원가는 매출 비율로 월에 나뉘고 이익에서 빠져요", () => {
    const result = simulate(simple({ costOfRevenueYen: 300_000 }, {}, 20));
    expect(result.periods[0].profitYen).toBeCloseTo(1_120_000 - 300_000, 4);
    expect(result.months.reduce((s, m) => s + m.costOfRevenueYen, 0)).toBeCloseTo(300_000, 6);
  });

  it("차입금 상환: 기마다 균등, 차입금을 넘겨서는 갚지 않아요", () => {
    const base = simple({ companiesEnd: 0, adRevenuePerCompanyYen: 0, costs: [] }, { equityYen: 0, borrowingYen: 5_000_000, repaymentYenPerPeriod: 3_000_000 });
    const three: FinanceScenario = { ...base, periods: [base.periods[0], base.periods[0], base.periods[0]] };
    const result = simulate(three);
    // 1기 끝: 3,000,000 상환, 2기: 남은 2,000,000 만 (250,000 × 8 달)
    expect(result.months[11].cashYen).toBeCloseTo(2_000_000, 6);
    expect(result.months[12].cashYen).toBeCloseTo(1_750_000, 6);
    expect(result.months[19].cashYen).toBeCloseTo(0, 6);
    expect(result.months[20].cashYen).toBeCloseTo(0, 6);
    expect(result.finalCashYen).toBeCloseTo(0, 6);
    expect(result.milestones.cashShortMonth).toBeNull();
  });

  it("상환이 차입금보다 많이 설정되어도 마이너스로 가지 않아요", () => {
    const result = simulate(simple({ companiesEnd: 0, adRevenuePerCompanyYen: 0, costs: [] }, { equityYen: 0, borrowingYen: 1_000_000, repaymentYenPerPeriod: 99_000_000 }));
    expect(result.finalCashYen).toBeCloseTo(0, 6);
    expect(result.milestones.cashShortMonth).toBeNull();
  });

  it("손익분기 기업 수: 공헌이익이 0 이하면 null, 경비가 없으면 0", () => {
    expect(evaluatePeriod(simple({ matchRate: 0, adRevenuePerCompanyYen: 0 }).periods[0]).breakEvenCompanies).toBeNull();
    expect(evaluatePeriod(simple({ costs: [] }).periods[0]).breakEvenCompanies).toBe(0);
    // 경비 600,000 ÷ (0.1 × 12 × 30,000 + 50,000 = 86,000) = 6.98...
    const normal = evaluatePeriod(simple().periods[0]);
    expect(normal.breakEvenCompanies).toBeCloseTo(6.9767, 3);
    expect(ceilCompanies(normal.breakEvenCompanies ?? 0)).toBe(7);
    // 나눗셈의 꼬리(12.000000000000002)는 12사로 봐요
    expect(ceilCompanies(3_120_000 / 260_000)).toBe(12);
    expect(ceilCompanies(12.000000000000002)).toBe(12);
    expect(ceilCompanies(12.2)).toBe(13);
    expect(ceilCompanies(0)).toBe(0);
  });

  it("매출원가도 고정비로 보고 손익분기에 넣어요", () => {
    const withCogs = evaluatePeriod(simple({ costOfRevenueYen: 400_000 }).periods[0]);
    expect(withCogs.breakEvenCompanies).toBeCloseTo(1_000_000 / 86_000, 6);
  });

  it("5기까지 계산해요", () => {
    const base = simple().periods[0];
    const five = simulate({ ...simple(), periods: [base, base, base, base, base] });
    expect(five.months).toHaveLength(60);
    expect(five.periods).toHaveLength(5);
  });
});

describe("불변식 (무작위 시나리오 200개)", () => {
  // 시드 고정 난수: 시험이 늘 같은 입력으로 돌아요
  let seed = 20261031;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const pick = (min: number, max: number) => min + random() * (max - min);

  it("합계 보존 · 잔액 관계 · 마일스톤의 정의", () => {
    for (let n = 0; n < 200; n++) {
      const periodCount = 1 + Math.floor(random() * MAX_PERIODS);
      const scenario: FinanceScenario = {
        schemaVersion: 1,
        name: `fuzz${n}`,
        startCompanies: Math.floor(pick(0, 30)),
        periods: Array.from({ length: periodCount }, (_, i) => ({
          label: `P${i}`,
          companiesEnd: Math.floor(pick(0, 300)),
          projectsPerCompany: pick(0, 30),
          matchRate: random(),
          feePerMatchYen: pick(0, 60_000),
          donationRate: random(),
          adRevenuePerCompanyYen: pick(0, 80_000),
          costOfRevenueYen: random() < 0.3 ? pick(0, 500_000) : 0,
          costs: [{ label: "x", yen: pick(0, 12_000_000) }],
        })),
        funding: { equityYen: pick(0, 5_000_000), borrowingYen: pick(0, 8_000_000), capexYen: pick(0, 3_000_000), repaymentYenPerPeriod: random() < 0.5 ? pick(0, 3_000_000) : 0 },
      };
      const result = simulate(scenario);
      expect(result.months).toHaveLength(12 * periodCount);
      result.periods.forEach((period, p) => {
        const inYear = result.months.filter((m) => m.periodIndex === p);
        expect(inYear.reduce((s, m) => s + m.salesYen, 0)).toBeCloseTo(period.salesYen, 3);
        expect(inYear.reduce((s, m) => s + m.profitYen, 0)).toBeCloseTo(period.profitYen, 3);
        expect(Number.isInteger(period.matches)).toBe(true);
      });
      let cumulative = 0;
      for (const m of result.months) {
        cumulative += m.profitYen;
        expect(m.cumulativeProfitYen).toBeCloseTo(cumulative, 3);
        expect(Number.isFinite(m.cashYen)).toBe(true);
        expect(m.cashYen).toBeLessThanOrEqual(result.start.cashYen + m.cumulativeProfitYen + 1e-6);
      }
      // 흑자 전환의 정의: 그 달부터 끝까지 0 이상, 바로 앞 달은 0 미만
      const turn = result.milestones.profitTurnaroundMonth;
      if (turn !== null) {
        for (const m of result.months.slice(turn - 1)) expect(m.profitYen).toBeGreaterThanOrEqual(-0.5);
        if (turn > 1) expect(result.months[turn - 2].profitYen).toBeLessThan(-0.5);
      } else {
        expect(result.months[result.months.length - 1].profitYen).toBeLessThan(-0.5);
      }
      // 자금 부족의 정의: 그 달이 처음으로 0 미만
      const short = result.milestones.cashShortMonth;
      if (short === null) {
        expect(result.start.cashYen).toBeGreaterThanOrEqual(-0.5);
        for (const m of result.months) expect(m.cashYen).toBeGreaterThanOrEqual(-0.5);
      } else if (short === 0) {
        expect(result.start.cashYen).toBeLessThan(-0.5);
      } else {
        expect(result.months[short - 1].cashYen).toBeLessThan(-0.5);
        for (const m of result.months.slice(0, short - 1)) expect(m.cashYen).toBeGreaterThanOrEqual(-0.5);
      }
      expect(result.milestones.lowestCash.yen).toBeLessThanOrEqual(result.start.cashYen);
    }
  });
});

describe("민감도", () => {
  const scenario = sampleScenario("ja");

  it("0% 줄은 원래 결과와 같아요", () => {
    const base = simulate(scenario);
    for (const param of ["matchRate", "feePerMatchYen", "adRevenuePerCompanyYen"] as const) {
      const rows = sensitivity(scenario, param);
      expect(rows.map((r) => r.factor)).toEqual([...SENSITIVITY_FACTORS]);
      const zero = rows[SENSITIVITY_FACTORS.indexOf(0)];
      expect(zero.profitTurnaroundMonth).toBe(base.milestones.profitTurnaroundMonth);
      expect(zero.lastPeriodProfitYen).toBeCloseTo(base.periods[2].profitYen, 4);
      expect(zero.finalCashYen).toBeCloseTo(base.finalCashYen, 4);
    }
  });

  it("값이 클수록 최종 기 이익은 줄지 않고, 흑자 전환은 늦어지지 않아요", () => {
    for (const param of ["matchRate", "feePerMatchYen", "adRevenuePerCompanyYen"] as const) {
      const rows = sensitivity(scenario, param);
      for (let i = 1; i < rows.length; i++) {
        expect(rows[i].lastPeriodProfitYen, `${param} ${rows[i].factor}`).toBeGreaterThanOrEqual(rows[i - 1].lastPeriodProfitYen - 1e-6);
        const before = rows[i - 1].profitTurnaroundMonth;
        const after = rows[i].profitTurnaroundMonth;
        if (before !== null) expect(after, `${param} ${rows[i].factor}`).not.toBeNull();
        if (before !== null && after !== null) expect(after).toBeLessThanOrEqual(before);
      }
    }
  });

  it("샘플의 값 (회귀): 광고 단가 −30% 이면 3기 이익이 적자가 돼요", () => {
    const rows = sensitivity(scenario, "adRevenuePerCompanyYen");
    expect(rows[0].factor).toBe(-0.3);
    expect(rows[0].lastPeriodProfitYen).toBeLessThan(0);
    expect(rows[0].profitTurnaroundMonth).toBe(31);
    expect(rows[3].profitTurnaroundMonth).toBe(29);
  });

  it("성사율은 100% 를 넘지 않게 잘라요", () => {
    const high = { ...scenario, periods: scenario.periods.map((p) => ({ ...p, matchRate: 0.9 })) };
    expect(scaleScenario(high, "matchRate", 0.3).periods.every((p) => p.matchRate === 1)).toBe(true);
    expect(scaleScenario(high, "matchRate", -1).periods.every((p) => p.matchRate === 0)).toBe(true);
    // 원본은 바뀌지 않아요
    expect(high.periods[0].matchRate).toBe(0.9);
  });
});

describe("인건비 계산기", () => {
  it("인원 × 시급 × 주당 시간 × 연간 주수", () => {
    expect(laborCostYen({ people: 2, hourlyYen: 1100, hoursPerWeek: 15, weeksPerYear: 48 })).toBe(1_584_000);
    expect(laborCostYen({ people: 1.5, hourlyYen: 1000, hoursPerWeek: 10.5, weeksPerYear: 50 })).toBe(787_500);
    expect(laborCostYen({ people: 0, hourlyYen: 1100, hoursPerWeek: 15, weeksPerYear: 48 })).toBe(0);
  });

  it("이상한 값은 null", () => {
    expect(laborCostYen({ people: -1, hourlyYen: 1100, hoursPerWeek: 15, weeksPerYear: 48 })).toBeNull();
    expect(laborCostYen({ people: 2, hourlyYen: Number.NaN, hoursPerWeek: 15, weeksPerYear: 48 })).toBeNull();
    expect(laborCostYen({ people: 2, hourlyYen: 1100, hoursPerWeek: 169, weeksPerYear: 48 })).toBeNull();
    expect(laborCostYen({ people: 2, hourlyYen: 1100, hoursPerWeek: 15, weeksPerYear: 54 })).toBeNull();
  });
});

describe("입력 칸 읽기", () => {
  it("parseFieldNumber: 쉼표 · 전각 · 소수", () => {
    const yen = FINANCE_FIELD_SPEC.feePerMatchYen;
    expect(parseFieldNumber("1,200,000", yen)).toEqual({ ok: true, value: 1_200_000 });
    expect(parseFieldNumber(" 35294.12 ", yen)).toEqual({ ok: true, value: 35294.12 });
    expect(parseFieldNumber("１２，０００", yen)).toEqual({ ok: true, value: 12000 });
    expect(parseFieldNumber("０．５", yen)).toEqual({ ok: true, value: 0.5 });
    expect(parseFieldNumber("", yen)).toEqual({ ok: false, error: "empty" });
    expect(parseFieldNumber("  ", yen)).toEqual({ ok: false, error: "empty" });
    expect(parseFieldNumber("abc", yen)).toEqual({ ok: false, error: "not_number" });
    expect(parseFieldNumber("1e3", yen)).toEqual({ ok: false, error: "not_number" });
    expect(parseFieldNumber("12,34", yen)).toEqual({ ok: false, error: "not_number" });
    expect(parseFieldNumber("-1", yen)).toEqual({ ok: false, error: "out_of_range" });
    expect(parseFieldNumber("2000000000000", yen)).toEqual({ ok: false, error: "out_of_range" });
  });

  it("정수 칸은 소수를 거절", () => {
    expect(parseFieldNumber("34", FINANCE_FIELD_SPEC.companiesEnd)).toEqual({ ok: true, value: 34 });
    expect(parseFieldNumber("34.5", FINANCE_FIELD_SPEC.companiesEnd)).toEqual({ ok: false, error: "not_integer" });
    expect(parseFieldNumber("1000001", FINANCE_FIELD_SPEC.companiesEnd)).toEqual({ ok: false, error: "out_of_range" });
  });

  it("비율은 퍼센트로 입력하고 0~1 로 바꿔요", () => {
    expect(parseFieldPercent("8")).toEqual({ ok: true, value: 0.08 });
    expect(parseFieldPercent("7.5%")).toEqual({ ok: true, value: 0.075 });
    expect(parseFieldPercent("８％")).toEqual({ ok: true, value: 0.08 });
    expect(parseFieldPercent("100")).toEqual({ ok: true, value: 1 });
    expect(parseFieldPercent("0")).toEqual({ ok: true, value: 0 });
    expect(parseFieldPercent("101")).toEqual({ ok: false, error: "out_of_range" });
    expect(parseFieldPercent("")).toEqual({ ok: false, error: "empty" });
    expect(ratioToPercentText(0.075)).toBe("7.5");
    expect(ratioToPercentText(0.08)).toBe("8");
    expect(ratioToPercentText(1)).toBe("100");
    expect(numberToFieldText(AD_UNIT)).toBe("55555.555556");
    expect(numberToFieldText(30000)).toBe("30000");
  });
});

const GOOD = `{
  "schemaVersion": 1,
  "name": "x",
  "periods": [
    { "label": "P1", "companiesEnd": 10, "projectsPerCompany": 12, "matchRate": 0.1, "feePerMatchYen": 30000, "donationRate": 0.5,
      "adRevenuePerCompanyYen": 36000.5, "costs": [ { "label": "人件費", "yen": 2400000 } ] }
  ],
  "funding": { "equityYen": 300000, "borrowingYen": 900000, "capexYen": 200000 }
}`;

describe("시나리오 JSON", () => {
  it("필수 키만 있어도 읽고, 없는 값은 기본값(0)으로", () => {
    const result = parseScenarioJson(GOOD);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.scenario.startCompanies).toBe(0);
    expect(result.scenario.periods[0].costOfRevenueYen).toBe(0);
    expect(result.scenario.funding.repaymentYenPerPeriod).toBe(0);
    expect(result.scenario.periods[0].adRevenuePerCompanyYen).toBe(36000.5);
    expect(simulate(result.scenario).months).toHaveLength(12);
  });

  it("모르는 키는 무시, BOM 은 허용, 이름 앞뒤 공백은 정리", () => {
    const text = `﻿${GOOD.replace('"name": "x"', '"name": "  이름  ", "memo": "ignored", "extra": {"a": 1}')}`;
    const result = parseScenarioJson(text);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.scenario.name).toBe("이름");
  });

  it("저장했다가 다시 읽으면 같아요 (샘플 · 소수 단가)", () => {
    for (const scenario of [sampleScenario("ja"), sampleScenario("ko"), structureScenario(), blankScenario("빈", "ko")]) {
      const text = serializeScenarioJson(scenario);
      expect(text.endsWith("}\n")).toBe(true);
      expect(text).toContain('"schemaVersion": 1');
      const back = parseScenarioJson(text);
      expect(back).toEqual({ ok: true, scenario });
    }
    const decimals = parseScenarioJson(serializeScenarioJson(structureScenario()));
    expect(decimals.ok && decimals.scenario.periods[0].adRevenuePerCompanyYen).toBe(AD_UNIT);
  });

  it("키 순서가 늘 같아요 (저장 형식 고정)", () => {
    const text = serializeScenarioJson(sampleScenario("ja"));
    const order = ["schemaVersion", "name", "periods", "label", "companiesEnd", "projectsPerCompany", "matchRate", "feePerMatchYen", "donationRate", "adRevenuePerCompanyYen", "costOfRevenueYen", "costs", "startCompanies", "funding", "equityYen", "borrowingYen", "capexYen", "repaymentYenPerPeriod"];
    let at = -1;
    for (const key of order) {
      const index = text.indexOf(`"${key}"`);
      expect(index, key).toBeGreaterThan(at);
      at = index;
    }
  });

  it("읽을 수 없는 글자 · 너무 긴 글자", () => {
    expect(parseScenarioJson("{")).toEqual({ ok: false, issues: [{ code: "not_json", path: "" }] });
    expect(parseScenarioJson("")).toEqual({ ok: false, issues: [{ code: "not_json", path: "" }] });
    expect(parseScenarioJson("[]")).toEqual({ ok: false, issues: [{ code: "not_object", path: "" }] });
    expect(parseScenarioJson("null")).toEqual({ ok: false, issues: [{ code: "not_object", path: "" }] });
    expect(parseScenarioJson(" ".repeat(MAX_JSON_LENGTH + 1))).toEqual({ ok: false, issues: [{ code: "too_long", path: "", max: MAX_JSON_LENGTH }] });
  });

  const issuesOf = (mutate: (draft: Record<string, unknown>) => void) => {
    const draft = JSON.parse(GOOD) as Record<string, unknown>;
    mutate(draft);
    const result = validateScenario(draft);
    return result.ok ? [] : result.issues;
  };
  const period = (draft: Record<string, unknown>) => (draft.periods as Record<string, unknown>[])[0];

  it("버전: 없거나 1 이 아니면 거절", () => {
    expect(issuesOf((d) => delete d.schemaVersion)).toEqual([{ code: "missing", path: "schemaVersion" }]);
    expect(issuesOf((d) => (d.schemaVersion = 2))).toEqual([{ code: "schema_version", path: "schemaVersion" }]);
    expect(issuesOf((d) => (d.schemaVersion = "1"))).toEqual([{ code: "schema_version", path: "schemaVersion" }]);
  });

  it("이름", () => {
    expect(issuesOf((d) => delete d.name)).toEqual([{ code: "missing", path: "name" }]);
    expect(issuesOf((d) => (d.name = 5))).toEqual([{ code: "not_string", path: "name" }]);
    expect(issuesOf((d) => (d.name = "   "))).toEqual([{ code: "empty_string", path: "name" }]);
    expect(issuesOf((d) => (d.name = "あ".repeat(61)))).toEqual([{ code: "too_long", path: "name", max: 60 }]);
  });

  it("기(期) 수: 1~5", () => {
    expect(issuesOf((d) => delete d.periods)).toEqual([{ code: "missing", path: "periods" }]);
    expect(issuesOf((d) => (d.periods = {}))).toEqual([{ code: "not_array", path: "periods" }]);
    expect(issuesOf((d) => (d.periods = []))).toEqual([{ code: "periods_count", path: "periods", min: 1, max: 5 }]);
    expect(issuesOf((d) => (d.periods = Array.from({ length: 6 }, () => period(d))))).toEqual([{ code: "periods_count", path: "periods", min: 1, max: 5 }]);
    expect(issuesOf((d) => (d.periods = Array.from({ length: 5 }, () => period(d))))).toEqual([]);
    expect(issuesOf((d) => (d.periods = [1]))).toEqual([{ code: "not_object", path: "periods[0]" }]);
  });

  it("값의 종류 · 범위 · 필수 키", () => {
    expect(issuesOf((d) => delete period(d).companiesEnd)).toEqual([{ code: "missing", path: "periods[0].companiesEnd" }]);
    expect(issuesOf((d) => (period(d).companiesEnd = "10"))).toEqual([{ code: "not_number", path: "periods[0].companiesEnd" }]);
    expect(issuesOf((d) => (period(d).companiesEnd = null))).toEqual([{ code: "not_number", path: "periods[0].companiesEnd" }]);
    expect(issuesOf((d) => (period(d).companiesEnd = 10.5))).toEqual([{ code: "not_integer", path: "periods[0].companiesEnd" }]);
    expect(issuesOf((d) => (period(d).companiesEnd = -1))).toEqual([{ code: "out_of_range", path: "periods[0].companiesEnd", min: 0, max: 1_000_000 }]);
    expect(issuesOf((d) => (period(d).matchRate = 1.5))).toEqual([{ code: "out_of_range", path: "periods[0].matchRate", min: 0, max: 1 }]);
    expect(issuesOf((d) => (period(d).donationRate = -0.1))).toEqual([{ code: "out_of_range", path: "periods[0].donationRate", min: 0, max: 1 }]);
    expect(issuesOf((d) => (period(d).feePerMatchYen = -5))).toHaveLength(1);
    expect(issuesOf((d) => (period(d).label = ""))).toEqual([{ code: "empty_string", path: "periods[0].label" }]);
    // 광고 단가는 소수 가능, 기업 수 · 기초 기업 수는 정수
    expect(issuesOf((d) => (period(d).adRevenuePerCompanyYen = 35294.1176470588))).toEqual([]);
    expect(issuesOf((d) => (d.startCompanies = 2.5))).toEqual([{ code: "not_integer", path: "startCompanies" }]);
    expect(issuesOf((d) => (d.startCompanies = 5))).toEqual([]);
  });

  it("경비 행", () => {
    expect(issuesOf((d) => delete period(d).costs)).toEqual([{ code: "missing", path: "periods[0].costs" }]);
    expect(issuesOf((d) => (period(d).costs = "x"))).toEqual([{ code: "not_array", path: "periods[0].costs" }]);
    expect(issuesOf((d) => (period(d).costs = []))).toEqual([]);
    expect(issuesOf((d) => (period(d).costs = Array.from({ length: MAX_COST_ROWS + 1 }, () => ({ label: "a", yen: 1 }))))).toEqual([
      { code: "too_many_costs", path: "periods[0].costs", max: MAX_COST_ROWS },
    ]);
    expect(issuesOf((d) => (period(d).costs = [{ label: "a" }]))).toEqual([{ code: "missing", path: "periods[0].costs[0].yen" }]);
    expect(issuesOf((d) => (period(d).costs = [{ label: "a", yen: -1 }]))).toEqual([{ code: "out_of_range", path: "periods[0].costs[0].yen", min: 0, max: 1_000_000_000_000 }]);
    expect(issuesOf((d) => (period(d).costs = [null]))).toEqual([{ code: "not_object", path: "periods[0].costs[0]" }]);
  });

  it("자금", () => {
    expect(issuesOf((d) => delete d.funding)).toEqual([{ code: "missing", path: "funding" }]);
    expect(issuesOf((d) => (d.funding = []))).toEqual([{ code: "not_object", path: "funding" }]);
    expect(issuesOf((d) => delete (d.funding as Record<string, unknown>).capexYen)).toEqual([{ code: "missing", path: "funding.capexYen" }]);
    expect(issuesOf((d) => ((d.funding as Record<string, unknown>).equityYen = "3"))).toEqual([{ code: "not_number", path: "funding.equityYen" }]);
    expect(issuesOf((d) => ((d.funding as Record<string, unknown>).repaymentYenPerPeriod = 100_000))).toEqual([]);
  });

  it("틀린 곳은 한 번에 모두 알려요", () => {
    const issues = issuesOf((d) => {
      d.name = "";
      period(d).matchRate = 2;
      period(d).companiesEnd = "x";
      (d.funding as Record<string, unknown>).equityYen = -1;
    });
    expect(issues.map((i) => i.path)).toEqual(["name", "periods[0].companiesEnd", "periods[0].matchRate", "funding.equityYen"]);
  });
});

describe("기 추가·삭제 · 빈 시나리오", () => {
  it("addPeriod: 마지막 기를 복사해서 이름만 새로, 최대 5기", () => {
    let scenario = sampleScenario("ko");
    scenario = addPeriod(scenario, "ko");
    expect(scenario.periods).toHaveLength(4);
    expect(scenario.periods[3].label).toBe("제4기");
    expect(scenario.periods[3].companiesEnd).toBe(scenario.periods[2].companiesEnd);
    expect(scenario.periods[3].costs).toEqual(scenario.periods[2].costs);
    expect(scenario.periods[3].costs).not.toBe(scenario.periods[2].costs);
    scenario = addPeriod(scenario, "ko");
    expect(scenario.periods).toHaveLength(MAX_PERIODS);
    expect(addPeriod(scenario, "ko")).toBe(scenario);
  });

  it("removePeriod: 1기는 남겨요", () => {
    const three = sampleScenario("ja");
    expect(removePeriod(three, 1).periods.map((p) => p.label)).toEqual(["第1期", "第3期"]);
    expect(removePeriod(three, 9)).toBe(three);
    let one = three;
    one = removePeriod(one, 0);
    one = removePeriod(one, 0);
    expect(one.periods).toHaveLength(1);
    expect(removePeriod(one, 0)).toBe(one);
  });

  it("blankScenario: 3기, 모두 0 이라도 계산돼요", () => {
    const blank = blankScenario("新規", "ja");
    expect(blank.periods.map((p) => p.label)).toEqual(["第1期", "第2期", "第3期"]);
    const result = simulate(blank);
    expect(result.months).toHaveLength(36);
    expect(result.months.every((m) => m.profitYen === 0 && m.cashYen === 0)).toBe(true);
    // 전부 0 이면 "흑자 전환 1달째" 가 되지만, 화면은 매출이 0 이면 따로 안내해요 (adminFinanceText)
    expect(result.milestones.profitTurnaroundMonth).toBe(1);
  });
});

describe("샘플 시나리오 (가상)", () => {
  it("두 언어 모두 검사를 통과해요", () => {
    for (const locale of ["ja", "ko"] as const) {
      const text = serializeScenarioJson(sampleScenario(locale));
      expect(parseScenarioJson(text).ok, locale).toBe(true);
    }
    expect(sampleScenario("ja").name).toContain("仮想");
    expect(sampleScenario("ko").name).toContain("가상");
  });

  it("값 (회귀): 3기에 월 이익이 흑자로 돌아서고, 누적은 흑자화하지 않으며, 자금은 모자라지 않아요", () => {
    const result = simulate(sampleScenario("ja"));
    expect(result.periods.map((p) => p.matches)).toEqual([18, 66, 192]);
    expect(result.periods.map((p) => Math.round(p.salesYen))).toEqual([750_000, 2_590_000, 6_880_000]);
    expect(result.periods.map((p) => Math.round(p.profitYen))).toEqual([-2_250_000, -1_710_000, 1_180_000]);
    expect(result.milestones.profitTurnaroundMonth).toBe(29);
    expect(monthPosition(29)).toEqual({ period: 3, month: 5 });
    expect(result.milestones.cumulativeBreakEvenMonth).toBeNull();
    expect(result.milestones.cashShortMonth).toBeNull();
    expect(result.milestones.lowestCash.month).toBe(28);
    expect(result.start.cashYen).toBe(8_000_000);
    expect(result.periods.map((p) => Math.round((p.breakEvenCompanies ?? 0) * 10) / 10)).toEqual([48, 66.4, 82.8]);
    // 샘플은 학생 환원이 켜져 있어요(운전자금 3개월분): 3기 말 자금 522만 엔에서 운전자금 142.5만 엔을 남겨도
    // 3기 이익 118만 엔 전부를 환원할 수 있어서, 마지막 자금은 522만 − 118만 = 404만 엔 (환원 전에는 522만 엔이었어요)
    expect(result.studentReturn?.reserveMonths).toBe(3);
    expect(result.studentReturn?.periods.map((p) => Math.round(p.returnYen))).toEqual([0, 0, 1_180_000]);
    expect(Math.round(result.studentReturn?.periods[2]?.cashBeforeYen ?? 0)).toBe(5_220_000);
    expect(Math.round(result.studentReturn?.periods[2]?.reserveYen ?? 0)).toBe(1_425_000);
    expect(result.studentReturn?.firstPeriodIndex).toBe(2);
    expect(Math.round(result.finalCashYen)).toBe(4_040_000);
    // 환원을 끄면 예전 값 그대로
    expect(Math.round(simulate({ ...sampleScenario("ja"), studentReturn: undefined }).finalCashYen)).toBe(5_220_000);
  });

  it("monthPosition", () => {
    expect(monthPosition(1)).toEqual({ period: 1, month: 1 });
    expect(monthPosition(12)).toEqual({ period: 1, month: 12 });
    expect(monthPosition(13)).toEqual({ period: 2, month: 1 });
    expect(monthPosition(60)).toEqual({ period: 5, month: 12 });
  });
});

describe("학생 환원 (운전자금 N개월분을 남기고, 그 기 이익 중 남는 금액 전부)", () => {
  // 손으로 계산할 수 있는 한 기짜리 가상 시나리오: 기업 10곳 × 프로젝트 10 × 성사율 10% = 10건 × 3만 엔 × (1 − 50%) = 15만 엔 매출,
  // 경비 연 6만 엔 → 경상이익 9만 엔. 운전자금 3개월분 = 6만 × 3/12 = 1.5만 엔.
  const one = (opening: number, reserveMonths: number | null): FinanceScenario => ({
    schemaVersion: 1,
    name: "return",
    periods: [{ label: "第1期", companiesEnd: 10, projectsPerCompany: 10, matchRate: 0.1, feePerMatchYen: 30_000, donationRate: 0.5, adRevenuePerCompanyYen: 0, costOfRevenueYen: 0, costs: [{ label: "経費", yen: 60_000 }] }],
    startCompanies: 10,
    funding: { equityYen: opening, borrowingYen: 0, capexYen: 0, repaymentYenPerPeriod: 0 },
    ...(reserveMonths === null ? {} : { studentReturn: { reserveMonths } }),
  });

  it("계산식: 적자·자금 부족이면 0, 아니면 min(이익, 자금 − 운전자금)", () => {
    expect(periodReturnYen(-1, 1_000_000, 0)).toBe(0);
    expect(periodReturnYen(0, 1_000_000, 0)).toBe(0);
    expect(periodReturnYen(90_000, 50_000, 60_000)).toBe(0);
    expect(periodReturnYen(90_000, 105_000, 15_000)).toBe(90_000);
    expect(periodReturnYen(90_000, 90_000, 15_000)).toBe(75_000);
    expect(returnReserveYen({ costsYen: 60_000, costOfRevenueYen: 0 }, 3)).toBe(15_000);
    expect(returnReserveYen({ costsYen: 60_000, costOfRevenueYen: 12_000 }, 2)).toBe(12_000);
    expect(returnReserveYen({ costsYen: 60_000, costOfRevenueYen: 0 }, 0)).toBe(0);
  });

  it("일부 환원: 자금 − 운전자금 이 이익보다 적으면 그만큼만 (기말 자금 = 운전자금)", () => {
    const result = simulate(one(0, 3));
    expect(Math.round(result.periods[0].profitYen)).toBe(90_000);
    expect(result.studentReturn?.periods[0]?.reserveYen).toBe(15_000);
    expect(Math.round(result.studentReturn?.periods[0]?.cashBeforeYen ?? 0)).toBe(90_000);
    expect(Math.round(result.totals.studentReturnYen)).toBe(75_000);
    expect(Math.round(result.finalCashYen)).toBe(15_000);
    expect(result.studentReturn?.firstPeriodIndex).toBe(0);
  });

  it("전액 환원: 자금이 넉넉하면 그 기 이익 전부 (지난 자금은 환원하지 않아요)", () => {
    const result = simulate(one(1_000_000, 3));
    expect(Math.round(result.totals.studentReturnYen)).toBe(90_000);
    expect(Math.round(result.finalCashYen)).toBe(1_000_000);
  });

  it("운전자금 0개월: 이익 전부(자금이 그보다 적으면 자금 전부)", () => {
    expect(Math.round(simulate(one(0, 0)).totals.studentReturnYen)).toBe(90_000);
    expect(Math.round(simulate(one(0, 0)).finalCashYen)).toBe(0);
  });

  it("환원은 기의 마지막 달에만, 누적 환원·자금 곡선에 반영 / 손익·흑자 전환·손익분기는 그대로", () => {
    const off = simulate(one(0, null));
    const on = simulate(one(0, 3));
    expect(on.months.slice(0, 11).every((m) => m.studentReturnYen === 0 && m.cumulativeReturnYen === 0)).toBe(true);
    expect(Math.round(on.months[11].studentReturnYen)).toBe(75_000);
    expect(Math.round(on.months[11].cumulativeReturnYen)).toBe(75_000);
    on.months.forEach((m, i) => expect(m.cashYen).toBeCloseTo(off.months[i].cashYen - m.cumulativeReturnYen, 6));
    expect(on.milestones.profitTurnaroundMonth).toBe(off.milestones.profitTurnaroundMonth);
    expect(on.milestones.cumulativeBreakEvenMonth).toBe(off.milestones.cumulativeBreakEvenMonth);
    expect(on.finalCumulativeProfitYen).toBeCloseTo(off.finalCumulativeProfitYen, 6);
    expect(on.periods).toEqual(off.periods);
  });

  it("규칙이 꺼져 있으면 null · 합계 0 · 모든 달 0", () => {
    const off = simulate(one(0, null));
    expect(off.studentReturn).toBeNull();
    expect(off.totals.studentReturnYen).toBe(0);
    expect(off.months.every((m) => m.studentReturnYen === 0 && m.cumulativeReturnYen === 0)).toBe(true);
  });

  it("적자 기 다음의 흑자 기: 자금이 운전자금에 못 미치면 환원 없음", () => {
    const loss: FinancePeriod = { label: "第1期", companiesEnd: 0, projectsPerCompany: 0, matchRate: 0, feePerMatchYen: 0, donationRate: 0, adRevenuePerCompanyYen: 0, costOfRevenueYen: 0, costs: [{ label: "経費", yen: 200_000 }] };
    const scenario: FinanceScenario = { ...one(0, 3), periods: [loss, { ...one(0, 3).periods[0], label: "第2期" }] };
    const result = simulate(scenario);
    expect(result.studentReturn?.periods.map((p) => p.returnYen)).toEqual([0, 0]);
    expect(result.studentReturn?.firstPeriodIndex).toBeNull();
    expect(Math.round(result.studentReturn?.periods[1]?.cashBeforeYen ?? 0)).toBe(-110_000);
    expect(result.milestones.cashShortMonth).not.toBeNull();
  });

  it("민감도 줄에도 환원 합계가 들어가요 (0% 줄 = 원래 결과)", () => {
    const scenario = sampleScenario("ja");
    const base = simulate(scenario);
    const zero = sensitivity(scenario, "matchRate")[SENSITIVITY_FACTORS.indexOf(0)];
    expect(zero.totalReturnYen).toBeCloseTo(base.totals.studentReturnYen, 6);
    expect(sensitivity(withStudentReturn(scenario, null), "matchRate").every((row) => row.totalReturnYen === 0)).toBe(true);
  });

  it("켜기·끄기: 끄면 항목이 없어지고(JSON 도 옛 모양), 켜면 지정한 개월", () => {
    const off = withStudentReturn(sampleScenario("ja"), null);
    expect("studentReturn" in off).toBe(false);
    expect(serializeScenarioJson(off)).not.toContain("studentReturn");
    expect(withStudentReturn(off, 6).studentReturn).toEqual({ reserveMonths: 6 });
    expect(DEFAULT_RESERVE_MONTHS).toBe(3);
    // 기 추가·삭제 뒤에도 규칙은 남아요
    expect(addPeriod(sampleScenario("ja"), "ja").studentReturn).toEqual({ reserveMonths: 3 });
    expect(removePeriod(sampleScenario("ja"), 0).studentReturn).toEqual({ reserveMonths: 3 });
  });

  it("JSON: 없거나 null 이면 꺼짐, {} 이면 기본 3개월, 범위·정수·모양 검사, 저장했다가 다시 읽으면 같아요", () => {
    const base = JSON.parse(serializeScenarioJson(withStudentReturn(sampleScenario("ja"), null)));
    const read = (studentReturn: unknown) => validateScenario({ ...base, studentReturn });
    const none = validateScenario(base);
    expect(none.ok && none.scenario.studentReturn === undefined).toBe(true);
    const nul = read(null);
    expect(nul.ok && nul.scenario.studentReturn === undefined).toBe(true);
    const empty = read({});
    expect(empty.ok && empty.scenario.studentReturn).toEqual({ reserveMonths: 3 });
    const six = read({ reserveMonths: 6 });
    expect(six.ok && six.scenario.studentReturn).toEqual({ reserveMonths: 6 });
    expect(read({ reserveMonths: 25 })).toEqual({ ok: false, issues: [{ code: "out_of_range", path: "studentReturn.reserveMonths", min: 0, max: 24 }] });
    expect(read({ reserveMonths: 2.5 })).toEqual({ ok: false, issues: [{ code: "not_integer", path: "studentReturn.reserveMonths" }] });
    expect(read({ reserveMonths: "3" })).toEqual({ ok: false, issues: [{ code: "not_number", path: "studentReturn.reserveMonths" }] });
    expect(read("on")).toEqual({ ok: false, issues: [{ code: "not_object", path: "studentReturn" }] });
    const text = serializeScenarioJson(sampleScenario("ko"));
    expect(text).toContain('"studentReturn": {\n    "reserveMonths": 3\n  }');
    const back = parseScenarioJson(text);
    expect(back.ok && JSON.stringify(back.scenario) === JSON.stringify(sampleScenario("ko"))).toBe(true);
  });

  it("옛 JSON(환원 항목 없음)은 그대로 읽고 그대로 써요", () => {
    const old = serializeScenarioJson(structureScenario());
    expect(old).not.toContain("studentReturn");
    const back = parseScenarioJson(old);
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    expect(back.scenario.studentReturn).toBeUndefined();
    expect(serializeScenarioJson(back.scenario)).toBe(old);
    expect(simulate(back.scenario).studentReturn).toBeNull();
  });

  it("FINANCE_FIELD_SPEC.reserveMonths 는 0~24 정수", () => {
    expect(FINANCE_FIELD_SPEC.reserveMonths).toEqual({ min: 0, max: 24, integer: true });
  });
});
