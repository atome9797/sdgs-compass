import { describe, expect, it } from "vitest";
import { formatCompact, formatMan, formatManYen, formatPercent, formatPointDelta, formatSignedNumber, formatSignedPercent } from "./adminFormat";

describe("만 단위 표기", () => {
  it("소수 첫째 자리까지, 딱 떨어지면 정수로 보여요", () => {
    expect(formatMan(2_010_000)).toBe("201");
    expect(formatMan(2_016_000)).toBe("201.6");
    expect(formatMan(-1_110_000)).toBe("-111");
    expect(formatMan(-349_412)).toBe("-34.9");
    expect(formatMan(0)).toBe("0");
    expect(formatMan(-1)).toBe("0");
    expect(formatMan(4_000)).toBe("0.4");
  });

  it("1,000만 이상이면 정수에 천 단위 쉼표", () => {
    expect(formatMan(12_345_678)).toBe("1,235");
    expect(formatMan(-30_000_000)).toBe("-3,000");
  });

  it("숫자가 아니면 줄표", () => {
    expect(formatMan(Number.NaN)).toBe("-");
    expect(formatMan(Number.POSITIVE_INFINITY)).toBe("-");
  });

  it("언어별 단위", () => {
    expect(formatManYen(2_010_000, "ja")).toBe("201万円");
    expect(formatManYen(2_010_000, "ko")).toBe("201만 엔");
    expect(formatManYen(-1_110_000, "ja")).toBe("-111万円");
  });
});

describe("퍼센트·증감", () => {
  it("비율을 퍼센트로", () => {
    expect(formatPercent(0.0834)).toBe("8.3%");
    expect(formatPercent(0.5, 0)).toBe("50%");
    expect(formatPercent(-0.00001, 1)).toBe("0.0%");
    expect(formatPercent(Number.NaN)).toBe("-");
  });

  it("증감에는 부호가 붙고, 0 은 부호 없이", () => {
    expect(formatSignedPercent(0.042)).toBe("+4.2%");
    expect(formatSignedPercent(-0.031)).toBe("-3.1%");
    expect(formatSignedPercent(0)).toBe("0.0%");
    expect(formatSignedPercent(0.00001)).toBe("0.0%");
    expect(formatPointDelta(0.002)).toBe("+0.2pt");
    expect(formatPointDelta(-0.0125)).toBe("-1.3pt");
    expect(formatPointDelta(0)).toBe("0.0pt");
    expect(formatSignedNumber(12)).toBe("+12");
    expect(formatSignedNumber(-1234)).toBe("-1,234");
    expect(formatSignedNumber(0.2)).toBe("0");
  });
});

describe("눈금용 짧은 숫자", () => {
  it("10,000 미만은 그대로, 그 이상은 K·M", () => {
    expect(formatCompact(0)).toBe("0");
    expect(formatCompact(9_999)).toBe("9,999");
    expect(formatCompact(12_000)).toBe("12K");
    expect(formatCompact(12_500)).toBe("12.5K");
    expect(formatCompact(1_200_000)).toBe("1.2M");
    expect(formatCompact(-45_000)).toBe("-45K");
  });
});
