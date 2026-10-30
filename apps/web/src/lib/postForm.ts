// 글쓰기 화면(학생 자랑 글 · 기업 홍보 글, F-503·F-504)의 입력 모으기: 입력값 → 초안, 오류를 언제 보여 줄지, 챌린지를 바꿀 때의 SDGs, 미리보기 카드.
// 순수 함수라서 브라우저 없이 테스트해요. 입력 검사 자체는 core 의 validatePostDraft 가 하고, 여기서는 "화면이 그 결과를 어떻게 쓰는지"만 정해요.
import type { DemoState, OfficialChannel, PostKind, Role } from "@sdgs-compass/core/domain";
import type { Locale } from "@sdgs-compass/core/i18n";
import { containsContact, defaultPrSdgs, isOfficialChannel, POST_LIMITS, type PostDraft, type PostError } from "@sdgs-compass/core/post";
import { charCount } from "@sdgs-compass/core/proposal";
import type { SdgId } from "@sdgs-compass/core/sdg";
import { selectFeed, type ComposerVM, type PostVM } from "@sdgs-compass/core/selectors";
import { reducer } from "@sdgs-compass/core/state";

/** 입력 칸 묶음: 화면에서 오류가 붙는 단위예요 */
export type PostField = "activity" | "title" | "body" | "sdgs" | "challenge" | "official";

export interface PostFields {
  body: string;
  /** 홍보 글만 */
  title: string;
  /** 자랑 글만: 올릴 실적 */
  activityId: string | null;
  /** 홍보 글만 (자랑 글은 실적의 SDGs 가 자동으로 붙어요) */
  sdgIds: SdgId[];
  /** 사용자가 SDGs 를 직접 바꿨는지 — 바꿨다면 챌린지를 고쳐도 덮어쓰지 않아요 */
  sdgTouched: boolean;
  /** 홍보 글만: 연결할 우리 회사 챌린지 */
  challengeId: string | null;
  /** 홍보 글만: 공식 SNS 게시 신청 */
  requestOfficial: boolean;
  /** 홍보 글만: 신청할 공식 SNS (신청을 켠 뒤에만 의미가 있어요. 끄고 다시 켜도 고른 채널은 그대로) */
  officialChannel: OfficialChannel;
}

/** 글쓰기 화면을 처음 열었을 때의 값 (다른 화면에서 넘어왔다면 실적/챌린지가 미리 골라져 있어요) */
export function initialPostFields(composer: ComposerVM): PostFields {
  return {
    body: "",
    title: "",
    activityId: composer.selectedActivityId,
    sdgIds: composer.kind === "pr" ? [...composer.defaultSdgIds] : [],
    sdgTouched: false,
    challengeId: composer.selectedChallengeId,
    requestOfficial: false,
    officialChannel: composer.official.defaultChannel,
  };
}

/** 화면의 입력값 → core 의 PostDraft (검사·올리기에 그대로 써요) */
export function toPostDraft(kind: PostKind, fields: PostFields): PostDraft {
  if (kind === "brag") return { kind, body: fields.body, activityId: fields.activityId };
  return {
    kind, title: fields.title, body: fields.body, sdgIds: fields.sdgIds, challengeId: fields.challengeId,
    requestOfficial: fields.requestOfficial, officialChannel: fields.officialChannel,
  };
}

/** 채널 고르기: 화면의 라디오가 보내는 값이 채널이 아니면(깨진 값) 지금 고른 채널을 그대로 둬요 */
export function chooseOfficialChannel(fields: PostFields, channel: string): PostFields {
  return isOfficialChannel(channel) ? { ...fields, officialChannel: channel } : fields;
}

/** SDGs 를 켜고 끄기: 최대 3개까지만 켜져요. 직접 바꿨다는 표시(sdgTouched)가 남아요 */
export function toggleSdg(fields: PostFields, id: SdgId): PostFields {
  const has = fields.sdgIds.includes(id);
  if (!has && fields.sdgIds.length >= POST_LIMITS.maxSdgs) return fields;
  return { ...fields, sdgTouched: true, sdgIds: has ? fields.sdgIds.filter((x) => x !== id) : [...fields.sdgIds, id] };
}

/**
 * 연결할 챌린지 고르기. SDGs 를 직접 바꾸지 않았다면 그 챌린지의 SDGs(챌린지를 빼면 기업의 SDGs)로 다시 채우고,
 * 직접 바꿨다면 사용자의 선택을 그대로 둬요(덮어쓰지 않아요).
 */
export function chooseChallenge(fields: PostFields, composer: ComposerVM, challengeId: string | null): PostFields {
  const challenge = composer.challenges.find((c) => c.id === challengeId) ?? null;
  const next: PostFields = { ...fields, challengeId: challenge?.id ?? null };
  if (fields.sdgTouched) return next;
  return { ...next, sdgIds: defaultPrSdgs(composer.companySdgIds, challenge?.sdgIds ?? null) };
}

// ───────── 오류를 언제, 어디에 보여 줄까 ─────────

