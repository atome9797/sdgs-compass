import { describe, expect, it } from "vitest";
import { blankScenario, sampleScenario } from "@sdgs-compass/core/adminFinance";
import type { SnsRow } from "@sdgs-compass/core/adminSns";
import {
  ADMIN_STORAGE_KEY,
  ADMIN_STORE_VERSION,
  clearAdminStore,
  emptyAdminStore,
  isEmptyAdminStore,
  MAX_SCENARIOS,
  memoryStorage,
  parseAdminStore,
  readAdminStore,
  serializeAdminStore,
  updateAdminStore,
  writeAdminStore,
  type StoredScenario,
  type SyncStorage,
} from "./adminStore";

const row = (weekStart: string, channel: SnsRow["channel"], followers: number): SnsRow => ({ weekStart, channel, followers, reach: followers * 5, engagementRate: 0.03, linkClicks: 10 });

/** 쓰기가 막힌 저장소 (용량 부족·읽기 전용) */
function brokenStorage(): SyncStorage {
  return {
    kind: "local",
    getItem: () => {
      throw new Error("읽을 수 없어요");
    },
    setItem: () => {
      throw new Error("용량이 부족해요");
    },
    removeItem: () => {
      throw new Error("지울 수 없어요");
    },
  };
}

describe("운영자 저장소: 글자 ↔ 값", () => {
  it("저장한 값을 그대로 읽어요", () => {
    const data = { ...emptyAdminStore(), snsRows: [row("2026-10-19", "x", 800), row("2026-10-26", "x", 820), row("2026-10-26", "youtube", 300)], snsSample: true };
    expect(parseAdminStore(serializeAdminStore(data))).toEqual(data);
  });

  it("샘플 표시: true 만 받고, 행이 없으면 꺼요", () => {
    const rows = [row("2026-10-26", "x", 820)];
    expect(parseAdminStore(JSON.stringify({ version: 1, snsRows: rows, snsSample: true })).snsSample).toBe(true);
    for (const flag of [false, "true", 1, null, undefined]) expect(parseAdminStore(JSON.stringify({ version: 1, snsRows: rows, snsSample: flag })).snsSample, String(flag)).toBe(false);
    expect(parseAdminStore(JSON.stringify({ version: 1, snsRows: [], snsSample: true })).snsSample).toBe(false);
    // 옛 저장값(샘플 표시가 없던 때)도 읽혀요
    expect(parseAdminStore(JSON.stringify({ version: 1, snsRows: rows })).snsRows).toHaveLength(1);
  });

  it("없거나 깨진 글자는 빈 상태로 (예외를 던지지 않아요)", () => {
    for (const raw of [null, undefined, "", "{", "not json", "123", "null", "[]", '"x"']) expect(parseAdminStore(raw), String(raw)).toEqual(emptyAdminStore());
  });

  it("버전이 다르면 읽지 않아요 (옛 값·미래 값 모두)", () => {
    const rows = [row("2026-10-26", "x", 800)];
    for (const version of [0, 2, "1", null]) {
      expect(parseAdminStore(JSON.stringify({ version, snsRows: rows })), `version=${String(version)}`).toEqual(emptyAdminStore());
    }
    expect(parseAdminStore(JSON.stringify({ snsRows: rows }))).toEqual(emptyAdminStore());
    expect(ADMIN_STORE_VERSION).toBe(1);
  });

  it("깨진 행은 버리고 올바른 행만 남겨요", () => {
    const good = row("2026-10-26", "instagram", 1400);
    const raw = JSON.stringify({
      version: 1,
      snsRows: [
        good,
        { ...good, weekStart: "2026-10-27" }, // 월요일이 아님
        { ...good, channel: "tiktok" },
        { ...good, followers: -1 },
        { ...good, reach: 1.5 },
        { ...good, engagementRate: 1.5 },
        "문자열",
        null,
      ],
    });
    expect(parseAdminStore(raw).snsRows).toEqual([good]);
  });

  it("snsRows 가 배열이 아니면 빈 목록", () => {
    expect(parseAdminStore(JSON.stringify({ version: 1, snsRows: "x" })).snsRows).toEqual([]);
    expect(parseAdminStore(JSON.stringify({ version: 1 })).snsRows).toEqual([]);
  });

  it("같은 주·같은 SNS 가 겹치면 하나만, 주 순서로 정렬해서 돌려줘요", () => {
    const raw = JSON.stringify({ version: 1, snsRows: [row("2026-10-26", "x", 820), row("2026-10-19", "x", 800), row("2026-10-26", "x", 830)] });
    expect(parseAdminStore(raw).snsRows.map((r) => [r.weekStart, r.followers])).toEqual([
      ["2026-10-19", 800],
      ["2026-10-26", 830],
    ]);
  });
});

