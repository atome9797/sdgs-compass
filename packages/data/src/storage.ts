// 저장소 어댑터: 데모 상태(DemoState)와 사용자 설정(언어·역할)을 기기에 저장하고 불러와요.
// 웹은 localStorage, 모바일은 AsyncStorage 를 같은 모양(AsyncKeyValueStore)으로 맞춰서 쓰면 이 파일의 코드를 그대로 공유해요.
import { CERT_CRITERIA } from "@sdgs-compass/core/certification";
import type { DemoState, Role } from "@sdgs-compass/core/domain";
import { isLocale, type Locale } from "@sdgs-compass/core/i18n";
import { DEFAULT_OFFICIAL_CHANNEL, isOfficialChannel, isOfficialPostUrl, isOfficialStatus } from "@sdgs-compass/core/post";
import { isWorkCategory, isWorkStatus } from "@sdgs-compass/core/network";
import { isTeamSize, TEAM_SIZE } from "@sdgs-compass/core/proposal";
import { isResearchField, isResearchStatus } from "@sdgs-compass/core/research";
import { SDG_IDS, type SdgId } from "@sdgs-compass/core/sdg";
import { syncSkills } from "@sdgs-compass/core/skills";
import { rebaseState } from "@sdgs-compass/core/state";
import { createInitialState } from "./seed";

/** AsyncStorage(@react-native-async-storage/async-storage)와 모양이 같아서 그대로 넣을 수 있어요 */
export interface AsyncKeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const STORAGE_KEYS = {
  state: "sdgs-compass:state:v1",
  prefs: "sdgs-compass:prefs:v1",
} as const;

/** 메모리에만 저장 (테스트·서버 렌더링·저장소를 못 쓰는 환경용) */
export function memoryStorage(initial: Record<string, string> = {}): AsyncKeyValueStore {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    getItem: async (key) => map.get(key) ?? null,
    setItem: async (key, value) => {
      map.set(key, value);
    },
    removeItem: async (key) => {
      map.delete(key);
    },
  };
}

/** 브라우저 localStorage 를 감싸요. 쓸 수 없거나(사생활 보호 모드 등) 예외가 나면 메모리로 대신해요. */
export function browserStorage(): AsyncKeyValueStore {
  const fallback = memoryStorage();
  const local = (): Storage | null => {
    try {
      return typeof globalThis.localStorage === "undefined" ? null : globalThis.localStorage;
    } catch {
      return null;
    }
  };
  return {
    async getItem(key) {
      try {
        const area = local();
        return area ? area.getItem(key) : await fallback.getItem(key);
      } catch {
        return fallback.getItem(key);
      }
    },
    async setItem(key, value) {
      try {
        const area = local();
        if (area) area.setItem(key, value);
        else await fallback.setItem(key, value);
      } catch {
        await fallback.setItem(key, value);
      }
    },
    async removeItem(key) {
      try {
        local()?.removeItem(key);
      } catch {
        // 지울 수 없으면 무시
      }
      await fallback.removeItem(key);
    },
  };
}

// ───────── 사용자 설정 (언어·역할) ─────────

export interface Prefs {
  /** null = 아직 고르지 않음 → 첫 화면에서 언어 선택을 보여줘요 */
  locale: Locale | null;
  /** null = 아직 고르지 않음 → 언어 다음에 역할 선택을 보여줘요 */
  role: Role | null;
}

export const EMPTY_PREFS: Prefs = { locale: null, role: null };

/** researcher(연구자 · 대학원생)는 웹 데모의 세 번째 역할이에요 — 모바일 앱은 고르게 하지 않지만 저장 모양은 같이 써요 */
export function isRole(value: unknown): value is Role {
  return value === "b2c" || value === "b2b" || value === "researcher";
}

export function parsePrefs(raw: string | null): Prefs {
  if (raw === null) return EMPTY_PREFS;
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== "object" || data === null) return EMPTY_PREFS;
    const record = data as Record<string, unknown>;
    return { locale: isLocale(record.locale) ? record.locale : null, role: isRole(record.role) ? record.role : null };
  } catch {
    return EMPTY_PREFS;
  }
}

export async function loadPrefs(kv: AsyncKeyValueStore): Promise<Prefs> {
  try {
    return parsePrefs(await kv.getItem(STORAGE_KEYS.prefs));
  } catch {
    return EMPTY_PREFS;
  }
}

