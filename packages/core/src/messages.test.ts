import { describe, expect, it } from "vitest";
import { placeholdersOf } from "./i18n";
import { LANGUAGE_PICKER, makeT, MESSAGES, translate, type MessageKey } from "./messages";
import { SKILL_IDS } from "./domain";
import { BADGE_CODES } from "./impact";
import type { ProposalError } from "./proposal";
import type { ChallengeDraftError } from "./challenge";
import type { PostError } from "./post";

const keys = Object.keys(MESSAGES) as MessageKey[];

describe("문구 사전 (일본어·한국어)", () => {
  it("문구가 충분히 있어요", () => {
    expect(keys.length).toBeGreaterThan(150);
  });

  it("키는 '영역.이름' 형식이에요", () => {
    for (const key of keys) expect(key).toMatch(/^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9_]+)+$/);
  });

  it("모든 문구에 두 언어가 다 있어요", () => {
    for (const key of keys) {
      const entry = MESSAGES[key];
      expect(typeof entry.ja === "string" && entry.ja.trim().length > 0, `${key} ja`).toBe(true);
      expect(typeof entry.ko === "string" && entry.ko.trim().length > 0, `${key} ko`).toBe(true);
    }
  });

  it("두 언어가 같은 {자리표시자}를 써요", () => {
    for (const key of keys) {
      const entry = MESSAGES[key];
      expect(placeholdersOf(entry.ja), key).toEqual(placeholdersOf(entry.ko));
    }
  });

  it("일본어에 한글이, 한국어에 가나(히라가나·가타카나)가 섞이지 않아요", () => {
    const bad: string[] = [];
    for (const key of keys) {
      const entry = MESSAGES[key];
      if (/[가-힣]/.test(entry.ja)) bad.push(`${key}: ja 에 한글 → ${entry.ja}`);
      if (/[ぁ-ゟ゠-ヿ]/.test(entry.ko)) bad.push(`${key}: ko 에 가나 → ${entry.ko}`);
    }
    expect(bad).toEqual([]);
  });

  it("남은 TODO·undefined·깨진 자리표시자가 없어요", () => {
    for (const key of keys) {
      for (const text of [MESSAGES[key].ja, MESSAGES[key].ko]) {
        expect(text, key).not.toMatch(/TODO|undefined|null|\?\?\?|\{\}|\{\s|\s\}/);
        const open = (text.match(/\{/g) ?? []).length;
        const close = (text.match(/\}/g) ?? []).length;
        expect(open, `${key} 중괄호`).toBe(close);
      }
    }
  });

  it("코드가 만드는 키들이 모두 있어요", () => {
    const wanted: string[] = [];
    for (const id of SKILL_IDS) wanted.push(`skill.${id}`);
    for (const code of BADGE_CODES) wanted.push(`badge.${code}.name`, `badge.${code}.desc`);
    for (const level of [1, 2, 3, 4, 5]) wanted.push(`level.${level}`);
    for (const award of ["grand", "excellence", "special"]) wanted.push(`award.${award}`);
    for (const reward of ["prize", "internship", "offer"]) wanted.push(`reward.${reward}`);
    for (const p of ["individual", "team", "both"]) wanted.push(`participation.${p}`);
    for (const s of ["open", "judging", "closed"]) wanted.push(`status.${s}`);
    for (const s of ["submitted", "reviewed", "awarded", "adopted"]) wanted.push(`proposalStatus.${s}`);
    for (const k of ["Internship", "Offer", "Interview"]) wanted.push(`inbox.kind${k}`);
    const proposalErrors: ProposalError[] = [
      "team_name_required", "team_name_too_long", "title_required", "title_too_long", "summary_required", "summary_too_long",
      "file_required", "file_type", "file_too_large", "video_url_invalid", "deadline_passed",
    ];
    for (const e of proposalErrors) wanted.push(`submit.error.${e}`);
    const challengeErrors: ChallengeDraftError[] = ["title_required", "summary_required", "sdgs_required", "prize_invalid", "days_invalid"];
    for (const e of challengeErrors) wanted.push(`new.error.${e}`);
    const postErrors: PostError[] = [
      "title_required", "title_too_long", "body_required", "body_too_long", "achievement_required", "achievement_not_found",
      "sdgs_required", "sdgs_too_many", "challenge_not_found", "contact_info",
    ];
    for (const e of postErrors) wanted.push(`post.error.${e}`);
    for (const f of ["all", "pr", "brag"]) wanted.push(`feed.filter.${f}`);
    for (const k of ["pr", "brag"]) wanted.push(`feed.chip.${k}`, `post.title.${k}`, `post.privacy.${k}`, `post.bodyPlaceholder.${k}`);
    for (const l of [0, 1, 2, 3]) wanted.push(`esg.certLevel${l}`);
    for (const r of ["sdg", "skill", "deadline", "prize", "internship"]) wanted.push(`reason.${r}`);
    const missing = wanted.filter((key) => !(key in MESSAGES));
    expect(missing).toEqual([]);
  });

  it("translate / makeT 가 자리표시자를 채워요", () => {
    const key = keys.find((k) => placeholdersOf(MESSAGES[k].ja).length > 0) as MessageKey;
    const names = placeholdersOf(MESSAGES[key].ja);
    const params = Object.fromEntries(names.map((n) => [n, `<${n}>`]));
    for (const locale of ["ja", "ko"] as const) {
      const text = translate(key, locale, params);
      for (const n of names) expect(text).toContain(`<${n}>`);
      expect(makeT(locale)(key, params)).toBe(text);
    }
  });

  it("첫 화면(언어 선택) 문구는 두 언어를 함께 가져요", () => {
    for (const value of Object.values(LANGUAGE_PICKER)) {
      expect(value.ja.length).toBeGreaterThan(0);
      expect(value.ko.length).toBeGreaterThan(0);
    }
  });
});
