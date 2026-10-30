// 인재 카드의 상태(보낼 수 있음 / 이미 보냄 / 스카우트 안 받음 / 오늘 한도) 와 제안 종류.
import { MESSAGES } from "@sdgs-compass/core/messages";
import { candidateState, DEFAULT_SCOUT_KIND, SCOUT_KIND_KEY, SCOUT_KINDS } from "../scoutForm";

test("보낼 수 있는 후보", () => {
  expect(candidateState({ scoutable: true, alreadySent: false, canScout: true })).toBe("canScout");
});

test("보낼 수 없는 이유를 가려내요 (스카우트 안 받음 > 이미 보냄 > 오늘 한도)", () => {
  expect(candidateState({ scoutable: false, alreadySent: true, canScout: false })).toBe("notScoutable");
  expect(candidateState({ scoutable: true, alreadySent: true, canScout: false })).toBe("alreadySent");
  expect(candidateState({ scoutable: true, alreadySent: false, canScout: false })).toBe("limit");
});

test("제안 종류마다 문구가 있고 기본값은 목록 안에 있어요", () => {
  expect(SCOUT_KINDS).toEqual(["internship", "offer", "interview"]);
  expect(SCOUT_KINDS).toContain(DEFAULT_SCOUT_KIND);
  for (const key of Object.values(SCOUT_KIND_KEY)) expect(Object.keys(MESSAGES)).toContain(key);
});
