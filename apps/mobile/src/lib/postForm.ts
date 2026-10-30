// SNS 글쓰기(F-503 학생 자랑 글 · F-504 기업 홍보 글)의 입력 모음: 처음 값, SDGs·챌린지 고르기, 입력 → PostDraft 변환,
// 오류를 칸별로 나누기, 미리보기, 올린 뒤 피드에 뜨는 안내. 검사는 core 의 validatePostDraft 가 하고, 여기서는 입력 칸 쪽 규칙만 둬요.
import type { PostKind } from "@sdgs-compass/core/domain";
import type { TFunction } from "@sdgs-compass/core/messages";
import { containsContact, defaultPrSdgs, POST_LIMITS, type PostDraft, type PostError } from "@sdgs-compass/core/post";
import { charCount } from "@sdgs-compass/core/proposal";
import type { SdgId } from "@sdgs-compass/core/sdg";
import type { ComposerVM, PostVM } from "@sdgs-compass/core/selectors";
import { paramText } from "./nav";
import { toggleSdg } from "./newChallenge";

export interface PostFormState {
  kind: PostKind;
  body: string;
  /** 홍보 글: 제목 */
  title: string;
  /** 자랑 글: 붙일 내 실적(활동)의 id */
  activityId: string | null;
  /** 홍보 글: 고른 SDGs (1~3개) */
  sdgIds: SdgId[];
  /** 사람이 SDGs 를 직접 만졌는지 — 만졌다면 챌린지를 바꿔도 덮어쓰지 않아요 */
  sdgsTouched: boolean;
  /** 홍보 글: 연결할 우리 회사 챌린지 (없으면 null) */
  challengeId: string | null;
  /** 홍보 글: 공식 SNS(Instagram 스토리) 게시 신청 */
  requestOfficial: boolean;
}

/** 글쓰기 화면을 처음 열 때의 값: 미리 고른 실적·챌린지가 있으면 그것으로, SDGs 는 기본값(챌린지 → 없으면 기업의 SDGs)으로 */
export function initialPostForm(composer: Pick<ComposerVM, "kind" | "selectedActivityId" | "selectedChallengeId" | "defaultSdgIds">): PostFormState {
  return {
    kind: composer.kind,
    body: "",
    title: "",
    activityId: composer.kind === "brag" ? composer.selectedActivityId : null,
    sdgIds: composer.kind === "pr" ? [...composer.defaultSdgIds] : [],
    sdgsTouched: false,
    challengeId: composer.kind === "pr" ? composer.selectedChallengeId : null,
    requestOfficial: false,
  };
}

/** 입력 → core 의 PostDraft (종류에 없는 칸은 보내지 않아요) */
export function toPostDraft(form: PostFormState): PostDraft {
  if (form.kind === "brag") return { kind: "brag", body: form.body, activityId: form.activityId };
  return { kind: "pr", body: form.body, title: form.title, sdgIds: form.sdgIds, challengeId: form.challengeId, requestOfficial: form.requestOfficial };
}

/** 홍보 글의 SDGs 를 직접 켜고 꺼요 (최대 POST_LIMITS.maxSdgs 개) */
export function toggleFormSdg(form: PostFormState, id: SdgId): PostFormState {
  return { ...form, sdgIds: toggleSdg(form.sdgIds, id, POST_LIMITS.maxSdgs), sdgsTouched: true };
}

/**
 * 연결할 챌린지를 바꿔요. SDGs 를 직접 고르지 않았다면 그 챌린지의 SDGs(연결을 끊으면 기업의 SDGs)로 다시 채우고,
 * 직접 골랐다면 고른 그대로 둬요. 목록에 없는 챌린지는 무시해요.
 */
export function pickChallenge(form: PostFormState, challengeId: string | null, composer: Pick<ComposerVM, "challenges" | "companySdgIds">): PostFormState {
  const challenge = challengeId === null ? undefined : composer.challenges.find((c) => c.id === challengeId);
  if (challengeId !== null && challenge === undefined) return form;
  if (form.sdgsTouched) return { ...form, challengeId };
  return { ...form, challengeId, sdgIds: defaultPrSdgs(composer.companySdgIds, challenge?.sdgIds ?? null) };
}

/** 글자 수 표시용: 이모지·한자도 1글자 (core 의 charCount), 한도를 넘으면 over */
export function counterOf(text: string, limit: number): { count: number; over: boolean } {
  const count = charCount(text);
  return { count, over: count > limit };
}

