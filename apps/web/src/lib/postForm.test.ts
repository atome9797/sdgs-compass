import { describe, expect, it } from "vitest";
import { formatDateShort } from "@sdgs-compass/core/format";
import { nextOfficialDate, POST_LIMITS, postContext, validatePostDraft } from "@sdgs-compass/core/post";
import type { PostError } from "@sdgs-compass/core/post";
import type { SdgId } from "@sdgs-compass/core/sdg";
import { selectComposer } from "@sdgs-compass/core/selectors";
import { createInitialState } from "@sdgs-compass/data/seed";
import { chooseChallenge, counterOf, initialPostFields, previewDraft, previewPost, toggleSdg, toPostDraft, visibleFieldErrors, type PostFields } from "./postForm";

const TODAY = "2026-10-30";
const demo = createInitialState(TODAY);
const context = postContext(demo);

const bragComposer = (activityId: string | null = null) => selectComposer(demo, "ja", "brag", { activityId });
const prComposer = (challengeId: string | null = null) => selectComposer(demo, "ja", "pr", { challengeId });
const withFields = (base: PostFields, over: Partial<PostFields>): PostFields => ({ ...base, ...over });

const NOTHING = { tried: false, touched: [] } as const;
const TITLE_PLACEHOLDER = "タイトルを入力";

describe("처음 값", () => {
  it("자랑 글: 맨 위 실적이 골라져 있고, 나머지는 비어 있어요", () => {
    const composer = bragComposer();
    const fields = initialPostFields(composer);
    expect(fields.activityId).toBe(composer.activities[0].id);
    expect(fields).toMatchObject({ body: "", title: "", sdgIds: [], sdgTouched: false, challengeId: null, requestOfficial: false });
  });

  it("자랑 글: 다른 화면에서 넘긴 실적이 있으면 그것이 골라져 있어요", () => {
    const composer = bragComposer();
    const second = composer.activities[1].id;
    expect(initialPostFields(bragComposer(second)).activityId).toBe(second);
    // 내 실적이 아닌 값은 무시하고 맨 위 실적으로
    expect(initialPostFields(bragComposer("남의 실적")).activityId).toBe(composer.activities[0].id);
  });

  it("홍보 글: 기업의 SDGs 가 미리 골라져 있어요 (원본 배열을 같이 쓰지 않아요)", () => {
    const composer = prComposer();
    const fields = initialPostFields(composer);
    expect(fields.sdgIds).toEqual(composer.defaultSdgIds);
    expect(fields.sdgIds).not.toBe(composer.defaultSdgIds);
    expect(fields.challengeId).toBeNull();
    expect(fields.activityId).toBe(composer.selectedActivityId);
    expect(fields.requestOfficial).toBe(false);
  });

  it("홍보 글: 응모자 화면에서 넘긴 챌린지가 있으면 그 챌린지와 SDGs 로 시작해요", () => {
    const composer = prComposer("ch-bottle");
    const challenge = composer.challenges.find((c) => c.id === "ch-bottle");
    expect(challenge).toBeDefined();
    const fields = initialPostFields(composer);
    expect(fields.challengeId).toBe("ch-bottle");
    expect(fields.sdgIds).toEqual(challenge?.sdgIds);
  });

  it("홍보 글: 우리 회사 것이 아닌 챌린지는 무시해요", () => {
    const fields = initialPostFields(prComposer("ch-다른회사"));
    expect(fields.challengeId).toBeNull();
    expect(fields.sdgIds).toEqual(prComposer().defaultSdgIds);
  });
});

