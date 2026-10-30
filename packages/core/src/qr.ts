import { utf8Bytes } from "./hash";

// QR 코드 생성 (순수 TypeScript, 바이트 모드·오류 정정 M·버전 1~6, 마스크 0 고정).
// 디지털 증명서(F-502)에 넣는 짧은 확인 문구를 휴대폰으로 읽을 수 있게 해요. 최대 106바이트(UTF-8).
// 알고리즘은 공개된 QR 코드 규격(ISO/IEC 18004)을 따라요. qr.test.ts 가 구조(찾기·타이밍·정렬 패턴, 형식 정보)를 확인하고,
// OpenCV QR 디코더로도 버전 1~6 의 15개 문구(일본어·한국어 포함)가 모두 그대로 읽히는 것을 확인했어요.

interface VersionSpec {
  size: number;
  dataCodewords: number;
  eccPerBlock: number;
  blocks: number;
  alignment: number[];
}

const SPECS: Record<number, VersionSpec> = {
  1: { size: 21, dataCodewords: 16, eccPerBlock: 10, blocks: 1, alignment: [] },
  2: { size: 25, dataCodewords: 28, eccPerBlock: 16, blocks: 1, alignment: [6, 18] },
  3: { size: 29, dataCodewords: 44, eccPerBlock: 26, blocks: 1, alignment: [6, 22] },
  4: { size: 33, dataCodewords: 64, eccPerBlock: 18, blocks: 2, alignment: [6, 26] },
  5: { size: 37, dataCodewords: 86, eccPerBlock: 24, blocks: 2, alignment: [6, 30] },
  6: { size: 41, dataCodewords: 108, eccPerBlock: 16, blocks: 4, alignment: [6, 34] },
};

// GF(256), 원시 다항식 0x11D
const EXP: number[] = new Array(512).fill(0);
const LOG: number[] = new Array(256).fill(0);
{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
}
const gfMul = (a: number, b: number) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

function rsGenerator(degree: number): number[] {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array<number>(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], EXP[i]);
    }
    poly = next;
  }
  return poly;
}

function rsRemainder(data: readonly number[], degree: number): number[] {
  const generator = rsGenerator(degree);
  const result = new Array<number>(degree).fill(0);
  for (const byte of data) {
    const factor = byte ^ (result.shift() as number);
    result.push(0);
    for (let i = 0; i < degree; i++) result[i] ^= gfMul(generator[i + 1], factor);
  }
  return result;
}

/** 문자열을 QR 모듈 행렬(true = 어두운 칸)로 만들어요. matrix[행][열]. 여백(quiet zone)은 포함하지 않아요. */
export function qrMatrix(text: string): boolean[][] {
  const bytes = utf8Bytes(text);
  const version = [1, 2, 3, 4, 5, 6].find((v) => bytes.length <= Math.floor((SPECS[v].dataCodewords * 8 - 12) / 8));
  if (version === undefined) throw new Error("QR 에 넣기에는 문구가 너무 길어요 (최대 106바이트)");
  const spec = SPECS[version];
  const { size } = spec;

  // 1) 데이터 비트: 모드(0100=바이트) + 글자 수(8비트) + 데이터 + 종료·채우기
  const bits: number[] = [];
  const push = (value: number, count: number) => {
    for (let i = count - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };
  push(0b0100, 4);
  push(bytes.length, 8);
  for (const byte of bytes) push(byte, 8);
  const capacity = spec.dataCodewords * 8;
  push(0, Math.min(4, capacity - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);
  for (let pad = 0xec; bits.length < capacity; pad ^= 0xec ^ 0x11) push(pad, 8);
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(""), 2));

  // 2) 블록으로 나눠 오류 정정 부호를 붙이고 섞어 놓기
  const blockSize = spec.dataCodewords / spec.blocks;
  const dataBlocks: number[][] = [];
  for (let b = 0; b < spec.blocks; b++) dataBlocks.push(data.slice(b * blockSize, (b + 1) * blockSize));
  const eccBlocks = dataBlocks.map((block) => rsRemainder(block, spec.eccPerBlock));
  const codewords: number[] = [];
  for (let i = 0; i < blockSize; i++) for (const block of dataBlocks) codewords.push(block[i]);
  for (let i = 0; i < spec.eccPerBlock; i++) for (const block of eccBlocks) codewords.push(block[i]);

  // 3) 기능 패턴(찾기 패턴·타이밍·정렬 패턴·형식 정보)
  const modules: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const setFunction = (x: number, y: number, dark: boolean) => {
    modules[y][x] = dark;
    isFunction[y][x] = true;
  };

  for (let i = 0; i < size; i++) {
    setFunction(6, i, i % 2 === 0);
    setFunction(i, 6, i % 2 === 0);
  }
  const drawFinder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < size && y >= 0 && y < size) setFunction(x, y, dist !== 2 && dist !== 4);
      }
    }
  };
  drawFinder(3, 3);
  drawFinder(size - 4, 3);
  drawFinder(3, size - 4);
  if (spec.alignment.length === 2) {
    const [, far] = spec.alignment;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) setFunction(far + dx, far + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }

  // 형식 정보: 오류 정정 M(00) + 마스크 0, BCH(15,5)
  const formatData = (0 << 3) | 0;
  let rem = formatData;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  const formatBits = ((formatData << 10) | rem) ^ 0x5412;
  const bit = (i: number) => ((formatBits >>> i) & 1) !== 0;
  for (let i = 0; i <= 5; i++) setFunction(8, i, bit(i));
  setFunction(8, 7, bit(6));
  setFunction(8, 8, bit(7));
  setFunction(7, 8, bit(8));
  for (let i = 9; i < 15; i++) setFunction(14 - i, 8, bit(i));
  for (let i = 0; i < 8; i++) setFunction(size - 1 - i, 8, bit(i));
  for (let i = 8; i < 15; i++) setFunction(8, size - 15 + i, bit(i));
  setFunction(8, size - 8, true);

  // 4) 데이터 배치 (오른쪽 아래에서 두 칸 폭으로 지그재그) + 마스크 0
  let index = 0;
  const totalBits = codewords.length * 8;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!isFunction[y][x] && index < totalBits) {
          modules[y][x] = ((codewords[index >>> 3] >>> (7 - (index & 7))) & 1) !== 0;
          index++;
        }
      }
    }
  }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!isFunction[y][x] && (x + y) % 2 === 0) modules[y][x] = !modules[y][x];
  return modules;
}
