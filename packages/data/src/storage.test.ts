import { describe, expect, it } from "vitest";
import type { PrPost } from "@sdgs-compass/core/domain";
import { addDays, daysBetween } from "@sdgs-compass/core/format";
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

describe("공식 SNS 게시 채널이 생기기 전에 저장된 데모 상태", () => {
  const current = createInitialState(TODAY);
  // 그때(Instagram 스토리 전용 · 하루 1사)의 저장 모양: official 에 channel 이 없어요.
  // 신청이 있던 글은 다른 기업의 po-1(내일) · po-2(모레)와 우리 회사 po-4(3일 뒤)예요.
  const legacyOfficial = (n: number) => ({ on: addDays(TODAY, n), feeYen: 3000, status: "scheduled" });
  const legacyPosts = current.posts.map((p) => {
    if (p.id === "po-1") return { ...p, official: legacyOfficial(1) };
    if (p.id === "po-2") return { ...p, official: legacyOfficial(2) };
    if (p.id === "po-3") return { ...p, official: null };
    if (p.id === "po-4") return { ...p, official: legacyOfficial(3) };
    return p;
  });
  const legacyJson = JSON.stringify({ ...current, posts: legacyPosts });
  const officialsOf = (state: { posts: readonly { id: string; kind: string; official?: unknown }[] }) =>
    state.posts.flatMap((p) => (p.kind === "pr" && p.official ? [[p.id, p.official] as const] : []));

  it("옛 모양 JSON 은 그대로 불러와지고, channel 이 없는 신청은 instagram · postUrl 은 null 로 읽어요 (날짜·게시료·상태는 그대로)", () => {
    expect(JSON.stringify(legacyPosts)).not.toContain('"channel"'); // 정말 옛 모양인지
    const loaded = parseState(legacyJson);
    expect(loaded).not.toBeNull();
    expect(isDemoState(loaded)).toBe(true);
    expect(officialsOf(loaded!)).toEqual([
      ["po-1", { on: addDays(TODAY, 1), channel: "instagram", feeYen: 3000, status: "scheduled", postUrl: null }],
      ["po-2", { on: addDays(TODAY, 2), channel: "instagram", feeYen: 3000, status: "scheduled", postUrl: null }],
      ["po-4", { on: addDays(TODAY, 3), channel: "instagram", feeYen: 3000, status: "scheduled", postUrl: null }],
    ]);
    // 신청이 없는 글과 다른 글은 건드리지 않아요
    const untouched = (posts: readonly { id: string }[]) => posts.filter((p) => !["po-1", "po-2", "po-4"].includes(p.id));
    expect(untouched(loaded!.posts)).toEqual(untouched(legacyPosts));
  });

  it("옛 상태를 다른 날 불러와도 날짜가 같은 날수만큼 옮겨지고 channel 은 instagram 이에요", async () => {
    const kv = memoryStorage({ [STORAGE_KEYS.state]: legacyJson });
    const loaded = await loadState(kv, "2026-11-02"); // 3일 뒤
    expect(officialsOf(loaded)).toEqual([
      ["po-1", { on: "2026-11-03", channel: "instagram", feeYen: 3000, status: "scheduled", postUrl: null }],
      ["po-2", { on: "2026-11-04", channel: "instagram", feeYen: 3000, status: "scheduled", postUrl: null }],
      ["po-4", { on: "2026-11-05", channel: "instagram", feeYen: 3000, status: "scheduled", postUrl: null }],
    ]);
    expect(isDemoState(loaded)).toBe(true);
  });

  it("옛 상태에서 이어 신청해도 지금 규칙(회사당 월 4회 · 하루 제한 없음)으로 세요 — 옛 신청도 우리 회사의 횟수예요", () => {
    const loaded = parseState(legacyJson)!;
    const next = (officialOn?: string) =>
      reducer(loaded, { type: "createPost", draft: { kind: "pr", title: "t", body: "b", sdgIds: [14], requestOfficial: true, officialOn }, at: "2026-10-30T10:00" }).posts[0];
    // 다른 회사(po-1)가 받은 내일도 고를 수 있어요 (날짜를 비우면 내일)
    expect(next()).toMatchObject({ official: { on: addDays(TODAY, 1), channel: "instagram" } });
    // 우리 회사의 옛 신청(po-4, 11/2)은 11월의 1건이라, 11월은 3건을 더 넣으면 차요
    let state = loaded;
    for (let i = 0; i < 3; i++) state = reducer(state, { type: "createPost", draft: { kind: "pr", title: `t${i}`, body: "b", sdgIds: [14], requestOfficial: true, officialOn: "2026-11-10" }, at: "2026-10-30T10:00" });
    expect(reducer(state, { type: "createPost", draft: { kind: "pr", title: "5", body: "b", sdgIds: [14], requestOfficial: true, officialOn: "2026-11-10" }, at: "2026-10-30T10:00" })).toBe(state);
    expect(next("2026-11-10")).toMatchObject({ official: { on: "2026-11-10" } });
  });

  it("channel 이 틀린 값이면 (youtube · 빈 글자 · 대소문자 · null · 숫자) 저장된 상태를 버려요", () => {
    for (const bad of ["youtube", "", "Instagram", null, 7]) {
      const posts = current.posts.map((p) => (p.id === "po-1" && p.kind === "pr" ? { ...p, official: { ...p.official, channel: bad } } : p));
      expect(parseState(JSON.stringify({ ...current, posts })), String(bad)).toBeNull();
    }
  });

  it("지금 모양(채널이 있는 신청)은 저장했다 불러와도 그대로예요", () => {
    expect(officialsOf(current).map(([, o]) => (o as { channel: string }).channel).sort()).toEqual(["instagram", "instagram", "instagram", "x"]);
    expect(parseState(serializeState(current))).toEqual(current);
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
  });
});