/** 오류가 붙는 입력 칸 */
export type PostField = "activity" | "title" | "body" | "sdgs" | "challenge";

/** 오류가 어느 칸의 것인지. 연락처 오류는 연락처가 들어 있는 칸에 붙여요 (제목·본문 둘 다일 수도 있어요) */
export function fieldsOfError(error: PostError, form: Pick<PostFormState, "kind" | "title" | "body">): PostField[] {
  switch (error) {
    case "achievement_required":
    case "achievement_not_found":
      return ["activity"];
    case "title_required":
    case "title_too_long":
      return ["title"];
    case "body_required":
    case "body_too_long":
      return ["body"];
    case "sdgs_required":
    case "sdgs_too_many":
      return ["sdgs"];
    case "challenge_not_found":
      return ["challenge"];
    case "contact_info": {
      const fields: PostField[] = [];
      if (form.kind === "pr" && containsContact(form.title)) fields.push("title");
      if (containsContact(form.body)) fields.push("body");
      return fields;
    }
  }
}

/** 칸마다 보여 줄 오류 하나 (한 칸에 여럿이면 화면 순서상 먼저 나온 것) */
export function errorsByField(errors: readonly PostError[], form: Pick<PostFormState, "kind" | "title" | "body">): Partial<Record<PostField, PostError>> {
  const byField: Partial<Record<PostField, PostError>> = {};
  for (const error of errors) {
    for (const field of fieldsOfError(error, form)) {
      if (byField[field] === undefined) byField[field] = error;
    }
  }
  return byField;
}

/**
 * 올리기 전 미리보기: 피드의 글 카드(PostVM)와 같은 모양으로 지금 입력을 보여 줘요. 좋아요·삭제 같은 동작은 없어요.
 * 날짜는 올릴 때 정해져서 비워 두고, 자랑 글의 실적은 고른 실적의 이름(🏆 수상 · 제목)과 SDGs 만 알 수 있어요.
 */
export function previewPost(composer: ComposerVM, form: PostFormState, t: TFunction): PostVM {
  const isBrag = form.kind === "brag";
  const activity = isBrag ? composer.activities.find((a) => a.id === form.activityId) : undefined;
  const challenge = !isBrag && form.challengeId !== null ? composer.challenges.find((c) => c.id === form.challengeId) : undefined;
  return {
    id: "preview",
    kind: form.kind,
    chipLabel: t(isBrag ? "feed.chip.brag" : "feed.chip.pr"),
    authorName: composer.author.name,
    authorMeta: composer.author.meta,
    avatar: composer.author.avatar,
    avatarColor: composer.author.avatarColor,
    verified: composer.author.verified,
    title: isBrag ? null : form.title.trim(),
    body: form.body.trim(),
    sdgIds: isBrag ? (activity?.sdgIds ?? []) : form.sdgIds,
    dateLabel: "",
    likes: 0,
    likedByMe: false,
    mine: true,
    canLike: false,
    canDelete: false,
    achievement: activity ? { kindLabel: "", title: activity.label, companyName: "", awardLabel: null, sdgIds: activity.sdgIds, certificateId: null } : null,
    challenge: challenge ? { id: challenge.id, title: challenge.title } : null,
    official: !isBrag && form.requestOfficial ? { label: composer.official.nextDateLabel, feeLabel: t("feed.officialFee", { fee: composer.official.feeLabel }) } : null,
    shareText: "",
  };
}

// ───────── 올린 뒤의 안내 ─────────
// 글을 올리면 피드 탭이 ?posted=1(&official=게시 예정일)로 열려요. 피드는 이 값으로 맨 위에 안내를 보여 주고, 닫으면 값을 지워요.

export interface PostedParams {
  /** 공식 SNS 게시 예정일 (YYYY-MM-DD). 신청하지 않았으면 null */
  officialOn: string | null;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** 피드의 경로 매개변수에서 "방금 올렸어요" 안내를 읽어요. 안내할 게 없으면 null */
export function parsePostedParams(raw: Record<string, string | string[] | undefined>): PostedParams | null {
  if (paramText(raw.posted) !== "1") return null;
  const official = paramText(raw.official);
  return { officialOn: ISO_DATE.test(official) ? official : null };
}

/** 안내를 닫을 때 router.setParams 에 넣는 값 */
export const CLEAR_POSTED_PARAMS = { posted: "", official: "" } as const;