export async function savePrefs(kv: AsyncKeyValueStore, prefs: Prefs): Promise<void> {
  try {
    await kv.setItem(STORAGE_KEYS.prefs, JSON.stringify(prefs));
  } catch {
    // 저장 공간이 없어도 앱은 계속 써요 (이번 실행 동안만 유지)
  }
}

// ───────── 데모 상태 ─────────

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const isDay = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

const isDateTime = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value);
/** 한 가지 언어의 글이거나 { ja, ko } 한 쌍 */
const isText = (value: unknown): boolean => typeof value === "string" || (isObject(value) && typeof value.ja === "string" && typeof value.ko === "string");
const isSdgList = (value: unknown): boolean => Array.isArray(value) && value.every((id) => SDG_IDS.includes(id as SdgId));

/** SNS 피드 글 한 건이 지금 앱이 이해하는 모양인지 (rebase 와 화면이 깨지지 않을 만큼만 확인해요) */
function isSocialPost(value: unknown): boolean {
  if (!isObject(value) || typeof value.id !== "string") return false;
  if (!isText(value.body) || !isSdgList(value.sdgIds) || !isDateTime(value.createdAt)) return false;
  if (typeof value.likes !== "number" || typeof value.mine !== "boolean") return false;
  if (!Array.isArray(value.likedBy) || !value.likedBy.every(isRole)) return false;
  if (value.kind === "brag") {
    const a = value.achievement;
    return (
      typeof value.authorName === "string" && typeof value.authorSkills === "number" &&
      isObject(a) && (a.activityId === null || typeof a.activityId === "string") &&
      (a.kind === "award" || a.kind === "submission" || a.kind === "participation") &&
      isText(a.title) && isText(a.companyName) && (a.award === null || a.award === "grand" || a.award === "excellence" || a.award === "special") && isSdgList(a.sdgIds)
    );
  }
  if (value.kind === "pr") {
    const o = value.official;
    return (
      typeof value.companyId === "string" && isText(value.title) && (value.challengeId === null || typeof value.challengeId === "string") &&
      (o === null ||
        (isObject(o) && isDay(o.on) && isOfficialChannel(o.channel) && typeof o.feeYen === "number" && isOfficialStatus(o.status) &&
          (o.postUrl === null || (o.status === "posted" && isOfficialPostUrl(o.postUrl)))))
    );
  }
  return false;
}

const isAward = (value: unknown): boolean => value === "grand" || value === "excellence" || value === "special";

/** #38 스킬 한 개 (수상 기록의 스냅샷) */
function isHeroSkill(value: unknown): boolean {
  return (
    isObject(value) && typeof value.id === "string" && isText(value.name) && isSdgList(value.sdgIds) && (value.sdgIds as unknown[]).length > 0 &&
    isAward(value.award) && isText(value.questTitle) && isText(value.companyName) && isDay(value.learnedOn) && typeof value.activityId === "string" &&
    (value.proposalId === undefined || typeof value.proposalId === "string")
  );
}

const isYen = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value > 0;
/** #35 회사의 실천 마크 달성도: null(마크 없음) 또는 0~100 */
const isCertScore = (value: unknown): boolean => value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100);

/** 받은 상금·특별상 기록 한 줄 (rebase 와 화면이 깨지지 않을 만큼만 확인해요) */
function isWalletEntry(value: unknown): boolean {
  if (!isObject(value) || typeof value.id !== "string" || typeof value.studentId !== "string" || !isYen(value.amountYen) || !isDay(value.date)) return false;
  const s = value.source;
  if (value.kind === "return") return isObject(s) && s.kind === "return" && isText(s.round);
  if (value.kind === "prize") {
    return (
      isObject(s) && s.kind === "prize" && (s.challengeId === null || typeof s.challengeId === "string") && (s.activityId === null || typeof s.activityId === "string") &&
      typeof s.companyId === "string" && isText(s.title) && (s.award === "grand" || s.award === "excellence" || s.award === "special")
    );
  }
  return false;
}

function isWallet(value: unknown): boolean {
  return isObject(value) && Array.isArray(value.entries) && value.entries.every(isWalletEntry);
}

/** 과제의 상금 지급: 지급일은 지급했을 때(paid)만 */
function isPrizePayment(value: unknown): boolean {
  return (
    isObject(value) && typeof value.challengeId === "string" && typeof value.companyId === "string" && isYen(value.amountYen) &&
    (value.status === "promised" || value.status === "paid" || value.status === "noWinner") && isDay(value.promisedOn) &&
    (value.paidOn === null || isDay(value.paidOn)) && (value.status === "paid") === (value.paidOn !== null) && (value.proposalId === null || typeof value.proposalId === "string")
  );
}