describe("공식 SNS 게시 상태·게시글 주소가 생기기 전에 저장된 데모 상태 (#31)", () => {
  const current = createInitialState(TODAY);
  const pr = current.posts.find((p) => p.id === "po-4" && p.kind === "pr")!;
  const others = current.posts.filter((p) => p.id !== pr.id);
  const load = (official: unknown) => {
    const loaded = parseState(JSON.stringify({ ...current, posts: [...others, { ...pr, official }] }));
    return loaded?.posts.find((p) => p.id === pr.id) as PrPost | undefined;
  };
  const day = addDays(TODAY, 2);

  it("상태가 없거나 모르는 값이면 예정으로, postUrl 은 null 로 읽어요", () => {
    expect(load({ on: day, channel: "x", feeYen: 3000 })?.official).toEqual({ on: day, channel: "x", feeYen: 3000, status: "scheduled", postUrl: null });
    for (const status of ["cancelled", "done", "", null, 1, "Posted"]) {
      expect(load({ on: day, channel: "x", feeYen: 3000, status })?.official, String(status)).toEqual({ on: day, channel: "x", feeYen: 3000, status: "scheduled", postUrl: null });
    }
    // 채널도 상태도 없는 아주 옛 모양
    expect(load({ on: day, feeYen: 3000 })?.official).toEqual({ on: day, channel: "instagram", feeYen: 3000, status: "scheduled", postUrl: null });
  });

  it("게시 완료는 그대로 읽고, 게시글 주소는 https:// 일 때만 남겨요 (예정에 붙은 주소·이상한 주소는 null)", () => {
    const url = "https://www.instagram.com/p/sample/";
    expect(load({ on: day, channel: "instagram", feeYen: 3000, status: "posted" })?.official).toEqual({ on: day, channel: "instagram", feeYen: 3000, status: "posted", postUrl: null });
    expect(load({ on: day, channel: "instagram", feeYen: 3000, status: "posted", postUrl: url })?.official?.postUrl).toBe(url);
    expect(load({ on: day, channel: "instagram", feeYen: 3000, status: "scheduled", postUrl: url })?.official?.postUrl).toBeNull();
    for (const bad of ["javascript:alert(1)", "http://www.instagram.com/p/x/", "https://", "www.instagram.com", 42, {}]) {
      expect(load({ on: day, channel: "instagram", feeYen: 3000, status: "posted", postUrl: bad })?.official, String(bad)).toMatchObject({ status: "posted", postUrl: null });
    }
  });

  it("지금 모양(게시 완료 샘플 po-1 포함)은 저장했다 불러와도 그대로예요", () => {
    expect(current.posts.find((p) => p.id === "po-1")).toMatchObject({ official: { status: "posted", postUrl: null } });
    expect(parseState(serializeState(current))).toEqual(current);
  });

  it("날짜·채널·게시료가 틀린 신청은 여전히 버려요", () => {
    expect(load({ on: "내일", channel: "x", feeYen: 3000, status: "scheduled", postUrl: null })).toBeUndefined();
    expect(load({ on: day, channel: "youtube", feeYen: 3000, status: "posted", postUrl: null })).toBeUndefined();
    expect(load({ on: day, channel: "x", feeYen: "무료", status: "scheduled", postUrl: null })).toBeUndefined();
  });
});

