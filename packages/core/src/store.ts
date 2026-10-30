// 아주 작은 상태 저장소(구독 가능). React 의 useSyncExternalStore(store.subscribe, store.getState) 와 함께 써요.
// 프레임워크에 의존하지 않아서 웹·모바일이 같은 코드를 쓰고, 테스트도 React 없이 할 수 있어요.
export interface Store<S, A> {
  getState(): S;
  dispatch(action: A): void;
  subscribe(listener: () => void): () => void;
}

export function createStore<S, A>(reducer: (state: S, action: A) => S, initial: S): Store<S, A> {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    getState: () => state,
    dispatch(action) {
      const next = reducer(state, action);
      if (next === state) return;
      state = next;
      for (const listener of [...listeners]) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
