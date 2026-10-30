// 새 챌린지 입력: 모집 기간 맞추기, SDGs 고르기(최대 3), core 검사와 맞물리는지.
import { MAX_CHALLENGE_DAYS, MAX_CHALLENGE_SDGS, MIN_CHALLENGE_DAYS, validateChallengeDraft } from "@sdgs-compass/core/challenge";
import { MESSAGES } from "@sdgs-compass/core/messages";
import {
  CHALLENGE_ERROR_KEY,
  clampDays,
  DAY_PRESETS,
  DEFAULT_CHALLENGE_DAYS,
  emptyChallengeForm,
  PARTICIPATION_OPTIONS,
  toChallengeDraft,
  toggleSdg,
} from "../newChallenge";
import { SAMPLE_CHALLENGE } from "../samples";

test("모집 기간은 core 가 허용하는 범위의 정수로", () => {
  expect(clampDays(0)).toBe(MIN_CHALLENGE_DAYS);
  expect(clampDays(100000)).toBe(MAX_CHALLENGE_DAYS);
  expect(clampDays(21)).toBe(21);
  expect(clampDays(14.4)).toBe(14);
  expect(clampDays(Number.NaN)).toBe(DEFAULT_CHALLENGE_DAYS);
  expect(clampDays(Number.POSITIVE_INFINITY)).toBe(DEFAULT_CHALLENGE_DAYS);
});

test("빠른 선택 칸은 범위 안에서 오름차순이고 양 끝이 최소·최대", () => {
  expect(DAY_PRESETS[0]).toBe(MIN_CHALLENGE_DAYS);
  expect(DAY_PRESETS[DAY_PRESETS.length - 1]).toBe(MAX_CHALLENGE_DAYS);
  expect([...DAY_PRESETS].sort((a, b) => a - b)).toEqual([...DAY_PRESETS]);
  expect(DAY_PRESETS.every((days) => clampDays(days) === days)).toBe(true);
  expect(DAY_PRESETS).toContain(DEFAULT_CHALLENGE_DAYS);
});

test("SDGs 를 켜고 끄고, 최대 개수를 넘기면 더 켜지지 않아요", () => {
  expect(toggleSdg([], 14)).toEqual([14]);
  expect(toggleSdg([14], 12)).toEqual([14, 12]);
  expect(toggleSdg([14, 12], 14)).toEqual([12]);
  const full = [1, 2, 3] as const;
  expect(MAX_CHALLENGE_SDGS).toBe(3);
  expect(toggleSdg(full, 4)).toEqual([1, 2, 3]);
  expect(toggleSdg(full, 4)).not.toBe(full);
  expect(toggleSdg(full, 2)).toEqual([1, 3]);
  expect(toggleSdg([1, 2], 3, 2)).toEqual([1, 2]);
});

test("처음 입력 상태: 제목·개요·SDGs 가 비어 있어서 core 검사가 세 가지를 알려줘요", () => {
  const form = emptyChallengeForm();
  expect(form.days).toBe(DEFAULT_CHALLENGE_DAYS);
  expect(PARTICIPATION_OPTIONS).toContain(form.participation);
  expect(validateChallengeDraft(toChallengeDraft(form))).toEqual(["title_required", "summary_required", "sdgs_required"]);
});

test("샘플을 채우면 검사를 통과하고, 상금 글자는 숫자만 정수로 바뀌어요", () => {
  const form = { ...emptyChallengeForm(), title: SAMPLE_CHALLENGE.title.ja, summary: SAMPLE_CHALLENGE.summary.ja, sdgIds: SAMPLE_CHALLENGE.sdgIds, prizeText: "¥80,000" };
  const draft = toChallengeDraft(form);
  expect(draft.prizeYen).toBe(80000);
  expect(draft.sdgIds).toEqual([14, 12]);
  expect(validateChallengeDraft(draft)).toEqual([]);
  expect(validateChallengeDraft(toChallengeDraft({ ...form, prizeText: "" })).length).toBe(0);
  expect(validateChallengeDraft(toChallengeDraft({ ...form, days: MAX_CHALLENGE_DAYS + 1 }))).toEqual(["days_invalid"]);
});

test("검사 오류마다 두 언어 문구가 있어요", () => {
  for (const key of Object.values(CHALLENGE_ERROR_KEY)) {
    expect(Object.keys(MESSAGES)).toContain(key);
  }
  expect(Object.keys(CHALLENGE_ERROR_KEY).sort()).toEqual(["days_invalid", "prize_invalid", "sdgs_required", "summary_required", "title_required"]);
});
