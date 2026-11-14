import { describe, expect, it } from "vitest";
import { base64, crc32, encodePng, pngDataUri, scaleNearest } from "./png";
import { PixelGrid, type PixelImage } from "./pixels";
import { foeSprite } from "./sprites";

/** 시험용: PNG 를 조각으로 나누고, 「저장」 블록만 있는 zlib 을 풀어요 */
function readPng(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const chunks: { type: string; data: Uint8Array; crcOk: boolean }[] = [];
  let at = 8;
  while (at < bytes.length) {
    const len = view.getUint32(at);
    const type = String.fromCharCode(...bytes.subarray(at + 4, at + 8));
    const data = bytes.subarray(at + 8, at + 8 + len);
    const crc = view.getUint32(at + 8 + len);
    chunks.push({ type, data, crcOk: crc32(bytes.subarray(at + 4, at + 8 + len)) === crc });
    at += 12 + len;
  }
  const idat = chunks.find((c) => c.type === "IDAT")!.data;
  const raw: number[] = [];
  let p = 2;
  for (;;) {
    const final = idat[p] & 1;
    const len = idat[p + 1] | (idat[p + 2] << 8);
    raw.push(...idat.subarray(p + 5, p + 5 + len));
    p += 5 + len;
    if (final) break;
  }
  return { chunks, raw: Uint8Array.from(raw) };
}

describe("PNG (#39 앱의 의뢰서 몬스터 그림)", () => {
  it("CRC-32 · Base64 는 표준 값과 같아요", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
    expect(base64(new TextEncoder().encode("Man"))).toBe("TWFu");
    expect(base64(new TextEncoder().encode("Ma"))).toBe("TWE=");
    expect(base64(new TextEncoder().encode("M"))).toBe("TQ==");
  });

  it("가장 가까운 이웃으로 키워요 (칸이 번지지 않게)", () => {
    const image: PixelImage = { w: 2, h: 1, data: Uint8ClampedArray.from([255, 0, 0, 255, 0, 0, 255, 255]) };
    const big = scaleNearest(image, 3);
    expect([big.w, big.h]).toEqual([6, 3]);
    expect([...big.data.subarray(0, 4)]).toEqual([255, 0, 0, 255]);
    expect([...big.data.subarray(2 * 4, 3 * 4)]).toEqual([255, 0, 0, 255]);
    expect([...big.data.subarray(3 * 4, 4 * 4)]).toEqual([0, 0, 255, 255]);
  });

  it("팔레트 PNG: 서명 · IHDR · PLTE · tRNS · IDAT · IEND, 조각마다 CRC 가 맞고, 풀면 같은 그림이에요", () => {
    const g = new PixelGrid(3, 2).set(0, 0, 2).set(2, 1, 3);
    const image: PixelImage = { w: 3, h: 2, data: g.toRgba([null, null, "#11223380", "#0A97D9"]) };
    const bytes = encodePng(image, 2);
    expect([...bytes.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const { chunks, raw } = readPng(bytes);
    expect(chunks.map((c) => c.type)).toEqual(["IHDR", "PLTE", "tRNS", "IDAT", "IEND"]);
    expect(chunks.every((c) => c.crcOk)).toBe(true);
    const ihdr = new DataView(chunks[0].data.buffer, chunks[0].data.byteOffset);
    expect([ihdr.getUint32(0), ihdr.getUint32(4), chunks[0].data[8], chunks[0].data[9]]).toEqual([6, 4, 8, 3]);
    // 팔레트: 0 = 투명, 1 = #112233(투명도 0x80), 2 = #0A97D9
    expect([...chunks[1].data]).toEqual([0, 0, 0, 0x11, 0x22, 0x33, 0x0a, 0x97, 0xd9]);
    expect([...chunks[2].data]).toEqual([0, 0x80, 255]);
    // 줄마다 필터 0 + 칸 6개 (2배로 키운 그림)
    expect(raw.length).toBe(4 * 7);
    expect([...raw.subarray(0, 7)]).toEqual([0, 1, 1, 0, 0, 0, 0]);
    expect([...raw.subarray(21, 28)]).toEqual([0, 0, 0, 0, 0, 2, 2]);
  });

  it("몬스터 그림은 팔레트 PNG 데이터 URI 가 돼요 (6배로 키워 192칸)", () => {
    const uri = pngDataUri(foeSprite("jelly", "#0A97D9"), 6);
    expect(uri.startsWith("data:image/png;base64,iVBORw0KGgo")).toBe(true);
    const bytes = encodePng(foeSprite("jelly", "#0A97D9"), 6);
    const { chunks } = readPng(bytes);
    const ihdr = new DataView(chunks[0].data.buffer, chunks[0].data.byteOffset);
    expect([ihdr.getUint32(0), ihdr.getUint32(4), chunks[0].data[9]]).toEqual([192, 192, 3]);
    expect(chunks.every((c) => c.crcOk)).toBe(true);
  });
});
