// F-503 학생 자랑 글 · F-504 기업 홍보 글 (설계: docs/sns-feed.md): 입력 검사, 연락처 검출, 공식 SNS 게시 날짜 배정.
// 화면은 이 규칙을 그대로 쓰고(validatePostDraft), reducer(state.ts)도 같은 검사를 한 번 더 해요.
import { showableActivities } from "./activities";
import type { DemoState, OfficialChannel, PostKind, Role, SocialPost } from "./domain";
import { addDays } from "./format";
import type { Locale } from "./i18n";
import { translate } from "./messages";
import { charCount } from "./proposal";
import { SDG_IDS, type SdgId } from "./sdg";

export const POST_LIMITS = {
  /** 학생 자랑 글 본문 */
  bragBody: 200,
  prTitle: 40,
  prBody: 400,
  /** 글 하나에 붙일 수 있는 SDGs 태그 수 */
  maxSdgs: 3,
} as const;

/** 공식 SNS 게시 신청의 게시료 — 어느 채널이든 같은 샘플 값이에요(정산은 하지 않아요) */
export const OFFICIAL_SHARE_FEE_YEN = 3000;

/**
 * 공식 SNS 게시 신청에서 고를 수 있는 채널 — 화면에 보이는 순서예요(X · Instagram · Facebook).
 * YouTube 는 앱 사용법·활동 소개 영상을 올리는 채널이라 신청 대상이 아니에요. DB 의 열거형 official_channel 과 같은 값이어야 해요(db/tests/04_parity.sql).
 */
export const OFFICIAL_CHANNELS: readonly OfficialChannel[] = ["x", "instagram", "facebook"];

/** 채널을 고르지 않았을 때의 채널 — 채널 선택이 생기기 전의 데이터·호출이 그대로 통하게 Instagram 이에요 */
export const DEFAULT_OFFICIAL_CHANNEL: OfficialChannel = "instagram";

export function isOfficialChannel(value: unknown): value is OfficialChannel {
  return typeof value === "string" && (OFFICIAL_CHANNELS as readonly string[]).includes(value);
}

export const POST_KINDS: readonly PostKind[] = ["brag", "pr"];

/** 글을 쓰는 쪽: 자랑 글은 학생(b2c), 홍보 글은 기업(b2b) */
export function authorRole(kind: PostKind): Role {
  return kind === "brag" ? "b2c" : "b2b";
}

export function bodyLimit(kind: PostKind): number {
  return kind === "brag" ? POST_LIMITS.bragBody : POST_LIMITS.prBody;
}

// ───────── 연락처 검출 ─────────

// db/schema.sql 의 mask_contacts() 와 같은 규칙이에요 (메시지의 연락처 가리기, F-603). 둘이 어긋나면 db/tests/04_parity.sql 이 잡아내요.
// 데모용 규칙이라 전각 숫자 같은 변형은 못 잡아요. 실서비스는 전용 검출기를 붙여요.
const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const PHONE_PATTERN = /\+[0-9]{1,3}[ -]?[0-9]{1,4}[ -]?[0-9]{3,4}[ -]?[0-9]{3,4}|[0-9]{2,4}-?[0-9]{3,4}-?[0-9]{3,4}/;

/** 이메일 주소나 전화번호처럼 보이는 글자가 들어 있는지 (8자리 이상 이어진 숫자도 전화번호로 봐요) */
export function containsContact(text: string): boolean {
  return EMAIL_PATTERN.test(text) || PHONE_PATTERN.test(text);
}

// ───────── 입력 검사 ─────────

export interface PostDraft {
  kind: PostKind;
  body: string;
  /** 홍보 글만: 1~40자 */
  title?: string;
  /** 자랑 글만: 붙일 내 실적(활동)의 id */
  activityId?: string | null;
  /** 홍보 글만: 고른 SDGs 태그 (1~3개) */
  sdgIds?: readonly SdgId[];
  /** 홍보 글만: 연결할 우리 회사 챌린지의 id (없으면 null) */
  challengeId?: string | null;
  /** 홍보 글만: 공식 SNS 게시 신청 */
  requestOfficial?: boolean;
  /** 홍보 글만, 게시 신청을 켰을 때만 뜻이 있어요: 게시할 채널 (비우면 Instagram) */
  officialChannel?: OfficialChannel;
}

export type PostError =
  | "title_required"
  | "title_too_long"
  | "body_required"
  | "body_too_long"
  | "achievement_required"
  | "achievement_not_found"
  | "sdgs_required"
  | "sdgs_too_many"
  | "challenge_not_found"
  | "official_channel_invalid"
  | "contact_info";

/** 검사에 필요한 "지금 고를 수 있는 것" (상태에서 postContext 로 만들어요) */
export interface PostContext {
  /** 자랑 글에 붙일 수 있는 내 실적(수상·제출·참가)의 id */
  activityIds: readonly string[];
  /** 홍보 글에 연결할 수 있는 우리 회사 챌린지의 id */
  challengeIds: readonly string[];
}

