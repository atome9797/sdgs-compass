// SNS 글쓰기(자랑 글 · 홍보 글)의 입력 모음: 처음 값, SDGs·챌린지 고르기, PostDraft 변환, 칸별 오류, 미리보기, 올린 뒤의 안내 매개변수.
// 샘플 데이터(createInitialState)와 core 의 검사·reducer 를 그대로 써서, 화면이 하는 일(입력 → 검사 → 올리기)이 core 와 맞물리는지도 확인해요.
import type { DemoState } from "@sdgs-compass/core/domain";
import { makeT } from "@sdgs-compass/core/messages";
import { POST_LIMITS, postContext, validatePostDraft } from "@sdgs-compass/core/post";
import { selectComposer, selectFeed, type ComposerVM } from "@sdgs-compass/core/selectors";
import { reducer } from "@sdgs-compass/core/state";
import { createInitialState } from "@sdgs-compass/data/seed";
import { postedHref } from "../nav";
import {
  CLEAR_POSTED_PARAMS,
  counterOf,
  errorsByField,
  fieldsOfError,
  initialPostForm,
  parsePostedParams,
  pickChallenge,
  previewPost,
  toggleFormSdg,
  toPostDraft,
  type PostFormState,
} from "../postForm";

const TODAY = "2026-10-30";
const demo: DemoState = createInitialState(TODAY);
const t = makeT("ko");

function bragComposer(activityId?: string): ComposerVM {
  return selectComposer(demo, "ko", "brag", activityId === undefined ? {} : { activityId });
}
function prComposer(challengeId?: string): ComposerVM {
  return selectComposer(demo, "ko", "pr", challengeId === undefined ? {} : { challengeId });
}
function withBody(form: PostFormState, body: string, title = form.title): PostFormState {
  return { ...form, body, title };
}

// ───────── 처음 값 ─────────

test("자랑 글 처음 값: 첫 실적(수상 → 제출·참가 순)이 골라져 있고 SDGs·챌린지 칸은 비어 있어요", () => {
  const composer = bragComposer();
  const form = initialPostForm(composer);
  expect(form).toEqual({ kind: "brag", body: "", title: "", activityId: composer.activities[0].id, sdgIds: [], sdgsTouched: false, challengeId: null, requestOfficial: false });
});

test("카드뉴스 화면에서 넘어오면 그 실적을 미리 골라 둬요 (없는 id 면 첫 실적)", () => {
  expect(initialPostForm(bragComposer("h-4b")).activityId).toBe("h-4b");
  expect(initialPostForm(bragComposer("nope")).activityId).toBe(bragComposer().activities[0].id);
});

test("실적이 하나도 없으면 고른 실적도 없어요", () => {
  const composer: ComposerVM = { ...bragComposer(), activities: [], selectedActivityId: null };
  expect(initialPostForm(composer).activityId).toBeNull();
});

test("홍보 글 처음 값: 챌린지는 안 고른 채, SDGs 는 기업의 SDGs 로 채워져 있어요", () => {
  const composer = prComposer();
  const form = initialPostForm(composer);
  expect(form).toMatchObject({ kind: "pr", body: "", title: "", activityId: null, challengeId: null, requestOfficial: false, sdgsTouched: false });
  expect(form.sdgIds).toEqual(composer.companySdgIds);
  expect(form.sdgIds.length).toBeGreaterThan(0);
  // 화면 안에서 고쳐도 core 가 준 배열이 바뀌면 안 돼요
  expect(form.sdgIds).not.toBe(composer.defaultSdgIds);
});

test("응모자 화면에서 넘어오면 그 챌린지를 미리 고르고 SDGs 도 그 챌린지 것으로 채워요", () => {
  const composer = prComposer("ch-asaichi");
  const form = initialPostForm(composer);
  expect(form.challengeId).toBe("ch-asaichi");
  expect(form.sdgIds).toEqual([14, 8]);
  // 우리 회사 것이 아닌 챌린지는 고를 수 없어요
  expect(initialPostForm(prComposer("ch-solar")).challengeId).toBeNull();
});

