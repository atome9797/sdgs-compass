import { describe, expect, it } from "vitest";
import { daysBetween } from "@sdgs-compass/core/format";
import { reducer } from "@sdgs-compass/core/state";
import { createInitialState } from "./seed";
import {
  browserStorage, clearStorage, EMPTY_PREFS, isDemoState, loadPrefs, loadState, memoryStorage, parsePrefs, parseState, savePrefs, saveState,
  serializeState, STORAGE_KEYS, type AsyncKeyValueStore,
} from "./storage";

const TODAY = "2026-10-30";

describe("memoryStorage / browserStorage", () => {
  it("넣고 꺼내고 지워요", async () => {
    const kv = memoryStorage();
    expect(await kv.getItem("a")).toBeNull();
    await kv.setItem("a", "1");
    expect(await kv.getItem("a")).toBe("1");
    await kv.removeItem("a");
    expect(await kv.getItem("a")).toBeNull();
    expect(await memoryStorage({ x: "y" }).getItem("x")).toBe("y");
  });

  it("브라우저 저장소가 없는 환경(Node)에서는 메모리로 대신해요", async () => {
    const kv = browserStorage();
    await kv.setItem("k", "v");
    expect(await kv.getItem("k")).toBe("v");
    await kv.removeItem("k");
    expect(await kv.getItem("k")).toBeNull();
  });
});

describe("설정(언어·역할)", () => {
  it("읽기: 비었거나 깨졌으면 '아직 안 고름'", () => {
    expect(parsePrefs(null)).toEqual(EMPTY_PREFS);
    expect(parsePrefs("not json")).toEqual(EMPTY_PREFS);
    expect(parsePrefs("[]")).toEqual(EMPTY_PREFS);
    expect(parsePrefs('{"locale":"en","role":"admin"}')).toEqual(EMPTY_PREFS);
  });

  it("읽기: 알아볼 수 있는 값만 가져와요", () => {
    expect(parsePrefs('{"locale":"ko","role":"b2b"}')).toEqual({ locale: "ko", role: "b2b" });
    expect(parsePrefs('{"locale":"ja"}')).toEqual({ locale: "ja", role: null });
    expect(parsePrefs('{"locale":"fr","role":"b2c"}')).toEqual({ locale: null, role: "b2c" });
  });

  it("저장하고 다시 읽어요", async () => {
    const kv = memoryStorage();
    expect(await loadPrefs(kv)).toEqual(EMPTY_PREFS);
    await savePrefs(kv, { locale: "ko", role: "b2c" });
    expect(await loadPrefs(kv)).toEqual({ locale: "ko", role: "b2c" });
  });
});

describe("데모 상태 저장", () => {
  const initial = createInitialState(TODAY);

  it("직렬화한 뒤 다시 읽으면 같아요", () => {
    const parsed = parseState(serializeState(initial));
    expect(parsed).toEqual(initial);
    expect(isDemoState(initial)).toBe(true);
  });

  it("이해할 수 없는 값은 버려요", () => {
    expect(parseState(null)).toBeNull();
    expect(parseState("{")).toBeNull();
    expect(parseState("{}")).toBeNull();
    expect(parseState(JSON.stringify({ ...initial, version: 2 }))).toBeNull();
    expect(parseState(JSON.stringify({ ...initial, challenges: "x" }))).toBeNull();
    expect(parseState(JSON.stringify({ ...initial, today: "어제" }))).toBeNull();
    expect(parseState(JSON.stringify({ ...initial, cert: { ecoPackage: { value: 1, evidence: true } } }))).toBeNull();
    expect(parseState(JSON.stringify({ ...initial, challenges: [{ id: "x", opensOn: "2026-01-01", closesOn: "내일" }] }))).toBeNull();
  });

  it("저장된 게 없으면 샘플 데이터로 시작해요", async () => {
    expect(await loadState(memoryStorage(), TODAY)).toEqual(initial);
  });

  it("저장한 상태를 같은 날 다시 열면 그대로예요", async () => {
    const kv = memoryStorage();
    const changed = reducer(initial, { type: "toggleBookmark", challengeId: "ch-solar" });
    await saveState(kv, changed);
    expect(await loadState(kv, TODAY)).toEqual(changed);
  });

  it("다른 날 열면 날짜를 옮겨서 남은 날수(D-day)가 그대로예요", async () => {
    const kv = memoryStorage();
    await saveState(kv, initial);
    const later = await loadState(kv, "2026-12-25");
    expect(later.today).toBe("2026-12-25");
    initial.challenges.forEach((c, i) => {
      expect(daysBetween(later.today, later.challenges[i].closesOn)).toBe(daysBetween(TODAY, c.closesOn));
    });
  });

  it("깨진 값이 저장돼 있으면 샘플 데이터로 새로 시작해요", async () => {
    const kv = memoryStorage({ [STORAGE_KEYS.state]: "{broken" });
    expect(await loadState(kv, TODAY)).toEqual(initial);
  });

  it("저장소가 예외를 던져도 앱은 계속 돌아가요", async () => {
    const broken: AsyncKeyValueStore = {
      getItem: async () => {
        throw new Error("denied");
      },
      setItem: async () => {
        throw new Error("full");
      },
      removeItem: async () => {
        throw new Error("denied");
      },
    };
    expect(await loadState(broken, TODAY)).toEqual(initial);
    expect(await loadPrefs(broken)).toEqual(EMPTY_PREFS);
    await saveState(broken, initial);
    await savePrefs(broken, EMPTY_PREFS);
    await clearStorage(broken);
  });

  it("지우기", async () => {
    const kv = memoryStorage();
    await saveState(kv, initial);
    await savePrefs(kv, { locale: "ja", role: "b2b" });
    await clearStorage(kv);
    expect(await kv.getItem(STORAGE_KEYS.state)).toBeNull();
    expect(await kv.getItem(STORAGE_KEYS.prefs)).toBeNull();
  });
});