describe("입력값 → 초안", () => {
  it("자랑 글 초안에는 본문과 실적만 들어가요", () => {
    const fields = withFields(initialPostFields(bragComposer()), { body: "初めての受賞です！", title: "버려지는 제목", sdgIds: [1], requestOfficial: true });
    expect(toPostDraft("brag", fields)).toEqual({ kind: "brag", body: "初めての受賞です！", activityId: fields.activityId });
  });

  it("홍보 글 초안에는 제목·본문·SDGs·챌린지·공식 게시 신청이 들어가요", () => {
    const fields = withFields(initialPostFields(prComposer("ch-bottle")), { title: "マイボトル企画を始めます", body: "学生の皆さんの案を待っています。", requestOfficial: true });
    expect(toPostDraft("pr", fields)).toEqual({
      kind: "pr",
      title: "マイボトル企画を始めます",
      body: "学生の皆さんの案を待っています。",
      sdgIds: fields.sdgIds,
      challengeId: "ch-bottle",
      requestOfficial: true,
    });
  });

  it("처음 값에 본문(·제목)만 채우면 core 검사를 그대로 통과해요", () => {
    const brag = withFields(initialPostFields(bragComposer()), { body: "初めての受賞です！" });
    expect(validatePostDraft(toPostDraft("brag", brag), context)).toEqual([]);
    const pr = withFields(initialPostFields(prComposer()), { title: "朝市の新しい試み", body: "容器を減らす取り組みを始めました。" });
    expect(validatePostDraft(toPostDraft("pr", pr), context)).toEqual([]);
  });

  it("비어 있는 처음 값은 core 검사에서 막혀요", () => {
    expect(validatePostDraft(toPostDraft("brag", initialPostFields(bragComposer())), context)).toEqual(["body_required"]);
    expect(validatePostDraft(toPostDraft("pr", initialPostFields(prComposer())), context)).toEqual(["title_required", "body_required"]);
  });
});

describe("SDGs 켜고 끄기", () => {
  const base = withFields(initialPostFields(prComposer()), { sdgIds: [] });

  it("켜고 끄면 직접 바꿨다는 표시가 남아요", () => {
    const on = toggleSdg(base, 14);
    expect(on.sdgIds).toEqual([14]);
    expect(on.sdgTouched).toBe(true);
    const off = toggleSdg(on, 14);
    expect(off.sdgIds).toEqual([]);
    expect(off.sdgTouched).toBe(true);
    expect(base.sdgTouched).toBe(false); // 원본은 그대로
  });

  it("켠 순서가 그대로 남아요", () => {
    const order: SdgId[] = [12, 14, 4];
    const fields = order.reduce((current, id) => toggleSdg(current, id), base);
    expect(fields.sdgIds).toEqual([12, 14, 4]);
  });

  it("최대 3개: 4번째는 켜지지 않고, 아무것도 바뀌지 않아요", () => {
    const full = withFields(base, { sdgIds: [14, 12, 4], sdgTouched: false });
    expect(full.sdgIds).toHaveLength(POST_LIMITS.maxSdgs);
    const same = toggleSdg(full, 7);
    expect(same).toBe(full);
    expect(same.sdgTouched).toBe(false);
  });

  it("3개가 켜져 있어도 끄는 것은 돼요", () => {
    const full = withFields(base, { sdgIds: [14, 12, 4] });
    expect(toggleSdg(full, 12).sdgIds).toEqual([14, 4]);
  });
});

describe("챌린지 고르기", () => {
  const composer = prComposer();
  const bottle = composer.challenges.find((c) => c.id === "ch-bottle");
  const asaichi = composer.challenges.find((c) => c.id === "ch-asaichi");

  it("SDGs 를 직접 바꾸지 않았다면, 고른 챌린지의 SDGs 로 다시 채워요", () => {
    const fields = chooseChallenge(initialPostFields(composer), composer, "ch-asaichi");
    expect(fields.challengeId).toBe("ch-asaichi");
    expect(fields.sdgIds).toEqual(asaichi?.sdgIds);
    expect(fields.sdgTouched).toBe(false);
    // 다른 챌린지로 바꾸면 또 따라가요
    expect(chooseChallenge(fields, composer, "ch-bottle").sdgIds).toEqual(bottle?.sdgIds);
  });

  it("챌린지를 빼면 기업의 SDGs 로 돌아가요", () => {
    const picked = chooseChallenge(initialPostFields(composer), composer, "ch-asaichi");
    const none = chooseChallenge(picked, composer, null);
    expect(none.challengeId).toBeNull();
    expect(none.sdgIds).toEqual(composer.companySdgIds);
  });

  it("SDGs 를 직접 바꿨다면 사용자의 선택을 덮어쓰지 않아요", () => {
    const mine = toggleSdg(withFields(initialPostFields(composer), { sdgIds: [] }), 4);
    const fields = chooseChallenge(mine, composer, "ch-asaichi");
    expect(fields.challengeId).toBe("ch-asaichi");
    expect(fields.sdgIds).toEqual([4]);
    expect(fields.sdgTouched).toBe(true);
  });

  it("목록에 없는 챌린지는 고를 수 없어요 (연결 안 함으로)", () => {
    const fields = chooseChallenge(initialPostFields(composer), composer, "ch-다른회사");
    expect(fields.challengeId).toBeNull();
    expect(fields.sdgIds).toEqual(composer.companySdgIds);
  });
});

