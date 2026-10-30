// 운영자 화면이 이 브라우저에 남기는 값(SNS 지표 입력 등). 서버로는 보내지 않아요 — 운영자 화면은 데모라서 로그인·DB 가 아직 없어요.
// 앱의 데모 데이터(packages/data 의 저장소)와는 따로, 키 하나에 모아서 한 번에 지울 수 있게 했어요.
// 저장소를 못 쓰는 브라우저(사생활 보호 모드 등)에서도 화면은 돌아가요: 그때는 메모리에 두고, 화면을 닫으면 사라진다고 알려 줘요.
import { validateScenario, type FinanceScenario } from "@sdgs-compass/core/adminFinance";
import { sanitizeSnsRows, type SnsRow } from "@sdgs-compass/core/adminSns";

export const ADMIN_STORAGE_KEY = "sdgs-compass:admin:v1";
/** 저장 모양이 바뀌면 올려요. 다른 버전의 값은 읽지 않고(빈 상태로 시작), 다음 저장 때 새 모양으로 덮어써요 */
export const ADMIN_STORE_VERSION = 1;

/** 저장할 수 있는 수지·자금 시나리오 수 (이 브라우저의 저장 용량을 지키려고 정한 상한) */
export const MAX_SCENARIOS = 20;

/** 이름을 붙여 저장한 수지·자금 시나리오 하나 */
export interface StoredScenario {
  /** 저장소 안에서만 쓰는 번호 (이름은 바뀌어도 이 번호는 그대로) */
  id: string;
  /** 샘플을 불러온 뒤 한 번도 고치지 않았으면 true — 화면이 "샘플(가상)" 표시를 붙여요 */
  sample: boolean;
  scenario: FinanceScenario;
}

export interface AdminStoreData {
  version: typeof ADMIN_STORE_VERSION;
  /** SNS 지표: 주(월요일) × SNS 한 줄씩, 주 오름차순 */
  snsRows: SnsRow[];
  /** "샘플 불러오기"로 가상의 샘플이 들어 있는지 (입력을 모두 지울 때까지 true — 화면이 "샘플(가상)" 표시를 붙여요) */
  snsSample: boolean;
  /** 수지·자금 시나리오 (여러 개를 이름 붙여 저장). 같은 version 1 에 나중에 더한 항목이라 옛 저장값에는 없어도 읽혀요 */
  scenarios: StoredScenario[];
  /** 지금 보고 편집하는 시나리오 (scenarios 에 있는 번호, 없으면 첫 번째) */
  selectedScenarioId: string | null;
  /** 겹쳐 비교할 시나리오 (선택한 것과 다른 번호, 없으면 null) */
  compareScenarioId: string | null;
}

export const emptyAdminStore = (): AdminStoreData => ({ version: ADMIN_STORE_VERSION, snsRows: [], snsSample: false, scenarios: [], selectedScenarioId: null, compareScenarioId: null });

/** 저장된 시나리오 목록을 걸러요: 시나리오 검사(validateScenario)를 통과하고 번호가 겹치지 않는 것만, 상한까지 */
function sanitizeScenarios(value: unknown): StoredScenario[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: StoredScenario[] = [];
  for (const item of value) {
    if (result.length >= MAX_SCENARIOS) break;
    if (typeof item !== "object" || item === null) continue;
    const record = item as Record<string, unknown>;
    const id = record.id;
    if (typeof id !== "string" || id === "" || id.length > 64 || seen.has(id)) continue;
    const parsed = validateScenario(record.scenario);
    if (!parsed.ok) continue;
    seen.add(id);
    result.push({ id, sample: record.sample === true, scenario: parsed.scenario });
  }
  return result;
}

/** 선택·비교 번호를 목록에 맞춰요: 선택이 없거나 없는 번호면 첫 시나리오, 비교는 목록에 있고 선택과 다를 때만 */
function normalizeSelection(scenarios: readonly StoredScenario[], selected: unknown, compare: unknown): Pick<AdminStoreData, "selectedScenarioId" | "compareScenarioId"> {
  const ids = new Set(scenarios.map((item) => item.id));
  const selectedScenarioId = typeof selected === "string" && ids.has(selected) ? selected : (scenarios[0]?.id ?? null);
  const compareScenarioId = typeof compare === "string" && ids.has(compare) && compare !== selectedScenarioId ? compare : null;
  return { selectedScenarioId, compareScenarioId };
}

/** 저장된 글자를 읽어요. 깨졌거나 버전이 다르면 빈 상태로, 올바른 행만 걸러서 (예외를 던지지 않아요) */
export function parseAdminStore(raw: string | null | undefined): AdminStoreData {
  if (!raw) return emptyAdminStore();
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return emptyAdminStore();
  }
  if (typeof value !== "object" || value === null) return emptyAdminStore();
  const record = value as Record<string, unknown>;
  if (record.version !== ADMIN_STORE_VERSION) return emptyAdminStore();
  const snsRows = sanitizeSnsRows(record.snsRows);
  const scenarios = sanitizeScenarios(record.scenarios);
  // 행이 하나도 없는데 샘플 표시만 남아 있으면 표시도 없애요
  return {
    version: ADMIN_STORE_VERSION,
    snsRows,
    snsSample: snsRows.length > 0 && record.snsSample === true,
    scenarios,
    ...normalizeSelection(scenarios, record.selectedScenarioId, record.compareScenarioId),
  };
}