const isFieldList = (value: unknown): boolean => Array.isArray(value) && value.length > 0 && value.every(isResearchField);

function isResearcher(value: unknown): boolean {
  return (
    isObject(value) && typeof value.id === "string" && typeof value.name === "string" && isText(value.affiliation) && (value.degree === "master" || value.degree === "doctor") &&
    typeof value.year === "number" && isFieldList(value.fields) && isText(value.bio)
  );
}

function isResearchResult(value: unknown): boolean {
  return (
    isObject(value) && typeof value.summary === "string" && typeof value.fileName === "string" && typeof value.fileSizeBytes === "number" &&
    typeof value.sha256 === "string" && isDateTime(value.submittedAt)
  );
}

/** 연구 의뢰 한 건: 모양 + 상태와 맞는 값(모집 중이면 담당자 없음, 성과는 확인 대기·완료일 때만, 완료일은 완료일 때만) */
function isResearchRequest(value: unknown): boolean {
  if (!isObject(value) || typeof value.id !== "string" || typeof value.companyId !== "string") return false;
  const o = value.origin;
  if (!isObject(o) || !(o.proposalId === null || typeof o.proposalId === "string") || !(o.challengeId === null || typeof o.challengeId === "string")) return false;
  if (typeof o.ideaTitle !== "string" || typeof o.teamName !== "string") return false;
  if (!isText(value.title) || !isText(value.detail) || !isText(value.deliverable) || !isFieldList(value.fields) || !isYen(value.feeYen)) return false;
  if (!isDay(value.postedOn) || !isDay(value.dueOn) || !isResearchStatus(value.status)) return false;
  if (!(value.researcherId === null || typeof value.researcherId === "string") || !(value.acceptedOn === null || isDay(value.acceptedOn))) return false;
  if (!(value.result === null || isResearchResult(value.result)) || !(value.completedOn === null || isDay(value.completedOn))) return false;
  const open = value.status === "open";
  const hasResult = value.status === "delivered" || value.status === "completed";
  return (
    open === (value.researcherId === null) && open === (value.acceptedOn === null) && hasResult === (value.result !== null) && (value.status === "completed") === (value.completedOn !== null)
  );
}

/** 기업 간 업무 의뢰 한 건: 모양 + 상태와 맞는 값(맡은 기업은 공개 모집 중이 아니면 있고, 날짜는 그 단계부터) */
function isWorkRequest(value: unknown): boolean {
  if (!isObject(value) || typeof value.id !== "string" || !(value.mode === "direct" || value.mode === "open") || typeof value.fromCompanyId !== "string") return false;
  if (!(value.toCompanyId === null || typeof value.toCompanyId === "string") || !isWorkCategory(value.category)) return false;
  if (!isText(value.title) || !isText(value.detail) || !isYen(value.budgetYen) || !isDay(value.postedOn) || !isDay(value.dueOn) || !isWorkStatus(value.status)) return false;
  if (!Array.isArray(value.applications) || !value.applications.every((a) => isObject(a) && typeof a.companyId === "string" && isText(a.message) && isDay(a.appliedOn))) return false;
  if (!(value.acceptedOn === null || isDay(value.acceptedOn)) || !(value.deliveredOn === null || isDay(value.deliveredOn)) || !(value.completedOn === null || isDay(value.completedOn))) return false;
  if (!(value.deliveryNote === null || isText(value.deliveryNote))) return false;
  const started = value.status === "inProgress" || value.status === "delivered" || value.status === "completed";
  const delivered = value.status === "delivered" || value.status === "completed";
  return (
    (value.status === "open") === (value.toCompanyId === null) && (value.mode === "open" || value.status !== "open") && started === (value.acceptedOn !== null) &&
    delivered === (value.deliveredOn !== null) && delivered === (value.deliveryNote !== null) && (value.status === "completed") === (value.completedOn !== null)
  );
}

