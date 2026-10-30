import { describe, expect, it } from "vitest";
import { qrMatrix } from "./qr";

const ascii = (n: number) => "x".repeat(n);

describe("QR 코드 구조", () => {
  it("글자 수에 맞춰 버전(크기)이 정해져요", () => {
    const cases: [number, number][] = [
      [0, 21], [14, 21], [15, 25], [26, 25], [27, 29], [42, 29], [43, 33], [62, 33], [63, 37], [84, 37], [85, 41], [106, 41],
    ];
    for (const [bytes, size] of cases) {
      const m = qrMatrix(ascii(bytes));
      expect(m.length, `${bytes}바이트`).toBe(size);
      expect(m.every((row) => row.length === size)).toBe(true);
    }
  });

  it("107바이트부터는 예외", () => {
    expect(() => qrMatrix(ascii(107))).toThrow();
  });

  it("세 모서리의 찾기 패턴(7×7 겹사각형)", () => {
    for (const text of ["", "SDGS-COMPASS|SC-C-0001|0123456789abcdef0123456789abcdef", ascii(106)]) {
      const m = qrMatrix(text);
      const size = m.length;
      const origins: [number, number][] = [[0, 0], [size - 7, 0], [0, size - 7]];
      for (const [ox, oy] of origins) {
        for (let dy = 0; dy < 7; dy++) {
          for (let dx = 0; dx < 7; dx++) {
            const ring = Math.max(Math.abs(dx - 3), Math.abs(dy - 3));
            expect(m[oy + dy][ox + dx], `${size} (${ox},${oy}) ${dx},${dy}`).toBe(ring !== 2);
          }
        }
      }
      // 분리 띠(찾기 패턴 바깥 한 줄)는 모두 밝아요
      for (let i = 0; i < 8; i++) {
        expect(m[7][i]).toBe(false);
        expect(m[i][7]).toBe(false);
        expect(m[7][size - 1 - i]).toBe(false);
        expect(m[i][size - 8]).toBe(false);
        expect(m[size - 8][i]).toBe(false);
        expect(m[size - 1 - i][7]).toBe(false);
      }
    }
  });

  it("타이밍 패턴(6번 행·열의 어두움/밝음 반복)과 항상 어두운 칸", () => {
    const m = qrMatrix("timing");
    const size = m.length;
    for (let i = 8; i < size - 8; i++) {
      expect(m[6][i]).toBe(i % 2 === 0);
      expect(m[i][6]).toBe(i % 2 === 0);
    }
    expect(m[size - 8][8]).toBe(true);
  });

  it("형식 정보: 오류 정정 M·마스크 0 (101010000010010) 이 두 군데에 같게 들어가요", () => {
    for (const text of ["", "abc", ascii(60), ascii(106)]) {
      const m = qrMatrix(text);
      const size = m.length;
      const first = (() => {
        let v = 0;
        const set = (i: number, bit: boolean) => {
          if (bit) v |= 1 << i;
        };
        for (let i = 0; i <= 5; i++) set(i, m[i][8]);
        set(6, m[7][8]);
        set(7, m[8][8]);
        set(8, m[8][7]);
        for (let i = 9; i < 15; i++) set(i, m[8][14 - i]);
        return v;
      })();
      const second = (() => {
        let v = 0;
        for (let i = 0; i < 8; i++) if (m[8][size - 1 - i]) v |= 1 << i;
        for (let i = 8; i < 15; i++) if (m[size - 15 + i][8]) v |= 1 << i;
        return v;
      })();
      expect(first.toString(2).padStart(15, "0")).toBe("101010000010010");
      expect(second).toBe(first);
    }
  });

  it("버전 2 이상에는 오른쪽 아래 정렬 패턴(5×5)이 있어요", () => {
    for (const bytes of [15, 30, 50, 70, 100]) {
      const m = qrMatrix(ascii(bytes));
      const c = m.length - 7;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) expect(m[c + dy][c + dx]).toBe(Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  });

  it("같은 문구는 같은 모양, 다른 문구는 다른 모양", () => {
    const a = JSON.stringify(qrMatrix("SDGS-COMPASS|SC-C-0001|aaaa"));
    expect(JSON.stringify(qrMatrix("SDGS-COMPASS|SC-C-0001|aaaa"))).toBe(a);
    expect(JSON.stringify(qrMatrix("SDGS-COMPASS|SC-C-0001|aaab"))).not.toBe(a);
  });

  it("일본어·한국어도 UTF-8 로 넣어요 (일본어 1글자 3바이트)", () => {
    expect(qrMatrix("日".repeat(5)).length).toBe(25); // 15바이트 → 버전 2
    expect(qrMatrix("한".repeat(35)).length).toBe(41); // 105바이트 → 버전 6
    expect(() => qrMatrix("한".repeat(36))).toThrow(); // 108바이트
  });
});
