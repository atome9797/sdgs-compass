"use client";

// 앱 전체 상태(언어·역할·데모 데이터)를 React 에 연결해요.
// 불러오기·저장은 packages/data 의 loadApp / persistApp 이 하고, 여기서는 구독(useSyncExternalStore)과 편의 훅만 만들어요.
// 첫 렌더링은 항상 "아직 안 불러옴"(스플래시)이라서 서버 렌더링 결과와 브라우저 첫 화면이 같아요(하이드레이션 불일치 없음).
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { createAppStore, loadApp, persistApp, resetEverything, type AppAction, type AppState, type AppStore, type Persistence } from "@sdgs-compass/data/app";
import { browserStorage } from "@sdgs-compass/data/storage";
import type { DemoState, Role } from "@sdgs-compass/core/domain";
import { DEFAULT_LOCALE, localeFromQuery, type Locale } from "@sdgs-compass/core/i18n";
import { makeT, type TFunction } from "@sdgs-compass/core/messages";

interface Session {
  store: AppStore;
  persistence: Persistence | null;
}

interface AppContextValue {
  /** null = 아직 저장소를 불러오는 중 */
  app: AppState | null;
  dispatch: (action: AppAction) => void;
  /** 설정·데모 데이터를 모두 지우고 처음(언어 선택)부터 다시 */
  reset: () => Promise<void>;
  /** 방금 초기화했는지 (언어 선택 화면에 "초기화했어요"를 한 번 보여 줘요) */
  resetNotice: boolean;
  clearResetNotice: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

interface AppProviderProps {
  children: ReactNode;
  /** 테스트·미리보기용: 저장소를 거치지 않고 이 상태로 바로 시작해요 */
  initialApp?: AppState;
}

export function AppProvider({ children, initialApp }: AppProviderProps) {
  const [session, setSession] = useState<Session | null>(() => (initialApp ? { store: createAppStore(initialApp), persistence: null } : null));
  const [resetNotice, setResetNotice] = useState(false);

  // 브라우저 저장소(localStorage)에서 불러오기 — 렌더링 중이 아니라 마운트 뒤에 해요
  useEffect(() => {
    if (initialApp) return;
    let cancelled = false;
    let persistence: Persistence | null = null;
    const kv = browserStorage();
    void loadApp(kv, new Date()).then((app) => {
      if (cancelled) return;
      const store = createAppStore(app);
      persistence = persistApp(store, kv);
      // 주소에 ?lang=ja|ko 가 있으면 저장된 언어보다 우선하고 그 값을 저장해요(#20 — QR 로 열면 일본어로 바로 시작).
      // 저장 구독(persistApp)을 켠 뒤에 바꿔야 저장돼요. 언어를 고른 것과 같아서 첫 방문이면 다음은 역할 선택이에요.
      const fromUrl = localeFromQuery(window.location.search);
      if (fromUrl && fromUrl !== app.locale) store.dispatch({ type: "setLocale", locale: fromUrl });
      setSession({ store, persistence });
    });
    return () => {
      cancelled = true;
      persistence?.stop();
    };
  }, [initialApp]);

  // 탭을 닫거나 숨기기 직전에 기다리던 저장을 끝내요
  useEffect(() => {
    const persistence = session?.persistence;
    if (!persistence) return;
    const flush = () => void persistence.flush();
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flush);
    };
  }, [session]);

  const subscribe = useCallback((listener: () => void) => (session ? session.store.subscribe(listener) : () => undefined), [session]);
  const getSnapshot = useCallback(() => (session ? session.store.getState() : null), [session]);
  const app = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // <html lang> 가 지금 언어를 따라가요 (스크린 리더·글꼴 선택)
  const lang = app?.locale ?? DEFAULT_LOCALE;
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const dispatch = useCallback(
    (action: AppAction) => {
      session?.store.dispatch(action);
    },
    [session],
  );

  const reset = useCallback(async () => {
    if (!session) return;
    const kv = browserStorage();
    session.persistence?.stop();
    await resetEverything(session.store, kv, new Date());
    // 위에서 저장 구독(persistence)을 멈추고 저장소를 비웠어요. 새 저장소로 바꿔 저장을 다시 켜면, 첫 실행처럼 언어 선택부터 시작해요
    const store = createAppStore({ locale: null, role: null, demo: session.store.getState().demo });
    setSession({ store, persistence: persistApp(store, kv) });
    setResetNotice(true);
  }, [session]);

  const clearResetNotice = useCallback(() => setResetNotice(false), []);
  const value = useMemo<AppContextValue>(() => ({ app, dispatch, reset, resetNotice, clearResetNotice }), [app, dispatch, reset, resetNotice, clearResetNotice]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/** 게이트(스플래시·언어·역할 선택)용: 아직 불러오기 전이면 app 이 null 이에요 */
export function useBoot(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("AppProvider 안에서만 쓸 수 있어요");
  return ctx;
}

export interface SessionValue {
  app: AppState;
  locale: Locale;
  role: Role;
  demo: DemoState;
  t: TFunction;
  dispatch: (action: AppAction) => void;
  reset: () => Promise<void>;
}

/** 화면용: 언어와 역할까지 정해진 뒤(게이트를 지난 뒤)에만 쓸 수 있어요 */
export function useSession(): SessionValue {
  const { app, dispatch, reset } = useBoot();
  const locale = app?.locale ?? DEFAULT_LOCALE;
  const t = useMemo(() => makeT(locale), [locale]);
  if (!app || app.locale === null || app.role === null) throw new Error("언어·역할을 고른 뒤에만 쓸 수 있어요");
  return { app, locale: app.locale, role: app.role, demo: app.demo, t, dispatch, reset };
}
