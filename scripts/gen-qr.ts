// 웹 데모 주소를 QR 코드 이미지(SVG·PNG)로 만들어요 — 발표 슬라이드와 README 에 붙이는 용도예요.
//   npm run qr                          → docs/qr/web-demo.svg, docs/qr/web-demo.png 를 다시 써요
//   npm run qr:check                    → SVG 가 주소와 맞는지만 확인해요 (PNG 는 있는지만 봐요)
//   npm run qr -- <주소> <파일 이름>      → 다른 주소도 만들 수 있어요 (예: 사용자 지정 도메인으로 바꿨을 때)
// 그림은 디지털 증명서(F-502)에 쓰는 packages/core 의 qrMatrix 로 그려요(오류 정정 M · 최대 106바이트). 외부 라이브러리는 쓰지 않아요.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";
import { qrMatrix } from "../packages/core/src/qr";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
/** 발표용 QR 은 ?lang=ja 를 붙여요 — 열면 일본어로 바로 시작해요(#20, 저장된 언어보다 우선). 주소만 필요하면 인자로 넘기세요. */
const DEFAULT_URL = "https://atome9797.github.io/sdgs-compass/?lang=ja";
/** QR 규격이 요구하는 바깥 여백(모듈 4칸). 이 여백이 있어야 어두운 배경 슬라이드 위에서도 읽혀요. */
const QUIET = 4;
/** PNG 한 변의 최소 크기(px). 한 칸을 정수 픽셀로 키워서 가장자리가 번지지 않게 해요. */
const TARGET_PX = 1000;

const check = process.argv.includes("--check");
const args = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const url = args[0] ?? DEFAULT_URL;
const name = args[1] ?? "web-demo";

const xmlEscape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** 어두운 칸을 가로로 이어서 한 덩어리 경로로 그려요(파일이 작고, 확대해도 선명해요). */
function svgOf(matrix: boolean[][], label: string): string {
  const n = matrix.length;
  const total = n + QUIET * 2;
  let d = "";
  matrix.forEach((row, y) => {
    let x = 0;
    while (x < n) {
      if (!row[x]) {
        x++;
        continue;
      }
      let end = x;
      while (end < n && row[end]) end++;
      d += `M${x + QUIET} ${y + QUIET}h${end - x}v1h-${end - x}z`;
      x = end;
    }
  });
  const text = xmlEscape(label);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${total * 20}" height="${total * 20}" shape-rendering="crispEdges" role="img" aria-label="${text}">\n` +
    `<title>${text}</title>\n` +
    `<rect width="${total}" height="${total}" fill="#fff"/>\n` +
    `<path d="${d}" fill="#000"/>\n` +
    `</svg>\n`
  );
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const byte of bytes) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  out.set(data, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

/** 8비트 회색조 PNG (흰 바탕 + 검은 칸). 슬라이드 프로그램이 바로 읽는 가장 단순한 형식이에요. */
function pngOf(matrix: boolean[][]): Buffer {
  const n = matrix.length;
  const modules = n + QUIET * 2;
  const scale = Math.ceil(TARGET_PX / modules);
  const size = modules * scale;
  const stride = size + 1; // 줄마다 맨 앞에 필터 바이트(0)가 하나 있어요
  const raw = Buffer.alloc(stride * size, 0xff);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0;
    const my = Math.floor(y / scale) - QUIET;
    if (my < 0 || my >= n) continue;
    for (let x = 0; x < size; x++) {
      const mx = Math.floor(x / scale) - QUIET;
      if (mx >= 0 && mx < n && matrix[my][mx]) raw[y * stride + 1 + x] = 0;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // 비트 수
  header[9] = 0; // 회색조
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

const matrix = qrMatrix(url);
const svg = svgOf(matrix, `QR: ${url}`);
const dir = resolve(root, "docs/qr");
const svgPath = resolve(dir, `${name}.svg`);
const pngPath = resolve(dir, `${name}.png`);

if (check) {
  const fresh = existsSync(svgPath) && readFileSync(svgPath, "utf8") === svg && existsSync(pngPath);
  if (!fresh) {
    console.error(`docs/qr/${name}.svg · .png 가 ${url} 와 맞지 않아요. npm run qr 로 다시 만드세요.`);
    process.exit(1);
  }
  console.log(`docs/qr/${name} 이 최신이에요 (${url})`);
} else {
  mkdirSync(dir, { recursive: true });
  writeFileSync(svgPath, svg);
  writeFileSync(pngPath, pngOf(matrix));
  console.log(`docs/qr/${name}.svg · .png 를 만들었어요 (${url}, ${matrix.length}×${matrix.length} 칸)`);
}