/** 상호 평가 한 건: 별 1~5 정수 */
function isRating(value: unknown): boolean {
  return (
    isObject(value) && typeof value.id === "string" && (value.kind === "prize" || value.kind === "research" || value.kind === "work") && typeof value.refId === "string" &&
    (value.fromRole === "student" || value.fromRole === "researcher" || value.fromRole === "company") && typeof value.fromId === "string" &&
    (value.toRole === "company" || value.toRole === "researcher") && typeof value.toId === "string" &&
    typeof value.stars === "number" && Number.isInteger(value.stars) && value.stars >= 1 && value.stars <= 5 && isText(value.comment) && isDay(value.createdOn)
  );
}

/** 회사의 기업 네트워크 정보: 할 수 있는 일(분야 목록)과 한 줄 */
const isCompanyOffers = (c: Record<string, unknown>): boolean => Array.isArray(c.offers) && c.offers.every(isWorkCategory) && isText(c.offerNote);

/** 저장돼 있던 값이 지금 앱이 이해하는 모양인지 확인해요 (다르면 샘플 데이터로 새로 시작해요) */
export function isDemoState(value: unknown): value is DemoState {
  if (!isObject(value) || value.version !== 1) return false;
  if (!isDay(value.today) || typeof value.seq !== "number" || typeof value.shares !== "number") return false;
  if (typeof value.myCompanyId !== "string") return false;
  if (!(value.esgGeneratedOn === null || typeof value.esgGeneratedOn === "string")) return false;
  if (!isObject(value.me) || typeof value.me.id !== "string" || typeof value.me.nickname !== "string") return false;
  const lists = ["companies", "challenges", "teamPosts", "bookmarks", "proposals", "history", "talent", "scouts", "matches", "posts"] as const;
  for (const key of lists) if (!Array.isArray(value[key])) return false;
  if (!Array.isArray(value.skills) || !value.skills.every(isHeroSkill)) return false;
  if (!(value.teamPosts as unknown[]).every((p) => isObject(p) && typeof p.id === "string" && typeof p.authorSkills === "number")) return false;
  if (!(value.posts as unknown[]).every(isSocialPost)) return false;
  if (!isWallet(value.wallet) || !Array.isArray(value.prizePayments) || !value.prizePayments.every(isPrizePayment)) return false;
  if (!isResearcher(value.researcher) || !Array.isArray(value.researchRequests) || !value.researchRequests.every(isResearchRequest)) return false;
  if (!Array.isArray(value.workRequests) || !value.workRequests.every(isWorkRequest) || !Array.isArray(value.ratings) || !value.ratings.every(isRating)) return false;
  if (!(value.challenges as unknown[]).every((c) => isObject(c) && typeof c.id === "string" && isDay(c.opensOn) && isDay(c.closesOn))) return false;
  if (!(value.companies as unknown[]).every((c) => isObject(c) && typeof c.id === "string" && isCertScore(c.certScore) && isCompanyOffers(c))) return false;
  if (!(value.proposals as unknown[]).every((p) => isObject(p) && typeof p.id === "string" && Array.isArray(p.versions) && typeof p.submittedAt === "string" && isTeamSize(p.teamSize) && typeof p.seminar === "string")) return false;
  if (!isObject(value.cert)) return false;
  const cert = value.cert;
  return CERT_CRITERIA.every((c) => {
    const answer = cert[c.id];
    return isObject(answer) && typeof answer.value === "number" && typeof answer.evidence === "boolean";
  });
}

export function serializeState(state: DemoState): string {
  return JSON.stringify(state);
}

/**
 * 예전에 저장된 홍보 글의 공식 SNS 게시 신청을 지금 모양으로 읽어요.
 * - channel 이 없으면(채널 선택이 생기기 전) 그때 하나뿐이던 instagram 으로 (이미 channel 이 있으면 — 틀린 값이어도 — 그대로 두고 isSocialPost 가 판단해요)
 * - status 가 없거나 모르는 값이면 예정(scheduled)으로 — 게시 완료(posted)는 그대로
 * - postUrl 은 게시 완료이고 https:// 주소일 때만 남기고, 없거나 그 밖이면 null (링크는 공식 계정 주소로 이어져요)
 */
function normalizeOfficial(post: unknown): unknown {
  if (!isObject(post) || post.kind !== "pr" || !isObject(post.official)) return post;
  const official = post.official;
  const status = isOfficialStatus(official.status) ? official.status : "scheduled";
  return {
    ...post,
    official: {
      ...official,
      channel: official.channel === undefined ? DEFAULT_OFFICIAL_CHANNEL : official.channel,
      status,
      postUrl: status === "posted" && isOfficialPostUrl(official.postUrl) ? official.postUrl : null,
    },
  };
}