export function serializeAdminStore(data: AdminStoreData): string {
  return JSON.stringify({
    version: ADMIN_STORE_VERSION,
    snsRows: data.snsRows,
    snsSample: data.snsSample,
    scenarios: data.scenarios,
    selectedScenarioId: data.selectedScenarioId,
    compareScenarioId: data.compareScenarioId,
  });
}

// ───────── 저장소 (동기) ─────────
export interface SyncStorage {
  /** local = 이 브라우저에 남아요 / memory = 저장소를 쓸 수 없어서 화면을 닫으면 사라져요 */
  readonly kind: "local" | "memory";
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** 메모리에만 저장 (테스트·저장소를 못 쓰는 브라우저용) */
export function memoryStorage(initial: Record<string, string> = {}): SyncStorage {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    kind: "memory",
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
}

// 브라우저 저장소를 못 쓸 때 쓰는 메모리 — 화면을 옮겨 다녀도(같은 탭 안에서는) 입력이 남도록 한 곳에 둬요
let fallback: SyncStorage | null = null;

/**
 * 브라우저 localStorage. 접근만 해도 예외가 나는 환경(쿠키 차단·사생활 보호 모드)이나 쓰기가 막힌 환경은 메모리로 대신해요.
 * 화면이 처음 열릴 때 한 번만 불러요(렌더링 중이 아니라 상태의 초기값을 만들 때).
 */
export function browserSyncStorage(): SyncStorage {
  try {
    const area = typeof globalThis.localStorage === "undefined" ? null : globalThis.localStorage;
    if (area) {
      // 쓰기가 되는지 한 번 시험해요 (읽기만 되는 환경이 있어요)
      const probe = `${ADMIN_STORAGE_KEY}:probe`;
      area.setItem(probe, "1");
      area.removeItem(probe);
      return {
        kind: "local",
        getItem: (key) => area.getItem(key),
        setItem: (key, value) => area.setItem(key, value),
        removeItem: (key) => area.removeItem(key),
      };
    }
  } catch {
    // 아래의 메모리로
  }
  fallback ??= memoryStorage();
  return fallback;
}

/** 저장된 값을 읽어요 (없거나 깨졌으면 빈 상태) */
export function readAdminStore(storage: SyncStorage = browserSyncStorage()): AdminStoreData {
  try {
    return parseAdminStore(storage.getItem(ADMIN_STORAGE_KEY));
  } catch {
    return emptyAdminStore();
  }
}

/** 저장해요. 용량이 부족하는 등 실패하면 false (화면이 알려 줘요) */
export function writeAdminStore(data: AdminStoreData, storage: SyncStorage = browserSyncStorage()): boolean {
  try {
    storage.setItem(ADMIN_STORAGE_KEY, serializeAdminStore(data));
    return true;
  } catch {
    return false;
  }
}

export type AdminStorePatch = Partial<Omit<AdminStoreData, "version">>;

/** 남길 값이 하나도 없는 상태인지 (비어 있으면 빈 글자를 저장하지 않고 키째 지워요) */
export function isEmptyAdminStore(data: AdminStoreData): boolean {
  return data.snsRows.length === 0 && data.scenarios.length === 0;
}

/**
 * 일부만 바꿔 저장해요. 다른 화면(다른 탭)이 방금 저장한 값을 덮어쓰지 않으려고, 저장 직전에 다시 읽은 값(fresh)을 기준으로 바꿔요 —
 * patch 는 바꿀 부분이거나, fresh 를 받아 바꿀 부분을 돌려주는 함수예요(예: 지금 저장된 행에 한 줄 더하기).
 * 돌려주는 data 는 저장하려던 값이고, ok 가 false 면 저장은 실패한 거예요(화면에는 바뀐 값을 그대로 보여 주고 알림만 띄워요).
 * 행이 하나도 없으면 샘플 표시도 함께 끄고, 남길 값(SNS 행·시나리오)이 전혀 없으면 저장소에서 키를 지워요("모두 지우기" 뒤에 빈 값이 남지 않게).
 */
export function updateAdminStore(patch: AdminStorePatch | ((fresh: AdminStoreData) => AdminStorePatch), storage: SyncStorage = browserSyncStorage()): { data: AdminStoreData; ok: boolean } {
  const fresh = readAdminStore(storage);
  const merged: AdminStoreData = { ...fresh, ...(typeof patch === "function" ? patch(fresh) : patch), version: ADMIN_STORE_VERSION };
  // 시나리오가 늘고 줄어도 선택·비교 번호는 항상 목록 안의 것이 되게 맞춰요
  const selection = normalizeSelection(merged.scenarios, merged.selectedScenarioId, merged.compareScenarioId);
  const data: AdminStoreData = { ...merged, ...selection, snsSample: merged.snsRows.length === 0 ? false : merged.snsSample };
  return { data, ok: isEmptyAdminStore(data) ? clearAdminStore(storage) : writeAdminStore(data, storage) };
}

/** 운영자 화면이 남긴 값을 모두 지워요 */
export function clearAdminStore(storage: SyncStorage = browserSyncStorage()): boolean {
  try {
    storage.removeItem(ADMIN_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
