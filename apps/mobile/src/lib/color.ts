// 색 글자 도우미.

/** "#RRGGBB" 색에 투명도(0~1)를 붙여 "#RRGGBBAA" 로. 모양이 맞지 않으면 fallback 을 그대로 돌려줘요. */
export function tint(hex: string, alpha: number, fallback: string): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return fallback;
  const clamped = Math.min(1, Math.max(0, Number.isFinite(alpha) ? alpha : 0));
  const byte = Math.round(clamped * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${byte}`;
}