// ───────── 입력 → PostDraft ─────────

test("자랑 글 초안에는 제목·SDGs·챌린지·공식 신청이 없어요", () => {
  const form = withBody(initialPostForm(bragComposer("h-5b")), "해커톤에서 우수상을 받았어요");
  expect(toPostDraft(form)).toEqual({ kind: "brag", body: "해커톤에서 우수상을 받았어요", activityId: "h-5b" });
});

test("홍보 글 초안에는 실적이 없고 나머지 칸이 모두 들어가요", () => {
  const form: PostFormState = { ...withBody(initialPostForm(prComposer("ch-bottle")), "참여해 주세요", "텀블러 챌린지"), requestOfficial: true };
  expect(toPostDraft(form)).toEqual({ kind: "pr", body: "참여해 주세요", title: "텀블러 챌린지", sdgIds: [12, 14], challengeId: "ch-bottle", requestOfficial: true });
});

// ───────── SDGs 고르기 ─────────

test("SDGs 는 켜고 끄고, 최대 3개까지만 고를 수 있어요 (만지면 sdgsTouched)", () => {
  let form: PostFormState = { ...initialPostForm(prComposer()), sdgIds: [], sdgsTouched: false };
  form = toggleFormSdg(form, 4);
  expect(form).toMatchObject({ sdgIds: [4], sdgsTouched: true });
  form = toggleFormSdg(toggleFormSdg(form, 5), 6);
  expect(form.sdgIds).toEqual([4, 5, 6]);
  expect(POST_LIMITS.maxSdgs).toBe(3);
  // 네 번째는 무시
  expect(toggleFormSdg(form, 7).sdgIds).toEqual([4, 5, 6]);
  // 켜져 있는 것을 누르면 꺼져요
  expect(toggleFormSdg(form, 5).sdgIds).toEqual([4, 6]);
});

test("SDGs 를 전부 끄면 core 검사가 막아요 (sdgs_required)", () => {
  const form = withBody(toggleFormSdg({ ...initialPostForm(prComposer()), sdgIds: [4], sdgsTouched: false }, 4), "내용", "제목");
  expect(form.sdgIds).toEqual([]);
  expect(validatePostDraft(toPostDraft(form), postContext(demo))).toEqual(["sdgs_required"]);
});

// ───────── 챌린지 고르기 ─────────

test("챌린지를 고르면 SDGs 가 그 챌린지 것으로 바뀌고, 연결을 끊으면 기업의 SDGs 로 돌아가요", () => {
  const composer = prComposer();
  let form = initialPostForm(composer);
  form = pickChallenge(form, "ch-asaichi", composer);
  expect(form).toMatchObject({ challengeId: "ch-asaichi", sdgIds: [14, 8], sdgsTouched: false });
  form = pickChallenge(form, "ch-bottle", composer);
  expect(form.sdgIds).toEqual([12, 14]);
  form = pickChallenge(form, null, composer);
  expect(form).toMatchObject({ challengeId: null, sdgIds: composer.companySdgIds });
});

test("SDGs 를 직접 골랐다면 챌린지를 바꿔도 고른 그대로 둬요", () => {
  const composer = prComposer();
  let form = toggleFormSdg({ ...initialPostForm(composer), sdgIds: [], sdgsTouched: false }, 3);
  form = pickChallenge(form, "ch-asaichi", composer);
  expect(form).toMatchObject({ challengeId: "ch-asaichi", sdgIds: [3], sdgsTouched: true });
  form = pickChallenge(form, null, composer);
  expect(form).toMatchObject({ challengeId: null, sdgIds: [3] });
});

test("목록에 없는 챌린지는 무시해요 (아무것도 바뀌지 않아요)", () => {
  const composer = prComposer();
  const form = initialPostForm(composer);
  expect(pickChallenge(form, "ch-solar", composer)).toBe(form);
  expect(pickChallenge(form, "nope", composer)).toBe(form);
});