/**
 * 예전 버전에서 저장된 상태를 지금 모양으로 이어 줘요(버리지 않고 이어서 쓸 수 있게):
 * - SNS 피드(posts)가 생기기 전의 상태에는 posts 가 없어요 → 저장했을 때의 "오늘" 기준 샘플 글을 채워 넣어요(날짜는 불러올 때 rebase 가 옮겨요).
 * - 공식 SNS 게시 신청: channel 이 없으면 instagram, 상태가 없거나 모르는 값이면 예정, postUrl 은 게시 완료의 https:// 주소만 (normalizeOfficial).
 * - 상금 기록(wallet)·상금 지급(prizePayments)이 없으면 저장했을 때의 "오늘" 기준 샘플을 채워 넣어요. 데모에서 새로 낸 과제(샘플에 없는 과제)는 상금 기록 없이 열려요.
 * - 2026-11-08 직접 지급 모델 이전(리워드 잔액 · 상금 예치)의 상태는 이어서 써요 (upgradeMoney):
 *   wallet 의 본인 확인·출금은 버리고 받은 기록만, prizeDeposits(예치 중·송금·반환)는 prizePayments(표창 전·지급·최우수상 없음)로,
 *   matches 의 수수료·기부 열은 버려요(채택은 무료).
 * - #35 실천 마크가 생기기 전의 상태에는 회사의 certScore 가 없어요 → 샘플 회사는 샘플 값으로, 샘플에 없는 회사는 null(마크 없음)로 채워요.
 * - 연구 의뢰(세 번째 역할 · 연구자)가 생기기 전의 상태에는 researcher · researchRequests 가 없어요 → 저장했을 때의 "오늘" 기준 샘플을 채워요.
 * - 기업 네트워크가 생기기 전의 상태에는 workRequests · ratings 와 회사의 offers · offerNote 가 없어요 → 샘플(업무 의뢰 · 평가)을 채우고,
 *   샘플에만 있는 회사(포장 제조 등 — 샘플 의뢰의 상대)를 더하고, 회사의 할 수 있는 일은 샘플 값(샘플에 없는 회사는 비어 있게)으로 채워요.
 * - 팀 인원 · 세미나(2026-11-09)가 생기기 전의 기획서에는 teamSize · seminar 가 없어요 → 샘플 기획서는 샘플 값으로,
 *   그 밖(데모에서 낸 기획서 등)은 3명 · 세미나 없음으로 채워요. 이미 값이 있으면 그대로 두고 isDemoState 가 판단해요.
 * - 상품 보상(報酬アイテム, #37)이 생기기 전에 저장한 상태에는 샘플 퀘스트의 rewardItem 이 없어요 → 같은 id 의 샘플 퀘스트에서 채워요
 *   (데모에서 기업이 새로 낸 퀘스트는 그대로 — 상품 보상 없음).
 */
/** 이전 돈의 모양(리워드 잔액 · 상금 예치 · 채택 수수료)을 직접 지급 모델의 모양으로 (모르는 값은 그대로 두고 isDemoState 가 판단해요) */
function upgradeMoney(state: Record<string, unknown>): Record<string, unknown> {
  let next = state;
  const wallet = next.wallet;
  if (isObject(wallet) && Array.isArray(wallet.entries) && ("kyc" in wallet || wallet.entries.some((e) => isObject(e) && "status" in e))) {
    const entries = wallet.entries.filter((e) => isObject(e) && e.kind !== "withdrawal").map((e) => {
      const { status: _status, ...rest } = e as Record<string, unknown>;
      return rest;
    });
    next = { ...next, wallet: { entries } };
  }
  if (Array.isArray(next.prizeDeposits) && next.prizePayments === undefined) {
    const STATUS: Record<string, string> = { deposited: "promised", paid: "paid", refunded: "noWinner" };
    const prizePayments = next.prizeDeposits.map((d) => {
      if (!isObject(d)) return d;
      const { depositedOn, settledOn, status, ...rest } = d;
      const mapped = typeof status === "string" ? (STATUS[status] ?? status) : status;
      return { ...rest, status: mapped, promisedOn: depositedOn, paidOn: mapped === "paid" ? (settledOn ?? null) : null };
    });
    const { prizeDeposits: _old, ...rest } = next;
    next = { ...rest, prizePayments };
  }
  if (Array.isArray(next.matches) && next.matches.some((m) => isObject(m) && ("feeYen" in m || "donationYen" in m || "recipient" in m))) {
    next = {
      ...next,
      matches: next.matches.map((m) => {
        if (!isObject(m)) return m;
        const { feeYen: _fee, donationYen: _donation, recipient: _recipient, ...rest } = m;
        return rest;
      }),
    };
  }
  return next;
}