describe("오류를 보여 주는 때", () => {
  const brag = initialPostFields(bragComposer());
  const pr = initialPostFields(prComposer());
  const errorsOf = (kind: "brag" | "pr", fields: PostFields) => validatePostDraft(toPostDraft(kind, fields), context);

  it("비었다는 오류는 칸을 만지기 전·올리기를 누르기 전에는 숨겨요", () => {
    expect(visibleFieldErrors(errorsOf("brag", brag), "brag", brag, NOTHING)).toEqual({});
    expect(visibleFieldErrors(errorsOf("pr", pr), "pr", pr, NOTHING)).toEqual({});
  });

  it("만져 본 칸의 오류만 보여요", () => {
    const shown = visibleFieldErrors(errorsOf("pr", pr), "pr", pr, { tried: false, touched: ["title"] });
    expect(shown).toEqual({ title: ["title_required"] });
    const both = visibleFieldErrors(errorsOf("pr", pr), "pr", pr, { tried: false, touched: ["title", "body"] });
    expect(both).toEqual({ title: ["title_required"], body: ["body_required"] });
  });

  it("올리기를 눌러 보면 모든 칸의 오류가 보여요", () => {
    expect(visibleFieldErrors(errorsOf("brag", brag), "brag", brag, { tried: true, touched: [] })).toEqual({ body: ["body_required"] });
    expect(visibleFieldErrors(errorsOf("pr", pr), "pr", pr, { tried: true, touched: [] })).toEqual({ title: ["title_required"], body: ["body_required"] });
  });

  it("SDGs 를 다 끄면 만져 본 뒤에 오류가 나와요", () => {
    const none = withFields(pr, { title: "題", body: "文", sdgIds: [] });
    expect(visibleFieldErrors(errorsOf("pr", none), "pr", none, NOTHING)).toEqual({});
    expect(visibleFieldErrors(errorsOf("pr", none), "pr", none, { tried: false, touched: ["sdgs"] })).toEqual({ sdgs: ["sdgs_required"] });
  });

  it("글자가 한도를 넘으면 입력하는 동안 바로 보여요", () => {
    const longBrag = withFields(brag, { body: "あ".repeat(POST_LIMITS.bragBody + 1) });
    expect(visibleFieldErrors(errorsOf("brag", longBrag), "brag", longBrag, NOTHING)).toEqual({ body: ["body_too_long"] });
    const longPr = withFields(pr, { title: "題".repeat(POST_LIMITS.prTitle + 1), body: "文".repeat(POST_LIMITS.prBody + 1) });
    expect(visibleFieldErrors(errorsOf("pr", longPr), "pr", longPr, NOTHING)).toEqual({ title: ["title_too_long"], body: ["body_too_long"] });
  });

  it("연락처는 든 칸마다 바로 붙어요 (제목이든 본문이든, 둘 다든)", () => {
    const inBody = withFields(pr, { title: "朝市の試み", body: "連絡は mina@example.com まで" });
    expect(visibleFieldErrors(errorsOf("pr", inBody), "pr", inBody, NOTHING)).toEqual({ body: ["contact_info"] });
    const inTitle = withFields(pr, { title: "090-1234-5678 へ", body: "文" });
    expect(visibleFieldErrors(errorsOf("pr", inTitle), "pr", inTitle, NOTHING)).toEqual({ title: ["contact_info"] });
    const inBoth = withFields(pr, { title: "090-1234-5678 へ", body: "mina@example.com" });
    expect(visibleFieldErrors(errorsOf("pr", inBoth), "pr", inBoth, NOTHING)).toEqual({ title: ["contact_info"], body: ["contact_info"] });
    // 자랑 글에는 제목이 없으니 본문에만
    const bragContact = withFields(brag, { body: "電話は 090-1234-5678 です" });
    expect(visibleFieldErrors(errorsOf("brag", bragContact), "brag", bragContact, NOTHING)).toEqual({ body: ["contact_info"] });
  });

  it("한 칸에 오류가 여럿이면 core 가 알려 준 순서대로 모여요", () => {
    const errors: PostError[] = ["body_required", "contact_info"];
    const fields = withFields(pr, { title: "題", body: "" });
    // body 가 비었지만 연락처 오류가 함께 온 경우(가정): 본문 칸에 둘 다
    const shown = visibleFieldErrors(errors, "pr", fields, { tried: true, touched: [] });
    expect(shown.body).toEqual(["body_required", "contact_info"]);
  });

  it("실적이 목록에 없다는 오류는 입력과 상관없이 바로 보여요", () => {
    const ghost = withFields(brag, { body: "あ", activityId: "남의 실적" });
    expect(visibleFieldErrors(errorsOf("brag", ghost), "brag", ghost, NOTHING)).toEqual({ activity: ["achievement_not_found"] });
  });

  it("챌린지가 목록에 없다는 오류도 바로 보여요", () => {
    const ghost = withFields(pr, { title: "題", body: "文", challengeId: "ch-다른회사" });
    expect(visibleFieldErrors(errorsOf("pr", ghost), "pr", ghost, NOTHING)).toEqual({ challenge: ["challenge_not_found"] });
  });

  it("오류가 없으면 아무것도 보이지 않아요", () => {
    expect(visibleFieldErrors([], "pr", pr, { tried: true, touched: ["title", "body", "sdgs"] })).toEqual({});
  });
});

