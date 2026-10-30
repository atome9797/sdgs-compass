import { describe, expect, it } from "vitest";
import type { Scout } from "./domain";
import { alreadyScouted, canSendScout, remainingScouts, SCOUT_DAILY_LIMIT, scoutsSentOn } from "./scout";

const scout = (id: string, studentId: string, sentAt: string, companyId = "co-1"): Scout => ({
  id, companyId, studentId, kind: "interview", message: "m", sentAt, status: "sent",
});

describe("스카우트 제한", () => {
  it("하루 3건까지", () => {
    expect(SCOUT_DAILY_LIMIT).toBe(3);
    const today = "2026-10-30";
    const list = [scout("1", "a", `${today}T09:00`), scout("2", "b", `${today}T10:00`)];
    expect(scoutsSentOn(list, "co-1", today)).toBe(2);
    expect(remainingScouts(list, "co-1", today)).toBe(1);
    expect(canSendScout(list, "co-1", "c", today)).toBe(true);
    const full = [...list, scout("3", "c", `${today}T11:00`)];
    expect(remainingScouts(full, "co-1", today)).toBe(0);
    expect(canSendScout(full, "co-1", "d", today)).toBe(false);
  });

  it("다른 날·다른 기업의 건수는 세지 않아요", () => {
    const list = [scout("1", "a", "2026-10-29T09:00"), scout("2", "b", "2026-10-30T09:00", "co-2")];
    expect(scoutsSentOn(list, "co-1", "2026-10-30")).toBe(0);
    expect(remainingScouts(list, "co-1", "2026-10-30")).toBe(3);
  });

  it("같은 학생에게는 거듭 보내지 않아요", () => {
    const list = [scout("1", "a", "2026-10-01T09:00")];
    expect(alreadyScouted(list, "co-1", "a")).toBe(true);
    expect(alreadyScouted(list, "co-2", "a")).toBe(false);
    expect(canSendScout(list, "co-1", "a", "2026-10-30")).toBe(false);
    expect(canSendScout(list, "co-1", "b", "2026-10-30")).toBe(true);
  });
});
