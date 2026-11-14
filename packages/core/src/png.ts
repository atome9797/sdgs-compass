// 픽셀 그림(RGBA) → PNG (#39 앱의 의뢰서): 앱(React Native)에는 캔버스가 없어서, 몬스터 그림을 PNG 데이터 URI 로 만들어 <Image> 에 넣어요.
// 압축은 하지 않아요(deflate 의 「저장」 블록) — 그림이 작고(팔레트 1바이트/칸), 압축 라이브러리를 더하지 않으려고요.
// 크게 보여도 칸이 번지지 않게, 만들 때 가장 가까운 이웃(nearest)으로 미리 키워요(scale).
import type { PixelImage } from "./pixels";

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function adler32(bytes: Uint8Array): number {
  let a = 1;
  let b = 0;
  for (const v of bytes) {
    a = (a + v) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

const u32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];

/** 여러 조각을 한 배열로 (큰 배열을 함수 인자로 펼치지 않아요 — Hermes 의 인자 수 한도) */
function concat(parts: readonly Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const body = concat([Uint8Array.from(Array.from(type, (ch) => ch.charCodeAt(0))), data]);
  return concat([Uint8Array.from(u32(data.length)), body, Uint8Array.from(u32(crc32(body)))]);
}

/** zlib 스트림(압축 없음): 헤더 + 「저장」 블록들(최대 65,535바이트씩) + Adler-32 */
function zlibStored(raw: Uint8Array): Uint8Array {
  const parts: Uint8Array[] = [Uint8Array.from([0x78, 0x01])];
  let at = 0;
  do {
    const len = Math.min(65535, raw.length - at);
    const final = at + len >= raw.length ? 1 : 0;
    parts.push(Uint8Array.from([final, len & 255, len >>> 8, ~len & 255, (~len >>> 8) & 255]), raw.subarray(at, at + len));
    at += len;
  } while (at < raw.length);
  parts.push(Uint8Array.from(u32(adler32(raw))));
  return concat(parts);
}

/** 가장 가까운 이웃으로 scale 배 키운 그림 */
export function scaleNearest(image: PixelImage, scale: number): PixelImage {
  const s = Math.max(1, Math.floor(scale));
  if (s === 1) return image;
  const w = image.w * s;
  const h = image.h * s;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const sy = Math.floor(y / s);
    for (let x = 0; x < w; x++) {
      const from = (sy * image.w + Math.floor(x / s)) * 4;
      data.set(image.data.subarray(from, from + 4), (y * w + x) * 4);
    }
  }
  return { w, h, data };
}

/** PNG 바이트: 색이 256개 이하면 팔레트(+ 투명도 tRNS), 넘으면 RGBA */
export function encodePng(image: PixelImage, scale = 1): Uint8Array {
  const img = scaleNearest(image, scale);
  const { w, h, data } = img;
  // 0 번은 늘 투명 (그림 밖의 칸)
  const colors = new Map<number, number>([[0, 0]]);
  const indices = new Uint8Array(w * h);
  let paletted = true;
  for (let i = 0; i < w * h; i++) {
    const a = data[i * 4 + 3];
    // 완전히 투명한 칸은 모두 같은 색(0,0,0,0)으로 — 팔레트를 아껴요
    const key = a === 0 ? 0 : ((data[i * 4] << 24) | (data[i * 4 + 1] << 16) | (data[i * 4 + 2] << 8) | a) >>> 0;
    let index = colors.get(key);
    if (index === undefined) {
      if (colors.size >= 256) {
        paletted = false;
        break;
      }
      index = colors.size;
      colors.set(key, index);
    }
    indices[i] = index;
  }
  const rowBytes = paletted ? w : w * 4;
  const raw = new Uint8Array(h * (rowBytes + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (rowBytes + 1)] = 0; // 필터 없음
    if (paletted) raw.set(indices.subarray(y * w, (y + 1) * w), y * (rowBytes + 1) + 1);
    else raw.set(data.subarray(y * w * 4, (y + 1) * w * 4), y * (rowBytes + 1) + 1);
  }
  const ihdr = Uint8Array.from([...u32(w), ...u32(h), 8, paletted ? 3 : 6, 0, 0, 0]);
  const parts: Uint8Array[] = [Uint8Array.from(SIGNATURE), chunk("IHDR", ihdr)];
  if (paletted) {
    const entries = [...colors.keys()];
    const plte = new Uint8Array(entries.length * 3);
    const trns = new Uint8Array(entries.length);
    entries.forEach((key, i) => {
      plte[i * 3] = (key >>> 24) & 255;
      plte[i * 3 + 1] = (key >>> 16) & 255;
      plte[i * 3 + 2] = (key >>> 8) & 255;
      trns[i] = key & 255;
    });
    parts.push(chunk("PLTE", plte), chunk("tRNS", trns));
  }
  parts.push(chunk("IDAT", zlibStored(raw)), chunk("IEND", new Uint8Array(0)));
  return concat(parts);
}

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function base64(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const n = (a << 16) | (b << 8) | c;
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < bytes.length ? B64[(n >> 6) & 63] : "=") + (i + 2 < bytes.length ? B64[n & 63] : "=");
  }
  return out;
}

export function pngDataUri(image: PixelImage, scale = 1): string {
  return `data:image/png;base64,${base64(encodePng(image, scale))}`;
}
