import { describe, expect, it } from "vitest";
import { addDays } from "@sdgs-compass/core/format";
import { appReducer, createAppStore, loadApp, persistApp, resetEverything, type AppState } from "./app";
import { createInitialState } from "./seed";
import { loadPrefs, loadState, memoryStorage, STORAGE_KEYS, type AsyncKeyValueStore } from "./storage";

const TODAY = "2026-10-30";
const NOW = new Date(2026, 9, 30, 12, 0);
const fresh = (): AppState => ({ locale: null, role: null, demo: createInitialState(TODAY) });

/** 몇 번 쓰였는지 세는 저장소 */
function countingStorage() {
  const inner = memoryStorage();
  const writes: string[] = [];
  const kv: AsyncKeyValueStore = {
    getItem: (k) => inner.getItem(k),
    setItem: async (k, v) => {
      writes.push(k);
      await inner.setItem(k, v);
    },
    removeItem: (k) => inner.removeItem(k),
  };
  return { kv, writes };
}

describe("appReducer", () => {
  it("언어·역할을 바꿔요 (같은 값이면 그대로)", () => {
    const s = fresh();
    const ko = appReducer(s, { type: "setLocale", locale: "ko" });
    expect(ko.locale).toBe("ko");
    expect(ko.demo).toBe(s.demo);
    expect(appReducer(ko, { type: "setLocale", locale: "ko" })).toBe(ko);
    const b2b = appReducer(ko, { type: "setRole", role: "b2b" });
    expect(b2b.role).toBe("b2b");
    expect(appReducer(b2b, { type: "setRole", role: "b2b" })).toBe(b2b);
    expect(appReducer(b2b, { type: "setRole", role: null }).role).toBeNull();
  });

  it("데모 동작은 demo 에 전달해요 (바뀐 게 없으면 상태 그대로)", () => {
    const s = fresh();
    const next = appReducer(s, { type: "toggleBookmark", challengeId: "ch-solar" });
    expect(next.demo.bookmarks).toContain("ch-solar");
    expect(next.locale).toBe(s.locale);
    expect(appReducer(s, { type: "toggleBookmark", challengeId: "없음" })).toBe(s);
  });

  it("resetDemo: 샘플 데이터로 되돌리되 언어·역할은 유지", () => {
    let s = appReducer(fresh(), { type: "setLocale", locale: "ko" });
    s = appReducer(s, { type: "setRole", role: "b2c" });
    s = appReducer(s, { type: "recordShare" });
    expect(s.demo.shares).toBe(2);
    const reset = appReducer(s, { type: "resetDemo", today: "2026-11-01" });
    expect(reset.demo).toEqual(createInitialState("2026-11-01"));
    expect(reset.locale).toBe("ko");
    expect(reset.role).toBe("b2c");
  });
});

describe("loadApp / persistApp", () => {
  it("처음 실행: 언어·역할이 비어 있어서 첫 화면에서 고르게 해요", async () => {
    const app = await loadApp(memoryStorage(), NOW);
    expect(app.locale).toBeNull();
    expect(app.role).toBeNull();
    expect(app.demo).toEqual(createInitialState(TODAY));
  });

  it("바뀐 내용을 저장하고, 다시 열면 그대로 이어져요", async () => {
    const kv = memoryStorage();
    const store = createAppStore(await loadApp(kv, NOW));
    const persistence = persistApp(store, kv, { delayMs: 0 });
    store.dispatch({ type: "setLocale", locale: "ko" });
    store.dispatch({ type: "setRole", role: "b2b" });
    store.dispatch({ type: "toggleBookmark", challengeId: "ch-solar" });
    await persistence.flush();
    persistence.stop();

    const reopened = await loadApp(kv, NOW);
    expect(reopened.locale).toBe("ko");
    expect(reopened.role).toBe("b2b");
    expect(reopened.demo.bookmarks).toContain("ch-solar");
  });

  it("다음 날 다시 열어도 날짜가 따라와요", async () => {
    const kv = memoryStorage();
    const store = createAppStore(await loadApp(kv, NOW));
    const persistence = persistApp(store, kv, { delayMs: 0 });
    store.dispatch({ type: "toggleBookmark", challengeId: "ch-solar" });
    await persistence.flush();
    const nextDay = new Date(2026, 9, 31, 9, 0);
    const reopened = await loadApp(kv, nextDay);
    expect(reopened.demo.today).toBe(addDays(TODAY, 1));
    expect(reopened.demo.bookmarks).toContain("ch-solar");
  });

  it("바뀐 쪽만 저장해요 (설정만 바뀌면 데모 상태는 다시 쓰지 않아요)", async () => {
    const { kv, writes } = countingStorage();
    const store = createAppStore(fresh());
    const persistence = persistApp(store, kv, { delayMs: 0 });
    store.dispatch({ type: "setLocale", locale: "ja" });
    await persistence.flush();
    expect(writes).toEqual([STORAGE_KEYS.prefs]);
    store.dispatch({ type: "recordShare" });
    await persistence.flush();
    expect(writes).toEqual([STORAGE_KEYS.prefs, STORAGE_KEYS.state]);
    await persistence.flush();
    expect(writes).toHaveLength(2);
    persistence.stop();
  });

  it("stop 한 뒤에는 저장하지 않아요", async () => {
    const { kv, writes } = countingStorage();
    const store = createAppStore(fresh());
    const persistence = persistApp(store, kv, { delayMs: 0 });
    persistence.stop();
    store.dispatch({ type: "setLocale", locale: "ko" });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(writes).toEqual([]);
  });

  it("지연 저장: 여러 번 바뀌어도 한 번에 모아 써요", async () => {
    const { kv, writes } = countingStorage();
    const store = createAppStore(fresh());
    const persistence = persistApp(store, kv, { delayMs: 10 });
    store.dispatch({ type: "recordShare" });
    store.dispatch({ type: "recordShare" });
    store.dispatch({ type: "recordShare" });
    expect(writes).toEqual([]);
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(writes).toEqual([STORAGE_KEYS.state]);
    persistence.stop();
  });
});

describe("resetEverything", () => {
  it("저장소를 비우고 처음 상태로 돌아가요 (언어 선택부터 다시)", async () => {
    const kv = memoryStorage();
    const store = createAppStore(await loadApp(kv, NOW));
    const persistence = persistApp(store, kv, { delayMs: 0 });
    store.dispatch({ type: "setLocale", locale: "ko" });
    store.dispatch({ type: "setRole", role: "b2c" });
    store.dispatch({ type: "recordShare" });
    await persistence.flush();
    persistence.stop();

    await resetEverything(store, kv, NOW);
    expect(store.getState().locale).toBeNull();
    expect(store.getState().role).toBeNull();
    expect(store.getState().demo).toEqual(createInitialState(TODAY));
    expect(await loadPrefs(kv)).toEqual({ locale: null, role: null });
    expect(await loadState(kv, TODAY)).toEqual(createInitialState(TODAY));
  });
});
