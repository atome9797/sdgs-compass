// 저절로 넘어가는 배너(Swiper 처럼)의 계산 — 화면(PartnerSwiper)과 떼어서 테스트해요.
// 끝없이 같은 방향으로 넘어가도록, 트랙 앞뒤에 복사본을 하나씩 둬요: [마지막의 복사본, 1, 2, …, N, 첫 장의 복사본].
// 「위치」는 트랙에서의 칸 번호(0 … N+1)이고, 실제 장 번호는 0 … N-1 이에요. 처음 위치는 1(= 첫 장).

/** 다음 장으로 넘어가기까지의 시간 */
export const AUTOPLAY_MS = 5000;
/** 한 장이 미끄러지는 시간 (globals.css 의 .partner-swiper__track--animate 와 같아요) */
export const SLIDE_MS = 450;
/** 이만큼(폭에 대한 비율) 끌면 다음·앞 장으로 넘어가요 */
export const SWIPE_RATIO = 0.18;
/** 이보다 적게 움직였으면 끌기가 아니라 누르기로 봐요(px) */
export const TAP_SLOP_PX = 6;

export interface TrackItem<T> {
  item: T;
  /** 앞뒤 복사본 (화면 읽기·초점에서 숨겨요) */
  clone: boolean;
  /** 실제 장 번호 */
  index: number;
}

/** 트랙에 그릴 칸들. 두 장 이상일 때만 앞뒤에 복사본을 붙여요 */
export function trackItems<T>(slides: readonly T[]): TrackItem<T>[] {
  const real = slides.map((item, index) => ({ item, clone: false, index }));
  if (slides.length < 2) return real;
  const last = slides.length - 1;
  return [{ item: slides[last], clone: true, index: last }, ...real, { item: slides[0], clone: true, index: 0 }];
}

/** 처음 위치: 복사본이 있으면 1, 없으면 0 */
export function startPosition(count: number): number {
  return count < 2 ? 0 : 1;
}

/** 트랙의 위치 → 실제 장 번호 */
export function realIndex(position: number, count: number): number {
  if (count < 2) return 0;
  return (((position - 1) % count) + count) % count;
}

/** 실제 장 번호 → 트랙의 위치 */
export function positionOf(index: number, count: number): number {
  return count < 2 ? 0 : index + 1;
}

/** 복사본 칸에 도착했으면 같은 그림의 진짜 칸으로 순간 이동할 위치, 아니면 null */
export function loopJump(position: number, count: number): number | null {
  if (count < 2) return null;
  if (position <= 0) return count;
  if (position >= count + 1) return 1;
  return null;
}

/** 끈 거리(px, 왼쪽으로 끌면 음수)와 배너 폭으로 손을 뗀 뒤의 위치. 충분히 끌지 않았으면 제자리 */
export function settlePosition(position: number, dragPx: number, width: number, count: number): number {
  if (count < 2 || width <= 0) return position;
  if (dragPx <= -width * SWIPE_RATIO) return Math.min(position + 1, count + 1);
  if (dragPx >= width * SWIPE_RATIO) return Math.max(position - 1, 0);
  return position;
}
