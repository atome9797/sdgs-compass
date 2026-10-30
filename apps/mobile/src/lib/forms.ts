// 입력 칸 도우미 (순수 함수).

/** 숫자만 남겨요 ("¥1,200" → "1200"). maxLength 자리까지만 */
export function digitsOnly(text: string, maxLength = 10): string {
  return text.replace(/\D+/g, "").slice(0, maxLength);
}

/** 숫자 글자 → 정수 (비어 있으면 0) */
export function parseCount(text: string): number {
  const digits = digitsOnly(text);
  return digits === "" ? 0 : Number(digits);
}

/** 1~5 처럼 정해진 범위 안으로 */
export function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}