describe("실천 마크(#35)가 생기기 전에 저장된 데모 상태", () => {
  const current = createInitialState(TODAY);
  /** 회사에 certScore 가 없던 때의 모양 (데모에서 이어 쓰던 상태) */
  const old = { ...current, companies: current.companies.map(({ certScore: _drop, ...company }) => company) };

  it("certScore 가 없는 예전 상태도 버리지 않고, 샘플 회사의 가상 마크 값을 채워서 이어 써요", () => {
    expect(isDemoState(old)).toBe(false);
    const loaded = parseState(JSON.stringify(old));
    expect(loaded).not.toBeNull();
    expect(loaded!.companies.map((c) => [c.id, c.certScore])).toEqual(current.companies.map((c) => [c.id, c.certScore]));
    expect(loaded).toEqual(current);
  });

  it("샘플에 없는 회사는 null(마크 없음)로, 이미 값이 있는 회사는 그대로 읽어요", () => {
    const extra = { ...old.companies[1], id: "co-extra" };
    const mixed = { ...old, companies: [...old.companies.slice(0, 2), { ...old.companies[2], certScore: 12 }, ...old.companies.slice(3), extra] };
    const loaded = parseState(JSON.stringify(mixed))!;
    expect(loaded.companies.find((c) => c.id === "co-extra")?.certScore).toBeNull();
    expect(loaded.companies.find((c) => c.id === mixed.companies[2].id)?.certScore).toBe(12);
    expect(loaded.companies.find((c) => c.id === "co-green")?.certScore).toBe(84);
  });

  it("마크 값이 0~100 이 아니거나 숫자가 아니면 저장된 상태를 버려요", () => {
    // (NaN 은 JSON 에서 null 이 돼서 "마크 없음"으로 읽혀요 — 그래서 여기서는 JSON 에 남는 값만)
    for (const bad of [-1, 101, 100.5, "84", true, {}]) {
      const broken = { ...current, companies: current.companies.map((c, i) => (i === 1 ? { ...c, certScore: bad } : c)) };
      expect(parseState(JSON.stringify(broken)), String(bad)).toBeNull();
    }
    expect(parseState(serializeState(current))).toEqual(current);
  });
});

describe("팀 인원 · 세미나(2026-11-09)가 생기기 전에 저장된 데모 상태", () => {
  const current = createInitialState(TODAY);
  /** 기획서에 teamSize · seminar 가 없던 때의 모양 */
  const old = { ...current, proposals: current.proposals.map(({ teamSize: _size, seminar: _seminar, ...p }) => p) };

  it("버리지 않고, 샘플 기획서는 샘플 값으로 채워서 이어 써요", () => {
    expect(isDemoState(old)).toBe(false);
    const loaded = parseState(JSON.stringify(old));
    expect(loaded).not.toBeNull();
    expect(loaded).toEqual(current);
    expect(loaded!.proposals.find((p) => p.id === "pp-1")).toMatchObject({ teamSize: 4, seminar: "海洋環境ゼミ（指導：山田先生）" });
  });

  it("샘플에 없는 기획서(데모에서 낸 것)는 3명 · 세미나 없음으로, 이미 값이 있으면 그대로 읽어요", () => {
    const mine = { ...old.proposals[0], id: "pr-mine", mine: true };
    const kept = { ...current.proposals[1], teamSize: 5, seminar: "演習" };
    const mixed = { ...old, proposals: [mine, kept, ...old.proposals.slice(2)] };
    const loaded = parseState(JSON.stringify(mixed))!;
    expect(loaded.proposals.find((p) => p.id === "pr-mine")).toMatchObject({ teamSize: 3, seminar: "" });
    expect(loaded.proposals.find((p) => p.id === kept.id)).toMatchObject({ teamSize: 5, seminar: "演習" });
  });

  it("인원이 3~5 의 정수가 아니거나 세미나가 글자가 아니면 저장된 상태를 버려요", () => {
    for (const bad of [2, 6, 3.5, "4", true]) {
      const broken = { ...current, proposals: current.proposals.map((p, i) => (i === 0 ? { ...p, teamSize: bad } : p)) };
      expect(parseState(JSON.stringify(broken)), String(bad)).toBeNull();
    }
    const brokenSeminar = { ...current, proposals: current.proposals.map((p, i) => (i === 0 ? { ...p, seminar: 3 } : p)) };
    expect(parseState(JSON.stringify(brokenSeminar))).toBeNull();
    expect(parseState(serializeState(current))).toEqual(current);
  });
});

describe("상품 보상(報酬アイテム, #37)이 생기기 전에 저장한 상태", () => {
  const current = createInitialState(TODAY);
  const old = { ...current, challenges: current.challenges.map(({ rewardItem: _item, ...rest }) => rest) };

  it("버리지 않고, 샘플 퀘스트의 상품 보상을 채워서 이어 써요", () => {
    const parsed = parseState(JSON.stringify(old))!;
    expect(parsed).not.toBeNull();
    expect(parsed.challenges.find((c) => c.id === "ch-plastic")!.rewardItem).toEqual(current.challenges.find((c) => c.id === "ch-plastic")!.rewardItem);
    expect(parsed.challenges.find((c) => c.id === "ch-foodloss")!.rewardItem).toBeUndefined();
  });

  it("데모에서 기업이 새로 낸 퀘스트(샘플에 없는 id)는 그대로 — 상품 보상 없음", () => {
    const created = reducer(current, { type: "createChallenge", draft: { title: "新しいクエスト", summary: "説明", sdgIds: [4], prizeYen: 10_000, days: 30, participation: "both", internship: false } });
    const mine = created.challenges.find((c) => !current.challenges.some((s) => s.id === c.id))!;
    expect(parseState(serializeState(created))!.challenges.find((c) => c.id === mine.id)!.rewardItem).toBeUndefined();
  });
});