describe("글자 수", () => {
  it("글자 수와 한도 넘김을 알려 줘요 (이모지·한자도 1글자)", () => {
    expect(counterOf("", 200)).toEqual({ count: 0, over: false });
    expect(counterOf("あいう", 200)).toEqual({ count: 3, over: false });
    expect(counterOf("🏆🏆", 200)).toEqual({ count: 2, over: false });
    expect(counterOf("あ".repeat(200), 200)).toEqual({ count: 200, over: false });
    expect(counterOf("あ".repeat(201), 200)).toEqual({ count: 201, over: true });
  });

  it("앞뒤 공백은 세지 않아요 (core 의 검사와 같아요)", () => {
    expect(counterOf("   ", 200)).toEqual({ count: 0, over: false });
    expect(counterOf("  あ  ", 200).count).toBe(1);
  });

  it("글자 수가 한도 안이면 core 검사도 같은 답이에요", () => {
    for (const length of [POST_LIMITS.bragBody, POST_LIMITS.bragBody + 1]) {
      const body = "あ".repeat(length);
      const fields = withFields(initialPostFields(bragComposer()), { body });
      const over = counterOf(body, POST_LIMITS.bragBody).over;
      expect(validatePostDraft(toPostDraft("brag", fields), context).includes("body_too_long")).toBe(over);
    }
  });
});

