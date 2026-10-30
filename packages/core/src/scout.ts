// F-602 스카우트: 기업은 하루에 보낼 수 있는 수가 정해져 있고(스팸 방지), 같은 학생에게 거듭 보내지 않아요.
import type { Scout } from "./domain";

export const SCOUT_DAILY_LIMIT = 3;

/** 그날(YYYY-MM-DD) 이 기업이 보낸 스카우트 수 */
export function scoutsSentOn(scouts: readonly Scout[], companyId: string, day: string): number {
  return scouts.filter((s) => s.companyId === companyId && s.sentAt.slice(0, 10) === day).length;
}

export function remainingScouts(scouts: readonly Scout[], companyId: string, today: string, limit: number = SCOUT_DAILY_LIMIT): number {
  return Math.max(0, limit - scoutsSentOn(scouts, companyId, today));
}

export function alreadyScouted(scouts: readonly Scout[], companyId: string, studentId: string): boolean {
  return scouts.some((s) => s.companyId === companyId && s.studentId === studentId);
}

export function canSendScout(scouts: readonly Scout[], companyId: string, studentId: string, today: string): boolean {
  return remainingScouts(scouts, companyId, today) > 0 && !alreadyScouted(scouts, companyId, studentId);
}
