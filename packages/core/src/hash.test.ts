import { describe, expect, it } from "vitest";
import { sha256Hex, utf8Bytes } from "./hash";

// 기준값은 표준 SHA-256 (FIPS 180-4 예제 + Node crypto 로 만든 값)
const VECTORS: [string, string][] = [
  ["", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"],
  ["abc", "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"],
  ["abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq", "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1"],
  ["日本語", "77710aedc74ecfa33685e33a6c7df5cc83004da1bdcef7fb280f5c2b2e97e0a5"],
  ["한국어🌊", "287157d98e82dbef3d62f621bf97629bcf389cf52c5f6bc81f820660cb793462"],
  ["a".repeat(1000), "41edece42d63e8d9bf515a9ba6932e1c20cbc9f5a5d134645adb5db1b9737ea3"],
];

const BOUNDARIES: [number, string][] = [
  [55, "9f4390f8d30c2dd92ec9f095b65e2b9ae9b0a925a5258e241c9f1e910f734318"],
  [56, "b35439a4ac6f0948b6d6f9e3c6af0f5f590ce20f1bde7090ef7970686ec6738a"],
  [63, "7d3e74a05d7db15bce4ad9ec0658ea98e3f06eeecf16b4c6fff2da457ddc2f34"],
  [64, "ffe054fe7ae0cb6dc65c3af9b61d5209f439851db43d0ba5997337df154668eb"],
  [65, "635361c48bb9eab14198e76ea8ab7f1a41685d6ad62aa9146d301d4f17eb0ae0"],
  [119, "31eba51c313a5c08226adf18d4a359cfdfd8d2e816b13f4af952f7ea6584dcfb"],
  [120, "2f3d335432c70b580af0e8e1b3674a7c020d683aa5f73aaaedfdc55af904c21c"],
];

describe("sha256Hex", () => {
  for (const [input, expected] of VECTORS) {
    it(`표준 값과 같아요: ${input.length > 12 ? `${input.slice(0, 12)}…(${input.length}자)` : JSON.stringify(input)}`, () => {
      expect(sha256Hex(input)).toBe(expected);
    });
  }

  for (const [length, expected] of BOUNDARIES) {
    it(`패딩 경계(${length}바이트)에서도 같아요`, () => {
      expect(sha256Hex("a".repeat(length))).toBe(expected);
    });
  }

  it("같은 입력은 같은 결과, 한 글자만 달라도 완전히 달라져요", () => {
    expect(sha256Hex("SDGs")).toBe(sha256Hex("SDGs"));
    expect(sha256Hex("SDGs")).not.toBe(sha256Hex("SDGS"));
  });
});

describe("utf8Bytes", () => {
  it("1~4바이트 문자를 올바르게 바꿔요", () => {
    expect(utf8Bytes("A")).toEqual([0x41]);
    expect(utf8Bytes("é")).toEqual([0xc3, 0xa9]);
    expect(utf8Bytes("あ")).toEqual([0xe3, 0x81, 0x82]);
    expect(utf8Bytes("🌊")).toEqual([0xf0, 0x9f, 0x8c, 0x8a]);
  });
});