describe("미리보기 초안", () => {
  it("자랑 글: 본문이 쓸 만하면 그대로, 아니면 안내 문구로 채워요", () => {
    const composer = bragComposer();
    const base = initialPostFields(composer);
    const ok = previewDraft("brag", withFields(base, { body: "初めての受賞です！" }), composer, TITLE_PLACEHOLDER);
    expect(ok.placeholder).toBe(false);
    expect(ok.draft).toEqual({ kind: "brag", body: "初めての受賞です！", activityId: base.activityId });

    for (const body of ["", "   ", "あ".repeat(POST_LIMITS.bragBody + 1), "連絡は mina@example.com まで"]) {
      const sample = previewDraft("brag", withFields(base, { body }), composer, TITLE_PLACEHOLDER);
      expect(sample.placeholder, body).toBe(true);
      expect(sample.draft.body, body).toBe(composer.bodyPlaceholder);
    }
  });

  it("자랑 글: 실적을 아직 안 골랐으면 처음 실적으로 보여 줘요", () => {
    const composer = bragComposer();
    const sample = previewDraft("brag", withFields(initialPostFields(composer), { activityId: null, body: "あ" }), composer, TITLE_PLACEHOLDER);
    expect(sample.draft.activityId).toBe(composer.selectedActivityId);
  });

  it("홍보 글: 제목·본문이 쓸 만하면 그대로, 아니면 각각 안내 문구로 채워요", () => {
    const composer = prComposer();
    const base = initialPostFields(composer);
    const ok = previewDraft("pr", withFields(base, { title: "朝市の新しい試み", body: "容器を減らします。" }), composer, TITLE_PLACEHOLDER);
    expect(ok.placeholder).toBe(false);
    expect(ok.draft).toMatchObject({ kind: "pr", title: "朝市の新しい試み", body: "容器を減らします。" });

    const emptyTitle = previewDraft("pr", withFields(base, { title: "", body: "容器を減らします。" }), composer, TITLE_PLACEHOLDER);
    expect(emptyTitle.placeholder).toBe(true);
    expect(emptyTitle.draft).toMatchObject({ title: TITLE_PLACEHOLDER, body: "容器を減らします。" });

    const emptyBody = previewDraft("pr", withFields(base, { title: "題", body: "" }), composer, TITLE_PLACEHOLDER);
    expect(emptyBody.placeholder).toBe(true);
    expect(emptyBody.draft).toMatchObject({ title: "題", body: composer.bodyPlaceholder });

    const longTitle = previewDraft("pr", withFields(base, { title: "題".repeat(POST_LIMITS.prTitle + 1), body: "文" }), composer, TITLE_PLACEHOLDER);
    expect(longTitle.draft).toMatchObject({ title: TITLE_PLACEHOLDER });
  });

  it("홍보 글: SDGs 를 다 껐다면 기업의 SDGs 로, 4개 이상이면 3개까지만 보여 줘요", () => {
    const composer = prComposer();
    const base = withFields(initialPostFields(composer), { title: "題", body: "文" });
    const none = previewDraft("pr", withFields(base, { sdgIds: [] }), composer, TITLE_PLACEHOLDER);
    expect(none.draft.sdgIds).toEqual(composer.defaultSdgIds);
    const many = previewDraft("pr", withFields(base, { sdgIds: [1, 2, 3, 4, 5] }), composer, TITLE_PLACEHOLDER);
    expect(many.draft.sdgIds).toEqual([1, 2, 3]);
  });

  it("홍보 글: 목록에 없는 챌린지는 연결하지 않고 보여 줘요", () => {
    const composer = prComposer();
    const base = withFields(initialPostFields(composer), { title: "題", body: "文" });
    expect(previewDraft("pr", withFields(base, { challengeId: "ch-다른회사" }), composer, TITLE_PLACEHOLDER).draft.challengeId).toBeNull();
    expect(previewDraft("pr", withFields(base, { challengeId: "ch-bottle" }), composer, TITLE_PLACEHOLDER).draft.challengeId).toBe("ch-bottle");
  });

  it("미리보기 초안은 언제나 core 검사를 통과해요 (비었거나 규칙을 벗어난 입력이어도)", () => {
    const messy: Partial<PostFields>[] = [
      {},
      { body: "   ", title: "   " },
      { body: "あ".repeat(500), title: "題".repeat(100), sdgIds: [1, 2, 3, 4, 5, 6] },
      { body: "090-1234-5678", title: "mina@example.com", sdgIds: [] },
      { challengeId: "ch-다른회사", activityId: null },
    ];
    for (const over of messy) {
      for (const kind of ["brag", "pr"] as const) {
        const composer = kind === "brag" ? bragComposer() : prComposer();
        const sample = previewDraft(kind, withFields(initialPostFields(composer), over), composer, TITLE_PLACEHOLDER);
        expect(validatePostDraft(sample.draft, context), `${kind} ${JSON.stringify(over)}`).toEqual([]);
      }
    }
  });
});

