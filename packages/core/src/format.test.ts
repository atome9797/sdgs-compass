import { describe, expect, it } from "vitest";
import {
  addDays, clamp, dDayLabel, daysBetween, formatBytes, formatDate, formatDateShort, formatDateTime, formatNumber, formatPeople, formatPoints,
  formatYen, toIsoDate, toIsoDateTime,
} from "./format";

describe("날짜", () => {
  it("addDays 는 달·해·윤년 경계를 넘어요", () => {
    expect(addDays("2026-10-30", 1)).toBe("2026-10-31");
    expect(addDays("2026-10-30", 2)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2027-02-28", 1)).toBe("2027-03-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2026-10-30", 0)).toBe("2026-10-30");
  });

  it("daysBetween 은 to - from 이고 시각은 무시해요", () => {
    expect(daysBetween("2026-10-30", "2026-11-14")).toBe(15);
    expect(daysBetween("2026-11-14", "2026-10-30")).toBe(-15);
    expect(daysBetween("2026-10-30T23:59", "2026-10-31T00:01")).toBe(1);
    expect(daysBetween("2026-10-30", "2026-10-30")).toBe(0);
  });

  it("addDays 와 daysBetween 은 서로 되돌려요 (여름시간 영향 없음)", () => {
    for (const start of ["2026-03-07", "2026-10-30", "2027-03-13", "2026-11-01"]) {
      for (const n of [-400, -31, -1, 0, 1, 7, 30, 365]) {
        expect(daysBetween(start, addDays(start, n))).toBe(n);
      }
    }
  });

  it("형식이 아니면 예외", () => {
    expect(() => daysBetween("내일", "2026-01-01")).toThrow();
  });

  it("toIsoDate / toIsoDateTime 은 현지 시각 기준", () => {
    const d = new Date(2026, 9, 5, 7, 3);
    expect(toIsoDate(d)).toBe("2026-10-05");
    expect(toIsoDateTime(d)).toBe("2026-10-05T07:03");
  });

  it("언어별 날짜 표기", () => {
    expect(formatDate("2026-11-14", "ja")).toBe("2026年11月14日");
    expect(formatDate("2026-11-04", "ko")).toBe("2026년 11월 4일");
    expect(formatDateShort("2026-11-04")).toBe("11/4");
    expect(formatDateTime("2026-11-14T13:00", "ja")).toBe("2026年11月14日 13:00");
    expect(formatDateTime("2026-11-14", "ko")).toBe("2026년 11월 14일");
  });
});

describe("숫자·금액", () => {
  it("천 단위 쉼표", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(999)).toBe("999");
    expect(formatNumber(1000)).toBe("1,000");
    expect(formatNumber(1234567)).toBe("1,234,567");
    expect(formatNumber(-1234)).toBe("-1,234");
    expect(formatNumber(1999.6)).toBe("2,000");
  });

  it("엔·명·포인트·바이트", () => {
    expect(formatYen(30000, "ja")).toBe("¥30,000");
    expect(formatYen(30000, "ko")).toBe("30,000엔");
    expect(formatPeople(150, "ja")).toBe("150名");
    expect(formatPeople(150, "ko")).toBe("150명");
    expect(formatPoints(1480)).toBe("1,480 pt");
    expect(formatBytes(512)).toBe("512B");
    expect(formatBytes(2048)).toBe("2KB");
    expect(formatBytes(2516582)).toBe("2.4MB");
  });

  it("D-day 표기", () => {
    expect(dDayLabel(5, "ja")).toBe("D-5");
    expect(dDayLabel(0, "ko")).toBe("D-DAY");
    expect(dDayLabel(-1, "ja")).toBe("締切済み");
    expect(dDayLabel(-1, "ko")).toBe("마감");
  });

  it("clamp", () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-5, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });
});