// ───────── 글자 수 ─────────

test("글자 수: 앞뒤 공백은 빼고 이모지·한자도 1글자, 한도를 넘으면 over", () => {
  expect(counterOf("", 200)).toEqual({ count: 0, over: false });
  expect(counterOf("  안녕  ", 200)).toEqual({ count: 2, over: false });
  expect(counterOf("🎉🎉🎉", 200)).toEqual({ count: 3, over: false });
  expect(counterOf("가".repeat(200), 200)).toEqual({ count: 200, over: false });
  expect(counterOf("가".repeat(201), 200)).toEqual({ count: 201, over: true });
  expect(counterOf("a".repeat(POST_LIMITS.prTitle + 1), POST_LIMITS.prTitle).over).toBe(true);
});

// ───────── 오류를 칸별로 ─────────

test("오류마다 붙는 칸", () => {
  const pr = { kind: "pr", title: "제목", body: "본문" } as const;
  expect(fieldsOfError("achievement_required", pr)).toEqual(["activity"]);
  expect(fieldsOfError("achievement_not_found", pr)).toEqual(["activity"]);
  expect(fieldsOfError("title_required", pr)).toEqual(["title"]);
  expect(fieldsOfError("title_too_long", pr)).toEqual(["title"]);
  expect(fieldsOfError("body_required", pr)).toEqual(["body"]);
  expect(fieldsOfError("body_too_long", pr)).toEqual(["body"]);
  expect(fieldsOfError("sdgs_required", pr)).toEqual(["sdgs"]);
  expect(fieldsOfError("sdgs_too_many", pr)).toEqual(["sdgs"]);
  expect(fieldsOfError("challenge_not_found", pr)).toEqual(["challenge"]);
});

test("연락처 오류는 연락처가 들어 있는 칸에 붙어요 (홍보 글은 제목·본문 둘 다일 수도 있어요)", () => {
  expect(fieldsOfError("contact_info", { kind: "pr", title: "문의 03-1234-5678", body: "참여해 주세요" })).toEqual(["title"]);
  expect(fieldsOfError("contact_info", { kind: "pr", title: "참여 모집", body: "메일은 someone@example.com 으로" })).toEqual(["body"]);
  expect(fieldsOfError("contact_info", { kind: "pr", title: "someone@example.com", body: "010-1234-5678" })).toEqual(["title", "body"]);
  // 자랑 글에는 제목 칸이 없어요
  expect(fieldsOfError("contact_info", { kind: "brag", title: "010-1234-5678", body: "someone@example.com" })).toEqual(["body"]);
});

test("한 칸에 오류가 여럿이면 먼저 나온 것 하나만 보여 줘요", () => {
  const form = { kind: "pr", title: "", body: "someone@example.com" } as const;
  expect(errorsByField(["title_required", "body_too_long", "contact_info"], form)).toEqual({ title: "title_required", body: "body_too_long" });
  expect(errorsByField(["contact_info"], form)).toEqual({ body: "contact_info" });
  expect(errorsByField([], form)).toEqual({});
});

test("아무것도 안 쓴 홍보 글은 제목·본문 칸에 오류가 떠요 (SDGs 는 기본값이 있어서 괜찮아요)", () => {
  const form = initialPostForm(prComposer());
  const errors = validatePostDraft(toPostDraft(form), postContext(demo));
  expect(errors).toEqual(["title_required", "body_required"]);
  expect(errorsByField(errors, form)).toEqual({ title: "title_required", body: "body_required" });
});

test("아무것도 안 쓴 자랑 글은 본문 칸만 오류예요 (실적은 미리 골라져 있어요)", () => {
  const form = initialPostForm(bragComposer());
  const errors = validatePostDraft(toPostDraft(form), postContext(demo));
  expect(errors).toEqual(["body_required"]);
  expect(errorsByField(errors, form)).toEqual({ body: "body_required" });
});