describe("미리보기 카드", () => {
  it("자랑 글: 올린 뒤 피드에 나올 카드와 같아요 (상태는 바꾸지 않아요)", () => {
    const composer = bragComposer();
    const { draft } = previewDraft("brag", withFields(initialPostFields(composer), { body: "初めての受賞です！" }), composer, TITLE_PLACEHOLDER);
    const before = { seq: demo.seq, posts: demo.posts };
    const card = previewPost(demo, "ja", "b2c", draft);
    expect(card).not.toBeNull();
    expect(card).toMatchObject({ id: `po${demo.seq}`, kind: "brag", body: "初めての受賞です！", mine: true, likes: 0, canDelete: true, canLike: false });
    expect(card?.achievement?.title).toBeTruthy();
    expect(card?.sdgIds.length).toBeGreaterThan(0);
    expect(demo.seq).toBe(before.seq);
    expect(demo.posts).toBe(before.posts);
  });

  it("홍보 글: PR 표시·인증 ✓·연결 챌린지·공식 게시 예정일이 붙어요", () => {
    const composer = prComposer("ch-bottle");
    const fields = withFields(initialPostFields(composer), { title: "マイボトル企画", body: "学生の案を待っています。", requestOfficial: true });
    const card = previewPost(demo, "ja", "b2b", previewDraft("pr", fields, composer, TITLE_PLACEHOLDER).draft);
    expect(card).toMatchObject({ kind: "pr", title: "マイボトル企画", body: "学生の案を待っています。", mine: true, verified: true, challenge: { id: "ch-bottle" } });
    expect(card?.chipLabel).toBe("PR");
    expect(card?.official).not.toBeNull();
    // 배정되는 날짜는 composer 가 미리 알려 준 날짜와 같아요
    expect(composer.official.nextDate).toBe(nextOfficialDate(demo.posts, demo.today));
    expect(card?.official?.label).toContain(formatDateShort(composer.official.nextDate));
  });

  it("공식 게시를 신청하지 않으면 official 이 없어요", () => {
    const composer = prComposer();
    const fields = withFields(initialPostFields(composer), { title: "題", body: "文" });
    expect(previewPost(demo, "ja", "b2b", toPostDraft("pr", fields))?.official).toBeNull();
  });

  it("글쓰는 사람의 시점에서 만들어요 (학생이 보면 기업 글은 내 글이 아니에요)", () => {
    const composer = prComposer();
    const draft = toPostDraft("pr", withFields(initialPostFields(composer), { title: "題", body: "文" }));
    expect(previewPost(demo, "ja", "b2b", draft)?.mine).toBe(true);
    expect(previewPost(demo, "ja", "b2c", draft)?.mine).toBe(false);
  });

  it("언어에 맞춰 문구가 바뀌어요", () => {
    const composer = bragComposer();
    const draft = toPostDraft("brag", withFields(initialPostFields(composer), { body: "첫 수상이에요!" }));
    const ja = previewPost(demo, "ja", "b2c", draft);
    const ko = previewPost(demo, "ko", "b2c", draft);
    expect(ja).not.toBeNull();
    expect(ko).not.toBeNull();
    expect(ko?.chipLabel).not.toBe(ja?.chipLabel);
    expect(ko?.body).toBe("첫 수상이에요!");
  });

  it("규칙을 못 지키는 초안은 카드를 만들지 않아요", () => {
    expect(previewPost(demo, "ja", "b2c", { kind: "brag", body: "", activityId: bragComposer().selectedActivityId })).toBeNull();
    expect(previewPost(demo, "ja", "b2c", { kind: "brag", body: "あ", activityId: null })).toBeNull();
    expect(previewPost(demo, "ja", "b2b", { kind: "pr", title: "", body: "文", sdgIds: [14] })).toBeNull();
  });
});
