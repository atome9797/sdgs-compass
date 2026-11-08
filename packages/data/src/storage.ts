// 저장소 어댑터: 데모 상태(DemoState)와 사용자 설정(언어·역할)을 기기에 저장하고 불러와요.
// 웹은 localStorage, 모바일은 AsyncStorage 를 같은 모양(AsyncKeyValueStore)으로 맞춰서 쓰면 이 파일의 코드를 그대로 공유해요.
import { CERT_CRITERIA } from "@sdgs-compass/core/certification";
import type { DemoState, Role } from "@sdgs-compass/core/domain";
import { isLocale, type Locale } from "@sdgs-compass/core/i18n";
import { DEFAULT_OFFICIAL_CHANNEL, isOfficialChannel, isOfficialPostUrl, isOfficialStatus } from "@sdgs-compass/core/post";
import { isResearchField, isResearchStatus } from "@sdgs-compass/core/research";
import { SDG_IDS, type SdgId } from "@sdgs-compass/core/sdg";
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
      typeof value.authorName === "string" && typeof value.authorLevel === "number" &&
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

/** 저장돼 있던 값이 지금 앱이 이해하는 모양인지 확인해요 (다르면 샘플 데이터로 새로 시작해요) */
export function isDemoState(value: unknown): value is DemoState {
  if (!isObject(value) || value.version !== 1) return false;
  if (!isDay(value.today) || typeof value.seq !== "number" || typeof value.shares !== "number") return false;
  if (typeof value.myCompanyId !== "string") return false;
  if (!(value.esgGeneratedOn === null || typeof value.esgGeneratedOn === "string")) return false;
  if (!isObject(value.me) || typeof value.me.id !== "string" || typeof value.me.nickname !== "string") return false;
  const lists = ["companies", "challenges", "teamPosts", "bookmarks", "proposals", "history", "talent", "scouts", "matches", "posts"] as const;
  for (const key of lists) if (!Array.isArray(value[key])) return false;
  if (!(value.posts as unknown[]).every(isSocialPost)) return false;
  if (!isWallet(value.wallet) || !Array.isArray(value.prizePayments) || !value.prizePayments.every(isPrizePayment)) return false;
  if (!isResearcher(value.researcher) || !Array.isArray(value.researchRequests) || !value.researchRequests.every(isResearchRequest)) return false;
  if (!(value.challenges as unknown[]).every((c) => isObject(c) && typeof c.id === "string" && isDay(c.opensOn) && isDay(c.closesOn))) return false;
  if (!(value.companies as unknown[]).every((c) => isObject(c) && typeof c.id === "string" && isCertScore(c.certScore))) return false;
  if (!(value.proposals as unknown[]).every((p) => isObject(p) && typeof p.id === "string" && Array.isArray(p.versions) && typeof p.submittedAt === "string")) return false;
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
    return isDemoState(data) ? data : null;
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