/**
 * #38 레벨 → 스킬: 예전에 저장한 상태에는 스킬 · 퀘스트의 스킬 이름 · 몬스터가 없고, 글쓴이에게 레벨(authorLevel)이 있어요.
 * 스킬은 샘플의 「앱을 쓰기 전 수상」 스킬로 채우고(이 앱에서 받은 상의 스킬은 불러온 뒤 syncSkills 가 만들어요),
 * 글쓴이의 레벨은 샘플 글이면 샘플의 스킬 수, 내 글이면 지금 가진 스킬 수로 바꿔요.
 */
function upgradeSkills(data: Record<string, unknown>, sample: () => DemoState): Record<string, unknown> {
  if (!isDay(data.today)) return data;
  let next = data;
  let fresh: DemoState | null = null;
  const sampleState = () => (fresh ??= sample());
  if (next.skills === undefined) {
    const historyIds = new Set(Array.isArray(next.history) ? next.history.map((a) => (isObject(a) ? a.id : null)) : []);
    next = { ...next, skills: sampleState().skills.filter((skill) => historyIds.has(skill.activityId)) };
  }
  const mySkills = Array.isArray(next.skills) ? next.skills.length : 0;
  const withSkills = (list: unknown, sampleList: readonly { id: string; authorSkills?: number }[]): unknown => {
    if (!Array.isArray(list) || !list.some((p) => isObject(p) && p.authorSkills === undefined && "authorLevel" in p)) return list;
    const known = new Map(sampleList.map((p) => [p.id, p.authorSkills]));
    return list.map((p) => {
      if (!isObject(p) || p.authorSkills !== undefined || !("authorLevel" in p)) return p;
      const rest: Record<string, unknown> = { ...p, authorSkills: p.mine === true ? mySkills : (known.get(String(p.id)) ?? 0) };
      delete rest.authorLevel;
      return rest;
    });
  };
  if (Array.isArray(next.teamPosts) && next.teamPosts.some((p) => isObject(p) && "authorLevel" in p)) next = { ...next, teamPosts: withSkills(next.teamPosts, sampleState().teamPosts) };
  if (Array.isArray(next.posts) && next.posts.some((p) => isObject(p) && "authorLevel" in p)) {
    next = { ...next, posts: withSkills(next.posts, sampleState().posts.flatMap((p) => (p.kind === "brag" ? [p] : []))) };
  }
  if (Array.isArray(next.challenges) && next.challenges.some((c) => isObject(c) && c.skillName === undefined)) {
    const extras = new Map(sampleState().challenges.map((c) => [c.id, { skillName: c.skillName, foe: c.foe }]));
    next = {
      ...next,
      challenges: next.challenges.map((c) => {
        if (!isObject(c) || c.skillName !== undefined) return c;
        const extra = extras.get(String(c.id));
        if (!extra) return c;
        return { ...c, ...(extra.skillName ? { skillName: extra.skillName } : {}), ...(c.foe === undefined && extra.foe ? { foe: extra.foe } : {}) };
      }),
    };
  }
  return next;
}