type PostContextSource = Pick<DemoState, "history" | "proposals" | "challenges" | "companies" | "shares" | "today" | "myCompanyId">;

export function postContext(state: PostContextSource): PostContext {
  return {
    activityIds: showableActivities(state).map((a) => a.id),
    challengeIds: state.challenges.filter((c) => c.companyId === state.myCompanyId).map((c) => c.id),
  };
}

/** 같은 SDGs 는 한 번만, 목록에 없는 번호는 빼요 (순서는 그대로) */
export function uniqueSdgs(ids: readonly SdgId[] | undefined): SdgId[] {
  const seen = new Set<SdgId>();
  for (const id of ids ?? []) if (SDG_IDS.includes(id)) seen.add(id);
  return [...seen];
}

/** 빈 배열이면 올릴 수 있어요. 순서는 화면의 입력 순서와 같고, 연락처 검사는 마지막이에요. */
export function validatePostDraft(draft: PostDraft, context: PostContext): PostError[] {
  const errors: PostError[] = [];
  const title = draft.title ?? "";

  if (draft.kind === "brag") {
    if (!draft.activityId) errors.push("achievement_required");
    else if (!context.activityIds.includes(draft.activityId)) errors.push("achievement_not_found");
  } else {
    const length = charCount(title);
    if (length === 0) errors.push("title_required");
    else if (length > POST_LIMITS.prTitle) errors.push("title_too_long");
  }

  const body = charCount(draft.body);
  if (body === 0) errors.push("body_required");
  else if (body > bodyLimit(draft.kind)) errors.push("body_too_long");

  if (draft.kind === "pr") {
    const sdgs = uniqueSdgs(draft.sdgIds);
    if (sdgs.length === 0) errors.push("sdgs_required");
    else if (sdgs.length > POST_LIMITS.maxSdgs) errors.push("sdgs_too_many");
    if (draft.challengeId && !context.challengeIds.includes(draft.challengeId)) errors.push("challenge_not_found");
    // 공식 SNS 게시 채널: 신청을 켰을 때만 봐요. 비워 두면 기본 채널, 목록에 없는 값은 거절해요(화면은 목록에 있는 것만 고르게 해요)
    if (draft.requestOfficial && draft.officialChannel !== undefined && !isOfficialChannel(draft.officialChannel)) errors.push("official_channel_invalid");
  }

  if (containsContact(draft.body) || (draft.kind === "pr" && containsContact(title))) errors.push("contact_info");
  return errors;
}

/** 입력 오류를 지금 언어의 문장으로 */
export function postErrorText(error: PostError, kind: PostKind, locale: Locale): string {
  const max = error === "title_too_long" ? POST_LIMITS.prTitle : error === "sdgs_too_many" ? POST_LIMITS.maxSdgs : bodyLimit(kind);
  return translate(`post.error.${error}`, locale, { max });
}

// ───────── 공식 SNS 게시 날짜 ─────────

/**
 * 공식 SNS 게시를 신청했을 때 배정할 날짜: 내일부터 가장 빠른 빈 날짜.
 * 같은 채널에서 이미 어느 기업이 받은 날짜는 건너뛰어요(채널마다 하루에 한 회사만 — 다른 채널이 받은 날짜는 상관없어요).
 * DB 의 next_official_share_date(today, channel) 와 같은 답을 내요.
 */
export function nextOfficialDate(posts: readonly SocialPost[], today: string, channel: OfficialChannel = DEFAULT_OFFICIAL_CHANNEL): string {
  const taken = new Set<string>();
  for (const post of posts) if (post.kind === "pr" && post.official && post.official.channel === channel) taken.add(post.official.on);
  let day = addDays(today, 1);
  while (taken.has(day)) day = addDays(day, 1);
  return day;
}

/** 채널 이름 (브랜드 이름이라 일본어는 그대로, 한국어는 익숙한 표기): X / Instagram / Facebook */
export function officialChannelName(channel: OfficialChannel, locale: Locale): string {
  return translate(`post.channel.${channel}`, locale);
}

/** 채널마다 올라가는 모양: Instagram → 스토리, X → 포스트, Facebook → 페이지 게시 */
export function officialChannelFormat(channel: OfficialChannel, locale: Locale): string {
  return translate(`post.channelFormat.${channel}`, locale);
}

/** 이름 + 올라가는 모양: "Instagram ストーリー" / "X ポスト" / "Facebook ページ投稿" (선택지·안내 문구에 써요) */
export function officialChannelLabel(channel: OfficialChannel, locale: Locale): string {
  return `${officialChannelName(channel, locale)} ${officialChannelFormat(channel, locale)}`;
}

/** 홍보 글의 SDGs 기본값: 연결한 챌린지의 SDGs → 챌린지가 없으면 기업의 SDGs (최대 3개) */
export function defaultPrSdgs(companySdgIds: readonly SdgId[], challengeSdgIds: readonly SdgId[] | null): SdgId[] {
  const source = challengeSdgIds && challengeSdgIds.length > 0 ? challengeSdgIds : companySdgIds;
  return source.slice(0, POST_LIMITS.maxSdgs);
}
