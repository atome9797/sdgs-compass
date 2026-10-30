// QR 모듈 행렬(core 의 qrMatrix) → SVG path. 어두운 칸을 가로로 이어 붙여서 path 가 짧아요.
// 가장자리에는 QR 규격의 여백(quiet zone, 4칸)을 두어서 스캐너가 읽을 수 있게 해요.

export interface QrPathData {
  /** viewBox 한 변의 길이 (칸 수 + 양쪽 여백) */
  size: number;
  /** 어두운 칸들의 path (M x y h길이 v1 h-길이 z 를 이어 붙인 것) */
  d: string;
}

export const QR_QUIET_ZONE = 4;

export function qrPath(matrix: readonly (readonly boolean[])[], quiet: number = QR_QUIET_ZONE): QrPathData {
  const rows = matrix.length;
  const cols = rows === 0 ? 0 : matrix[0].length;
  const parts: string[] = [];
  for (let y = 0; y < rows; y++) {
    let x = 0;
    while (x < cols) {
      if (!matrix[y][x]) {
        x++;
        continue;
      }
      let end = x;
      while (end < cols && matrix[y][end]) end++;
      const length = end - x;
      parts.push(`M${x + quiet} ${y + quiet}h${length}v1h-${length}z`);
      x = end;
    }
  }
  return { size: Math.max(rows, cols) + quiet * 2, d: parts.join("") };
}