function upgradeSaved(data: unknown): unknown {
  if (!isObject(data) || data.version !== 1) return data;
  let next: Record<string, unknown> = data;
  const sample = () => createInitialState(String(data.today));
  if (next.posts === undefined && isDay(data.today)) next = { ...next, posts: sample().posts };
  else if (Array.isArray(next.posts)) next = { ...next, posts: next.posts.map(normalizeOfficial) };
  next = upgradeMoney(next);
  if (next.wallet === undefined && isDay(data.today)) next = { ...next, wallet: sample().wallet };
  if (next.prizePayments === undefined && isDay(data.today)) {
    const ids = new Set(Array.isArray(next.challenges) ? next.challenges.map((c) => (isObject(c) ? c.id : null)) : []);
    next = { ...next, prizePayments: sample().prizePayments.filter((p) => ids.has(p.challengeId)) };
  }
  if (next.researcher === undefined && isDay(data.today)) next = { ...next, researcher: sample().researcher };
  if (next.researchRequests === undefined && isDay(data.today)) next = { ...next, researchRequests: sample().researchRequests };
  if (next.workRequests === undefined && isDay(data.today)) {
    const fresh = sample();
    const known = new Set(Array.isArray(next.companies) ? next.companies.map((c) => (isObject(c) ? c.id : null)) : []);
    const companies = Array.isArray(next.companies) ? [...next.companies, ...fresh.companies.filter((c) => !known.has(c.id))] : next.companies;
    next = { ...next, companies, workRequests: fresh.workRequests, ratings: next.ratings === undefined ? fresh.ratings : next.ratings };
  }
  if (next.ratings === undefined && isDay(data.today)) next = { ...next, ratings: sample().ratings };
  if (Array.isArray(next.companies) && next.companies.some((c) => isObject(c) && c.offers === undefined) && isDay(data.today)) {
    const offers = new Map(sample().companies.map((c) => [c.id, { offers: c.offers, offerNote: c.offerNote }]));
    next = { ...next, companies: next.companies.map((c) => (isObject(c) && c.offers === undefined ? { ...c, ...(offers.get(String(c.id)) ?? { offers: [], offerNote: "" }) } : c)) };
  }
  if (Array.isArray(next.proposals) && next.proposals.some((p) => isObject(p) && (p.teamSize === undefined || p.seminar === undefined)) && isDay(data.today)) {
    const teams = new Map(sample().proposals.map((p) => [p.id, { teamSize: p.teamSize, seminar: p.seminar }]));
    next = {
      ...next,
      proposals: next.proposals.map((p) => {
        if (!isObject(p)) return p;
        const team = teams.get(String(p.id));
        return { ...p, teamSize: p.teamSize ?? team?.teamSize ?? TEAM_SIZE.default, seminar: p.seminar ?? team?.seminar ?? "" };
      }),
    };
  }
  if (Array.isArray(next.challenges) && isDay(data.today)) {
    const items = new Map(sample().challenges.flatMap((c) => (c.rewardItem ? [[c.id, c.rewardItem] as const] : [])));
    if (next.challenges.some((c) => isObject(c) && c.rewardItem === undefined && items.has(String(c.id)))) {
      next = { ...next, challenges: next.challenges.map((c) => (isObject(c) && c.rewardItem === undefined && items.has(String(c.id)) ? { ...c, rewardItem: items.get(String(c.id)) } : c)) };
    }
  }
  next = upgradeSkills(next, sample);
  if (Array.isArray(next.companies) && next.companies.some((c) => isObject(c) && c.certScore === undefined) && isDay(data.today)) {
    const scores = new Map(sample().companies.map((c) => [c.id, c.certScore]));
    next = { ...next, companies: next.companies.map((c) => (isObject(c) && c.certScore === undefined ? { ...c, certScore: scores.get(String(c.id)) ?? null } : c)) };
  }
  return next;
}

export function parseState(raw: string | null): DemoState | null {
  if (raw === null) return null;
  try {
    const data = upgradeSaved(JSON.parse(raw));
    // 이 앱에서 받은 상인데 스킬이 없으면(예전에 저장한 상태) 여기서 만들어요 (#38)
    return isDemoState(data) ? syncSkills(data) : null;
  } catch {
    return null;
  }
}

/** 저장된 상태를 읽어 오늘 기준으로 날짜를 옮겨요(rebase). 없거나 깨져 있으면 샘플 데이터로 시작해요. */
export async function loadState(kv: AsyncKeyValueStore, today: string): Promise<DemoState> {
  let raw: string | null = null;
  try {
    raw = await kv.getItem(STORAGE_KEYS.state);
  } catch {
    raw = null;
  }
  const saved = parseState(raw);
  if (!saved) return createInitialState(today);
  try {
    return rebaseState(saved, today);
  } catch {
    return createInitialState(today);
  }
}

export async function saveState(kv: AsyncKeyValueStore, state: DemoState): Promise<void> {
  try {
    await kv.setItem(STORAGE_KEYS.state, serializeState(state));
  } catch {
    // 저장 공간이 없어도 앱은 계속 써요
  }
}

/** 저장된 데이터를 모두 지워요 (설정의 "데모 초기화") */
export async function clearStorage(kv: AsyncKeyValueStore): Promise<void> {
  for (const key of Object.values(STORAGE_KEYS)) {
    try {
      await kv.removeItem(key);
    } catch {
      // 무시
    }
  }
}