/** 사용자가 방금 친 글자 때문에 생기는 오류는 입력하는 동안 바로 보여 줘요. 나머지(비었다 등)는 칸을 만져 본 뒤나 올리기를 눌러 본 뒤에 보여요. */
const LIVE_ERRORS: readonly PostError[] = [
  "title_too_long", "body_too_long", "contact_info", "sdgs_too_many", "achievement_not_found", "challenge_not_found", "official_channel_invalid",
];

const FIELD_OF: Record<Exclude<PostError, "contact_info">, PostField> = {
  achievement_required: "activity",
  achievement_not_found: "activity",
  title_required: "title",
  title_too_long: "title",
  body_required: "body",
  body_too_long: "body",
  sdgs_required: "sdgs",
  sdgs_too_many: "sdgs",
  challenge_not_found: "challenge",
  official_channel_invalid: "official",
};

/** 연락처 오류는 연락처가 든 칸마다 붙어요 (제목이든 본문이든, 둘 다든) */
function contactFields(kind: PostKind, fields: PostFields): PostField[] {
  const found: PostField[] = [];
  if (kind === "pr" && containsContact(fields.title)) found.push("title");
  if (containsContact(fields.body) || found.length === 0) found.push("body");
  return found;
}

export type FieldErrors = Partial<Record<PostField, PostError[]>>;

export interface ErrorVisibility {
  /** 올리기를 눌러 본 적이 있는지 */
  tried: boolean;
  /** 만져 본(포커스가 지나간) 칸 */
  touched: readonly PostField[];
}

/** 검사 결과(errors)에서, 지금 화면에 보여 줄 것만 칸별로 나눠요 */
export function visibleFieldErrors(errors: readonly PostError[], kind: PostKind, fields: PostFields, visibility: ErrorVisibility): FieldErrors {
  const out: FieldErrors = {};
  for (const error of errors) {
    const targets = error === "contact_info" ? contactFields(kind, fields) : [FIELD_OF[error]];
    for (const field of targets) {
      if (!LIVE_ERRORS.includes(error) && !visibility.tried && !visibility.touched.includes(field)) continue;
      (out[field] ??= []).push(error);
    }
  }
  return out;
}

/** 글자 수와 한도 넘김 (이모지·한자도 1글자, core 의 charCount 와 같은 방식) */
export function counterOf(text: string, max: number): { count: number; over: boolean } {
  const count = charCount(text);
  return { count, over: count > max };
}

// ───────── 미리보기 ─────────

export interface PreviewDraft {
  draft: PostDraft;
  /** 비었거나 규칙을 벗어난 칸을 안내 문구로 채웠는지 (그러면 카드를 흐리게 보여요) */
  placeholder: boolean;
}

/**
 * 미리보기에 쓸 초안: 입력 도중에도 카드 모양을 볼 수 있게, 비었거나 규칙을 벗어난 칸(빈 글, 너무 긴 글, 연락처가 든 글)은
 * 안내 문구나 알맞은 값으로 채워요. 실제로 올라가는 값이 아니에요(올리기는 반드시 toPostDraft 로 검사해요).
 */
export function previewDraft(kind: PostKind, fields: PostFields, composer: ComposerVM, titlePlaceholder: string): PreviewDraft {
  const usable = (text: string, max: number) => text.trim() !== "" && charCount(text) <= max && !containsContact(text);

  const bodyOk = usable(fields.body, composer.bodyLimit);
  const body = bodyOk ? fields.body : composer.bodyPlaceholder;
  if (kind === "brag") {
    return { draft: { kind, body, activityId: fields.activityId ?? composer.selectedActivityId }, placeholder: !bodyOk };
  }
  const titleOk = usable(fields.title, composer.titleLimit);
  const title = titleOk ? fields.title : titlePlaceholder;
  const sdgIds = fields.sdgIds.length > 0 ? fields.sdgIds.slice(0, composer.maxSdgs) : composer.defaultSdgIds;
  const challengeId = composer.challenges.some((c) => c.id === fields.challengeId) ? fields.challengeId : null;
  const officialChannel = isOfficialChannel(fields.officialChannel) ? fields.officialChannel : composer.official.defaultChannel;
  return { draft: { kind, title, body, sdgIds, challengeId, requestOfficial: fields.requestOfficial, officialChannel }, placeholder: !bodyOk || !titleOk };
}

/**
 * 초안을 올렸을 때 피드에 나올 카드: 진짜 reducer 와 selectFeed 를 그대로 돌려서(상태는 바꾸지 않아요) 올린 뒤의 모습과 똑같이 만들어요.
 * 초안이 규칙을 못 지키면 null.
 */
export function previewPost(demo: DemoState, locale: Locale, role: Role, draft: PostDraft): PostVM | null {
  const id = `po${demo.seq}`; // reducer 가 새 글에 붙일 번호
  const next = reducer(demo, { type: "createPost", draft, at: `${demo.today}T12:00` });
  if (next === demo) return null;
  return selectFeed(next, locale, role).posts.find((post) => post.id === id) ?? null;
}
