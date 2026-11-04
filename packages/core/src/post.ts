// F-503 학생 자랑 글 · F-504 기업 홍보 글 (설계: docs/sns-feed.md): 입력 검사, 연락처 검출, 공식 SNS 게시 날짜(회사당 월 4회, 날짜는 기업이 골라요).
// 화면은 이 규칙을 그대로 쓰고(validatePostDraft), reducer(state.ts)도 같은 검사를 한 번 더 해요.
import { showableActivities } from "./activities";
import type { DemoState, OfficialChannel, OfficialShare, PostKind, Role, SocialPost } from "./domain";
import { addDays, daysBetween } from "./format";
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
 * 한 회사가 한 달에 신청할 수 있는 공식 SNS 게시 횟수. 게시일이 속한 달(일본 시간 달력 월)로 세고, 채널(X·Instagram·Facebook)을 모두 합쳐요.
 * 예정·게시 완료만 세고 취소·삭제한 신청은 세지 않아요. 하루 제한은 없어요(같은 날·같은 채널에 여러 회사가 올라가도 돼요).
 * 바꾸려면 이 값 하나만 고치면 돼요 — DB 의 official_share_monthly_limit() 는 db/tests/04_parity.sql 이 이 값과 대조해요.
 */
export const OFFICIAL_SHARE_MONTHLY_LIMIT = 4;

/** 게시 날짜를 고를 수 있는 기간: 내일부터 이 날수 뒤까지 (오늘은 고를 수 없어요). DB 의 official_share_window_days() 와 같아요 */
export const OFFICIAL_SHARE_WINDOW_DAYS = 30;

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

/**
 * 공식 계정 주소: 게시된 신청에 게시글 주소(postUrl)가 없을 때 대신 이어 줘요.
 * Facebook 공식 계정은 만드는 중이라 비워 뒀어요 — 만들면 채워요. 비어 있는 채널은 링크 없이 채널 이름만 보여요.
 */
export const OFFICIAL_ACCOUNT_URLS: Readonly<Record<OfficialChannel, string | null>> = {
  x: "https://x.com/SDGs3ab",
  instagram: "https://www.instagram.com/sdgscompass_app/",
  facebook: null,
};

export const OFFICIAL_STATUSES: readonly OfficialShare["status"][] = ["scheduled", "posted"];

export function isOfficialStatus(value: unknown): value is OfficialShare["status"] {
  return typeof value === "string" && (OFFICIAL_STATUSES as readonly string[]).includes(value);
}

/**
 * 게시글 주소로 받아들이는 글자: https:// 로 시작하고, 그 뒤는 빈칸 없는 ASCII 글자(! ~ ~)만이에요(한글·전각 글자는 퍼센트 인코딩해서 넣어요).
 * DB 의 official_share_post_url 검사와 같아요(db/tests/04_parity.sql) — 두 쪽 다 글자 범위로 정해서 DB 의 locale 에 따라 달라지지 않아요.
 */
export function isOfficialPostUrl(value: unknown): value is string {
  return typeof value === "string" && /^https:\/\/[!-~]+$/.test(value);
}