test("본문이 한도를 넘거나 연락처가 있으면 core 가 막아요", () => {
  const long = withBody(initialPostForm(bragComposer()), "가".repeat(POST_LIMITS.bragBody + 1));
  expect(validatePostDraft(toPostDraft(long), postContext(demo))).toEqual(["body_too_long"]);
  const contact = withBody(initialPostForm(bragComposer()), "연락은 someone@example.com 으로 주세요");
  const errors = validatePostDraft(toPostDraft(contact), postContext(demo));
  expect(errors).toEqual(["contact_info"]);
  expect(errorsByField(errors, contact)).toEqual({ body: "contact_info" });
});

// ───────── 미리보기 ─────────

test("자랑 글 미리보기: 고른 실적의 이름·SDGs 가 붙고, 동작 단추 없이 모양만 보여 줘요", () => {
  const composer = bragComposer("h-4b");
  const preview = previewPost(composer, withBody(initialPostForm(composer), "  특별상을 받았어요!  "), t);
  expect(preview).toMatchObject({
    id: "preview",
    kind: "brag",
    chipLabel: "자랑",
    authorName: "Mina",
    authorMeta: "Lv.3",
    title: null,
    body: "특별상을 받았어요!",
    sdgIds: [11, 10],
    dateLabel: "",
    likes: 0,
    likedByMe: false,
    mine: true,
    canLike: false,
    canDelete: false,
    challenge: null,
    official: null,
  });
  expect(preview.achievement).toMatchObject({ title: "🏆 특별상 · 다국어 방재 지도 제안", sdgIds: [11, 10], certificateId: null });
});

test("자랑 글 미리보기: 실적을 못 골랐으면 실적도 SDGs 도 비어 있어요", () => {
  const composer = bragComposer();
  const preview = previewPost(composer, { ...initialPostForm(composer), activityId: null }, t);
  expect(preview.achievement).toBeNull();
  expect(preview.sdgIds).toEqual([]);
});

test("홍보 글 미리보기: 제목(앞뒤 공백 뺌)·고른 SDGs·연결한 챌린지, 공식 SNS 를 신청하면 예정일과 게시료", () => {
  const composer = prComposer();
  const base = withBody(pickChallenge(initialPostForm(composer), "ch-bottle", composer), "많이 참여해 주세요", "  텀블러 챌린지  ");
  const plain = previewPost(composer, base, t);
  expect(plain).toMatchObject({
    kind: "pr",
    chipLabel: "PR",
    authorName: "미나토 해양푸드(주)",
    verified: true,
    title: "텀블러 챌린지",
    body: "많이 참여해 주세요",
    sdgIds: [12, 14],
    achievement: null,
    challenge: { id: "ch-bottle", title: "텀블러 지참을 확산하는 캠페인 기획" },
    official: null,
    mine: true,
  });
  const official = previewPost(composer, { ...base, requestOfficial: true }, t);
  expect(official.official).toEqual({ label: "게시 예정일: 2026년 11월 2일", feeLabel: "게시료 3,000엔(샘플)" });
});

test("홍보 글 미리보기: 챌린지를 연결하지 않으면 challenge 가 없어요", () => {
  const composer = prComposer();
  expect(previewPost(composer, initialPostForm(composer), t).challenge).toBeNull();
});

// ───────── 화면이 하는 일 전체: 입력 → 검사 → 올리기 → 피드 ─────────

test("자랑 글을 올리면 피드 맨 위에 내 글로 뜨고, 좋아요는 못 눌러도 지울 수는 있어요", () => {
  const composer = bragComposer("h-5b");
  const form = withBody(initialPostForm(composer), "해커톤에서 우수상을 받았어요!");
  expect(validatePostDraft(toPostDraft(form), postContext(demo))).toEqual([]);
  const next = reducer(demo, { type: "createPost", draft: toPostDraft(form), at: `${TODAY}T10:00` });
  const feed = selectFeed(next, "ko", "b2c", "all");
  expect(feed.posts[0]).toMatchObject({ kind: "brag", body: "해커톤에서 우수상을 받았어요!", mine: true, canLike: false, canDelete: true, likes: 0 });
  expect(feed.posts[0].sdgIds).toEqual([14, 12]);
  expect(feed.filters.map((filter) => filter.count)).toEqual([9, 4, 5]);
  // 기업 계정에서는 학생의 글이니 내 글이 아니에요
  expect(selectFeed(next, "ko", "b2b", "all").posts[0]).toMatchObject({ mine: false, canLike: true, canDelete: false });
});