describe("SNS 피드가 생기기 전에 저장된 데모 상태", () => {
  it("posts 가 없는 예전 상태도 버리지 않고, 저장했을 때의 날짜 기준 샘플 글을 채워서 이어 써요", async () => {
    const { posts: _posts, ...legacy } = createInitialState("2026-10-20");
    void _posts;
    const withMine = { ...legacy, shares: 3 }; // 예전에 쓰던 흔적(공유 3회)도 그대로 남아야 해요
    const kv = memoryStorage({ [STORAGE_KEYS.state]: JSON.stringify(withMine) });
    const loaded = await loadState(kv, "2026-10-30");
    expect(loaded.shares).toBe(3);
    expect(loaded.today).toBe("2026-10-30");
    expect(loaded.posts).toEqual(createInitialState("2026-10-30").posts); // 날짜도 오늘 기준으로 옮겨졌어요
    expect(isDemoState(loaded)).toBe(true);
  });

  it("parseState 는 예전 상태에 샘플 글을 채워 주지만, isDemoState 는 posts 가 있어야 통과해요", () => {
    const { posts: _posts, ...legacy } = createInitialState(TODAY);
    void _posts;
    expect(isDemoState(legacy)).toBe(false);
    expect(parseState(JSON.stringify(legacy))?.posts).toHaveLength(8);
  });

  it("오늘 날짜가 깨진 예전 상태는 채우지 않고 버려요", () => {
    const { posts: _posts, ...legacy } = createInitialState(TODAY);
    void _posts;
    expect(parseState(JSON.stringify({ ...legacy, today: "어제" }))).toBeNull();
  });
});

describe("SNS 피드 글 검사", () => {
  const good = createInitialState(TODAY);
  const withPosts = (posts: unknown) => JSON.stringify({ ...good, posts });

  it("올바른 글(샘플 8건 + 내가 올린 글)은 통과해요", () => {
    const next = reducer(good, { type: "createPost", draft: { kind: "pr", title: "t", body: "b", sdgIds: [14], requestOfficial: true }, at: "2026-10-30T10:00" });
    expect(parseState(serializeState(next))).toEqual(next);
  });

  it("글이 배열이 아니거나, 모양이 틀린 글이 하나라도 있으면 버려요", () => {
    const [first, ...rest] = good.posts;
    expect(parseState(withPosts("글"))).toBeNull();
    expect(parseState(withPosts([...rest, { ...first, kind: "story" }]))).toBeNull();
    expect(parseState(withPosts([...rest, { ...first, createdAt: "어제" }]))).toBeNull();
    expect(parseState(withPosts([...rest, { ...first, body: 42 }]))).toBeNull();
    expect(parseState(withPosts([...rest, { ...first, likes: "많음" }]))).toBeNull();
    expect(parseState(withPosts([...rest, { ...first, likedBy: ["admin"] }]))).toBeNull();
    expect(parseState(withPosts([...rest, { ...first, sdgIds: [99] }]))).toBeNull();
    expect(parseState(withPosts([...rest, 1]))).toBeNull();
  });

  it("자랑 글은 실적이, 홍보 글은 기업·제목이 있어야 해요", () => {
    const brag = good.posts.find((p) => p.kind === "brag")!;
    const pr = good.posts.find((p) => p.kind === "pr")!;
    const others = (id: string) => good.posts.filter((p) => p.id !== id);
    expect(parseState(withPosts([...others(brag.id), { ...brag, achievement: null }]))).toBeNull();
    expect(parseState(withPosts([...others(brag.id), { ...brag, achievement: { ...(brag as { achievement: object }).achievement, kind: "share" } }]))).toBeNull();
    expect(parseState(withPosts([...others(pr.id), { ...pr, companyId: 7 }]))).toBeNull();
    expect(parseState(withPosts([...others(pr.id), { ...pr, official: { on: "내일", feeYen: 3000, status: "scheduled" } }]))).toBeNull();
    expect(parseState(withPosts([...others(pr.id), { ...pr, official: { on: "2026-11-01", feeYen: 3000, status: "posted" } }]))).toBeNull();
  });
});
