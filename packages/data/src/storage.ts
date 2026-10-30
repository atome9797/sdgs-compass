// 저장소 어댑터: 데모 상태(DemoState)와 사용자 설정(언어·역할)을 기기에 저장하고 불러와요.
// 웹은 localStorage, 모바일은 AsyncStorage 를 같은 모양(AsyncKeyValueStore)으로 맞춰서 쓰면 이 파일의 코드를 그대로 공유해요.
import { CERT_CRITERIA } from "@sdgs-compass/core/certification";
import type { DemoState, Role } from "@sdgs-compass/core/domain";
import { isLocale, type Locale } from "@sdgs-compass/core/i18n";
import { DEFAULT_OFFICIAL_CHANNEL, isOfficialChannel } from "@sdgs-compass/core/post";
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

export function isRole(value: unknown): value is Role {
  return value === "b2c" || value === "b2b";
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
      (o === null || (isObject(o) && isDay(o.on) && isOfficialChannel(o.channel) && typeof o.feeYen === "number" && o.status === "scheduled"))
    );
  }
  return false;
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
  if (!(value.challenges as unknown[]).every((c) => isObject(c) && typeof c.id === "string" && isDay(c.opensOn) && isDay(c.closesOn))) return false;
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
 * 공식 SNS 게시 채널(channel)이 생기기 전에 저장된 홍보 글의 게시 신청에는 channel 이 없어요.
 * 그때는 Instagram 스토리 전용이었으니 instagram 으로 읽어요(이미 channel 이 있으면 — 틀린 값이어도 — 그대로 두고 isSocialPost 가 판단해요).
 */
function withOfficialChannel(post: unknown): unknown {
  if (!isObject(post) || post.kind !== "pr" || !isObject(post.official) || post.official.channel !== undefined) return post;
  return { ...post, official: { ...post.official, channel: DEFAULT_OFFICIAL_CHANNEL } };
}

/**
 * 예전 버전에서 저장된 상태를 지금 모양으로 이어 줘요(버리지 않고 이어서 쓸 수 있게):
 * - SNS 피드(posts)가 생기기 전의 상태에는 posts 가 없어요 → 저장했을 때의 "오늘" 기준 샘플 글을 채워 넣어요(날짜는 불러올 때 rebase 가 옮겨요).
 * - 공식 SNS 게시 채널이 생기기 전의 글에는 official.channel 이 없어요 → instagram 으로 읽어요.
 */
function upgradeSaved(data: unknown): unknown {
  if (!isObject(data) || data.version !== 1) return data;
  if (data.posts === undefined && isDay(data.today)) return { ...data, posts: createInitialState(data.today).posts };
  if (Array.isArray(data.posts)) return { ...data, posts: data.posts.map(withOfficialChannel) };
  return data;
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