describe("운영자 저장소: 읽기 · 쓰기", () => {
  it("저장하고 다시 읽어요", () => {
    const storage = memoryStorage();
    expect(readAdminStore(storage)).toEqual(emptyAdminStore());
    const data = { ...emptyAdminStore(), snsRows: [row("2026-10-26", "x", 820)] };
    expect(writeAdminStore(data, storage)).toBe(true);
    expect(readAdminStore(storage)).toEqual(data);
    expect(storage.getItem(ADMIN_STORAGE_KEY)).not.toBeNull();
  });

  it("updateAdminStore: 저장 직전에 다시 읽은 값에 바꾼 부분만 얹어요 (다른 화면이 방금 저장한 값을 지우지 않아요)", () => {
    const storage = memoryStorage();
    updateAdminStore({ snsRows: [row("2026-10-19", "x", 800)] }, storage);
    // 다른 탭이 그 사이에 저장했다고 치고 직접 바꿔 놓아요
    storage.setItem(ADMIN_STORAGE_KEY, serializeAdminStore({ ...emptyAdminStore(), snsRows: [row("2026-10-19", "x", 800), row("2026-10-26", "x", 820)] }));
    const result = updateAdminStore({}, storage);
    expect(result.ok).toBe(true);
    expect(result.data.snsRows).toHaveLength(2);
    expect(readAdminStore(storage).snsRows).toHaveLength(2);
    const replaced = updateAdminStore({ snsRows: [] }, storage);
    expect(replaced.data.snsRows).toEqual([]);
    expect(readAdminStore(storage).snsRows).toEqual([]);
  });

  it("updateAdminStore: 함수로 주면 저장 직전에 읽은 값(fresh)을 받아서 바꿔요", () => {
    const storage = memoryStorage();
    updateAdminStore({ snsRows: [row("2026-10-19", "x", 800)], snsSample: true }, storage);
    // 다른 탭이 그 사이에 한 줄을 더 저장했다고 치고
    storage.setItem(ADMIN_STORAGE_KEY, serializeAdminStore({ ...emptyAdminStore(), snsRows: [row("2026-10-19", "x", 800), row("2026-10-26", "x", 820)], snsSample: true }));
    const result = updateAdminStore((fresh) => ({ snsRows: [...fresh.snsRows, row("2026-11-02", "x", 840)] }), storage);
    expect(result.data.snsRows.map((r) => r.weekStart)).toEqual(["2026-10-19", "2026-10-26", "2026-11-02"]);
    expect(result.data.snsSample).toBe(true);
  });

  it("행이 하나도 없게 되면 샘플 표시도 꺼져요", () => {
    const storage = memoryStorage();
    updateAdminStore({ snsRows: [row("2026-10-26", "x", 820)], snsSample: true }, storage);
    const cleared = updateAdminStore({ snsRows: [] }, storage);
    expect(cleared.data.snsSample).toBe(false);
    expect(readAdminStore(storage).snsSample).toBe(false);
  });

  it("updateAdminStore: 남길 값이 없으면 빈 글자를 저장하지 않고 키째 지워요", () => {
    const storage = memoryStorage();
    updateAdminStore({ snsRows: [row("2026-10-26", "x", 820)] }, storage);
    expect(storage.getItem(ADMIN_STORAGE_KEY)).not.toBeNull();
    const cleared = updateAdminStore({ snsRows: [] }, storage);
    expect(cleared.ok).toBe(true);
    expect(storage.getItem(ADMIN_STORAGE_KEY)).toBeNull();
    // 처음부터 비어 있는 채로 갱신해도 키를 만들지 않아요
    const untouched = memoryStorage();
    expect(updateAdminStore({}, untouched).ok).toBe(true);
    expect(untouched.getItem(ADMIN_STORAGE_KEY)).toBeNull();
  });

  it("isEmptyAdminStore: 행이 있으면 비어 있지 않아요", () => {
    expect(isEmptyAdminStore(emptyAdminStore())).toBe(true);
    expect(isEmptyAdminStore({ ...emptyAdminStore(), snsRows: [row("2026-10-26", "x", 820)] })).toBe(false);
  });

  it("저장소를 쓸 수 없어도 예외 없이: 읽기는 빈 상태, 쓰기·지우기는 false", () => {
    const storage = brokenStorage();
    expect(readAdminStore(storage)).toEqual(emptyAdminStore());
    expect(writeAdminStore(emptyAdminStore(), storage)).toBe(false);
    const result = updateAdminStore({ snsRows: [row("2026-10-26", "x", 820)] }, storage);
    expect(result.ok).toBe(false);
    // 저장은 못 해도 화면에 보여 줄 값은 돌려줘요
    expect(result.data.snsRows).toHaveLength(1);
    expect(clearAdminStore(storage)).toBe(false);
  });

  it("clearAdminStore: 지우면 빈 상태로 돌아가요", () => {
    const storage = memoryStorage();
    updateAdminStore({ snsRows: [row("2026-10-26", "x", 820)] }, storage);
    expect(clearAdminStore(storage)).toBe(true);
    expect(storage.getItem(ADMIN_STORAGE_KEY)).toBeNull();
    expect(readAdminStore(storage)).toEqual(emptyAdminStore());
  });

  it("memoryStorage 는 kind 로 구분돼요", () => {
    expect(memoryStorage().kind).toBe("memory");
    expect(memoryStorage({ a: "1" }).getItem("a")).toBe("1");
  });
});

