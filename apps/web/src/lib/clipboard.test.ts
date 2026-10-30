import { describe, expect, it } from "vitest";
import { copyText, isAbortError, shareOrCopy, type ClipboardEnv, type ShareData } from "./clipboard";

const abort = () => Object.assign(new Error("cancelled"), { name: "AbortError" });

function recorder() {
  const copied: string[] = [];
  const shared: ShareData[] = [];
  const clipboard: ClipboardEnv = { writeText: async (text) => void copied.push(text) };
  return { copied, shared, clipboard, share: async (data: ShareData) => void shared.push(data) };
}

describe("copyText", () => {
  it("클립보드 API 가 되면 그걸 써요", async () => {
    const r = recorder();
    expect(await copyText("hello", r.clipboard)).toBe("clipboard");
    expect(r.copied).toEqual(["hello"]);
  });

  it("클립보드 API 가 거부되면 예전 방식으로 복사해요", async () => {
    const legacy: string[] = [];
    const env: ClipboardEnv = {
      writeText: async () => {
        throw new Error("denied");
      },
      legacyCopy: (text) => (legacy.push(text), true),
    };
    expect(await copyText("hello", env)).toBe("legacy");
    expect(legacy).toEqual(["hello"]);
  });

  it("클립보드 API 가 없으면(http 환경 등) 바로 예전 방식", async () => {
    expect(await copyText("x", { legacyCopy: () => true })).toBe("legacy");
  });

  it("모두 안 되면 실패를 알려요 (화면이 직접 복사하도록 안내)", async () => {
    expect(await copyText("x", {})).toBe("failed");
    expect(await copyText("x", { legacyCopy: () => false })).toBe("failed");
    expect(
      await copyText("x", {
        writeText: async () => {
          throw new Error("denied");
        },
        legacyCopy: () => {
          throw new Error("boom");
        },
      }),
    ).toBe("failed");
  });
});

describe("shareOrCopy", () => {
  const data: ShareData = { title: "SDGsコンパス", text: "🏆 受賞しました" };

  it("공유 메뉴가 있으면 공유하고 복사는 하지 않아요", async () => {
    const r = recorder();
    expect(await shareOrCopy(data, { share: r.share, clipboard: r.clipboard })).toBe("shared");
    expect(r.shared).toEqual([data]);
    expect(r.copied).toEqual([]);
  });

  it("사용자가 공유 메뉴를 닫으면(AbortError) 취소로 끝내요 — 복사도 하지 않아요", async () => {
    const r = recorder();
    const result = await shareOrCopy(data, {
      share: async () => {
        throw abort();
      },
      clipboard: r.clipboard,
    });
    expect(result).toBe("cancelled");
    expect(r.copied).toEqual([]);
  });

  it("공유가 다른 이유로 실패하면 복사로 대신해요", async () => {
    const r = recorder();
    const result = await shareOrCopy(data, {
      share: async () => {
        throw new Error("NotAllowedError");
      },
      clipboard: r.clipboard,
    });
    expect(result).toBe("copied");
    expect(r.copied).toEqual([data.text]);
  });

  it("공유 메뉴가 없으면 복사하고, 복사도 안 되면 실패", async () => {
    const r = recorder();
    expect(await shareOrCopy(data, { clipboard: r.clipboard })).toBe("copied");
    expect(await shareOrCopy(data, { clipboard: {} })).toBe("failed");
  });

  it("isAbortError", () => {
    expect(isAbortError(abort())).toBe(true);
    expect(isAbortError(new Error("x"))).toBe(false);
    expect(isAbortError(null)).toBe(false);
    expect(isAbortError("AbortError")).toBe(false);
  });
});