test("홍보 글에 공식 SNS 를 신청하면 화면에 보여 준 예정일(nextDate)로 배정돼요", () => {
  const composer = prComposer("ch-bottle");
  const form: PostFormState = { ...withBody(initialPostForm(composer), "참여해 주세요", "텀블러 챌린지"), requestOfficial: true };
  const next = reducer(demo, { type: "createPost", draft: toPostDraft(form), at: `${TODAY}T10:00` });
  const created = next.posts[0];
  expect(created.kind).toBe("pr");
  if (created.kind !== "pr") throw new Error("pr post expected");
  expect(created.official).toMatchObject({ on: composer.official.nextDate, status: "scheduled" });
  expect(created.challengeId).toBe("ch-bottle");
  // 신청하지 않으면 예정일이 없어요
  const without = reducer(demo, { type: "createPost", draft: toPostDraft({ ...form, requestOfficial: false }), at: `${TODAY}T10:00` });
  expect(selectFeed(without, "ko", "b2b", "all").posts[0].official).toBeNull();
});

test("검사에 걸린 초안은 reducer 도 받지 않아요 (같은 검사를 한 번 더 해요)", () => {
  const empty = initialPostForm(prComposer());
  expect(reducer(demo, { type: "createPost", draft: toPostDraft(empty), at: `${TODAY}T10:00` })).toBe(demo);
});

// ───────── 올린 뒤의 안내 매개변수 ─────────

test("피드가 ?posted=1 로 열리면 안내를 보여 줘요 (공식 SNS 신청 날짜는 official)", () => {
  expect(parsePostedParams({ posted: "1" })).toEqual({ officialOn: null });
  expect(parsePostedParams({ posted: "1", official: "2026-11-02" })).toEqual({ officialOn: "2026-11-02" });
  expect(parsePostedParams({ posted: ["1"], official: ["2026-11-02", "2026-12-01"] })).toEqual({ officialOn: "2026-11-02" });
});

test("posted 가 1 이 아니면 안내가 없어요", () => {
  expect(parsePostedParams({})).toBeNull();
  expect(parsePostedParams({ posted: "" })).toBeNull();
  expect(parsePostedParams({ posted: "0" })).toBeNull();
  expect(parsePostedParams({ posted: "true" })).toBeNull();
  expect(parsePostedParams({ official: "2026-11-02" })).toBeNull();
});

test("날짜 모양이 아닌 official 은 무시해요 (주소에 아무 글자나 넣어도 화면에 나오지 않아요)", () => {
  for (const official of ["", "tomorrow", "2026-1-2", "2026-11-02T10:00", "<b>2026-11-02</b>", "20261102"]) {
    expect(parsePostedParams({ posted: "1", official })).toEqual({ officialOn: null });
  }
});

test("올린 뒤 가는 주소(postedHref)의 매개변수를 피드가 그대로 읽어요", () => {
  const read = (href: string) => parsePostedParams(Object.fromEntries(new URLSearchParams(href.split("?")[1])));
  expect(read(postedHref("b2c", null))).toEqual({ officialOn: null });
  expect(read(postedHref("b2b", null))).toEqual({ officialOn: null });
  expect(read(postedHref("b2b", "2026-11-02"))).toEqual({ officialOn: "2026-11-02" });
});

test("안내를 닫을 때 넣는 값을 읽으면 안내가 없는 것으로 보여요", () => {
  expect(parsePostedParams(CLEAR_POSTED_PARAMS)).toBeNull();
  expect(Object.keys(CLEAR_POSTED_PARAMS).sort()).toEqual(["official", "posted"]);
});
