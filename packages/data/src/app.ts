// 앱 전체 상태 = 사용자 설정(언어·역할) + 데모 상태. 웹·모바일이 이 저장소 하나를 구독해서 화면을 그려요.
// 화면은 dispatch(action) 만 하고, 바뀐 값은 storage.ts 의 persistApp 이 알아서 기기에 저장해요.
import type { DemoState, Role } from "@sdgs-compass/core/domain";
import type { Locale } from "@sdgs-compass/core/i18n";
import { toIsoDate } from "@sdgs-compass/core/format";
import { reducer, type Action } from "@sdgs-compass/core/state";
import { createStore, type Store } from "@sdgs-compass/core/store";
import { createInitialState } from "./seed";
import { loadPrefs, loadState, savePrefs, saveState, clearStorage, type AsyncKeyValueStore } from "./storage";

export interface AppState {
  /** null = 아직 고르지 않음 (첫 화면의 언어 선택) */
  locale: Locale | null;
  /** null = 아직 고르지 않음 (언어 다음의 역할 선택) */
  role: Role | null;
  demo: DemoState;
}

export type AppAction =
  | Action
  /** null = 언어를 다시 고르게 해요 (데모 초기화에서 쓰고, 일반 화면은 일본어/한국어 중에서 골라요) */
  | { type: "setLocale"; locale: Locale | null }
  | { type: "setRole"; role: Role | null }
  /** 샘플 데이터로 되돌려요 (언어·역할 설정은 그대로) */
  | { type: "resetDemo"; today: string };

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "setLocale":
      return state.locale === action.locale ? state : { ...state, locale: action.locale };
    case "setRole":
      return state.role === action.role ? state : { ...state, role: action.role };
    case "resetDemo":
      return { ...state, demo: createInitialState(action.today) };
    default: {
      const demo = reducer(state.demo, action);
      return demo === state.demo ? state : { ...state, demo };
    }
  }
}

export type AppStore = Store<AppState, AppAction>;

export function createAppStore(initial: AppState): AppStore {
  return createStore(appReducer, initial);
}

/** 저장소에서 설정과 데모 상태를 불러와요. now 는 테스트에서 날짜를 고정할 때 써요. */
export async function loadApp(kv: AsyncKeyValueStore, now: Date = new Date()): Promise<AppState> {
  const [prefs, demo] = await Promise.all([loadPrefs(kv), loadState(kv, toIsoDate(now))]);
  return { locale: prefs.locale, role: prefs.role, demo };
}

export interface Persistence {
  /** 기다리는 저장을 지금 바로 끝내요 */
  flush(): Promise<void>;
  /** 더 이상 저장하지 않아요 */
  stop(): void;
}

/** 저장소가 바뀔 때마다 (delayMs 모아서) 기기에 저장해요. 설정과 데모 상태는 각각 바뀐 쪽만 저장해요. */
export function persistApp(store: AppStore, kv: AsyncKeyValueStore, options: { delayMs?: number } = {}): Persistence {
  const delayMs = options.delayMs ?? 250;
  let lastSaved = store.getState();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;
  let queue: Promise<void> = Promise.resolve();

  const writeNow = (): Promise<void> => {
    const current = store.getState();
    const previous = lastSaved;
    lastSaved = current;
    queue = queue.then(async () => {
      if (current.locale !== previous.locale || current.role !== previous.role) await savePrefs(kv, { locale: current.locale, role: current.role });
      if (current.demo !== previous.demo) await saveState(kv, current.demo);
    });
    return queue;
  };

  const unsubscribe = store.subscribe(() => {
    if (stopped) return;
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void writeNow();
    }, delayMs);
  });

  return {
    async flush() {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      await writeNow();
    },
    stop() {
      stopped = true;
      if (timer !== null) clearTimeout(timer);
      timer = null;
      unsubscribe();
    },
  };
}

/** 설정과 저장된 데모 상태를 모두 지우고 처음 상태로 돌아가요 (언어 선택 화면부터 다시) */
export async function resetEverything(store: AppStore, kv: AsyncKeyValueStore, now: Date = new Date()): Promise<void> {
  await clearStorage(kv);
  store.dispatch({ type: "setLocale", locale: null });
  store.dispatch({ type: "setRole", role: null });
  store.dispatch({ type: "resetDemo", today: toIsoDate(now) });
}
