// 앱 전체 상태: 저장된 설정(언어·유형)과 데모 상태를 AsyncStorage 에서 읽어 와서 하나의 저장소(store)로 들고 있어요.
// 화면은 useApp() 으로 상태를 읽고 dispatch(action) 만 해요. 바뀐 값은 persistApp 이 알아서 기기에 저장해요.
// 읽는 동안에는 fallback(시작 화면)을 보여 주고, 다 읽으면 children 을 그려요.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { AppState as NativeAppState, StyleSheet, View } from "react-native";
import type { DemoState } from "@sdgs-compass/core/domain";
import { toIsoDate } from "@sdgs-compass/core/format";
import { DEFAULT_LOCALE, type Locale } from "@sdgs-compass/core/i18n";
import { makeT, type TFunction } from "@sdgs-compass/core/messages";
import {
  createAppStore,
  loadApp,
  persistApp,
  resetEverything,
  type AppAction,
  type AppState,
  type AppStore,
  type Persistence,
} from "@sdgs-compass/data/app";
import { createInitialState } from "@sdgs-compass/data/seed";
import { clearStorage, type AsyncKeyValueStore } from "@sdgs-compass/data/storage";
import { gateFor, type Gate } from "./routes";

interface Session {
  store: AppStore;
  persistence: Persistence;
}

interface AppContextValue {
  store: AppStore;
  /** "데모 초기화" 뒤에 언어가 저장돼 있어도 언어 선택부터 다시 보여 주는 표시 */
  languageForced: boolean;
  chooseLanguage: (locale: Locale) => void;
  resetAll: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

/** 저장된 값을 못 읽어도 앱은 열려야 해서, 처음 상태로 시작해요 (loadApp 은 보통 실패하지 않아요) */
function freshState(): AppState {
  return { locale: null, role: null, demo: createInitialState(toIsoDate(new Date())) };
}

export interface AppProviderProps {
  children: ReactNode;
  /** 저장된 값을 읽는 동안 보여 줄 화면 */
  fallback?: ReactNode;
  /** 저장소 (테스트에서 바꿔 끼워요) */
  storage?: AsyncKeyValueStore;
  /** 앱 화면이 처음 그려졌을 때 (시작 화면을 내려요) */
  onReady?: () => void;
}

export function AppProvider({ children, fallback = null, storage = AsyncStorage, onReady }: AppProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [languageForced, setLanguageForced] = useState(false);

  useEffect(() => {
    let active = true;
    let persistence: Persistence | null = null;
    loadApp(storage)
      .catch(freshState)
      .then((initial) => {
        if (!active) return;
        const store = createAppStore(initial);
        persistence = persistApp(store, storage);
        setSession({ store, persistence });
      });
    return () => {
      active = false;
      persistence?.stop();
    };
  }, [storage]);

  // 앱이 뒤로 가거나 꺼지기 전에, 아직 기다리는 저장을 끝내요
  useEffect(() => {
    if (session === null) return undefined;
    const subscription = NativeAppState.addEventListener("change", (status) => {
      if (status !== "active") void session.persistence.flush();
    });
    return () => subscription.remove();
  }, [session]);

  const chooseLanguage = useCallback(
    (locale: Locale) => {
      session?.store.dispatch({ type: "setLocale", locale });
      setLanguageForced(false);
    },
    [session],
  );

  const resetAll = useCallback(async () => {
    if (session === null) return;
    await resetEverything(session.store, storage);
    // resetEverything 은 저장소를 비운 뒤 상태만 되돌려요. 되돌린 값이 다시 저장되기 전에 끝내고 비워서,
    // 앱을 다시 열어도 처음처럼 언어 선택부터 나오게 해요.
    await session.persistence.flush();
    await clearStorage(storage);
    setLanguageForced(true);
  }, [session, storage]);

  const value = useMemo<AppContextValue | null>(
    () => (session === null ? null : { store: session.store, languageForced, chooseLanguage, resetAll }),
    [session, languageForced, chooseLanguage, resetAll],
  );

  if (value === null) return <>{fallback}</>;
  return (
    <AppContext.Provider value={value}>
      <View style={styles.flex} onLayout={onReady ? () => onReady() : undefined}>
        {children}
      </View>
    </AppContext.Provider>
  );
}

function useAppContext(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp 은 AppProvider 안에서만 쓸 수 있어요.");
  return value;
}

export interface AppApi {
  app: AppState;
  /** app.demo 의 줄임 (선택자에 그대로 넘겨요) */
  demo: DemoState;
  /** 고른 언어 (아직 안 골랐으면 기본값 — 첫 화면은 두 언어를 함께 보여 줘서 문제없어요) */
  locale: Locale;
  t: TFunction;
  /** 지금 열려야 하는 화면 묶음 */
  gate: Gate;
  dispatch: (action: AppAction) => void;
  /** 첫 화면(언어 선택)에서 사람이 직접 고른 언어를 저장해요 */
  chooseLanguage: (locale: Locale) => void;
  /** 설정·저장된 데모 상태를 모두 지우고 처음(언어 선택)부터 다시 */
  resetAll: () => Promise<void>;
}

/** 앱 상태를 구독해서 읽어요 (바뀔 때마다 이 화면이 다시 그려져요) */
export function useApp(): AppApi {
  const context = useAppContext();
  const { store } = context;
  const app = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  const locale = app.locale ?? DEFAULT_LOCALE;
  const t = useMemo(() => makeT(locale), [locale]);
  return {
    app,
    demo: app.demo,
    locale,
    t,
    gate: gateFor(app.locale, app.role, context.languageForced),
    dispatch: store.dispatch,
    chooseLanguage: context.chooseLanguage,
    resetAll: context.resetAll,
  };
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