/** 공식 SNS 에서 볼 수 있는 곳: 게시된 신청만 — 게시글 주소 → 없으면 그 채널의 공식 계정 주소 → 그것도 없으면 null. 예정이면 늘 null */
export function officialShareLink(share: Pick<OfficialShare, "status" | "postUrl" | "channel">): string | null {
  if (share.status !== "posted") return null;
  return share.postUrl ?? OFFICIAL_ACCOUNT_URLS[share.channel];
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
  /** 홍보 글만, 게시 신청을 켰을 때만 뜻이 있어요: 기업이 고른 게시 날짜 YYYY-MM-DD (비우면 고를 수 있는 가장 빠른 날 — earliestOfficialDate) */
  officialOn?: string;
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
  /** 고른 게시 날짜가 내일 ~ 30일 뒤 밖이에요 (오늘·지난 날·31일 뒤 이후·날짜가 아닌 값) */
  | "official_date_out_of_range"
  /** 고른 날짜가 속한 달에 우리 회사의 한도(월 4회)를 다 썼어요 — 날짜를 비웠는데 고를 날이 하나도 없을 때도 */
  | "official_month_full"
  | "contact_info";

/** 검사에 필요한 "지금 고를 수 있는 것" (상태에서 postContext 로 만들어요) */
export interface PostContext {
  /** 자랑 글에 붙일 수 있는 내 실적(수상·제출·참가)의 id */
  activityIds: readonly string[];
  /** 홍보 글에 연결할 수 있는 우리 회사 챌린지의 id */
  challengeIds: readonly string[];
  /** 오늘 (YYYY-MM-DD) — 공식 게시 날짜는 내일부터 고를 수 있어요 */
  today: string;
  /** 우리 회사가 달마다 이미 쓴 공식 게시 횟수 { "2026-11": 1 } (officialUsageByMonth) */
  officialUsage: OfficialUsage;
}

type PostContextSource = Pick<DemoState, "history" | "proposals" | "challenges" | "companies" | "shares" | "today" | "myCompanyId" | "posts">;

export function postContext(state: PostContextSource): PostContext {
  return {
    activityIds: showableActivities(state).map((a) => a.id),
    challengeIds: state.challenges.filter((c) => c.companyId === state.myCompanyId).map((c) => c.id),
    today: state.today,
    officialUsage: officialUsageByMonth(state.posts, state.myCompanyId),
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
    if (draft.requestOfficial) {
      // 공식 SNS 게시 채널: 신청을 켰을 때만 봐요. 비워 두면 기본 채널, 목록에 없는 값은 거절해요(화면은 목록에 있는 것만 고르게 해요)
      if (draft.officialChannel !== undefined && !isOfficialChannel(draft.officialChannel)) errors.push("official_channel_invalid");
      // 게시 날짜: 고른 날은 내일 ~ 30일 뒤 + 그 달에 한도가 남아 있어야 해요. 비워 두면 가장 빠른 날을 쓰는데, 그런 날이 없으면 한도 오류예요
      const problem =
        draft.officialOn === undefined
          ? earliestDateIn(context.officialUsage, context.today) === null
            ? "month_full"
            : null
          : officialDateProblem(context.officialUsage, context.today, draft.officialOn);
      if (problem === "out_of_range") errors.push("official_date_out_of_range");
      else if (problem === "month_full") errors.push("official_month_full");
    }
  }

  if (containsContact(draft.body) || (draft.kind === "pr" && containsContact(title))) errors.push("contact_info");
  return errors;
}

/** 입력 오류를 지금 언어의 문장으로 */
export function postErrorText(error: PostError, kind: PostKind, locale: Locale): string {
  const max = error === "title_too_long" ? POST_LIMITS.prTitle : error === "sdgs_too_many" ? POST_LIMITS.maxSdgs : bodyLimit(kind);
  return translate(`post.error.${error}`, locale, { max, days: OFFICIAL_SHARE_WINDOW_DAYS, limit: OFFICIAL_SHARE_MONTHLY_LIMIT });
}

// ───────── 공식 SNS 게시 날짜: 회사당 월 4회, 날짜는 기업이 골라요 ─────────

/** 달마다 이미 쓴 공식 게시 횟수 { "YYYY-MM": n } */
export type OfficialUsage = Readonly<Record<string, number>>;

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** 정말 있는 날짜(YYYY-MM-DD)인지 — 2026-02-30 같은 값은 아니에요 */
function isIsoDay(value: unknown): value is string {
  return typeof value === "string" && ISO_DAY.test(value) && addDays(value, 0) === value;
}

/** 게시 날짜가 속한 달 "YYYY-MM". 데모의 날짜는 모두 일본 시간 달력의 날짜라 앞 7글자가 곧 달이에요 (DB: date_trunc('month', scheduled_on)) */
export function officialMonthOf(day: string): string {
  return day.slice(0, 7);
}

/**
 * 한 회사가 달마다 쓴 공식 게시 횟수 — 채널을 모두 합치고, 예정·게시 완료를 다 세요.
 * 데모에는 취소 상태가 없고 지운 글은 목록에서 빠지니, 남아 있는 신청은 모두 세요. 다른 회사의 신청은 세지 않아요.
 */
export function officialUsageByMonth(posts: readonly SocialPost[], companyId: string): Record<string, number> {
  const usage: Record<string, number> = {};
  for (const post of posts) {
    if (post.kind !== "pr" || post.companyId !== companyId || !post.official) continue;
    const month = officialMonthOf(post.official.on);
    usage[month] = (usage[month] ?? 0) + 1;
  }
  return usage;
}

/** 그 달(YYYY-MM)에 남은 횟수. 0 아래로는 내려가지 않아요 (DB: official_share_month_remaining) */
export function officialMonthRemaining(usage: OfficialUsage, month: string): number {
  return Math.max(0, OFFICIAL_SHARE_MONTHLY_LIMIT - (usage[month] ?? 0));
}

/** 게시 날짜 선택지 하루치 */
export interface OfficialDateChoice {
  /** YYYY-MM-DD */
  date: string;
  /** 그 날이 속한 달 YYYY-MM */
  month: string;
  /** 그 달에 남은 횟수 (이번 신청 전) */
  remaining: number;
  /** 고를 수 있는지 — 그 달의 한도를 다 썼으면 false */
  available: boolean;
}

/** 고를 수 있는 기간(내일 ~ 30일 뒤)의 날짜를 하루씩. 한도를 다 쓴 달의 날짜는 available = false 로 남겨서 이유를 보여 줄 수 있게 해요 */
export function officialDateChoices(usage: OfficialUsage, today: string): OfficialDateChoice[] {
  const choices: OfficialDateChoice[] = [];
  for (let n = 1; n <= OFFICIAL_SHARE_WINDOW_DAYS; n++) {
    const date = addDays(today, n);
    const month = officialMonthOf(date);
    const remaining = officialMonthRemaining(usage, month);
    choices.push({ date, month, remaining, available: remaining > 0 });
  }
  return choices;
}

function earliestDateIn(usage: OfficialUsage, today: string): string | null {
  return officialDateChoices(usage, today).find((choice) => choice.available)?.date ?? null;
}

/**
 * 처음 골라 두는 게시 날짜 = 그 회사가 고를 수 있는 가장 빠른 날: 내일부터 30일 뒤까지 중, 그 날이 속한 달에 아직 한도가 남은 첫날.
 * 기간 안의 모든 달이 찼으면 null (그때는 신청할 수 없어요). DB 의 earliest_official_share_date(company, today) 와 같은 답을 내요.
 */
export function earliestOfficialDate(posts: readonly SocialPost[], companyId: string, today: string): string | null {
  return earliestDateIn(officialUsageByMonth(posts, companyId), today);
}

export type OfficialDateProblem = "out_of_range" | "month_full";

/** 고른 날짜를 쓸 수 있는지: 쓸 수 있으면 null, 기간 밖(오늘·지난 날·31일 뒤 이후·날짜가 아닌 값)이면 out_of_range, 그 달의 한도를 다 썼으면 month_full */
export function officialDateProblem(usage: OfficialUsage, today: string, date: unknown): OfficialDateProblem | null {
  if (!isIsoDay(date)) return "out_of_range";
  const ahead = daysBetween(today, date);
  if (ahead < 1 || ahead > OFFICIAL_SHARE_WINDOW_DAYS) return "out_of_range";
  return officialMonthRemaining(usage, officialMonthOf(date)) > 0 ? null : "month_full";
}

/** 신청에 쓸 날짜: 고른 날짜, 비웠으면 가장 빠른 날 (검사는 validatePostDraft 가 먼저 해요) */
export function resolveOfficialDate(draft: Pick<PostDraft, "officialOn">, context: Pick<PostContext, "today" | "officialUsage">): string | null {
  return draft.officialOn ?? earliestDateIn(context.officialUsage, context.today);
}

/** 채널 이름 (브랜드 이름이라 일본어는 그대로, 한국어는 익숙한 표기): X / Instagram / Facebook */
export function officialChannelName(channel: OfficialChannel, locale: Locale): string {
  return translate(`post.channel.${channel}`, locale);
}

/** 채널마다 올라가는 모양: Instagram → 피드 게시물(24시간이면 사라지는 스토리가 아니라 링크가 남는 게시물), X → 포스트, Facebook → 페이지 게시 */
export function officialChannelFormat(channel: OfficialChannel, locale: Locale): string {
  return translate(`post.channelFormat.${channel}`, locale);
}

/** 이름 + 올라가는 모양: "Instagram フィード投稿" / "X ポスト" / "Facebook ページ投稿" (선택지·안내 문구에 써요) */
export function officialChannelLabel(channel: OfficialChannel, locale: Locale): string {
  return `${officialChannelName(channel, locale)} ${officialChannelFormat(channel, locale)}`;
}

/** 홍보 글의 SDGs 기본값: 연결한 챌린지의 SDGs → 챌린지가 없으면 기업의 SDGs (최대 3개) */
export function defaultPrSdgs(companySdgIds: readonly SdgId[], challengeSdgIds: readonly SdgId[] | null): SdgId[] {
  const source = challengeSdgIds && challengeSdgIds.length > 0 ? challengeSdgIds : companySdgIds;
  return source.slice(0, POST_LIMITS.maxSdgs);
}