const stored = (id: string, name: string, sample = false): StoredScenario => ({ id, sample, scenario: { ...sampleScenario("ja"), name } });

describe("운영자 저장소: 수지·자금 시나리오", () => {
  it("시나리오와 선택·비교 번호를 그대로 읽어요", () => {
    const data = { ...emptyAdminStore(), scenarios: [stored("a", "提出版", true), stored("b", "修正試算"), { id: "c", sample: false, scenario: blankScenario("空", "ko") }], selectedScenarioId: "b", compareScenarioId: "a" };
    expect(parseAdminStore(serializeAdminStore(data))).toEqual(data);
  });

  it("시나리오가 없던 옛 저장값(같은 version 1)도 읽혀요", () => {
    const old = parseAdminStore(JSON.stringify({ version: 1, snsRows: [row("2026-10-26", "x", 820)], snsSample: true }));
    expect(old.snsRows).toHaveLength(1);
    expect(old.scenarios).toEqual([]);
    expect(old.selectedScenarioId).toBeNull();
    expect(old.compareScenarioId).toBeNull();
  });

  it("틀린 시나리오·번호가 겹치는 시나리오는 버리고 올바른 것만 남겨요", () => {
    const good = stored("a", "提出版");
    const raw = JSON.stringify({
      version: 1,
      scenarios: [
        good,
        { ...good, id: "dup" },
        { ...good, id: "dup", scenario: { ...good.scenario, name: "同じ番号" } }, // 번호가 겹침
        { id: "b", sample: false, scenario: { ...good.scenario, schemaVersion: 2 } },
        { id: "c", sample: false, scenario: { ...good.scenario, periods: [{ ...good.scenario.periods[0], matchRate: 5 }] } },
        { id: "", sample: false, scenario: good.scenario },
        { id: 7, sample: false, scenario: good.scenario },
        { id: "e", sample: false },
        { id: "f", sample: false, scenario: "x" },
        "문자열",
        null,
      ],
    });
    expect(parseAdminStore(raw).scenarios.map((item) => item.id)).toEqual(["a", "dup"]);
  });

  it("샘플 표시는 true 만 받아요", () => {
    const base = stored("a", "提出版");
    for (const flag of [false, "true", 1, null, undefined]) {
      expect(parseAdminStore(JSON.stringify({ version: 1, scenarios: [{ ...base, sample: flag }] })).scenarios[0]?.sample, String(flag)).toBe(false);
    }
    expect(parseAdminStore(JSON.stringify({ version: 1, scenarios: [{ ...base, sample: true }] })).scenarios[0]?.sample).toBe(true);
  });

  it("scenarios 가 배열이 아니면 빈 목록, 상한(MAX_SCENARIOS)을 넘는 것은 버려요", () => {
    expect(parseAdminStore(JSON.stringify({ version: 1, scenarios: "x" })).scenarios).toEqual([]);
    const many = Array.from({ length: MAX_SCENARIOS + 5 }, (_, i) => stored(`s${i}`, `案${i}`));
    expect(parseAdminStore(JSON.stringify({ version: 1, scenarios: many })).scenarios).toHaveLength(MAX_SCENARIOS);
  });

  it("선택 번호: 없는 번호·비어 있음은 첫 시나리오로, 비교 번호는 목록에 있고 선택과 다를 때만", () => {
    const scenarios = [stored("a", "A"), stored("b", "B"), stored("c", "C")];
    const parse = (selected: unknown, compare: unknown) => {
      const data = parseAdminStore(JSON.stringify({ version: 1, scenarios, selectedScenarioId: selected, compareScenarioId: compare }));
      return [data.selectedScenarioId, data.compareScenarioId];
    };
    expect(parse("b", "c")).toEqual(["b", "c"]);
    expect(parse("zzz", "c")).toEqual(["a", "c"]);
    expect(parse(null, undefined)).toEqual(["a", null]);
    expect(parse(5, 6)).toEqual(["a", null]);
    expect(parse("b", "b")).toEqual(["b", null]); // 자기 자신과는 비교하지 않아요
    expect(parse("a", "zzz")).toEqual(["a", null]);
    // 선택이 첫 시나리오로 바뀌어서 비교 번호와 같아지면 비교를 풀어요
    expect(parse("zzz", "a")).toEqual(["a", null]);
  });

  it("updateAdminStore: 시나리오를 저장하고, 선택한 것을 지우면 선택이 첫 시나리오로 옮겨 가요", () => {
    const storage = memoryStorage();
    updateAdminStore({ scenarios: [stored("a", "A"), stored("b", "B")], selectedScenarioId: "b", compareScenarioId: "a" }, storage);
    expect(readAdminStore(storage).selectedScenarioId).toBe("b");
    expect(readAdminStore(storage).compareScenarioId).toBe("a");
    const removed = updateAdminStore((fresh) => ({ scenarios: fresh.scenarios.filter((item) => item.id !== "b") }), storage);
    expect(removed.data.scenarios.map((item) => item.id)).toEqual(["a"]);
    expect(removed.data.selectedScenarioId).toBe("a");
    // 남은 하나가 선택이 되었으니 비교(같은 번호)는 풀려요
    expect(removed.data.compareScenarioId).toBeNull();
  });

  it("updateAdminStore: SNS 행을 바꿔도 시나리오는 그대로, 반대도 마찬가지", () => {
    const storage = memoryStorage();
    updateAdminStore({ scenarios: [stored("a", "A")] }, storage);
    updateAdminStore({ snsRows: [row("2026-10-26", "x", 820)] }, storage);
    expect(readAdminStore(storage).scenarios).toHaveLength(1);
    updateAdminStore({ snsRows: [], snsSample: false }, storage);
    // 시나리오가 남아 있으니 키는 지워지지 않아요
    expect(storage.getItem(ADMIN_STORAGE_KEY)).not.toBeNull();
    expect(readAdminStore(storage).scenarios).toHaveLength(1);
    updateAdminStore({ scenarios: [] }, storage);
    expect(storage.getItem(ADMIN_STORAGE_KEY)).toBeNull();
  });

  it("isEmptyAdminStore: 시나리오만 있어도 비어 있지 않아요", () => {
    expect(isEmptyAdminStore({ ...emptyAdminStore(), scenarios: [stored("a", "A")], selectedScenarioId: "a" })).toBe(false);
  });
});
